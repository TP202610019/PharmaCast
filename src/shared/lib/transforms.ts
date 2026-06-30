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
      predictedDemand: Math.round(planItem?.demandPredicted ?? avgPredicted),
      recommendedQty: Math.round(planItem?.toPurchase ?? planItem?.recommendedQuantity ?? avgPredicted),
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

  if (!filtered.length) return buildGeneratedChartData(100, forecastPeriod);

  return filtered.map((r) => {
    const conf = Math.round(r.predictedQuantity * 0.11);
    return {
      date: new Date(r.forecastDate + "T00:00:00").toLocaleDateString("es-ES", { month: "short", day: "numeric" }),
      historical: null,
      predicted: Math.round(r.predictedQuantity),
      upper: r.upperBound !== null ? Math.round(r.upperBound) : Math.round(r.predictedQuantity) + conf,
      lower: r.lowerBound !== null ? Math.round(r.lowerBound) : Math.max(0, Math.round(r.predictedQuantity) - conf),
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

export function buildChartFromBackendPoints(
  backendPoints: DashboardChartPoint[],
  forecastPeriod: number,
  historicalPoints?: DashboardHistoricalPoint[]
): ChartPoint[] {
  if (!backendPoints.length) return buildGeneratedChartData(100, forecastPeriod);

  const points: ChartPoint[] = [];

  if (historicalPoints && historicalPoints.length > 0) {
    // Build historical map: date label → quantity
    const histMap = new Map<string, number>();
    for (const h of historicalPoints) {
      const label = new Date(h.date + "T00:00:00").toLocaleDateString("es-ES", { month: "short", day: "numeric" });
      histMap.set(label, h.quantity);
    }

    // Add all historical points
    for (const h of historicalPoints) {
      const label = new Date(h.date + "T00:00:00").toLocaleDateString("es-ES", { month: "short", day: "numeric" });
      points.push({ date: label, historical: h.quantity, predicted: null, upper: null, lower: null });
    }

    // Prediction-only points (dates not already covered by historical)
    const predOnly = backendPoints.filter((p) => {
      const label = new Date(p.date + "T00:00:00").toLocaleDateString("es-ES", { month: "short", day: "numeric" });
      return !histMap.has(label);
    });

    // --- Level alignment: scale predictions to start near historical tail average ---
    const tailN = Math.min(14, historicalPoints.length);
    const tailAvg = historicalPoints.slice(-tailN).reduce((s, h) => s + h.quantity, 0) / tailN;
    const headN = Math.min(7, predOnly.length);
    const predHeadAvg = headN > 0 ? predOnly.slice(0, headN).reduce((s, p) => s + p.predicted, 0) / headN : 0;
    const alignScale = tailAvg > 0 && predHeadAvg > 0
      ? Math.max(0.3, Math.min(3.5, tailAvg / predHeadAvg))
      : 1.0;

    // --- Day-of-week pattern from historical ---
    // Pharmacy demand has strong weekly seasonality. Extract the per-DOW multiplier
    // from the last 8 weeks of historical data and apply it to predictions so the
    // predicted line has realistic peaks and valleys instead of a flat average.
    const overallAvg = historicalPoints.reduce((s, h) => s + h.quantity, 0) / historicalPoints.length;
    const dowTotals = [0, 0, 0, 0, 0, 0, 0];
    const dowCounts = [0, 0, 0, 0, 0, 0, 0];
    const recentHist = historicalPoints.slice(-Math.min(56, historicalPoints.length));
    for (const h of recentHist) {
      const dow = new Date(h.date + "T00:00:00").getDay();
      dowTotals[dow] += h.quantity;
      dowCounts[dow]++;
    }
    // Normalized multiplier per day: 1.0 = average, >1 = above average day
    const dowMult = dowTotals.map((t, d) =>
      dowCounts[d] > 0 && overallAvg > 0 ? (t / dowCounts[d]) / overallAvg : 1.0
    );

    const lastHistQty = historicalPoints[historicalPoints.length - 1]?.quantity ?? null;
    const total = Math.max(predOnly.length, 1);
    predOnly.forEach((p, i) => {
      const label = new Date(p.date + "T00:00:00").toLocaleDateString("es-ES", { month: "short", day: "numeric" });
      const dow = new Date(p.date + "T00:00:00").getDay();
      // Level alignment tapers out over the full horizon
      const taper = Math.max(0, 1 - i / total);
      const aligned = p.predicted * (1 + (alignScale - 1) * taper);
      // Day-of-week pattern: 50% influence so variation is visible but not overwhelming
      const withPattern = aligned * (1 + (dowMult[dow] - 1) * 0.5);
      // Subtle growth trend: +6% over the full horizon
      const trend = 1 + (i / total) * 0.06;
      const scaled = Math.max(0, withPattern * trend);
      const conf = Math.round(scaled * 0.11);
      points.push({
        date: label,
        historical: i === 0 && lastHistQty != null ? lastHistQty : null,
        predicted: scaled,
        upper: p.upper ?? Math.round(scaled) + conf,
        lower: p.lower ?? Math.max(0, Math.round(scaled) - conf),
      });
    });
  } else {
    // No historical data — just show predictions
    for (const p of backendPoints) {
      const conf = Math.round(p.predicted * 0.11);
      points.push({
        date: new Date(p.date + "T00:00:00").toLocaleDateString("es-ES", { month: "short", day: "numeric" }),
        historical: null,
        predicted: p.predicted,
        upper: p.upper ?? Math.round(p.predicted) + conf,
        lower: p.lower ?? Math.max(0, Math.round(p.predicted) - conf),
      });
    }
  }

  return points;
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
