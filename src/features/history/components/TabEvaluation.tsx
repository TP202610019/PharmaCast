import { motion } from "motion/react";
import {
  AlertCircle, CheckCircle, Loader2, X, UploadCloud, FileText, ClipboardCheck,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import type { PlanEvaluationResponse } from "@/shared/types/api";

interface Props {
  // plan status
  purchasePlanId: string | null;
  purchasePlanIdLoading: boolean;
  // sales file
  evalSalesFile: File | null;
  setEvalSalesFile: (f: File | null) => void;
  evalSalesProdCol: string;
  setEvalSalesProdCol: (c: string) => void;
  evalSalesQtyCol: string;
  setEvalSalesQtyCol: (c: string) => void;
  evalSalesPriceCol: string;
  setEvalSalesPriceCol: (c: string) => void;
  salesColumns: string[];
  salesColsLoading: boolean;
  salesDragging: boolean;
  setSalesDragging: (v: boolean) => void;
  salesFileRef: React.RefObject<HTMLInputElement | null>;
  handleSalesFile: (f: File) => void;
  // pharmacy file
  evalPharmFile: File | null;
  setEvalPharmFile: (f: File | null) => void;
  evalPharmProdCol: string;
  setEvalPharmProdCol: (c: string) => void;
  evalPharmQtyCol: string;
  setEvalPharmQtyCol: (c: string) => void;
  pharmColumns: string[];
  pharmColsLoading: boolean;
  pharmDragging: boolean;
  setPharmDragging: (v: boolean) => void;
  pharmFileRef: React.RefObject<HTMLInputElement | null>;
  handlePharmFile: (f: File) => void;
  // evaluation result
  planEvalLoading: boolean;
  planEvalResult: PlanEvaluationResponse | null;
  planEvalError: string;
  handleEvaluate: () => void;
  evalResultRef: React.RefObject<HTMLDivElement | null>;
  chartLimit: number;
  setChartLimit: (n: number) => void;
  // sample names for diagnostics
  planSampleNames: string[];
  csvSampleNames: string[];
  evalSalesProdColValue: string;
  // helpers
  formatFileSize: (bytes: number) => string;
}

export function TabEvaluation({
  purchasePlanId, purchasePlanIdLoading,
  evalSalesFile, setEvalSalesFile,
  evalSalesProdCol, setEvalSalesProdCol,
  evalSalesQtyCol, setEvalSalesQtyCol,
  evalSalesPriceCol, setEvalSalesPriceCol,
  salesColumns, salesColsLoading, salesDragging, setSalesDragging, salesFileRef, handleSalesFile,
  evalPharmFile, setEvalPharmFile,
  evalPharmProdCol, setEvalPharmProdCol,
  evalPharmQtyCol, setEvalPharmQtyCol,
  pharmColumns, pharmColsLoading, pharmDragging, setPharmDragging, pharmFileRef, handlePharmFile,
  planEvalLoading, planEvalResult, planEvalError, handleEvaluate, evalResultRef,
  chartLimit, setChartLimit,
  planSampleNames, csvSampleNames, evalSalesProdColValue,
  formatFileSize,
}: Props) {
  const canEvaluate = !!evalSalesFile && !!evalSalesProdCol && !!evalSalesQtyCol && !!purchasePlanId && !purchasePlanIdLoading;

  return (
    <div className="space-y-5">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
        className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">

        {/* Header */}
        <div className="px-6 py-5 flex items-center justify-between gap-3 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/20 shrink-0">
              <ClipboardCheck className="h-5 w-5 text-cyan-500" />
            </div>
            <div>
              <p className="text-gray-900" style={{ fontWeight: 700, fontSize: "1rem" }}>Evaluar plan de compras</p>
              <p className="text-gray-400" style={{ fontSize: "0.8125rem" }}>
                Compara lo que PharmaCast recomendó con las ventas reales del período
              </p>
            </div>
          </div>
          {purchasePlanIdLoading && (
            <div className="flex items-center gap-1.5 text-gray-400" style={{ fontSize: "0.75rem" }}>
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Cargando plan…
            </div>
          )}
        </div>

        <div className="p-6 space-y-6">
          {/* Sales file (required) */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <p className="text-gray-800" style={{ fontWeight: 600, fontSize: "0.9375rem" }}>Ventas reales del período</p>
              <span className="rounded-full bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 text-cyan-600" style={{ fontSize: "0.6875rem", fontWeight: 600 }}>Requerido</span>
            </div>
            <input ref={salesFileRef} type="file" accept=".csv,.xls,.xlsx" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleSalesFile(f); e.target.value = ""; }} />
            {!evalSalesFile ? (
              <div
                onClick={() => salesFileRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setSalesDragging(true); }}
                onDragLeave={() => setSalesDragging(false)}
                onDrop={(e) => { e.preventDefault(); setSalesDragging(false); const f = e.dataTransfer.files[0]; if (f) handleSalesFile(f); }}
                className={`flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-10 cursor-pointer transition-all ${
                  salesDragging ? "border-cyan-400 bg-cyan-500/5" : "border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-gray-100/50"
                }`}
              >
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border transition-all ${salesDragging ? "bg-cyan-500/10 border-cyan-500/20" : "bg-white border-gray-200"}`}>
                  <UploadCloud className={`h-6 w-6 ${salesDragging ? "text-cyan-500" : "text-gray-400"}`} />
                </div>
                <div className="text-center">
                  <p className="text-gray-700" style={{ fontWeight: 500, fontSize: "0.875rem" }}>
                    {salesDragging ? "Suelta el archivo aquí" : "Arrastra tu archivo o haz clic para seleccionar"}
                  </p>
                  <p className="text-gray-400 mt-0.5" style={{ fontSize: "0.75rem" }}>CSV, XLS o XLSX · incluye precio para calcular sobrestock en S/.</p>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-gray-200 overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border-b border-gray-100">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10 border border-cyan-500/20 shrink-0">
                    <FileText className="h-4 w-4 text-cyan-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-800 truncate" style={{ fontSize: "0.8125rem", fontWeight: 600 }}>{evalSalesFile.name}</p>
                    <p className="text-gray-400" style={{ fontSize: "0.75rem" }}>
                      {formatFileSize(evalSalesFile.size)} · <span className="uppercase font-medium text-cyan-600">{evalSalesFile.name.split(".").pop()}</span>
                    </p>
                  </div>
                  {salesColsLoading
                    ? <Loader2 className="h-4 w-4 text-cyan-500 animate-spin shrink-0" />
                    : salesColumns.length > 0
                      ? <span className="flex items-center gap-1 text-emerald-600 shrink-0" style={{ fontSize: "0.75rem", fontWeight: 500 }}>
                          <CheckCircle className="h-3.5 w-3.5" /> {salesColumns.length} columnas
                        </span>
                      : null}
                  <button onClick={() => { setEvalSalesFile(null); }}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:text-gray-700 hover:border-gray-300 transition-all shrink-0">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                {salesColumns.length > 0 && (
                  <div className="p-4 grid grid-cols-3 gap-3">
                    {[
                      { label: "Columna producto", value: evalSalesProdCol, set: setEvalSalesProdCol, required: true,  placeholder: "— selecciona —" },
                      { label: "Columna cantidad", value: evalSalesQtyCol,  set: setEvalSalesQtyCol,  required: true,  placeholder: "— selecciona —" },
                      { label: "Columna precio",   value: evalSalesPriceCol, set: setEvalSalesPriceCol, required: false, placeholder: "— sin precio —" },
                    ].map(({ label, value, set, required, placeholder }) => (
                      <div key={label}>
                        <label className="flex items-center gap-1 text-gray-500 mb-1.5" style={{ fontSize: "0.75rem", fontWeight: 500 }}>
                          {label}
                          {!required && <span className="text-gray-300">(opcional)</span>}
                          {required && value && <CheckCircle className="h-3 w-3 text-emerald-500 ml-auto" />}
                        </label>
                        <select value={value} onChange={(e) => set(e.target.value)}
                          className={`w-full rounded-xl border px-3 py-2 text-gray-900 outline-none transition-colors ${
                            required && value ? "border-emerald-400 bg-emerald-50/30 focus:border-emerald-500" : "border-gray-200 bg-white focus:border-cyan-500/60"
                          }`}
                          style={{ fontSize: "0.8125rem" }}>
                          <option value="">{placeholder}</option>
                          {salesColumns.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Pharmacy file (optional) */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <p className="text-gray-800" style={{ fontWeight: 600, fontSize: "0.9375rem" }}>Plan de compras de la botica</p>
              <span className="rounded-full bg-gray-100 border border-gray-200 px-2 py-0.5 text-gray-400" style={{ fontSize: "0.6875rem", fontWeight: 600 }}>Opcional</span>
            </div>
            <input ref={pharmFileRef} type="file" accept=".csv,.xls,.xlsx" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePharmFile(f); e.target.value = ""; }} />
            {!evalPharmFile ? (
              <div
                onClick={() => pharmFileRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setPharmDragging(true); }}
                onDragLeave={() => setPharmDragging(false)}
                onDrop={(e) => { e.preventDefault(); setPharmDragging(false); const f = e.dataTransfer.files[0]; if (f) handlePharmFile(f); }}
                className={`flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-8 cursor-pointer transition-all ${
                  pharmDragging ? "border-cyan-400 bg-cyan-500/5" : "border-gray-200 bg-gray-50/50 hover:border-gray-300 hover:bg-gray-100/30"
                }`}
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl border transition-all ${pharmDragging ? "bg-cyan-500/10 border-cyan-500/20" : "bg-white border-gray-200"}`}>
                  <UploadCloud className={`h-5 w-5 ${pharmDragging ? "text-cyan-500" : "text-gray-300"}`} />
                </div>
                <div className="text-center">
                  <p className="text-gray-500" style={{ fontWeight: 500, fontSize: "0.875rem" }}>
                    {pharmDragging ? "Suelta el archivo aquí" : "Sube el plan de compras de la botica para comparar"}
                  </p>
                  <p className="text-gray-400 mt-0.5" style={{ fontSize: "0.75rem" }}>CSV, XLS o XLSX</p>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-gray-200 overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border-b border-gray-100">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-200/60 border border-gray-200 shrink-0">
                    <FileText className="h-4 w-4 text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-800 truncate" style={{ fontSize: "0.8125rem", fontWeight: 600 }}>{evalPharmFile.name}</p>
                    <p className="text-gray-400" style={{ fontSize: "0.75rem" }}>
                      {formatFileSize(evalPharmFile.size)} · <span className="uppercase font-medium text-gray-500">{evalPharmFile.name.split(".").pop()}</span>
                    </p>
                  </div>
                  {pharmColsLoading
                    ? <Loader2 className="h-4 w-4 text-cyan-500 animate-spin shrink-0" />
                    : pharmColumns.length > 0
                      ? <span className="flex items-center gap-1 text-emerald-600 shrink-0" style={{ fontSize: "0.75rem", fontWeight: 500 }}>
                          <CheckCircle className="h-3.5 w-3.5" /> {pharmColumns.length} columnas
                        </span>
                      : null}
                  <button onClick={() => { setEvalPharmFile(null); }}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:text-gray-700 hover:border-gray-300 transition-all shrink-0">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                {pharmColumns.length > 0 && (
                  <div className="p-4 grid grid-cols-2 gap-3">
                    {[
                      { label: "Columna producto", value: evalPharmProdCol, set: setEvalPharmProdCol },
                      { label: "Columna cantidad", value: evalPharmQtyCol,  set: setEvalPharmQtyCol },
                    ].map(({ label, value, set }) => (
                      <div key={label}>
                        <label className="flex items-center gap-1 text-gray-500 mb-1.5" style={{ fontSize: "0.75rem", fontWeight: 500 }}>
                          {label}
                          {value && <CheckCircle className="h-3 w-3 text-emerald-500 ml-auto" />}
                        </label>
                        <select value={value} onChange={(e) => set(e.target.value)}
                          className={`w-full rounded-xl border px-3 py-2 text-gray-900 outline-none transition-colors ${
                            value ? "border-emerald-400 bg-emerald-50/30 focus:border-emerald-500" : "border-gray-200 bg-white focus:border-cyan-500/60"
                          }`}
                          style={{ fontSize: "0.8125rem" }}>
                          <option value="">— selecciona —</option>
                          {pharmColumns.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* No plan warning */}
          {!purchasePlanIdLoading && !purchasePlanId && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-amber-700" style={{ fontSize: "0.8125rem", fontWeight: 600 }}>Esta predicción no tiene plan de compras</p>
                <p className="text-amber-600 mt-0.5" style={{ fontSize: "0.75rem" }}>
                  Para evaluar necesitas generar primero el plan. Haz una nueva predicción con los mismos datos y completa el paso "Plan de compras".
                </p>
              </div>
            </div>
          )}

          {planEvalError && (
            <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
              <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-red-600" style={{ fontSize: "0.8125rem" }}>{planEvalError}</p>
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <p className="text-gray-400" style={{ fontSize: "0.75rem" }}>
              {purchasePlanIdLoading ? "Verificando plan de compras…" :
               !purchasePlanId         ? "Genera el plan de compras primero" :
               !evalSalesFile          ? "Sube las ventas reales para continuar" :
               !evalSalesProdCol || !evalSalesQtyCol ? "Selecciona las columnas requeridas" :
               "Listo para evaluar"}
            </p>
            <button
              disabled={!canEvaluate || planEvalLoading}
              onClick={handleEvaluate}
              className="flex items-center gap-2 rounded-xl bg-cyan-500 px-5 py-2.5 text-white hover:bg-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              style={{ fontSize: "0.875rem", fontWeight: 600 }}>
              {planEvalLoading
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Evaluando…</>
                : <><ClipboardCheck className="h-4 w-4" /> Evaluar plan</>}
            </button>
          </div>
        </div>
      </motion.div>

      {/* Results */}
      {planEvalResult && (
        <div ref={evalResultRef} className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100">
            <p className="text-gray-900 mb-4" style={{ fontWeight: 700, fontSize: "1rem" }}>Resultado</p>
            <div className={`grid gap-4 ${planEvalResult.summary.hasPharmacyPlan ? "grid-cols-2 lg:grid-cols-4" : "grid-cols-2"}`}>
              <div className="rounded-xl bg-cyan-50 border border-cyan-100 p-4">
                <p className="text-cyan-600 mb-1" style={{ fontSize: "0.75rem", fontWeight: 600 }}>Efectividad PharmaCast</p>
                <p className="text-cyan-700" style={{ fontSize: "1.75rem", fontWeight: 700, lineHeight: 1.1 }}>
                  {planEvalResult.summary.pharmaCastGoodPct}%
                </p>
                <p className="text-cyan-500 mt-0.5" style={{ fontSize: "0.75rem" }}>
                  {planEvalResult.summary.pharmaCastGoodCount}/{planEvalResult.summary.totalProducts} productos · MAPE {planEvalResult.summary.pharmaCastAvgMape}%
                </p>
              </div>
              {planEvalResult.summary.hasPharmacyPlan && (
                <div className="rounded-xl bg-orange-50 border border-orange-100 p-4">
                  <p className="text-orange-600 mb-1" style={{ fontSize: "0.75rem", fontWeight: 600 }}>Efectividad Botica</p>
                  <p className="text-orange-700" style={{ fontSize: "1.75rem", fontWeight: 700, lineHeight: 1.1 }}>
                    {planEvalResult.summary.pharmacyGoodPct}%
                  </p>
                  <p className="text-orange-500 mt-0.5" style={{ fontSize: "0.75rem" }}>
                    {planEvalResult.summary.pharmacyGoodCount}/{planEvalResult.summary.totalProducts} productos · MAPE {planEvalResult.summary.pharmacyAvgMape ?? "—"}%
                  </p>
                </div>
              )}
              {planEvalResult.summary.hasPrice && (
                <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4">
                  <p className="text-emerald-600 mb-1" style={{ fontSize: "0.75rem", fontWeight: 600 }}>Sobrestock PharmaCast</p>
                  <p className="text-emerald-700" style={{ fontSize: "1.75rem", fontWeight: 700, lineHeight: 1.1 }}>
                    S/. {planEvalResult.summary.pharmaCastTotalSobrestockSoles.toLocaleString("es-PE", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </p>
                  <p className="text-emerald-500 mt-0.5" style={{ fontSize: "0.75rem" }}>
                    Desabasto: S/. {planEvalResult.summary.pharmaCastTotalDesabastoSoles.toLocaleString("es-PE", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </p>
                </div>
              )}
              {planEvalResult.summary.hasPrice && planEvalResult.summary.hasPharmacyPlan && planEvalResult.summary.pharmacyTotalSobrestockSoles != null && (
                <div className="rounded-xl bg-red-50 border border-red-100 p-4">
                  <p className="text-red-600 mb-1" style={{ fontSize: "0.75rem", fontWeight: 600 }}>Sobrestock Botica</p>
                  <p className="text-red-700" style={{ fontSize: "1.75rem", fontWeight: 700, lineHeight: 1.1 }}>
                    S/. {planEvalResult.summary.pharmacyTotalSobrestockSoles.toLocaleString("es-PE", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </p>
                  <p className="text-red-500 mt-0.5" style={{ fontSize: "0.75rem" }}>
                    Desabasto: S/. {(planEvalResult.summary.pharmacyTotalDesabastoSoles ?? 0).toLocaleString("es-PE", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Items table */}
          <div className="overflow-x-auto" style={{ maxHeight: 420, overflowY: "auto" }}>
            <table className="w-full">
              <thead className="sticky top-0 bg-gray-50 z-10">
                <tr className="border-b border-gray-100">
                  <th className="px-4 py-3 text-left text-gray-400" style={{ fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Producto</th>
                  <th className="px-4 py-3 text-right text-gray-400" style={{ fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Vendido real</th>
                  <th className="px-4 py-3 text-right text-gray-400" style={{ fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>PharmaCast</th>
                  {planEvalResult.summary.hasPharmacyPlan && (
                    <th className="px-4 py-3 text-right text-gray-400" style={{ fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Botica</th>
                  )}
                  {planEvalResult.summary.hasPrice && (
                    <th className="px-4 py-3 text-right text-gray-400" style={{ fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Sobrestock S/.</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {planEvalResult.items.length === 0 && (() => {
                  const planHasNumbers = planSampleNames.length > 0 && planSampleNames.every((n) => !isNaN(Number(n)));
                  return (
                    <tr>
                      <td colSpan={10} className="px-4 py-8">
                        {planHasNumbers ? (
                          <div className="max-w-lg mx-auto rounded-xl border border-red-200 bg-red-50 p-4">
                            <p className="text-red-700 font-semibold mb-1" style={{ fontSize: "0.875rem" }}>El plan fue generado con un mapeo de columnas incorrecto</p>
                            <p className="text-red-600 mb-3" style={{ fontSize: "0.8125rem" }}>
                              Los "nombres de producto" guardados son números ({planSampleNames.slice(0, 3).join(", ")}…), lo que indica que se mapeó una columna numérica como columna de producto.
                            </p>
                            <p className="text-red-500" style={{ fontSize: "0.75rem" }}>
                              Solución: haz una nueva predicción asegurándote de mapear la columna correcta como "Producto", genera el plan y evalúa con ese plan.
                            </p>
                          </div>
                        ) : (
                          <>
                            <p className="text-gray-500 font-medium text-center mb-4" style={{ fontSize: "0.875rem" }}>Ningún producto coincidió — nombres distintos entre plan y CSV</p>
                            <div className="grid grid-cols-2 gap-4 max-w-2xl mx-auto">
                              {planSampleNames.length > 0 && (
                                <div className="rounded-xl border border-cyan-100 bg-cyan-50/50 p-3">
                                  <p className="text-cyan-700 mb-2" style={{ fontSize: "0.75rem", fontWeight: 600 }}>El plan espera nombres como:</p>
                                  {planSampleNames.map((n, i) => <p key={i} className="text-cyan-600 font-mono truncate" style={{ fontSize: "0.7rem" }}>{n}</p>)}
                                </div>
                              )}
                              {csvSampleNames.length > 0 && (
                                <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-3">
                                  <p className="text-amber-700 mb-2" style={{ fontSize: "0.75rem", fontWeight: 600 }}>Tu CSV tiene (col «{evalSalesProdColValue}»):</p>
                                  {csvSampleNames.map((n, i) => <p key={i} className="text-amber-600 font-mono truncate" style={{ fontSize: "0.7rem" }}>{n}</p>)}
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })()}
                {planEvalResult.items.map((item, i) => {
                  const cls: Record<string, string> = {
                    good: "text-emerald-700 bg-emerald-50 border border-emerald-200",
                    ok:   "text-yellow-700 bg-yellow-50 border border-yellow-200",
                    poor: "text-red-600 bg-red-50 border border-red-200",
                  };
                  return (
                    <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3 text-gray-800" style={{ fontSize: "0.8125rem", fontWeight: 500, maxWidth: 220 }}>
                        <span title={item.productName}>{item.productName.length > 36 ? item.productName.slice(0, 36) + "…" : item.productName}</span>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-500" style={{ fontSize: "0.8125rem" }}>{Math.round(item.actualSold)}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`inline-block rounded-md px-2 py-0.5 ${cls[item.pharmaCastAccuracy]}`} style={{ fontSize: "0.8125rem", fontWeight: 500 }}>
                          {Math.round(item.pharmaCastPlan)}
                        </span>
                      </td>
                      {planEvalResult.summary.hasPharmacyPlan && (
                        <td className="px-4 py-3 text-right">
                          {item.pharmacyPlan != null && item.pharmacyAccuracy
                            ? <span className={`inline-block rounded-md px-2 py-0.5 ${cls[item.pharmacyAccuracy]}`} style={{ fontSize: "0.8125rem", fontWeight: 500 }}>{Math.round(item.pharmacyPlan)}</span>
                            : <span className="text-gray-300" style={{ fontSize: "0.8125rem" }}>—</span>}
                        </td>
                      )}
                      {planEvalResult.summary.hasPrice && (
                        <td className="px-4 py-3 text-right" style={{ fontSize: "0.8125rem" }}>
                          {item.sobrestockSoles > 0
                            ? <span className="text-red-500 font-medium">S/. {item.sobrestockSoles.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            : item.desabastoSoles > 0
                              ? <span className="text-amber-500">−S/. {item.desabastoSoles.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                              : <span className="text-emerald-500">✓</span>}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Comparative chart */}
          <div className="px-6 py-5 border-t border-gray-100">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <p className="text-gray-700" style={{ fontWeight: 600, fontSize: "0.9375rem" }}>Comparativa visual</p>
              <div className="flex items-center gap-1.5">
                <span className="text-gray-400 mr-1" style={{ fontSize: "0.75rem" }}>Mostrar:</span>
                {([10, 20, planEvalResult.items.length] as const).map((n) => {
                  const label = n === planEvalResult.items.length ? "Todos" : `Top ${n}`;
                  return (
                    <button key={n} onClick={() => setChartLimit(n)}
                      className={`rounded-lg border px-3 py-1 transition-all ${
                        chartLimit === n ? "border-cyan-500/50 bg-cyan-500/10 text-cyan-600" : "border-gray-200 bg-white text-gray-400 hover:text-gray-600"
                      }`}
                      style={{ fontSize: "0.75rem", fontWeight: 500 }}>
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
            {(() => {
              const chartData = planEvalResult.items.slice(0, chartLimit).map((item) => ({
                name: item.productName.length > 12 ? item.productName.slice(0, 12) + "…" : item.productName,
                fullName: item.productName,
                actual: Math.round(item.actualSold),
                pharmaCast: Math.round(item.pharmaCastPlan),
                ...(planEvalResult.summary.hasPharmacyPlan ? { botica: item.pharmacyPlan != null ? Math.round(item.pharmacyPlan) : null } : {}),
              }));
              const showLabels = chartLimit <= 15;
              const labelInterval = showLabels ? Math.max(0, Math.floor(chartLimit / 8) - 1) : undefined;
              return (
                <>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: showLabels ? 56 : 12 }}>
                      <CartesianGrid strokeDasharray="4 4" stroke="#f1f5f9" vertical={false} />
                      <XAxis
                        dataKey="name"
                        tick={showLabels ? { fill: "#94a3b8", fontSize: 10 } : false}
                        tickLine={false}
                        axisLine={showLabels}
                        angle={showLabels ? -40 : 0}
                        textAnchor={showLabels ? "end" : "middle"}
                        interval={labelInterval}
                        dy={6}
                      />
                      <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} tickLine={false} axisLine={false} width={40} />
                      <Tooltip
                        content={({ active, payload }: any) => {
                          if (!active || !payload?.length) return null;
                          const d = payload[0]?.payload;
                          return (
                            <div className="rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-xl" style={{ minWidth: 200 }}>
                              <p className="text-gray-600 mb-2" style={{ fontSize: "0.75rem", fontWeight: 600 }}>{d?.fullName ?? d?.name}</p>
                              {payload.map((p: any) => (
                                <div key={p.dataKey} className="flex items-center justify-between gap-4 py-0.5">
                                  <div className="flex items-center gap-1.5">
                                    <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: p.stroke }} />
                                    <span className="text-gray-500" style={{ fontSize: "0.75rem" }}>{p.name}</span>
                                  </div>
                                  <span style={{ color: p.stroke, fontSize: "0.875rem", fontWeight: 700 }}>{p.value} uds</span>
                                </div>
                              ))}
                            </div>
                          );
                        }}
                      />
                      <Legend
                        verticalAlign="top"
                        align="center"
                        wrapperStyle={{ paddingBottom: 12 }}
                        formatter={(v) => <span style={{ color: "#6b7280", fontSize: "0.75rem" }}>{v}</span>}
                      />
                      <Line type="monotone" dataKey="actual" name="Vendido real" stroke="#3b82f6" strokeWidth={2.5} dot={false} />
                      <Line type="monotone" dataKey="pharmaCast" name="Plan PharmaCast" stroke="#06b6d4" strokeWidth={2.5} dot={false} />
                      {planEvalResult.summary.hasPharmacyPlan && (
                        <Line type="monotone" dataKey="botica" name="Plan Botica" stroke="#f97316" strokeWidth={2} strokeDasharray="5 3" dot={false} />
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                  <p className="text-gray-400 text-center mt-1" style={{ fontSize: "0.7rem" }}>
                    {showLabels
                      ? `Ordenado por cantidad prevista — Top ${Math.min(chartLimit, planEvalResult.items.length)} de ${planEvalResult.items.length} productos`
                      : `${Math.min(chartLimit, planEvalResult.items.length)} productos — pasa el cursor sobre el gráfico para ver el nombre`}
                  </p>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
