import { Download, AlertCircle, TrendingUp, Package, ShoppingCart, Search } from "lucide-react";
import { downloadCsv, downloadPdf } from "@/shared/lib/exportUtils";
import { Paginator } from "@/shared/components/Paginator";
import { priorityConfig } from "../constants";
import type { UIProduct } from "@/shared/lib/transforms";

interface Props {
  products: UIProduct[];
  totalUnits: number;
  forecastDays: number;
  filterPriority: string;
  setFilterPriority: (p: string) => void;
  planSearch: string;
  setPlanSearch: (s: string) => void;
  planTablePage: number;
  setPlanTablePage: (p: number) => void;
  searchedPlanProducts: UIProduct[];
  paginatedPlanProducts: UIProduct[];
}

export function StepPurchasePlan({
  products, totalUnits, forecastDays,
  filterPriority, setFilterPriority,
  planSearch, setPlanSearch,
  planTablePage, setPlanTablePage,
  searchedPlanProducts, paginatedPlanProducts,
}: Props) {
  const showStock = products.some((p) => p.hasInventory);

  const exportHeaders = [
    "Producto", "Categoría", "Demanda predicha (uds)",
    ...(showStock ? ["Stock actual (uds)", "A comprar (uds)"] : ["Cant. recomendada (uds)"]),
    "Prioridad",
  ];

  const exportRows = products.map((p) => [
    p.name, p.category, p.predictedDemand,
    ...(showStock ? [p.hasInventory ? p.currentStock : "—", p.recommendedQty] : [p.recommendedQty]),
    priorityConfig[p.priority].label,
  ]);

  const tableHeaders = [
    "Producto", "Categoría", "Demanda predicha",
    ...(showStock ? ["Stock actual", "A comprar"] : ["Cant. recomendada"]),
    "Prioridad",
  ];

  return (
    <div className="space-y-6">
      {/* Header + export buttons */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div>
          <h2 className="text-gray-900 mb-1" style={{ fontWeight: 600 }}>Plan de compras recomendado</h2>
          <p className="text-gray-400" style={{ fontSize: "0.875rem" }}>Basado en la predicción para los próximos {forecastDays} días</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => downloadCsv(`plan-compras-${new Date().toISOString().slice(0, 10)}.csv`, exportHeaders, exportRows)}
            className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-500 hover:text-gray-900 hover:border-gray-400 transition-all"
            style={{ fontSize: "0.8125rem" }}>
            <Download className="h-4 w-4" />
            Exportar CSV
          </button>
          <button
            onClick={() => downloadPdf(
              `plan-compras-${new Date().toISOString().slice(0, 10)}.pdf`,
              "Plan de compras recomendado",
              `Predicción para los próximos ${forecastDays} días — generado el ${new Date().toLocaleDateString("es-ES")}`,
              exportHeaders, exportRows,
            )}
            className="flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 text-white hover:bg-cyan-400 transition-all"
            style={{ fontSize: "0.8125rem", fontWeight: 600 }}>
            <Download className="h-4 w-4" />
            Exportar PDF
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total productos",  value: products.length.toString(),                                        icon: Package,    color: "text-blue-500",   bg: "bg-blue-500/10 border-blue-500/20" },
          { label: "Items críticos",   value: products.filter((p) => p.priority === "critical").length.toString(), icon: AlertCircle, color: "text-red-500",    bg: "bg-red-500/10 border-red-500/20" },
          { label: "Items altos",      value: products.filter((p) => p.priority === "high").length.toString(),    icon: TrendingUp,  color: "text-orange-500", bg: "bg-orange-500/10 border-orange-500/20" },
          { label: "Unidades totales", value: totalUnits.toLocaleString(),                                       icon: ShoppingCart, color: "text-cyan-500",  bg: "bg-cyan-500/10 border-cyan-500/20" },
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

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-2 flex-wrap">
          {["all", "critical", "high", "medium", "low"].map((p) => (
            <button key={p}
              onClick={() => { setFilterPriority(p); setPlanTablePage(1); }}
              className={`rounded-lg border px-3 py-1.5 transition-all ${filterPriority === p ? "border-cyan-500/50 bg-cyan-500/10 text-cyan-500" : "border-gray-300 bg-white text-gray-500 hover:text-gray-700"}`}
              style={{ fontSize: "0.8125rem" }}>
              {p === "all" ? "Todos" : priorityConfig[p as keyof typeof priorityConfig].label}
            </button>
          ))}
        </div>
        <div className="relative ml-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <input type="text" placeholder="Buscar producto..." value={planSearch}
            onChange={(e) => { setPlanSearch(e.target.value); setPlanTablePage(1); }}
            className="w-56 rounded-xl border border-gray-300 bg-white pl-8 pr-3 py-2 text-gray-900 placeholder:text-gray-400 outline-none focus:border-cyan-500/60 transition-colors"
            style={{ fontSize: "0.8125rem" }} />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {tableHeaders.map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-gray-400" style={{ fontSize: "0.75rem", fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedPlanProducts.map((product) => {
                const pConf = priorityConfig[product.priority];
                const isCritical = product.priority === "critical";
                return (
                  <tr key={product.id}
                    className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${isCritical ? "bg-red-500/[0.02]" : ""}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {isCritical && <span className="h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" />}
                        <span className="text-gray-900" style={{ fontSize: "0.8125rem", fontWeight: 500 }}>{product.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500" style={{ fontSize: "0.8125rem" }}>{product.category}</td>
                    <td className="px-4 py-3 text-cyan-500" style={{ fontSize: "0.8125rem" }}>{product.predictedDemand} uds</td>
                    {showStock ? (
                      <>
                        <td className="px-4 py-3 text-gray-500" style={{ fontSize: "0.8125rem" }}>
                          {product.hasInventory ? `${product.currentStock} uds` : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-gray-900" style={{ fontSize: "0.875rem", fontWeight: 600 }}>{product.recommendedQty} uds</span>
                        </td>
                      </>
                    ) : (
                      <td className="px-4 py-3">
                        <span className="text-gray-900" style={{ fontSize: "0.875rem", fontWeight: 600 }}>{product.recommendedQty} uds</span>
                      </td>
                    )}
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
              {paginatedPlanProducts.length === 0 && (
                <tr>
                  <td colSpan={tableHeaders.length} className="py-8 text-center text-gray-400" style={{ fontSize: "0.875rem" }}>
                    No se encontraron productos
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Paginator page={planTablePage} total={searchedPlanProducts.length} pageSize={10} onChange={setPlanTablePage} />
      </div>
    </div>
  );
}
