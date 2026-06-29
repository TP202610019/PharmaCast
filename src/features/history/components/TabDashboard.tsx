import { motion, AnimatePresence } from "motion/react";
import {
  TrendingUp, TrendingDown, Minus, Package, BarChart3, Calendar,
  Search, CheckCircle, PanelLeftClose, PanelLeftOpen, Loader2,
} from "lucide-react";
import {
  ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { Paginator } from "@/shared/components/Paginator";
import type { DashboardSummaryResponse, DashboardProductRow, PagedResult } from "@/shared/types/api";
import type { ChartPoint } from "@/shared/lib/transforms";

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const filtered = payload.filter((p: any) => p.value != null && p.name !== "upper" && p.name !== "lower");
  if (!filtered.length) return null;
  return (
    <div className="rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-xl" style={{ minWidth: 170 }}>
      <p className="text-gray-400 mb-2" style={{ fontSize: "0.6875rem", fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase" }}>{label}</p>
      {filtered.map((p: any) => (
        <div key={p.name} className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: p.name === "historical" ? "#3b82f6" : "#06b6d4" }} />
            <span className="text-gray-500" style={{ fontSize: "0.75rem" }}>{p.name === "historical" ? "Histórico" : "Predicción"}</span>
          </div>
          <span style={{ color: p.name === "historical" ? "#3b82f6" : "#06b6d4", fontSize: "0.875rem", fontWeight: 700 }}>{p.value} uds</span>
        </div>
      ))}
    </div>
  );
};

interface Props {
  summary: DashboardSummaryResponse;
  productsData: PagedResult<DashboardProductRow> | null;
  productsLoading: boolean;
  resultsPage: number;
  setResultsPage: (p: number) => void;
  resultsSearch: string;
  setResultsSearch: (s: string) => void;
  selectedProduct: string;
  setSelectedProduct: (name: string) => void;
  chartData: ChartPoint[];
  chartLoading: boolean;
  showConfidence: boolean;
  setShowConfidence: (v: boolean) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (v: boolean | ((prev: boolean) => boolean)) => void;
  sidebarSearch: string;
  setSidebarSearch: (s: string) => void;
  sidebarProducts: string[];
  bridgeDateLabel: string;
  getAvgHistorical: (p: DashboardProductRow) => number;
  getVariation: (p: DashboardProductRow) => number;
  PAGE: number;
}

