import { useParams, useNavigate } from "react-router";
import {
  ArrowLeft, Calendar, Clock, TrendingUp, AlertCircle, Download,
  Package, BarChart3, ChevronLeft, ChevronRight, Search, CheckCircle,
  TrendingDown, Minus, PanelLeftClose, PanelLeftOpen, Loader2, RefreshCw,
  ClipboardList, Activity, ClipboardCheck, UploadCloud, X, FileText,
} from "lucide-react";
import {
  ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, BarChart, Bar, Legend, LineChart,
} from "recharts";
import { motion, AnimatePresence } from "motion/react";
import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { downloadCsv, downloadPdf } from "../../lib/exportUtils";
import { dashboardService } from "../../services/dashboard.service";
import { purchasePlanService } from "../../services/purchase-plan.service";
import { datasetService } from "../../services/dataset.service";
import { buildChartFromBackendPoints, type ChartPoint } from "../../lib/transforms";
import type {
  DashboardSummaryResponse,
  DashboardProductRow,
  PagedResult,
  PlanEvaluationResponse,
} from "../../types/api";
import { extractApiErrorMessage } from "../context/AuthContext";

const priorityConfig = {
  critical: { label: "Crítico", color: "text-red-500",    bg: "bg-red-500/10",    border: "border-red-500/30",    dot: "bg-red-500"    },
  high:     { label: "Alto",    color: "text-orange-500", bg: "bg-orange-500/10", border: "border-orange-500/30", dot: "bg-orange-500" },
  medium:   { label: "Medio",   color: "text-yellow-500", bg: "bg-yellow-500/10", border: "border-yellow-500/30", dot: "bg-yellow-500" },
  low:      { label: "Bajo",    color: "text-cyan-500",   bg: "bg-cyan-500/10",   border: "border-cyan-500/30",   dot: "bg-cyan-500"   },
};

