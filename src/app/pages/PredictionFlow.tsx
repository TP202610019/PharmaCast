import { exportPurchase, priorityRank } from "../../lib/purchaseExport";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../components/ui/select";
import { usePredictionDraft } from "../hooks/usePredictionDraft";
import { PriorityFilter, AnalysisMetrics, AnalysisTabs } from "../components/AnalysisLayout";
import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router";
import {
  Upload,
  Settings,
  BarChart3,
  ShoppingCart,
  CheckCircle,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
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
  Loader2,
  BookOpen,
  Star,
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
import { datasetService } from "../../services/dataset.service";
import { mappingService, mappingFieldService } from "../../services/mapping.service";
import { predictionService } from "../../services/prediction.service";
import { dashboardService } from "../../services/dashboard.service";
import { purchasePlanService } from "../../services/purchase-plan.service";
import {
  forecastResultsToProducts,
  buildProductChartData,
  buildChartFromBackendPoints,
  extractAccuracy,
  type UIProduct,
  type ChartPoint,
} from "../../lib/transforms";
import type { PredictionResponse, PurchasePlanResponse, MappingFieldResponse } from "../../types/api";
import { ExecutionStatus } from "../../types/api";
import { extractApiErrorMessage } from "../context/AuthContext";

import "../../styles/prediction.css";

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
  high:     { label: "Alto",    color: "text-orange-500", bg: "bg-orange-500/10", border: "border-orange-500/30", dot: "bg-orange-500" },
  medium:   { label: "Medio",   color: "text-yellow-500", bg: "bg-yellow-500/10", border: "border-yellow-500/30", dot: "bg-yellow-500" },
  low:      { label: "Bajo",    color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/30", dot: "bg-blue-500" },
};

const ANALYSIS_STEPS_LABELS = [
  "Cargando y validando datos...",
  "Normalizando formato de fechas...",
  "Calculando estadísticas descriptivas...",
  "Entrenando modelo de predicción...",
  "Generando proyecciones de demanda...",
  "Calculando recomendaciones de compra...",
  "Finalizando análisis...",
];

const PIPELINE_STEPS = [
  { label: "Carga de datos",             description: "Leyendo archivos de ventas e inventario",             icon: Upload },
  { label: "Preprocesamiento",           description: "Limpiando valores atípicos y normalizando registros", icon: Settings },
  { label: "Ingeniería de variables",    description: "Extrayendo estacionalidad y tendencias",             icon: BarChart3 },
  { label: "Entrenamiento del modelo",   description: "Aprendiendo los patrones de tus ventas",          icon: Activity },
  { label: "Proyecciones de demanda",    description: "Calculando demanda futura por producto",             icon: TrendingUp },
  { label: "Plan de compras",            description: "Calculando recomendaciones de reabastecimiento",     icon: ShoppingCart },
];

const PAGE_SIZE_TABLE = 10;
const PAGE_SIZE_PLAN = 10;

/* ── Variable definitions for Step 2 mapping ── */
const FALLBACK_SALES_COLS = ["fecha_venta","nombre_producto","cant_vendida","precio_unit","categoria","tipo_prod","unidad_med","metodo_pago","pct_descuento"];
const FALLBACK_INV_COLS   = ["nombre_med","stock_actual","fecha_venc","stock_min","stock_seguridad","num_lote","costo_unit","estado_prod"];

// Field catalog is loaded dynamically from GET /api/mapping-fields.
// Each field carries fieldType: "sales" | "inventory" — no hardcoded key sets needed.

/* ── Types ── */
interface UploadedFile {
  name: string;
  size: number;
  type: "sales" | "inventory";
  rows?: number;
  uploading?: boolean;
  uploadError?: string;
  datasetId?: string;
  rawFile?: File;
}

/* ── Utilities ── */
function detectCsvDelimiter(line: string): string {
  const candidates = [",", ";", "\t"];
  let best = ",";
  let bestCount = 0;
  for (const d of candidates) {
    let count = 0;
    let inQuote = false;
    for (const c of line) {
      if (c === '"') inQuote = !inQuote;
      else if (!inQuote && c === d) count++;
    }
    if (count > bestCount) { bestCount = count; best = d; }
  }
  return best;
}

function splitCsvLine(line: string, delimiter: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuote && line[i + 1] === '"') { current += '"'; i++; }
      else inQuote = !inQuote;
    } else if (c === delimiter && !inQuote) {
      fields.push(current); current = "";
    } else {
      current += c;
    }
  }
  fields.push(current);
  return fields;
}

const parseCsvHeaders = (file: File): Promise<string[]> =>
  new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const raw = (e.target?.result as string) ?? "";
      // Strip UTF-8 BOM (U+FEFF) — FileReader.readAsText preserves it unlike TextDecoder
      const text = raw.replace(/^﻿/, "");
      const firstLine = text.split(/\r?\n/).find((l) => l.trim().length > 0) ?? "";
      if (!firstLine) { resolve([]); return; }
      const delimiter = detectCsvDelimiter(firstLine);
      const headers = splitCsvLine(firstLine, delimiter)
        .map((h) => h.trim().replace(/^"|"$/g, ""))
        .filter(Boolean);
      resolve(headers);
    };
    reader.onerror = () => resolve([]);
    reader.readAsText(file, "utf-8");
  });

