import { PredictionAnalysis } from "../components/PredictionAnalysis";
import { peekCache } from "../../lib/dashboardCache";
import { WorkspaceError } from "../components/WorkspaceError";
import { WorkspaceLoading } from "../components/WorkspaceLoading";
import { exportSavedPurchase } from "../../lib/purchaseExport";
import { AnalysisTabs } from "../components/AnalysisLayout";
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import { TrendingUp, Package, BarChart3, Calendar, PlusCircle, History, Download, AlertTriangle, Clock, Zap, Building2, Lightbulb } from "lucide-react";
import { motion } from "motion/react";
import { useAuth } from "../context/AuthContext";
import { dashboardService } from "../../services/dashboard.service";
import { relativeTime } from "../../lib/transforms";
import type { DashboardMetricsResponse, DashboardSummaryResponse } from "../../types/api";

const tips = [
  { icon: AlertTriangle, color: "text-orange-500", bg: "bg-orange-500/10 border-orange-500/20", title: "Revisa los críticos primero", desc: "Revisa primero los productos con mayor demanda prevista y contrasta las cantidades con tu stock." },
  { icon: Zap, color: "text-blue-500", bg: "bg-blue-500/10 border-blue-500/20", title: "Optimiza el ciclo de compras", desc: "Agrupa los productos por proveedor antes de preparar tu pedido." },
  { icon: Lightbulb, color: "text-yellow-500", bg: "bg-yellow-500/10 border-yellow-500/20", title: "Actualiza tu inventario", desc: "Subir datos de inventario actualizados mejora la precisión de la predicción." },
];

