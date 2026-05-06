import { useState, useCallback } from "react";
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
  Package,
  DollarSign,
  Download,
  RefreshCw,
  Play,
  Calendar,
  Clock,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { motion, AnimatePresence } from "motion/react";
import { mockHistory } from "../data/mockData";
import type { PurchasePlanItem } from "../data/mockData";

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

interface UploadedFile {
  name: string;
  size: number;
  type: "sales" | "inventory";
  rows?: number;
}

const previewData = [
  { producto: "Amoxicilina 500mg", fecha: "2026-04-01", unidades: 42, stock: 145 },
  { producto: "Ibuprofeno 400mg", fecha: "2026-04-01", unidades: 78, stock: 320 },
  { producto: "Omeprazol 20mg", fecha: "2026-04-01", unidades: 31, stock: 210 },
  { producto: "Metformina 850mg", fecha: "2026-04-01", unidades: 25, stock: 88 },
  { producto: "Paracetamol 1g", fecha: "2026-04-01", unidades: 95, stock: 480 },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-lg">
        <p className="text-gray-500 mb-1" style={{ fontSize: "0.75rem" }}>{label}</p>
        {payload.map((p: any) => (
          <p key={p.name} style={{ color: p.color, fontSize: "0.8125rem", fontWeight: 500 }}>
            {p.name === "historical" ? "Histórico" : "Predicción"}: {p.value} uds
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export function PredictionFlow() {
  const [currentStep, setCurrentStep] = useState(1);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [forecastDays, setForecastDays] = useState(30);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisStatus, setAnalysisStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [analysisMessages, setAnalysisMessages] = useState<string[]>([]);
  const [filterPriority, setFilterPriority] = useState<string>("all");

  const resultData = mockHistory[0];

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

  const removeFile = (name: string) => {
    setFiles((prev) => prev.filter((f) => f.name !== name));
  };

  const runAnalysis = () => {
    setAnalysisStatus("running");
    setAnalysisProgress(0);
    setAnalysisMessages([]);

    const messages = [
      "Cargando y validando datos...",
      "Normalizando formato de fechas...",
      "Calculando estadísticas descriptivas...",
      "Entrenando modelo de predicción...",
      "Generando proyecciones de demanda...",
      "Calculando recomendaciones de compra...",
      "Finalizando análisis...",
    ];

    let step = 0;
    const interval = setInterval(() => {
      if (step < messages.length) {
        setAnalysisMessages((prev) => [...prev, messages[step]]);
        setAnalysisProgress(Math.round(((step + 1) / messages.length) * 100));
        step++;
      } else {
        clearInterval(interval);
        setAnalysisStatus("done");
      }
    }, 600);
  };

  const filteredProducts = filterPriority === "all"
    ? resultData.products
    : resultData.products.filter((p) => p.priority === filterPriority);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const canProceed = () => {
    if (currentStep === 1) return files.length >= 1;
    if (currentStep === 3) return analysisStatus === "done";
    return true;
  };

  const today = new Date(2026, 4, 5).toLocaleDateString("es-ES", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-[calc(100vh-4rem)] px-6 py-8 max-w-6xl mx-auto">
      {/* Page title */}
      <div className="mb-8">
        <h1 className="text-gray-900 mb-1" style={{ fontWeight: 700 }}>
          Nueva predicción
        </h1>
        <p className="text-gray-400" style={{ fontSize: "0.875rem" }}>
          Completa los pasos para generar tu plan de compras
        </p>
      </div>

      {/* Stepper */}
      <div className="mb-10">
        <div className="flex items-center gap-0">
          {STEPS.map((step, idx) => {
            const Icon = step.icon;
            const isCompleted = currentStep > step.id;
            const isActive = currentStep === step.id;
            const isLast = idx === STEPS.length - 1;
            return (
              <div key={step.id} className="flex items-center flex-1 min-w-0">
                <button
                  onClick={() => {
                    if (isCompleted) setCurrentStep(step.id);
                  }}
                  className={`flex flex-col items-center gap-1.5 group ${isCompleted ? "cursor-pointer" : "cursor-default"}`}
                >
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all ${
                      isCompleted
                        ? "border-cyan-500 bg-cyan-500 text-white"
                        : isActive
                        ? "border-cyan-500 bg-cyan-500/10 text-cyan-500"
                        : "border-gray-300 bg-white text-gray-400"
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
                  </div>
                  <span
                    className="hidden sm:block text-center transition-colors whitespace-nowrap"
                    style={{
                      fontSize: "0.6875rem",
                      fontWeight: isActive ? 600 : 400,
                      color: isCompleted ? "#0891b2" : isActive ? "#06b6d4" : "#9ca3af",
                    }}
                  >
                    {step.label}
                  </span>
                </button>
                {!isLast && (
                  <div className="flex-1 h-px mx-2 transition-colors" style={{
                    backgroundColor: isCompleted ? "#06b6d4" : "#e5e7eb"
                  }} />
                )}
              </div>
            );
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
          {/* STEP 1: Data Upload */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="text-gray-900 mb-1" style={{ fontWeight: 600 }}>
                  Carga de archivos
                </h2>
                <p className="text-gray-400 mb-6" style={{ fontSize: "0.875rem" }}>
                  Sube tus archivos de ventas e inventario en formato CSV o Excel
                </p>

                {/* Drop zone */}
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={handleDrop}
                  className={`relative rounded-xl border-2 border-dashed p-10 text-center transition-all ${
                    isDragOver
                      ? "border-cyan-500 bg-cyan-500/5"
                      : "border-gray-300 hover:border-gray-400"
                  }`}
                >
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                      <Upload className="h-6 w-6 text-cyan-500" />
                    </div>
                    <div>
                      <p className="text-gray-900 mb-1" style={{ fontWeight: 500 }}>
                        Arrastra los archivos aquí
                      </p>
                      <p className="text-gray-400" style={{ fontSize: "0.8125rem" }}>
                        o haz clic en los botones para seleccionar
                      </p>
                    </div>
                    <div className="flex gap-3 mt-2">
                      <button
                        onClick={() => addMockFile("sales")}
                        className="rounded-lg border border-gray-300 bg-gray-50 px-4 py-2 text-gray-600 hover:border-cyan-500/40 hover:text-cyan-500 transition-all"
                        style={{ fontSize: "0.8125rem" }}
                      >
                        + Datos de ventas
                      </button>
                      <button
                        onClick={() => addMockFile("inventory")}
                        className="rounded-lg border border-gray-300 bg-gray-50 px-4 py-2 text-gray-600 hover:border-blue-500/40 hover:text-blue-500 transition-all"
                        style={{ fontSize: "0.8125rem" }}
                      >
                        + Datos de inventario
                      </button>
                    </div>
                    <p className="text-gray-400" style={{ fontSize: "0.75rem" }}>
                      Formatos soportados: .csv, .xlsx, .xls — Máx. 50MB
                    </p>
                  </div>
                </div>

                {/* Uploaded files */}
                {files.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {files.map((file) => (
                      <div
                        key={file.name}
                        className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3"
                      >
                        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                          file.type === "sales" ? "bg-cyan-500/10" : "bg-blue-500/10"
                        }`}>
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
                          <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-0.5 text-cyan-500" style={{ fontSize: "0.6875rem" }}>
                            ✓ Validado
                          </span>
                          <button
                            onClick={() => removeFile(file.name)}
                            className="text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Data preview */}
              {files.length > 0 && (
                <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                  <h3 className="text-gray-900 mb-4" style={{ fontWeight: 500 }}>
                    Vista previa de datos
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-100">
                          {["Producto", "Fecha", "Unidades vendidas", "Stock actual"].map((h) => (
                            <th key={h} className="pb-3 text-left text-gray-400" style={{ fontSize: "0.75rem", fontWeight: 500 }}>
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {previewData.map((row, i) => (
                          <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                            <td className="py-3 text-gray-900" style={{ fontSize: "0.8125rem" }}>{row.producto}</td>
                            <td className="py-3 text-gray-500" style={{ fontSize: "0.8125rem" }}>{row.fecha}</td>
                            <td className="py-3 text-cyan-500" style={{ fontSize: "0.8125rem" }}>{row.unidades}</td>
                            <td className="py-3 text-gray-500" style={{ fontSize: "0.8125rem" }}>{row.stock}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-gray-400 mt-3" style={{ fontSize: "0.75rem" }}>
                    Mostrando 5 de {files[0]?.rows?.toLocaleString()} registros totales
                  </p>
                </div>
              )}

              {files.length === 0 && (
                <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4 flex gap-3">
                  <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />
                  <p className="text-yellow-600" style={{ fontSize: "0.8125rem" }}>
                    Debes cargar al menos un archivo para continuar
                  </p>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Configuration */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="text-gray-900 mb-1" style={{ fontWeight: 600 }}>
                  Configuración del análisis
                </h2>
                <p className="text-gray-400 mb-6" style={{ fontSize: "0.875rem" }}>
                  Ajusta los parámetros para la predicción
                </p>

                <div className="grid md:grid-cols-2 gap-6">
                  {/* Current date */}
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Calendar className="h-4 w-4 text-blue-500" />
                      <span className="text-gray-500" style={{ fontSize: "0.8125rem" }}>Fecha actual del sistema</span>
                    </div>
                    <p className="text-gray-900" style={{ fontWeight: 500 }}>
                      {today}
                    </p>
                    <p className="text-gray-400 mt-1" style={{ fontSize: "0.75rem" }}>
                      Detectada automáticamente
                    </p>
                  </div>

                  {/* Forecast period */}
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Clock className="h-4 w-4 text-cyan-500" />
                      <span className="text-gray-500" style={{ fontSize: "0.8125rem" }}>Período de predicción</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {[7, 15, 30].map((days) => (
                        <button
                          key={days}
                          onClick={() => setForecastDays(days)}
                          className={`rounded-lg border py-2.5 transition-all ${
                            forecastDays === days
                              ? "border-cyan-500 bg-cyan-500/10 text-cyan-500"
                              : "border-gray-300 bg-white text-gray-500 hover:border-gray-400 hover:text-gray-700"
                          }`}
                          style={{ fontSize: "0.875rem", fontWeight: forecastDays === days ? 600 : 400 }}
                        >
                          {days} días
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Summary */}
                <div className="mt-6 rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-5">
                  <h4 className="text-cyan-600 mb-3" style={{ fontSize: "0.875rem", fontWeight: 600 }}>
                    Resumen de configuración
                  </h4>
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

          {/* STEP 3: Analysis */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="text-gray-900 mb-1" style={{ fontWeight: 600 }}>
                  Ejecutar análisis
                </h2>
                <p className="text-gray-400 mb-6" style={{ fontSize: "0.875rem" }}>
                  El sistema analizará los datos y generará las predicciones
                </p>

                {analysisStatus === "idle" && (
                  <div className="flex flex-col items-center gap-6 py-8">
                    <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-cyan-500/10 border border-cyan-500/20">
                      <Play className="h-9 w-9 text-cyan-500" />
                    </div>
                    <div className="text-center">
                      <p className="text-gray-900 mb-2" style={{ fontWeight: 500 }}>
                        Todo listo para el análisis
                      </p>
                      <p className="text-gray-400" style={{ fontSize: "0.8125rem" }}>
                        {files.length} archivo{files.length !== 1 ? "s" : ""} ·{" "}
                        {files.reduce((s, f) => s + (f.rows || 0), 0).toLocaleString()} registros ·{" "}
                        {forecastDays} días a predecir
                      </p>
                    </div>
                    <button
                      onClick={runAnalysis}
                      className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-8 py-3 text-white transition-all hover:bg-cyan-400 active:scale-95"
                      style={{ fontWeight: 600 }}
                    >
                      <Play className="h-4 w-4" />
                      Ejecutar análisis
                    </button>
                  </div>
                )}

                {analysisStatus === "running" && (
                  <div className="space-y-6">
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-gray-500" style={{ fontSize: "0.8125rem" }}>Progreso</span>
                        <span className="text-cyan-500" style={{ fontSize: "0.8125rem", fontWeight: 600 }}>
                          {analysisProgress}%
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                        <motion.div
                          className="h-full rounded-full bg-gradient-to-r from-cyan-600 to-cyan-400"
                          initial={{ width: "0%" }}
                          animate={{ width: `${analysisProgress}%` }}
                          transition={{ duration: 0.4 }}
                        />
                      </div>
                    </div>

                    <div className="rounded-xl bg-gray-50 border border-gray-100 p-4 font-mono space-y-1.5">
                      {analysisMessages.map((msg, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="flex items-center gap-2"
                        >
                          <span className="text-cyan-500" style={{ fontSize: "0.75rem" }}>▸</span>
                          <span className="text-gray-600" style={{ fontSize: "0.8125rem" }}>{msg}</span>
                          {i === analysisMessages.length - 1 && (
                            <span className="text-cyan-500 animate-pulse">_</span>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                {analysisStatus === "done" && (
                  <div className="flex flex-col items-center gap-4 py-6">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-500/10 border border-cyan-500/30">
                      <CheckCircle className="h-8 w-8 text-cyan-500" />
                    </div>
                    <div className="text-center">
                      <p className="text-gray-900 mb-1" style={{ fontWeight: 600 }}>¡Análisis completado!</p>
                      <p className="text-gray-400" style={{ fontSize: "0.8125rem" }}>
                        Modelos entrenados con {files.reduce((s, f) => s + (f.rows || 0), 0).toLocaleString()} registros
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-4 w-full max-w-md mt-2">
                      {[
                        { label: "Precisión", value: "94.2%", positive: true },
                        { label: "RMSE", value: "12.3", positive: true },
                        { label: "MAPE", value: "5.8%", positive: true },
                      ].map((m) => (
                        <div key={m.label} className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3 text-center">
                          <p className="text-cyan-500" style={{ fontSize: "1.25rem", fontWeight: 700 }}>{m.value}</p>
                          <p className="text-gray-500" style={{ fontSize: "0.75rem" }}>{m.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 4: Results */}
          {currentStep === 4 && (
            <div className="space-y-6">
              {/* Summary cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {resultData.summaryCards.map((card) => (
                  <div key={card.label} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                    <p className="text-gray-400 mb-2" style={{ fontSize: "0.75rem" }}>{card.label}</p>
                    <p className="text-gray-900 mb-2" style={{ fontSize: "1.375rem", fontWeight: 700 }}>{card.value}</p>
                    <div className={`flex items-center gap-1 ${card.positive ? "text-cyan-500" : "text-red-500"}`}>
                      {card.positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      <span style={{ fontSize: "0.75rem", fontWeight: 500 }}>{card.change} vs anterior</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Chart */}
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-gray-900 mb-1" style={{ fontWeight: 600 }}>
                      Demanda histórica vs predicción
                    </h3>
                    <p className="text-gray-400" style={{ fontSize: "0.8125rem" }}>
                      Período predicho: {forecastDays} días
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                      <div className="h-2 w-6 rounded-full bg-blue-500" />
                      <span className="text-gray-500" style={{ fontSize: "0.75rem" }}>Histórico</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="h-2 w-6 rounded-full bg-cyan-500" />
                      <span className="text-gray-500" style={{ fontSize: "0.75rem" }}>Predicción</span>
                    </div>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={resultData.chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: "#9ca3af", fontSize: 11 }}
                      tickLine={false}
                      axisLine={{ stroke: "#e5e7eb" }}
                      interval={6}
                    />
                    <YAxis
                      tick={{ fill: "#9ca3af", fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="historical"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={false}
                      connectNulls={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="predicted"
                      stroke="#06b6d4"
                      strokeWidth={2}
                      dot={false}
                      strokeDasharray="6 3"
                      connectNulls={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Predicted values table */}
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <h3 className="text-gray-900 mb-4" style={{ fontWeight: 600 }}>
                  Valores predichos
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100">
                        {["Producto", "Categoría", "Stock actual", "Demanda predicha", "Diferencia"].map((h) => (
                          <th key={h} className="pb-3 text-left text-gray-400" style={{ fontSize: "0.75rem", fontWeight: 500 }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {resultData.products.map((p) => {
                        const diff = p.predictedDemand - p.currentStock;
                        return (
                          <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
                            <td className="py-3 text-gray-900" style={{ fontSize: "0.8125rem", fontWeight: 500 }}>{p.name}</td>
                            <td className="py-3 text-gray-500" style={{ fontSize: "0.8125rem" }}>{p.category}</td>
                            <td className="py-3 text-gray-500" style={{ fontSize: "0.8125rem" }}>{p.currentStock} uds</td>
                            <td className="py-3 text-cyan-500" style={{ fontSize: "0.8125rem", fontWeight: 500 }}>{p.predictedDemand} uds</td>
                            <td className="py-3" style={{ fontSize: "0.8125rem" }}>
                              <span className={diff > 0 ? "text-red-500" : "text-cyan-500"}>
                                {diff > 0 ? "+" : ""}{diff} uds
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: Purchase Plan */}
          {currentStep === 5 && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <div>
                  <h2 className="text-gray-900 mb-1" style={{ fontWeight: 600 }}>
                    Plan de compras recomendado
                  </h2>
                  <p className="text-gray-400" style={{ fontSize: "0.875rem" }}>
                    Basado en la predicción para los próximos {forecastDays} días
                  </p>
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

              {/* Summary stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Total productos", value: resultData.products.length.toString(), icon: Package, color: "text-blue-500", bg: "bg-blue-500/10" },
                  { label: "Items críticos", value: resultData.products.filter(p => p.priority === "critical").length.toString(), icon: AlertCircle, color: "text-red-500", bg: "bg-red-500/10" },
                  { label: "Unidades totales", value: resultData.products.reduce((s, p) => s + p.recommendedQty, 0).toLocaleString(), icon: BarChart3, color: "text-cyan-500", bg: "bg-cyan-500/10" },
                  {
                    label: "Costo estimado",
                    value: `$${resultData.products.reduce((s, p) => s + p.recommendedQty * p.unitCost, 0).toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
                    icon: DollarSign,
                    color: "text-yellow-500",
                    bg: "bg-yellow-500/10"
                  },
                ].map((stat) => {
                  const Icon = stat.icon;
                  return (
                    <div key={stat.label} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${stat.bg} mb-3`}>
                        <Icon className={`h-4 w-4 ${stat.color}`} />
                      </div>
                      <p className="text-gray-900 mb-0.5" style={{ fontSize: "1.25rem", fontWeight: 700 }}>{stat.value}</p>
                      <p className="text-gray-400" style={{ fontSize: "0.75rem" }}>{stat.label}</p>
                    </div>
                  );
                })}
              </div>

              {/* Filter */}
              <div className="flex gap-2 flex-wrap">
                {["all", "critical", "high", "medium", "low"].map((p) => (
                  <button
                    key={p}
                    onClick={() => setFilterPriority(p)}
                    className={`rounded-lg border px-3 py-1.5 transition-all ${
                      filterPriority === p
                        ? "border-cyan-500/50 bg-cyan-500/10 text-cyan-500"
                        : "border-gray-300 bg-white text-gray-500 hover:text-gray-700"
                    }`}
                    style={{ fontSize: "0.8125rem" }}
                  >
                    {p === "all" ? "Todos" : priorityConfig[p as keyof typeof priorityConfig].label}
                  </button>
                ))}
              </div>

              {/* Purchase plan table */}
              <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50">
                        {["Producto", "Categoría", "Stock actual", "Demanda predicha", "Cant. recomendada", "Prioridad", "Costo estimado"].map((h) => (
                          <th key={h} className="px-4 py-3 text-left text-gray-400" style={{ fontSize: "0.75rem", fontWeight: 500 }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProducts.map((product) => {
                        const pConf = priorityConfig[product.priority];
                        const isCritical = product.priority === "critical";
                        return (
                          <tr
                            key={product.id}
                            className={`border-b border-gray-50 transition-colors hover:bg-gray-50 ${
                              isCritical ? "bg-red-500/[0.02]" : ""
                            }`}
                          >
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
                              <span className="text-gray-900" style={{ fontSize: "0.875rem", fontWeight: 600 }}>
                                {product.recommendedQty} uds
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 ${pConf.bg} ${pConf.border} ${pConf.color}`}
                                style={{ fontSize: "0.6875rem", fontWeight: 500 }}>
                                <span className={`h-1.5 w-1.5 rounded-full ${pConf.dot}`} />
                                {pConf.label}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-gray-500" style={{ fontSize: "0.8125rem" }}>
                              ${(product.recommendedQty * product.unitCost).toFixed(2)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="border-t border-gray-100 bg-gray-50">
                      <tr>
                        <td colSpan={6} className="px-4 py-3 text-right text-gray-500" style={{ fontSize: "0.8125rem" }}>
                          Total estimado:
                        </td>
                        <td className="px-4 py-3 text-cyan-500" style={{ fontSize: "0.9375rem", fontWeight: 700 }}>
                          ${filteredProducts.reduce((s, p) => s + p.recommendedQty * p.unitCost, 0).toFixed(2)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation buttons */}
      <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
        <button
          onClick={() => setCurrentStep((s) => Math.max(1, s - 1))}
          disabled={currentStep === 1}
          className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-gray-500 transition-all hover:border-gray-400 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed"
          style={{ fontSize: "0.875rem" }}
        >
          <ChevronLeft className="h-4 w-4" />
          Anterior
        </button>

        <span className="text-gray-400" style={{ fontSize: "0.8125rem" }}>
          Paso {currentStep} de {STEPS.length}
        </span>

        {currentStep < STEPS.length ? (
          <button
            onClick={() => setCurrentStep((s) => Math.min(STEPS.length, s + 1))}
            disabled={!canProceed()}
            className="flex items-center gap-2 rounded-xl bg-cyan-500 px-5 py-2.5 text-white transition-all hover:bg-cyan-400 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ fontSize: "0.875rem", fontWeight: 600 }}
          >
            Siguiente
            <ChevronRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            onClick={() => {
              setCurrentStep(1);
              setFiles([]);
              setAnalysisStatus("idle");
              setAnalysisProgress(0);
              setAnalysisMessages([]);
            }}
            className="flex items-center gap-2 rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-5 py-2.5 text-cyan-500 transition-all hover:bg-cyan-500/20"
            style={{ fontSize: "0.875rem", fontWeight: 600 }}
          >
            <RefreshCw className="h-4 w-4" />
            Nueva predicción
          </button>
        )}
      </div>
    </div>
  );
}
