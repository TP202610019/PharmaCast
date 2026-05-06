import { useParams, useNavigate } from "react-router";
import {
  ArrowLeft,
  Calendar,
  Clock,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Download,
  Package,
  DollarSign,
  BarChart3,
  CheckCircle2,
  Archive,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useState } from "react";
import { mockHistory } from "../data/mockData";

const priorityConfig = {
  critical: { label: "Crítico", color: "text-red-500", bg: "bg-red-500/10", border: "border-red-500/30", dot: "bg-red-500" },
  high: { label: "Alto", color: "text-orange-500", bg: "bg-orange-500/10", border: "border-orange-500/30", dot: "bg-orange-500" },
  medium: { label: "Medio", color: "text-yellow-500", bg: "bg-yellow-500/10", border: "border-yellow-500/30", dot: "bg-yellow-500" },
  low: { label: "Bajo", color: "text-cyan-500", bg: "bg-cyan-500/10", border: "border-cyan-500/30", dot: "bg-cyan-500" },
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-lg">
        <p className="text-gray-500 mb-1" style={{ fontSize: "0.75rem" }}>{label}</p>
        {payload.map((p: any) => (
          <p key={p.name} style={{ color: p.color, fontSize: "0.8125rem", fontWeight: 500 }}>
            {p.name === "historical" ? "Histórico" : "Predicción"}: {p.value} uds
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export function HistoryDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"dashboard" | "purchase">("dashboard");

  const record = mockHistory.find((r) => r.id === id);

  if (!record) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 border border-gray-200">
          <AlertCircle className="h-7 w-7 text-gray-300" />
        </div>
        <p className="text-gray-500">Predicción no encontrada</p>
        <button
          onClick={() => navigate("/history")}
          className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
          style={{ fontSize: "0.875rem" }}
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al historial
        </button>
      </div>
    );
  }

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("es-ES", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  const isCompleted = record.status === "completed";

  return (
    <div className="min-h-[calc(100vh-4rem)] px-6 py-8 max-w-6xl mx-auto">
      {/* Back button + header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div className="flex items-start gap-4">
          <button
            onClick={() => navigate("/history")}
            className="flex items-center gap-1.5 text-gray-400 hover:text-gray-900 transition-colors mt-1"
            style={{ fontSize: "0.875rem" }}
          >
            <ArrowLeft className="h-4 w-4" />
            Historial
          </button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-gray-900" style={{ fontWeight: 700 }}>
                Predicción {record.id}
              </h1>
              <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${
                isCompleted
                  ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-500"
                  : "bg-gray-100 border-gray-200 text-gray-500"
              }`}>
                {isCompleted ? <CheckCircle2 className="h-3 w-3" /> : <Archive className="h-3 w-3" />}
                {isCompleted ? "Completado" : "Archivado"}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 text-gray-400">
                <Calendar className="h-3.5 w-3.5" />
                <span style={{ fontSize: "0.8125rem" }}>{formatDate(record.date)}</span>
              </div>
              <div className="flex items-center gap-1.5 text-gray-400">
                <Clock className="h-3.5 w-3.5" />
                <span style={{ fontSize: "0.8125rem" }}>{record.forecastPeriod} días de predicción</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-500 hover:text-gray-900 hover:border-gray-400 transition-all"
            style={{ fontSize: "0.8125rem" }}>
            <Download className="h-4 w-4" />
            Exportar CSV
          </button>
          <button className="flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 text-white hover:bg-cyan-400 transition-all"
            style={{ fontSize: "0.8125rem", fontWeight: 600 }}>
            <Download className="h-4 w-4" />
            Exportar PDF
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-gray-200 bg-gray-100 p-1 w-fit mb-8">
        {[
          { id: "dashboard", label: "Dashboard", icon: BarChart3 },
          { id: "purchase", label: "Plan de compras", icon: Package },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 transition-all ${
                activeTab === tab.id
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
              style={{ fontSize: "0.875rem", fontWeight: activeTab === tab.id ? 500 : 400 }}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* DASHBOARD TAB */}
      {activeTab === "dashboard" && (
        <div className="space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {record.summaryCards.map((card) => (
              <div key={card.label} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <p className="text-gray-400 mb-2" style={{ fontSize: "0.75rem" }}>{card.label}</p>
                <p className="text-gray-900 mb-2" style={{ fontSize: "1.25rem", fontWeight: 700 }}>{card.value}</p>
                <div className={`flex items-center gap-1 ${card.positive ? "text-cyan-500" : "text-red-500"}`}>
                  {card.positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  <span style={{ fontSize: "0.75rem", fontWeight: 500 }}>{card.change}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Chart */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-gray-900 mb-1" style={{ fontWeight: 600 }}>
                  Demanda histórica vs predicción
                </h3>
                <p className="text-gray-400" style={{ fontSize: "0.8125rem" }}>
                  {record.forecastPeriod} días predichos · {formatDate(record.date)}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-6 rounded-full bg-blue-500" />
                  <span className="text-gray-500" style={{ fontSize: "0.75rem" }}>Histórico</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-6 rounded-full bg-cyan-500" />
                  <span className="text-gray-500" style={{ fontSize: "0.75rem" }}>Predicción</span>
                </div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={record.chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "#9ca3af", fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: "#e5e7eb" }}
                  interval={6}
                />
                <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="historical" stroke="#3b82f6" strokeWidth={2} dot={false} connectNulls={false} />
                <Line type="monotone" dataKey="predicted" stroke="#06b6d4" strokeWidth={2} dot={false} strokeDasharray="6 3" connectNulls={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Predicted table */}
          {record.products.length > 0 && (
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="text-gray-900 mb-4" style={{ fontWeight: 600 }}>Valores predichos</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100">
                      {["Producto", "Categoría", "Stock actual", "Demanda predicha", "Diferencia"].map((h) => (
                        <th key={h} className="pb-3 text-left text-gray-400" style={{ fontSize: "0.75rem", fontWeight: 500 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {record.products.map((p) => {
                      const diff = p.predictedDemand - p.currentStock;
                      return (
                        <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="py-3 text-gray-900" style={{ fontSize: "0.8125rem", fontWeight: 500 }}>{p.name}</td>
                          <td className="py-3 text-gray-500" style={{ fontSize: "0.8125rem" }}>{p.category}</td>
                          <td className="py-3 text-gray-500" style={{ fontSize: "0.8125rem" }}>{p.currentStock} uds</td>
                          <td className="py-3 text-cyan-500" style={{ fontSize: "0.8125rem" }}>{p.predictedDemand} uds</td>
                          <td className="py-3" style={{ fontSize: "0.8125rem" }}>
                            <span className={diff > 0 ? "text-red-500" : "text-cyan-500"}>
                              {diff > 0 ? "+" : ""}{diff} uds
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* PURCHASE PLAN TAB */}
      {activeTab === "purchase" && (
        <div className="space-y-6">
          {record.products.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-20 text-center rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 border border-gray-200">
                <Package className="h-6 w-6 text-gray-300" />
              </div>
              <p className="text-gray-500">Plan de compras no disponible</p>
              <p className="text-gray-400" style={{ fontSize: "0.8125rem" }}>
                Los datos detallados de este análisis han sido archivados
              </p>
            </div>
          ) : (
            <>
              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Total productos", value: record.products.length.toString(), icon: Package, color: "text-blue-500", bg: "bg-blue-500/10" },
                  { label: "Items críticos", value: record.products.filter(p => p.priority === "critical").length.toString(), icon: AlertCircle, color: "text-red-500", bg: "bg-red-500/10" },
                  { label: "Unidades totales", value: record.products.reduce((s, p) => s + p.recommendedQty, 0).toLocaleString(), icon: BarChart3, color: "text-cyan-500", bg: "bg-cyan-500/10" },
                  { label: "Costo estimado", value: `$${record.products.reduce((s, p) => s + p.recommendedQty * p.unitCost, 0).toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`, icon: DollarSign, color: "text-yellow-500", bg: "bg-yellow-500/10" },
                ].map((stat) => {
                  const Icon = stat.icon;
                  return (
                    <div key={stat.label} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${stat.bg} mb-3`}>
                        <Icon className={`h-4 w-4 ${stat.color}`} />
                      </div>
                      <p className="text-gray-900" style={{ fontSize: "1.25rem", fontWeight: 700 }}>{stat.value}</p>
                      <p className="text-gray-400 mt-0.5" style={{ fontSize: "0.75rem" }}>{stat.label}</p>
                    </div>
                  );
                })}
              </div>

              {/* Table */}
              <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50">
                        {["Producto", "Categoría", "Stock actual", "Demanda predicha", "Cant. recomendada", "Prioridad", "Costo estimado"].map((h) => (
                          <th key={h} className="px-4 py-3 text-left text-gray-400" style={{ fontSize: "0.75rem", fontWeight: 500 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {record.products.map((product) => {
                        const pConf = priorityConfig[product.priority];
                        const isCritical = product.priority === "critical";
                        return (
                          <tr key={product.id} className={`border-b border-gray-50 hover:bg-gray-50 ${isCritical ? "bg-red-500/[0.02]" : ""}`}>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                {isCritical && <span className="h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" />}
                                <span className="text-gray-900" style={{ fontSize: "0.8125rem", fontWeight: 500 }}>{product.name}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-gray-500" style={{ fontSize: "0.8125rem" }}>{product.category}</td>
                            <td className="px-4 py-3 text-gray-500" style={{ fontSize: "0.8125rem" }}>{product.currentStock}</td>
                            <td className="px-4 py-3 text-cyan-500" style={{ fontSize: "0.8125rem" }}>{product.predictedDemand}</td>
                            <td className="px-4 py-3">
                              <span className="text-gray-900" style={{ fontSize: "0.875rem", fontWeight: 600 }}>
                                {product.recommendedQty} uds
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 ${pConf.bg} ${pConf.border} ${pConf.color}`}
                                style={{ fontSize: "0.6875rem", fontWeight: 500 }}>
                                <span className={`h-1.5 w-1.5 rounded-full ${pConf.dot}`} />
                                {pConf.label}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-gray-500" style={{ fontSize: "0.8125rem" }}>
                              ${(product.recommendedQty * product.unitCost).toFixed(2)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="border-t border-gray-100 bg-gray-50">
                      <tr>
                        <td colSpan={6} className="px-4 py-3 text-right text-gray-500" style={{ fontSize: "0.8125rem" }}>
                          Total estimado:
                        </td>
                        <td className="px-4 py-3 text-cyan-500" style={{ fontSize: "0.9375rem", fontWeight: 700 }}>
                          ${record.products.reduce((s, p) => s + p.recommendedQty * p.unitCost, 0).toFixed(2)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