/* ── Tooltip ── */
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const filtered = payload.filter((p: any) => p.value != null && p.name !== "upper" && p.name !== "lower");
    if (!filtered.length) return null;
    return (
      <div className="rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-xl" style={{ minWidth: 170 }}>
        <p className="text-gray-400 mb-2" style={{ fontSize: "0.6875rem", fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase" }}>{payload?.[0]?.payload?.date ?? label}</p>
        {filtered.map((p: any) => (
          <div key={p.name} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: p.name === "historical" ? "#007AFF" : "#007AFF" }} />
              <span className="text-gray-500" style={{ fontSize: "0.75rem" }}>
                {p.name === "historical" ? "Histórico" : "Predicción"}
              </span>
            </div>
            <span style={{ color: p.name === "historical" ? "#007AFF" : "#007AFF", fontSize: "0.875rem", fontWeight: 700 }}>
              {Number(p.value).toLocaleString("es-PE", { maximumFractionDigits: 2 })} uds
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

  // Build page list with ellipsis: always show first, last, current ±1
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
              className={`${btnBase} ${p === page ? "border-blue-500 bg-blue-500 text-white" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}
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

/* ── Main Component ── */
export function PredictionFlow() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const salesInputRef = useRef<HTMLInputElement>(null);
  const inventoryInputRef = useRef<HTMLInputElement>(null);

  /* ── Step / UI state ── */
  const [currentStep, setCurrentStep] = usePredictionDraft("currentStep", 1);
  const [files, setFiles] = usePredictionDraft<UploadedFile[]>("files", []);
  const [isDragOver, setIsDragOver] = useState(false);
  const [forecastDays, setForecastDays] = usePredictionDraft("forecastDays", 30);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisStatus, setAnalysisStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [completedStepIdx, setCompletedStepIdx] = useState(-1);
  const [filterPriority, setFilterPriority] = useState<string>("all");

  /* ── Step 2 variable mapping ── */
  const [mappingTab, setMappingTab] = useState<"sales" | "inventory">("sales");
  const [salesMapping, setSalesMapping] = usePredictionDraft<Record<string, string>>("salesMapping", {});
  const [inventoryMapping, setInventoryMapping] = usePredictionDraft<Record<string, string>>("inventoryMapping", {});
  const [detectedSalesCols, setDetectedSalesCols] = usePredictionDraft<string[]>("detectedSalesCols", []);
  const [detectedInvCols, setDetectedInvCols] = usePredictionDraft<string[]>("detectedInvCols", []);

  /* ── Field catalog (loaded once from API) ── */
  const [fieldCatalog, setFieldCatalog] = useState<MappingFieldResponse[]>([]);
  const [fieldCatalogLoading, setFieldCatalogLoading] = useState(false);

  /* ── Saved mapping configurations ── */
  const [savedMappings, setSavedMappings] = useState<import("../../types/api").MappingConfigResponse[]>([]);
  const [savedMappingsLoading, setSavedMappingsLoading] = useState(false);
  const [appliedMappingId, setAppliedMappingId] = usePredictionDraft<string | null>("appliedMappingId", null);
  const [mappingName, setMappingName] = usePredictionDraft("mappingName", "");
  const [saveAsDefault, setSaveAsDefault] = usePredictionDraft("saveAsDefault", false);

  /* ── Step 4 UI state ── */
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [showConfidence, setShowConfidence] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarSearch, setSidebarSearch] = useState("");
  const [resultsTablePage, setResultsTablePage] = useState(1);
  const [resultsSearch, setResultsSearch] = useState("");
  const [planTablePage, setPlanTablePage] = useState(1);
  const [planSearch, setPlanSearch] = useState("");


  /* ── API state ── */
  const [primaryDatasetId, setPrimaryDatasetId] = usePredictionDraft<string | null>("primaryDatasetId", null);
  const [prediction, setPrediction] = usePredictionDraft<PredictionResponse | null>("prediction", null);
  const [purchasePlan, setPurchasePlan] = usePredictionDraft<PurchasePlanResponse | null>("purchasePlan", null);
  const [uploadError, setUploadError] = useState<string>("");
  const [analysisError, setAnalysisError] = useState<string>("");
  const [savingPlan, setSavingPlan] = useState(false);

  /* ── Derived product list ── */
  const products = useMemo<UIProduct[]>(() => {
    if (prediction) {
      return forecastResultsToProducts(prediction.forecastResults, purchasePlan?.items ?? [], prediction.productMetrics ?? prediction.metrics);
    }
    return [];
  }, [prediction, purchasePlan]);

  const accuracy = useMemo(() => {
    const overall = prediction?.metrics.find((m) =>
      (m.scope === "Overall" || (m.scope == null && m.productName == null)) &&
      (m.method == null || m.method === "XGBoost"));
    return overall?.volumeAccuracy != null && Number.isFinite(overall.volumeAccuracy)
      ? extractAccuracy(prediction!.metrics) : null;
  }, [prediction]);
  const totalUnits = useMemo(() => products.reduce((s, p) => s + p.totalPredicted, 0), [products]);

  /* ── Init selected product when products load ── */
  useEffect(() => {
    if (products.length > 0 && !selectedProductId) {
      setSelectedProductId(products[0].id);
    }
  }, [products, selectedProductId]);

  /* ── Auto-advance to step 4 after analysis completes ── */
  useEffect(() => {
    if (currentStep === 3 && analysisStatus === "done") {
      const timer = setTimeout(() => setCurrentStep(4), 4500);
      return () => clearTimeout(timer);
    }
  }, [currentStep, analysisStatus]);

  /* ── Purchase plan generation is intentionally skipped in forecast-only mode ──
   * No inventory data exists yet (sales dataset only), so POST /api/purchase-plans
   * must not be called automatically. Step 5 derives its table from forecastResults
   * already held in `prediction` — no DB round-trip needed.
   * Wire purchasePlanService.generate() here only when inventory data is uploaded. ── */

  /* ── Load field catalog + saved mappings when entering step 2 ── */
  useEffect(() => {
    if (currentStep === 2) {
      if (fieldCatalog.length === 0) {
        setFieldCatalogLoading(true);
        mappingFieldService.getAll()
          .then(setFieldCatalog)
          .catch(() => {})
          .finally(() => setFieldCatalogLoading(false));
      }
      setSavedMappingsLoading(true);
      mappingService.getAll()
        .then(setSavedMappings)
        .catch(() => {})
        .finally(() => setSavedMappingsLoading(false));
    }
  }, [currentStep]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── File upload handler ── */
  const uploadFile = useCallback(
    async (file: File, type: "sales" | "inventory") => {
      console.log("[PredictionFlow] uploadFile() — name:", file.name, "type:", type, "size:", file.size);

      // Reset detected columns immediately so Step 2 never shows headers from a previous file
      if (type === "sales") {
        setDetectedSalesCols([]);
        // Also clear any previously applied mapping because column names may differ in the new file
        setAppliedMappingId(null);
        setSalesMapping({});
        setMappingName("");
      } else {
        setDetectedInvCols([]);
        setInventoryMapping({});
      }

      const tempEntry: UploadedFile = { name: file.name, size: file.size, type, uploading: true, rawFile: file };
      setFiles((prev) => [...prev.filter((f) => f.type !== type), tempEntry]);

      // Parse CSV headers client-side (fast, no round-trip; always replace, even if empty)
      const lcName = file.name.toLowerCase();
      if (lcName.endsWith(".csv")) {
        const cols = await parseCsvHeaders(file);
        console.log("[PredictionFlow] CSV headers parsed client-side:", cols);
        if (type === "sales") setDetectedSalesCols(cols);
        else setDetectedInvCols(cols);
      }

      try {
        console.log("[PredictionFlow] POST /api/datasets/upload — sending file to backend...");
        const dataset = await datasetService.upload(file);
        console.log("[PredictionFlow] Upload response — datasetId:", dataset.id, "rowsCount:", dataset.rowsCount, "stage:", dataset.datasetStage);
        setFiles((prev) =>
          prev.map((f) =>
            f.name === file.name
              ? { ...f, uploading: false, rows: dataset.rowsCount ?? undefined, datasetId: dataset.id }
              : f
          )
        );
        // Always update primaryDatasetId for sales uploads — replacing a file must update the reference
        if (type === "sales") {
          setPrimaryDatasetId(dataset.id);
        }
        setUploadError("");

        // For Excel/XLS files fetch headers from the backend after the file is stored
        // (the backend guarantees dataset.id maps to the file just uploaded — unique GUID path)
        if (!lcName.endsWith(".csv")) {
          try {
            console.log("[PredictionFlow] GET /api/datasets/" + dataset.id + "/headers — extracting Excel headers...");
            const headers = await datasetService.getHeaders(dataset.id);
            console.log("[PredictionFlow] Excel headers from backend:", headers);
            // Always set (even if empty) so stale state is never left behind
            if (type === "sales") setDetectedSalesCols(headers);
            else setDetectedInvCols(headers);
          } catch {
            console.warn("[PredictionFlow] getHeaders() failed — Step 2 will show fallback column suggestions");
          }
        }
      } catch (err) {
        const msg = extractApiErrorMessage(err, "Error al cargar el archivo.");
        setFiles((prev) =>
          prev.map((f) =>
            f.name === file.name ? { ...f, uploading: false, uploadError: msg } : f
          )
        );
        setUploadError(msg);
      }
    },
    [] // no closure deps — all setters are stable references from useState
  );

  const detectFileType = (name: string, index: number): "sales" | "inventory" => {
    const n = name.toLowerCase();
    if (n.includes("venta") || n.includes("sale") || n.includes("ticket") || n.includes("transac")) return "sales";
    if (n.includes("inventario") || n.includes("inventory") || n.includes("stock") || n.includes("inv_")) return "inventory";
    return index === 0 ? "sales" : "inventory";
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const droppedFiles = Array.from(e.dataTransfer.files).filter((f) => {
        const n = f.name.toLowerCase();
        return n.endsWith(".csv") || n.endsWith(".xlsx") || n.endsWith(".xls");
      });
      droppedFiles.forEach((file, i) => {
        uploadFile(file, detectFileType(file.name, i));
      });
    },
    [uploadFile]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = Array.from(e.target.files ?? []);
      selected.forEach((file, i) => {
        uploadFile(file, detectFileType(file.name, i));
      });
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [uploadFile]
  );

  const addDemoFile = (type: "sales" | "inventory") => {
    const name = type === "sales" ? "ventas_abril_2026.csv" : "inventario_mayo_2026.xlsx";
    setFiles((prev) => [
      ...prev.filter((f) => f.type !== type),
      { name, size: 45230, type, rows: type === "sales" ? 487 : 312 },
    ]);
    if (type === "sales") {
      setDetectedSalesCols(FALLBACK_SALES_COLS);
      // Demo files have no backend ID — clear any real primaryDatasetId so the flow uses demo mode
      setPrimaryDatasetId(null);
      setAppliedMappingId(null);
      setSalesMapping({});
    } else {
      setDetectedInvCols(FALLBACK_INV_COLS);
      setInventoryMapping({});
    }
  };

  const removeFile = (name: string) => {
    const f = files.find((x) => x.name === name);
    setFiles((prev) => prev.filter((x) => x.name !== name));
    if (f?.type === "sales") {
      if (f.datasetId === primaryDatasetId) setPrimaryDatasetId(null);
      setDetectedSalesCols([]);
      setAppliedMappingId(null);
      setSalesMapping({});
    } else if (f?.type === "inventory") {
      setDetectedInvCols([]);
      setInventoryMapping({});
    }
  };

  /* ── Run analysis ── */
  const runAnalysis = useCallback(async () => {
    setAnalysisStatus("running");
    setAnalysisProgress(0);
    setCompletedStepIdx(-1);
    setAnalysisError("");

    const total = PIPELINE_STEPS.length;

    if (primaryDatasetId) {
      // Real API mode — animate steps gradually while waiting
      let animIdx = 0;
      const animInterval = setInterval(() => {
        if (animIdx < total - 1) {
          setCompletedStepIdx(animIdx - 1);
          setAnalysisProgress(Math.round(((animIdx + 1) / total) * 88));
          animIdx++;
        }
      }, 1200);

      try {
        // Resolve or create mapping config before triggering prediction
        let resolvedMappingId: string | undefined = appliedMappingId ?? undefined;

        const requiredCatalogFields = fieldCatalog.filter(
          (f) => f.isRequired && f.fieldType === "sales"
        );
        const hasSalesMapping = files.some((f) => f.type === "sales") &&
          requiredCatalogFields.every((f) => salesMapping[f.fieldKey]);

        if (hasSalesMapping && !resolvedMappingId) {
          // Fetch the latest saved mappings so matching is never stale
          const latestMappings = await mappingService.getAll();
          setSavedMappings(latestMappings);

          // Build field entries from current salesMapping
          const fieldEntries = Object.entries(salesMapping)
            .filter(([, col]) => col)
            .map(([fieldKey, datasetColumnName]) => ({ fieldKey, datasetColumnName }));

          // Reuse an existing mapping when the field configuration already matches
          const columnMatch = latestMappings.find(
            (m) =>
              m.fields.length === fieldEntries.length &&
              fieldEntries.every((entry) => {
                const f = m.fields.find((x) => x.fieldKey === entry.fieldKey);
                return f?.datasetColumnName === entry.datasetColumnName;
              })
          );

          if (columnMatch) {
            resolvedMappingId = columnMatch.id;
          } else {
            const autoName = mappingName.trim() ||
              `pharmacast-${new Date().toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" })}-${Date.now().toString(36)}`;
            const created = await mappingService.create({
              configurationName: autoName,
              isDefault: saveAsDefault,
              fields: fieldEntries,
            });
            resolvedMappingId = created.id;
          }
        }

        console.log("[PredictionFlow] POST /api/predicciones/nuevas — executing prediction, datasetId:", primaryDatasetId, "forecastDays:", forecastDays, "mappingId:", resolvedMappingId);
        const result = await predictionService.execute(primaryDatasetId, forecastDays, resolvedMappingId);

        clearInterval(animInterval);

        if (result.executionStatus === ExecutionStatus.Failed) {
          setAnalysisError(result.errorMessage ?? "La predicción falló. Verifica tu archivo e intenta de nuevo.");
          setAnalysisStatus("error");
          return;
        }

        setPrediction(result);
        // Present the confirmed completed stages before the result summary.
        for (let stage = Math.max(0, animIdx); stage < total; stage++) {
          setCompletedStepIdx(stage);
          setAnalysisProgress(Math.round(((stage + 1) / total) * 100));
          await new Promise(resolve => window.setTimeout(resolve, 350));
        }
        setAnalysisStatus("done");
      } catch (err) {
        clearInterval(animInterval);
        setAnalysisError(extractApiErrorMessage(err, "Error al ejecutar la predicción."));
        setAnalysisStatus("error");
      }
    } else {
      // Demo mode — mock timer
      let idx = 0;
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
    }
  }, [primaryDatasetId, forecastDays, files, salesMapping, appliedMappingId, mappingName, saveAsDefault, fieldCatalog]);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const canProceed = () => {
    if (currentStep === 1) return files.length >= 1 && !files.some((f) => f.uploading);
    if (currentStep === 2) {
      const hasSales = files.some((f) => f.type === "sales");
      const salesRequiredFields = fieldCatalog.filter((f) => f.fieldType === "sales" && f.isRequired);
      if (hasSales && salesRequiredFields.length > 0 && !salesRequiredFields.every((f) => salesMapping[f.fieldKey])) return false;
      return true;
    }
    return true;
  };

  const today = new Date().toLocaleDateString("es-ES", {
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

  /* ── Step 4 derived data ── */
  const selectedProduct = useMemo(
    () => products.find((p) => p.id === selectedProductId) ?? products[0],
    [products, selectedProductId]
  );

  const [productChartData, setProductChartData] = useState<ChartPoint[]>([]);
  useEffect(() => {
    let active = true;
    setProductChartData(prediction && selectedProduct
      ? buildProductChartData(selectedProduct.name, prediction.forecastResults, forecastDays) : []);
    if (prediction && selectedProduct) {
      dashboardService.getChart(prediction.id, selectedProduct.name)
        .then((response) => {
          if (active) setProductChartData(buildChartFromBackendPoints(response.points, forecastDays, response.historicalPoints));
        })
        .catch((error) => console.error("No se pudo cargar el histórico diario", error));
    }
    return () => { active = false; };
  }, [prediction, selectedProduct, forecastDays]);

  const bridgeDateLabel = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.toLocaleDateString("es-ES", { month: "short", day: "numeric" });
  }, []);

  const tableData = useMemo(() =>
    products.map((p) => ({
      ...p,
      avgHistorical: p.historicalAvg,
      variation: prediction?.productSummaries?.find((s) => s.productName === p.name)?.variationPercent ?? null,
    })),
    [products, prediction]
  );

  const sidebarProducts = useMemo(() =>
    products.filter((p) =>
      sidebarSearch === "" ||
      p.name.toLowerCase().includes(sidebarSearch.toLowerCase()) ||
      p.category.toLowerCase().includes(sidebarSearch.toLowerCase())
    ),
    [products, sidebarSearch]
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

  const filteredPlanProducts = useMemo(() =>
    [...products].sort((a,b)=>priorityRank[a.priority]-priorityRank[b.priority]).filter(p=>filterPriority === "all" || p.priority === filterPriority),
    [products, filterPriority]
  );

  const searchedPlanProducts = useMemo(() =>
    filteredPlanProducts.filter((p) =>
      planSearch === "" ||
      p.name.toLowerCase().includes(planSearch.toLowerCase()) ||
      p.category.toLowerCase().includes(planSearch.toLowerCase())
    ),
    [filteredPlanProducts, planSearch]
  );

  const paginatedPlanProducts = searchedPlanProducts.slice(
    (planTablePage - 1) * PAGE_SIZE_PLAN,
    planTablePage * PAGE_SIZE_PLAN
  );

  return (
    <div className="prediction-page">
      <header className="prediction-heading">
        <div><h1>Nueva predicción</h1><p>De tus ventas a tu próximo plan de compras.</p></div>
        <span className="prediction-current"><span>{String(currentStep).padStart(2,"0")}</span> / 05</span>
      </header>
      <nav className="prediction-steps" aria-label="Etapas de la predicción">
        {STEPS.map(step => {
          const Icon = step.icon;
          const completed = currentStep > step.id;
          const active = currentStep === step.id;
          return <button type="button" key={step.id} aria-label={`Paso ${step.id}: ${step.label}`} className={`prediction-step ${active ? "is-current" : ""} ${completed ? "is-complete" : ""}`} aria-current={active ? "step" : undefined} disabled={(!completed && !active) || (!!prediction && step.id < 4)} onClick={() => {if(completed && (!prediction || step.id >= 4)) setCurrentStep(step.id)}}>
            <span className="prediction-step-icon">{completed ? <CheckCircle size={17}/> : <Icon size={17}/>}</span><span className="prediction-step-copy"><small>0{step.id}</small><strong>{step.label}</strong></span>
          </button>;
        })}
      </nav>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        <motion.div
          className={`prediction-content prediction-stage-${currentStep}`}
          key={currentStep}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          transition={{ duration: 0.25 }}
        >

          {/* ── STEP 1: UPLOAD ── */}
          {currentStep === 1 && (
            <div className="space-y-6">
              {/* Hidden file inputs — one per type */}
              <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" multiple className="hidden" onChange={handleFileInput} />
              <input ref={salesInputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f, "sales"); e.target.value = ""; }} />
              <input ref={inventoryInputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f, "inventory"); e.target.value = ""; }} />

              <div className="prediction-card rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="text-gray-900 mb-1" style={{ fontWeight: 600 }}>Carga de archivos</h2>
                <p className="text-gray-400 mb-5" style={{ fontSize: "0.875rem" }}>
                  Sube tus archivos en formato CSV o Excel. Ventas es obligatorio; inventario es opcional.
                </p>

                {/* Two-column upload zones */}
                <div className="prediction-upload-grid grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Sales zone */}
                  {(() => {
                    const salesFile = files.find(f => f.type === "sales");
                    return (
                      <div
                        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                        onDragLeave={() => setIsDragOver(false)}
                        onDrop={(e) => { e.preventDefault(); setIsDragOver(false); const f = e.dataTransfer.files[0]; if (f) uploadFile(f, "sales"); }}
                        className={`prediction-dropzone rounded-xl border-2 border-dashed p-5 transition-all ${salesFile ? "border-blue-500/40 bg-blue-500/5" : isDragOver ? "border-blue-500 bg-blue-500/5" : "border-gray-200 hover:border-blue-500/40"}`}
                      >
                        <div className="flex flex-col items-center gap-3 text-center">
                          <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${salesFile ? "bg-blue-500/10 border-blue-500/20" : "bg-gray-100 border-gray-200"}`}>
                            {salesFile ? <CheckCircle className="h-5 w-5 text-blue-500" /> : <Upload className="h-5 w-5 text-gray-400" />}
                          </div>
                          <div>
                            <p className="text-gray-900" style={{ fontWeight: 600, fontSize: "0.875rem" }}>Datos de ventas <span className="text-red-400">*</span></p>
                            {salesFile ? (
                              <p className="text-blue-600 mt-0.5 truncate max-w-[160px]" style={{ fontSize: "0.75rem", fontWeight: 500 }}>{salesFile.name}</p>
                            ) : (
                              <p className="text-gray-400 mt-0.5" style={{ fontSize: "0.75rem" }}>Historial de ventas (CSV/Excel)</p>
                            )}
                          </div>
                          <div className="flex gap-2 flex-wrap justify-center">
                            <button onClick={() => salesInputRef.current?.click()}
                              className="rounded-lg border border-blue-500/40 bg-blue-500/10 px-3 py-1.5 text-blue-600 hover:bg-blue-500/20 transition-all"
                              style={{ fontSize: "0.75rem", fontWeight: 500 }}>
                              {salesFile ? "Cambiar" : "+ Seleccionar"}
                            </button>
                            {salesFile && (
                              <button onClick={() => removeFile(salesFile.name)}
                                className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-red-400 hover:bg-red-100 transition-all"
                                style={{ fontSize: "0.75rem" }}>
                                Quitar
                              </button>
                            )}
                          </div>
                          {salesFile && (
                            <p className="text-gray-400" style={{ fontSize: "0.7rem" }}>
                              {formatSize(salesFile.size)}{salesFile.rows != null && ` · ${salesFile.rows.toLocaleString()} filas`}
                              {salesFile.uploading && " · Subiendo…"}{salesFile.datasetId && " · ✓ Subido"}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Inventory zone */}
                  {(() => {
                    const invFile = files.find(f => f.type === "inventory");
                    return (
                      <div
                        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                        onDragLeave={() => setIsDragOver(false)}
                        onDrop={(e) => { e.preventDefault(); setIsDragOver(false); const f = e.dataTransfer.files[0]; if (f) uploadFile(f, "inventory"); }}
                        className={`prediction-dropzone rounded-xl border-2 border-dashed p-5 transition-all ${invFile ? "border-blue-500/40 bg-blue-500/5" : isDragOver ? "border-blue-500/40 bg-blue-500/5" : "border-gray-200 hover:border-blue-500/30"}`}
                      >
                        <div className="flex flex-col items-center gap-3 text-center">
                          <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${invFile ? "bg-blue-500/10 border-blue-500/20" : "bg-gray-100 border-gray-200"}`}>
                            {invFile ? <CheckCircle className="h-5 w-5 text-blue-500" /> : <Package className="h-5 w-5 text-gray-400" />}
                          </div>
                          <div>
                            <p className="text-gray-900" style={{ fontWeight: 600, fontSize: "0.875rem" }}>Registro de inventario <span className="text-gray-400" style={{ fontWeight: 400, fontSize: "0.75rem" }}>(opcional)</span></p>
                            {invFile ? (
                              <p className="text-blue-600 mt-0.5 truncate max-w-[160px]" style={{ fontSize: "0.75rem", fontWeight: 500 }}>{invFile.name}</p>
                            ) : (
                              <p className="text-gray-400 mt-0.5" style={{ fontSize: "0.75rem" }}>Stock actual por producto</p>
                            )}
                          </div>
                          <div className="flex gap-2 flex-wrap justify-center">
                            <button onClick={() => inventoryInputRef.current?.click()}
                              className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-1.5 text-blue-600 hover:bg-blue-500/20 transition-all"
                              style={{ fontSize: "0.75rem", fontWeight: 500 }}>
                              {invFile ? "Cambiar" : "+ Seleccionar"}
                            </button>
                            {invFile && (
                              <button onClick={() => removeFile(invFile.name)}
                                className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-red-400 hover:bg-red-100 transition-all"
                                style={{ fontSize: "0.75rem" }}>
                                Quitar
                              </button>
                            )}
                          </div>
                          {invFile && (
                            <p className="text-gray-400" style={{ fontSize: "0.7rem" }}>
                              {formatSize(invFile.size)}{invFile.rows != null && ` · ${invFile.rows.toLocaleString()} filas`}
                              {invFile.uploading && " · Subiendo…"}{invFile.datasetId && " · ✓ Subido"}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {uploadError && (
                  <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                    <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                    <p className="text-red-600" style={{ fontSize: "0.8125rem" }}>{uploadError}</p>
                  </div>
                )}
              </div>

              {/* Scenario banner */}
              {files.length > 0 && (
                <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 flex gap-3">
                  <CheckCircle className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-blue-700" style={{ fontSize: "0.8125rem", fontWeight: 500 }}>
                      {files.some(f => f.type === "inventory")
                        ? "Escenario: predicción con control de stock"
                        : "Escenario básico: predicción de demanda"}
                    </p>
                  </div>
                </div>
              )}

              {files.length === 0 && (
                <div className="prediction-upload-hint rounded-xl border border-gray-200 bg-white p-4 flex gap-3">
                  <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />
                  <p className="text-yellow-600" style={{ fontSize: "0.8125rem" }}>Carga tu historial de ventas para comenzar. Puedes añadir el inventario si quieres incluir el stock en la planificación.</p>
                </div>
              )}
            </div>
          )}

          {/* ── STEP 2: CONFIGURATION / MAPPING ── */}
          {currentStep === 2 && (() => {
            const hasSales = files.some((f) => f.type === "sales");
            const hasInventory = files.some((f) => f.type === "inventory");
            const salesCols = detectedSalesCols.length ? detectedSalesCols : hasSales ? FALLBACK_SALES_COLS : [];
            const invCols = detectedInvCols.length ? detectedInvCols : hasInventory ? FALLBACK_INV_COLS : [];
            const activeMapping = mappingTab === "sales" ? salesMapping : inventoryMapping;
            const setActiveMapping = mappingTab === "sales" ? setSalesMapping : setInventoryMapping;
            const salesCatalogFields = fieldCatalog.filter((f) => f.fieldType === "sales");
            const invCatalogFields   = fieldCatalog.filter((f) => f.fieldType === "inventory");
            const activeReqVars = (mappingTab === "sales" ? salesCatalogFields : invCatalogFields).filter((f) => f.isRequired).map((f) => ({ key: f.fieldKey, label: f.displayName, desc: "" }));
            const activeOptVars = (mappingTab === "sales" ? salesCatalogFields : invCatalogFields).filter((f) => !f.isRequired).map((f) => ({ key: f.fieldKey, label: f.displayName, desc: "" }));
            const activeCols = mappingTab === "sales" ? salesCols : invCols;
            const hasActiveFile = mappingTab === "sales" ? hasSales : hasInventory;
            const salesReqFields = salesCatalogFields.filter((f) => f.isRequired);
            const salesReqDone = salesReqFields.filter((f) => salesMapping[f.fieldKey]).length;
            const invReqFields = invCatalogFields.filter((f) => f.isRequired);
            const invReqDone = invReqFields.filter((f) => inventoryMapping[f.fieldKey]).length;

            return (
              <div className="space-y-5">
                {/* Config card */}
                <div className="prediction-config prediction-card rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                  <h2 className="text-gray-900 mb-4" style={{ fontWeight: 600 }}>Configuración del análisis</h2>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="h-4 w-4 text-blue-500" />
                        <span className="text-gray-500" style={{ fontSize: "0.8125rem" }}>Fecha actual del sistema</span>
                      </div>
                      <p className="text-gray-900" style={{ fontWeight: 500 }}>{today}</p>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="h-4 w-4 text-blue-500" />
                        <span className="text-gray-500" style={{ fontSize: "0.8125rem" }}>Período de predicción</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { days: 30, label: "30 días", hint: "1 mes" },
                          { days: 60, label: "60 días", hint: "2 meses" },
                          { days: 90, label: "90 días", hint: "3 meses" },
                        ].map(({ days, label, hint }) => (
                          <button key={days} onClick={() => setForecastDays(days)}
                            className={`rounded-lg border py-2 px-1 transition-all flex flex-col items-center ${forecastDays === days ? "border-blue-500 bg-blue-500/10 text-blue-500" : "border-gray-300 bg-white text-gray-500 hover:border-gray-400"}`}>
                            <span style={{ fontSize: "0.875rem", fontWeight: forecastDays === days ? 600 : 400 }}>{label}</span>
                            <span style={{ fontSize: "0.6875rem", opacity: 0.7 }}>{hint}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Variable mapping card */}
                <div className="prediction-variables prediction-card rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                  <div className="px-6 pt-5 pb-4 border-b border-gray-100">
                    <h2 className="text-gray-900 mb-1" style={{ fontWeight: 600 }}>Identificar variables del dataset</h2>
                    <p className="text-gray-400" style={{ fontSize: "0.8125rem" }}>
                      Indica a qué columna de tu archivo corresponde cada variable que requiere el sistema
                    </p>
                  </div>

                  {/* Saved mapping selector */}
                  <div className="prediction-saved-config px-6 pt-4 pb-3 border-b border-gray-100">
                    <div className="flex items-center gap-2 mb-2">
                      <BookOpen className="h-3.5 w-3.5 text-blue-500" />
                      <span className="text-gray-700" style={{ fontSize: "0.8125rem", fontWeight: 600 }}>Configuración guardada</span>
                      {savedMappingsLoading && <Loader2 className="h-3 w-3 animate-spin text-gray-400" />}
                    </div>
                    {savedMappings.length > 0 ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <Select value={appliedMappingId ?? "new"} onValueChange={(value) => {
                            const id = value === "new" ? "" : value;
                            setAppliedMappingId(id || null);
                            if (id) {
                              const cfg = savedMappings.find((m) => m.id === id);
                              if (cfg) {
                                const newMapping: Record<string, string> = {};
                                cfg.fields.forEach((f) => { newMapping[f.fieldKey] = f.datasetColumnName; });
                                setSalesMapping(newMapping);
                              }
                            }
                          }}>
                          <SelectTrigger className="pc-config-select" aria-label="Configuración guardada"><SelectValue placeholder="Nueva configuración" /></SelectTrigger>
                          <SelectContent className="pc-select-menu" position="popper" align="start">
                            <SelectItem value="new">Nueva configuración</SelectItem>
                            {savedMappings.map(m => <SelectItem key={m.id} value={m.id}>{m.isDefault ? "★ " : ""}{m.configurationName}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        {appliedMappingId && (
                          <button
                            onClick={() => { setAppliedMappingId(null); setSalesMapping({}); }}
                            className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-gray-500 hover:text-red-500 hover:border-red-200 transition-all"
                            style={{ fontSize: "0.75rem" }}
                          >
                            <X className="h-3 w-3" /> Limpiar
                          </button>
                        )}
                      </div>
                    ) : !savedMappingsLoading ? (
                      <p className="text-gray-400" style={{ fontSize: "0.75rem" }}>
                        No hay configuraciones guardadas aún. El mapeo que definas se guardará automáticamente.
                      </p>
                    ) : null}

                    {/* Name + default options when creating a new mapping */}
                    {!appliedMappingId && (
                      <div className="prediction-mapping-options flex items-center gap-3">
                        <input
                          type="text"
                          placeholder="Nombre de la configuración (opcional)"
                          value={mappingName}
                          onChange={(e) => setMappingName(e.target.value)}
                          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-gray-700 placeholder:text-gray-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
                          style={{ fontSize: "0.8125rem", minWidth: 240 }}
                        />
                        <label className="flex items-center gap-1.5 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={saveAsDefault}
                            onChange={(e) => setSaveAsDefault(e.target.checked)}
                            className="h-3.5 w-3.5 rounded accent-blue-500 cursor-pointer"
                          />
                          <Star className="h-3 w-3 text-blue-500" />
                          <span className="text-gray-600" style={{ fontSize: "0.75rem" }}>Guardar como predeterminada</span>
                        </label>
                      </div>
                    )}
                  </div>

                  <div className="px-6 pt-4">
                    <div className="prediction-source-tabs flex gap-1 p-1 w-fit">
                      {[
                        { id: "sales",     label: "Registro de ventas",    icon: ShoppingCart,  done: salesReqDone, total: salesReqFields.length, hasFile: hasSales },
                        { id: "inventory", label: "Inventario",            icon: Package,       done: invReqDone,   total: invReqFields.length,   hasFile: hasInventory },
                      ].map((tab) => {
                        const Icon = tab.icon;
                        const active = mappingTab === tab.id;
                        const allDone = tab.done === tab.total && tab.hasFile;
                        return (
                          <button key={tab.id} onClick={() => setMappingTab(tab.id as any)}
                            className={`flex items-center gap-2 rounded-lg px-4 py-2 transition-all ${active ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                            style={{ fontSize: "0.8125rem", fontWeight: active ? 600 : 400 }}>
                            <Icon className="h-3.5 w-3.5" />
                            {tab.label}
                            {tab.hasFile ? (
                              <span className={`rounded-full px-1.5 py-0.5 ${allDone ? "bg-blue-500/15 text-blue-600" : "bg-orange-100 text-orange-600"}`}
                                style={{ fontSize: "0.6875rem", fontWeight: 700 }}>
                                {tab.done}/{tab.total}
                              </span>
                            ) : (
                              <span className="rounded-full bg-gray-200 px-1.5 py-0.5 text-gray-400" style={{ fontSize: "0.6875rem" }}>Sin archivo</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="px-6 py-5">
                    {!hasActiveFile ? (
                      <div className="flex flex-col items-center gap-3 py-10 text-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50">
                        {mappingTab === "sales" ? <ShoppingCart className="h-8 w-8 text-gray-300" /> : <Package className="h-8 w-8 text-gray-300" />}
                        <div>
                          <p className="text-gray-500" style={{ fontWeight: 500 }}>No se cargó un archivo de {mappingTab === "sales" ? "ventas" : "inventario"}</p>
                          <p className="text-gray-400 mt-0.5" style={{ fontSize: "0.8125rem" }}>Vuelve al paso 1 para agregar el archivo o continúa sin él</p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-5">
                        <div>
                          <p className="text-gray-700 mb-2 flex items-center gap-2" style={{ fontFamily: "inherit", fontSize: "0.8125rem", fontWeight: 600, letterSpacing: 0 }}>Columnas detectadas en el archivo</p>
                          <div className="flex flex-wrap gap-2">
                            {activeCols.map((col) => {
                              const isMapped = Object.values(activeMapping).includes(col);
                              return (
                                <span key={col} className={`rounded-lg border px-2.5 py-1 transition-all ${isMapped ? "border-blue-500/40 bg-blue-500/10 text-blue-700" : "border-gray-200 bg-gray-50 text-gray-500"}`}
                                  style={{ fontSize: "0.75rem", fontWeight: isMapped ? 600 : 400 }}>
                                  {isMapped && <span className="mr-1">✓</span>}{col}
                                </span>
                              );
                            })}
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <span className="h-2 w-2 rounded-full bg-red-500" />
                            <p className="text-gray-700" style={{ fontSize: "0.8125rem", fontWeight: 600 }}>Variables requeridas</p>
                            <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-red-500" style={{ fontSize: "0.6875rem", fontWeight: 600 }}>
                              {activeReqVars.filter((v) => activeMapping[v.key]).length}/{activeReqVars.length} asignadas
                            </span>
                          </div>
                          <div className="space-y-2">
                            {activeReqVars.map((v) => {
                              const val = activeMapping[v.key] ?? "";
                              const isMapped = !!val;
                              return (
                                <div key={v.key} className={`prediction-mapping-row flex items-center gap-3 rounded-xl border px-4 py-3 transition-all ${isMapped ? "border-blue-500/25 bg-blue-500/5" : "border-gray-200 bg-white"}`}>
                                  <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-all ${isMapped ? "border-blue-500 bg-blue-500" : "border-gray-300 bg-white"}`}>
                                    {isMapped
                                      ? <CheckCircle className="h-3.5 w-3.5 text-white" />
                                      : <span className="text-red-400" style={{ fontSize: "0.6875rem", fontWeight: 700 }}>!</span>}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-gray-900" style={{ fontSize: "0.8125rem", fontWeight: 500 }}>
                                      {v.label} <span className="text-red-400">*</span>
                                    </p>
                                    <p className="text-gray-400" style={{ fontSize: "0.6875rem" }}>{v.desc}</p>
                                  </div>
                                  <div className="relative shrink-0" style={{ minWidth: 185 }}>
                                    <Select value={val || "unassigned"} onValueChange={(value) => setActiveMapping((mapping) => ({ ...mapping, [v.key]: value === "unassigned" ? "" : value }))}>
                                      <SelectTrigger aria-label={v.label} className="pc-column-select"><SelectValue /></SelectTrigger>
                                      <SelectContent className="pc-select-menu" position="popper" align="start">
                                        <SelectItem value="unassigned">Seleccionar columna…</SelectItem>
                                        {activeCols.map(col => <SelectItem key={col} value={col}>{col}</SelectItem>)}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <span className="h-2 w-2 rounded-full bg-blue-500" />
                            <p className="text-gray-700" style={{ fontSize: "0.8125rem", fontWeight: 600 }}>Variables opcionales</p>
                            <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-blue-600" style={{ fontSize: "0.6875rem", fontWeight: 600 }}>Mejoran la precisión</span>
                          </div>
                          <div className="space-y-2">
                            {activeOptVars.map((v) => {
                              const val = activeMapping[v.key] ?? "";
                              const isMapped = !!val;
                              return (
                                <div key={v.key} className={`prediction-mapping-row flex items-center gap-3 rounded-xl border px-4 py-3 transition-all ${isMapped ? "border-blue-500/20 bg-blue-500/[0.03]" : "border-gray-100 bg-gray-50/60"}`}>
                                  <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-all ${isMapped ? "border-blue-500 bg-blue-500" : "border-gray-200 bg-white"}`}>
                                    {isMapped
                                      ? <CheckCircle className="h-3.5 w-3.5 text-white" />
                                      : <span className="text-gray-300" style={{ fontSize: "0.6875rem", fontWeight: 700 }}>—</span>}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-gray-600" style={{ fontSize: "0.8125rem", fontWeight: 500 }}>{v.label}</p>
                                    <p className="text-gray-400" style={{ fontSize: "0.6875rem" }}>{v.desc}</p>
                                  </div>
                                  <div className="relative shrink-0" style={{ minWidth: 185 }}>
                                    <Select value={val || "unassigned"} onValueChange={(value) => setActiveMapping((mapping) => ({ ...mapping, [v.key]: value === "unassigned" ? "" : value }))}>
                                      <SelectTrigger aria-label={v.label} className="pc-column-select"><SelectValue /></SelectTrigger>
                                      <SelectContent className="pc-select-menu" position="popper" align="start">
                                        <SelectItem value="unassigned">No asignar</SelectItem>
                                        {activeCols.map(col => <SelectItem key={col} value={col}>{col}</SelectItem>)}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="prediction-config-summary px-6 py-4 border-t border-gray-100">
                    <div className="flex flex-wrap items-center gap-6">
                      {[
                        { label: "Archivos cargados",    value: `${files.length}` },
                        { label: "Período a predecir",   value: `${forecastDays} días` },
                        { label: "Variables ventas",     value: hasSales ? `${salesReqDone}/${salesReqFields.length} req.` : "Sin archivo", ok: hasSales ? salesReqDone === salesReqFields.length : undefined },
                        { label: "Variables inventario", value: hasInventory ? `${invReqDone}/${invReqFields.length} req.` : "Sin archivo", ok: hasInventory ? invReqDone === invReqFields.length : undefined },
                      ].map((item) => (
                        <div key={item.label}>
                          <p className="text-gray-400" style={{ fontSize: "0.6875rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>{item.label}</p>
                          <p className={`mt-0.5 ${item.ok === true ? "text-blue-600" : item.ok === false ? "text-orange-500" : "text-gray-900"}`}
                            style={{ fontSize: "0.875rem", fontWeight: 600 }}>{item.value}</p>
                        </div>
                      ))}
                    </div>
                    
                  </div>
                </div>
              </div>
            );
          })()}

          {/* ── STEP 3: ANALYSIS ── */}
          {currentStep === 3 && (
            <div className="prediction-analysis-stage space-y-6">
              <div className="prediction-card rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">

                {/* Error state */}
                {analysisStatus === "error" && (
                  <div className="p-6">
                    <div className="flex flex-col items-center gap-4 py-6 text-center">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 border border-red-100">
                        <AlertCircle className="h-7 w-7 text-red-400" />
                      </div>
                      <div>
                        <p className="text-gray-900 mb-1" style={{ fontWeight: 600 }}>Error en el análisis</p>
                        <p className="text-gray-400" style={{ fontSize: "0.875rem" }}>{analysisError}</p>
                      </div>
                      <button
                        onClick={() => { setCurrentStep(2); setAnalysisStatus("idle"); }}
                        className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-gray-600 hover:text-gray-900 transition-colors"
                        style={{ fontSize: "0.875rem" }}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Volver y corregir
                      </button>
                    </div>
                  </div>
                )}

                {analysisStatus === "running" && (
                  <div className="p-6">
                    <div className="flex items-center gap-4 mb-6 pb-5 border-b border-gray-100">
                      <div className="relative shrink-0">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/20">
                          <Activity style={{ height: 18, width: 18 }} className="text-blue-500" />
                        </div>
                        <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-60" />
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500" />
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="text-gray-900" style={{ fontWeight: 700, fontSize: "0.875rem" }}>Procesamiento del análisis</p>
                          <span className="text-blue-500 shrink-0" style={{ fontSize: "0.875rem", fontWeight: 700 }}>{analysisProgress}%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                          <motion.div
                            className="h-full rounded-full bg-gradient-to-r from-blue-600 to-blue-400"
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
                            className={`analysis-pipeline-row flex items-start gap-3 rounded-xl border p-4 transition-all duration-300 ${
                              isDone ? "border-blue-500/20 bg-blue-500/5"
                              : isActive ? "border-blue-500/30 bg-blue-500/[0.07] shadow-sm"
                              : "border-gray-100 bg-gray-50/60"
                            }`}
                          >
                            <div className={`flex h-7 w-7 shrink-0 mt-0.5 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                              isDone ? "bg-blue-500 border-blue-500"
                              : isActive ? "bg-transparent border-blue-500"
                              : "bg-white border-gray-200"
                            }`}>
                              {isDone ? (
                                <CheckCircle className="h-3.5 w-3.5 text-white" />
                              ) : isActive ? (
                                <motion.div
                                  animate={{ rotate: 360 }}
                                  transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                                  className="h-3 w-3 rounded-full border-2 border-blue-500 border-t-transparent"
                                />
                              ) : (
                                <span style={{ fontSize: "0.625rem", fontWeight: 600, color: "#d1d5db" }}>{i + 1}</span>
                              )}
                            </div>
                            <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-all duration-300 ${
                              isDone ? "bg-blue-500/15 border border-blue-500/25"
                              : isActive ? "bg-blue-500/10 border border-blue-500/20"
                              : "bg-white border border-gray-200"
                            }`}>
                              <StepIcon className={`h-3.5 w-3.5 transition-colors duration-300 ${isDone || isActive ? "text-blue-500" : "text-gray-300"}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="transition-colors duration-300" style={{
                                  fontSize: "0.8125rem",
                                  fontWeight: isDone || isActive ? 600 : 400,
                                  color: isDone ? "#0066d6" : isActive ? "#111827" : "#9ca3af",
                                }}>
                                  {step.label}
                                </span>
                                {isActive && (
                                  <motion.span
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="rounded-full border border-blue-500/40 bg-blue-500/10 px-2 py-px text-blue-600"
                                    style={{ fontSize: "0.625rem", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}
                                  >
                                    En curso
                                  </motion.span>
                                )}
                              </div>
                              <p className="mt-0.5 transition-colors duration-300" style={{
                                fontSize: "0.6875rem",
                                color: isDone ? "#6b7280" : isActive ? "#6b7280" : "#d1d5db",
                              }}>
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
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="analysis-complete-heading flex items-center gap-3 mb-5"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/15 border border-blue-500/25">
                        <CheckCircle className="h-5 w-5 text-blue-500" />
                      </div>
                      <div className="flex-1">
                        <p className="text-gray-900" style={{ fontSize: "0.875rem", fontWeight: 700 }}>¡Análisis completado con éxito!</p>
                        <p className="text-gray-500" style={{ fontSize: "0.75rem" }}>Redirigiendo a resultados en unos segundos...</p>
                      </div>
                      <div className="shrink-0 flex flex-col items-end gap-1.5">
                        <span className="text-gray-400" style={{ fontSize: "0.6875rem" }}>Redirigiendo</span>
                        <div className="h-1 w-24 rounded-full bg-gray-100 overflow-hidden">
                          <motion.div className="h-full rounded-full bg-blue-500"
                            initial={{ width: "0%" }}
                            animate={{ width: "100%" }}
                            transition={{ duration: 4.3, ease: "linear" }} />
                        </div>
                      </div>
                    </motion.div>

                    <p className="text-gray-400 mb-4" style={{ fontSize: "0.75rem" }}>
                      Métricas del modelo · {files.reduce((s, f) => s + (f.rows || 0), 0).toLocaleString()} registros procesados
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {[
                        {
                          label: "Precisión estimada",
                          value: accuracy != null ? `${accuracy}%` : "—",
                          sub: "Alta confianza",
                          icon: TrendingUp,
                          iconBg: "bg-blue-500/10 border-blue-500/20",
                          iconColor: "text-blue-500",
                          valColor: "#0066d6",
                        },
                        {
                          label: "Productos analizados",
                          value: prediction ? `${products.length}` : "—",
                          sub: "En el dataset",
                          icon: Package,
                          iconBg: "bg-blue-500/10 border-blue-500/20",
                          iconColor: "text-blue-500",
                          valColor: "#1d4ed8",
                        },
                        {
                          label: "Período predicho",
                          value: `${forecastDays} días`,
                          sub: "Horizonte de análisis",
                          icon: Activity,
                          iconBg: "bg-blue-500/10 border-blue-500/20",
                          iconColor: "text-blue-500",
                          valColor: "#007AFF",
                        },
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
            <div className="analysis-surface prediction-analysis-surface">
              <AnalysisMetrics items={[
                {label:"Demanda prevista",icon:TrendingUp,value:prediction ? `${totalUnits.toLocaleString("es-PE", { maximumFractionDigits: 2 })} uds` : "—"},
                {label:"Productos analizados",icon:Package,value:products.length > 0 ? products.length.toString() : "—"},
                {label:"Precisión",icon:BarChart3,value:accuracy != null ? `${accuracy}%` : "—"},
                {label:"Horizonte",icon:Calendar,value:`${forecastDays} días`},
              ]}/>

              {/* Interactive Chart + Sidebar */}
              <div className="analysis-chart relative">
                <AnimatePresence>
                  {sidebarOpen && (
                    <>
                      <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
                        className="absolute inset-0 analysis-chart-backdrop z-10"
                        onClick={() => setSidebarOpen(false)}
                      />
                      <motion.div
                        initial={{ x: -304 }} animate={{ x: 0 }} exit={{ x: -304 }}
                        transition={{ type: "spring", stiffness: 320, damping: 32 }}
                        className="analysis-medication-drawer absolute top-0 left-0 bottom-0 w-72 bg-white border-r border-gray-200 z-20 flex flex-col shadow-2xl"
                        style={{ borderRadius: 0 }}
                      >
                        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
                          <div>
                            <p className="text-gray-900" style={{ fontSize: "0.875rem", fontWeight: 600 }}>Medicamentos</p>
                            <p className="text-gray-400" style={{ fontSize: "0.75rem" }}>{sidebarProducts.length} de {products.length}</p>
                          </div>
                          <button aria-label="Cerrar lista de medicamentos" onClick={() => setSidebarOpen(false)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="px-4 py-3 border-b border-gray-100">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                            <input type="text" placeholder="Buscar medicamento..." value={sidebarSearch}
                              onChange={(e) => setSidebarSearch(e.target.value)}
                              className="w-full rounded-lg border border-gray-200 bg-gray-50 pl-8 pr-3 py-2 text-gray-900 placeholder:text-gray-400 outline-none focus:border-blue-500/60 focus:bg-white transition-all"
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
                                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all hover:bg-gray-50 ${isSelected ? "bg-blue-500/5 border-r-2 border-r-blue-500" : ""}`}>
                                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${pConf.bg}`}>
                                    <span className={`h-2 w-2 rounded-full ${pConf.dot}`} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className={`truncate ${isSelected ? "text-blue-600" : "text-gray-900"}`}
                                      style={{ fontSize: "0.8125rem", fontWeight: isSelected ? 600 : 500 }}>{p.name}</p>
                                    <p className="text-gray-400 truncate" style={{ fontSize: "0.6875rem" }}>{p.category}</p>
                                  </div>
                                  {isSelected && <CheckCircle className="h-4 w-4 text-blue-500 shrink-0" />}
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
                      <button aria-label="Medicamentos" aria-expanded={sidebarOpen} onClick={() => setSidebarOpen((v) => !v)}
                        className={`flex items-center gap-2 rounded-xl border px-3 py-2 transition-all ${sidebarOpen ? "border-blue-500/50 bg-blue-500/10 text-blue-600" : "border-gray-300 bg-white text-gray-600 hover:border-gray-400 hover:text-gray-900"}`}
                        style={{ fontSize: "0.8125rem", fontWeight: 500 }}>
                        {sidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
                        <span className="hidden sm:inline">Medicamentos</span>
                      </button>
                      <div>
                        <p className="analysis-medication-title text-gray-900" style={{ fontWeight: 600, fontSize: "0.9375rem" }}>
                          {selectedProduct?.name ?? "Selecciona un medicamento"}
                        </p>
                        
                      </div>
                    </div>
                    <button onClick={() => setShowConfidence((v) => !v)}
                      className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 transition-all ${showConfidence ? "border-blue-500/40 bg-blue-500/10 text-blue-600" : "border-gray-300 bg-white text-gray-500 hover:border-gray-400"}`}
                      style={{ fontSize: "0.75rem", fontWeight: 500 }}>
                      {showConfidence ? "Ocultar" : "Mostrar"} intervalo de confianza
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-5 mt-3">
                    <div className="flex items-center gap-2">
                      <svg width="24" height="10" viewBox="0 0 24 10"><line x1="0" y1="5" x2="24" y2="5" stroke="#007AFF" strokeWidth="2.5" strokeLinecap="round" /></svg>
                      <span className="text-gray-500" style={{ fontSize: "0.75rem" }}>Histórico</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <svg width="24" height="10" viewBox="0 0 24 10"><line x1="0" y1="5" x2="24" y2="5" stroke="#007AFF" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="6 3" /></svg>
                      <span className="text-gray-500" style={{ fontSize: "0.75rem" }}>Predicción</span>
                    </div>
                    {showConfidence && (
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-6 rounded bg-blue-400/20 border border-blue-400/30" />
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
                    <div key={`${selectedProductId}-${productChartData.length}`}>
                      <ResponsiveContainer width="100%" height={320}>
                        <ComposedChart data={productChartData.map((point, plotIndex) => ({ ...point, plotIndex }))} margin={{ top: 10, right: 24, left: 0, bottom: 8 }}>
                          <defs>
                            <linearGradient id="confGradientPF" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#007AFF" stopOpacity={0.15} />
                              <stop offset="100%" stopColor="#007AFF" stopOpacity={0.02} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="4 4" stroke="#f1f5f9" vertical={false} />
                          <XAxis dataKey="plotIndex" tickFormatter={(index) => productChartData[Number(index)]?.date ?? ""} tick={{ fill: "#85858f", fontSize: 11 }} tickLine={false} axisLine={false} interval={7} dy={8} />
                          <YAxis tick={{ fill: "#85858f", fontSize: 11 }} tickLine={false} axisLine={false} width={36} />
                          <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#e2e8f0", strokeWidth: 1.5, strokeDasharray: "4 4" }} />
                          <ReferenceLine x={productChartData.findIndex(point => point.predicted != null)} stroke="#6e6e78" strokeWidth={1.5} strokeDasharray="4 4" />
                          {showConfidence && <Area type="monotone" dataKey="upper" stroke="none" fill="url(#confGradientPF)" connectNulls={false} isAnimationActive={true} animationBegin={1200} animationDuration={450} animationEasing="linear" />}
                          {showConfidence && <Area type="monotone" dataKey="lower" stroke="none" fill="#ffffff" connectNulls={false} isAnimationActive={true} animationBegin={1200} animationDuration={450} animationEasing="linear" />}
                          <Line type="monotone" dataKey="historical" isAnimationActive={true} animationBegin={0} animationDuration={1200} animationEasing="linear" stroke="#007AFF" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: "#007AFF", strokeWidth: 0 }} connectNulls={false} />
                          <Line type="monotone" dataKey="predicted" isAnimationActive={true} animationBegin={1200} animationDuration={450} animationEasing="linear" stroke="#007AFF" strokeWidth={2.5} strokeDasharray="8 4" dot={false} activeDot={{ r: 5, fill: "#007AFF", strokeWidth: 0 }} connectNulls={false} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  </AnimatePresence>
                </div>
              </div>

              {/* Medication analysis table */}
              {products.length > 0 && (
                <div className="analysis-table-section">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                    <div>
                      <h3 className="text-gray-900 mb-0.5" style={{ fontWeight: 600 }}>Medicamentos analizados</h3>
                      <p className="text-gray-400" style={{ fontSize: "0.8125rem" }}>{tableData.length} productos en este análisis</p>
                    </div>
                    <div className="relative min-w-56">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                      <input type="text" placeholder="Buscar producto..." value={resultsSearch}
                        onChange={(e) => { setResultsSearch(e.target.value); setResultsTablePage(1); }}
                        className="w-full rounded-xl border border-gray-300 bg-white pl-8 pr-3 py-2 text-gray-900 placeholder:text-gray-400 outline-none focus:border-blue-500/60 transition-colors"
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
                          const varNum = row.variation ?? 0;
                          const TrendIcon = varNum > 5 ? TrendingUp : varNum < -5 ? TrendingDown : Minus;
                          const trendColor = varNum > 5 ? "text-blue-500" : varNum < -5 ? "text-red-500" : "text-gray-400";
                          const trendBg = varNum > 5 ? "bg-blue-500/10" : varNum < -5 ? "bg-red-500/10" : "bg-gray-100";
                          return (
                            <tr key={row.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                              <td className="py-3 pr-3 text-gray-900" style={{ fontSize: "0.8125rem", fontWeight: 500 }}>{row.name}</td>
                              <td className="py-3 pr-3 text-gray-500" style={{ fontSize: "0.8125rem" }}>{row.category}</td>
                              <td className="py-3 pr-3 text-gray-500" style={{ fontSize: "0.8125rem" }}>{row.avgHistorical == null ? "—" : row.avgHistorical.toLocaleString("es-PE", { maximumFractionDigits: 2 }) + " uds"}</td>
                              <td className="py-3 pr-3 text-blue-500" style={{ fontSize: "0.8125rem", fontWeight: 500 }}>{row.predictedDemand.toLocaleString("es-PE", { maximumFractionDigits: 2 })} uds</td>
                              <td className="py-3 pr-3" style={{ fontSize: "0.8125rem" }}>
                                <span className="analysis-variation" style={{ fontWeight: 500 }}>
                                  {row.variation == null ? "—" : (varNum > 0 ? "+" : "") + varNum.toFixed(1) + "%"}
                                </span>
                              </td>
                              <td className="py-3">
                                <span className="analysis-trend"
                                  style={{ fontSize: "0.6875rem", fontWeight: 500 }}>
                                  <TrendIcon className="h-3 w-3" />
                                  {row.variation == null ? "—" : varNum > 5 ? "Al alza" : varNum < -5 ? "A la baja" : "Estable"}
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
              )}
            </div>
          )}

          {/* ── STEP 5: PURCHASE PLAN ── */}
          {currentStep === 5 && (
            <div className="analysis-surface prediction-analysis-surface">
              <div className="analysis-plan-heading flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-gray-900 mb-1" style={{ fontWeight: 600 }}>Plan de compras recomendado</h2>
                  <p className="text-gray-400" style={{ fontSize: "0.875rem" }}>Basado en la predicción para los próximos {forecastDays} días</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => exportPurchase("csv", products.map(p => ({name:p.name,quantity:p.recommendedQty,priority:p.priority})), forecastDays, prediction?.id?.slice(0,8) ?? "nuevo")} className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-500 hover:text-gray-900 hover:border-gray-400 transition-all"
                    style={{ fontSize: "0.8125rem" }}>
                    <Download className="h-4 w-4" />Exportar CSV
                  </button>
                  <button onClick={() => exportPurchase("pdf", products.map(p => ({name:p.name,quantity:p.recommendedQty,priority:p.priority})), forecastDays, prediction?.id?.slice(0,8) ?? "nuevo")} className="flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-400 transition-all"
                    style={{ fontSize: "0.8125rem", fontWeight: 600 }}>
                    <Download className="h-4 w-4" />Exportar PDF
                  </button>
                </div>
              </div>

              <AnalysisMetrics items={[
                {label:"Productos a comprar",icon:Package,value:products.length.toString()},
                {label:"Ítems críticos",icon:AlertCircle,value:products.filter(p=>p.priority === "critical").length.toString()},
                {label:"Prioridad alta",icon:TrendingUp,value:products.filter(p=>p.priority === "high").length.toString()},
                {label:"Unidades totales",icon:ShoppingCart,value:totalUnits.toLocaleString()},
              ]}/>

              <div className="flex flex-wrap items-center gap-3">
                <PriorityFilter value={filterPriority} onChange={(priority) => { setFilterPriority(priority); setPlanTablePage(1); }}/>
                <div className="relative ml-auto">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                  <input type="text" placeholder="Buscar producto..." value={planSearch}
                    onChange={(e) => { setPlanSearch(e.target.value); setPlanTablePage(1); }}
                    className="w-56 rounded-xl border border-gray-300 bg-white pl-8 pr-3 py-2 text-gray-900 placeholder:text-gray-400 outline-none focus:border-blue-500/60 transition-colors"
                    style={{ fontSize: "0.8125rem" }} />
                </div>
              </div>

              <div className="analysis-table-section">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    {(() => {
                      const showStock = products.some((p) => p.hasInventory);
                      const headers = [
                        "Producto",
                        "Categoría",
                        "Demanda predicha",
                        ...(showStock ? ["Stock actual", "A comprar"] : ["Cant. recomendada"]),
                        "Prioridad",
                      ];
                      return (
                    <>
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50">
                        {headers.map((h) => (
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
                            <td className="px-4 py-3 text-blue-500" style={{ fontSize: "0.8125rem" }}>{product.predictedDemand} uds</td>
                            {showStock ? (
                              <>
                                <td className="px-4 py-3 text-gray-500" style={{ fontSize: "0.8125rem" }}>
                                  {product.hasInventory ? `${product.currentStock} uds` : <span className="text-gray-300">—</span>}
                                </td>
                                <td className="px-4 py-3">
                                  <span className="text-gray-900" style={{ fontSize: "0.875rem", fontWeight: 600 }}>{product.recommendedQty} uds</span>
                                </td>
                              </>
                            ) : (
                            <td className="px-4 py-3">
                              <span className="text-gray-900" style={{ fontSize: "0.875rem", fontWeight: 600 }}>{product.recommendedQty} uds</span>
                            </td>
                            )}
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
                      {paginatedPlanProducts.length === 0 && (
                        <tr>
                          <td colSpan={headers.length} className="py-8 text-center text-gray-400" style={{ fontSize: "0.875rem" }}>
                            No se encontraron productos
                          </td>
                        </tr>
                      )}
                    </tbody>
                    </>
                      );
                    })()}
                  </table>
                </div>
                <Paginator page={planTablePage} total={searchedPlanProducts.length} pageSize={PAGE_SIZE_PLAN} onChange={setPlanTablePage} />
              </div>

            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="prediction-navigation">
        <button
          onClick={() => setCurrentStep((s) => prediction ? Math.max(4, s - 1) : Math.max(1, s - 1))}
          disabled={currentStep === 1 || currentStep === 3 || (!!prediction && currentStep === 4)}
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
            className="flex items-center gap-2 rounded-xl bg-blue-500 px-5 py-2.5 text-white transition-all hover:bg-blue-400 hover:shadow-lg hover:shadow-blue-500/20 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ fontSize: "0.875rem", fontWeight: 600 }}
          >
            {nextLabel}
            <ChevronRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            disabled={savingPlan}
            onClick={async () => {
              if (prediction) {
                setSavingPlan(true);
                try {
                  const invFile = files.find((f) => f.type === "inventory");
                  const invDatasetId = invFile?.datasetId;
                  const invMappings = invDatasetId && Object.keys(inventoryMapping).length > 0
                    ? inventoryMapping
                    : undefined;
                  const plan = await purchasePlanService.generate(
                    prediction.id,
                    undefined,
                    invDatasetId,
                    invMappings,
                  );
                  setPurchasePlan(plan);
                } catch {
                  // plan may already exist (conflict) or prediction has no results — navigate anyway
                }
                setSavingPlan(false);
              }
              for (const key of Object.keys(sessionStorage)) { if (key.startsWith("prediction-draft:")) sessionStorage.removeItem(key); }
              navigate("/historial");
            }}
            className="flex items-center gap-2 rounded-xl bg-blue-500 px-5 py-2.5 text-white transition-all hover:bg-blue-400 hover:shadow-lg hover:shadow-blue-500/20 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ fontSize: "0.875rem", fontWeight: 600 }}
          >
            {savingPlan ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {savingPlan ? "Guardando..." : "Guardar y finalizar"}
          </button>
        )}
      </div>
    </div>
  );
}
