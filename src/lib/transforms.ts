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
  category: string | null;
  currentStock: number;
  predictedDemand: number;
  recommendedQty: number;
  hasInventory: boolean;
  priority: PurchasePlanItemResponse["priority"];
  historicalAvg: number | null;
  totalPredicted: number;
}

// ─── Derive UI products from forecast results ─────────────────────────────────

export function forecastResultsToProducts(
  forecastResults: ForecastResultResponse[],
  purchasePlanItems: PurchasePlanItemResponse[],
  metrics?: PredictionMetricResponse[],
  forecastPeriod?: number,
  preferSavedDemand = false
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
    const planItem = planMap.get(name);
    const totalPredicted = preferSavedDemand ? planItem?.demandPredicted ?? agg.total : agg.total;
    const avgPredicted = totalPredicted / Math.max(forecastPeriod ?? agg.count, 1);


    products.push({
      id: `product-${idx++}`,
      name,
      category: planItem?.category ?? null,
      currentStock: planItem?.stockActual ?? 0,
      predictedDemand: avgPredicted,
      recommendedQty: planItem?.recommendedQuantity ?? Math.ceil(agg.total),
      hasInventory: planItem?.stockActual != null,
      priority: planItem?.priority ?? null,
      historicalAvg: historicalMap.get(name) ?? null,
      totalPredicted,
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
  // New forecasts already contain model-generated weekly blocks. Preserve each
  // block, including a final partial week; never regroup its total by weekday.
  if (backendPoints.some(p => p.periodEnd != null)) {
    const forecast = [...backendPoints].sort((a, b) => a.date.localeCompare(b.date));
    const origin = new Date(forecast[0].date.slice(0, 10) + "T00:00:00Z").getTime();
    const dayMs = 86400000;
    const history = new Map<number, number>();
    for (const point of historicalPoints) {
      const time = new Date(point.date.slice(0, 10) + "T00:00:00Z").getTime();
      const block = Math.floor((time - origin) / (7 * dayMs));
      history.set(block, (history.get(block) ?? 0) + point.quantity);
    }
    const range = (start: string, end: string) => `${formatChartDate(start)}–${formatChartDate(end)}`;
    const past: ChartPoint[] = [...history.entries()].sort(([a], [b]) => a - b).map(([block, quantity]) => {
      const start = new Date(origin + block * 7 * dayMs).toISOString();
      const end = new Date(origin + (block * 7 + 6) * dayMs).toISOString();
      return { date: range(start, end), weekRange: range(start, end), historical: quantity, predicted: null, upper: null, lower: null };
    });
    return [...past, ...forecast.map(p => ({ date: range(p.date, p.periodEnd!), weekRange: range(p.date, p.periodEnd!),
      historical: null, predicted: p.predicted, upper: p.upper ?? null, lower: p.lower ?? null }))];
  }
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
    m.scope === "Overall" && m.method === "XGBoost");
  if (overall?.volumeAccuracy == null || !Number.isFinite(overall.volumeAccuracy)) return null;
  return Math.round(overall.volumeAccuracy * 10) / 10;
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
  criticalCount: number | null;
  id: string;
  date: string;
  forecastPeriod: number;
  totalProducts: number | null;
  accuracy: number | null;
  totalUnits: number | null;
  status: ExecutionStatus;
  datasetName: string;
}

export function summaryToUIRecord(s: PredictionSummaryResponse): PredictionUIRecord {
  return {
    id: s.id,
    date: s.createdAt,
    forecastPeriod: s.forecastPeriod,
    totalProducts: s.totalProducts ?? null,
    criticalCount: s.criticalCount ?? null,
    accuracy: s.accuracy ?? null,
    totalUnits: s.totalUnits ?? null,
    status: s.executionStatus,
    datasetName: s.datasetName,
  };
}
