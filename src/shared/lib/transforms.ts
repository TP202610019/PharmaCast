import type {
  ForecastResultResponse,
  PredictionMetricResponse,
  PurchasePlanItemResponse,
  PredictionSummaryResponse,
  DashboardChartPoint,
  DashboardHistoricalPoint,
} from "../types/api";
import { ExecutionStatus, PredictionMethod, MetricScope } from "../types/api";

export function isXGBoostMetric(metric: PredictionMetricResponse): boolean {
  return metric.method == null || metric.method === PredictionMethod.XGBoost;
}

// ─── Chart data types ─────────────────────────────────────────────────────────

export interface ChartPoint {
  date: string;
  historical: number | null;
  predicted: number | null;
  upper: number | null;
  lower: number | null;
}

// ─── UI product type ──────────────────────────────────────────────────────────

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
  historicalAvg: number | null;
  totalPredicted: number;
}

// ─── Derive UI products from forecast results ─────────────────────────────────

export function forecastResultsToProducts(
  forecastResults: ForecastResultResponse[],
  purchasePlanItems: PurchasePlanItemResponse[],
  metrics?: PredictionMetricResponse[]
): UIProduct[] {
  const productMap = new Map<string, { total: number; count: number }>();

  for (const r of forecastResults) {
    const existing = productMap.get(r.productName) ?? { total: 0, count: 0 };
    productMap.set(r.productName, {
      total: existing.total + r.predictedQuantity,
      count: existing.count + 1,
    });
  }

  const planMap = new Map<string, PurchasePlanItemResponse>();
  for (const item of purchasePlanItems) {
    planMap.set(item.productName, item);
  }

  const historicalMap = new Map<string, number | null>();
  if (metrics) {
    for (const m of metrics) {
      if (m.productName && isXGBoostMetric(m)) {
        historicalMap.set(m.productName, m.historicalAvg ?? null);
      }
    }
  }

  let idx = 0;
  const products: UIProduct[] = [];
  const positiveDemandProducts = [...productMap.entries()]
    .filter(([, value]) => value.total > 0);
  const priorityRank = new Map(
    positiveDemandProducts
      .sort((a, b) => b[1].total - a[1].total || a[0].localeCompare(b[0]))
      .map(([name], rank) => [name, rank / positiveDemandProducts.length])
  );

  for (const [name, agg] of productMap) {
    const planItem = planMap.get(name);

    const priority = derivePriority(agg.total, priorityRank.get(name) ?? 1, planItem);

    products.push({
      id: `product-${idx++}`,
      name,
      category: planItem?.category ?? "General",
      currentStock: planItem?.stockActual ?? 0,
      predictedDemand: Math.round(planItem?.demandPredicted ?? agg.total),
      recommendedQty: Math.ceil(planItem?.toPurchase ?? planItem?.recommendedQuantity ?? agg.total),
      hasInventory: planItem?.stockActual != null,
      priority,
      unitCost: planItem?.estimatedCost
        ? planItem.estimatedCost / Math.max(planItem.recommendedQuantity, 1)
        : 0,
      historicalAvg: historicalMap.get(name) ?? null,
      totalPredicted: Math.round(agg.total),
    });
  }

  return products;
}

function derivePriority(totalDemand: number, relativeRank: number, planItem?: PurchasePlanItemResponse): "critical" | "high" | "medium" | "low" {
  if (totalDemand <= 0) return "low";
  if (planItem?.stockActual != null && totalDemand > 0) {
    const shortage = Math.max(0, totalDemand - planItem.stockActual) / totalDemand;
    if (shortage >= 0.75) return "critical";
    if (shortage >= 0.4) return "high";
    if (shortage > 0) return "medium";
    return "low";
  }
  if (relativeRank < 0.15) return "critical";
  if (relativeRank < 0.4) return "high";
  if (relativeRank < 0.75) return "medium";
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

  if (!filtered.length) return [];

  return filtered.map((r) => {
    return {
      date: new Date(r.forecastDate + "T00:00:00").toLocaleDateString("es-ES", { month: "short", day: "numeric" }),
      historical: null,
      predicted: r.predictedQuantity,
      upper: r.upperBound ?? null,
      lower: r.lowerBound ?? null,
    };
  });
}

// ─── Fallback chart data when no forecast results exist ───────────────────────

export function buildGeneratedChartData(baseVal: number, days: number): ChartPoint[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const data: ChartPoint[] = [];

  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const label = d.toLocaleDateString("es-ES", { month: "short", day: "numeric" });
    data.push({ date: label, historical: null, predicted: baseVal, upper: null, lower: null });
  }
  return data;
}

export function buildChartFromBackendPoints(
  backendPoints: DashboardChartPoint[],
  _forecastPeriod: number,
  historicalPoints?: DashboardHistoricalPoint[]
): ChartPoint[] {
  const history = [...(historicalPoints ?? [])]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((h) => ({
      date: formatChartDate(h.date),
      historical: h.quantity,
      predicted: null,
      upper: null,
      lower: null,
    }));
  const forecast = [...backendPoints]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((p) => ({
      date: formatChartDate(p.date),
      historical: null,
      predicted: p.predicted,
      upper: p.upper ?? null,
      lower: p.lower ?? null,
    }));
  return [...history, ...forecast];
}

export function formatChartDate(isoDate: string): string {
  return new Date(`${isoDate.slice(0, 10)}T00:00:00`).toLocaleDateString("es-ES", {
    day: "numeric", month: "short", year: "2-digit",
  });
}

// ─── Extract overall accuracy from metrics ────────────────────────────────────

export function extractAccuracy(metrics: PredictionMetricResponse[]): number {
  const overall = metrics.find((m) => isXGBoostMetric(m) && (m.scope === MetricScope.Overall || !m.productName));
  if (overall?.wape == null) return 0;
  return Math.round(Math.max(0, Math.min(100, 100 - overall.wape)) * 10) / 10;
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