// ─── Component ───────────────────────────────────────────────────────────────
export function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // ── Core data ──
  const [metrics, setMetrics] = useState<DashboardMetricsResponse | null>(() => peekCache<DashboardMetricsResponse>("metrics") ?? null);
  const [summary, setSummary] = useState<DashboardSummaryResponse | null>(() => peekCache<DashboardSummaryResponse>("summary") ?? null);
  const [loading, setLoading] = useState(() => !peekCache("metrics") || !peekCache("summary"));
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"dashboard" | "purchase">("dashboard");

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Buenos días";
    if (h < 18) return "Buenas tardes";
    return "Buenas noches";
  };

  // ── Initial load: metrics + summary in parallel ──
  const loadData = useCallback(async () => {
    setLoading(!peekCache("metrics") || !peekCache("summary"));
    setError(null);
    try {
      const [metricsData, summaryData] = await Promise.all([
        dashboardService.getMetrics(),
        dashboardService.getSummary(),
      ]);
      setMetrics(metricsData);
      setSummary(summaryData);
    } catch (err) {
      console.error("[Dashboard] loadData failed:", err);
      setError("No se pudieron cargar los datos del panel.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);


  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });

  // ── Loading / Error states ──
  if (loading) return <WorkspaceLoading label="Cargando panel…" />;

  if (error && !metrics) return <WorkspaceError title="Error al cargar el panel" message={error} onRetry={loadData} />;

  const hasPrediction = !!summary?.latestPredictionId;

  return (
    <div className="dashboard-page workspace-page">
      <div className="dashboard-content">
      {error && <p role="status" className="text-sm text-red-500">No se pudo actualizar el panel. Se muestran los datos anteriores.</p>}

        <header className="module-heading">
          <div><h1>Mi panel</h1><p>{greeting()}, {user?.name ?? "Usuario"}. Este es el resumen de tu farmacia.</p><span className="module-pharmacy"><Building2 size={13}/>{user?.pharmacy ?? "Mi Farmacia"}</span></div>
          <div className="module-heading-actions"><button className="module-primary" onClick={() => navigate("/predicciones/nueva")}><PlusCircle size={16}/>Nueva predicción</button><button className="module-secondary" onClick={() => navigate("/historial")}><History size={15}/>Ver historial</button></div>
        </header>

        {/* ── Stats Row ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="module-stats grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          {[
            {
              label: "Total predicciones",
              value: (metrics?.totalPredictions ?? 0).toString(),
              icon: BarChart3, iconColor: "text-blue-500", iconBg: "bg-blue-500/10 border-blue-500/20",
            },
            {
              label: "Última predicción",
              value: summary?.latestPredictionDate
                ? relativeTime(summary.latestPredictionDate)
                : "Sin datos",
              icon: Clock, iconColor: "text-blue-500", iconBg: "bg-blue-500/10 border-blue-500/20",
            },
            {
              label: "Productos críticos",
              value: (summary?.criticalCount ?? 0).toString(),
              icon: AlertTriangle, iconColor: "text-red-500", iconBg: "bg-red-500/10 border-red-500/20",
            },
            {
              label: "Precisión promedio",
              value: metrics?.averageAccuracy != null ? `${metrics.averageAccuracy}%` : "—",
              icon: TrendingUp, iconColor: "text-blue-500", iconBg: "bg-blue-500/10 border-blue-500/20",
            },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="flex items-center gap-4 module-card rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${card.iconBg}`}>
                  <Icon className={`h-5 w-5 ${card.iconColor}`} />
                </div>
                <div>
                  <p className="text-gray-400 mb-0.5" style={{ fontSize: "0.75rem" }}>{card.label}</p>
                  <p className="text-gray-900" style={{ fontSize: "1.25rem", fontWeight: 700, lineHeight: 1.1 }}>{card.value}</p>
                </div>
              </div>
            );
          })}
        </motion.div>

        {/* ── No predictions yet ── */}
        {!hasPrediction && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="module-card rounded-2xl border border-gray-200 bg-white p-12 shadow-sm flex flex-col items-center gap-4 text-center"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/10 border border-blue-500/20">
              <BarChart3 className="h-8 w-8 text-blue-500" />
            </div>
            <div>
              <h2 className="text-gray-900 mb-1" style={{ fontWeight: 700 }}>Aún no hay predicciones</h2>
              <p className="text-gray-400" style={{ fontSize: "0.9375rem" }}>
                Carga tus datos y ejecuta tu primera predicción para ver resultados aquí.
              </p>
            </div>
            <button onClick={() => navigate("/predicciones/nueva")}
              className="flex items-center gap-2 rounded-xl bg-blue-500 px-5 py-2.5 text-white hover:bg-blue-400 transition-all hover:shadow-lg"
              style={{ fontWeight: 600, fontSize: "0.9375rem" }}>
              <PlusCircle className="h-4 w-4" />
              Iniciar predicción
            </button>
          </motion.div>
        )}

        {/* ── Last Prediction Section ── */}
        {hasPrediction && summary && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="analysis-surface dashboard-analysis"
          >
            {/* Section header */}
            <div className="analysis-summary-heading">
              <div>
                <h2>Última predicción</h2>
                <div className="module-prediction-meta flex items-center gap-3">
                  <span className="analysis-reference">Análisis {summary.latestPredictionId!.slice(0, 8).toUpperCase()}</span>
                  {summary.latestPredictionDate && (
                    <div className="flex items-center gap-1.5 text-gray-400">
                      <Calendar className="h-3.5 w-3.5" />
                      <span style={{ fontSize: "0.8125rem" }}>{formatDate(summary.latestPredictionDate)}</span>
                    </div>
                  )}
                  {summary.forecastPeriod && (
                    <div className="flex items-center gap-1.5 text-gray-400">
                      <Clock className="h-3.5 w-3.5" />
                      <span style={{ fontSize: "0.8125rem" }}>{summary.forecastPeriod} días</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => navigate(`/historial/${summary.latestPredictionId}`)}
                  className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-500 hover:text-gray-900 hover:border-gray-400 transition-all"
                  style={{ fontSize: "0.8125rem" }}>
                  Ver análisis completo
                </button>
                <button onClick={() => summary?.latestPredictionId && exportSavedPurchase("pdf", summary.latestPredictionId, summary.forecastPeriod ?? 30)}
                  className="flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-400 transition-all"
                  style={{ fontSize: "0.8125rem", fontWeight: 600 }}>
<Download className="h-4 w-4" />Exportar PDF
                </button>
              </div>
            </div>

            <AnalysisTabs<"dashboard" | "purchase"> tabs={[{id:"dashboard",label:"Demanda",icon:BarChart3},{id:"purchase",label:"Plan de compras",icon:Package}]} active={activeTab} onChange={setActiveTab} />

            <PredictionAnalysis key={summary.latestPredictionId!} executionId={summary.latestPredictionId!}
              view={activeTab === "dashboard" ? "demand" : "purchase"}/>
          </motion.div>
        )}

        {/* ── Tips & Recommendations ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35 }}
        >
          <h2 className="text-gray-900 mb-4" style={{ fontWeight: 600 }}>Recomendaciones</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {tips.map((tip) => {
              const Icon = tip.icon;
              return (
                <div key={tip.title} className={`module-tip rounded-2xl border ${tip.bg} bg-white p-5`}>
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl border mb-4 ${tip.bg}`}>
                    <Icon className={`h-5 w-5 ${tip.color}`} />
                  </div>
                  <h3 className="text-gray-900 mb-1.5" style={{ fontWeight: 600, fontSize: "0.9375rem" }}>{tip.title}</h3>
                  <p className="text-gray-500" style={{ fontSize: "0.8125rem", lineHeight: 1.6 }}>{tip.desc}</p>
                </div>
              );
            })}
          </div>
        </motion.div>

      </div>
    </div>
  );
}
