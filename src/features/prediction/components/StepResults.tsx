import { motion, AnimatePresence } from "motion/react";
import {
  TrendingUp, TrendingDown, Minus, Package, BarChart3, Calendar,
  Search, X, CheckCircle, PanelLeftOpen, PanelLeftClose,
} from "lucide-react";
import {
  ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { Paginator } from "@/shared/components/Paginator";
import { priorityConfig } from "../constants";
import type { UIProduct, ChartPoint } from "@/shared/lib/transforms";

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const filtered = payload.filter((p: any) => p.value != null && p.name !== "upper" && p.name !== "lower");
    if (!filtered.length) return null;
    return (
      <div className="rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-xl" style={{ minWidth: 170 }}>
        <p className="text-gray-400 mb-2" style={{ fontSize: "0.6875rem", fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase" }}>{label}</p>
        {filtered.map((p: any) => (
          <div key={p.name} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: p.name === "historical" ? "#3b82f6" : "#06b6d4" }} />
              <span className="text-gray-500" style={{ fontSize: "0.75rem" }}>
                {p.name === "historical" ? "Histórico" : "Predicción"}
              </span>
            </div>
            <span style={{ color: p.name === "historical" ? "#3b82f6" : "#06b6d4", fontSize: "0.875rem", fontWeight: 700 }}>
              {p.value} uds
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

interface Props {
  products: UIProduct[];
  totalUnits: number;
  accuracy: number;
  forecastDays: number;
  selectedProductId: string;
  setSelectedProductId: (id: string) => void;
  showConfidence: boolean;
  setShowConfidence: (v: boolean) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (v: boolean) => void;
  sidebarSearch: string;
  setSidebarSearch: (s: string) => void;
  resultsTablePage: number;
  setResultsTablePage: (p: number) => void;
  resultsSearch: string;
  setResultsSearch: (s: string) => void;
  selectedProduct: UIProduct | undefined;
  productChartData: ChartPoint[];
  bridgeDateLabel: string;
  tableData: (UIProduct & { avgHistorical: number; variation: number })[];
  sidebarProducts: UIProduct[];
  searchedTableData: (UIProduct & { avgHistorical: number; variation: number })[];
  paginatedTableData: (UIProduct & { avgHistorical: number; variation: number })[];
}

export function StepResults({
  products, totalUnits, accuracy, forecastDays,
  selectedProductId, setSelectedProductId,
  showConfidence, setShowConfidence,
  sidebarOpen, setSidebarOpen,
  sidebarSearch, setSidebarSearch,
  resultsTablePage, setResultsTablePage,
  resultsSearch, setResultsSearch,
  selectedProduct, productChartData, bridgeDateLabel,
  tableData, sidebarProducts, searchedTableData, paginatedTableData,
}: Props) {
  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Demanda Total Prevista", value: totalUnits > 0 ? `${totalUnits.toLocaleString()} uds` : "—", icon: TrendingUp, iconColor: "text-cyan-500",   iconBg: "bg-cyan-500/10 border-cyan-500/20" },
          { label: "Productos Analizados",   value: products.length > 0 ? products.length.toString() : "—",   icon: Package,    iconColor: "text-blue-500",   iconBg: "bg-blue-500/10 border-blue-500/20" },
          { label: "Precisión Estimada",     value: accuracy > 0 ? `${accuracy}%` : "—",                      icon: BarChart3,  iconColor: "text-purple-500", iconBg: "bg-purple-500/10 border-purple-500/20" },
          { label: "Horizonte Analizado",    value: `${forecastDays} días`,                                    icon: Calendar,   iconColor: "text-orange-500", iconBg: "bg-orange-500/10 border-orange-500/20" },
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

      {/* Chart + sidebar */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden relative">
        <AnimatePresence>
          {sidebarOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
                className="absolute inset-0 bg-black/10 z-10"
                onClick={() => setSidebarOpen(false)}
              />
              <motion.div
                initial={{ x: -304 }} animate={{ x: 0 }} exit={{ x: -304 }}
                transition={{ type: "spring", stiffness: 320, damping: 32 }}
                className="absolute top-0 left-0 bottom-0 w-72 bg-white border-r border-gray-200 z-20 flex flex-col shadow-2xl"
                style={{ borderRadius: "1rem 0 0 1rem" }}
              >
                <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
                  <div>
                    <p className="text-gray-900" style={{ fontSize: "0.875rem", fontWeight: 600 }}>Medicamentos</p>
                    <p className="text-gray-400" style={{ fontSize: "0.75rem" }}>{sidebarProducts.length} de {products.length}</p>
                  </div>
                  <button onClick={() => setSidebarOpen(false)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all">
                    <X className="h-4 w-4" />
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
                    <div className="flex flex-col items-center gap-2 py-10 px-4 text-center">
                      <Search className="h-6 w-6 text-gray-300" />
                      <p className="text-gray-400" style={{ fontSize: "0.8125rem" }}>Sin resultados</p>
                    </div>
                  ) : (
                    sidebarProducts.map((p) => {
                      const isSelected = p.id === selectedProductId;
                      const pConf = priorityConfig[p.priority];
                      return (
                        <button key={p.id} onClick={() => { setSelectedProductId(p.id); setSidebarOpen(false); }}
                          className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all hover:bg-gray-50 ${isSelected ? "bg-cyan-500/5 border-r-2 border-r-cyan-500" : ""}`}>
                          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${pConf.bg}`}>
                            <span className={`h-2 w-2 rounded-full ${pConf.dot}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`truncate ${isSelected ? "text-cyan-600" : "text-gray-900"}`}
                              style={{ fontSize: "0.8125rem", fontWeight: isSelected ? 600 : 500 }}>{p.name}</p>
                            <p className="text-gray-400 truncate" style={{ fontSize: "0.6875rem" }}>{p.category}</p>
                          </div>
                          {isSelected && <CheckCircle className="h-4 w-4 text-cyan-500 shrink-0" />}
                        </button>
                      );
                    })
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <div className="px-6 pt-5 pb-4 border-b border-gray-100">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button onClick={() => setSidebarOpen((v) => !v)}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2 transition-all ${sidebarOpen ? "border-cyan-500/50 bg-cyan-500/10 text-cyan-600" : "border-gray-300 bg-white text-gray-600 hover:border-gray-400 hover:text-gray-900"}`}
                style={{ fontSize: "0.8125rem", fontWeight: 500 }}>
                {sidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
                <span className="hidden sm:inline">Medicamentos</span>
              </button>
              <div>
                <p className="text-gray-900" style={{ fontWeight: 600, fontSize: "0.9375rem" }}>
                  {selectedProduct?.name ?? "Selecciona un medicamento"}
                </p>
                <p className="text-gray-400" style={{ fontSize: "0.75rem" }}>
                  {selectedProduct?.category} · {forecastDays} días predichos
                </p>
              </div>
            </div>
            <button onClick={() => setShowConfidence((v) => !v)}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 transition-all ${showConfidence ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-600" : "border-gray-300 bg-white text-gray-500 hover:border-gray-400"}`}
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
            <div className="flex items-center gap-2 ml-auto">
              <svg width="2" height="12" viewBox="0 0 2 12"><line x1="1" y1="0" x2="1" y2="12" stroke="#f97316" strokeWidth="1.5" strokeDasharray="3 2" /></svg>
              <span className="text-gray-500" style={{ fontSize: "0.75rem" }}>Inicio predicción</span>
            </div>
          </div>
        </div>

        <div className="px-2 py-4">
          <AnimatePresence mode="wait">
            <motion.div key={selectedProductId} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
              <ResponsiveContainer width="100%" height={320}>
                <ComposedChart data={productChartData} margin={{ top: 10, right: 24, left: 0, bottom: 8 }}>
                  <defs>
                    <linearGradient id="confGradientPF" x1="0" y1="0" x2="0" y2="1">
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
                  {showConfidence && <Area type="monotone" dataKey="upper" stroke="none" fill="url(#confGradientPF)" connectNulls={false} isAnimationActive={false} />}
                  {showConfidence && <Area type="monotone" dataKey="lower" stroke="none" fill="#ffffff" connectNulls={false} isAnimationActive={false} />}
                  <Line type="monotone" dataKey="historical" stroke="#3b82f6" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: "#3b82f6", strokeWidth: 0 }} connectNulls={false} />
                  <Line type="monotone" dataKey="predicted" stroke="#06b6d4" strokeWidth={2.5} strokeDasharray="8 4" dot={false} activeDot={{ r: 5, fill: "#06b6d4", strokeWidth: 0 }} connectNulls={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Products table */}
      {products.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <div>
              <h3 className="text-gray-900 mb-0.5" style={{ fontWeight: 600 }}>Medicamentos analizados</h3>
              <p className="text-gray-400" style={{ fontSize: "0.8125rem" }}>{tableData.length} productos en este análisis</p>
            </div>
            <div className="relative min-w-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <input type="text" placeholder="Buscar producto..." value={resultsSearch}
                onChange={(e) => { setResultsSearch(e.target.value); setResultsTablePage(1); }}
                className="w-full rounded-xl border border-gray-300 bg-white pl-8 pr-3 py-2 text-gray-900 placeholder:text-gray-400 outline-none focus:border-cyan-500/60 transition-colors"
                style={{ fontSize: "0.8125rem" }} />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  {["Producto", "Categoría", "Dem. Histórica Prom.", "Demanda Predicha", "Variación (%)", "Tendencia"].map((h) => (
                    <th key={h} className="pb-3 text-left text-gray-400" style={{ fontSize: "0.75rem", fontWeight: 500 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginatedTableData.map((row) => {
                  const varNum = row.variation;
                  const TrendIcon = varNum > 5 ? TrendingUp : varNum < -5 ? TrendingDown : Minus;
                  const trendColor = varNum > 5 ? "text-cyan-500" : varNum < -5 ? "text-red-500" : "text-gray-400";
                  const trendBg = varNum > 5 ? "bg-cyan-500/10" : varNum < -5 ? "bg-red-500/10" : "bg-gray-100";
                  return (
                    <tr key={row.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="py-3 pr-3 text-gray-900" style={{ fontSize: "0.8125rem", fontWeight: 500 }}>{row.name}</td>
                      <td className="py-3 pr-3 text-gray-500" style={{ fontSize: "0.8125rem" }}>{row.category}</td>
                      <td className="py-3 pr-3 text-gray-500" style={{ fontSize: "0.8125rem" }}>{row.avgHistorical} uds</td>
                      <td className="py-3 pr-3 text-cyan-500" style={{ fontSize: "0.8125rem", fontWeight: 500 }}>{row.predictedDemand} uds</td>
                      <td className="py-3 pr-3" style={{ fontSize: "0.8125rem" }}>
                        <span className={varNum > 0 ? "text-cyan-500" : "text-red-500"} style={{ fontWeight: 500 }}>
                          {varNum > 0 ? "+" : ""}{varNum.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-3">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${trendBg} ${trendColor}`}
                          style={{ fontSize: "0.6875rem", fontWeight: 500 }}>
                          <TrendIcon className="h-3 w-3" />
                          {varNum > 5 ? "Al alza" : varNum < -5 ? "A la baja" : "Estable"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Paginator page={resultsTablePage} total={searchedTableData.length} pageSize={10} onChange={setResultsTablePage} />
        </div>
      )}
    </div>
  );
}
