import type { PredictionResponse, PredictionMetricResponse } from "@/shared/types/api";
import { MetricScope, PredictionMethod } from "@/shared/types/api";
import { isXGBoostMetric } from "@/shared/lib/transforms";

const formatDate = (value?: string | null) => value
  ? new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString("es-PE")
  : "—";

export function PredictionMetrics({ prediction }: { prediction: PredictionResponse }) {
  const overall = (m: PredictionMetricResponse) => m.scope === MetricScope.Overall || !m.productName;
  const model = prediction.metrics.find((m) => isXGBoostMetric(m) && overall(m));
  const baseline = prediction.baselineMetrics?.find(overall) ?? prediction.metrics.find((m) => m.method === PredictionMethod.NaiveWeekly && overall(m));
  const forecastDates = prediction.forecastResults.map((r) => r.forecastDate).sort();
  const dates = [
    ["Entrenamiento", prediction.trainingPeriodStart, prediction.trainingPeriodEnd],
    ["Evaluación", prediction.evaluationPeriodStart, prediction.evaluationPeriodEnd],
    ["Pronóstico", forecastDates[0], forecastDates[forecastDates.length - 1]],
  ];
  const formatMetric = (value: number | null | undefined, percent: boolean) =>
    value == null || !Number.isFinite(value) ? "—" : `${value.toLocaleString("es-PE", { maximumFractionDigits: 2 })}${percent ? "%" : ""}`;

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 space-y-3">
      {prediction.warnings?.map((warning, index) => <p role="status" key={index} className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{warning}</p>)}
      <h2 className="font-semibold text-gray-900">Evaluación del modelo</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead><tr className="text-gray-500"><th className="py-2">Método</th><th>WAPE</th><th>MAE</th><th>RMSE</th><th>MBE</th></tr></thead>
          <tbody>
            {[["XGBoost", model], ["Base semanal (NaiveWeekly)", baseline]].map(([label, metric]) => {
              const m = metric as PredictionMetricResponse | undefined;
              return <tr key={label as string} className="border-t border-gray-100 text-gray-700">
                <th className="py-2 font-medium">{label as string}</th>
                <td>{formatMetric(m?.wape, true)}</td><td>{formatMetric(m?.mae, false)}</td>
                <td>{formatMetric(m?.rmse, false)}</td><td>{formatMetric(m?.mbe, false)}</td>
              </tr>;
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-500">Menor WAPE, MAE y RMSE indica menor error; MBE cercano a cero indica menor sesgo.</p>
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-500">
        {dates.filter(([, start, end]) => start || end).map(([label, start, end]) =>
          <p key={label}>{label}: {formatDate(start)} – {formatDate(end)}</p>)}
      </div>
    </section>
  );
}
