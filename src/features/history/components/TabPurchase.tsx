import { AlertCircle, TrendingUp, Package, Calendar, Search, Loader2, ClipboardCheck } from "lucide-react";
import { Paginator } from "@/shared/components/Paginator";
import { priorityConfig } from "@/shared/constants/priority";
import type { DashboardSummaryResponse, DashboardProductRow } from "@/shared/types/api";

const PAGE = 10;

interface Props {
  summary: DashboardSummaryResponse;
  productsLoading: boolean;
  filterPriority: string;
  setFilterPriority: (p: string) => void;
  planSearch: string;
  setPlanSearch: (s: string) => void;
  planPage: number;
  setPlanPage: (p: number) => void;
  planItems: DashboardProductRow[];
  paginatedPlan: DashboardProductRow[];
  setActiveTab: (t: "dashboard" | "purchase" | "evaluation") => void;
}

export function TabPurchase({
  summary, productsLoading,
  filterPriority, setFilterPriority,
  planSearch, setPlanSearch,
  planPage, setPlanPage,
  planItems, paginatedPlan,
  setActiveTab,
}: Props) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div>
          <h2 className="text-gray-900 mb-1" style={{ fontWeight: 600 }}>Plan de compras recomendado</h2>
          <p className="text-gray-400" style={{ fontSize: "0.875rem" }}>
            Basado en la predicción para los {summary.forecastPeriod} días seleccionados
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total productos",    value: summary.totalProducts.toString(),   icon: Package,    color: "text-blue-500",   bg: "bg-blue-500/10 border-blue-500/20" },
          { label: "Ítems críticos",     value: summary.criticalCount.toString(),   icon: AlertCircle, color: "text-red-500",   bg: "bg-red-500/10 border-red-500/20" },
          { label: "Inversión estimada", value: "—",                                icon: TrendingUp,  color: "text-purple-500", bg: "bg-purple-500/10 border-purple-500/20" },
          { label: "Horizonte del plan", value: `${summary.forecastPeriod ?? "—"} días`, icon: Calendar, color: "text-orange-500", bg: "bg-orange-500/10 border-orange-500/20" },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border ${stat.bg}`}>
                <Icon className={`h-6 w-6 ${stat.color}`} />
              </div>
              <div>
                <p className="text-gray-400 mb-0.5" style={{ fontSize: "0.75rem" }}>{stat.label}</p>
                <p className="text-gray-900" style={{ fontSize: "1.375rem", fontWeight: 700, lineHeight: 1.1 }}>{stat.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-2 flex-wrap">
          {["all", "critical", "high", "medium", "low"].map((pri) => {
            const labels: Record<string, string> = { all: "Todos", critical: "Crítico", high: "Alto", medium: "Medio", low: "Bajo" };
            return (
              <button key={pri} onClick={() => { setFilterPriority(pri); setPlanPage(1); }}
                className={`rounded-lg border px-3 py-1.5 transition-all ${
                  filterPriority === pri
                    ? "border-cyan-500/50 bg-cyan-500/10 text-cyan-500"
                    : "border-gray-300 bg-white text-gray-500 hover:text-gray-700"
                }`}
                style={{ fontSize: "0.8125rem" }}>
                {labels[pri]}
              </button>
            );
          })}
        </div>
        <div className="relative ml-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <input type="text" placeholder="Buscar producto..." value={planSearch}
            onChange={(e) => { setPlanSearch(e.target.value); setPlanPage(1); }}
            className="w-56 rounded-xl border border-gray-300 bg-white pl-8 pr-3 py-2 text-gray-900 placeholder:text-gray-400 outline-none focus:border-cyan-500/60 transition-colors"
            style={{ fontSize: "0.8125rem" }} />
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        {productsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 text-cyan-500 animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {["Producto", "Cant. Total Prevista", "Cant. Diaria", "Prioridad"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-gray-400" style={{ fontSize: "0.75rem", fontWeight: 500 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginatedPlan.map((p) => {
                  const pConf = priorityConfig[p.priority];
                  return (
                    <tr key={p.productName} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-900" style={{ fontSize: "0.8125rem", fontWeight: 500 }}>{p.productName}</td>
                      <td className="px-4 py-3 text-cyan-500" style={{ fontSize: "0.8125rem", fontWeight: 600 }}>{Math.round(p.totalPredictedQuantity)} uds</td>
                      <td className="px-4 py-3 text-gray-500" style={{ fontSize: "0.8125rem" }}>{Math.round(p.avgPredictedQuantity)} uds/día</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 ${pConf.bg} ${pConf.border} ${pConf.color}`}
                          style={{ fontSize: "0.6875rem", fontWeight: 500 }}>
                          <span className={`h-1.5 w-1.5 rounded-full ${pConf.dot}`} />
                          {pConf.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {paginatedPlan.length === 0 && (
                  <tr><td colSpan={4} className="py-8 text-center text-gray-400" style={{ fontSize: "0.875rem" }}>No se encontraron productos</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        {planItems.length > PAGE && (
          <Paginator page={planPage} total={planItems.length} pageSize={PAGE} onChange={setPlanPage} />
        )}
      </div>

      <div className="rounded-2xl border border-gray-100 bg-gray-50 px-6 py-4 flex items-center gap-3">
        <ClipboardCheck className="h-4 w-4 text-gray-400 shrink-0" />
        <p className="text-gray-400" style={{ fontSize: "0.8125rem" }}>
          Para comparar este plan con las ventas reales del período, ve a la pestaña{" "}
          <button onClick={() => setActiveTab("evaluation")} className="text-cyan-600 hover:underline font-medium">
            Evaluación del plan
          </button>.
        </p>
      </div>
    </div>
  );
}
