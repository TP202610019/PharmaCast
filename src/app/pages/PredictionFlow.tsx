import { validateLocalDataset } from "../../lib/validateLocalDataset";
import { PredictionAnalysis } from "../components/PredictionAnalysis";
import { WorkspaceLoading } from "../components/WorkspaceLoading";
import { Switch } from "../components/ui/switch";
import { useAuth } from "../context/AuthContext";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../components/ui/select";
import { clearPredictionDraft, usePredictionDraft } from "../hooks/usePredictionDraft";
import { AnalysisMetrics } from "../components/AnalysisLayout";
import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useBlocker, useNavigate } from "react-router";
import { createPortal } from "react-dom";
import { Upload, Settings, BarChart3, ShoppingCart, CheckCircle, ChevronRight, ChevronLeft, X, AlertCircle, TrendingUp, Package, Calendar, Clock, Activity, Loader2, BookOpen } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { datasetService } from "../../services/dataset.service";
import { mappingService, mappingFieldService } from "../../services/mapping.service";
import { predictionService } from "../../services/prediction.service";
import { purchasePlanService } from "../../services/purchase-plan.service";
import { forecastResultsToProducts, extractAccuracy, type UIProduct } from "../../lib/transforms";
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

const PIPELINE_STEPS = [
  { label: "Carga de datos",             description: "Leyendo archivos de ventas e inventario",             icon: Upload },
  { label: "Preprocesamiento",           description: "Limpiando valores atípicos y normalizando registros", icon: Settings },
  { label: "Ingeniería de variables",    description: "Extrayendo estacionalidad y tendencias",             icon: BarChart3 },
  { label: "Entrenamiento del modelo",   description: "Aprendiendo los patrones de tus ventas",          icon: Activity },
  { label: "Proyecciones de demanda",    description: "Calculando demanda futura por producto",             icon: TrendingUp },
  { label: "Plan de compras",            description: "Calculando recomendaciones de reabastecimiento",     icon: ShoppingCart },
];


// Field catalog is loaded dynamically from GET /api/mapping-fields.
// Each field carries fieldType: "sales" | "inventory" — no hardcoded key sets needed.

/* ── Types ── */
interface UploadedFile {
  name: string;
  size: number;
  type: "sales" | "inventory";
  rows?: number;
  uploading?: boolean;
  validating?: boolean;
  validated?: boolean;
  serverHeadersValidated?: boolean;
  uploadError?: string;
  datasetId?: string;
  rawFile?: File;
}

