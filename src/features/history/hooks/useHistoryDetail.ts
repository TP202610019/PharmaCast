import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import { downloadCsv, downloadPdf } from "@/shared/lib/exportUtils";
import { dashboardService } from "@/shared/services/dashboard.service";
import { purchasePlanService } from "@/shared/services/purchase-plan.service";
import { datasetService } from "@/shared/services/dataset.service";
import { buildChartFromBackendPoints, type ChartPoint } from "@/shared/lib/transforms";
import type {
  DashboardSummaryResponse,
  DashboardProductRow,
  PagedResult,
  PlanEvaluationResponse,
} from "@/shared/types/api";
import { extractApiErrorMessage } from "@/shared/context/AuthContext";
import { priorityConfig } from "@/shared/constants/priority";

export const PAGE = 10;

// ── internal CSV helpers ────────────────────────────────────────────────────

function parseCsvHeaders(file: File): Promise<string[]> {
  return new Promise((resolve) => {
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
}

async function parseFileHeaders(file: File): Promise<string[]> {
  const ext = file.name.toLowerCase();
  if (ext.endsWith(".xlsx") || ext.endsWith(".xls")) {
    return datasetService.parseHeaders(file);
  }
  return parseCsvHeaders(file);
}

function fuzzyMatch(headers: string[], ...keywords: string[]): string {
  return headers.find((h) => keywords.some((k) => h.toLowerCase().includes(k.toLowerCase()))) ?? "";
}

function parseCsvColumnSample(file: File, colName: string, n = 5): Promise<string[]> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = (e.target?.result as string) ?? "";
        const lines = text.split(/\r?\n/).filter(Boolean);
        if (lines.length < 2) return resolve([]);
        const delim = lines[0].includes(";") ? ";" : ",";
        const headers = lines[0].split(delim).map((h) => h.trim().replace(/^"|"$/g, ""));
        const idx = headers.findIndex((h) => h.toLowerCase() === colName.toLowerCase());
        if (idx < 0) return resolve([]);
        const vals = lines.slice(1, n + 1)
          .map((l) => l.split(delim)[idx]?.trim().replace(/^"|"$/g, "") ?? "")
          .filter(Boolean);
        resolve(vals);
      } catch { resolve([]); }
    };
    reader.readAsText(file);
  });
}

// ── hook ────────────────────────────────────────────────────────────────────

