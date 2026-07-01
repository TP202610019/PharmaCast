import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router";
import { datasetService } from "@/shared/services/dataset.service";
import { mappingService, mappingFieldService } from "@/shared/services/mapping.service";
import { predictionService } from "@/shared/services/prediction.service";
import { purchasePlanService } from "@/shared/services/purchase-plan.service";
import {
  forecastResultsToProducts,
  buildProductChartData,
  buildGeneratedChartData,
  extractAccuracy,
  type UIProduct,
  type ChartPoint,
} from "@/shared/lib/transforms";
import type {
  PredictionResponse,
  PurchasePlanResponse,
  MappingFieldResponse,
  MappingConfigResponse,
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
  const [forecastDays, setForecastDays] = useState(7);
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
  const [analysisError, setAnalysisError] = useState<string>("");
  const [savingPlan, setSavingPlan] = useState(false);

  const products = useMemo<UIProduct[]>(() => {
    if (prediction) return forecastResultsToProducts(prediction.forecastResults, purchasePlan?.items ?? []);
    return [];
  }, [prediction, purchasePlan]);

  const accuracy  = useMemo(() => (prediction ? extractAccuracy(prediction.metrics) : 0), [prediction]);
  const totalUnits = useMemo(() => products.reduce((s, p) => s + p.recommendedQty, 0), [products]);

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

  const uploadFile = useCallback(async (file: File, type: "sales" | "inventory") => {
    console.log("[PredictionFlow] uploadFile() — name:", file.name, "type:", type, "size:", file.size);

    if (type === "sales") {
      setDetectedSalesCols([]);
      setAppliedMappingId(null);
      setSalesMapping({});
      setMappingName("");
    } else {
      setDetectedInvCols([]);
      setInventoryMapping({});
    }

    const tempEntry: UploadedFile = { name: file.name, size: file.size, type, uploading: true, rawFile: file };
    setFiles((prev) => [...prev.filter((f) => f.type !== type), tempEntry]);

    const lcName = file.name.toLowerCase();
    if (lcName.endsWith(".csv")) {
      const cols = await parseCsvHeaders(file);
      if (type === "sales") setDetectedSalesCols(cols);
      else setDetectedInvCols(cols);
    }

    try {
      const dataset = await datasetService.upload(file);
      setFiles((prev) =>
        prev.map((f) =>
          f.name === file.name
            ? { ...f, uploading: false, rows: dataset.rowsCount ?? undefined, datasetId: dataset.id }
            : f
        )
      );
      if (type === "sales") setPrimaryDatasetId(dataset.id);
      setUploadError("");

      if (!lcName.endsWith(".csv")) {
        try {
          const headers = await datasetService.getHeaders(dataset.id);
          if (type === "sales") setDetectedSalesCols(headers);
          else setDetectedInvCols(headers);
        } catch {
          console.warn("[PredictionFlow] getHeaders() failed — Step 2 will show fallback column suggestions");
        }
      }
    } catch (err) {
      const msg = extractApiErrorMessage(err, "Error al cargar el archivo.");
      setFiles((prev) =>
        prev.map((f) => f.name === file.name ? { ...f, uploading: false, uploadError: msg } : f)
      );
      setUploadError(msg);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFiles = Array.from(e.dataTransfer.files).filter((f) => {
      const n = f.name.toLowerCase();
      return n.endsWith(".csv") || n.endsWith(".xlsx") || n.endsWith(".xls");
    });
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

  const runAnalysis = useCallback(async () => {
    setAnalysisStatus("running");
    setAnalysisProgress(0);
    setCompletedStepIdx(-1);
    setAnalysisError("");

    const total = PIPELINE_STEPS.length;

    if (primaryDatasetId) {
      let animIdx = 0;
      const animInterval = setInterval(() => {
        if (animIdx < total - 1) {
          setCompletedStepIdx(animIdx - 1);
          setAnalysisProgress(Math.round(((animIdx + 1) / total) * 88));
          animIdx++;
        }
      }, 1200);

      try {
        let resolvedMappingId: string | undefined = appliedMappingId ?? undefined;
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

        const result = await predictionService.execute(primaryDatasetId, forecastDays, resolvedMappingId);
        clearInterval(animInterval);

        if (result.executionStatus === ExecutionStatus.Failed) {
          setAnalysisError(result.errorMessage ?? "La predicción falló. Verifica tu archivo e intenta de nuevo.");
          setAnalysisStatus("error");
          return;
        }

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
  }, [primaryDatasetId, forecastDays, files, salesMapping, appliedMappingId, mappingName, saveAsDefault, fieldCatalog]);

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
      setCurrentStep((s) => Math.min(5, s + 1));
    }
  };

  const nextLabel =
    currentStep === 2 ? "Ejecutar análisis"
    : currentStep === 4 ? "Ver plan de compras"
    : "Siguiente";

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === selectedProductId) ?? products[0],
    [products, selectedProductId]
  );

  const productChartData = useMemo<ChartPoint[]>(() => {
    if (prediction && selectedProduct)
      return buildProductChartData(selectedProduct.name, prediction.forecastResults, forecastDays);
    if (selectedProduct)
      return buildGeneratedChartData(selectedProduct.predictedDemand, forecastDays);
    return buildGeneratedChartData(100, forecastDays);
  }, [prediction, selectedProduct, forecastDays]);

  const bridgeDateLabel = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.toLocaleDateString("es-ES", { month: "short", day: "numeric" });
  }, []);

  const tableData = useMemo(() =>
    products.map((p) => ({
      ...p,
      avgHistorical: Math.round(p.predictedDemand * 0.88),
      variation: ((p.predictedDemand - Math.round(p.predictedDemand * 0.88)) / Math.max(Math.round(p.predictedDemand * 0.88), 1)) * 100,
    })),
    [products]
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
      try {
        const invFile = files.find((f) => f.type === "inventory");
        const invDatasetId = invFile?.datasetId;
        const invMappings =
          invDatasetId && Object.keys(inventoryMapping).length > 0 ? inventoryMapping : undefined;
        const plan = await purchasePlanService.generate(prediction.id, undefined, invDatasetId, invMappings);
        setPurchasePlan(plan);
      } catch {
        // plan may already exist or prediction has no results — navigate anyway
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
    forecastDays, setForecastDays,
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
    selectedProduct, productChartData, bridgeDateLabel,
    tableData, sidebarProducts,
    searchedTableData, paginatedTableData,
    searchedPlanProducts, paginatedPlanProducts,
    canProceed, handleNext, nextLabel,
    savePlanAndNavigate,
    formatSize,
  };
}
