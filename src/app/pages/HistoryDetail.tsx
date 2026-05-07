import { useParams, useNavigate } from "react-router";
import {
  ArrowLeft,
  Calendar,
  Clock,
  TrendingUp,
  AlertCircle,
  Download,
  Package,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Search,
  CheckCircle,
  TrendingDown,
  Minus,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { motion, AnimatePresence } from "motion/react";
import { useState, useMemo, useEffect } from "react";
import { mockHistory } from "../data/mockData";
import type { PurchasePlanItem } from "../data/mockData";

const priorityConfig = {
  critical: { label: "Crítico", color: "text-red-500", bg: "bg-red-500/10", border: "border-red-500/30", dot: "bg-red-500" },
  high: { label: "Alto", color: "text-orange-500", bg: "bg-orange-500/10", border: "border-orange-500/30", dot: "bg-orange-500" },
  medium: { label: "Medio", color: "text-yellow-500", bg: "bg-yellow-500/10", border: "border-yellow-500/30", dot: "bg-yellow-500" },
  low: { label: "Bajo", color: "text-cyan-500", bg: "bg-cyan-500/10", border: "border-cyan-500/30", dot: "bg-cyan-500" },
};

const variationFactorByPriority: Record<string, number> = {
  critical: 0.76,
  high: 0.84,
  medium: 0.93,
  low: 0.99,
};

interface ProductChartPoint {
  date: string;
  historical: number | null;
  predicted: number | null;
  upper: number | null;
  lower: number | null;
}

const generateProductChartData = (product: PurchasePlanItem, days: number): ProductChartPoint[] => {
  const data: ProductChartPoint[] = [];
  const today = new Date(2026, 4, 5);
  const factor = variationFactorByPriority[product.priority] ?? 0.88;
  const baseVal = product.predictedDemand * factor;

  for (let i = -30; i < days; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const label = d.toLocaleDateString("es-ES", { month: "short", day: "numeric" });
    const noise = (Math.random() - 0.5) * baseVal * 0.12;
    const wave = Math.sin(i * 0.38) * baseVal * 0.1;
    const base = Math.round(Math.max(0, baseVal + wave + noise));

    if (i < 0) {
      data.push({ date: label, historical: base, predicted: null, upper: null, lower: null });
    } else if (i === 0) {
      data.push({ date: label, historical: base, predicted: base, upper: base, lower: base });
    } else {
      const ramp = product.predictedDemand * (1 + (i / days) * 0.08);
      const predNoise = (Math.random() - 0.5) * 12;
      const predVal = Math.round(Math.max(0, ramp + predNoise));
      const conf = Math.round(predVal * 0.11);
      data.push({ date: label, historical: null, predicted: predVal, upper: predVal + conf, lower: Math.max(0, predVal - conf) });
    }
  }
  return data;
};

const getAvgHistorical = (p: PurchasePlanItem) =>
  Math.round(p.predictedDemand * (variationFactorByPriority[p.priority] ?? 0.88));

const getVariation = (p: PurchasePlanItem) => {
  const avg = getAvgHistorical(p);
  return avg > 0 ? ((p.predictedDemand - avg) / avg) * 100 : 0;
};

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

const PAGE_SIZE_TABLE = 5;
const PAGE_SIZE_PLAN = 5;

function Paginator({ page, total, pageSize, onChange }: { page: number; total: number; pageSize: number; onChange: (p: number) => void }) {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between pt-4 border-t border-gray-100 mt-2">
      <p className="text-gray-400" style={{ fontSize: "0.75rem" }}>
        {Math.min((page - 1) * pageSize + 1, total)}–{Math.min(page * pageSize, total)} de {total}
      </p>
      <div className="flex items-center gap-1">
        <button onClick={() => onChange(page - 1)} disabled={page === 1}
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
          <button key={p} onClick={() => onChange(p)}
            className={`flex h-7 w-7 items-center justify-center rounded-lg border transition-all ${
              p === page ? "border-cyan-500 bg-cyan-500 text-white" : "border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700"
            }`}
            style={{ fontSize: "0.75rem", fontWeight: p === page ? 600 : 400 }}>
            {p}
          </button>
        ))}
        <button onClick={() => onChange(page + 1)} disabled={page === Math.ceil(total / pageSize)}
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

