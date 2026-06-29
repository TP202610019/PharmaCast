import { motion } from "motion/react";
import { CheckCircle, AlertCircle, Activity, TrendingUp, Package } from "lucide-react";
import { PIPELINE_STEPS } from "../constants";
import type { UploadedFile } from "../types";
import type { PredictionResponse } from "@/shared/types/api";
import type { UIProduct } from "@/shared/lib/transforms";

interface Props {
  analysisStatus: "idle" | "running" | "done" | "error";
  analysisProgress: number;
  completedStepIdx: number;
  analysisError: string;
  files: UploadedFile[];
  forecastDays: number;
  prediction: PredictionResponse | null;
  products: UIProduct[];
  accuracy: number;
  setCurrentStep: (s: number) => void;
  setAnalysisStatus: (s: "idle" | "running" | "done" | "error") => void;
}

export function StepAnalysis({
  analysisStatus, analysisProgress, completedStepIdx, analysisError,
  files, forecastDays, prediction, products, accuracy,
  setCurrentStep, setAnalysisStatus,
}: Props) {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">

        {analysisStatus === "error" && (
          <div className="p-6">
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 border border-red-100">
                <AlertCircle className="h-7 w-7 text-red-400" />
              </div>
              <div>
                <p className="text-gray-900 mb-1" style={{ fontWeight: 600 }}>Error en el análisis</p>
                <p className="text-gray-400" style={{ fontSize: "0.875rem" }}>{analysisError}</p>
              </div>
              <button
                onClick={() => { setCurrentStep(2); setAnalysisStatus("idle"); }}
                className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-gray-600 hover:text-gray-900 transition-colors"
                style={{ fontSize: "0.875rem" }}
              >
                Volver y corregir
              </button>
            </div>
          </div>
        )}

        {analysisStatus === "running" && (
          <div className="p-6">
            <div className="flex items-center gap-4 mb-6 pb-5 border-b border-gray-100">
              <div className="relative shrink-0">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                  <Activity style={{ height: 18, width: 18 }} className="text-cyan-500" />
                </div>
                <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-60" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500" />
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-gray-900" style={{ fontWeight: 700, fontSize: "0.875rem" }}>Pipeline de análisis</p>
                  <span className="text-cyan-500 shrink-0" style={{ fontSize: "0.875rem", fontWeight: 700 }}>{analysisProgress}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-600 to-cyan-400"
                    initial={{ width: "0%" }}
                    animate={{ width: `${analysisProgress}%` }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                  />
                </div>
                <p className="text-gray-400 mt-1" style={{ fontSize: "0.6875rem" }}>
                  {files.reduce((s, f) => s + (f.rows || 0), 0).toLocaleString()} registros · {forecastDays} días a predecir
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {PIPELINE_STEPS.map((step, i) => {
                const isDone = i <= completedStepIdx;
                const isActive = i === completedStepIdx + 1;
                const StepIcon = step.icon;
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.05 }}
                    className={`flex items-start gap-3 rounded-xl border p-4 transition-all duration-300 ${
                      isDone ? "border-cyan-500/20 bg-cyan-500/5"
                      : isActive ? "border-cyan-500/30 bg-cyan-500/[0.07] shadow-sm"
                      : "border-gray-100 bg-gray-50/60"
                    }`}
                  >
                    <div className={`flex h-7 w-7 shrink-0 mt-0.5 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                      isDone ? "bg-cyan-500 border-cyan-500"
                      : isActive ? "bg-transparent border-cyan-500"
                      : "bg-white border-gray-200"
                    }`}>
                      {isDone ? (
                        <CheckCircle className="h-3.5 w-3.5 text-white" />
                      ) : isActive ? (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                          className="h-3 w-3 rounded-full border-2 border-cyan-500 border-t-transparent"
                        />
                      ) : (
                        <span style={{ fontSize: "0.625rem", fontWeight: 600, color: "#d1d5db" }}>{i + 1}</span>
                      )}
                    </div>
                    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-all duration-300 ${
                      isDone ? "bg-cyan-500/15 border border-cyan-500/25"
                      : isActive ? "bg-cyan-500/10 border border-cyan-500/20"
                      : "bg-white border border-gray-200"
                    }`}>
                      <StepIcon className={`h-3.5 w-3.5 transition-colors duration-300 ${isDone || isActive ? "text-cyan-500" : "text-gray-300"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="transition-colors duration-300" style={{
                          fontSize: "0.8125rem",
                          fontWeight: isDone || isActive ? 600 : 400,
                          color: isDone ? "#0e7490" : isActive ? "#111827" : "#9ca3af",
                        }}>
                          {step.label}
                        </span>
                        {isActive && (
                          <motion.span
                            initial={{ opacity: 0, scale: 0.85 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="rounded-full border border-cyan-500/40 bg-cyan-500/10 px-2 py-px text-cyan-600"
                            style={{ fontSize: "0.625rem", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}
                          >
                            Running
                          </motion.span>
                        )}
                      </div>
                      <p className="mt-0.5 transition-colors duration-300" style={{
                        fontSize: "0.6875rem",
                        color: isDone ? "#6b7280" : isActive ? "#6b7280" : "#d1d5db",
                      }}>
                        {step.description}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {analysisStatus === "done" && (
          <div className="p-6">
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-4 rounded-xl border border-cyan-500/25 bg-cyan-500/[0.08] px-5 py-4 mb-6"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-500/15 border border-cyan-500/25">
                <CheckCircle className="h-5 w-5 text-cyan-500" />
              </div>
              <div className="flex-1">
                <p className="text-gray-900" style={{ fontSize: "0.875rem", fontWeight: 700 }}>¡Análisis completado con éxito!</p>
                <p className="text-gray-500" style={{ fontSize: "0.75rem" }}>Redirigiendo a resultados en unos segundos...</p>
              </div>
              <div className="shrink-0 flex flex-col items-end gap-1.5">
                <span className="text-gray-400" style={{ fontSize: "0.6875rem" }}>Redirigiendo</span>
                <div className="h-1 w-24 rounded-full bg-gray-100 overflow-hidden">
                  <motion.div className="h-full rounded-full bg-cyan-500"
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 4.3, ease: "linear" }} />
                </div>
              </div>
            </motion.div>

            <p className="text-gray-400 mb-4" style={{ fontSize: "0.75rem" }}>
              Métricas del modelo · {files.reduce((s, f) => s + (f.rows || 0), 0).toLocaleString()} registros procesados
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { label: "Precisión estimada",   value: prediction && accuracy > 0 ? `${accuracy}%` : "—", sub: "Alta confianza",       icon: TrendingUp, iconBg: "bg-cyan-500/10 border-cyan-500/20",   iconColor: "text-cyan-500",   valColor: "#0e7490" },
                { label: "Productos analizados", value: prediction ? `${products.length}` : "—",           sub: "En el dataset",        icon: Package,    iconBg: "bg-blue-500/10 border-blue-500/20",   iconColor: "text-blue-500",   valColor: "#1d4ed8" },
                { label: "Período predicho",     value: `${forecastDays} días`,                            sub: "Horizonte de análisis", icon: Activity,   iconBg: "bg-purple-500/10 border-purple-500/20", iconColor: "text-purple-500", valColor: "#7c3aed" },
              ].map((m, idx) => {
                const MIcon = m.icon;
                return (
                  <motion.div key={m.label}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: idx * 0.08 }}
                    className="flex items-start gap-3 rounded-xl border border-gray-100 bg-gray-50/60 p-4">
                    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${m.iconBg}`}>
                      <MIcon className={`h-3.5 w-3.5 ${m.iconColor}`} />
                    </div>
                    <div>
                      <p style={{ fontSize: "1.375rem", fontWeight: 700, color: m.valColor, lineHeight: 1.1 }}>{m.value}</p>
                      <p className="text-gray-700" style={{ fontSize: "0.8125rem", fontWeight: 500 }}>{m.label}</p>
                      <p className="text-gray-400" style={{ fontSize: "0.6875rem" }}>{m.sub}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
