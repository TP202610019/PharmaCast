import { Clock, FileSpreadsheet, Search, UploadCloud, X } from "lucide-react";
import { AnalysisPaginator } from "./PredictionAnalysis";
import "../../styles/prediction.css";
import { useEffect, useRef, useState } from "react";
import { Line, LineChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { read, utils, SSF } from "xlsx";
import http from "../../lib/http";
import { purchasePlanService } from "../../services/purchase-plan.service";
import { predictionService } from "../../services/prediction.service";
import { useAuth, extractApiErrorMessage } from "../context/AuthContext";

type Row = { product: string; actual: number; xgboost: number; naive: number | null; newProduct: boolean };
type InventorySnapshot = {
  planId: string;
  planDays: number;
  products: { product: string; stock: number | null; recommended: number }[];
};
type Evaluation = {
  start: string; end: string; days: number; rows: Row[];
  recordedAt?: string; salesFilename?: string; durationSeconds?: number | null;
  inventory?: InventorySnapshot | null;
  productMatch?: "Código" | "Descripción";
};
type Reference = { available: boolean; products: {product: string; quantity: number}[] };
const dayMs = 86400000;
const detailPageSize = 10;
const dateMs = (date: string) => Date.parse(date.slice(0, 10) + "T00:00:00Z");
const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
const productKey = (value: string) => value.trim().replace(/\s+/g, " ").toLocaleUpperCase("es-PE");
const format = (value: number | null) => value == null ? "—" : value.toLocaleString("es-PE", { maximumFractionDigits: 2 });

function getDate(value: unknown) {
  if (typeof value === "number") {
    const parsed = SSF.parse_date_code(value);
    return parsed ? dateMs(parsed.y + "-" + String(parsed.m).padStart(2, "0") + "-" + String(parsed.d).padStart(2, "0")) : NaN;
  }
  const text = String(value ?? "").trim();
  const parts = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text);
  const normalized = parts ? parts[3] + "-" + parts[2].padStart(2, "0") + "-" + parts[1].padStart(2, "0") : text.slice(0, 10);
  const ms = dateMs(normalized);
  return Number.isFinite(ms) && iso(ms) === normalized ? ms : NaN;
}

