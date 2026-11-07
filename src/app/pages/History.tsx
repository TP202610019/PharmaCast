import { peekCache } from "../../lib/dashboardCache";
import type { PredictionSummaryResponse } from "../../types/api";
import { WorkspaceError } from "../components/WorkspaceError";
import { WorkspaceLoading } from "../components/WorkspaceLoading";
import { useState, useEffect, useCallback } from "react";
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
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  Database,
} from "lucide-react";
import { motion } from "motion/react";
import { predictionService } from "../../services/prediction.service";
import { summaryToUIRecord, statusLabel, relativeTime } from "../../lib/transforms";
import type { PredictionUIRecord } from "../../lib/transforms";
import { ExecutionStatus } from "../../types/api";
import { extractApiErrorMessage } from "../context/AuthContext";

const statusConfig = {
  [ExecutionStatus.Completed]: {
    label: "Completado",
    className: "bg-emerald-50 text-emerald-600 border-emerald-200",
    icon: CheckCircle2,
  },
  [ExecutionStatus.Failed]: {
    label: "Fallido",
    className: "bg-red-50 text-red-500 border-red-200",
    icon: XCircle,
  },
  [ExecutionStatus.Processing]: {
    label: "Procesando",
    className: "bg-amber-50 text-amber-600 border-amber-200",
    icon: Loader2,
  },
  [ExecutionStatus.Pending]: {
    label: "Pendiente",
    className: "bg-gray-100 text-gray-500 border-gray-200",
    icon: Clock,
  },
};

