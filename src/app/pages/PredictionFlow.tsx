import { useState, useCallback, useEffect, useMemo } from "react";
import { useNavigate } from "react-router";
import {
  Upload,
  Settings,
  BarChart3,
  ShoppingCart,
  CheckCircle,
  ChevronRight,
  ChevronLeft,
  FileText,
  X,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  Package,
  Download,
  Calendar,
  Clock,
  Save,
  Activity,
  Search,
  PanelLeftOpen,
  PanelLeftClose,
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
import { mockHistory } from "../data/mockData";
import type { PurchasePlanItem } from "../data/mockData";

/* ── Constants ── */
const STEPS = [
  { id: 1, label: "Carga de datos", icon: Upload },
  { id: 2, label: "Configuración", icon: Settings },
  { id: 3, label: "Análisis", icon: BarChart3 },
  { id: 4, label: "Resultados", icon: TrendingUp },
  { id: 5, label: "Plan de compras", icon: ShoppingCart },
];

const priorityConfig = {
  critical: { label: "Crítico", color: "text-red-500", bg: "bg-red-500/10", border: "border-red-500/30", dot: "bg-red-500" },
  high: { label: "Alto", color: "text-orange-500", bg: "bg-orange-500/10", border: "border-orange-500/30", dot: "bg-orange-500" },
  medium: { label: "Medio", color: "text-yellow-500", bg: "bg-yellow-500/10", border: "border-yellow-500/30", dot: "bg-yellow-500" },
  low: { label: "Bajo", color: "text-cyan-500", bg: "bg-cyan-500/10", border: "border-cyan-500/30", dot: "bg-cyan-500" },
};

const ANALYSIS_STEPS = [
  "Cargando y validando datos...",
  "Normalizando formato de fechas...",
  "Calculando estadísticas descriptivas...",
  "Entrenando modelo de predicción...",
  "Generando proyecciones de demanda...",
  "Calculando recomendaciones de compra...",
  "Finalizando análisis...",
];

const PIPELINE_STEPS = [
  { label: "Carga de datos", description: "Leyendo archivos de ventas e inventario", icon: Upload },
  { label: "Preprocesamiento", description: "Limpiando valores atípicos y normalizando registros", icon: Settings },
  { label: "Ingeniería de variables", description: "Extrayendo estacionalidad y tendencias", icon: BarChart3 },
  { label: "Entrenamiento del modelo", description: "Predicciones ARIMA + ML ensemble", icon: Activity },
  { label: "Proyecciones de demanda", description: "Calculando demanda futura por producto", icon: TrendingUp },
  { label: "Plan de compras", description: "Calculando recomendaciones de reabastecimiento", icon: ShoppingCart },
];

const PAGE_SIZE_TABLE = 5;
const PAGE_SIZE_PLAN = 5;

/* ── Types ── */
interface UploadedFile {
  name: string;
  size: number;
  type: "sales" | "inventory";
  rows?: number;
}

interface ProductChartPoint {
  date: string;
  historical: number | null;
  predicted: number | null;
  upper: number | null;
  lower: number | null;
}

/* ── Chart data generator per product ── */
const variationFactorByPriority: Record<string, number> = {
  critical: 0.76,
  high: 0.84,
  medium: 0.93,
  low: 0.99,
};

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

/* ── Tooltip ── */
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

/* ── Paginator ── */
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
              p === page ? "border-cyan-500 bg-cyan-500 text-white" : "border-gray-200 text-gray-500 hover:border-gray-300"
            }`}
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

/* ── Main Component ── */
export function PredictionFlow() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [forecastDays, setForecastDays] = useState(30);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisStatus, setAnalysisStatus] = useState<"idle" | "running" | "done">("idle");
  const [completedStepIdx, setCompletedStepIdx] = useState(-1);
  const [filterPriority, setFilterPriority] = useState<string>("all");

  // Step 4 state
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [showConfidence, setShowConfidence] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarSearch, setSidebarSearch] = useState("");
  const [resultsTablePage, setResultsTablePage] = useState(1);
  const [resultsSearch, setResultsSearch] = useState("");
  const [planTablePage, setPlanTablePage] = useState(1);
  const [planSearch, setPlanSearch] = useState("");

  const resultData = mockHistory[0];

  useEffect(() => {
    if (resultData.products.length > 0 && !selectedProductId) {
      setSelectedProductId(resultData.products[0].id);
    }
  }, [resultData.products, selectedProductId]);

  // Auto-advance to step 4 with extended delay to read metrics
  useEffect(() => {
    if (currentStep === 3 && analysisStatus === "done") {
      const timer = setTimeout(() => setCurrentStep(4), 4500);
      return () => clearTimeout(timer);
    }
  }, [currentStep, analysisStatus]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    const newFiles: UploadedFile[] = droppedFiles
      .filter((f) => f.name.endsWith(".csv") || f.name.endsWith(".xlsx") || f.name.endsWith(".xls"))
      .map((f, i) => ({
        name: f.name,
        size: f.size,
        type: i === 0 ? "sales" : "inventory",
        rows: Math.floor(Math.random() * 500) + 100,
      }));
    setFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const addMockFile = (type: "sales" | "inventory") => {
    const name = type === "sales" ? "ventas_abril_2026.csv" : "inventario_mayo_2026.xlsx";
    setFiles((prev) => [
      ...prev.filter((f) => f.type !== type),
      { name, size: 45230, type, rows: type === "sales" ? 487 : 312 },
    ]);
  };

  const removeFile = (name: string) => setFiles((prev) => prev.filter((f) => f.name !== name));

  const runAnalysis = () => {
    setAnalysisStatus("running");
    setAnalysisProgress(0);
    setCompletedStepIdx(-1);
    let idx = 0;
    const total = PIPELINE_STEPS.length;
    const interval = setInterval(() => {
      if (idx < total) {
        setCompletedStepIdx(idx - 1);
        setAnalysisProgress(Math.round(((idx + 1) / total) * 100));
        idx++;
      } else {
        clearInterval(interval);
        setCompletedStepIdx(total - 1);
        setAnalysisProgress(100);
        setAnalysisStatus("done");
      }
    }, 680);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const canProceed = () => {
    if (currentStep === 1) return files.length >= 1;
    return true;
  };

  const today = new Date(2026, 4, 5).toLocaleDateString("es-ES", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const handleNext = () => {
    if (currentStep === 2) {
      setCurrentStep(3);
      runAnalysis();
    } else {
      setCurrentStep((s) => Math.min(STEPS.length, s + 1));
    }
  };

  const nextLabel =
    currentStep === 2 ? "Ejecutar análisis"
    : currentStep === 4 ? "Ver plan de compras"
    : "Siguiente";

  // Results computed
  const selectedProduct = useMemo(
    () => resultData.products.find((p) => p.id === selectedProductId) ?? resultData.products[0],
    [resultData.products, selectedProductId]
  );

  const productChartData = useMemo(
    () => selectedProduct ? generateProductChartData(selectedProduct, forecastDays) : [],
    [selectedProduct, forecastDays]
  );

  const bridgeDateLabel = useMemo(() => {
    const d = new Date(2026, 4, 5);
    return d.toLocaleDateString("es-ES", { month: "short", day: "numeric" });
  }, []);

  const tableData = useMemo(() =>
    resultData.products.map((p) => ({ ...p, avgHistorical: getAvgHistorical(p), variation: getVariation(p) })),
    [resultData.products]
  );

  // Sidebar filtered products
  const sidebarProducts = useMemo(() =>
    resultData.products.filter((p) =>
      sidebarSearch === "" ||
      p.name.toLowerCase().includes(sidebarSearch.toLowerCase()) ||
      p.category.toLowerCase().includes(sidebarSearch.toLowerCase())
    ),
    [resultData.products, sidebarSearch]
  );

  // Table searched + paginated
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

  // Plan table
  const filteredProducts = filterPriority === "all"
    ? resultData.products
    : resultData.products.filter((p) => p.priority === filterPriority);

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

  return (
    <div className="min-h-[calc(100vh-4rem)] px-6 py-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-gray-900 mb-1" style={{ fontWeight: 700 }}>Nueva predicción</h1>
        <p className="text-gray-400" style={{ fontSize: "0.875rem" }}>
          Completa los pasos para generar tu plan de compras
        </p>
      </div>

      {/* Stepper */}
      <div className="mb-10">
        <div className="flex items-start">
          {STEPS.flatMap((step, idx) => {
            const Icon = step.icon;
            const isCompleted = currentStep > step.id;
            const isActive = currentStep === step.id;
            const items = [
              <button
                key={`step-${step.id}`}
                onClick={() => { if (isCompleted) setCurrentStep(step.id); }}
                className={`flex flex-col items-center gap-1.5 shrink-0 ${isCompleted ? "cursor-pointer" : "cursor-default"}`}
              >
                <div className={`flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all ${
                  isCompleted ? "border-cyan-500 bg-cyan-500 text-white"
                  : isActive ? "border-cyan-500 bg-cyan-500/10 text-cyan-500"
                  : "border-gray-300 bg-white text-gray-400"
                }`}>
                  {isCompleted ? <CheckCircle className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </div>
                <span className="hidden sm:block text-center whitespace-nowrap transition-colors"
                  style={{ fontSize: "0.6875rem", fontWeight: isActive ? 600 : 400,
                    color: isCompleted ? "#0891b2" : isActive ? "#06b6d4" : "#9ca3af" }}>
                  {step.label}
                </span>
              </button>
            ];
            if (idx < STEPS.length - 1) {
              items.push(
                <div key={`line-${step.id}`} className="flex-1 h-px mt-[1.125rem] mx-2 transition-colors"
                  style={{ backgroundColor: isCompleted ? "#06b6d4" : "#e5e7eb" }} />
              );
            }
            return items;
          })}
        </div>
      </div>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          transition={{ duration: 0.25 }}
        >

          {/* ── STEP 1 ── */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="text-gray-900 mb-1" style={{ fontWeight: 600 }}>Carga de archivos</h2>
                <p className="text-gray-400 mb-6" style={{ fontSize: "0.875rem" }}>
                  Sube tus archivos de ventas e inventario en formato CSV o Excel
                </p>
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={handleDrop}
                  className={`relative rounded-xl border-2 border-dashed p-10 text-center transition-all ${
                    isDragOver ? "border-cyan-500 bg-cyan-500/5" : "border-gray-300 hover:border-gray-400"
                  }`}
                >
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                      <Upload className="h-6 w-6 text-cyan-500" />
                    </div>
                    <div>
                      <p className="text-gray-900 mb-1" style={{ fontWeight: 500 }}>Arrastra los archivos aquí</p>
                      <p className="text-gray-400" style={{ fontSize: "0.8125rem" }}>o haz clic en los botones para seleccionar</p>
                    </div>
                    <div className="flex gap-3 mt-2">
                      <button onClick={() => addMockFile("sales")}
                        className="rounded-lg border border-gray-300 bg-gray-50 px-4 py-2 text-gray-600 hover:border-cyan-500/40 hover:text-cyan-500 transition-all"
                        style={{ fontSize: "0.8125rem" }}>+ Datos de ventas</button>
                      <button onClick={() => addMockFile("inventory")}
                        className="rounded-lg border border-gray-300 bg-gray-50 px-4 py-2 text-gray-600 hover:border-blue-500/40 hover:text-blue-500 transition-all"
                        style={{ fontSize: "0.8125rem" }}>+ Datos de inventario</button>
                    </div>
                    <p className="text-gray-400" style={{ fontSize: "0.75rem" }}>Formatos soportados: .csv, .xlsx, .xls — Máx. 50MB</p>
                  </div>
                </div>
                {files.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {files.map((file) => (
                      <div key={file.name} className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${file.type === "sales" ? "bg-cyan-500/10" : "bg-blue-500/10"}`}>
                          <FileText className={`h-4 w-4 ${file.type === "sales" ? "text-cyan-500" : "text-blue-500"}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-gray-900 truncate" style={{ fontSize: "0.875rem", fontWeight: 500 }}>{file.name}</p>
                          <p className="text-gray-400" style={{ fontSize: "0.75rem" }}>
                            {formatSize(file.size)} · {file.rows?.toLocaleString()} registros ·{" "}
                            <span className={file.type === "sales" ? "text-cyan-500/80" : "text-blue-500/80"}>
                              {file.type === "sales" ? "Ventas" : "Inventario"}
                            </span>
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-0.5 text-cyan-500" style={{ fontSize: "0.6875rem" }}>✓ Validado</span>
                          <button onClick={() => removeFile(file.name)} className="text-gray-400 hover:text-red-500 transition-colors">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {files.length === 0 && (
                <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4 flex gap-3">
                  <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />
                  <p className="text-yellow-600" style={{ fontSize: "0.8125rem" }}>Debes cargar al menos un archivo para continuar</p>
                </div>
              )}
            </div>
          )}

          {/* ── STEP 2 ── */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="text-gray-900 mb-1" style={{ fontWeight: 600 }}>Configuración del análisis</h2>
                <p className="text-gray-400 mb-6" style={{ fontSize: "0.875rem" }}>Ajusta los parámetros para la predicción</p>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Calendar className="h-4 w-4 text-blue-500" />
                      <span className="text-gray-500" style={{ fontSize: "0.8125rem" }}>Fecha actual del sistema</span>
                    </div>
                    <p className="text-gray-900" style={{ fontWeight: 500 }}>{today}</p>
                  </div>
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Clock className="h-4 w-4 text-cyan-500" />
                      <span className="text-gray-500" style={{ fontSize: "0.8125rem" }}>Período de predicción</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {[15, 30, 60].map((days) => (
                        <button key={days} onClick={() => setForecastDays(days)}
                          className={`rounded-lg border py-2.5 transition-all ${
                            forecastDays === days
                              ? "border-cyan-500 bg-cyan-500/10 text-cyan-500"
                              : "border-gray-300 bg-white text-gray-500 hover:border-gray-400"
                          }`}
                          style={{ fontSize: "0.875rem", fontWeight: forecastDays === days ? 600 : 400 }}>
                          {days} días
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="mt-6 rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-5">
                  <h4 className="text-cyan-600 mb-3" style={{ fontSize: "0.875rem", fontWeight: 600 }}>Resumen de configuración</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { label: "Archivos cargados", value: `${files.length} archivo${files.length !== 1 ? "s" : ""}` },
                      { label: "Registros totales", value: files.reduce((s, f) => s + (f.rows || 0), 0).toLocaleString() },
                      { label: "Período a predecir", value: `${forecastDays} días` },
                      { label: "Fecha de inicio", value: "06/05/2026" },
                    ].map((item) => (
                      <div key={item.label}>
                        <p className="text-gray-500" style={{ fontSize: "0.75rem" }}>{item.label}</p>
                        <p className="text-gray-900 mt-0.5" style={{ fontSize: "0.9375rem", fontWeight: 500 }}>{item.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 3: ANALYSIS ── */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
                {analysisStatus === "running" && (
                  <div className="p-6">
                    {/* ── Header + Progress bar (always visible at top) ── */}
                    <div className="flex items-center gap-4 mb-6 pb-5 border-b border-gray-100">
                      <div className="relative shrink-0">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                          <Activity className="h-4.5 w-4.5 text-cyan-500" style={{ height: 18, width: 18 }} />
                        </div>
                        <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-60" />
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500" />
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="text-gray-900" style={{ fontWeight: 700, fontSize: "0.875rem" }}>
                            Pipeline de análisis
                          </p>
                          <span className="text-cyan-500 shrink-0" style={{ fontSize: "0.875rem", fontWeight: 700 }}>
                            {analysisProgress}%
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                          <motion.div
                            className="h-full rounded-full bg-gradient-to-r from-cyan-600 to-cyan-400"
                            initial={{ width: "0%" }}
                            animate={{ width: `${analysisProgress}%` }}
                            transition={{ duration: 0.6, ease: "easeOut" }}
                          />
                        </div>
                        <p className="text-gray-400 mt-1" style={{ fontSize: "0.6875rem" }}>
                          {files.reduce((s, f) => s + (f.rows || 0), 0).toLocaleString()} registros · {forecastDays} días a predecir
                        </p>
                      </div>
                    </div>

                    {/* ── 2-column steps grid ── */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {PIPELINE_STEPS.map((step, i) => {
                        const isDone = i <= completedStepIdx;
                        const isActive = i === completedStepIdx + 1;
                        const StepIcon = step.icon;
                        return (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: i * 0.05 }}
                            className={`flex items-start gap-3 rounded-xl border p-4 transition-all duration-300 ${
                              isDone
                                ? "border-cyan-500/20 bg-cyan-500/5"
                                : isActive
                                ? "border-cyan-500/30 bg-cyan-500/[0.07] shadow-sm"
                                : "border-gray-100 bg-gray-50/60"
                            }`}
                          >
                            {/* State circle */}
                            <div className={`flex h-7 w-7 shrink-0 mt-0.5 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                              isDone
                                ? "bg-cyan-500 border-cyan-500"
                                : isActive
                                ? "bg-transparent border-cyan-500"
                                : "bg-white border-gray-200"
                            }`}>
                              {isDone ? (
                                <CheckCircle className="h-3.5 w-3.5 text-white" />
                              ) : isActive ? (
                                <motion.div
                                  animate={{ rotate: 360 }}
                                  transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                                  className="h-3 w-3 rounded-full border-2 border-cyan-500 border-t-transparent"
                                />
                              ) : (
                                <span style={{ fontSize: "0.625rem", fontWeight: 600, color: "#d1d5db" }}>{i + 1}</span>
                              )}
                            </div>

                            {/* Icon box */}
                            <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-all duration-300 ${
                              isDone
                                ? "bg-cyan-500/15 border border-cyan-500/25"
                                : isActive
                                ? "bg-cyan-500/10 border border-cyan-500/20"
                                : "bg-white border border-gray-200"
                            }`}>
                              <StepIcon className={`h-3.5 w-3.5 transition-colors duration-300 ${
                                isDone || isActive ? "text-cyan-500" : "text-gray-300"
                              }`} />
                            </div>

                            {/* Text */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span
                                  className="transition-colors duration-300"
                                  style={{
                                    fontSize: "0.8125rem",
                                    fontWeight: isDone || isActive ? 600 : 400,
                                    color: isDone ? "#0e7490" : isActive ? "#111827" : "#9ca3af",
                                  }}
                                >
                                  {step.label}
                                </span>
                                {isActive && (
                                  <motion.span
                                    initial={{ opacity: 0, scale: 0.85 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="rounded-full border border-cyan-500/40 bg-cyan-500/10 px-2 py-px text-cyan-600"
                                    style={{ fontSize: "0.625rem", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}
                                  >
                                    Running
                                  </motion.span>
                                )}
                              </div>
                              <p
                                className="mt-0.5 transition-colors duration-300"
                                style={{
                                  fontSize: "0.6875rem",
                                  color: isDone ? "#6b7280" : isActive ? "#6b7280" : "#d1d5db",
                                }}
                              >
                                {step.description}
                              </p>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {analysisStatus === "done" && (
                  <div className="p-6">
                    {/* ── Success banner ── */}
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-4 rounded-xl border border-cyan-500/25 bg-cyan-500/8 px-5 py-4 mb-6"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-500/15 border border-cyan-500/25">
                        <CheckCircle className="h-5 w-5 text-cyan-500" />
                      </div>
                      <div className="flex-1">
                        <p className="text-gray-900" style={{ fontSize: "0.875rem", fontWeight: 700 }}>
                          ¡Análisis completado con éxito!
                        </p>
                        <p className="text-gray-500" style={{ fontSize: "0.75rem" }}>
                          Redirigiendo a resultados en unos segundos...
                        </p>
                      </div>
                      <div className="shrink-0 flex flex-col items-end gap-1.5">
                        <span className="text-gray-400" style={{ fontSize: "0.6875rem" }}>Redirigiendo</span>
                        <div className="h-1 w-24 rounded-full bg-gray-100 overflow-hidden">
                          <motion.div className="h-full rounded-full bg-cyan-500"
                            initial={{ width: "0%" }}
                            animate={{ width: "100%" }}
                            transition={{ duration: 4.3, ease: "linear" }} />
                        </div>
                      </div>
                    </motion.div>

                    {/* ── Metric cards (concordant with pipeline step tiles) ── */}
                    <p className="text-gray-400 mb-4" style={{ fontSize: "0.75rem" }}>
                      Métricas del modelo · {files.reduce((s, f) => s + (f.rows || 0), 0).toLocaleString()} registros procesados
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {[
                        { label: "Precisión estimada", value: "94.2%", sub: "Alta confianza", icon: TrendingUp, iconBg: "bg-cyan-500/10 border-cyan-500/20", iconColor: "text-cyan-500", valColor: "#0e7490" },
                        { label: "RMSE", value: "12.3", sub: "Error cuadrático medio", icon: BarChart3, iconBg: "bg-blue-500/10 border-blue-500/20", iconColor: "text-blue-500", valColor: "#1d4ed8" },
                        { label: "MAPE", value: "5.8%", sub: "Error porcentual absoluto", icon: Activity, iconBg: "bg-purple-500/10 border-purple-500/20", iconColor: "text-purple-500", valColor: "#7c3aed" },
                      ].map((m, idx) => {
                        const MIcon = m.icon;
                        return (
                          <motion.div key={m.label}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.35, delay: idx * 0.08 }}
                            className="flex items-start gap-3 rounded-xl border border-gray-100 bg-gray-50/60 p-4">
                            <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${m.iconBg}`}>
                              <MIcon className={`h-3.5 w-3.5 ${m.iconColor}`} />
                            </div>
                            <div>
                              <p style={{ fontSize: "1.375rem", fontWeight: 700, color: m.valColor, lineHeight: 1.1 }}>{m.value}</p>
                              <p className="text-gray-700" style={{ fontSize: "0.8125rem", fontWeight: 500 }}>{m.label}</p>
                              <p className="text-gray-400" style={{ fontSize: "0.6875rem" }}>{m.sub}</p>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── STEP 4: RESULTS ── */}
          {currentStep === 4 && (
            <div className="space-y-6">
              {/* 4 KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "Demanda Total Prevista", value: `${resultData.totalUnits.toLocaleString()} uds`, icon: TrendingUp, iconColor: "text-cyan-500", iconBg: "bg-cyan-500/10 border-cyan-500/20" },
                  { label: "Productos Analizados", value: resultData.totalProducts.toString(), icon: Package, iconColor: "text-blue-500", iconBg: "bg-blue-500/10 border-blue-500/20" },
                  { label: "Precisión Estimada", value: `${resultData.accuracy}%`, icon: BarChart3, iconColor: "text-purple-500", iconBg: "bg-purple-500/10 border-purple-500/20" },
                  { label: "Horizonte Analizado", value: `${forecastDays} días`, icon: Calendar, iconColor: "text-orange-500", iconBg: "bg-orange-500/10 border-orange-500/20" },
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

                {/* Sidebar panel */}
                <AnimatePresence>
                  {sidebarOpen && (
                    <>
                      {/* Backdrop */}
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="absolute inset-0 bg-black/10 z-10"
                        onClick={() => setSidebarOpen(false)}
                      />
                      {/* Drawer */}
                      <motion.div
                        initial={{ x: -304 }}
                        animate={{ x: 0 }}
                        exit={{ x: -304 }}
                        transition={{ type: "spring", stiffness: 320, damping: 32 }}
                        className="absolute top-0 left-0 bottom-0 w-72 bg-white border-r border-gray-200 z-20 flex flex-col shadow-2xl"
                        style={{ borderRadius: "1rem 0 0 1rem" }}
                      >
                        {/* Sidebar header */}
                        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
                          <div>
                            <p className="text-gray-900" style={{ fontSize: "0.875rem", fontWeight: 600 }}>Medicamentos</p>
                            <p className="text-gray-400" style={{ fontSize: "0.75rem" }}>
                              {sidebarProducts.length} de {resultData.products.length}
                            </p>
                          </div>
                          <button
                            onClick={() => setSidebarOpen(false)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>

                        {/* Search */}
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
                              autoFocus
                            />
                          </div>
                        </div>

                        {/* Medication list */}
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

                {/* Chart header */}
                <div className="px-6 pt-5 pb-4 border-b border-gray-100">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {/* Burger button */}
                      <button
                        onClick={() => setSidebarOpen((v) => !v)}
                        className={`flex items-center gap-2 rounded-xl border px-3 py-2 transition-all ${
                          sidebarOpen
                            ? "border-cyan-500/50 bg-cyan-500/10 text-cyan-600"
                            : "border-gray-300 bg-white text-gray-600 hover:border-gray-400 hover:text-gray-900"
                        }`}
                        style={{ fontSize: "0.8125rem", fontWeight: 500 }}
                      >
                        {sidebarOpen
                          ? <PanelLeftClose className="h-4 w-4" />
                          : <PanelLeftOpen className="h-4 w-4" />
                        }
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

                    {/* Confidence toggle */}
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

                  {/* Legend */}
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

                {/* Chart */}
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
                  {/* Table search */}
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

          {/* ── STEP 5: PURCHASE PLAN ── */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <div>
                  <h2 className="text-gray-900 mb-1" style={{ fontWeight: 600 }}>Plan de compras recomendado</h2>
                  <p className="text-gray-400" style={{ fontSize: "0.875rem" }}>Basado en la predicción para los próximos {forecastDays} días</p>
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

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "Total productos", value: resultData.products.length.toString(), icon: Package, color: "text-blue-500", bg: "bg-blue-500/10 border-blue-500/20" },
                  { label: "Items críticos", value: resultData.products.filter((p) => p.priority === "critical").length.toString(), icon: AlertCircle, color: "text-red-500", bg: "bg-red-500/10 border-red-500/20" },
                  { label: "Items altos", value: resultData.products.filter((p) => p.priority === "high").length.toString(), icon: TrendingUp, color: "text-orange-500", bg: "bg-orange-500/10 border-orange-500/20" },
                  { label: "Unidades totales", value: resultData.products.reduce((s, p) => s + p.recommendedQty, 0).toLocaleString(), icon: ShoppingCart, color: "text-cyan-500", bg: "bg-cyan-500/10 border-cyan-500/20" },
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

              {/* Filter + Search */}
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
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
        <button
          onClick={() => setCurrentStep((s) => Math.max(1, s - 1))}
          disabled={currentStep === 1 || currentStep === 3}
          className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-gray-500 transition-all hover:border-gray-400 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed"
          style={{ fontSize: "0.875rem" }}
        >
          <ChevronLeft className="h-4 w-4" />
          Anterior
        </button>
        <span className="text-gray-400" style={{ fontSize: "0.8125rem" }}>Paso {currentStep} de {STEPS.length}</span>
        {currentStep === 3 ? (
          <div className="w-32" />
        ) : currentStep < STEPS.length ? (
          <button
            onClick={handleNext}
            disabled={!canProceed()}
            className="flex items-center gap-2 rounded-xl bg-cyan-500 px-5 py-2.5 text-white transition-all hover:bg-cyan-400 hover:shadow-lg hover:shadow-cyan-500/20 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ fontSize: "0.875rem", fontWeight: 600 }}
          >
            {nextLabel}
            <ChevronRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            onClick={() => navigate("/history")}
            className="flex items-center gap-2 rounded-xl bg-cyan-500 px-5 py-2.5 text-white transition-all hover:bg-cyan-400 hover:shadow-lg hover:shadow-cyan-500/20 active:scale-95"
            style={{ fontSize: "0.875rem", fontWeight: 600 }}
          >
            <Save className="h-4 w-4" />
            Guardar y finalizar
          </button>
        )}
      </div>
    </div>
  );
}
