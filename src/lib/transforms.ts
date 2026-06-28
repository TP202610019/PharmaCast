import type {
  ForecastResultResponse,
  PredictionMetricResponse,
  PurchasePlanItemResponse,
  PredictionSummaryResponse,
  DashboardChartPoint,
} from "../types/api";
import { ExecutionStatus } from "../types/api";

// ─── Chart data types ─────────────────────────────────────────────────────────

export interface ChartPoint {
  date: string;
  historical: number | null;
  predicted: number | null;
  upper: number | null;
  lower: number | null;
}

// ─── UI product type (mirrors mockData.PurchasePlanItem for chart/table compat) ─

export interface UIProduct {
  id: string;
  name: string;
  category: string;
  currentStock: number;
  predictedDemand: number;
  recommendedQty: number;
  hasInventory: boolean;
  priority: "critical" | "high" | "medium" | "low";
  unitCost: number;
}

// ─── Derive UI products from forecast results ─────────────────────────────────

export function forecastResultsToProducts(
  forecastResults: ForecastResultResponse[],
  purchasePlanItems: PurchasePlanItemResponse[]
): UIProduct[] {
  const productMap = new Map<string, { total: number; count: number; lowerBound: number }>();

  for (const r of forecastResults) {
    const existing = productMap.get(r.productName) ?? { total: 0, count: 0, lowerBound: 0 };
    productMap.set(r.productName, {
      total: existing.total + r.predictedQuantity,
      count: existing.count + 1,
      lowerBound: existing.lowerBound + (r.lowerBound ?? r.predictedQuantity),
    });
  }

  const planMap = new Map<string, PurchasePlanItemResponse>();
  for (const item of purchasePlanItems) {
    planMap.set(item.productName, item);
  }

  let idx = 0;
  const products: UIProduct[] = [];

  for (const [name, agg] of productMap) {
    const avgPredicted = agg.total / Math.max(agg.count, 1);
    const avgLower = agg.lowerBound / Math.max(agg.count, 1);
    const planItem = planMap.get(name);

    const priority = derivePriority(avgPredicted, avgLower);

    products.push({
      id: `product-${idx++}`,
      name,
      category: planItem?.category ?? "General",
      currentStock: planItem?.stockActual ?? 0,
      predictedDemand: Math.round(planItem?.demandPredicted ?? avgPredicted),
      recommendedQty: Math.round(planItem?.toPurchase ?? planItem?.recommendedQuantity ?? avgPredicted),
      hasInventory: planItem?.stockActual != null,
      priority,
      unitCost: planItem?.estimatedCost
        ? planItem.estimatedCost / Math.max(planItem.recommendedQuantity, 1)
        : 0,
    });
  }

  return products;
}

function derivePriority(
  predicted: number,
  lowerBound: number
): "critical" | "high" | "medium" | "low" {
  const ratio = lowerBound > 0 ? predicted / lowerBound : 1;
  if (ratio > 1.5) return "critical";
  if (ratio > 1.25) return "high";
  if (ratio > 1.1) return "medium";
  return "low";
}

// ─── Build chart data for a product from forecast results ─────────────────────

export function buildProductChartData(
  productName: string,
  forecastResults: ForecastResultResponse[],
  forecastPeriod: number
): ChartPoint[] {
  const filtered = forecastResults
    .filter((r) => r.productName === productName)
    .sort((a, b) => a.forecastDate.localeCompare(b.forecastDate));

  if (!filtered.length) return buildGeneratedChartData(100, forecastPeriod);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const avgPredicted =
    filtered.reduce((s, r) => s + r.predictedQuantity, 0) / filtered.length;

  const points: ChartPoint[] = [];

  // Generate 30 days of "historical" data before the first forecast
  for (let i = -30; i < 0; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const label = d.toLocaleDateString("es-ES", { month: "short", day: "numeric" });
    const noise = (Math.random() - 0.5) * avgPredicted * 0.12;
    const wave = Math.sin(i * 0.38) * avgPredicted * 0.1;
    points.push({
      date: label,
      historical: Math.round(Math.max(0, avgPredicted * 0.85 + wave + noise)),
      predicted: null,
      upper: null,
      lower: null,
    });
  }

  // Bridge point
  const todayLabel = today.toLocaleDateString("es-ES", { month: "short", day: "numeric" });
  const bridgeVal = Math.round(avgPredicted * 0.9);
  points.push({ date: todayLabel, historical: bridgeVal, predicted: bridgeVal, upper: bridgeVal, lower: bridgeVal });

  // Actual forecast points
  for (const r of filtered) {
    const d = new Date(r.forecastDate);
    const label = d.toLocaleDateString("es-ES", { month: "short", day: "numeric" });
    const conf = Math.round(r.predictedQuantity * 0.11);
    points.push({
      date: label,
      historical: null,
      predicted: Math.round(r.predictedQuantity),
      upper: r.upperBound !== null ? Math.round(r.upperBound) : Math.round(r.predictedQuantity) + conf,
      lower: r.lowerBound !== null ? Math.round(r.lowerBound) : Math.max(0, Math.round(r.predictedQuantity) - conf),
    });
  }

  return points;
}