export function TabDashboard({
  summary, productsData, productsLoading,
  resultsPage, setResultsPage, resultsSearch, setResultsSearch,
  selectedProduct, setSelectedProduct,
  chartData, chartLoading,
  showConfidence, setShowConfidence,
  sidebarOpen, setSidebarOpen,
  sidebarSearch, setSidebarSearch,
  sidebarProducts, bridgeDateLabel,
  getAvgHistorical, getVariation, PAGE,
}: Props) {
  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Demanda Total Prevista", value: `${Math.round(summary.totalForecastedUnits).toLocaleString()} uds`, icon: TrendingUp, iconColor: "text-cyan-500",   iconBg: "bg-cyan-500/10 border-cyan-500/20" },
          { label: "Productos Analizados",   value: summary.totalProducts.toString(),                                    icon: Package,   iconColor: "text-blue-500",   iconBg: "bg-blue-500/10 border-blue-500/20" },
          { label: "Precisión Estimada",     value: summary.accuracy > 0 ? `${summary.accuracy}%` : "—",                icon: BarChart3, iconColor: "text-purple-500", iconBg: "bg-purple-500/10 border-purple-500/20" },
          { label: "Horizonte Analizado",    value: `${summary.forecastPeriod ?? "—"} días`,                            icon: Calendar,  iconColor: "text-orange-500", iconBg: "bg-orange-500/10 border-orange-500/20" },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border ${card.iconBg}`}>
                <Icon className={`h-6 w-6 ${card.iconColor}`} />
              </div>
              <div>
                <p className="text-gray-400 mb-0.5" style={{ fontSize: "0.75rem" }}>{card.label}</p>
                <p className="text-gray-900" style={{ fontSize: "1.375rem", fontWeight: 700, lineHeight: 1.1 }}>{card.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Chart */}
      {summary.totalProducts > 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden relative">
          <AnimatePresence>
            {sidebarOpen && (
              <>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }} className="absolute inset-0 bg-black/10 z-10"
                  onClick={() => setSidebarOpen(false)} />
                <motion.div initial={{ x: -304 }} animate={{ x: 0 }} exit={{ x: -304 }}
                  transition={{ type: "spring", stiffness: 320, damping: 32 }}
                  className="absolute top-0 left-0 bottom-0 w-72 bg-white border-r border-gray-200 z-20 flex flex-col shadow-2xl"
                  style={{ borderRadius: "1rem 0 0 1rem" }}>
                  <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
                    <div>
                      <p className="text-gray-900" style={{ fontSize: "0.875rem", fontWeight: 600 }}>Medicamentos</p>
                      <p className="text-gray-400" style={{ fontSize: "0.75rem" }}>{sidebarProducts.length} de {summary.productNames.length}</p>
                    </div>
                    <button onClick={() => setSidebarOpen(false)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all">
                      <PanelLeftClose className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="px-4 py-3 border-b border-gray-100">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                      <input type="text" placeholder="Buscar medicamento..." value={sidebarSearch}
                        onChange={(e) => setSidebarSearch(e.target.value)}
                        className="w-full rounded-lg border border-gray-200 bg-gray-50 pl-8 pr-3 py-2 text-gray-900 placeholder:text-gray-400 outline-none focus:border-cyan-500/60 focus:bg-white transition-all"
                        style={{ fontSize: "0.8125rem" }} autoFocus />
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto py-2">
                    {sidebarProducts.length === 0 ? (
                      <div className="flex flex-col items-center gap-2 py-10 text-center">
                        <Search className="h-6 w-6 text-gray-300" />
                        <p className="text-gray-400" style={{ fontSize: "0.8125rem" }}>Sin resultados</p>
                      </div>
                    ) : sidebarProducts.map((name) => {
                      const isSelected = name === selectedProduct;
                      return (
                        <button key={name} onClick={() => { setSelectedProduct(name); setSidebarOpen(false); }}
                          className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all hover:bg-gray-50 ${isSelected ? "bg-cyan-500/5 border-r-2 border-r-cyan-500" : ""}`}>
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-500/10">
                            <span className="h-2 w-2 rounded-full bg-cyan-500" />
                          </div>
                          <p className={`flex-1 truncate ${isSelected ? "text-cyan-600" : "text-gray-900"}`}
                            style={{ fontSize: "0.8125rem", fontWeight: isSelected ? 600 : 500 }}>{name}</p>
                          {isSelected && <CheckCircle className="h-4 w-4 text-cyan-500 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>

          <div className="px-6 pt-5 pb-4 border-b border-gray-100">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <button onClick={() => setSidebarOpen((v) => !v)}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2 transition-all ${sidebarOpen ? "border-cyan-500/50 bg-cyan-500/10 text-cyan-600" : "border-gray-300 bg-white text-gray-600 hover:border-gray-400"}`}
                  style={{ fontSize: "0.8125rem", fontWeight: 500 }}>
                  {sidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
                  <span className="hidden sm:inline">Medicamentos</span>
                </button>
                <div>
                  <p className="text-gray-900" style={{ fontWeight: 600, fontSize: "0.9375rem" }}>
                    {selectedProduct || "Selecciona un medicamento"}
                  </p>
                  <p className="text-gray-400" style={{ fontSize: "0.75rem" }}>{summary.forecastPeriod} días predichos</p>
                </div>
              </div>
              <button onClick={() => setShowConfidence(!showConfidence)}
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 transition-all ${showConfidence ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-600" : "border-gray-300 bg-white text-gray-500"}`}
                style={{ fontSize: "0.75rem", fontWeight: 500 }}>
                {showConfidence ? "Ocultar" : "Mostrar"} intervalo de confianza
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-5 mt-3">
              <div className="flex items-center gap-2">
                <svg width="24" height="10" viewBox="0 0 24 10"><line x1="0" y1="5" x2="24" y2="5" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" /></svg>
                <span className="text-gray-500" style={{ fontSize: "0.75rem" }}>Histórico</span>
              </div>
              <div className="flex items-center gap-2">
                <svg width="24" height="10" viewBox="0 0 24 10"><line x1="0" y1="5" x2="24" y2="5" stroke="#06b6d4" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="6 3" /></svg>
                <span className="text-gray-500" style={{ fontSize: "0.75rem" }}>Predicción</span>
              </div>
              {showConfidence && (
                <div className="flex items-center gap-2">
                  <div className="h-3 w-6 rounded bg-cyan-400/20 border border-cyan-400/30" />
                  <span className="text-gray-500" style={{ fontSize: "0.75rem" }}>Intervalo ±11%</span>
                </div>
              )}
            </div>
          </div>

          <div className="px-2 py-4">
            {chartLoading ? (
              <div className="flex items-center justify-center h-[320px]">
                <Loader2 className="h-6 w-6 text-cyan-500 animate-spin" />
              </div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div key={selectedProduct} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
                  <ResponsiveContainer width="100%" height={320}>
                    <ComposedChart data={chartData} margin={{ top: 10, right: 24, left: 0, bottom: 8 }}>
                      <defs>
                        <linearGradient id="confGradHD" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.15} />
                          <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="4 4" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="date" tick={{ fill: "#cbd5e1", fontSize: 10 }} tickLine={false} axisLine={false} interval={7} dy={8} />
                      <YAxis tick={{ fill: "#cbd5e1", fontSize: 10 }} tickLine={false} axisLine={false} width={36} />
                      <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#e2e8f0", strokeWidth: 1.5, strokeDasharray: "4 4" }} />
                      <ReferenceLine x={bridgeDateLabel} stroke="#f97316" strokeWidth={1.5} strokeDasharray="4 3"
                        label={{ value: "Hoy", position: "insideTopRight", fill: "#f97316", fontSize: 10, fontWeight: 600 }} />
                      {showConfidence && <Area type="monotone" dataKey="upper" stroke="none" fill="url(#confGradHD)" connectNulls={false} isAnimationActive={false} />}
                      {showConfidence && <Area type="monotone" dataKey="lower" stroke="none" fill="#ffffff" connectNulls={false} isAnimationActive={false} />}
                      <Line type="monotone" dataKey="historical" stroke="#3b82f6" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: "#3b82f6", strokeWidth: 0 }} connectNulls={false} />
                      <Line type="monotone" dataKey="predicted" stroke="#06b6d4" strokeWidth={2.5} strokeDasharray="8 4" dot={false} activeDot={{ r: 5, fill: "#06b6d4", strokeWidth: 0 }} connectNulls={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-sm">
          <p className="text-gray-400" style={{ fontSize: "0.875rem" }}>
            No hay resultados de predicción disponibles para esta ejecución.
          </p>
        </div>
      )}

      {/* Products table */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div>
            <h3 className="text-gray-900 mb-0.5" style={{ fontWeight: 600 }}>Medicamentos analizados</h3>
            <p className="text-gray-400" style={{ fontSize: "0.8125rem" }}>
              {productsData ? `${productsData.totalCount} productos en este análisis` : "Cargando..."}
            </p>
          </div>
          <div className="relative min-w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input type="text" placeholder="Buscar producto..." value={resultsSearch}
              onChange={(e) => { setResultsSearch(e.target.value); setResultsPage(1); }}
              className="w-full rounded-xl border border-gray-300 bg-white pl-8 pr-3 py-2 text-gray-900 placeholder:text-gray-400 outline-none focus:border-cyan-500/60 transition-colors"
              style={{ fontSize: "0.8125rem" }} />
          </div>
        </div>

        {productsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 text-cyan-500 animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  {["Producto", "Dem. Histórica Prom.", "Demanda Predicha (día)", "Variación (%)", "Tendencia"].map((h) => (
                    <th key={h} className="pb-3 text-left text-gray-400" style={{ fontSize: "0.75rem", fontWeight: 500 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(productsData?.items ?? []).map((p) => {
                  const hist = getAvgHistorical(p);
                  const varNum = getVariation(p);
                  const isUp = varNum > 5;
                  const isDown = varNum < -5;
                  const trendColor = isUp ? "text-cyan-500" : isDown ? "text-red-500" : "text-gray-400";
                  const trendBg = isUp ? "bg-cyan-500/10" : isDown ? "bg-red-500/10" : "bg-gray-100";
                  const TrendIcon = isUp ? TrendingUp : isDown ? TrendingDown : Minus;
                  return (
                    <tr key={p.productName} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="py-3 pr-3 text-gray-900" style={{ fontSize: "0.8125rem", fontWeight: 500 }}>{p.productName}</td>
                      <td className="py-3 pr-3 text-gray-500" style={{ fontSize: "0.8125rem" }}>{hist} uds</td>
                      <td className="py-3 pr-3 text-cyan-500" style={{ fontSize: "0.8125rem", fontWeight: 500 }}>{Math.round(p.avgPredictedQuantity)} uds</td>
                      <td className="py-3 pr-3" style={{ fontSize: "0.8125rem" }}>
                        <span className={varNum > 0 ? "text-cyan-500" : "text-red-500"} style={{ fontWeight: 500 }}>
                          {varNum > 0 ? "+" : ""}{varNum.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-3">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${trendBg} ${trendColor}`}
                          style={{ fontSize: "0.6875rem", fontWeight: 500 }}>
                          <TrendIcon className="h-3 w-3" />
                          {isUp ? "Al alza" : isDown ? "A la baja" : "Estable"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {!productsLoading && !productsData?.items.length && (
                  <tr><td colSpan={5} className="py-8 text-center text-gray-400" style={{ fontSize: "0.875rem" }}>No se encontraron productos</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        {productsData && (
          <Paginator page={resultsPage} total={productsData.totalCount} pageSize={PAGE} onChange={setResultsPage} />
        )}
      </div>
    </div>
  );
}
