import type {
  ForecastResultResponse,
  PredictionMetricResponse,
  PurchasePlanItemResponse,
  PredictionSummaryResponse,
  DashboardChartPoint,
  DashboardHistoricalPoint,
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
      if (m.productName) {
        historicalMap.set(m.productName, m.historicalAvg ?? null);
      }
    }
  }

  let idx = 0;
  const products: UIProduct[] = [];

  for (const [name, agg] of productMap) {
    const avgPredicted = agg.total / Math.max(agg.count, 1);
    const planItem = planMap.get(name);

    const priority = derivePriority(avgPredicted);

    products.push({
      id: `product-${idx++}`,
      name,
      category: planItem?.category ?? "General",
      currentStock: planItem?.stockActual ?? 0,
      predictedDemand: avgPredicted,
      recommendedQty: planItem?.toPurchase ?? planItem?.recommendedQuantity ?? agg.total,
      hasInventory: planItem?.stockActual != null,
      priority,
      unitCost: planItem?.estimatedCost
        ? planItem.estimatedCost / Math.max(planItem.recommendedQuantity, 1)
        : 0,
      historicalAvg: historicalMap.get(name) ?? null,
      totalPredicted: agg.total,
    });
  }

  return products;
}

function derivePriority(avgDailyQty: number): "critical" | "high" | "medium" | "low" {
  if (avgDailyQty > 1.67) return "critical";
  if (avgDailyQty > 0.42) return "high";
  if (avgDailyQty > 0.08) return "medium";
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
    const conf = Math.round(r.predictedQuantity * 0.11);
    return {
      date: formatChartDate(r.forecastDate),
      historical: null,
      predicted: r.predictedQuantity,
      upper: r.upperBound ?? r.predictedQuantity + conf,
      lower: r.lowerBound ?? Math.max(0, r.predictedQuantity - conf),
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
    const conf = Math.round(baseVal * 0.11);
    data.push({ date: label, historical: null, predicted: baseVal, upper: baseVal + conf, lower: Math.max(0, baseVal - conf) });
  }
  return data;
}

export function formatChartDate(value: string): string {
  // Dates identify calendar days: preserve the server's day, without timezone shifts.
  const day = value.slice(0, 10);
  const date = new Date(day + "T00:00:00");
  return Number.isNaN(date.getTime()) ? "—" :
    date.toLocaleDateString("es-ES", { month: "short", day: "numeric", year: "numeric" });
}

export function buildChartFromBackendPoints(
  backendPoints: DashboardChartPoint[],
  _forecastPeriod: number,
  historicalPoints: DashboardHistoricalPoint[] = []
): ChartPoint[] {
  const days = new Map<string, ChartPoint>();
  const pointFor = (value: string) => {
    const day = value.slice(0, 10);
    if (!days.has(day)) days.set(day, {
      date: formatChartDate(day), historical: null, predicted: null, upper: null, lower: null,
    });
    return days.get(day)!;
  };
  for (const h of historicalPoints) pointFor(h.date).historical = h.quantity;
  for (const p of backendPoints) {
    const point = pointFor(p.date);
    point.predicted = p.predicted;
    point.upper = p.upper ?? p.predicted * 1.11;
    point.lower = p.lower ?? Math.max(0, p.predicted * 0.89);
  }
  return [...days.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, point]) => point);
}


// ─── Extract overall accuracy from metrics ────────────────────────────────────

export function extractAccuracy(metrics: PredictionMetricResponse[]): number | null {
  const overall = metrics.find((m) =>
    (m.scope === "Overall" || (m.scope == null && m.productName == null)) &&
    (m.method == null || m.method === "XGBoost"));
  if (overall?.wape == null || !Number.isFinite(overall.wape)) return 0;
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