function truncateStr(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

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

const PAGE = 10;

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
        {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map((p) => (
          <button key={p} onClick={() => onChange(p)}
            className={`flex h-7 w-7 items-center justify-center rounded-lg border transition-all ${p === page ? "border-cyan-500 bg-cyan-500 text-white" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}
            style={{ fontSize: "0.75rem", fontWeight: p === page ? 600 : 400 }}>
            {p}
          </button>
        ))}
        <button onClick={() => onChange(page + 1)} disabled={page === totalPages}
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

  // ── Core data ──
  const [summary, setSummary] = useState<DashboardSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ── Products table (backend-paginated) ──
  const [productsData, setProductsData] = useState<PagedResult<DashboardProductRow> | null>(null);
  const [productsLoading, setProductsLoading] = useState(false);
  const [resultsPage, setResultsPage] = useState(1);
  const [resultsSearch, setResultsSearch] = useState("");

  // ── Chart (on-demand) ──
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [chartLoading, setChartLoading] = useState(false);
  const chartCache = useRef<Map<string, ChartPoint[]>>(new Map());

  // ── Export ──
  const [exportLoading, setExportLoading] = useState(false);

  // ── UI ──
  const [activeTab, setActiveTab] = useState<"dashboard" | "purchase" | "evaluation">("dashboard");
  const [showConfidence, setShowConfidence] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarSearch, setSidebarSearch] = useState("");
  const [filterPriority, setFilterPriority] = useState("all");
  const [planSearch, setPlanSearch] = useState("");
  const [planPage, setPlanPage] = useState(1);

  // ── Evaluation tab ──

  // ── Purchase plan evaluation ──
  const [purchasePlanId, setPurchasePlanId] = useState<string | null>(null);
  const [purchasePlanIdLoading, setPurchasePlanIdLoading] = useState(false);
  const [evalSalesFile, setEvalSalesFile] = useState<File | null>(null);
  const [evalSalesProdCol, setEvalSalesProdCol] = useState("");
  const [evalSalesQtyCol, setEvalSalesQtyCol] = useState("");
  const [evalPharmFile, setEvalPharmFile] = useState<File | null>(null);
  const [evalPharmProdCol, setEvalPharmProdCol] = useState("");
  const [evalPharmQtyCol, setEvalPharmQtyCol] = useState("");
  const [planEvalLoading, setPlanEvalLoading] = useState(false);
  const [planEvalResult, setPlanEvalResult] = useState<PlanEvaluationResponse | null>(null);
  const [planEvalError, setPlanEvalError] = useState("");
  const [evalSectionOpen, setEvalSectionOpen] = useState(false);
  const [salesColumns, setSalesColumns] = useState<string[]>([]);
  const [pharmColumns, setPharmColumns] = useState<string[]>([]);
  const [evalSalesPriceCol, setEvalSalesPriceCol] = useState("");
  const [chartLimit, setChartLimit] = useState<number>(20);
  const [salesDragging, setSalesDragging] = useState(false);
  const [pharmDragging, setPharmDragging] = useState(false);
  const [salesColsLoading, setSalesColsLoading] = useState(false);
  const [pharmColsLoading, setPharmColsLoading] = useState(false);
  const salesFileRef = useRef<HTMLInputElement>(null);
  const pharmFileRef = useRef<HTMLInputElement>(null);
  const planIdLoadStarted = useRef(false);
  const evalResultRef = useRef<HTMLDivElement>(null);
  const [planSampleNames, setPlanSampleNames] = useState<string[]>([]);
  const [csvSampleNames, setCsvSampleNames] = useState<string[]>([]);

  // ── Load summary on mount ──
  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError("");
    try {
      const summaryData = await dashboardService.getPredictionSummary(id);
      setSummary(summaryData);
    } catch (err) {
      setError(extractApiErrorMessage(err, "No se pudo cargar la predicción."));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleExport(format: "csv" | "pdf") {
    if (!id) return;
    setExportLoading(true);
    try {
      const all = await dashboardService.getProducts(id, 1, 9999);
      const headers = ["Producto", "Cant. Total Prevista (uds)", "Cant. Diaria (uds)", "Prioridad"];
      const rows = all.items.map((p) => [
        p.productName,
        Math.round(p.totalPredictedQuantity),
        p.avgPredictedQuantity.toFixed(1),
        priorityConfig[p.priority].label,
      ]);
      const filename = `plan-compras-${new Date().toISOString().slice(0, 10)}`;
      if (format === "csv") {
        downloadCsv(`${filename}.csv`, headers, rows);
      } else {
        const subtitle = summary?.forecastPeriod
          ? `Predicción para los próximos ${summary.forecastPeriod} días — generado el ${new Date().toLocaleDateString("es-ES")}`
          : `Generado el ${new Date().toLocaleDateString("es-ES")}`;
        downloadPdf(`${filename}.pdf`, "Plan de compras recomendado", subtitle, headers, rows);
      }
    } finally {
      setExportLoading(false);
    }
  }

  // ── Load purchase plan ID when purchase or evaluation tab opens ──
  useEffect(() => {
    if ((activeTab !== "purchase" && activeTab !== "evaluation") || !id || planIdLoadStarted.current) return;
    planIdLoadStarted.current = true;
    setPurchasePlanIdLoading(true);
    purchasePlanService.getByExecution(id)
      .then((p) => {
        setPurchasePlanId(p.id);
        // keep up to 5 sample product names so we can show them in diagnostics
        const samples = (p.items ?? []).slice(0, 5).map((i: { productName: string }) => i.productName);
        setPlanSampleNames(samples);
      })
      .catch(() => {})
      .finally(() => setPurchasePlanIdLoading(false));
  }, [activeTab, id]);

  // ── Select first product when summary loads ──
  useEffect(() => {
    if (summary?.productNames?.length && !selectedProduct) {
      setSelectedProduct(summary.productNames[0]);
    }
  }, [summary, selectedProduct]);

  // ── Load products page ──
  useEffect(() => {
    if (!id) return;
    setProductsLoading(true);
    dashboardService
      .getProducts(id, resultsPage, PAGE, resultsSearch || undefined)
      .then((data) => setProductsData(data))
      .catch((err) => console.warn("[HistoryDetail] getProducts failed:", err))
      .finally(() => setProductsLoading(false));
  }, [id, resultsPage, resultsSearch]);

  // ── Load chart on product selection ──
  useEffect(() => {
    if (!id || !selectedProduct) return;

    const cached = chartCache.current.get(selectedProduct);
    if (cached) {
      setChartData(cached);
      return;
    }

    setChartLoading(true);
    dashboardService
      .getChart(id, selectedProduct)
      .then((response) => {
        const full = buildChartFromBackendPoints(response.points, summary?.forecastPeriod ?? 30);
        chartCache.current.set(selectedProduct, full);
        setChartData(full);
      })
      .catch((err) => console.warn("[HistoryDetail] getChart failed:", err))
      .finally(() => setChartLoading(false));
  }, [id, selectedProduct, summary?.forecastPeriod]);

  // ── Sidebar filtered list ──
  const sidebarProducts = useMemo(() => {
    const names = summary?.productNames ?? [];
    if (!sidebarSearch) return names;
    return names.filter((n) => n.toLowerCase().includes(sidebarSearch.toLowerCase()));
  }, [summary?.productNames, sidebarSearch]);

  // ── Plan tab: client-side filter over current page ──
  const planItems = useMemo(() => {
    const items = productsData?.items ?? [];
    const byPriority = filterPriority === "all" ? items : items.filter((p) => p.priority === filterPriority);
    if (!planSearch) return byPriority;
    return byPriority.filter((p) => p.productName.toLowerCase().includes(planSearch.toLowerCase()));
  }, [productsData, filterPriority, planSearch]);

  const paginatedPlan = planItems.slice((planPage - 1) * PAGE, planPage * PAGE);

  const bridgeDateLabel = useMemo(
    () => new Date().toLocaleDateString("es-ES", { month: "short", day: "numeric" }),
    []
  );


  // ── Prediction period dates for empty state ──
  const periodStart = useMemo(() => {
    if (!summary?.latestPredictionDate) return "—";
    return new Date(summary.latestPredictionDate).toLocaleDateString("es-ES", {
      day: "numeric", month: "long", year: "numeric",
    });
  }, [summary?.latestPredictionDate]);

  const periodEnd = useMemo(() => {
    if (!summary?.latestPredictionDate || !summary?.forecastPeriod) return "—";
    const end = new Date(summary.latestPredictionDate);
    end.setDate(end.getDate() + (summary.forecastPeriod ?? 30));
    return end.toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });
  }, [summary?.latestPredictionDate, summary?.forecastPeriod]);

  const getAvgHistorical = (p: DashboardProductRow) => Math.round(p.avgPredictedQuantity * 0.88);
  const getVariation = (p: DashboardProductRow) => {
    const a = getAvgHistorical(p);
    return a > 0 ? ((p.avgPredictedQuantity - a) / a) * 100 : 0;
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });

  // ── Loading state ──
  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
          <p className="text-gray-500" style={{ fontSize: "0.9375rem" }}>Cargando predicción...</p>
        </div>
      </div>
    );
  }

  // ── Error / no data state ──
  if (error || !summary?.latestPredictionId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 border border-gray-200">
          <AlertCircle className="h-7 w-7 text-gray-300" />
        </div>
        <p className="text-gray-500">{error || "Predicción no encontrada"}</p>
        <div className="flex gap-2">
          {error && (
            <button onClick={loadData}
              className="flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2 text-white hover:bg-cyan-400 transition-colors"
              style={{ fontSize: "0.875rem", fontWeight: 600 }}>
              <RefreshCw className="h-4 w-4" />
              Reintentar
            </button>
          )}
          <button onClick={() => navigate("/history")}
            className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
            style={{ fontSize: "0.875rem" }}>
            <ArrowLeft className="h-4 w-4" />
            Volver al historial
          </button>
        </div>
      </div>
    );
  }

  const parseCsvHeaders = (file: File): Promise<string[]> =>
    new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = (e.target?.result as string) ?? "";
        const firstLine = text.split(/\r?\n/)[0] ?? "";
        const clean = firstLine.startsWith("﻿") ? firstLine.slice(1) : firstLine;
        const delim = clean.includes(";") ? ";" : ",";
        resolve(clean.split(delim).map((h) => h.trim().replace(/^"|"$/g, "")));
      };
      reader.readAsText(file, "utf-8");
    });

  const parseFileHeaders = async (file: File): Promise<string[]> => {
    const ext = file.name.toLowerCase();
    if (ext.endsWith(".xlsx") || ext.endsWith(".xls")) {
      return datasetService.parseHeaders(file);
    }
    return parseCsvHeaders(file);
  };

  // Fuzzy match: find first header that contains any of the keywords (case-insensitive)
  const fuzzyMatch = (headers: string[], ...keywords: string[]) =>
    headers.find(h => keywords.some(k => h.toLowerCase().includes(k.toLowerCase()))) ?? "";

  // Parse first N values of a column from a CSV file (client-side, no server call)
  const parseCsvColumnSample = (file: File, colName: string, n = 5): Promise<string[]> =>
    new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = (e.target?.result as string) ?? "";
          const lines = text.split(/\r?\n/).filter(Boolean);
          if (lines.length < 2) return resolve([]);
          const delim = lines[0].includes(";") ? ";" : ",";
          const headers = lines[0].split(delim).map(h => h.trim().replace(/^"|"$/g, ""));
          const idx = headers.findIndex(h => h.toLowerCase() === colName.toLowerCase());
          if (idx < 0) return resolve([]);
          const vals = lines.slice(1, n + 1)
            .map(l => l.split(delim)[idx]?.trim().replace(/^"|"$/g, "") ?? "")
            .filter(Boolean);
          resolve(vals);
        } catch { resolve([]); }
      };
      reader.readAsText(file);
    });

  const handleSalesFile = async (file: File) => {
    setEvalSalesFile(file);
    setSalesColumns([]);
    setEvalSalesProdCol("");
    setEvalSalesQtyCol("");
    setEvalSalesPriceCol("");
    setCsvSampleNames([]);
    setSalesColsLoading(true);
    try {
      const headers = await parseFileHeaders(file);
      setSalesColumns(headers);
      const detectedProdCol = fuzzyMatch(headers, "producto", "nombre", "product", "item", "descripcion", "medicamento", "articulo");
      setEvalSalesProdCol(detectedProdCol);
      setEvalSalesQtyCol(fuzzyMatch(headers, "cantidad", "qty", "quantity", "ventas", "unidades", "cant", "total"));
      setEvalSalesPriceCol(fuzzyMatch(headers, "precio", "price", "valor", "costo", "monto", "unitario"));
      if (detectedProdCol) {
        const sample = await parseCsvColumnSample(file, detectedProdCol);
        setCsvSampleNames(sample);
      }
    } finally {
      setSalesColsLoading(false);
    }
  };

  const handlePharmFile = async (file: File) => {
    setEvalPharmFile(file);
    setPharmColumns([]);
    setEvalPharmProdCol("");
    setEvalPharmQtyCol("");
    setPharmColsLoading(true);
    try {
      const headers = await parseFileHeaders(file);
      setPharmColumns(headers);
      setEvalPharmProdCol(fuzzyMatch(headers, "producto", "nombre", "product", "item", "descripcion", "medicamento", "articulo"));
      setEvalPharmQtyCol(fuzzyMatch(headers, "comprad", "cantidad", "qty", "quantity", "unidades", "cant", "total", "ventas"));
    } finally {
      setPharmColsLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] px-6 py-8 max-w-6xl mx-auto">

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div className="flex items-start gap-4">
          <button onClick={() => navigate("/history")}
            className="flex items-center gap-1.5 text-gray-400 hover:text-gray-900 transition-colors mt-1"
            style={{ fontSize: "0.875rem" }}>
            <ArrowLeft className="h-4 w-4" />
            Historial
          </button>
          <div>
            <h1 className="text-gray-900 mb-1" style={{ fontWeight: 700 }}>Predicción</h1>
            <p className="text-gray-400 mb-1" style={{ fontSize: "0.8125rem", fontFamily: "monospace" }}>
              {summary.latestPredictionId.slice(0, 8).toUpperCase()}…
            </p>
            <div className="flex items-center gap-4">
              {summary.latestPredictionDate && (
                <div className="flex items-center gap-1.5 text-gray-400">
                  <Calendar className="h-3.5 w-3.5" />
                  <span style={{ fontSize: "0.8125rem" }}>{formatDate(summary.latestPredictionDate)}</span>
                </div>
              )}
              {summary.forecastPeriod && (
                <div className="flex items-center gap-1.5 text-gray-400">
                  <Clock className="h-3.5 w-3.5" />
                  <span style={{ fontSize: "0.8125rem" }}>{summary.forecastPeriod} días de predicción</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => handleExport("csv")}
            disabled={exportLoading}
            className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-500 hover:text-gray-900 hover:border-gray-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ fontSize: "0.8125rem" }}>
            {exportLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Exportar CSV
          </button>
          <button
            onClick={() => handleExport("pdf")}
            disabled={exportLoading}
            className="flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 text-white hover:bg-cyan-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ fontSize: "0.8125rem", fontWeight: 600 }}>
            {exportLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Exportar PDF
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-gray-200 bg-gray-100 p-1 w-fit mb-8">
        {[
          { id: "dashboard",  label: "Dashboard",          icon: BarChart3      },
          { id: "purchase",   label: "Plan de compras",    icon: Package        },
          { id: "evaluation", label: "Evaluación del plan", icon: ClipboardList },
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

      {/* ── DASHBOARD TAB ── */}
      {activeTab === "dashboard" && (
        <div className="space-y-6">

          {/* KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Demanda Total Prevista", value: `${Math.round(summary.totalForecastedUnits).toLocaleString()} uds`, icon: TrendingUp, iconColor: "text-cyan-500", iconBg: "bg-cyan-500/10 border-cyan-500/20" },
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

          {/* Interactive Chart */}
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

          {/* Products table (backend-paginated) */}
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
      )}

      {/* ── PURCHASE PLAN TAB ── */}
      {activeTab === "purchase" && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div>
              <h2 className="text-gray-900 mb-1" style={{ fontWeight: 600 }}>Plan de compras recomendado</h2>
              <p className="text-gray-400" style={{ fontSize: "0.875rem" }}>
                Basado en la predicción para los {summary.forecastPeriod} días seleccionados
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Total productos",   value: summary.totalProducts.toString(),   icon: Package,   color: "text-blue-500",   bg: "bg-blue-500/10 border-blue-500/20" },
              { label: "Ítems críticos",    value: summary.criticalCount.toString(),   icon: AlertCircle, color: "text-red-500",  bg: "bg-red-500/10 border-red-500/20" },
              { label: "Inversión estimada", value: "—",                               icon: TrendingUp, color: "text-purple-500", bg: "bg-purple-500/10 border-purple-500/20" },
              { label: "Horizonte del plan", value: `${summary.forecastPeriod ?? "—"} días`, icon: Calendar, color: "text-orange-500", bg: "bg-orange-500/10 border-orange-500/20" },
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
              {["all", "critical", "high", "medium", "low"].map((pri) => {
                const labels: Record<string, string> = { all: "Todos", critical: "Crítico", high: "Alto", medium: "Medio", low: "Bajo" };
                return (
                  <button key={pri} onClick={() => { setFilterPriority(pri); setPlanPage(1); }}
                    className={`rounded-lg border px-3 py-1.5 transition-all ${
                      filterPriority === pri
                        ? "border-cyan-500/50 bg-cyan-500/10 text-cyan-500"
                        : "border-gray-300 bg-white text-gray-500 hover:text-gray-700"
                    }`}
                    style={{ fontSize: "0.8125rem" }}>
                    {labels[pri]}
                  </button>
                );
              })}
            </div>
            <div className="relative ml-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <input type="text" placeholder="Buscar producto..." value={planSearch}
                onChange={(e) => { setPlanSearch(e.target.value); setPlanPage(1); }}
                className="w-56 rounded-xl border border-gray-300 bg-white pl-8 pr-3 py-2 text-gray-900 placeholder:text-gray-400 outline-none focus:border-cyan-500/60 transition-colors"
                style={{ fontSize: "0.8125rem" }} />
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            {productsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 text-cyan-500 animate-spin" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      {["Producto", "Cant. Total Prevista", "Cant. Diaria", "Prioridad"].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-gray-400" style={{ fontSize: "0.75rem", fontWeight: 500 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedPlan.map((p) => {
                      const pConf = priorityConfig[p.priority];
                      return (
                        <tr key={p.productName} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 text-gray-900" style={{ fontSize: "0.8125rem", fontWeight: 500 }}>{p.productName}</td>
                          <td className="px-4 py-3 text-cyan-500" style={{ fontSize: "0.8125rem", fontWeight: 600 }}>{Math.round(p.totalPredictedQuantity)} uds</td>
                          <td className="px-4 py-3 text-gray-500" style={{ fontSize: "0.8125rem" }}>{Math.round(p.avgPredictedQuantity)} uds/día</td>
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
                    {paginatedPlan.length === 0 && (
                      <tr><td colSpan={4} className="py-8 text-center text-gray-400" style={{ fontSize: "0.875rem" }}>No se encontraron productos</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
            {planItems.length > PAGE && (
              <Paginator page={planPage} total={planItems.length} pageSize={PAGE} onChange={setPlanPage} />
            )}
          </div>

          {/* ── hint to go to evaluation tab ── */}
          <div className="rounded-2xl border border-gray-100 bg-gray-50 px-6 py-4 flex items-center gap-3">
            <ClipboardCheck className="h-4 w-4 text-gray-400 shrink-0" />
            <p className="text-gray-400" style={{ fontSize: "0.8125rem" }}>
              Para comparar este plan con las ventas reales del período, ve a la pestaña{" "}
              <button onClick={() => setActiveTab("evaluation" as any)} className="text-cyan-600 hover:underline font-medium">Evaluación del plan</button>.
            </p>
          </div>
        </div>
      )}

      {/* ── EVALUATION TAB ── */}
      {activeTab === "evaluation" && (
        <div className="space-y-5">

          {/* Upload form card */}
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

              {/* ── Ventas reales (required) ── */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <p className="text-gray-800" style={{ fontWeight: 600, fontSize: "0.9375rem" }}>Ventas reales del período</p>
                  <span className="rounded-full bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 text-cyan-600" style={{ fontSize: "0.6875rem", fontWeight: 600 }}>Requerido</span>
                </div>

                <input ref={salesFileRef} type="file" accept=".csv,.xls,.xlsx" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleSalesFile(f); e.target.value = ""; }} />

                {!evalSalesFile ? (
                  /* Drop zone */
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
                  /* File loaded state */
                  <div className="rounded-2xl border border-gray-200 overflow-hidden">
                    {/* File header bar */}
                    <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border-b border-gray-100">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10 border border-cyan-500/20 shrink-0">
                        <FileText className="h-4 w-4 text-cyan-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-800 truncate" style={{ fontSize: "0.8125rem", fontWeight: 600 }}>{evalSalesFile.name}</p>
                        <p className="text-gray-400" style={{ fontSize: "0.75rem" }}>
                          {formatFileSize(evalSalesFile.size)} ·{" "}
                          <span className="uppercase font-medium text-cyan-600">{evalSalesFile.name.split(".").pop()}</span>
                        </p>
                      </div>
                      {salesColsLoading ? (
                        <Loader2 className="h-4 w-4 text-cyan-500 animate-spin shrink-0" />
                      ) : salesColumns.length > 0 ? (
                        <span className="flex items-center gap-1 text-emerald-600 shrink-0" style={{ fontSize: "0.75rem", fontWeight: 500 }}>
                          <CheckCircle className="h-3.5 w-3.5" /> {salesColumns.length} columnas
                        </span>
                      ) : null}
                      <button onClick={() => { setEvalSalesFile(null); setSalesColumns([]); setEvalSalesProdCol(""); setEvalSalesQtyCol(""); setEvalSalesPriceCol(""); }}
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:text-gray-700 hover:border-gray-300 transition-all shrink-0">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Column mapping */}
                    {salesColumns.length > 0 && (
                      <div className="p-4 grid grid-cols-3 gap-3">
                        {[
                          { label: "Columna producto", value: evalSalesProdCol, set: setEvalSalesProdCol, required: true, placeholder: "— selecciona —" },
                          { label: "Columna cantidad", value: evalSalesQtyCol, set: setEvalSalesQtyCol, required: true, placeholder: "— selecciona —" },
                          { label: "Columna precio", value: evalSalesPriceCol, set: setEvalSalesPriceCol, required: false, placeholder: "— sin precio —" },
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

              {/* ── Plan botica (optional) ── */}
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
                      {pharmColsLoading ? (
                        <Loader2 className="h-4 w-4 text-cyan-500 animate-spin shrink-0" />
                      ) : pharmColumns.length > 0 ? (
                        <span className="flex items-center gap-1 text-emerald-600 shrink-0" style={{ fontSize: "0.75rem", fontWeight: 500 }}>
                          <CheckCircle className="h-3.5 w-3.5" /> {pharmColumns.length} columnas
                        </span>
                      ) : null}
                      <button onClick={() => { setEvalPharmFile(null); setPharmColumns([]); setEvalPharmProdCol(""); setEvalPharmQtyCol(""); }}
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:text-gray-700 hover:border-gray-300 transition-all shrink-0">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    {pharmColumns.length > 0 && (
                      <div className="p-4 grid grid-cols-2 gap-3">
                        {[
                          { label: "Columna producto", value: evalPharmProdCol, set: setEvalPharmProdCol },
                          { label: "Columna cantidad", value: evalPharmQtyCol, set: setEvalPharmQtyCol },
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

              {/* Error & action */}
              {planEvalError && (
                <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                  <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-red-600" style={{ fontSize: "0.8125rem" }}>{planEvalError}</p>
                </div>
              )}

              <div className="flex items-center justify-between pt-1">
                <p className="text-gray-400" style={{ fontSize: "0.75rem" }}>
                  {purchasePlanIdLoading ? "Verificando plan de compras…" :
                   !purchasePlanId ? "Genera el plan de compras primero" :
                   !evalSalesFile ? "Sube las ventas reales para continuar" :
                   !evalSalesProdCol || !evalSalesQtyCol ? "Selecciona las columnas requeridas" :
                   "Listo para evaluar"}
                </p>
                <button
                  disabled={!evalSalesFile || !evalSalesProdCol || !evalSalesQtyCol || planEvalLoading || !purchasePlanId || purchasePlanIdLoading}
                  onClick={async () => {
                    if (!purchasePlanId || !evalSalesFile) return;
                    setPlanEvalLoading(true);
                    setPlanEvalError("");
                    setPlanEvalResult(null);
                    try {
                      const result = await purchasePlanService.evaluate(
                        purchasePlanId,
                        evalSalesFile,
                        evalSalesProdCol,
                        evalSalesQtyCol,
                        evalSalesPriceCol || undefined,
                        evalPharmFile ?? undefined,
                        evalPharmProdCol || undefined,
                        evalPharmQtyCol || undefined,
                      );
                      setPlanEvalResult(result);
                      setTimeout(() => evalResultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
                    } catch (err) {
                      setPlanEvalError(extractApiErrorMessage(err, "Error al evaluar el plan."));
                    } finally {
                      setPlanEvalLoading(false);
                    }
                  }}
                  className="flex items-center gap-2 rounded-xl bg-cyan-500 px-5 py-2.5 text-white hover:bg-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  style={{ fontSize: "0.875rem", fontWeight: 600 }}
                >
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

              {/* KPI cards */}
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

              {/* Table */}
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
                      const planHasNumbers = planSampleNames.length > 0 &&
                        planSampleNames.every(n => !isNaN(Number(n)));
                      return (
                        <tr>
                          <td colSpan={10} className="px-4 py-8">
                            {planHasNumbers ? (
                              <div className="max-w-lg mx-auto rounded-xl border border-red-200 bg-red-50 p-4">
                                <p className="text-red-700 font-semibold mb-1" style={{ fontSize: "0.875rem" }}>El plan fue generado con un mapeo de columnas incorrecto</p>
                                <p className="text-red-600 mb-3" style={{ fontSize: "0.8125rem" }}>
                                  Los "nombres de producto" guardados son números ({planSampleNames.slice(0,3).join(", ")}…), lo que indica que se mapeó una columna numérica (cantidad o precio) como columna de producto al ejecutar la predicción.
                                </p>
                                <p className="text-red-500" style={{ fontSize: "0.75rem" }}>
                                  Solución: haz una nueva predicción asegurándote de mapear la columna correcta (nombre del medicamento) como "Producto", genera el plan desde esa nueva predicción y evalúa con ese plan.
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
                                      <p className="text-amber-700 mb-2" style={{ fontSize: "0.75rem", fontWeight: 600 }}>Tu CSV tiene (col «{evalSalesProdCol}»):</p>
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
                          <td className="px-4 py-3 text-right text-gray-500" style={{ fontSize: "0.8125rem" }}>
                            {Math.round(item.actualSold)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className={`inline-block rounded-md px-2 py-0.5 ${cls[item.pharmaCastAccuracy]}`} style={{ fontSize: "0.8125rem", fontWeight: 500 }}>
                              {Math.round(item.pharmaCastPlan)}
                            </span>
                          </td>
                          {planEvalResult.summary.hasPharmacyPlan && (
                            <td className="px-4 py-3 text-right">
                              {item.pharmacyPlan != null && item.pharmacyAccuracy ? (
                                <span className={`inline-block rounded-md px-2 py-0.5 ${cls[item.pharmacyAccuracy]}`} style={{ fontSize: "0.8125rem", fontWeight: 500 }}>
                                  {Math.round(item.pharmacyPlan)}
                                </span>
                              ) : <span className="text-gray-300" style={{ fontSize: "0.8125rem" }}>—</span>}
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

              {/* Chart */}
              <div className="px-6 py-5 border-t border-gray-100">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                  <p className="text-gray-700" style={{ fontWeight: 600, fontSize: "0.9375rem" }}>Comparativa visual</p>
                  <div className="flex items-center gap-1.5">
                    <span className="text-gray-400 mr-1" style={{ fontSize: "0.75rem" }}>Mostrar:</span>
                    {([10, 20, planEvalResult.items.length] as const).map((n) => {
                      const label = n === planEvalResult.items.length ? "Todos" : `Top ${n}`;
                      return (
                        <button
                          key={n}
                          onClick={() => setChartLimit(n)}
                          className={`rounded-lg border px-3 py-1 transition-all ${
                            chartLimit === n
                              ? "border-cyan-500/50 bg-cyan-500/10 text-cyan-600"
                              : "border-gray-200 bg-white text-gray-400 hover:text-gray-600"
                          }`}
                          style={{ fontSize: "0.75rem", fontWeight: 500 }}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart
                    data={planEvalResult.items
                      .slice(0, chartLimit)
                      .map((item) => ({
                        name: item.productName.slice(0, 16),
                        fullName: item.productName,
                        actual: Math.round(item.actualSold),
                        pharmaCast: Math.round(item.pharmaCastPlan),
                        ...(planEvalResult.summary.hasPharmacyPlan ? { botica: item.pharmacyPlan != null ? Math.round(item.pharmacyPlan) : null } : {}),
                      }))}
                    margin={{ top: 8, right: 16, left: 0, bottom: 60 }}
                  >
                    <CartesianGrid strokeDasharray="4 4" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 10 }} tickLine={false} axisLine={false} angle={-40} textAnchor="end" interval={0} dy={6} />
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
                    <Legend wrapperStyle={{ paddingTop: 8 }} formatter={(v) => <span style={{ color: "#6b7280", fontSize: "0.75rem" }}>{v}</span>} />
                    <Line type="monotone" dataKey="actual" name="Vendido real" stroke="#3b82f6" strokeWidth={2.5} dot={false} />
                    <Line type="monotone" dataKey="pharmaCast" name="Plan PharmaCast" stroke="#06b6d4" strokeWidth={2.5} dot={false} />
                    {planEvalResult.summary.hasPharmacyPlan && (
                      <Line type="monotone" dataKey="botica" name="Plan Botica" stroke="#f97316" strokeWidth={2} strokeDasharray="5 3" dot={false} />
                    )}
                  </LineChart>
                </ResponsiveContainer>
                <p className="text-gray-400 text-center mt-2" style={{ fontSize: "0.7rem" }}>
                  Ordenado por cantidad prevista — Top {Math.min(chartLimit, planEvalResult.items.length)} de {planEvalResult.items.length} productos
                </p>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