export function PredictionFlow() {
  const navigate = useNavigate();
  const { isLoggedIn, user } = useAuth();
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const uploadLock = useRef(false);
  const uploadVersions = useRef({ sales: 0, inventory: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const salesInputRef = useRef<HTMLInputElement>(null);
  const inventoryInputRef = useRef<HTMLInputElement>(null);

  /* ── Step / UI state ── */
  const [currentStep, setCurrentStep] = usePredictionDraft("currentStep", 1);
  const previousStep = useRef(currentStep);
  useEffect(() => {
    if (previousStep.current === currentStep) return;
    previousStep.current = currentStep;
    window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  }, [currentStep]);
  const [files, setFiles] = usePredictionDraft<UploadedFile[]>("files", []);
  const [isDragOver, setIsDragOver] = useState(false);
  const [forecastDays, setForecastDays] = usePredictionDraft("forecastDays", 30);
  const [analysisSeconds, setAnalysisSeconds] = useState(0);
  const [analysisStatus, setAnalysisStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  useEffect(() => {
    if (analysisStatus !== "running") return;
    const startedAt = performance.now();
    const timer = window.setInterval(() => {
      setAnalysisSeconds(Math.floor((performance.now() - startedAt) / 1000));
    }, 250);
    return () => window.clearInterval(timer);
  }, [analysisStatus]);
  const [completedStepIdx, setCompletedStepIdx] = useState(-1);

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

  /* ── API state ── */
  const [primaryDatasetId, setPrimaryDatasetId] = usePredictionDraft<string | null>("primaryDatasetId", null);
  const [prediction, setPrediction] = usePredictionDraft<PredictionResponse | null>("prediction", null);
  const [purchasePlan, setPurchasePlan] = usePredictionDraft<PurchasePlanResponse | null>("purchasePlan", null);
  const [uploadError, setUploadError] = useState<string>("");
  const [analysisError, setAnalysisError] = useState<string>("");

  const finishing = useRef(false);
  useEffect(() => {
    finishing.current = false;
    return () => { finishing.current = true; };
  }, []);
  const hasDraft = files.length > 0 || currentStep > 1;
  const blocker = useBlocker(({ currentLocation, nextLocation }) =>
    isLoggedIn && !finishing.current && hasDraft && currentLocation.pathname !== nextLocation.pathname
  );
  const [restoreError, setRestoreError] = useState("");
  const [restoringPrediction, setRestoringPrediction] = useState(currentStep >= 3 && !prediction);
  useEffect(() => {
    if (currentStep < 3 || prediction || analysisStatus === "running") return;
    let active = true;
    const saved = sessionStorage.getItem(`prediction-draft:${user?.email ?? "guest"}:prediction`);
    let id: string | undefined;
    try { id = JSON.parse(saved ?? "null")?.id; } catch {}
    if (!id) {
      setCurrentStep(2);
      setRestoringPrediction(false);
      return;
    }
    setRestoringPrediction(true);
    predictionService.getById(id).then((result) => {
      if (active) { setPrediction(result); if (currentStep === 3) setAnalysisStatus("done"); }
    }).catch(() => {
      if (active) setRestoreError("No se pudieron recuperar los resultados. Recarga para volver a intentarlo.");
    }).finally(() => {
      if (active) setRestoringPrediction(false);
    });
    return () => { active = false; };
  }, [currentStep, prediction, user?.email]);

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
  const recordCount = files.reduce((sum, file) => sum + (file.rows || 0), 0);

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

  const defaultAppliedFor = useRef<string | null>(null);
  const [mappingWarning, setMappingWarning] = useState("");
  const applySavedMapping = (config: import("../../types/api").MappingConfigResponse) => {
    const mapping: Record<string, string> = {};
    const missing: string[] = [];
    config.fields.forEach((field) => {
      if (!fieldCatalog.some(f => f.fieldType === "sales" && f.isRequired && f.fieldKey === field.fieldKey)) return;
      if (detectedSalesCols.includes(field.datasetColumnName)) mapping[field.fieldKey] = field.datasetColumnName;
      else missing.push(field.datasetColumnName);
    });
    setAppliedMappingId(null);
    setSalesMapping(mapping);
    setMappingWarning(missing.length
      ? "Algunas columnas de esta configuración no están en el archivo. Revisa los campos sin asignar."
      : "");
  };

  useEffect(() => {
    if (currentStep !== 2 || savedMappingsLoading || !savedMappings.length || !primaryDatasetId || !detectedSalesCols.length ||
        defaultAppliedFor.current === primaryDatasetId) return;
    defaultAppliedFor.current = primaryDatasetId;
    if (appliedMappingId || Object.keys(salesMapping).length > 0) return;
    const config = savedMappings.find((mapping) => mapping.isDefault);
    if (config) applySavedMapping(config);
  }, [currentStep, savedMappingsLoading, savedMappings, primaryDatasetId, detectedSalesCols, appliedMappingId, salesMapping]);

  /* ── File upload handler ── */
  const uploadFile = useCallback(
    async (file: File, type: "sales" | "inventory") => {
      if (uploadLock.current) return;
      const version = ++uploadVersions.current[type];
      const isCurrent = () => uploadVersions.current[type] === version;
      setUploadError("");
      if (type === "sales") {
        setPrimaryDatasetId(null);
        setDetectedSalesCols([]);
        setAppliedMappingId(null);
        setSalesMapping({});
        setMappingName("");
      } else {
        setDetectedInvCols([]);
        setInventoryMapping({});
      }
      setFiles(prev => prev.filter(f => f.type !== type));
      if (!/\.(csv|xls|xlsx)$/i.test(file.name)) {
        setFiles(prev => [...prev, { name: file.name, size: file.size, type, uploadError: "Formato no permitido" }]);
        setUploadError("Formato no permitido. Usa un archivo CSV, XLS o XLSX.");
        return;
      }
      if (!file.size || file.size > 30 * 1024 * 1024) {
        setFiles(prev => [...prev, { name: file.name, size: file.size, type, uploadError: "Tamaño no válido" }]);
        setUploadError(!file.size ? "El archivo está vacío." : "El archivo supera el límite de 30 MB.");
        return;
      }
      setFiles(prev => [...prev, { name: file.name, size: file.size, type, validating: true, rawFile: file }]);
      try {
        const preview = await validateLocalDataset(file);
        if (!isCurrent()) return;
        if (type === "sales") setDetectedSalesCols(preview.headers);
        else setDetectedInvCols(preview.headers);
        setFiles(prev => prev.map(f => f.type === type
          ? { ...f, validating: false, validated: true, rows: preview.rows } : f));
      } catch (err) {
        if (!isCurrent()) return;
        const msg = err instanceof Error ? err.message : "No se pudo validar el archivo.";
        setFiles(prev => prev.map(f => f.type === type ? { ...f, validating: false, validated: false, rawFile: undefined, uploadError: msg } : f));
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
      const droppedFiles = Array.from(e.dataTransfer.files);
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

  const removeFile = (name: string) => {
    if (uploadLock.current) return;
    const f = files.find((x) => x.name === name);
    if (f) uploadVersions.current[f.type]++;
    setUploadError("");
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
    setAnalysisSeconds(0);
    setCompletedStepIdx(-1);
    setAnalysisError("");
    setPurchasePlan(null);

    const total = PIPELINE_STEPS.length;

    if (primaryDatasetId) {
      // Real API mode — animate steps gradually while waiting
      const stageDurations = [1000, 1800, 2200, 4000];
      const started = performance.now();
      let visualStage = 0;
      const animInterval = window.setInterval(() => {
        let elapsed = performance.now() - started;
        let stage = 0;
        while (stage < stageDurations.length && elapsed >= stageDurations[stage]) {
          elapsed -= stageDurations[stage];
          stage++;
        }
        visualStage = stage;
        setCompletedStepIdx(stage - 1);
      }, 150);

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
            .filter(([key, col]) => col && requiredCatalogFields.some(f => f.fieldKey === key))
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

        if (finishing.current) return;
        if (result.executionStatus === ExecutionStatus.Failed) {
          setAnalysisError(result.errorMessage ?? "La predicción falló. Verifica tu archivo e intenta de nuevo.");
          setAnalysisStatus("error");
          return;
        }

        sessionStorage.setItem(`prediction-draft:${user?.email ?? "guest"}:prediction`, JSON.stringify({ id: result.id }));
        setPrediction(result);
        const invDatasetId = files.find(f => f.type === "inventory")?.datasetId;
        purchasePlanService.generate(result.id, undefined, invDatasetId,
          invDatasetId && Object.keys(inventoryMapping).length ? inventoryMapping : undefined)
          .then(plan => { if (!finishing.current) setPurchasePlan(plan); })
          .catch(() => { /* The shared plan view offers an explicit retry; prediction remains saved. */ });
        // Finish the visual sequence; the saved plan continues in the background.
        for (let stage = visualStage; stage < 4; stage++) {
          setCompletedStepIdx(stage);
          await new Promise(resolve => window.setTimeout(resolve, 300));
        }
        setCompletedStepIdx(3);
        await new Promise(resolve => window.setTimeout(resolve, 700));
        setCompletedStepIdx(4);
        setCompletedStepIdx(total - 1);
        setAnalysisStatus("done");
      } catch (err) {
        clearInterval(animInterval);
        setAnalysisError("No se pudo completar el análisis. Revisa las columnas asignadas y vuelve a intentarlo.");
        setAnalysisStatus("error");
      }
    } else {
      setAnalysisError("Carga un archivo de ventas válido antes de ejecutar el análisis.");
      setAnalysisStatus("error");
    }
  }, [primaryDatasetId, forecastDays, files, salesMapping, appliedMappingId, mappingName, saveAsDefault, fieldCatalog, inventoryMapping, user?.email]);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const canProceed = () => {
    if (currentStep === 3) return analysisStatus === "done";
    if (currentStep === 1) return !uploadingFiles && files.some(f => f.type === "sales") && files.every(f => !f.validating && !f.uploading && !f.uploadError && (!!f.datasetId || (f.validated && !!f.rawFile)));
    if (currentStep === 2) {
      if (!primaryDatasetId || !detectedSalesCols.length || fieldCatalogLoading || !fieldCatalog.length || ![30, 60, 90].includes(forecastDays)) return false;
      if (files.some(f => f.uploading || f.uploadError || !f.datasetId)) return false;
      for (const type of ["sales", "inventory"] as const) {
        if (!files.some(f => f.type === type)) continue;
        const columns = type === "sales" ? detectedSalesCols : detectedInvCols;
        const mapping = type === "sales" ? salesMapping : inventoryMapping;
        const required = fieldCatalog.filter(f => f.fieldType === type && f.isRequired);
        const values = required.map(f => mapping[f.fieldKey]);
        if (!required.length || values.some(v => !v || !columns.includes(v)) || new Set(values).size !== values.length) return false;
      }
      return true;
    }
    return true;
  };

  const today = new Date().toLocaleDateString("es-ES", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const handleNext = async () => {
    if (uploadLock.current || !canProceed()) return;
    if (currentStep === 1) {
      uploadLock.current = true;
      setUploadingFiles(true);
      setUploadError("");
      try {
        for (const entry of files) {
          if (entry.datasetId && entry.serverHeadersValidated !== false) continue;
          if (!entry.datasetId && (!entry.rawFile || !entry.validated)) throw new Error("Vuelve a seleccionar el archivo para continuar.");
          setFiles(prev => prev.map(f => f.type === entry.type ? { ...f, uploading: true } : f));
          try {
            const dataset = entry.datasetId ? { id: entry.datasetId, rowsCount: entry.rows } : await datasetService.upload(entry.rawFile!);
            // Retain successful uploads on retry; never upload the same selection twice.
            setFiles(prev => prev.map(f => f.type === entry.type ? { ...f, datasetId: dataset.id, serverHeadersValidated: false, rows: dataset.rowsCount ?? f.rows, uploading: false } : f));
            if (entry.type === "sales") setPrimaryDatasetId(dataset.id);
            const headers = await datasetService.getHeaders(dataset.id);
            if (!headers.length) throw new Error("No se encontraron encabezados válidos en la primera fila.");
            if (entry.type === "sales") setDetectedSalesCols(headers);
            else setDetectedInvCols(headers);
            setFiles(prev => prev.map(f => f.type === entry.type ? { ...f, serverHeadersValidated: true } : f));
          } catch (error) {
            // Keep an accepted upload for a header-request retry; do not duplicate it.
            setFiles(prev => prev.map(f => f.type === entry.type ? { ...f, uploading: false } : f));
            throw error;
          }
        }
        setCurrentStep(2);
      } catch (error) {
        setUploadError(extractApiErrorMessage(error, "No se pudieron subir los archivos. Intenta nuevamente."));
      } finally {
        uploadLock.current = false;
        setUploadingFiles(false);
      }
      return;
    }
    if (currentStep === 2) {
      setCurrentStep(3);
      runAnalysis();
    } else {
      setCurrentStep((s) => Math.min(STEPS.length, s + 1));
    }
  };

  const nextLabel =
    uploadingFiles ? "Subiendo…" : currentStep === 2 ? "Ejecutar análisis"
    : currentStep === 4 ? "Ver plan de compras"
    : "Siguiente";

  if (restoringPrediction) return <WorkspaceLoading label="Recuperando resultados…" />;
  if (restoreError) return <div role="alert" className="mx-auto max-w-xl px-6 py-16 text-center text-sm text-red-600">{restoreError}</div>;

  return (
    <div className="prediction-page">
      {blocker.state === "blocked" && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-5">
          <div role="dialog" aria-modal="true" aria-labelledby="leave-title" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 id="leave-title" className="text-lg font-semibold">¿Salir de la predicción?</h2>
            <p className="mt-3 text-sm leading-6 text-gray-500">{prediction
              ? "El análisis ya está guardado en el historial. Al salir se cerrará este recorrido."
              : "Tienes una predicción en curso. Al salir se borrará la configuración de este recorrido."}</p>
            <div className="mt-6 flex justify-end gap-3">
              <button autoFocus onClick={() => blocker.reset()} className="rounded-full border border-gray-300 px-4 py-2 text-sm">Continuar aquí</button>
              <button onClick={() => { finishing.current = true; clearPredictionDraft(); blocker.proceed(); }} className="rounded-full bg-blue-500 px-4 py-2 text-sm text-white">Salir</button>
            </div>
          </div>
        </div>, document.body
      )}

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
                            {(salesFile?.validated || salesFile?.datasetId) && !salesFile?.uploadError ? <CheckCircle className="h-5 w-5 text-blue-500" /> : <Upload className="h-5 w-5 text-gray-400" />}
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
                              {salesFile.validating && " · Validando…"}{salesFile.validated && !salesFile.datasetId && !salesFile.uploading && " · Listo para subir"}{salesFile.uploading && " · Subiendo…"}{salesFile.datasetId && !salesFile.uploadError && " · Subido"}{salesFile.uploadError && " · No válido"}
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
                            {(invFile?.validated || invFile?.datasetId) && !invFile?.uploadError ? <CheckCircle className="h-5 w-5 text-blue-500" /> : <Package className="h-5 w-5 text-gray-400" />}
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
                              {invFile.validating && " · Validando…"}{invFile.validated && !invFile.datasetId && !invFile.uploading && " · Listo para subir"}{invFile.uploading && " · Subiendo…"}{invFile.datasetId && !invFile.uploadError && " · Subido"}{invFile.uploadError && " · No válido"}
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
            const salesCols = detectedSalesCols;
            const invCols = detectedInvCols;
            const activeMapping = mappingTab === "sales" ? salesMapping : inventoryMapping;
            const setActiveMapping = mappingTab === "sales" ? setSalesMapping : setInventoryMapping;
            const salesCatalogFields = fieldCatalog.filter((f) => f.fieldType === "sales");
            const invCatalogFields   = fieldCatalog.filter((f) => f.fieldType === "inventory");
            const activeReqVars = (mappingTab === "sales" ? salesCatalogFields : invCatalogFields).filter((f) => f.isRequired).map((f) => ({ key: f.fieldKey, label: f.displayName, desc: "" }));
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
                  <div className={`prediction-saved-config ${!savedMappingsLoading && savedMappings.length === 0 ? "prediction-saved-config-empty" : ""} px-6 pt-4 pb-3 border-b border-gray-100`}>
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
                            setMappingWarning("");
                            if (!id) setSalesMapping({});
                            if (id) {
                              const cfg = savedMappings.find((m) => m.id === id);
                              if (cfg) {
                                applySavedMapping(cfg);
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
                            onClick={() => { setAppliedMappingId(null); setSalesMapping({}); setMappingWarning(""); }}
                            className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-gray-500 hover:text-red-500 hover:border-red-200 transition-all"
                            style={{ fontSize: "0.75rem" }}
                          >
                            <X className="h-3 w-3" /> Limpiar
                          </button>
                        )}
                      </div>
                    ) : !savedMappingsLoading ? (
                      <p className="prediction-config-empty-message text-gray-400" style={{ fontSize: "0.75rem" }}>
                        No hay configuraciones guardadas aún. El mapeo que definas se guardará automáticamente.
                      </p>
                    ) : null}

                    {/* Name + default options when creating a new mapping */}
                    {!appliedMappingId && (
                      <div className="prediction-mapping-options flex items-center gap-3">
                        <input
                          type="text"
                          aria-label="Nombre de la configuración"
                          placeholder="Nombre de la configuración (opcional)"
                          value={mappingName}
                          onChange={(e) => setMappingName(e.target.value)}
                          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-gray-700 placeholder:text-gray-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
                          style={{ fontSize: "0.8125rem", minWidth: 240 }}
                        />
                        <div className="prediction-default-option">
                          <Switch id="mapping-save-default" checked={saveAsDefault}
                            onCheckedChange={setSaveAsDefault} className="prediction-default-switch" />
                          <label htmlFor="mapping-save-default" className="text-gray-600 cursor-pointer select-none">
                            Guardar como predeterminada
                          </label>
                        </div>
                      </div>
                    )}
                  </div>

                  {mappingWarning && <p role="status" className="px-6 pt-2 text-xs text-orange-600">{mappingWarning}</p>}

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
                                        {activeCols.map(col => <SelectItem key={col} value={col} disabled={Object.entries(activeMapping).some(([key, selected]) => key !== v.key && selected === col)}>{col}</SelectItem>)}
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
                    <div className="flex items-start gap-3 mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="text-gray-900" style={{ fontWeight: 600, fontSize: "1.125rem" }}>Procesamiento del análisis</p>
                        </div>
                        <div role="progressbar" aria-label="Análisis en curso" className="analysis-indeterminate-track">
                          <span />
                        </div>
                        <div className="analysis-progress-details">
                          <p className="text-gray-400">
                            {recordCount > 0 && `${recordCount.toLocaleString()} registros · `} {forecastDays} días a predecir
                          </p>
                          <p className="analysis-process-time">
                            Tiempo de proceso: {String(Math.floor(analysisSeconds / 60)).padStart(2, "0")}:{String(analysisSeconds % 60).padStart(2, "0")}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="analysis-pipeline-grid">
                      {PIPELINE_STEPS.map((step, i) => {
                        const isDone = i <= completedStepIdx;
                        const isActive = i === completedStepIdx + 1;
                        return (
                          <div key={step.label} className={`analysis-stage-item ${isActive ? "is-active" : ""} ${isDone ? "is-done" : ""}`}>
                            <span className="analysis-stage-indicator">
                              {isDone ? <CheckCircle size={16} /> : isActive
                                ? <i className="analysis-stage-spinner" aria-hidden="true" />
                                : String(i + 1).padStart(2, "0")}
                            </span>
                            <span className="analysis-stage-name">{step.label}</span>
                            {isActive && <span className="analysis-stage-status">En curso</span>}
                          </div>
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
                      <div className="flex-1">
                        <p className="text-gray-900" style={{ fontSize: "0.875rem", fontWeight: 700 }}>Análisis completado</p>
                        <p className="text-gray-500" style={{ fontSize: "0.75rem" }}>Tus resultados están listos.</p>
                      </div>
                    </motion.div>

                    <AnalysisMetrics items={[
                      { label: "Precisión", icon: BarChart3, value: accuracy != null ? `${accuracy}%` : "—" },
                      { label: "Productos analizados", icon: Package, value: products.length.toLocaleString("es-PE") },
                      { label: "Horizonte", icon: Calendar, value: `${forecastDays} días` },
                    ]} />


                  </div>
                )}
              </div>
            </div>
          )}

          {prediction && (currentStep === 4 || currentStep === 5) && (
            <div className="analysis-surface">
              <PredictionAnalysis key={prediction.id} executionId={prediction.id}
                view={currentStep === 4 ? "demand" : "purchase"}
                initialPrediction={prediction} initialPlan={purchasePlan} onPlanReady={setPurchasePlan}
                preparePlan={() => {
                  const inventory = files.find(file => file.type === "inventory")?.datasetId;
                  return purchasePlanService.generate(prediction.id, undefined, inventory,
                    inventory && Object.keys(inventoryMapping).length ? inventoryMapping : undefined);
                }}/>
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
        {currentStep === 3 && analysisStatus !== "done" ? (
          <div className="w-32" />
        ) : currentStep < STEPS.length ? (
          <button
            onClick={handleNext}
            disabled={uploadingFiles || !canProceed()}
            className="flex items-center gap-2 rounded-xl bg-blue-500 px-5 py-2.5 text-white transition-all hover:bg-blue-400 hover:shadow-lg hover:shadow-blue-500/20 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ fontSize: "0.875rem", fontWeight: 600 }}
          >
            {nextLabel}
            <ChevronRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            onClick={() => {
              finishing.current = true;
              clearPredictionDraft();
              navigate("/historial");
            }}
            className="flex items-center gap-2 rounded-xl bg-blue-500 px-5 py-2.5 text-white transition-all hover:bg-blue-400 hover:shadow-lg hover:shadow-blue-500/20 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ fontSize: "0.875rem", fontWeight: 600 }}
          >
            <CheckCircle className="h-4 w-4" />
            Finalizar y ver historial
          </button>
        )}
      </div>
    </div>
  );
}
