import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useNavigate, Link } from "react-router";
import {
  TrendingUp, Package, BarChart3, Calendar, PlusCircle, History,
  Search, PanelLeftOpen, PanelLeftClose, ChevronLeft, ChevronRight,
  CheckCircle, Download, AlertTriangle, Clock, Zap, Building2,
  Lightbulb, TrendingDown, Minus, Loader2, Activity,
} from "lucide-react";
import {
  ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend,
} from "recharts";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../context/AuthContext";
import { dashboardService } from "../../services/dashboard.service";
import {
  buildChartFromBackendPoints,
  relativeTime,
  type ChartPoint,
} from "../../lib/transforms";
import type {
  DashboardMetricsResponse,
  DashboardSummaryResponse,
  DashboardProductRow,
  PagedResult,
} from "../../types/api";

// ─── Helpers ─────────────────────────────────────────────────────────────────
const priorityConfig = {
  critical: { label: "Crítico",  color: "text-red-500",    bg: "bg-red-500/10",    border: "border-red-500/30",    dot: "bg-red-500"    },
  high:     { label: "Alto",     color: "text-orange-500", bg: "bg-orange-500/10", border: "border-orange-500/30", dot: "bg-orange-500" },
  medium:   { label: "Medio",    color: "text-yellow-500", bg: "bg-yellow-500/10", border: "border-yellow-500/30", dot: "bg-yellow-500" },
  low:      { label: "Bajo",     color: "text-cyan-500",   bg: "bg-cyan-500/10",   border: "border-cyan-500/30",   dot: "bg-cyan-500"   },
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const hasPredicted = payload.some((p: any) => p.name === "predicted" && p.value != null);
  const filtered = payload.filter((p: any) =>
    p.value != null && p.name !== "upper" && p.name !== "lower" &&
    !(p.name === "historical" && hasPredicted)
  );
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

const PAGE = 10;

function Paginator({ page, total, pageSize, onChange }: { page: number; total: number; pageSize: number; onChange: (p: number) => void }) {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;

  const pages: (number | "...")[] = [];
  const delta = 1;
  const range: number[] = [];
  for (let i = Math.max(2, page - delta); i <= Math.min(totalPages - 1, page + delta); i++) range.push(i);
  pages.push(1);
  if (range[0] > 2) pages.push("...");
  pages.push(...range);
  if (range[range.length - 1] < totalPages - 1) pages.push("...");
  if (totalPages > 1) pages.push(totalPages);

  const btnBase = "flex h-7 min-w-[1.75rem] items-center justify-center rounded-lg border px-1 transition-all";

  return (
    <div className="flex items-center justify-between pt-4 border-t border-gray-100 mt-2">
      <p className="text-gray-400" style={{ fontSize: "0.75rem" }}>
        {Math.min((page - 1) * pageSize + 1, total)}–{Math.min(page * pageSize, total)} de {total}
      </p>
      <div className="flex items-center gap-1">
        <button onClick={() => onChange(page - 1)} disabled={page === 1}
          className={`${btnBase} border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed`}>
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        {pages.map((p, i) =>
          p === "..." ? (
            <span key={`ellipsis-${i}`} className="px-1 text-gray-400" style={{ fontSize: "0.75rem" }}>…</span>
          ) : (
            <button key={p} onClick={() => onChange(p as number)}
              className={`${btnBase} ${p === page ? "border-cyan-500 bg-cyan-500 text-white" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}
              style={{ fontSize: "0.75rem", fontWeight: p === page ? 600 : 400 }}>
              {p}
            </button>
          )
        )}
        <button onClick={() => onChange(page + 1)} disabled={page === totalPages}
          className={`${btnBase} border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed`}>
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

  // ── Core data ──
  const [metrics, setMetrics] = useState<DashboardMetricsResponse | null>(null);
  const [summary, setSummary] = useState<DashboardSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Products table (backend-paginated) ──
  const [productsData, setProductsData] = useState<PagedResult<DashboardProductRow> | null>(null);
  const [productsLoading, setProductsLoading] = useState(false);
  const [resultsPage, setResultsPage] = useState(1);
  const [resultsSearch, setResultsSearch] = useState("");

  // ── Plan tab (reuses productsData, client-side filter) ──
  const [planPage, setPlanPage] = useState(1);
  const [planSearch, setPlanSearch] = useState("");
  const [filterPriority, setFilterPriority] = useState("all");

  // ── Chart (on-demand) ──
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const chartStartDate = useMemo(() => chartData.find(p => p.predicted !== null)?.date ?? null, [chartData]);
  const [chartLoading, setChartLoading] = useState(false);
  const chartCache = useRef<Map<string, ChartPoint[]>>(new Map());

  // ── Priority map: accumulates as product pages load (name → priority) ──
  const [priorityMap, setPriorityMap] = useState<Record<string, string>>({});

  // ── UI ──
  const [activeTab, setActiveTab] = useState<"dashboard" | "purchase">("dashboard");
  const [showConfidence, setShowConfidence] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarSearch, setSidebarSearch] = useState("");

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Buenos días";
    if (h < 18) return "Buenas tardes";
    return "Buenas noches";
  };

  // ── Initial load: metrics + summary in parallel ──
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [metricsData, summaryData] = await Promise.all([
        dashboardService.getMetrics(),
        dashboardService.getSummary(),
      ]);
      setMetrics(metricsData);
      setSummary(summaryData);
    } catch (err) {
      console.error("[Dashboard] loadData failed:", err);
      setError("No se pudieron cargar los datos del panel.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);


  // ── Select first product once summary loads ──
  useEffect(() => {
    if (summary?.productNames?.length && !selectedProduct) {
      setSelectedProduct(summary.productNames[0]);
    }
  }, [summary, selectedProduct]);

  // ── Load products page when predictionId / page / search changes ──
  useEffect(() => {
    const predictionId = summary?.latestPredictionId;
    if (!predictionId) return;

    setProductsLoading(true);
    dashboardService
      .getProducts(predictionId, resultsPage, PAGE, resultsSearch || undefined)
      .then((data) => {
        setProductsData(data);
        setPriorityMap((prev) => {
          const next = { ...prev };
          for (const p of data.items) next[p.productName] = p.priority;
          return next;
        });
      })
      .catch((err) => console.warn("[Dashboard] getProducts failed:", err))
      .finally(() => setProductsLoading(false));
  }, [summary?.latestPredictionId, resultsPage, resultsSearch]);

  // ── Load chart on product selection ──
  useEffect(() => {
    const predictionId = summary?.latestPredictionId;
    if (!predictionId || !selectedProduct) return;

    // Use component-level cache to avoid regenerating synthetic history
    const cached = chartCache.current.get(selectedProduct);
    if (cached) {
      setChartData(cached);
      return;
    }

    setChartLoading(true);
    dashboardService
      .getChart(predictionId, selectedProduct)
      .then((response) => {
        const full = buildChartFromBackendPoints(response.points, summary?.forecastPeriod ?? 30, response.historicalPoints);
        chartCache.current.set(selectedProduct, full);
        setChartData(full);
      })
      .catch((err) => console.warn("[Dashboard] getChart failed:", err))
      .finally(() => setChartLoading(false));
  }, [selectedProduct, summary?.latestPredictionId, summary?.forecastPeriod]);

  // ── Sidebar product list filtered by search ──
  const sidebarProducts = useMemo(() => {
    const names = summary?.productNames ?? [];
    if (!sidebarSearch) return names;
    return names.filter((n) => n.toLowerCase().includes(sidebarSearch.toLowerCase()));
  }, [summary?.productNames, sidebarSearch]);

  // ── Plan tab: client-side filter over current products page ──
  const planItems = useMemo(() => {
    const items = productsData?.items ?? [];
    const byPriority = filterPriority === "all" ? items : items.filter((p) => p.priority === filterPriority);
    if (!planSearch) return byPriority;
    return byPriority.filter((p) => p.productName.toLowerCase().includes(planSearch.toLowerCase()));
  }, [productsData, filterPriority, planSearch]);

  const paginatedPlan = planItems.slice((planPage - 1) * PAGE, planPage * PAGE);

  const bridgeLabel = useMemo(
    () => new Date().toLocaleDateString("es-ES", { month: "short", day: "numeric" }),
    []
  );

  // ── Table helpers ──
  const getVariation = (p: DashboardProductRow) => {
    const hist = p.historicalAvg ?? 0;
    return hist > 0 ? ((p.avgPredictedQuantity - hist) / hist) * 100 : 0;
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });

  // ── Loading / Error states ──
  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 text-cyan-500 animate-spin" />
          <p className="text-gray-400" style={{ fontSize: "0.9375rem" }}>Cargando panel...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 max-w-sm text-center">
          <AlertTriangle className="h-10 w-10 text-orange-400" />
          <p className="text-gray-700" style={{ fontWeight: 600 }}>{error}</p>
          <button onClick={loadData}
            className="rounded-xl bg-cyan-500 px-5 py-2.5 text-white hover:bg-cyan-400 transition-all"
            style={{ fontWeight: 600, fontSize: "0.9375rem" }}>
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const hasPrediction = !!summary?.latestPredictionId;

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
            <div className="absolute inset-0 opacity-[0.05]" style={{
              backgroundImage: "linear-gradient(white 1px, transparent 1px), linear-gradient(to right, white 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }} />
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
              <button onClick={() => navigate("/prediction")}
                className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-cyan-600 hover:bg-cyan-50 transition-all hover:shadow-lg active:scale-[0.98]"
                style={{ fontWeight: 600, fontSize: "0.875rem" }}>
                <PlusCircle className="h-4 w-4" />
                Nueva predicción
              </button>
              <button onClick={() => navigate("/history")}
                className="flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-white hover:bg-white/20 transition-all"
                style={{ fontSize: "0.875rem" }}>
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
            {
              label: "Total predicciones",
              value: (metrics?.totalPredictions ?? 0).toString(),
              icon: BarChart3, iconColor: "text-cyan-500", iconBg: "bg-cyan-500/10 border-cyan-500/20",
            },
            {
              label: "Última predicción",
              value: summary?.latestPredictionDate
                ? relativeTime(summary.latestPredictionDate)
                : "Sin datos",
              icon: Clock, iconColor: "text-blue-500", iconBg: "bg-blue-500/10 border-blue-500/20",
            },
            {
              label: "Productos críticos",
              value: (summary?.criticalCount ?? 0).toString(),
              icon: AlertTriangle, iconColor: "text-red-500", iconBg: "bg-red-500/10 border-red-500/20",
            },
            {
              label: "Precisión promedio",
              value: (summary?.accuracy ?? 0) > 0 ? `${summary!.accuracy}%` : "—",
              icon: TrendingUp, iconColor: "text-purple-500", iconBg: "bg-purple-500/10 border-purple-500/20",
            },
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

        {/* ── No predictions yet ── */}
        {!hasPrediction && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="rounded-2xl border border-gray-200 bg-white p-12 shadow-sm flex flex-col items-center gap-4 text-center"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-500/10 border border-cyan-500/20">
              <BarChart3 className="h-8 w-8 text-cyan-500" />
            </div>
            <div>
              <h2 className="text-gray-900 mb-1" style={{ fontWeight: 700 }}>Aún no hay predicciones</h2>
              <p className="text-gray-400" style={{ fontSize: "0.9375rem" }}>
                Carga tus datos y ejecuta tu primera predicción para ver resultados aquí.
              </p>
            </div>
            <button onClick={() => navigate("/prediction")}
              className="flex items-center gap-2 rounded-xl bg-cyan-500 px-5 py-2.5 text-white hover:bg-cyan-400 transition-all hover:shadow-lg"
              style={{ fontWeight: 600, fontSize: "0.9375rem" }}>
              <PlusCircle className="h-4 w-4" />
              Iniciar predicción
            </button>
          </motion.div>
        )}

        {/* ── Last Prediction Section ── */}
        {hasPrediction && summary && (
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
                  <h2 className="text-gray-900" style={{ fontWeight: 700 }}>
                    {summary.latestPredictionId!.slice(0, 8).toUpperCase()}
                  </h2>
                  {summary.latestPredictionDate && (
                    <div className="flex items-center gap-1.5 text-gray-400">
                      <Calendar className="h-3.5 w-3.5" />
                      <span style={{ fontSize: "0.8125rem" }}>{formatDate(summary.latestPredictionDate)}</span>
                    </div>
                  )}
                  {summary.forecastPeriod && (
                    <div className="flex items-center gap-1.5 text-gray-400">
                      <Clock className="h-3.5 w-3.5" />
                      <span style={{ fontSize: "0.8125rem" }}>{summary.forecastPeriod} días</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => navigate(`/history/${summary.latestPredictionId}`)}
                  className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-500 hover:text-gray-900 hover:border-gray-400 transition-all"
                  style={{ fontSize: "0.8125rem" }}>
                  Ver completo
                </button>
                <button
                  className="flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 text-white hover:bg-cyan-400 transition-all"
                  style={{ fontSize: "0.8125rem", fontWeight: 600 }}>
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
                    <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
                      className={`flex items-center gap-2 rounded-lg px-4 py-2 transition-all ${
                        activeTab === tab.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                      }`}
                      style={{ fontSize: "0.875rem", fontWeight: activeTab === tab.id ? 500 : 400 }}>
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
                    { label: "Demanda Total Prevista", value: `${Math.round(summary.totalForecastedUnits).toLocaleString()} uds`, icon: TrendingUp, iconColor: "text-cyan-500", iconBg: "bg-cyan-500/10 border-cyan-500/20" },
                    { label: "Productos Analizados",   value: summary.totalProducts.toString(),                                   icon: Package,   iconColor: "text-blue-500", iconBg: "bg-blue-500/10 border-blue-500/20" },
                    { label: "Precisión Estimada",     value: summary.accuracy > 0 ? `${summary.accuracy}%` : "—",               icon: BarChart3, iconColor: "text-purple-500", iconBg: "bg-purple-500/10 border-purple-500/20" },
                    { label: "Horizonte Analizado",    value: `${summary.forecastPeriod ?? "—"} días`,                           icon: Calendar,  iconColor: "text-orange-500", iconBg: "bg-orange-500/10 border-orange-500/20" },
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
                                style={{ fontSize: "0.8125rem" }} />
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
                              const pConf = priorityConfig[(priorityMap[name] ?? "low") as keyof typeof priorityConfig];
                              return (
                                <button key={name} onClick={() => { setSelectedProduct(name); setSidebarOpen(false); }}
                                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all hover:bg-gray-50 ${isSelected ? "bg-cyan-500/5 border-r-2 border-r-cyan-500" : ""}`}>
                                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${pConf.bg}`}>
                                    <span className={`h-2 w-2 rounded-full ${pConf.dot}`} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className={`truncate ${isSelected ? "text-cyan-600" : "text-gray-900"}`}
                                      style={{ fontSize: "0.8125rem", fontWeight: isSelected ? 600 : 500 }}>{name}</p>
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
                          <p className="text-gray-400" style={{ fontSize: "0.75rem" }}>
                            {summary.forecastPeriod} días predichos
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
                    {chartLoading ? (
                      <div className="flex items-center justify-center h-[300px]">
                        <Loader2 className="h-6 w-6 text-cyan-500 animate-spin" />
                      </div>
                    ) : (
                      <AnimatePresence mode="wait">
                        <motion.div key={selectedProduct} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
                          <ResponsiveContainer width="100%" height={300}>
                            <ComposedChart data={chartData} margin={{ top: 10, right: 24, left: 0, bottom: 8 }}>
                              <defs>
                                <linearGradient id="confGrad2" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.15} />
                                  <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.02} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="4 4" stroke="#f1f5f9" vertical={false} />
                              <XAxis dataKey="date" tick={{ fill: "#cbd5e1", fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" dy={8} />
                              <YAxis tick={{ fill: "#cbd5e1", fontSize: 10 }} tickLine={false} axisLine={false} width={36} />
                              <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#e2e8f0", strokeWidth: 1.5, strokeDasharray: "4 4" }} />
                              {showConfidence && <Area type="monotone" dataKey="upper" stroke="none" fill="url(#confGrad2)" connectNulls={false} isAnimationActive={false} />}
                              {showConfidence && <Area type="monotone" dataKey="lower" stroke="none" fill="#f9fafb" connectNulls={false} isAnimationActive={false} />}
                              <Line type="monotone" dataKey="historical" stroke="#3b82f6" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: "#3b82f6", strokeWidth: 0 }} connectNulls={false} />
                              <Line type="monotone" dataKey="predicted" stroke="#06b6d4" strokeWidth={2.5} strokeDasharray="8 4" dot={false} activeDot={{ r: 5, fill: "#06b6d4", strokeWidth: 0 }} connectNulls={false} />
                              {chartStartDate && <ReferenceLine x={chartStartDate} stroke="#f97316" strokeWidth={1.5} strokeDasharray="4 3" label={{ value: "Inicio pred.", position: "insideTopRight", fill: "#f97316", fontSize: 10, fontWeight: 600 }} />}
                            </ComposedChart>
                          </ResponsiveContainer>
                        </motion.div>
                      </AnimatePresence>
                    )}
                  </div>
                </div>

                {/* Products table (backend-paginated) */}
                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <div>
                      <h3 className="text-gray-900 mb-0.5" style={{ fontWeight: 600 }}>Medicamentos analizados</h3>
                      <p className="text-gray-400" style={{ fontSize: "0.8125rem" }}>
                        {productsData ? `${productsData.totalCount} productos` : "Cargando..."}
                      </p>
                    </div>
                    <div className="relative min-w-52">
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
                          <tr className="border-b border-gray-200">
                            {["Producto", "Hist. prom/día", "Pred. prom/día", "Total predicho", "Variación", "Tendencia"].map((h) => (
                              <th key={h} className="pb-3 text-left text-gray-400" style={{ fontSize: "0.75rem", fontWeight: 500 }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {(productsData?.items ?? []).map((p) => {
                            const pConf = priorityConfig[p.priority];
                            const hist = p.historicalAvg;
                            const varVal = getVariation(p);
                            const isUp = varVal > 5;
                            const isDown = varVal < -5;
                            const trendColor = isUp ? "text-cyan-500" : isDown ? "text-red-500" : "text-gray-400";
                            const trendBg = isUp ? "bg-cyan-500/10" : isDown ? "bg-red-500/10" : "bg-gray-100";
                            const TrendIcon = isUp ? TrendingUp : isDown ? TrendingDown : Minus;
                            return (
                              <tr key={p.productName} className="border-b border-gray-100 hover:bg-white transition-colors">
                                <td className="py-3 pr-4">
                                  <div className="flex items-center gap-2">
                                    <span className={`h-2 w-2 rounded-full shrink-0 ${pConf.dot}`} />
                                    <span className="text-gray-900" style={{ fontSize: "0.8125rem", fontWeight: 500 }}>{p.productName}</span>
                                  </div>
                                </td>
                                <td className="py-3 pr-4 text-gray-900" style={{ fontSize: "0.8125rem", fontWeight: 500 }}>{hist != null ? `${hist.toFixed(1)} uds` : "—"}</td>
                                <td className="py-3 pr-4 text-gray-900" style={{ fontSize: "0.8125rem", fontWeight: 600 }}>{p.avgPredictedQuantity.toFixed(1)} uds</td>
                                <td className="py-3 pr-4 text-cyan-600" style={{ fontSize: "0.8125rem", fontWeight: 700 }}>{Math.round(p.totalPredictedQuantity)} uds</td>
                                <td className="py-3 pr-4">
                                  <span className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 ${trendBg} ${trendColor}`}
                                    style={{ fontSize: "0.75rem", fontWeight: 600 }}>
                                    {isUp ? "+" : isDown ? "" : "~"}{varVal.toFixed(1)}%
                                  </span>
                                </td>
                                <td className="py-3">
                                  <TrendIcon className={`h-4 w-4 ${trendColor}`} />
                                </td>
                              </tr>
                            );
                          })}
                          {!productsLoading && !productsData?.items.length && (
                            <tr><td colSpan={6} className="py-8 text-center text-gray-400" style={{ fontSize: "0.875rem" }}>Sin datos de productos</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {productsData && (
                    <Paginator
                      page={resultsPage}
                      total={productsData.totalCount}
                      pageSize={PAGE}
                      onChange={(p) => setResultsPage(p)}
                    />
                  )}
                </div>
              </div>
            )}

            {/* ── PURCHASE PLAN TAB ── */}
            {activeTab === "purchase" && (
              <div className="px-6 pb-6 space-y-5">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: "Productos a comprar", value: summary.totalProducts.toString(), icon: Package, iconColor: "text-cyan-500", iconBg: "bg-cyan-500/10 border-cyan-500/20" },
                    { label: "Ítems críticos", value: summary.criticalCount.toString(), icon: AlertTriangle, iconColor: "text-red-500", iconBg: "bg-red-500/10 border-red-500/20" },
                    { label: "Inversión estimada", value: "—", icon: TrendingUp, iconColor: "text-purple-500", iconBg: "bg-purple-500/10 border-purple-500/20" },
                    { label: "Horizonte del plan", value: `${summary.forecastPeriod ?? "—"} días`, icon: Calendar, iconColor: "text-orange-500", iconBg: "bg-orange-500/10 border-orange-500/20" },
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

                <div className="rounded-2xl border border-gray-100 bg-gray-50 overflow-hidden">
                  {productsLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-5 w-5 text-cyan-500 animate-spin" />
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-200">
                            {["Medicamento", "Cant. Total Prevista", "Cant. Diaria", "Prioridad"].map((h) => (
                              <th key={h} className="px-4 py-3 text-left text-gray-400 whitespace-nowrap" style={{ fontSize: "0.75rem", fontWeight: 500 }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedPlan.map((p) => {
                            const pConf = priorityConfig[p.priority];
                            return (
                              <tr key={p.productName} className="border-b border-gray-100 hover:bg-white transition-colors">
                                <td className="px-4 py-3">
                                  <p className="text-gray-900" style={{ fontSize: "0.8125rem", fontWeight: 500 }}>{p.productName}</p>
                                </td>
                                <td className="px-4 py-3">
                                  <span className="text-gray-900" style={{ fontSize: "0.8125rem", fontWeight: 700 }}>{Math.round(p.totalPredictedQuantity)} uds</span>
                                </td>
                                <td className="px-4 py-3 text-gray-500" style={{ fontSize: "0.8125rem" }}>
                                  {Math.round(p.avgPredictedQuantity)} uds/día
                                </td>
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
                          {paginatedPlan.length === 0 && (
                            <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400" style={{ fontSize: "0.875rem" }}>Sin productos en el plan</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {planItems.length > PAGE && (
                    <div className="px-4">
                      <Paginator page={planPage} total={planItems.length} pageSize={PAGE} onChange={setPlanPage} />
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        )}

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