export function History() {
  const navigate = useNavigate();
  const [records, setRecords] = useState<PredictionUIRecord[]>(() => (peekCache<PredictionSummaryResponse[]>("history") ?? []).map(summaryToUIRecord));
  const [loading, setLoading] = useState(() => peekCache("history") === undefined);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filterPeriod, setFilterPeriod] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const loadHistory = useCallback(async () => {
    setLoading(peekCache("history") === undefined);
    setError("");
    try {
      const summaries = await predictionService.getHistory();
      setRecords(summaries.map(summaryToUIRecord));
    } catch (err) {
      setError(extractApiErrorMessage(err, "No se pudo cargar el historial."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const filtered = records.filter((rec) => {
    const matchSearch =
      search === "" ||
      rec.datasetName.toLowerCase().includes(search.toLowerCase()) ||
      rec.id.toLowerCase().includes(search.toLowerCase()) ||
      new Date(rec.date).toLocaleDateString("es-ES").includes(search);
    const matchPeriod =
      filterPeriod === "all" || rec.forecastPeriod.toString() === filterPeriod;
    const matchStatus =
      filterStatus === "all" || rec.status.toString() === filterStatus;
    return matchSearch && matchPeriod && matchStatus;
  });

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("es-ES", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  const completedCount = records.filter(
    (r) => r.status === ExecutionStatus.Completed
  ).length;
  const failedCount = records.filter(
    (r) => r.status === ExecutionStatus.Failed
  ).length;
  const pendingCount = records.filter(
    (r) =>
      r.status === ExecutionStatus.Pending ||
      r.status === ExecutionStatus.Processing
  ).length;

  if (loading) return <WorkspaceLoading label="Cargando historial…" />;

  if (error && peekCache("history") === undefined) return <WorkspaceError title="Error al cargar el historial" message={error} onRetry={loadHistory} />;

  return (
    <div className="history-page workspace-page">
      {error && <p role="status" className="text-sm text-red-500">No se pudo actualizar el historial. Se muestran los datos anteriores.</p>}
      <header className="module-heading"><div><h1>Historial de predicciones</h1><p>Revisa tus análisis anteriores y vuelve a cada resultado.</p></div><button className="module-primary" onClick={() => navigate("/predicciones/nueva")}><BarChart3 size={16}/>Nueva predicción</button></header>

      {/* Summary stats */}
      <div className="module-stats grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: "Total predicciones",
            value: records.length.toString(),
            icon: BarChart3,
            color: "text-blue-500",
            bg: "bg-blue-500/10 border-blue-500/20",
          },
          {
            label: "Completadas",
            value: completedCount.toString(),
            icon: CheckCircle2,
            color: "text-emerald-500",
            bg: "bg-emerald-500/10 border-emerald-500/20",
          },
          {
            label: "Fallidas",
            value: failedCount.toString(),
            icon: XCircle,
            color: "text-red-500",
            bg: "bg-red-500/10 border-red-500/20",
          },
          {
            label: "En proceso",
            value: pendingCount.toString(),
            icon: TrendingUp,
            color: "text-blue-500",
            bg: "bg-blue-500/10 border-blue-500/20",
          },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="flex items-center gap-4 module-card rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
            >
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border ${stat.bg}`}
              >
                <Icon className={`h-6 w-6 ${stat.color}`} />
              </div>
              <div>
                <p
                  className="text-gray-400 mb-0.5"
                  style={{ fontSize: "0.75rem" }}
                >
                  {stat.label}
                </p>
                <p
                  className="text-gray-900"
                  style={{
                    fontSize: "1.375rem",
                    fontWeight: 700,
                    lineHeight: 1.1,
                  }}
                >
                  {stat.value}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="history-filters flex flex-wrap gap-3 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por dataset o ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-gray-300 bg-white pl-9 pr-4 py-2.5 text-gray-900 placeholder:text-gray-400 outline-none focus:border-blue-500/60 transition-colors"
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
                    ? "border-blue-500/50 bg-blue-500/10 text-blue-500"
                    : "border-gray-300 bg-white text-gray-500 hover:text-gray-700"
                }`}
                style={{ fontSize: "0.8125rem" }}
              >
                {p === "all" ? "Todos" : `${p}d`}
              </button>
            ))}
          </div>
        </div>

        {/* Status filter */}
        <div className="flex gap-1.5">
          {[
            { value: "all", label: "Todos" },
            { value: ExecutionStatus.Completed.toString(), label: "Completados" },
            { value: ExecutionStatus.Failed.toString(), label: "Fallidos" },
          ].map((s) => (
            <button
              key={s.value}
              onClick={() => setFilterStatus(s.value)}
              className={`rounded-lg border px-3 py-2 transition-all ${
                filterStatus === s.value
                  ? "border-blue-500/50 bg-blue-500/10 text-blue-500"
                  : "border-gray-300 bg-white text-gray-500 hover:text-gray-700"
              }`}
              style={{ fontSize: "0.8125rem" }}
            >
              {s.label}
            </button>
          ))}
        </div>
      {/* Results count */}
      <p className="history-result-count text-gray-400" style={{ fontSize: "0.8125rem" }}>
        {filtered.length} resultado{filtered.length !== 1 ? "s" : ""}
      </p>

      </div>

      {/* Empty state — no data at all */}
      {records.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 border border-gray-200">
            <BarChart3 className="h-7 w-7 text-gray-300" />
          </div>
          <p className="text-gray-500">Aún no tienes predicciones</p>
          <p className="text-gray-400" style={{ fontSize: "0.8125rem" }}>
            Realiza tu primera predicción para verla aquí
          </p>
          <button
            onClick={() => navigate("/predicciones/nueva")}
            className="mt-2 rounded-xl bg-blue-500 px-5 py-2.5 text-white hover:bg-blue-400 transition-colors"
            style={{ fontSize: "0.875rem", fontWeight: 600 }}
          >
            Nueva predicción
          </button>
        </div>
      ) : filtered.length === 0 ? (
        /* Empty state — filters returned nothing */
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
          {filtered.map((record, i) => {
            const cfg =
              statusConfig[record.status] ?? statusConfig[ExecutionStatus.Pending];
            const StatusIcon = cfg.icon;
            return (
              <motion.button
                key={record.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.06 }}
                onClick={() => navigate(`/historial/${record.id}`)}
                className="history-record text-left module-card rounded-2xl border border-gray-200 bg-white p-5 hover:border-gray-300 hover:shadow-md transition-all group shadow-sm"
              >
                {/* Card header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="min-w-0 flex-1 mr-3">
                    <p
                      className="text-gray-400 mb-0.5 truncate"
                      style={{ fontSize: "0.6875rem" }}
                    >
                      Análisis {record.id.slice(0, 8).toUpperCase()}
                    </p>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                      <p
                        className="text-gray-900 truncate"
                        style={{ fontSize: "0.875rem", fontWeight: 500 }}
                      >
                        {formatDate(record.date)}
                      </p>
                    </div>
                  </div>
                  {/* Status badge */}
                  <span
                    className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 shrink-0 ${cfg.className}`}
                    style={{ fontSize: "0.6875rem", fontWeight: 600 }}
                  >
                    <StatusIcon className="h-3 w-3" />
                    {cfg.label}
                  </span>
                </div>

                {/* Dataset name */}
                <div className="flex items-center gap-2 rounded-xl bg-gray-50 border border-gray-100 px-3 py-2.5 mb-4">
                  <Database className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                  <span
                    className="text-gray-700 truncate"
                    style={{ fontSize: "0.8125rem", fontWeight: 500 }}
                  >
                    {record.datasetName}
                  </span>
                </div>

                {/* Metrics row */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="rounded-xl bg-gray-50 border border-gray-100 p-3">
                    <p
                      className="text-gray-400 mb-1"
                      style={{ fontSize: "0.6875rem" }}
                    >
                      Período
                    </p>
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-blue-500" />
                      <span
                        className="text-gray-900"
                        style={{ fontSize: "0.875rem", fontWeight: 600 }}
                      >
                        {record.forecastPeriod} días
                      </span>
                    </div>
                  </div>
                  <div className="rounded-xl bg-gray-50 border border-gray-100 p-3">
                    <p
                      className="text-gray-400 mb-1"
                      style={{ fontSize: "0.6875rem" }}
                    >
                      Creado
                    </p>
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-gray-400" />
                      <span
                        className="text-gray-600"
                        style={{ fontSize: "0.8125rem", fontWeight: 500 }}
                      >
                        {relativeTime(record.date)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-1 text-gray-400 group-hover:text-blue-500 transition-colors">
                    <span style={{ fontSize: "0.75rem" }}>Ver detalles</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      )}
    </div>
  );
}