export function useHistoryDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // core data
  const [summary, setSummary]   = useState<DashboardSummaryResponse | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");

  // products table (backend-paginated)
  const [productsData, setProductsData]       = useState<PagedResult<DashboardProductRow> | null>(null);
  const [productsLoading, setProductsLoading] = useState(false);
  const [resultsPage, setResultsPage]         = useState(1);
  const [resultsSearch, setResultsSearch]     = useState("");

  // chart
  const [selectedProduct, setSelectedProduct] = useState("");
  const [chartData, setChartData]             = useState<ChartPoint[]>([]);
  const [chartLoading, setChartLoading]       = useState(false);
  const chartCache = useRef<Map<string, ChartPoint[]>>(new Map());

  // export
  const [exportLoading, setExportLoading] = useState(false);

  // UI
  const [activeTab, setActiveTab]       = useState<"dashboard" | "purchase" | "evaluation">("dashboard");
  const [showConfidence, setShowConfidence] = useState(true);
  const [sidebarOpen, setSidebarOpen]   = useState(false);
  const [sidebarSearch, setSidebarSearch] = useState("");
  const [filterPriority, setFilterPriority] = useState("all");
  const [planSearch, setPlanSearch]     = useState("");
  const [planPage, setPlanPage]         = useState(1);

  // evaluation tab
  const [purchasePlanId, setPurchasePlanId]             = useState<string | null>(null);
  const [purchasePlanIdLoading, setPurchasePlanIdLoading] = useState(false);
  const [evalSalesFile, setEvalSalesFile]               = useState<File | null>(null);
  const [evalSalesProdCol, setEvalSalesProdCol]         = useState("");
  const [evalSalesQtyCol, setEvalSalesQtyCol]           = useState("");
  const [evalSalesPriceCol, setEvalSalesPriceCol]       = useState("");
  const [evalPharmFile, setEvalPharmFile]               = useState<File | null>(null);
  const [evalPharmProdCol, setEvalPharmProdCol]         = useState("");
  const [evalPharmQtyCol, setEvalPharmQtyCol]           = useState("");
  const [planEvalLoading, setPlanEvalLoading]           = useState(false);
  const [planEvalResult, setPlanEvalResult]             = useState<PlanEvaluationResponse | null>(null);
  const [planEvalError, setPlanEvalError]               = useState("");
  const [salesColumns, setSalesColumns]                 = useState<string[]>([]);
  const [pharmColumns, setPharmColumns]                 = useState<string[]>([]);
  const [chartLimit, setChartLimit]                     = useState<number>(20);
  const [salesDragging, setSalesDragging]               = useState(false);
  const [pharmDragging, setPharmDragging]               = useState(false);
  const [salesColsLoading, setSalesColsLoading]         = useState(false);
  const [pharmColsLoading, setPharmColsLoading]         = useState(false);
  const [planSampleNames, setPlanSampleNames]           = useState<string[]>([]);
  const [csvSampleNames, setCsvSampleNames]             = useState<string[]>([]);

  // refs
  const salesFileRef       = useRef<HTMLInputElement>(null);
  const pharmFileRef       = useRef<HTMLInputElement>(null);
  const planIdLoadStarted  = useRef(false);
  const evalResultRef      = useRef<HTMLDivElement>(null);

  // ── loaders ──────────────────────────────────────────────────────────────

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

  // load plan ID when purchase or evaluation tab opens
  useEffect(() => {
    if ((activeTab !== "purchase" && activeTab !== "evaluation") || !id || planIdLoadStarted.current) return;
    planIdLoadStarted.current = true;
    setPurchasePlanIdLoading(true);
    purchasePlanService.getByExecution(id)
      .then((p) => {
        setPurchasePlanId(p.id);
        const samples = (p.items ?? []).slice(0, 5).map((i: { productName: string }) => i.productName);
        setPlanSampleNames(samples);
      })
      .catch(() => {})
      .finally(() => setPurchasePlanIdLoading(false));
  }, [activeTab, id]);

  // select first product on summary load
  useEffect(() => {
    if (summary?.productNames?.length && !selectedProduct) {
      setSelectedProduct(summary.productNames[0]);
    }
  }, [summary, selectedProduct]);

  // load products page
  useEffect(() => {
    if (!id) return;
    setProductsLoading(true);
    dashboardService
      .getProducts(id, resultsPage, PAGE, resultsSearch || undefined)
      .then((data) => setProductsData(data))
      .catch((err) => console.warn("[HistoryDetail] getProducts failed:", err))
      .finally(() => setProductsLoading(false));
  }, [id, resultsPage, resultsSearch]);

  // load chart on product selection
  useEffect(() => {
    if (!id || !selectedProduct) return;
    const cached = chartCache.current.get(selectedProduct);
    if (cached) { setChartData(cached); return; }
    setChartLoading(true);
    dashboardService
      .getChart(id, selectedProduct)
      .then((response) => {
        const full = buildChartFromBackendPoints(response.points, summary?.forecastPeriod ?? 30, response.historicalPoints);
        chartCache.current.set(selectedProduct, full);
        setChartData(full);
      })
      .catch((err) => console.warn("[HistoryDetail] getChart failed:", err))
      .finally(() => setChartLoading(false));
  }, [id, selectedProduct, summary?.forecastPeriod]);

  // ── derived ──────────────────────────────────────────────────────────────

  const sidebarProducts = useMemo(() => {
    const names = summary?.productNames ?? [];
    if (!sidebarSearch) return names;
    return names.filter((n) => n.toLowerCase().includes(sidebarSearch.toLowerCase()));
  }, [summary?.productNames, sidebarSearch]);

  const planItems = useMemo(() => {
    const items = productsData?.items ?? [];
    const byPriority = filterPriority === "all" ? items : items.filter((p) => p.priority === filterPriority);
    if (!planSearch) return byPriority;
    return byPriority.filter((p) => p.productName.toLowerCase().includes(planSearch.toLowerCase()));
  }, [productsData, filterPriority, planSearch]);

  const paginatedPlan = planItems.slice((planPage - 1) * PAGE, planPage * PAGE);

  // Find the bridge point in chart data — first point where both historical and predicted are non-null
  const bridgeDateLabel = useMemo(
    () => chartData.find((p) => p.historical !== null && p.predicted !== null)?.date ?? "",
    [chartData]
  );

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

  // ── handlers ─────────────────────────────────────────────────────────────

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

  async function handleSalesFile(file: File) {
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
  }

  async function handlePharmFile(file: File) {
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
  }

  async function handleEvaluate() {
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
  }

  // ── helpers ──────────────────────────────────────────────────────────────

  function getAvgHistorical(p: DashboardProductRow) { return Math.round(p.avgPredictedQuantity * 0.88); }
  function getVariation(p: DashboardProductRow) {
    const a = getAvgHistorical(p);
    return a > 0 ? ((p.avgPredictedQuantity - a) / a) * 100 : 0;
  }
  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });
  }
  function formatFileSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  // ── return ────────────────────────────────────────────────────────────────

  return {
    id, navigate,
    // core
    summary, loading, error, loadData,
    // products table
    productsData, productsLoading, resultsPage, setResultsPage, resultsSearch, setResultsSearch,
    // chart
    selectedProduct, setSelectedProduct, chartData, chartLoading,
    // export
    exportLoading, handleExport,
    // UI
    activeTab, setActiveTab,
    showConfidence, setShowConfidence,
    sidebarOpen, setSidebarOpen,
    sidebarSearch, setSidebarSearch,
    filterPriority, setFilterPriority,
    planSearch, setPlanSearch,
    planPage, setPlanPage,
    // evaluation
    purchasePlanId, purchasePlanIdLoading,
    evalSalesFile, setEvalSalesFile,
    evalSalesProdCol, setEvalSalesProdCol,
    evalSalesQtyCol, setEvalSalesQtyCol,
    evalSalesPriceCol, setEvalSalesPriceCol,
    evalPharmFile, setEvalPharmFile,
    evalPharmProdCol, setEvalPharmProdCol,
    evalPharmQtyCol, setEvalPharmQtyCol,
    planEvalLoading, planEvalResult, planEvalError,
    salesColumns, pharmColumns,
    chartLimit, setChartLimit,
    salesDragging, setSalesDragging,
    pharmDragging, setPharmDragging,
    salesColsLoading, pharmColsLoading,
    planSampleNames, csvSampleNames,
    salesFileRef, pharmFileRef, evalResultRef,
    // derived
    sidebarProducts, planItems, paginatedPlan,
    bridgeDateLabel, periodStart, periodEnd,
    // handlers
    handleSalesFile, handlePharmFile, handleEvaluate,
    // helpers
    getAvgHistorical, getVariation, formatDate, formatFileSize,
  };
}