export function HistoryDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"dashboard" | "purchase">("dashboard");

  // Dashboard (Results) State
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [showConfidence, setShowConfidence] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarSearch, setSidebarSearch] = useState("");
  const [resultsTablePage, setResultsTablePage] = useState(1);
  const [resultsSearch, setResultsSearch] = useState("");

  // Purchase Plan State
  const [planTablePage, setPlanTablePage] = useState(1);
  const [planSearch, setPlanSearch] = useState("");
  const [filterPriority, setFilterPriority] = useState<string>("all");

  const record = mockHistory.find((r) => r.id === id);

  useEffect(() => {
    if (record && record.products.length > 0 && !selectedProductId) {
      setSelectedProductId(record.products[0].id);
    }
  }, [record, selectedProductId]);

  const selectedProduct = useMemo(
    () => record?.products.find((p) => p.id === selectedProductId) ?? record?.products[0],
    [record, selectedProductId]
  );

  const productChartData = useMemo(
    () => selectedProduct && record ? generateProductChartData(selectedProduct, record.forecastPeriod) : [],
    [selectedProduct, record]
  );

  const bridgeDateLabel = useMemo(() => {
    const d = new Date(2026, 4, 5);
    return d.toLocaleDateString("es-ES", { month: "short", day: "numeric" });
  }, []);

  const tableData = useMemo(() =>
    record ? record.products.map((p) => ({ ...p, avgHistorical: getAvgHistorical(p), variation: getVariation(p) })) : [],
    [record]
  );

  const sidebarProducts = useMemo(() =>
    record ? record.products.filter((p) =>
      sidebarSearch === "" ||
      p.name.toLowerCase().includes(sidebarSearch.toLowerCase()) ||
      p.category.toLowerCase().includes(sidebarSearch.toLowerCase())
    ) : [],
    [record, sidebarSearch]
  );

  const searchedTableData = useMemo(() =>
    tableData.filter((p) =>
      resultsSearch === "" ||
      p.name.toLowerCase().includes(resultsSearch.toLowerCase()) ||
      p.category.toLowerCase().includes(resultsSearch.toLowerCase())
    ),
    [tableData, resultsSearch]
  );

  const paginatedTableData = searchedTableData.slice(
    (resultsTablePage - 1) * PAGE_SIZE_TABLE,
    resultsTablePage * PAGE_SIZE_TABLE
  );

  const filteredProducts = useMemo(() => {
    if (!record) return [];
    return filterPriority === "all"
      ? record.products
      : record.products.filter((p) => p.priority === filterPriority);
  }, [record, filterPriority]);

  const searchedPlanProducts = useMemo(() =>
    filteredProducts.filter((p) =>
      planSearch === "" ||
      p.name.toLowerCase().includes(planSearch.toLowerCase()) ||
      p.category.toLowerCase().includes(planSearch.toLowerCase())
    ),
    [filteredProducts, planSearch]
  );

  const paginatedPlanProducts = searchedPlanProducts.slice(
    (planTablePage - 1) * PAGE_SIZE_PLAN,
    planTablePage * PAGE_SIZE_PLAN
  );

  if (!record) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 border border-gray-200">
          <AlertCircle className="h-7 w-7 text-gray-300" />
        </div>
        <p className="text-gray-500">Predicción no encontrada</p>
        <button
          onClick={() => navigate("/history")}
          className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
          style={{ fontSize: "0.875rem" }}
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al historial
        </button>
      </div>
    );
  }

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("es-ES", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  return (
    <div className="min-h-[calc(100vh-4rem)] px-6 py-8 max-w-6xl mx-auto">
      {/* Back button + header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div className="flex items-start gap-4">
          <button
            onClick={() => navigate("/history")}
            className="flex items-center gap-1.5 text-gray-400 hover:text-gray-900 transition-colors mt-1"
            style={{ fontSize: "0.875rem" }}
          >
            <ArrowLeft className="h-4 w-4" />
            Historial
          </button>
          <div>
            <h1 className="text-gray-900 mb-1" style={{ fontWeight: 700 }}>
              Predicción {record.id}
            </h1>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 text-gray-400">
                <Calendar className="h-3.5 w-3.5" />
                <span style={{ fontSize: "0.8125rem" }}>{formatDate(record.date)}</span>
              </div>
              <div className="flex items-center gap-1.5 text-gray-400">
                <Clock className="h-3.5 w-3.5" />
                <span style={{ fontSize: "0.8125rem" }}>{record.forecastPeriod} días de predicción</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-500 hover:text-gray-900 hover:border-gray-400 transition-all"
            style={{ fontSize: "0.8125rem" }}>
            <Download className="h-4 w-4" />
            Exportar CSV
          </button>
          <button className="flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 text-white hover:bg-cyan-400 transition-all"
            style={{ fontSize: "0.8125rem", fontWeight: 600 }}>
            <Download className="h-4 w-4" />
            Exportar PDF
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-gray-200 bg-gray-100 p-1 w-fit mb-8">
        {[
          { id: "dashboard", label: "Dashboard", icon: BarChart3 },
          { id: "purchase", label: "Plan de compras", icon: Package },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 transition-all ${
                activeTab === tab.id
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
              style={{ fontSize: "0.875rem", fontWeight: activeTab === tab.id ? 500 : 400 }}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* DASHBOARD TAB (Matching Step 4 Results) */}
      {activeTab === "dashboard" && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Demanda Total Prevista", value: `${record.totalUnits.toLocaleString()} uds`, icon: TrendingUp, iconColor: "text-cyan-500", iconBg: "bg-cyan-500/10 border-cyan-500/20" },
              { label: "Productos Analizados", value: record.totalProducts.toString(), icon: Package, iconColor: "text-blue-500", iconBg: "bg-blue-500/10 border-blue-500/20" },
              { label: "Precisión Estimada", value: `${record.accuracy}%`, icon: BarChart3, iconColor: "text-purple-500", iconBg: "bg-purple-500/10 border-purple-500/20" },
              { label: "Horizonte Analizado", value: `${record.forecastPeriod} días`, icon: Calendar, iconColor: "text-orange-500", iconBg: "bg-orange-500/10 border-orange-500/20" },
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

          {/* Interactive Chart + Sidebar */}
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden relative">
            <AnimatePresence>
              {sidebarOpen && (
                <>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="absolute inset-0 bg-black/10 z-10"
                    onClick={() => setSidebarOpen(false)}
                  />
                  <motion.div
                    initial={{ x: -304 }}
                    animate={{ x: 0 }}
                    exit={{ x: -304 }}
                    transition={{ type: "spring", stiffness: 320, damping: 32 }}
                    className="absolute top-0 left-0 bottom-0 w-72 bg-white border-r border-gray-200 z-20 flex flex-col shadow-2xl"
                    style={{ borderRadius: "1rem 0 0 1rem" }}
                  >
                    <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
                      <div>
                        <p className="text-gray-900" style={{ fontSize: "0.875rem", fontWeight: 600 }}>Medicamentos</p>
                        <p className="text-gray-400" style={{ fontSize: "0.75rem" }}>
                          {sidebarProducts.length} de {record.products.length}
                        </p>
                      </div>
                      <button
                        onClick={() => setSidebarOpen(false)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all"
                      >
                        <PanelLeftClose className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="px-4 py-3 border-b border-gray-100">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Buscar medicamento..."
                          value={sidebarSearch}
                          onChange={(e) => setSidebarSearch(e.target.value)}
                          className="w-full rounded-lg border border-gray-200 bg-gray-50 pl-8 pr-3 py-2 text-gray-900 placeholder:text-gray-400 outline-none focus:border-cyan-500/60 focus:bg-white transition-all"
                          style={{ fontSize: "0.8125rem" }}
                        />
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
                            <button
                              key={p.id}
                              onClick={() => {
                                setSelectedProductId(p.id);
                                setSidebarOpen(false);
                              }}
                              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all hover:bg-gray-50 ${
                                isSelected ? "bg-cyan-500/5 border-r-2 border-r-cyan-500" : ""
                              }`}
                            >
                              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${pConf.bg}`}>
                                <span className={`h-2 w-2 rounded-full ${pConf.dot}`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`truncate ${isSelected ? "text-cyan-600" : "text-gray-900"}`}
                                  style={{ fontSize: "0.8125rem", fontWeight: isSelected ? 600 : 500 }}>
                                  {p.name}
                                </p>
                                <p className="text-gray-400 truncate" style={{ fontSize: "0.6875rem" }}>{p.category}</p>
                              </div>
                              {isSelected && (
                                <CheckCircle className="h-4 w-4 text-cyan-500 shrink-0" />
                              )}
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
                  <button
                    onClick={() => setSidebarOpen((v) => !v)}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2 transition-all ${
                      sidebarOpen
                        ? "border-cyan-500/50 bg-cyan-500/10 text-cyan-600"
                        : "border-gray-300 bg-white text-gray-600 hover:border-gray-400 hover:text-gray-900"
                    }`}
                    style={{ fontSize: "0.8125rem", fontWeight: 500 }}
                  >
                    {sidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
                    <span className="hidden sm:inline">Medicamentos</span>
                  </button>

                  <div>
                    <p className="text-gray-900" style={{ fontWeight: 600, fontSize: "0.9375rem" }}>
                      {selectedProduct?.name ?? "Selecciona un medicamento"}
                    </p>
                    <p className="text-gray-400" style={{ fontSize: "0.75rem" }}>
                      {selectedProduct?.category} · {record.forecastPeriod} días predichos
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setShowConfidence((v) => !v)}
                  className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 transition-all ${
                    showConfidence
                      ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-600"
                      : "border-gray-300 bg-white text-gray-500 hover:border-gray-400"
                  }`}
                  style={{ fontSize: "0.75rem", fontWeight: 500 }}
                >
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
                        <linearGradient id="confGradient" x1="0" y1="0" x2="0" y2="1">
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
                      {showConfidence && <Area type="monotone" dataKey="upper" stroke="none" fill="url(#confGradient)" connectNulls={false} isAnimationActive={false} />}
                      {showConfidence && <Area type="monotone" dataKey="lower" stroke="none" fill="#ffffff" connectNulls={false} isAnimationActive={false} />}
                      <Line type="monotone" dataKey="historical" stroke="#3b82f6" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: "#3b82f6", strokeWidth: 0 }} connectNulls={false} />
                      <Line type="monotone" dataKey="predicted" stroke="#06b6d4" strokeWidth={2.5} strokeDasharray="8 4" dot={false} activeDot={{ r: 5, fill: "#06b6d4", strokeWidth: 0 }} connectNulls={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Medication analysis table */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <div>
                <h3 className="text-gray-900 mb-0.5" style={{ fontWeight: 600 }}>Medicamentos analizados</h3>
                <p className="text-gray-400" style={{ fontSize: "0.8125rem" }}>{tableData.length} productos en este análisis</p>
              </div>
              <div className="relative min-w-56">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar producto..."
                  value={resultsSearch}
                  onChange={(e) => { setResultsSearch(e.target.value); setResultsTablePage(1); }}
                  className="w-full rounded-xl border border-gray-300 bg-white pl-8 pr-3 py-2 text-gray-900 placeholder:text-gray-400 outline-none focus:border-cyan-500/60 transition-colors"
                  style={{ fontSize: "0.8125rem" }}
                />
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
            <Paginator page={resultsTablePage} total={searchedTableData.length} pageSize={PAGE_SIZE_TABLE} onChange={setResultsTablePage} />
          </div>
        </div>
      )}

      {/* PURCHASE PLAN TAB (Matching Step 5 Purchase Plan) */}
      {activeTab === "purchase" && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div>
              <h2 className="text-gray-900 mb-1" style={{ fontWeight: 600 }}>Plan de compras recomendado</h2>
              <p className="text-gray-400" style={{ fontSize: "0.875rem" }}>Basado en la predicción para los {record.forecastPeriod} días seleccionados</p>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Total productos", value: record.products.length.toString(), icon: Package, color: "text-blue-500", bg: "bg-blue-500/10 border-blue-500/20" },
              { label: "Items críticos", value: record.products.filter((p) => p.priority === "critical").length.toString(), icon: AlertCircle, color: "text-red-500", bg: "bg-red-500/10 border-red-500/20" },
              { label: "Items altos", value: record.products.filter((p) => p.priority === "high").length.toString(), icon: TrendingUp, color: "text-orange-500", bg: "bg-orange-500/10 border-orange-500/20" },
              { label: "Unidades totales", value: record.products.reduce((s, p) => s + p.recommendedQty, 0).toLocaleString(), icon: CheckCircle, color: "text-cyan-500", bg: "bg-cyan-500/10 border-cyan-500/20" },
            ].map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border ${stat.bg}`}>
                    <Icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-gray-400 mb-0.5" style={{ fontSize: "0.75rem" }}>{stat.label}</p>
                    <p className="text-gray-900" style={{ fontSize: "1.375rem", fontWeight: 700, lineHeight: 1.1 }}>{stat.value}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex gap-2 flex-wrap">
              {["all", "critical", "high", "medium", "low"].map((p) => (
                <button key={p}
                  onClick={() => { setFilterPriority(p); setPlanTablePage(1); }}
                  className={`rounded-lg border px-3 py-1.5 transition-all ${
                    filterPriority === p
                      ? "border-cyan-500/50 bg-cyan-500/10 text-cyan-500"
                      : "border-gray-300 bg-white text-gray-500 hover:text-gray-700"
                  }`}
                  style={{ fontSize: "0.8125rem" }}>
                  {p === "all" ? "Todos" : priorityConfig[p as keyof typeof priorityConfig].label}
                </button>
              ))}
            </div>
            <div className="relative ml-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar producto..."
                value={planSearch}
                onChange={(e) => { setPlanSearch(e.target.value); setPlanTablePage(1); }}
                className="w-56 rounded-xl border border-gray-300 bg-white pl-8 pr-3 py-2 text-gray-900 placeholder:text-gray-400 outline-none focus:border-cyan-500/60 transition-colors"
                style={{ fontSize: "0.8125rem" }}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    {["Producto", "Categoría", "Stock actual", "Demanda predicha", "Cant. recomendada", "Prioridad"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-gray-400" style={{ fontSize: "0.75rem", fontWeight: 500 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginatedPlanProducts.map((product) => {
                    const pConf = priorityConfig[product.priority];
                    const isCritical = product.priority === "critical";
                    return (
                      <tr key={product.id}
                        className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${isCritical ? "bg-red-500/[0.02]" : ""}`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {isCritical && <span className="h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" />}
                            <span className="text-gray-900" style={{ fontSize: "0.8125rem", fontWeight: 500 }}>{product.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-500" style={{ fontSize: "0.8125rem" }}>{product.category}</td>
                        <td className="px-4 py-3 text-gray-500" style={{ fontSize: "0.8125rem" }}>{product.currentStock}</td>
                        <td className="px-4 py-3 text-cyan-500" style={{ fontSize: "0.8125rem" }}>{product.predictedDemand}</td>
                        <td className="px-4 py-3">
                          <span className="text-gray-900" style={{ fontSize: "0.875rem", fontWeight: 600 }}>{product.recommendedQty} uds</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 ${pConf.bg} ${pConf.border} ${pConf.color}`}
                            style={{ fontSize: "0.6875rem", fontWeight: 500 }}>
                            <span className={`h-1.5 w-1.5 rounded-full ${pConf.dot}`} />
                            {pConf.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Paginator page={planTablePage} total={searchedPlanProducts.length} pageSize={PAGE_SIZE_PLAN} onChange={setPlanTablePage} />
          </div>
        </div>
      )}
    </div>
  );
}
