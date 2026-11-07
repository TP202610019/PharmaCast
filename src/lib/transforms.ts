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
  weekRange?: string;
  historical: number | null;
  predicted: number | null;
  upper: number | null;
  lower: number | null;
}

// ─── Analysis products derived from saved forecasts and purchase plan items ───

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

  // Match the server's volume ranking over the complete execution, never a visible page.
  const ranked = [...productMap.entries()].filter(([, value]) => value.total > 0)
    .sort(([a, av], [b, bv]) => bv.total - av.total || (a < b ? -1 : a > b ? 1 : 0));
  const priorities = new Map<string, UIProduct["priority"]>(ranked.map(([name], index) => {
    const fraction = index / ranked.length;
    return [name, fraction < .15 ? "critical" : fraction < .40 ? "high" : fraction < .75 ? "medium" : "low"];
  }));
  let idx = 0;
  const products: UIProduct[] = [];

  for (const [name, agg] of productMap) {
    const avgPredicted = agg.total / Math.max(agg.count, 1);
    const planItem = planMap.get(name);

    const priority = priorities.get(name) ?? "low";

    products.push({
      id: `product-${idx++}`,
      name,
      category: planItem?.category ?? "General",
      currentStock: planItem?.stockActual ?? 0,
      predictedDemand: avgPredicted,
      recommendedQty: planItem?.recommendedQuantity ?? Math.ceil(agg.total),
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
      upper: r.upperBound ?? null,
      lower: r.lowerBound ?? null,
    };
  });
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
    point.upper = p.upper ?? null;
    point.lower = p.lower ?? null;
  }
  const weeks = new Map<string, ChartPoint>();
  for (const [day, point] of [...days.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const date = new Date(day + "T00:00:00Z");
    date.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 6) % 7);
    const key = date.toISOString().slice(0, 10);
    const end = new Date(date);
    end.setUTCDate(end.getUTCDate() + 6);
    const format = (value: Date) => value.toLocaleDateString("es-ES", { day: "numeric", month: "short", timeZone: "UTC" });
    if (!weeks.has(key)) weeks.set(key, {
      date: `${format(date)}–${format(end)}`,
      weekRange: `Semana del ${format(date)} al ${format(end)} · total semanal`,
      historical: null, predicted: null, upper: null, lower: null,
    });
    const week = weeks.get(key)!;
    for (const field of ["historical", "predicted", "upper", "lower"] as const) {
      if (point[field] != null) week[field] = (week[field] ?? 0) + point[field]!;
    }
  }
  return [...weeks.values()];
}


// ─── Extract overall accuracy from metrics ────────────────────────────────────

export function extractAccuracy(metrics: PredictionMetricResponse[]): number | null {
  const overall = metrics.find((m) =>
    (m.scope === "Overall" || (m.scope == null && m.productName == null)) &&
    (m.method == null || m.method === "XGBoost"));
  if (overall?.volumeAccuracy == null || !Number.isFinite(overall.volumeAccuracy)) return null;
  return Math.max(0, Math.round(overall.volumeAccuracy * 10) / 10);
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