// ─── Fallback chart data when no forecast results exist ───────────────────────

export function buildGeneratedChartData(baseVal: number, days: number): ChartPoint[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const data: ChartPoint[] = [];

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
      const ramp = baseVal * (1 + (i / days) * 0.08);
      const predVal = Math.round(Math.max(0, ramp + (Math.random() - 0.5) * 12));
      const conf = Math.round(predVal * 0.11);
      data.push({ date: label, historical: null, predicted: predVal, upper: predVal + conf, lower: Math.max(0, predVal - conf) });
    }
  }
  return data;
}

// ─── Build chart from backend forecast points (replaces buildProductChartData) ─
//
// Historical segment (30 days) is generated synthetically since the ML pipeline
// does not yet persist pre-forecast sales rows. Replace with a real query against
// historical_datasets once that persistence layer is added.

export function buildChartFromBackendPoints(
  backendPoints: DashboardChartPoint[],
  forecastPeriod: number
): ChartPoint[] {
  if (!backendPoints.length) return buildGeneratedChartData(100, forecastPeriod);

  const avgPredicted =
    backendPoints.reduce((s, p) => s + p.predicted, 0) / backendPoints.length;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const result: ChartPoint[] = [];

  // Synthetic 30-day history before today
  for (let i = -30; i < 0; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const label = d.toLocaleDateString("es-ES", { month: "short", day: "numeric" });
    const noise = (Math.random() - 0.5) * avgPredicted * 0.12;
    const wave = Math.sin(i * 0.38) * avgPredicted * 0.1;
    result.push({
      date: label,
      historical: Math.round(Math.max(0, avgPredicted * 0.85 + wave + noise)),
      predicted: null,
      upper: null,
      lower: null,
    });
  }

  // Bridge point at today
  const todayLabel = today.toLocaleDateString("es-ES", { month: "short", day: "numeric" });
  const bridgeVal = Math.round(avgPredicted * 0.9);
  result.push({ date: todayLabel, historical: bridgeVal, predicted: bridgeVal, upper: bridgeVal, lower: bridgeVal });

  // Real forecast points from backend
  for (const p of backendPoints) {
    // Date arrives as "yyyy-MM-dd"; append T00:00:00 to avoid timezone shift
    const d = new Date(p.date + "T00:00:00");
    const label = d.toLocaleDateString("es-ES", { month: "short", day: "numeric" });
    result.push({
      date: label,
      historical: null,
      predicted: p.predicted,
      upper: p.upper,
      lower: p.lower,
    });
  }

  return result;
}

// ─── Extract overall accuracy from metrics ────────────────────────────────────

export function extractAccuracy(metrics: PredictionMetricResponse[]): number {
  const overall = metrics.find((m) => !m.productName);
  if (!overall?.wape) return 0;
  return Math.max(0, Math.round((1 - overall.wape / 100) * 100 * 10) / 10);
}

// ─── Format execution status for display ─────────────────────────────────────

export function statusLabel(status: ExecutionStatus): string {
  switch (status) {
    case ExecutionStatus.Pending: return "Pendiente";
    case ExecutionStatus.Processing: return "Procesando";
    case ExecutionStatus.Completed: return "Completado";
    case ExecutionStatus.Failed: return "Fallido";
    default: return "Desconocido";
  }
}

// ─── Format relative time ─────────────────────────────────────────────────────

export function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);

  if (mins < 2) return "justo ahora";
  if (mins < 60) return `hace ${mins} min`;
  if (hours < 24) return `hace ${hours}h`;
  if (days === 1) return "ayer";
  return `hace ${days} días`;
}

// ─── Build UI summary for a PredictionSummaryResponse ────────────────────────

export interface PredictionUIRecord {
  id: string;
  date: string;
  forecastPeriod: number;
  totalProducts: number;
  criticalItems: number;
  accuracy: number;
  totalUnits: number;
  status: ExecutionStatus;
  datasetName: string;
}

export function summaryToUIRecord(s: PredictionSummaryResponse): PredictionUIRecord {
  return {
    id: s.id,
    date: s.createdAt,
    forecastPeriod: s.forecastPeriod,
    totalProducts: 0,
    criticalItems: 0,
    accuracy: 0,
    totalUnits: 0,
    status: s.executionStatus,
    datasetName: s.datasetName,
  };
}
