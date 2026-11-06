import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router";
import { datasetService } from "@/shared/services/dataset.service";
import { mappingService, mappingFieldService } from "@/shared/services/mapping.service";
import { predictionService } from "@/shared/services/prediction.service";
import { purchasePlanService } from "@/shared/services/purchase-plan.service";
import { dashboardService } from "@/shared/services/dashboard.service";
import {
  forecastResultsToProducts,
  buildChartFromBackendPoints,
  formatChartDate,
  extractAccuracy,
  type UIProduct,
  type ChartPoint,
} from "@/shared/lib/transforms";
import type {
  PredictionResponse,
  PurchasePlanResponse,
  MappingFieldResponse,
  MappingConfigResponse,
  PredictionPeriodResponse,
} from "@/shared/types/api";
import { ExecutionStatus } from "@/shared/types/api";
import { extractApiErrorMessage } from "@/shared/context/AuthContext";
import { PIPELINE_STEPS, FALLBACK_SALES_COLS, FALLBACK_INV_COLS, PAGE_SIZE_TABLE, PAGE_SIZE_PLAN } from "../constants";
import { parseCsvHeaders, formatSize, detectFileType } from "../utils";
import type { UploadedFile } from "../types";

export function usePredictionFlow() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const salesInputRef = useRef<HTMLInputElement>(null);
  const inventoryInputRef = useRef<HTMLInputElement>(null);

  const [currentStep, setCurrentStep] = useState(1);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [forecastDays, setForecastDays] = useState(30);
  const [periods, setPeriods] = useState<PredictionPeriodResponse[]>([]);
  const [periodsLoading, setPeriodsLoading] = useState(true);
  const [catalogError, setCatalogError] = useState("");
  const pendingUploads = useRef(new Map<"sales" | "inventory", { token: symbol; datasetId?: string }>());
  const retainedDatasets = useRef(new Set<string>());
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisStatus, setAnalysisStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [completedStepIdx, setCompletedStepIdx] = useState(-1);
  const [filterPriority, setFilterPriority] = useState<string>("all");

  const [mappingTab, setMappingTab] = useState<"sales" | "inventory">("sales");
  const [salesMapping, setSalesMapping] = useState<Record<string, string>>({});
  const [inventoryMapping, setInventoryMapping] = useState<Record<string, string>>({});
  const [detectedSalesCols, setDetectedSalesCols] = useState<string[]>([]);
  const [detectedInvCols, setDetectedInvCols] = useState<string[]>([]);

  const [fieldCatalog, setFieldCatalog] = useState<MappingFieldResponse[]>([]);
  const [fieldCatalogLoading, setFieldCatalogLoading] = useState(false);
  const [savedMappings, setSavedMappings] = useState<MappingConfigResponse[]>([]);
  const [savedMappingsLoading, setSavedMappingsLoading] = useState(false);
  const [appliedMappingId, setAppliedMappingId] = useState<string | null>(null);
  const [mappingName, setMappingName] = useState("");
  const [saveAsDefault, setSaveAsDefault] = useState(false);

  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [showConfidence, setShowConfidence] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarSearch, setSidebarSearch] = useState("");
  const [resultsTablePage, setResultsTablePage] = useState(1);
  const [resultsSearch, setResultsSearch] = useState("");
  const [planTablePage, setPlanTablePage] = useState(1);
  const [planSearch, setPlanSearch] = useState("");

  const [primaryDatasetId, setPrimaryDatasetId] = useState<string | null>(null);
  const [prediction, setPrediction] = useState<PredictionResponse | null>(null);
  const [purchasePlan, setPurchasePlan] = useState<PurchasePlanResponse | null>(null);
  const [uploadError, setUploadError] = useState<string>("");
  const [submittingFiles, setSubmittingFiles] = useState(false);
  const submittingFilesRef = useRef(false);
  const [analysisError, setAnalysisError] = useState<string>("");
  const [savingPlan, setSavingPlan] = useState(false);
  const [planError, setPlanError] = useState("");

  const [productChartData, setProductChartData] = useState<ChartPoint[]>([]);
  const [chartLoading, setChartLoading] = useState(false);
  const chartCache = useRef<Map<string, ChartPoint[]>>(new Map());

  const products = useMemo<UIProduct[]>(() => {
    if (prediction) return forecastResultsToProducts(prediction.forecastResults, purchasePlan?.items ?? [], [...prediction.metrics, ...(prediction.productMetrics ?? [])]);
    return [];
  }, [prediction, purchasePlan]);

  const accuracy  = useMemo(() => (prediction ? extractAccuracy(prediction.metrics) : 0), [prediction]);
  const totalUnits = useMemo(() => products.reduce((s, p) => s + p.recommendedQty, 0), [products]);

  const deletePendingDataset = useCallback(async (id: string) => {
    if (retainedDatasets.current.has(id)) return;
    try {
      await datasetService.delete(id);
    } catch (err) {
      setUploadError(extractApiErrorMessage(err, "No se pudo eliminar el archivo temporal. Intenta nuevamente."));
    }
  }, []);

  useEffect(() => {
    predictionService.getPeriods()
      .then((items) => setPeriods(items.filter((p) => p.isActive && [30, 60, 90].includes(p.days))))
      .catch((err) => setCatalogError(extractApiErrorMessage(err, "No se pudieron cargar los períodos.")))
      .finally(() => setPeriodsLoading(false));
    return () => {
      for (const entry of pendingUploads.current.values()) {
        if (entry.datasetId) void deletePendingDataset(entry.datasetId);
      }
      pendingUploads.current.clear();
    };
  }, [deletePendingDataset]);

  useEffect(() => {
    if (products.length > 0 && !selectedProductId) setSelectedProductId(products[0].id);
  }, [products, selectedProductId]);

  useEffect(() => {
    if (currentStep === 3 && analysisStatus === "done") {
      const timer = setTimeout(() => setCurrentStep(4), 4500);
      return () => clearTimeout(timer);
    }
  }, [currentStep, analysisStatus]);

  useEffect(() => {
    if (currentStep === 2) {
      if (fieldCatalog.length === 0) {
        setFieldCatalogLoading(true);
        mappingFieldService.getAll()
          .then((fields) => setFieldCatalog(fields.filter((field) => field.isActive)))
          .catch((err) => setCatalogError(extractApiErrorMessage(err, "No se pudo cargar el catálogo de variables.")))
          .finally(() => setFieldCatalogLoading(false));
      }
      setSavedMappingsLoading(true);
      mappingService.getAll()
        .then(setSavedMappings)
        .catch((err) => setCatalogError(extractApiErrorMessage(err, "No se pudieron cargar los mapeos.")))
        .finally(() => setSavedMappingsLoading(false));
    }
  }, [currentStep]); // eslint-disable-line react-hooks/exhaustive-deps

  const uploadFile = useCallback(async (file: File, type: "sales" | "inventory", persist = false) => {
    if (!/\.(csv|xls|xlsx)$/i.test(file.name)) {
      setUploadError("Selecciona un archivo CSV, XLS o XLSX.");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setUploadError("El archivo no debe superar los 50 MB.");
      return;
    }
    const previous = pendingUploads.current.get(type);
    const entry = { token: Symbol(type), datasetId: undefined as string | undefined };
    pendingUploads.current.set(type, entry);
    const isCurrent = () => pendingUploads.current.get(type)?.token === entry.token;
    setUploadError("");
    if (previous?.datasetId) void deletePendingDataset(previous.datasetId);

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

    const tempEntry: UploadedFile = { name: file.name, size: file.size, type, uploading: persist, rawFile: file };
    setFiles((prev) => [...prev.filter((f) => f.type !== type), tempEntry]);

    // Selecting/replacing a file only stores it in browser memory.
    if (!persist) return;

    try {
      const dataset = await datasetService.upload(file);
      if (!isCurrent()) {
        await deletePendingDataset(dataset.id);
        return;
      }
      entry.datasetId = dataset.id;
      setFiles((prev) =>
        prev.map((f) =>
          f.type === type
            ? { ...f, uploading: false, rows: dataset.rowsCount ?? undefined, datasetId: dataset.id }
            : f
        )
      );
      if (type === "sales") setPrimaryDatasetId(dataset.id);
      setUploadError("");

      try {
          const headers = file.name.toLowerCase().endsWith(".csv")
            ? await parseCsvHeaders(file)
            : await datasetService.getHeaders(dataset.id);
          if (!isCurrent()) return;
          if (type === "sales") setDetectedSalesCols(headers);
          else setDetectedInvCols(headers);
          return true;
      } catch (err) {
        await deletePendingDataset(dataset.id);
        if (isCurrent()) {
          entry.datasetId = undefined;
          if (type === "sales") setPrimaryDatasetId(null);
          setFiles((prev) => prev.map((f) => f.type === type ? { ...f, datasetId: undefined } : f));
        }
        throw err;
      }
    } catch (err) {
      if (!isCurrent()) return;
      const msg = extractApiErrorMessage(err, "Error al cargar el archivo.");
      setFiles((prev) =>
        prev.map((f) => f.type === type ? { ...f, uploading: false, uploadError: msg } : f)
      );
      setUploadError(msg);
    }
  }, [deletePendingDataset]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    droppedFiles.forEach((file, i) => uploadFile(file, detectFileType(file.name, i)));
  }, [uploadFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    selected.forEach((file, i) => uploadFile(file, detectFileType(file.name, i)));
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [uploadFile]);

  const addDemoFile = (type: "sales" | "inventory") => {
    const name = type === "sales" ? "ventas_abril_2026.csv" : "inventario_mayo_2026.xlsx";
    setFiles((prev) => [
      ...prev.filter((f) => f.type !== type),
      { name, size: 45230, type, rows: type === "sales" ? 487 : 312 },
    ]);
    if (type === "sales") {
      setDetectedSalesCols(FALLBACK_SALES_COLS);
      setPrimaryDatasetId(null);
      setAppliedMappingId(null);
      setSalesMapping({});
    } else {
      setDetectedInvCols(FALLBACK_INV_COLS);
      setInventoryMapping({});
    }
  };

  const removeFile = (type: "sales" | "inventory") => {
    const f = files.find((x) => x.type === type);
    const entry = pendingUploads.current.get(type);
    pendingUploads.current.delete(type);
    if (entry?.datasetId) void deletePendingDataset(entry.datasetId);
    setFiles((prev) => prev.filter((x) => x.type !== type));
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

  const runAnalysis = useCallback(async () => {
    if (!primaryDatasetId || !periods.some((p) => p.days === forecastDays)) {
      setAnalysisError("Carga ventas y selecciona un período activo antes de ejecutar.");
      setAnalysisStatus("error");
      return;
    }
    const analysisStartedAt = Date.now();
    const minimumPresentationMs = 40_000;
    setAnalysisStatus("running");
    setAnalysisProgress(0);
    setCompletedStepIdx(-1);
    setAnalysisError("");

    const total = PIPELINE_STEPS.length;

    if (primaryDatasetId) {
      const animInterval = setInterval(() => {
        const progress = Math.min(95, Math.round(((Date.now() - analysisStartedAt) / minimumPresentationMs) * 95));
        setAnalysisProgress(progress);
        setCompletedStepIdx(Math.min(total - 2, Math.floor((progress / 100) * total) - 1));
      }, 300);

      try {
        let resolvedMappingId: string | undefined = appliedMappingId ?? undefined;
        if (resolvedMappingId) {
          const config = savedMappings.find((m) => m.id === resolvedMappingId);
          const selectedFields = Object.entries(salesMapping).filter(([, column]) => column);
          if (!config || config.fields.length !== selectedFields.length || !selectedFields.every(([key, column]) => config.fields.some((f) => f.fieldKey === key && f.datasetColumnName === column))) {
            resolvedMappingId = undefined;
            setAppliedMappingId(null);
          }
        }
        const requiredCatalogFields = fieldCatalog.filter((f) => f.isRequired && f.fieldType === "sales");
        const hasSalesMapping =
          files.some((f) => f.type === "sales") &&
          requiredCatalogFields.every((f) => salesMapping[f.fieldKey]);

        if (hasSalesMapping && !resolvedMappingId) {
          const latestMappings = await mappingService.getAll();
          setSavedMappings(latestMappings);

          const fieldEntries = Object.entries(salesMapping)
            .filter(([, col]) => col)
            .map(([fieldKey, datasetColumnName]) => ({ fieldKey, datasetColumnName }));

          const columnMatch = latestMappings.find(
            (m) =>
              m.fields.length === fieldEntries.length &&
              fieldEntries.every((entry) => {
                const mf = m.fields.find((x) => x.fieldKey === entry.fieldKey);
                return mf?.datasetColumnName === entry.datasetColumnName;
              })
          );

          if (columnMatch) {
            resolvedMappingId = columnMatch.id;
          } else {
            const autoName =
              mappingName.trim() ||
              `pharmacast-${new Date().toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" })}-${Date.now().toString(36)}`;
            const created = await mappingService.create({
              configurationName: autoName,
              isDefault: saveAsDefault,
              fields: fieldEntries,
            });
            resolvedMappingId = created.id;
          }
        }

        if (!resolvedMappingId) throw new Error("Completa el mapeo de ventas antes de ejecutar.");
        await datasetService.confirm(primaryDatasetId, resolvedMappingId, "sales");
        retainedDatasets.current.add(primaryDatasetId);
        const result = await predictionService.execute(primaryDatasetId, forecastDays, resolvedMappingId);

        if (result.executionStatus === ExecutionStatus.Failed) {
          clearInterval(animInterval);
          setAnalysisError(result.errorMessage ?? "La predicción falló. Verifica tu archivo e intenta de nuevo.");
          setAnalysisStatus("error");
          return;
        }

        if (result.isDemo) {
        }
        clearInterval(animInterval);
        setCompletedStepIdx(total - 1);
        setAnalysisProgress(100);
        setPrediction(result);
        setAnalysisStatus("done");
      } catch (err) {
        clearInterval(animInterval);
        setAnalysisError(extractApiErrorMessage(err, "Error al ejecutar la predicción."));
        setAnalysisStatus("error");
      }
    } else {
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
  }, [primaryDatasetId, forecastDays, periods, files, salesMapping, appliedMappingId, mappingName, saveAsDefault, fieldCatalog, savedMappings]);

  const canProceed = () => {
    if (submittingFiles) return false;
    if (currentStep === 1) {
      const salesFile = files.find((f) => f.type === "sales");
      return Boolean(
        salesFile?.rawFile &&
        !salesFile.uploading &&
        !files.some((f) => f.uploading)
      );
    }
    if (currentStep === 2) {
      if (periodsLoading || fieldCatalogLoading || savedMappingsLoading || !periods.some((p) => p.days === forecastDays)) return false;
      if (!fieldCatalog.some((f) => f.fieldType === "sales") || !detectedSalesCols.length) return false;
      const hasSales = files.some((f) => f.type === "sales");
      const salesRequiredFields = fieldCatalog.filter((f) => f.fieldType === "sales" && f.isRequired);
      if (hasSales && !salesRequiredFields.every((f) => detectedSalesCols.includes(salesMapping[f.fieldKey]))) return false;
      if (files.some((f) => f.type === "inventory") && (!detectedInvCols.length || !fieldCatalog.filter((f) => f.fieldType === "inventory" && f.isRequired).every((f) => detectedInvCols.includes(inventoryMapping[f.fieldKey])))) return false;
      return true;
    }
    return true;
  };

  const today = new Date().toLocaleDateString("es-ES", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const handleNext = async () => {
    if (!canProceed()) return;
    if (currentStep === 1) {
      if (submittingFilesRef.current) return;
      submittingFilesRef.current = true;
      setSubmittingFiles(true);
      try {
        const results = await Promise.all(files.map(async (file) => {
          if (file.datasetId) return true;
          return file.rawFile ? uploadFile(file.rawFile, file.type, true) : false;
        }));
        if (results.every((success) => success === true)) setCurrentStep(2);
      } finally {
        submittingFilesRef.current = false;
        setSubmittingFiles(false);
      }
      return;
    }
    if (currentStep === 2) {
      setCurrentStep(3);
      runAnalysis();
    } else {
      setCurrentStep((s) => Math.min(5, s + 1));
    }
  };

  const nextLabel =
    submittingFiles ? "Validando y subiendo…"
    : currentStep === 2 ? "Ejecutar análisis"
    : currentStep === 4 ? "Ver plan de compras"
    : "Siguiente";

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === selectedProductId) ?? products[0],
    [products, selectedProductId]
  );

  // Fetch the chart from the backend (same source/shape as History and Dashboard)
  // so this step shows the same real historical series instead of a locally-built,
  // history-less one.
  useEffect(() => {
    if (!prediction || !selectedProduct) return;
    const cacheKey = `${prediction.id}:${selectedProduct.name}`;
    const cached = chartCache.current.get(cacheKey);
    if (cached) {
      setProductChartData(cached);
      return;
    }
    setChartLoading(true);
    dashboardService
      .getChart(prediction.id, selectedProduct.name)
      .then((response) => {
        const full = buildChartFromBackendPoints(response.points, forecastDays, response.historicalPoints);
        chartCache.current.set(cacheKey, full);
        setProductChartData(full);
      })
      .catch((err) => console.warn("[PredictionFlow] getChart failed:", err))
      .finally(() => setChartLoading(false));
  }, [prediction, selectedProduct, forecastDays]);

  const bridgeDateLabel = useMemo(() => {
    const firstForecast = prediction?.forecastResults
      .map((result) => result.forecastDate)
      .sort()[0];
    return firstForecast ? formatChartDate(firstForecast) : "";
  }, [prediction]);

  const tableData = useMemo(() =>
    products.map((p) => ({
      ...p,
      avgHistorical: p.historicalAvg == null ? null : Math.round(p.historicalAvg * 10) / 10,
      predictedDaily: Math.round((p.totalPredicted / Math.max(forecastDays, 1)) * 10) / 10,
      variation: p.historicalAvg && p.historicalAvg > 0
        ? ((p.totalPredicted / Math.max(forecastDays, 1) - p.historicalAvg) / p.historicalAvg) * 100
        : 0,
    })),
    [products, forecastDays]
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
    filterPriority === "all" ? products : products.filter((p) => p.priority === filterPriority),
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

  const savePlanAndNavigate = async () => {
    if (prediction) {
      setSavingPlan(true);
      setPlanError("");
      try {
        const invFile = files.find((f) => f.type === "inventory");
        const invDatasetId = invFile?.datasetId;
        const invMappings =
          invDatasetId && Object.keys(inventoryMapping).length > 0 ? inventoryMapping : undefined;
        if (invDatasetId) {
          const fields = Object.entries(inventoryMapping).filter(([, value]) => value)
            .map(([fieldKey, datasetColumnName]) => ({ fieldKey, datasetColumnName }));
          const existing = savedMappings.find((m) => m.fields.length === fields.length && fields.every((f) => m.fields.some((mf) => mf.fieldKey === f.fieldKey && mf.datasetColumnName === f.datasetColumnName)));
          const config = existing ?? await mappingService.create({ configurationName: `inventario-${Date.now()}`, isDefault: false, fields });
          await datasetService.confirm(invDatasetId, config.id, "inventory");
          retainedDatasets.current.add(invDatasetId);
        }
        const plan = await purchasePlanService.generate(prediction.id, undefined, invDatasetId, invMappings);
        setPurchasePlan(plan);
      } catch (err) {
        setPlanError(extractApiErrorMessage(err, "No se pudo guardar el plan de compras."));
        setSavingPlan(false);
        return;
      }
      setSavingPlan(false);
    }
    navigate("/history");
  };

  return {
    fileInputRef, salesInputRef, inventoryInputRef,
    currentStep, setCurrentStep,
    files, isDragOver, setIsDragOver, uploadError,
    uploadFile, removeFile, handleDrop, handleFileInput, addDemoFile,
    forecastDays, setForecastDays, periods, periodsLoading, catalogError, planError,
    mappingTab, setMappingTab,
    salesMapping, setSalesMapping,
    inventoryMapping, setInventoryMapping,
    detectedSalesCols, detectedInvCols,
    fieldCatalog, fieldCatalogLoading,
    savedMappings, setSavedMappings,
    savedMappingsLoading,
    appliedMappingId, setAppliedMappingId,
    mappingName, setMappingName,
    saveAsDefault, setSaveAsDefault,
    today,
    analysisProgress, analysisStatus, setAnalysisStatus,
    completedStepIdx, analysisError,
    selectedProductId, setSelectedProductId,
    showConfidence, setShowConfidence,
    sidebarOpen, setSidebarOpen,
    sidebarSearch, setSidebarSearch,
    resultsTablePage, setResultsTablePage,
    resultsSearch, setResultsSearch,
    filterPriority, setFilterPriority,
    planTablePage, setPlanTablePage,
    planSearch, setPlanSearch,
    prediction, purchasePlan, savingPlan,
    products, accuracy, totalUnits,
    selectedProduct, productChartData, chartLoading, bridgeDateLabel,
    tableData, sidebarProducts,
    searchedTableData, paginatedTableData,
    searchedPlanProducts, paginatedPlanProducts,
    canProceed, handleNext, nextLabel,
    savePlanAndNavigate,
    formatSize,
  };
}
