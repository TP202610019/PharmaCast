import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  TrendingUp, Package, BarChart3, Calendar, PlusCircle, History,
  Search, PanelLeftOpen, PanelLeftClose, ChevronLeft, ChevronRight,
  CheckCircle, Download, AlertTriangle, Clock, Zap, Building2,
  Lightbulb, TrendingDown, Minus,
} from "lucide-react";
import {
  ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from "recharts";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../context/AuthContext";
import { mockHistory } from "../data/mockData";
import type { PurchasePlanItem } from "../data/mockData";

// ─── Helpers ────────────────────────────────────────────────────────────────
const priorityConfig = {
  critical: { label: "Crítico",  color: "text-red-500",    bg: "bg-red-500/10",    border: "border-red-500/30",    dot: "bg-red-500"    },
  high:     { label: "Alto",     color: "text-orange-500", bg: "bg-orange-500/10", border: "border-orange-500/30", dot: "bg-orange-500" },
  medium:   { label: "Medio",    color: "text-yellow-500", bg: "bg-yellow-500/10", border: "border-yellow-500/30", dot: "bg-yellow-500" },
  low:      { label: "Bajo",     color: "text-cyan-500",   bg: "bg-cyan-500/10",   border: "border-cyan-500/30",   dot: "bg-cyan-500"   },
};

const variationFactor: Record<string, number> = {
  critical: 0.76, high: 0.84, medium: 0.93, low: 0.99,
};

interface ChartPoint {
  date: string;
  historical: number | null;
  predicted: number | null;
  upper: number | null;
  lower: number | null;
}

const generateChartData = (product: PurchasePlanItem, days: number): ChartPoint[] => {
  const data: ChartPoint[] = [];
  const today = new Date(2026, 4, 5);
  const factor = variationFactor[product.priority] ?? 0.88;
  const baseVal = product.predictedDemand * factor;
  for (let i = -30; i < days; i++) {
    const d = new Date(today); d.setDate(today.getDate() + i);
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
      const predVal = Math.round(Math.max(0, ramp + (Math.random() - 0.5) * 12));
      const conf = Math.round(predVal * 0.11);
      data.push({ date: label, historical: null, predicted: predVal, upper: predVal + conf, lower: Math.max(0, predVal - conf) });
    }
  }
  return data;
};

