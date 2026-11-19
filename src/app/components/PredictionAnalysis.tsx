import { useEffect, useId, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { BarChart3, Calendar, CheckCircle, ChevronLeft, ChevronRight, Download, Loader2, Minus, Package, PanelLeftOpen, Search, ShoppingCart, TrendingDown, TrendingUp, X } from "lucide-react";
import { Area, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AnalysisMetrics, PriorityFilter } from "./AnalysisLayout";
import { predictionService } from "../../services/prediction.service";
import { purchasePlanService } from "../../services/purchase-plan.service";
import { dashboardService } from "../../services/dashboard.service";
import { peekCache } from "../../lib/dashboardCache";
import { buildChartFromBackendPoints, extractAccuracy, forecastResultsToProducts, type ChartPoint } from "../../lib/transforms";
import { exportPurchasePlan, priorityLabels, priorityRank } from "../../lib/purchaseExport";
import { extractApiErrorMessage } from "../context/AuthContext";
import type { PredictionResponse, PurchasePlanResponse } from "../../types/api";

const PAGE_SIZE = 5;
const number = (value: number) => value.toLocaleString("es-PE", { maximumFractionDigits: 2 });
const soles = (value: number) => value.toLocaleString("es-PE", { style: "currency", currency: "PEN" });

export function AnalysisPaginator({ page, total, onChange }: { page: number; total: number; onChange: (page: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const current = Math.min(page, pages);
  const start = Math.max(1, Math.min(current - 2, pages - 4));
  if (!total) return null;
  return <nav className="analysis-pagination" aria-label="Paginación de productos">
    <span>{number((current - 1) * PAGE_SIZE + 1)}–{number(Math.min(current * PAGE_SIZE, total))} de {number(total)}</span>
    {pages > 1 && <div>
      <button aria-label="Página anterior" disabled={current === 1} onClick={() => onChange(current - 1)}><ChevronLeft size={16}/></button>
      {start > 1 && <><button onClick={() => onChange(1)}>1</button>{start > 2 && <span>…</span>}</>}
      {Array.from({ length: Math.min(5, pages) }, (_, index) => start + index).map(value => <button key={value} aria-label={`Página ${value}`} aria-current={value === current ? "page" : undefined} onClick={() => onChange(value)}>{value}</button>)}
      {start + 4 < pages && <>{start + 5 < pages && <span>…</span>}<button onClick={() => onChange(pages)}>{pages}</button></>}
      <button aria-label="Página siguiente" disabled={current === pages} onClick={() => onChange(current + 1)}><ChevronRight size={16}/></button>
    </div>}
  </nav>;
}

function ChartTooltip({ active, payload }: any) {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;
  return <div className="analysis-chart-tooltip"><strong>{point.weekRange ?? point.date}</strong>
    {point.historical != null && <p>Histórico <b>{number(point.historical)} uds</b></p>}
    {point.predicted != null && <p>Predicción <b>{number(point.predicted)} uds</b></p>}
    {point.band && <p>Incertidumbre <b>{number(point.band[0])}–{number(point.band[1])} uds</b></p>}
  </div>;
}

/** Same saved execution, chart and tables in the wizard, history and dashboard. */
export function PredictionAnalysis({ executionId, view, initialPrediction, initialPlan, onPlanReady, preparePlan, showPlanTotals = false }: {
  executionId: string;
  view: "demand" | "purchase";
  initialPrediction?: PredictionResponse | null;
  initialPlan?: PurchasePlanResponse | null;
  onPlanReady?: (plan: PurchasePlanResponse) => void;
  preparePlan?: () => Promise<PurchasePlanResponse>;
  showPlanTotals?: boolean;
}) {
  const [prediction, setPrediction] = useState<PredictionResponse | null>(() => initialPrediction ?? peekCache<PredictionResponse>(`prediction:${executionId}`) ?? null);
  const [plan, setPlan] = useState<PurchasePlanResponse | null>(() => initialPlan?.predictionExecutionId === executionId ? initialPlan : peekCache<PurchasePlanResponse>(`plan:${executionId}`) ?? null);
  const [error, setError] = useState("");
  const [planError, setPlanError] = useState("");
  const [exportError, setExportError] = useState("");
  const [planLoading, setPlanLoading] = useState(false);
  const [planMissing, setPlanMissing] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [search, setSearch] = useState("");
  const [priority, setPriority] = useState("all");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerSearch, setDrawerSearch] = useState("");
  const [chart, setChart] = useState<ChartPoint[]>([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [chartError, setChartError] = useState("");
  const [confidence, setConfidence] = useState(true);
  const gradientId = useId().replace(/:/g, "");

  useEffect(() => {
    let active = true;
    setError("");
    const cached = initialPrediction?.id === executionId ? initialPrediction : peekCache<PredictionResponse>(`prediction:${executionId}`) ?? null;
    setPrediction(cached);
    if (!cached) predictionService.getById(executionId).then(result => { if (active) setPrediction(result); })
      .catch(() => { if (active) setError("No se pudieron cargar los datos del análisis."); });
    return () => { active = false; };
  }, [executionId, initialPrediction, attempt]);

  useEffect(() => {
    let active = true;
    setPlanError(""); setPlanMissing(false);
    if (initialPlan?.predictionExecutionId === executionId) { setPlan(initialPlan); setPlanLoading(false); return; }
    setPlan(peekCache<PurchasePlanResponse>(`plan:${executionId}`) ?? null);
    setPlanLoading(true);
    purchasePlanService.getByExecution(executionId).then(result => {
      if (active) { setPlan(result); onPlanReady?.(result); }
    }).catch((reason: { status?: number }) => {
      if (active) {
        if (reason.status === 404) setPlanMissing(true);
        else setPlanError("No se pudo cargar el plan guardado. Vuelve a intentarlo.");
      }
    }).finally(() => { if (active) setPlanLoading(false); });
    return () => { active = false; };
  }, [executionId, initialPlan, attempt, onPlanReady]);

  const products = useMemo(() => {
    if (!prediction) return [];
    const rows = forecastResultsToProducts(prediction.forecastResults, plan?.items ?? [], prediction.productMetrics ?? prediction.metrics, prediction.forecastPeriod, view === "purchase");
    const summaries = new Map(prediction.productSummaries?.map(row => [row.productName, row]));
    return rows.map(row => {
      const summary = summaries.get(row.name);
      const historical = summary?.historicalAvg ?? row.historicalAvg;
      return { ...row, historicalAvg: historical, trend: summary?.trend ?? null,
        mappedCategory: summary?.category?.trim() || null,
        variation: summary?.variationPercent ?? (historical != null && historical > 0 ? (row.predictedDemand - historical) / historical * 100 : null) };
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [prediction, plan, view]);

  useEffect(() => { setSelected(""); setPage(1); }, [executionId]);
  useEffect(() => { setPage(1); setSearch(""); }, [view]);
  const product = products.find(row => row.name === selected) ?? products[0];
  const productName = product?.name ?? "";

  useEffect(() => {
    let active = true;
    setChart([]); setChartError("");
    if (!productName) return;
    setChartLoading(true);
    dashboardService.getChart(executionId, productName).then(response => {
      if (active) setChart(buildChartFromBackendPoints(response.points, prediction?.forecastPeriod ?? 30, response.historicalPoints));
    }).catch(() => { if (active) setChartError("No se pudo cargar la gráfica de este medicamento."); })
      .finally(() => { if (active) setChartLoading(false); });
    return () => { active = false; };
  }, [executionId, productName, prediction?.forecastPeriod, attempt]);

  const filtered = useMemo(() => {
    const rows = products.filter(row => row.name.toLocaleLowerCase().includes(search.toLocaleLowerCase()) && (view === "demand" || priority === "all" || row.priority === priority));
    return view === "purchase" ? rows.sort((a, b) =>
      (priorityRank[a.priority ?? ""] ?? 5) - (priorityRank[b.priority ?? ""] ?? 5) || a.name.localeCompare(b.name)) : rows;
  }, [products, search, priority, view]);
  const current = Math.min(page, Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)));
  const visible = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const coverage = prediction?.confidenceLevel;
  const plot = chart.map((point, index) => ({ ...point, index, band: coverage && confidence && point.lower != null && point.upper != null ? [point.lower, point.upper] : null }));
  const hasBounds = coverage != null && chart.some(point => point.lower != null && point.upper != null);
  const start = chart.findIndex(point => point.predicted != null);
  const days = prediction?.forecastPeriod ?? 0;
  const total = products.reduce((sum, row) => sum + row.totalPredicted, 0);
  const accuracy = prediction ? extractAccuracy(prediction.metrics) : null;
  const hasStock = products.some(row => row.hasInventory);
  const planItems = new Map(plan?.items.map(item => [item.productName, item]));
  const hasPurchaseCost = view === "purchase" && (plan?.items.some(item => item.unitPurchaseCost != null) ?? false);
  const estimatedInvestment = plan?.totalEstimatedCost;
  const investmentMetric = estimatedInvestment == null ? [] : [{
    label: "Inversión estimada", icon: ShoppingCart, value: soles(estimatedInvestment),
  }];
  const hasCategory = products.some(row => row.mappedCategory);
  const purchaseUnavailable = view === "purchase" && !plan;
  const savedPlanProducts = showPlanTotals && plan ? products.filter(row => planItems.has(row.name)) : [];
  const exportPlan = async (format: "pdf" | "csv") => {
    if (!prediction || !plan) return;
    setExportError("");
    try {
      await exportPurchasePlan(format, prediction, plan);
    } catch (error) {
      setExportError(extractApiErrorMessage(error, "No se pudo descargar el plan."));
    }
  };
  const retryPlan = async () => {
    if (!preparePlan) { setAttempt(value => value + 1); return; }
    setPlanLoading(true); setPlanError(""); setPlanMissing(false);
    try {
      const saved = await preparePlan();
      setPlan(saved); onPlanReady?.(saved);
    } catch (error) { setPlanError(extractApiErrorMessage(error, "No se pudo guardar el plan. Tu predicción sigue disponible en el historial.")); }
    finally { setPlanLoading(false); }
  };

  if (error) return <div className="analysis-inline-state" role="alert"><p>{error}</p><button className="module-secondary" onClick={() => setAttempt(value => value + 1)}>Reintentar</button></div>;
  if (!prediction) return <div className="analysis-inline-state" role="status"><Loader2 className="animate-spin" size={24}/><p>Cargando análisis…</p></div>;

  return <div className="prediction-analysis-surface shared-prediction-analysis">
    {view === "purchase" && <header className="shared-plan-heading"><div><h2>Plan de compras recomendado</h2><p>Basado en la predicción para los próximos {days} días</p></div><div className="module-heading-actions">
      <button className="module-secondary" disabled={planLoading || !plan} onClick={() => exportPlan("csv")}><Download size={16}/>Exportar CSV</button>
      <button className="module-primary" disabled={planLoading || !plan} onClick={() => exportPlan("pdf")}><Download size={16}/>Exportar PDF</button>
    </div></header>}
    {view === "purchase" && exportError && <p className="shared-analysis-notice" role="alert">{exportError}</p>}
    {!purchaseUnavailable && (view === "demand" || !showPlanTotals || plan) && <AnalysisMetrics items={view === "demand" ? [
      { label: "Demanda prevista", icon: TrendingUp, value: `${number(total)} uds` },
      { label: "Productos analizados", icon: Package, value: number(products.length) },
      { label: "Precisión", icon: BarChart3, value: accuracy == null ? "—" : `${number(accuracy)}%` },
      { label: "Horizonte", icon: Calendar, value: `${days} días` },
    ] : showPlanTotals && plan ? [
      { label: "Total productos", icon: Package, value: number(plan.items.length) },
      { label: "Ítems críticos", icon: BarChart3, value: hasStock ? number(savedPlanProducts.filter(row => row.priority === "critical").length) : "—" },
      { label: "Ítems altos", icon: TrendingUp, value: hasStock ? number(savedPlanProducts.filter(row => row.priority === "high").length) : "—" },
      { label: "Unidades totales", icon: ShoppingCart, value: number(plan.items.reduce((sum, item) => sum + item.recommendedQuantity, 0)) },
      ...investmentMetric,
    ] : [
      { label: "Productos a comprar", icon: Package, value: number(products.filter(row => row.recommendedQty > 0).length) },
      { label: "Ítems críticos", icon: BarChart3, value: hasStock ? number(products.filter(row => row.priority === "critical").length) : "—" },
      { label: "Horizonte", icon: Calendar, value: `${days} días` },
      { label: "Unidades a comprar", icon: ShoppingCart, value: number(products.reduce((sum, row) => sum + row.recommendedQty, 0)) },
      ...investmentMetric,
    ]}/>}
    {view === "purchase" && plan && estimatedInvestment == null && <p className="shared-analysis-notice">
      {hasPurchaseCost
        ? `Falta el costo unitario de compra de ${number(plan.itemsMissingPurchaseCost ?? 0)} producto(s). La inversión total no está disponible.`
        : "No se puede calcular la inversión estimada. Mapea el costo unitario de compra en el inventario."}
    </p>}
    {view === "demand" && <div className="analysis-chart relative">
      <AnimatePresence>{drawerOpen && <>
        <motion.div className="analysis-chart-backdrop z-10" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDrawerOpen(false)}/>
        <motion.aside className="analysis-medication-drawer absolute inset-y-0 left-0 z-20 w-72 bg-white flex flex-col border-r border-gray-200" initial={{ x: -304 }} animate={{ x: 0 }} exit={{ x: -304 }} transition={{ duration: .2 }} aria-label="Medicamentos del análisis">
          <div className="shared-drawer-heading"><strong>Medicamentos</strong><button aria-label="Cerrar medicamentos" onClick={() => setDrawerOpen(false)}><X size={18}/></button></div>
          <label className="shared-analysis-search"><Search size={16}/><input autoFocus aria-label="Buscar medicamento" placeholder="Buscar medicamento…" value={drawerSearch} onChange={event => setDrawerSearch(event.target.value)}/></label>
          <div className="medication-list-scroll flex-1 overflow-y-auto">{products.filter(row => row.name.toLowerCase().includes(drawerSearch.toLowerCase())).map(row => <button key={row.name} title={row.name} className={`shared-medication-option ${row.name === productName ? "is-selected" : ""}`} onClick={() => { setSelected(row.name); setDrawerOpen(false); }}>{row.name}{row.name === productName && <CheckCircle size={15}/>}</button>)}</div>
        </motion.aside>
      </>}</AnimatePresence>
      <div className="shared-chart-heading"><div><button className="module-secondary" aria-expanded={drawerOpen} onClick={() => setDrawerOpen(value => !value)}><PanelLeftOpen size={16}/>Medicamentos</button><h3 className="analysis-medication-title">{productName || "Sin medicamentos"}</h3></div>
        {hasBounds && <button className="shared-confidence" onClick={() => setConfidence(value => !value)}>{confidence ? "Ocultar" : "Mostrar"} incertidumbre</button>}
      </div>
      <div className="shared-chart-legend"><span><i/>Histórico</span><span><i className="dashed"/>Predicción</span>{hasBounds && confidence && coverage != null && <span><i className="band"/>Incertidumbre de la predicción ({number(coverage * 100)} %)</span>}<span className="shared-chart-period"><i className="boundary"/>Inicio de predicción · Totales semanales</span></div>
      <div className="shared-chart-plot">
        {chartLoading ? <div className="analysis-inline-state" role="status"><Loader2 className="animate-spin" size={24}/><p>Cargando gráfica…</p></div> : chartError ? <div className="analysis-inline-state" role="alert"><p>{chartError}</p><button className="module-secondary" onClick={() => setAttempt(value => value + 1)}>Reintentar</button></div> : !chart.length ? <div className="analysis-inline-state">No hay datos para este medicamento.</div> : <ResponsiveContainer width="100%" height={320}>
          <ComposedChart key={`${executionId}:${productName}`} data={plot} margin={{ top: 16, right: 18, left: 0, bottom: 12 }}>
            <defs><linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#007AFF" stopOpacity={.16}/><stop offset="100%" stopColor="#007AFF" stopOpacity={.04}/></linearGradient></defs>
            <CartesianGrid strokeDasharray="4 4" stroke="#ededf2" vertical={false}/>
            <XAxis dataKey="index" tickFormatter={value => chart[Number(value)]?.date ?? ""} tick={{ fill: "#85858f", fontSize: 11 }} minTickGap={36} interval="preserveStartEnd" tickLine={false} axisLine={false}/>
            <YAxis tick={{ fill: "#85858f", fontSize: 11 }} tickLine={false} axisLine={false} width={42}/>
            <Tooltip content={<ChartTooltip/>}/>
            {start >= 0 && <ReferenceLine x={start} stroke="#85858f" strokeDasharray="4 4"/>}
            {confidence && hasBounds && <Area dataKey="band" type="monotone" stroke="none" fill={`url(#${gradientId})`} isAnimationActive={false} connectNulls={false}/>}
            <Line dataKey="historical" type="monotone" stroke="#007AFF" strokeWidth={2.5} dot={false} connectNulls={false} animationDuration={800}/>
            <Line dataKey="predicted" type="monotone" stroke="#0891b2" strokeWidth={2.5} strokeDasharray="8 4" dot={false} connectNulls={false} animationBegin={800} animationDuration={400}/>
          </ComposedChart>
        </ResponsiveContainer>}
      </div>
    </div>}
    {view === "purchase" && planLoading && !plan && <p className="shared-analysis-notice" role="status">Preparando el plan guardado…</p>}
    {view === "purchase" && planError && <div className="shared-analysis-notice" role="alert">{planError} <button onClick={retryPlan} disabled={planLoading}>Reintentar</button></div>}
    {view === "purchase" && planMissing && <p className="shared-analysis-notice">Este análisis no tiene un plan guardado.{preparePlan && <button onClick={retryPlan} disabled={planLoading}>Generar plan</button>}</p>}
    {!purchaseUnavailable && <section className="analysis-table-section">
      <div className="shared-table-toolbar">{view === "demand" ? <div><h3>Medicamentos analizados</h3><p>{number(products.length)} productos en este análisis</p></div> : <PriorityFilter value={priority} onChange={value => { setPriority(value); setPage(1); }}/>}<label className="shared-analysis-search"><Search size={16}/><input aria-label="Buscar producto" placeholder="Buscar producto…" value={search} onChange={event => { setSearch(event.target.value); setPage(1); }}/></label></div>
      {view === "purchase" && <p className="shared-priority-note">{hasStock
        ? "Prioridad según cuánto de la demanda prevista cubre el stock actual."
        : "Agrega el inventario para calcular la prioridad de reposición."}</p>}
      <div className="overflow-x-auto"><table>
        <thead><tr>{["Producto", ...(hasCategory ? ["Categoría"] : []), ...(view === "demand" ? ["Dem. histórica (prom. semanal)", "Dem. prevista (prom. semanal)", "Variación", "Tendencia"] : ["Cant. total prevista", "Cant. diaria", ...(hasStock ? ["Stock actual"] : []), "A comprar", ...(hasPurchaseCost ? ["Costo unitario de compra", "Inversión estimada"] : []), "Prioridad"])].map(label => <th key={label}>{label}</th>)}</tr></thead>
        <tbody>{visible.map(row => {
          const trend = row.trend;
          const item = planItems.get(row.name);
          const Trend = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
          return <tr key={row.name}><td>{row.name}</td>{hasCategory && <td>{row.mappedCategory}</td>}{view === "demand" ? <>
            <td>{row.historicalAvg == null ? "—" : `${number(row.historicalAvg * 7)} uds`}</td><td className="shared-analysis-number">{number(row.predictedDemand * 7)} uds</td><td>{row.variation == null ? "—" : `${row.variation > 0 ? "+" : ""}${number(row.variation)}%`}</td><td>{trend == null ? "—" : <span className="analysis-trend" data-trend={trend}><Trend size={14}/>{trend === "up" ? "Al alza" : trend === "down" ? "A la baja" : "Estable"}</span>}</td>
          </> : <><td className="shared-analysis-number">{number(row.totalPredicted)} uds</td><td>{number(row.predictedDemand)} uds/día</td>{hasStock && <td>{row.hasInventory ? `${number(row.currentStock)} uds` : "—"}</td>}<td>{number(row.recommendedQty)} uds</td>{hasPurchaseCost && <>
            <td>{item?.unitPurchaseCost == null ? "—" : soles(item.unitPurchaseCost)}</td>
            <td>{item?.unitPurchaseCost == null || item.estimatedCost == null ? "—" : soles(item.estimatedCost)}</td>
          </>}<td>{row.priority ? <span className={`analysis-priority-chip is-${row.priority}`}>{priorityLabels[row.priority]}</span> : "No calculable"}</td></>}</tr>;
        })}{!visible.length && <tr><td colSpan={5 + Number(Boolean(hasCategory)) + Number(view === "purchase" && hasStock) + (hasPurchaseCost ? 2 : 0)}>No se encontraron productos.</td></tr>}</tbody>
      </table></div>
      <AnalysisPaginator page={current} total={filtered.length} onChange={setPage}/>
    </section>}
  </div>;
}
