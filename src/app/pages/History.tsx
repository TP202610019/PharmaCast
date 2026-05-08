import { useState } from "react";
import { useNavigate } from "react-router";
import {
  Calendar,
  Clock,
  TrendingUp,
  AlertCircle,
  ChevronRight,
  Search,
  Filter,
  BarChart3,
  Package,
} from "lucide-react";
import { motion } from "motion/react";
import { mockHistory } from "../data/mockData";

const periodLabel = (days: number) => `${days} días`;

export function History() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [filterPeriod, setFilterPeriod] = useState<string>("all");

  const filtered = mockHistory.filter((rec) => {
    const matchSearch =
      search === "" ||
      rec.date.includes(search) ||
      rec.totalProducts.toString().includes(search);
    const matchPeriod = filterPeriod === "all" || rec.forecastPeriod.toString() === filterPeriod;
    return matchSearch && matchPeriod;
  });

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("es-ES", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  const avgAccuracy =
    mockHistory.reduce((s, r) => s + r.accuracy, 0) / mockHistory.length;

  return (
    <div className="min-h-[calc(100vh-4rem)] px-6 py-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-gray-900 mb-1" style={{ fontWeight: 700 }}>
          Historial de predicciones
        </h1>
        <p className="text-gray-400" style={{ fontSize: "0.875rem" }}>
          Consulta y exporta resultados de análisis anteriores
        </p>
      </div>

      {/* Summary stats — Precisión promedio is 4th */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total predicciones", value: mockHistory.length.toString(), icon: BarChart3, color: "text-blue-500", bg: "bg-blue-500/10 border-blue-500/20" },
          { label: "Productos analizados", value: mockHistory.reduce((s, r) => s + r.totalProducts, 0).toString(), icon: Package, color: "text-purple-500", bg: "bg-purple-500/10 border-purple-500/20" },
          { label: "Items críticos total", value: mockHistory.reduce((s, r) => s + r.criticalItems, 0).toString(), icon: AlertCircle, color: "text-red-500", bg: "bg-red-500/10 border-red-500/20" },
          { label: "Precisión promedio", value: `${avgAccuracy.toFixed(1)}%`, icon: TrendingUp, color: "text-cyan-500", bg: "bg-cyan-500/10 border-cyan-500/20" },
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
      <div className="flex flex-wrap gap-3 mb-6 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por fecha o código..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-gray-300 bg-white pl-9 pr-4 py-2.5 text-gray-900 placeholder:text-gray-400 outline-none focus:border-cyan-500/60 transition-colors"
            style={{ fontSize: "0.875rem" }}
          />
        </div>

        {/* Period filter */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <div className="flex gap-1.5">
            {["all", "30", "60", "90"].map((p) => (
              <button
                key={p}
                onClick={() => setFilterPeriod(p)}
                className={`rounded-lg border px-3 py-2 transition-all ${
                  filterPeriod === p
                    ? "border-cyan-500/50 bg-cyan-500/10 text-cyan-500"
                    : "border-gray-300 bg-white text-gray-500 hover:text-gray-700"
                }`}
                style={{ fontSize: "0.8125rem" }}
              >
                {p === "all" ? "Todos" : `${p}d`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results count */}
      <p className="text-gray-400 mb-4" style={{ fontSize: "0.8125rem" }}>
        {filtered.length} resultado{filtered.length !== 1 ? "s" : ""}
      </p>

      {/* Cards grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 border border-gray-200">
            <Search className="h-7 w-7 text-gray-300" />
          </div>
          <p className="text-gray-500">No se encontraron predicciones</p>
          <p className="text-gray-400" style={{ fontSize: "0.8125rem" }}>
            Intenta cambiar los filtros de búsqueda
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((record, i) => (
            <motion.button
              key={record.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.06 }}
              onClick={() => navigate(`/history/${record.id}`)}
              className="text-left rounded-2xl border border-gray-200 bg-white p-5 hover:border-gray-300 hover:shadow-md transition-all group shadow-sm"
            >
              {/* Card header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-gray-400 mb-1" style={{ fontSize: "0.75rem" }}>
                    ID: {record.id}
                  </p>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-gray-400" />
                    <p className="text-gray-900" style={{ fontSize: "0.875rem", fontWeight: 500 }}>
                      {formatDate(record.date)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Metrics with labels */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="rounded-xl bg-gray-50 border border-gray-100 p-3">
                  <p className="text-gray-400 mb-1" style={{ fontSize: "0.6875rem" }}>Período</p>
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-cyan-500" />
                    <span className="text-gray-900" style={{ fontSize: "0.875rem", fontWeight: 600 }}>
                      {periodLabel(record.forecastPeriod)}
                    </span>
                  </div>
                </div>
                <div className="rounded-xl bg-gray-50 border border-gray-100 p-3">
                  <p className="text-gray-400 mb-1" style={{ fontSize: "0.6875rem" }}>Precisión</p>
                  <div className="flex items-center gap-1.5">
                    <TrendingUp className="h-3.5 w-3.5 text-cyan-500" />
                    <span className="text-cyan-500" style={{ fontSize: "0.875rem", fontWeight: 600 }}>
                      {record.accuracy}%
                    </span>
                  </div>
                </div>
                <div className="rounded-xl bg-gray-50 border border-gray-100 p-3">
                  <p className="text-gray-400 mb-1" style={{ fontSize: "0.6875rem" }}>Productos</p>
                  <div className="flex items-center gap-1.5">
                    <Package className="h-3.5 w-3.5 text-blue-500" />
                    <span className="text-gray-900" style={{ fontSize: "0.875rem", fontWeight: 600 }}>
                      {record.totalProducts}
                    </span>
                  </div>
                </div>
                <div className="rounded-xl bg-gray-50 border border-gray-100 p-3">
                  <p className="text-gray-400 mb-1" style={{ fontSize: "0.6875rem" }}>Críticos</p>
                  <div className="flex items-center gap-1.5">
                    {record.criticalItems > 0 && <AlertCircle className="h-3.5 w-3.5 text-red-400" />}
                    <span className={record.criticalItems > 0 ? "text-red-400" : "text-gray-500"}
                      style={{ fontSize: "0.875rem", fontWeight: 600 }}>
                      {record.criticalItems}
                    </span>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <span className="text-gray-400" style={{ fontSize: "0.75rem" }}>
                  {record.totalUnits.toLocaleString()} unidades predichas
                </span>
                <div className="flex items-center gap-1 text-gray-400 group-hover:text-cyan-500 transition-colors">
                  <span style={{ fontSize: "0.75rem" }}>Ver detalles</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      )}
    </div>
  );
}