const getAvgHistorical = (p: PurchasePlanItem) => Math.round(p.predictedDemand * (variationFactor[p.priority] ?? 0.88));
const getVariation = (p: PurchasePlanItem) => { const a = getAvgHistorical(p); return a > 0 ? ((p.predictedDemand - a) / a) * 100 : 0; };

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const filtered = payload.filter((p: any) => p.value != null && p.name !== "upper" && p.name !== "lower");
  if (!filtered.length) return null;
  return (
    <div className="rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-xl" style={{ minWidth: 170 }}>
      <p className="text-gray-400 mb-2" style={{ fontSize: "0.6875rem", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</p>
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

const PAGE = 5;
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
            className={`flex h-7 w-7 items-center justify-center rounded-lg border transition-all ${p === page ? "border-cyan-500 bg-cyan-500 text-white" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}
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

const tips = [
  { icon: AlertTriangle, color: "text-orange-500", bg: "bg-orange-500/10 border-orange-500/20", title: "Revisa los críticos primero", desc: "Los productos con prioridad crítica tienen riesgo de desabasto en menos de 7 días." },
  { icon: Zap, color: "text-cyan-500", bg: "bg-cyan-500/10 border-cyan-500/20", title: "Optimiza el ciclo de compras", desc: "Consolidar pedidos para el mismo proveedor reduce costos de envío hasta un 20%." },
  { icon: Lightbulb, color: "text-yellow-500", bg: "bg-yellow-500/10 border-yellow-500/20", title: "Actualiza tu inventario", desc: "Subir datos de inventario actualizados mejora la precisión de la predicción." },
];

// ─── Component ───────────────────────────────────────────────────────────────
export function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const record = mockHistory[0];

  const [activeTab, setActiveTab] = useState<"dashboard" | "purchase">("dashboard");
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [showConfidence, setShowConfidence] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarSearch, setSidebarSearch] = useState("");
  const [resultsSearch, setResultsSearch] = useState("");
  const [resultsPage, setResultsPage] = useState(1);
  const [planSearch, setPlanSearch] = useState("");
  const [planPage, setPlanPage] = useState(1);
  const [filterPriority, setFilterPriority] = useState("all");

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Buenos días";
    if (h < 18) return "Buenas tardes";
    return "Buenas noches";
  };

  useEffect(() => {
    if (record?.products.length > 0 && !selectedProductId) {
      setSelectedProductId(record.products[0].id);
    }
  }, [record, selectedProductId]);

  const selectedProduct = useMemo(
    () => record?.products.find((p) => p.id === selectedProductId) ?? record?.products[0],
    [record, selectedProductId]
  );

  const chartData = useMemo(
    () => selectedProduct && record ? generateChartData(selectedProduct, record.forecastPeriod) : [],
    [selectedProduct, record]
  );

  const bridgeLabel = useMemo(() =>
    new Date(2026, 4, 5).toLocaleDateString("es-ES", { month: "short", day: "numeric" }),
    []
  );

  const tableData = useMemo(() =>
    record ? record.products.map((p) => ({ ...p, avgHistorical: getAvgHistorical(p), variation: getVariation(p) })) : [],
    [record]
  );

  const sidebarProducts = useMemo(() =>
    record ? record.products.filter((p) =>
      !sidebarSearch ||
      p.name.toLowerCase().includes(sidebarSearch.toLowerCase()) ||
      p.category.toLowerCase().includes(sidebarSearch.toLowerCase())
    ) : [],
    [record, sidebarSearch]
  );

  const searchedTable = useMemo(() =>
    tableData.filter((p) =>
      !resultsSearch ||
      p.name.toLowerCase().includes(resultsSearch.toLowerCase()) ||
      p.category.toLowerCase().includes(resultsSearch.toLowerCase())
    ),
    [tableData, resultsSearch]
  );

  const paginatedTable = searchedTable.slice((resultsPage - 1) * PAGE, resultsPage * PAGE);

  const filteredPlan = useMemo(() => {
    if (!record) return [];
    return filterPriority === "all" ? record.products : record.products.filter((p) => p.priority === filterPriority);
  }, [record, filterPriority]);

  const searchedPlan = useMemo(() =>
    filteredPlan.filter((p) =>
      !planSearch ||
      p.name.toLowerCase().includes(planSearch.toLowerCase()) ||
      p.category.toLowerCase().includes(planSearch.toLowerCase())
    ),
    [filteredPlan, planSearch]
  );

  const paginatedPlan = searchedPlan.slice((planPage - 1) * PAGE, planPage * PAGE);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });

  const totalPlanCost = record?.products.reduce((s, p) => s + p.recommendedQty * p.unitCost, 0) ?? 0;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50">
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">

        {/* ── Welcome Banner ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500 to-cyan-600 p-6 md:p-8 relative overflow-hidden"
        >
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-white/5" />
            <div className="absolute bottom-0 left-1/3 w-40 h-40 rounded-full bg-white/5" />
            <div
              className="absolute inset-0 opacity-[0.05]"
              style={{
                backgroundImage: "linear-gradient(white 1px, transparent 1px), linear-gradient(to right, white 1px, transparent 1px)",
                backgroundSize: "40px 40px",
              }}
            />
          </div>
          <div className="relative flex flex-wrap items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 border border-white/20 shrink-0">
                <span className="text-white" style={{ fontSize: "1.5rem", fontWeight: 700 }}>
                  {(user?.name ?? "U")[0].toUpperCase()}
                </span>
              </div>
              <div>
                <p className="text-cyan-100 mb-0.5" style={{ fontSize: "0.875rem" }}>{greeting()},</p>
                <h1 className="text-white mb-0.5" style={{ fontSize: "1.5rem", fontWeight: 700, lineHeight: 1.2 }}>
                  {user?.name ?? "Usuario"}
                </h1>
                <div className="flex items-center gap-1.5 text-cyan-100">
                  <Building2 className="h-3.5 w-3.5" />
                  <span style={{ fontSize: "0.875rem" }}>{user?.pharmacy ?? "Mi Farmacia"}</span>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => navigate("/prediction")}
                className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-cyan-600 hover:bg-cyan-50 transition-all hover:shadow-lg active:scale-[0.98]"
                style={{ fontWeight: 600, fontSize: "0.875rem" }}
              >
                <PlusCircle className="h-4 w-4" />
                Nueva predicción
              </button>
              <button
                onClick={() => navigate("/history")}
                className="flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-white hover:bg-white/20 transition-all"
                style={{ fontSize: "0.875rem" }}
              >
                <History className="h-4 w-4" />
                Ver historial
              </button>
            </div>
          </div>
        </motion.div>

        {/* ── Stats Row ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          {[
            { label: "Total predicciones", value: mockHistory.length.toString(), icon: BarChart3, iconColor: "text-cyan-500", iconBg: "bg-cyan-500/10 border-cyan-500/20" },
            { label: "Última hace", value: "2 días", icon: Clock, iconColor: "text-blue-500", iconBg: "bg-blue-500/10 border-blue-500/20" },
            { label: "Productos críticos", value: record?.criticalItems.toString() ?? "0", icon: AlertTriangle, iconColor: "text-red-500", iconBg: "bg-red-500/10 border-red-500/20" },
            { label: "Precisión promedio", value: `${record?.accuracy ?? 0}%`, icon: TrendingUp, iconColor: "text-purple-500", iconBg: "bg-purple-500/10 border-purple-500/20" },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${card.iconBg}`}>
                  <Icon className={`h-5 w-5 ${card.iconColor}`} />
                </div>
                <div>
                  <p className="text-gray-400 mb-0.5" style={{ fontSize: "0.75rem" }}>{card.label}</p>
                  <p className="text-gray-900" style={{ fontSize: "1.25rem", fontWeight: 700, lineHeight: 1.1 }}>{card.value}</p>
                </div>
              </div>
            );
          })}
        </motion.div>

        {/* ── Last Prediction Section ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden"
        >
          {/* Section header */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-5 border-b border-gray-100">
            <div>
              <p className="text-gray-400 mb-0.5" style={{ fontSize: "0.75rem", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Última predicción
              </p>
              <div className="flex items-center gap-3">
                <h2 className="text-gray-900" style={{ fontWeight: 700 }}>Predicción {record?.id}</h2>
                <div className="flex items-center gap-1.5 text-gray-400">
                  <Calendar className="h-3.5 w-3.5" />
                  <span style={{ fontSize: "0.8125rem" }}>{record ? formatDate(record.date) : ""}</span>
                </div>
                <div className="flex items-center gap-1.5 text-gray-400">
                  <Clock className="h-3.5 w-3.5" />
                  <span style={{ fontSize: "0.8125rem" }}>{record?.forecastPeriod} días</span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => navigate(`/history/${record?.id}`)}
                className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-500 hover:text-gray-900 hover:border-gray-400 transition-all"
                style={{ fontSize: "0.8125rem" }}
              >
                Ver completo
              </button>
              <button
                className="flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 text-white hover:bg-cyan-400 transition-all"
                style={{ fontSize: "0.8125rem", fontWeight: 600 }}
              >
                <Download className="h-3.5 w-3.5" />
                Exportar PDF
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="px-6 pt-5">
            <div className="flex gap-1 rounded-xl border border-gray-200 bg-gray-100 p-1 w-fit mb-6">
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
                      activeTab === tab.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                    }`}
                    style={{ fontSize: "0.875rem", fontWeight: activeTab === tab.id ? 500 : 400 }}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── DASHBOARD TAB ── */}
          {activeTab === "dashboard" && (
            <div className="px-6 pb-6 space-y-6">
              {/* KPI cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "Demanda Total Prevista", value: `${record?.totalUnits.toLocaleString()} uds`, icon: TrendingUp, iconColor: "text-cyan-500", iconBg: "bg-cyan-500/10 border-cyan-500/20" },
                  { label: "Productos Analizados",   value: record?.totalProducts.toString() ?? "0",     icon: Package,   iconColor: "text-blue-500", iconBg: "bg-blue-500/10 border-blue-500/20" },
                  { label: "Precisión Estimada",     value: `${record?.accuracy ?? 0}%`,                 icon: BarChart3, iconColor: "text-purple-500", iconBg: "bg-purple-500/10 border-purple-500/20" },
                  { label: "Horizonte Analizado",    value: `${record?.forecastPeriod ?? 0} días`,        icon: Calendar,  iconColor: "text-orange-500", iconBg: "bg-orange-500/10 border-orange-500/20" },
                ].map((card) => {
                  const Icon = card.icon;
                  return (
                    <div key={card.label} className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-gray-50 p-4">
                      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${card.iconBg}`}>
                        <Icon className={`h-5 w-5 ${card.iconColor}`} />
                      </div>
                      <div>
                        <p className="text-gray-400 mb-0.5" style={{ fontSize: "0.7rem" }}>{card.label}</p>
                        <p className="text-gray-900" style={{ fontSize: "1.125rem", fontWeight: 700, lineHeight: 1.1 }}>{card.value}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Interactive Chart */}
              <div className="rounded-2xl border border-gray-100 bg-gray-50 overflow-hidden relative">
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
                            <p className="text-gray-400" style={{ fontSize: "0.75rem" }}>{sidebarProducts.length} de {record?.products.length}</p>
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
                              style={{ fontSize: "0.8125rem" }} />
                          </div>
                        </div>
                        <div className="flex-1 overflow-y-auto py-2">
                          {sidebarProducts.length === 0 ? (
                            <div className="flex flex-col items-center gap-2 py-10 text-center">
                              <Search className="h-6 w-6 text-gray-300" />
                              <p className="text-gray-400" style={{ fontSize: "0.8125rem" }}>Sin resultados</p>
                            </div>
                          ) : sidebarProducts.map((p) => {
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
                          })}
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>

                {/* Chart header */}
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
                          {selectedProduct?.name ?? "Selecciona un medicamento"}
                        </p>
                        <p className="text-gray-400" style={{ fontSize: "0.75rem" }}>
                          {selectedProduct?.category} · {record?.forecastPeriod} días predichos
                        </p>
                      </div>
                    </div>
                    <button onClick={() => setShowConfidence((v) => !v)}
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
                  <AnimatePresence mode="wait">
                    <motion.div key={selectedProductId} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
                      <ResponsiveContainer width="100%" height={300}>
                        <ComposedChart data={chartData} margin={{ top: 10, right: 24, left: 0, bottom: 8 }}>
                          <defs>
                            <linearGradient id="confGrad2" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.15} />
                              <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.02} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="4 4" stroke="#f1f5f9" vertical={false} />
                          <XAxis dataKey="date" tick={{ fill: "#cbd5e1", fontSize: 10 }} tickLine={false} axisLine={false} interval={7} dy={8} />
                          <YAxis tick={{ fill: "#cbd5e1", fontSize: 10 }} tickLine={false} axisLine={false} width={36} />
                          <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#e2e8f0", strokeWidth: 1.5, strokeDasharray: "4 4" }} />
                          <ReferenceLine x={bridgeLabel} stroke="#f97316" strokeWidth={1.5} strokeDasharray="4 3"
                            label={{ value: "Hoy", position: "insideTopRight", fill: "#f97316", fontSize: 10, fontWeight: 600 }} />
                          {showConfidence && <Area type="monotone" dataKey="upper" stroke="none" fill="url(#confGrad2)" connectNulls={false} isAnimationActive={false} />}
                          {showConfidence && <Area type="monotone" dataKey="lower" stroke="none" fill="#f9fafb" connectNulls={false} isAnimationActive={false} />}
                          <Line type="monotone" dataKey="historical" stroke="#3b82f6" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: "#3b82f6", strokeWidth: 0 }} connectNulls={false} />
                          <Line type="monotone" dataKey="predicted" stroke="#06b6d4" strokeWidth={2.5} strokeDasharray="8 4" dot={false} activeDot={{ r: 5, fill: "#06b6d4", strokeWidth: 0 }} connectNulls={false} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>

              {/* Medication table */}
              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <div>
                    <h3 className="text-gray-900 mb-0.5" style={{ fontWeight: 600 }}>Medicamentos analizados</h3>
                    <p className="text-gray-400" style={{ fontSize: "0.8125rem" }}>{tableData.length} productos</p>
                  </div>
                  <div className="relative min-w-52">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                    <input type="text" placeholder="Buscar producto..." value={resultsSearch}
                      onChange={(e) => { setResultsSearch(e.target.value); setResultsPage(1); }}
                      className="w-full rounded-xl border border-gray-300 bg-white pl-8 pr-3 py-2 text-gray-900 placeholder:text-gray-400 outline-none focus:border-cyan-500/60 transition-colors"
                      style={{ fontSize: "0.8125rem" }} />
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        {["Producto", "Categoría", "Dem. Histórica", "Dem. Predicha", "Variación", "Tendencia"].map((h) => (
                          <th key={h} className="pb-3 text-left text-gray-400" style={{ fontSize: "0.75rem", fontWeight: 500 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedTable.map((p) => {
                        const pConf = priorityConfig[p.priority];
                        const varVal = p.variation;
                        const isUp = varVal > 2;
                        const isDown = varVal < -2;
                        return (
                          <tr key={p.id} className="border-b border-gray-100 hover:bg-white transition-colors">
                            <td className="py-3 pr-4">
                              <div className="flex items-center gap-2">
                                <span className={`h-2 w-2 rounded-full shrink-0 ${pConf.dot}`} />
                                <span className="text-gray-900" style={{ fontSize: "0.8125rem", fontWeight: 500 }}>{p.name}</span>
                              </div>
                            </td>
                            <td className="py-3 pr-4 text-gray-500" style={{ fontSize: "0.8125rem" }}>{p.category}</td>
                            <td className="py-3 pr-4 text-gray-900" style={{ fontSize: "0.8125rem", fontWeight: 500 }}>{p.avgHistorical} uds</td>
                            <td className="py-3 pr-4 text-gray-900" style={{ fontSize: "0.8125rem", fontWeight: 600 }}>{p.predictedDemand} uds</td>
                            <td className="py-3 pr-4">
                              <span className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 ${isUp ? "bg-red-50 text-red-500" : isDown ? "bg-green-50 text-green-500" : "bg-gray-100 text-gray-500"}`}
                                style={{ fontSize: "0.75rem", fontWeight: 600 }}>
                                {isUp ? "+" : isDown ? "" : "~"}{varVal.toFixed(1)}%
                              </span>
                            </td>
                            <td className="py-3">
                              {isUp ? <TrendingUp className="h-4 w-4 text-red-400" /> : isDown ? <TrendingDown className="h-4 w-4 text-green-400" /> : <Minus className="h-4 w-4 text-gray-300" />}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <Paginator page={resultsPage} total={searchedTable.length} pageSize={PAGE} onChange={setResultsPage} />
              </div>
            </div>
          )}

          {/* ── PURCHASE PLAN TAB ── */}
          {activeTab === "purchase" && (
            <div className="px-6 pb-6 space-y-5">
              {/* Summary KPIs */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Productos a comprar", value: record?.products.length.toString() ?? "0", icon: Package, iconColor: "text-cyan-500", iconBg: "bg-cyan-500/10 border-cyan-500/20" },
                  { label: "Ítems críticos", value: record?.criticalItems.toString() ?? "0", icon: AlertTriangle, iconColor: "text-red-500", iconBg: "bg-red-500/10 border-red-500/20" },
                  { label: "Inversión estimada", value: `S/ ${totalPlanCost.toLocaleString()}`, icon: TrendingUp, iconColor: "text-purple-500", iconBg: "bg-purple-500/10 border-purple-500/20" },
                  { label: "Horizonte del plan", value: `${record?.forecastPeriod ?? 0} días`, icon: Calendar, iconColor: "text-orange-500", iconBg: "bg-orange-500/10 border-orange-500/20" },
                ].map((card) => {
                  const Icon = card.icon;
                  return (
                    <div key={card.label} className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-gray-50 p-4">
                      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${card.iconBg}`}>
                        <Icon className={`h-5 w-5 ${card.iconColor}`} />
                      </div>
                      <div>
                        <p className="text-gray-400 mb-0.5" style={{ fontSize: "0.7rem" }}>{card.label}</p>
                        <p className="text-gray-900" style={{ fontSize: "1.125rem", fontWeight: 700, lineHeight: 1.1 }}>{card.value}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Filter + search */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1">
                  {["all", "critical", "high", "medium", "low"].map((pri) => {
                    const labels: Record<string, string> = { all: "Todos", critical: "Crítico", high: "Alto", medium: "Medio", low: "Bajo" };
                    const colors: Record<string, string> = {
                      all: filterPriority === "all" ? "bg-gray-900 text-white" : "text-gray-500 hover:text-gray-700",
                      critical: filterPriority === "critical" ? "bg-red-500 text-white" : "text-gray-500 hover:text-red-500",
                      high: filterPriority === "high" ? "bg-orange-500 text-white" : "text-gray-500 hover:text-orange-500",
                      medium: filterPriority === "medium" ? "bg-yellow-500 text-white" : "text-gray-500 hover:text-yellow-500",
                      low: filterPriority === "low" ? "bg-cyan-500 text-white" : "text-gray-500 hover:text-cyan-500",
                    };
                    return (
                      <button key={pri} onClick={() => { setFilterPriority(pri); setPlanPage(1); }}
                        className={`rounded-lg px-3 py-1.5 transition-all ${colors[pri]}`}
                        style={{ fontSize: "0.8125rem", fontWeight: filterPriority === pri ? 600 : 400 }}>
                        {labels[pri]}
                      </button>
                    );
                  })}
                </div>
                <div className="relative ml-auto min-w-52">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                  <input type="text" placeholder="Buscar producto..." value={planSearch}
                    onChange={(e) => { setPlanSearch(e.target.value); setPlanPage(1); }}
                    className="w-full rounded-xl border border-gray-300 bg-white pl-8 pr-3 py-2 text-gray-900 placeholder:text-gray-400 outline-none focus:border-cyan-500/60 transition-colors"
                    style={{ fontSize: "0.8125rem" }} />
                </div>
              </div>

              {/* Table */}
              <div className="rounded-2xl border border-gray-100 bg-gray-50 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        {["Medicamento", "Stock Actual", "Dem. Predicha", "Cant. Recomendada", "Costo Unit.", "Inversión", "Prioridad"].map((h) => (
                          <th key={h} className="px-4 py-3 text-left text-gray-400 whitespace-nowrap" style={{ fontSize: "0.75rem", fontWeight: 500 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedPlan.map((p) => {
                        const pConf = priorityConfig[p.priority];
                        const cost = p.recommendedQty * p.unitCost;
                        return (
                          <tr key={p.id} className="border-b border-gray-100 hover:bg-white transition-colors">
                            <td className="px-4 py-3">
                              <p className="text-gray-900" style={{ fontSize: "0.8125rem", fontWeight: 500 }}>{p.name}</p>
                              <p className="text-gray-400" style={{ fontSize: "0.6875rem" }}>{p.category}</p>
                            </td>
                            <td className="px-4 py-3 text-gray-900" style={{ fontSize: "0.8125rem" }}>{p.currentStock} uds</td>
                            <td className="px-4 py-3 text-gray-900" style={{ fontSize: "0.8125rem" }}>{p.predictedDemand} uds</td>
                            <td className="px-4 py-3">
                              <span className="text-gray-900" style={{ fontSize: "0.8125rem", fontWeight: 700 }}>{p.recommendedQty} uds</span>
                            </td>
                            <td className="px-4 py-3 text-gray-500" style={{ fontSize: "0.8125rem" }}>S/ {p.unitCost.toFixed(2)}</td>
                            <td className="px-4 py-3 text-gray-900" style={{ fontSize: "0.8125rem", fontWeight: 600 }}>S/ {cost.toLocaleString()}</td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 ${pConf.bg} ${pConf.border}`}
                                style={{ fontSize: "0.75rem", fontWeight: 600 }}>
                                <span className={`h-1.5 w-1.5 rounded-full ${pConf.dot}`} />
                                <span className={pConf.color}>{pConf.label}</span>
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="px-4">
                  <Paginator page={planPage} total={searchedPlan.length} pageSize={PAGE} onChange={setPlanPage} />
                </div>
              </div>
            </div>
          )}
        </motion.div>

        {/* ── Tips & Recommendations ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35 }}
        >
          <h2 className="text-gray-900 mb-4" style={{ fontWeight: 600 }}>Recomendaciones</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {tips.map((tip) => {
              const Icon = tip.icon;
              return (
                <div key={tip.title} className={`rounded-2xl border ${tip.bg} bg-white p-5`}>
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl border mb-4 ${tip.bg}`}>
                    <Icon className={`h-5 w-5 ${tip.color}`} />
                  </div>
                  <h3 className="text-gray-900 mb-1.5" style={{ fontWeight: 600, fontSize: "0.9375rem" }}>{tip.title}</h3>
                  <p className="text-gray-500" style={{ fontSize: "0.8125rem", lineHeight: 1.6 }}>{tip.desc}</p>
                </div>
              );
            })}
          </div>
        </motion.div>

      </div>
    </div>
  );
}