export function ForecastEvaluation({ executionId }: { executionId: string }) {
  const { user, isDemo } = useAuth();
  const key = user?.id ? "forecast-evaluation:" + user.id + ":" + executionId : null;
  const [prediction, setPrediction] = useState<Awaited<ReturnType<typeof predictionService.getById>>>();
  const [horizon, setHorizon] = useState(0);
  const [file, setFile] = useState<File>();
  const fileInput = useRef<HTMLInputElement>(null);
  const [evaluations, setEvaluations] = useState<Record<number, Evaluation>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(0);

  useEffect(() => {
    let active = true;
    predictionService.getById(executionId).then(result => {
      if (!active) return;
      setPrediction(result);
      let saved: Evaluation | null = null;
      try { saved = key ? JSON.parse(localStorage.getItem(key) ?? "null") : null; } catch { /* Storage unavailable. */ }
      setHorizon(saved?.days ?? result.forecastPeriod);
      const available: Record<number, Evaluation> = {};
      for (const days of [30, 60, 90]) {
        try {
          const record = key ? JSON.parse(localStorage.getItem(key + ":" + days) ?? "null") : null;
          if (record?.days === days) available[days] = record;
        } catch { /* Ignore unavailable saved records. */ }
      }
      if (saved && !available[saved.days]) available[saved.days] = saved;
      setEvaluations(available);
    }).catch(() => { if (active) setError("No se pudo cargar el pronóstico guardado."); });
    return () => { active = false; };
  }, [executionId, key]);

  async function evaluate() {
    if (!file || !prediction || !horizon || busy || isDemo) return;
    setBusy(true); setError(""); setNotice("");
    try {
      if (file.size > 50 * 1024 * 1024) throw new Error("El archivo supera 50 MB.");
      if (!/\.(xlsx?|csv)$/i.test(file.name)) throw new Error("Selecciona un Excel o CSV.");
      const start = prediction.forecastResults.reduce((min, row) => Math.min(min, dateMs(row.forecastDate)), Infinity);
      if (!Number.isFinite(start)) throw new Error("Este análisis no tiene un pronóstico guardado.");
      const end = start + (horizon - 1) * dayMs;
      const book = read(await file.arrayBuffer(), { raw: true });
      const sheet = book.Sheets[book.SheetNames.includes("Ventas") ? "Ventas" : book.SheetNames[0]];
      const [headers, ...sales] = utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: false, blankrows: false });
      const column = (...aliases: string[]) => headers?.findIndex(value => aliases.includes(normalize(String(value)))) ?? -1;
      const dateCol = column("fecha", "fechaventa", "fechadeventa", "date");
      const codeCol = column("codigoproducto", "codigodeproducto", "sku", "producto", "productid");
      const qtyCol = column("cantidadvendida", "cantidad", "quantity");
      if ([dateCol, codeCol, qtyCol].includes(-1)) throw new Error("El archivo debe tener Fecha de venta, Código de producto y Cantidad vendida.");
      const descriptionCol = column("descripciondelproducto", "descripcionproducto", "nombreproducto", "productname");
      const descriptionsByCode = new Map<string, Set<string>>();
      const actual = new Map<string, number>();
      let latestSalesDate = -Infinity;
      for (const row of sales) {
        const day = getDate(row[dateCol]);
        if (!Number.isFinite(day)) throw new Error("El archivo contiene una fecha de venta inválida.");
        latestSalesDate = Math.max(latestSalesDate, day);
        if (day < start || day > end) continue;
        const code = String(row[codeCol] ?? "").trim();
        const quantity = String(row[qtyCol] ?? "").trim();
        const value = Number(quantity);
        if (!code || !quantity || !Number.isFinite(value) || value < 0) throw new Error("Revisa los códigos y las cantidades dentro del período.");
        actual.set(code, (actual.get(code) ?? 0) + value);
        const description = productKey(String(row[descriptionCol] ?? ""));
        if (description) {
          if (!descriptionsByCode.has(code)) descriptionsByCode.set(code, new Set());
          descriptionsByCode.get(code)!.add(description);
        }
      }
      if (!actual.size) throw new Error("El archivo no contiene ventas dentro de " + iso(start) + " a " + iso(end) + ".");
      if (latestSalesDate < end) throw new Error("El archivo termina antes del fin del horizonte (" + iso(end) + "). Usa un archivo con cobertura completa.");
      const forecast = new Map<string, number>();
      for (const row of prediction.forecastResults) {
        const first = dateMs(row.forecastDate);
        const last = dateMs(row.periodEnd ?? row.forecastDate);
        const overlap = Math.max(0, Math.min(last, end) - Math.max(first, start) + dayMs);
        if (overlap) forecast.set(row.productName, (forecast.get(row.productName) ?? 0) + row.predictedQuantity * overlap / (last - first + dayMs));
      }
      const byDescription = ![...actual.keys()].some(code => forecast.has(code));
      const groupedActual = new Map<string, number>();
      const toKey = (name: string) => byDescription ? productKey(name) : name;
      for (const [code, value] of actual) {
        const descriptions = descriptionsByCode.get(code);
        if (byDescription && descriptions && descriptions.size > 1)
          throw new Error("Un código tiene varias descripciones en ese período. Genera el pronóstico usando Código de producto.");
        const name = byDescription ? descriptions?.values().next().value ?? "Código: " + code : code;
        groupedActual.set(name, (groupedActual.get(name) ?? 0) + value);
      }
      if (byDescription) {
        if (![...forecast.keys()].some(name => groupedActual.has(toKey(name))))
          throw new Error("Ningún producto coincide por código ni descripción. Verifica el archivo y el campo de producto del análisis.");
      }
      const { data: reference } = await http.get<Reference>("/api/predictions/" + executionId + "/weekly-reference");
      const naive = new Map(reference.products.map(row => [row.product, row.quantity * horizon / 7]));
      const forecastByKey = new Map(Array.from(forecast, ([name, value]) => [toKey(name), value]));
      const naiveByKey = new Map(Array.from(naive, ([name, value]) => [toKey(name), value]));
      const products = new Set([...forecastByKey.keys(), ...groupedActual.keys()]);
      const rows = Array.from(products, product => ({
        product, actual: groupedActual.get(product) ?? 0, xgboost: forecastByKey.get(product) ?? 0,
        naive: reference.available ? naiveByKey.get(product) ?? 0 : null, newProduct: !forecastByKey.has(product),
      })).sort((a, b) => b.actual - a.actual || a.product.localeCompare(b.product));
      let inventory: InventorySnapshot | null = null;
      try {
        const plan = await purchasePlanService.getByExecution(executionId);
        inventory = {
          planId: plan.id,
          planDays: prediction.forecastPeriod,
          products: plan.items.map(item => ({
            product: item.productName, stock: item.stockActual, recommended: item.recommendedQuantity,
          })),
        };
      } catch (err) {
        if ((err as { status?: number })?.status !== 404) {
          setNotice("La evaluación se guardó, pero no se pudo consultar el plan de compras.");
        }
      }
      const started = Date.parse(prediction.startedAt ?? "");
      const completed = Date.parse(prediction.completedAt ?? "");
      const result: Evaluation = {
        start: iso(start), end: iso(end), days: horizon, rows, productMatch: byDescription ? "Descripción" : "Código",
        recordedAt: new Date().toISOString(), salesFilename: file.name, inventory,
        durationSeconds: Number.isFinite(started) && Number.isFinite(completed) && completed >= started
          ? (completed - started) / 1000 : null,
      };
      setEvaluations(previous => ({ ...previous, [horizon]: result }));
      setFile(undefined);
      setPage(0);
      try { if (key) localStorage.setItem(key + ":" + horizon, JSON.stringify(result)); }
      catch { setNotice("El navegador no pudo guardar la evaluación."); }
    } catch (err) { setError(extractApiErrorMessage(err, err instanceof Error ? err.message : "No se pudo evaluar el pronóstico.")); }
    finally { setBusy(false); }
  }

  const results = evaluations[horizon] ?? null;
  const xgboostAccuracy = prediction?.metrics.find(metric =>
    metric.scope === "Overall" && metric.method === "XGBoost")?.volumeAccuracy ?? null;
  const xgboostOverall = prediction?.metrics.find(metric =>
    metric.scope === "Overall" && metric.method === "XGBoost");
  const naiveOverall = prediction?.baselineMetrics?.find(metric =>
    metric.scope === "Overall" && metric.method === "NaiveWeekly");
  const naiveAccuracy = prediction?.baselineMetrics?.find(metric =>
    metric.scope === "Overall" && metric.method === "NaiveWeekly")?.volumeAccuracy ?? null;
  const totals = results ? [
    { Modelo: "XGBoost", WAPE: xgboostOverall?.wape ?? null, MAE: xgboostOverall?.mae ?? null,
      RMSE: xgboostOverall?.rmse ?? null, MBE: xgboostOverall?.mbe ?? null,
      "Precisión histórica (%)": xgboostAccuracy },
    { Modelo: "NaiveWeekly", WAPE: naiveOverall?.wape ?? null, MAE: naiveOverall?.mae ?? null,
      RMSE: naiveOverall?.rmse ?? null, MBE: naiveOverall?.mbe ?? null,
      "Precisión histórica (%)": naiveAccuracy },
  ] : [];
  const rows = results?.rows.filter(row => row.product.toLowerCase().includes(filter.trim().toLowerCase())) ?? [];

  const inventory = results?.inventory;
  const withStock = inventory?.products.filter(row => row.stock != null).length ?? 0;
  const productsWithErrors = (results?.rows ?? []).map(row => ({
    ...row,
    xgboostError: Math.abs(row.xgboost - row.actual),
    naiveError: row.naive == null ? null : Math.abs(row.naive - row.actual),
  }));
  const topSales = productsWithErrors.filter(row => row.actual > 0).slice(0, 10);
  const comparable = productsWithErrors.filter(row => row.naiveError != null);
  const filename = file?.name ?? (results && (results.salesFilename || "Archivo evaluado"));

  function removeFile() {
    setError("");
    setNotice("");
    if (file) {
      setFile(undefined);
      return;
    }
    try {
      if (key) {
        localStorage.removeItem(key + ":" + horizon);
        const legacy = JSON.parse(localStorage.getItem(key) ?? "null");
        if (legacy?.days === horizon) localStorage.removeItem(key);
      }
    } catch {
      setError("No se pudo quitar la evaluación guardada del navegador.");
      return;
    }
    setEvaluations(previous => {
      const next = { ...previous };
      delete next[horizon];
      return next;
    });
    setPage(0);
  }

  return <section className="shared-prediction-analysis space-y-6">
    <header className="shared-plan-heading">
      <div><h2>Evaluación del pronóstico</h2><p>XGBoost y NaiveWeekly frente a las ventas reales.</p></div>
    </header>
    {isDemo ? <p className="text-sm text-gray-500">Inicia sesión con tu cuenta para cargar ventas reales.</p> : <>
      <input ref={fileInput} type="file" accept=".csv,.xls,.xlsx" className="hidden"
        onChange={event => { setFile(event.target.files?.[0]); event.target.value = ""; }} />
      {filename ? <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-gray-200 bg-white text-gray-500"><FileSpreadsheet size={20}/></div>
        <div className="min-w-0 flex-1"><p className="text-sm font-semibold">Ventas reales</p><p className="truncate text-sm text-gray-600">{filename}</p></div>
        <button type="button" className="module-secondary" aria-label="Quitar archivo" disabled={busy} onClick={removeFile}><X size={16}/>Quitar</button>
      </div> : <button type="button" className="w-full rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 px-6 py-10 text-center transition-colors hover:border-gray-300 hover:bg-gray-100"
        onClick={() => fileInput.current?.click()}
        onDragOver={event => event.preventDefault()}
        onDrop={event => { event.preventDefault(); if (!busy && event.dataTransfer.files[0]) setFile(event.dataTransfer.files[0]); }}>
        <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl border border-gray-200 bg-white text-gray-400"><UploadCloud size={22}/></span>
        <span className="block text-sm font-medium text-gray-700">Arrastra tu archivo o haz clic para seleccionar</span>
        <span className="mt-1 block text-xs text-gray-500">Ventas reales · CSV, XLS o XLSX</span>
      </button>}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <p className="text-sm font-medium">Horizonte</p>
          <div className="analysis-priority-filter" role="group" aria-label="Horizonte de evaluación">
            {[30, 60, 90].map(days => <button type="button" key={days} aria-pressed={days === horizon}
              className={days === horizon ? "is-active" : undefined} disabled={!prediction || busy || days > prediction.forecastPeriod}
              onClick={() => { setHorizon(days); setPage(0); setFile(undefined); setError(""); setNotice(""); }}>{days} días</button>)}
          </div>
        </div>
        {(!results || file) && <button type="button" className="module-primary" onClick={() => void evaluate()} disabled={!file || !prediction || busy}>{busy ? "Evaluando…" : "Evaluar pronóstico"}</button>}
      </div>
    </>}
    {prediction && horizon < prediction.forecastPeriod && <p className="text-sm text-gray-500">Los bloques parciales se prorratean por día.</p>}
    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    {notice && <p role="status" className="text-sm text-amber-700">{notice}</p>}
    {results && !file && <>
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-sm text-gray-500">
        <p className="text-sm text-gray-500">{results.start} a {results.end} · {results.rows.length} productos · {results.rows.filter(row => row.newProduct).length} productos sin pronóstico</p>
        <p className="flex shrink-0 items-center gap-2">
          <Clock size={16} aria-hidden="true" />
          <span>Tiempo de ejecución</span>
          <strong className="font-semibold text-[#1D1D1F]">{results.durationSeconds == null ? "—" : format(results.durationSeconds) + " s"}</strong>
        </p>
      </div>
      {inventory && inventory.planDays !== results.days && <p className="text-sm text-gray-500">El inventario y las cantidades de compra corresponden al plan guardado de {inventory.planDays} días.</p>}
      {results.rows.every(row => row.naive == null) && <p className="text-sm text-amber-700">NaiveWeekly requiere siete días de histórico disponibles antes del pronóstico.</p>}
      <p className="text-sm text-gray-500">Las métricas resumen corresponden al análisis original guardado en la base de datos. El detalle por producto compara el pronóstico con el archivo de ventas reales.</p>
      <div className="analysis-table-section overflow-x-auto"><table className="w-full text-sm"><thead><tr><th scope="col">Modelo</th>{Object.keys(totals[0]).slice(1).map(name => <th key={name} scope="col">{name}{name === "WAPE" ? " (%)" : ""}</th>)}</tr></thead>
        <tbody>{totals.map(({ Modelo, ...data }) => <tr key={Modelo}><th scope="row" className="py-2">{Modelo}</th>{Object.entries(data).map(([name, value]) => <td className="text-center" key={name}>{format(value)}</td>)}</tr>)}</tbody></table></div>
      {topSales.length > 0 && <div className="analysis-chart">
        <div className="shared-chart-heading"><h3>{topSales.length} productos más vendidos</h3></div>
        <div className="overflow-x-auto">
          <div className="min-w-[480px]">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={topSales} margin={{ top: 14, right: 20, bottom: 14, left: 4 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="product" tick={{ fill: "#94a3b8", fontSize: 10 }} tickLine={false} axisLine={false}
                  angle={-40} textAnchor="end" interval={0} height={64}
                  tickFormatter={(name: string) => name.length > 18 ? name.slice(0, 17) + "…" : name} />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} tickLine={false} axisLine={false} width={48} />
                <Tooltip formatter={(value: number, name: string) => [format(value) + " uds", name]} />
                <Legend />
                <Line type="linear" dataKey="actual" name="Ventas reales" stroke="#007AFF" strokeWidth={2.5} dot={{ r: 2 }} />
                <Line type="linear" dataKey="xgboost" name="XGBoost" stroke="#0891b2" strokeWidth={2.5} strokeDasharray="8 4" dot={{ r: 2 }} />
                {comparable.length > 0 && <Line type="linear" dataKey="naive" name="NaiveWeekly" stroke="#f97316" strokeWidth={2} strokeDasharray="5 3" dot={{ r: 2 }} />}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>}
      <div className="shared-table-toolbar">
        <div><h3>Detalle por producto</h3></div>
        <label className="shared-analysis-search"><Search size={16}/><input aria-label="Buscar producto" placeholder="Buscar producto…" value={filter} onChange={event => {setFilter(event.target.value);setPage(0);}} /></label>
      </div>
      <div className="analysis-table-section overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr>{["Producto", "Ventas reales", "XGBoost", "NaiveWeekly", "Diferencia XGBoost", "Diferencia NaiveWeekly"].map(label => <th key={label} className="p-2">{label}</th>)}</tr></thead>
      <tbody>{rows.slice(page * detailPageSize, (page + 1) * detailPageSize).map(row => <tr key={row.product} className="border-t"><td className="p-2">{row.product}{row.newProduct && " · Sin pronóstico"}</td><td>{format(row.actual)}</td><td>{format(row.xgboost)}</td><td>{format(row.naive)}</td><td>{format(row.xgboost - row.actual)}</td><td>{format(row.naive == null ? null : row.naive - row.actual)}</td></tr>)}</tbody></table></div>
      <AnalysisPaginator page={page + 1} total={rows.length} pageSize={detailPageSize} label="Paginación del detalle" onChange={value => setPage(value - 1)}/>
    </>}
  </section>;
}
