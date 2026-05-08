import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  Upload,
  Brain,
  ShoppingCart,
  ArrowRight,
  TrendingUp,
  Shield,
  Zap,
  BarChart3,
  ChevronRight,
} from "lucide-react";
import { motion } from "motion/react";
import { useAuth } from "../context/AuthContext";
import { LoginRequiredModal } from "../components/LoginRequiredModal";

const features = [
  {
    icon: Upload,
    title: "Carga de datos",
    description:
      "Sube archivos CSV o Excel con ventas e inventario. El sistema normaliza y valida los datos automáticamente.",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    step: "01",
  },
  {
    icon: Brain,
    title: "Predicción de demanda",
    description:
      "Algoritmos de machine learning analizan patrones históricos para proyectar la demanda futura con alta precisión.",
    color: "text-cyan-500",
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/20",
    step: "02",
  },
  {
    icon: ShoppingCart,
    title: "Plan de compras",
    description:
      "Genera automáticamente un plan de compras priorizado con cantidades recomendadas y niveles de urgencia.",
    color: "text-purple-500",
    bg: "bg-purple-500/10",
    border: "border-purple-500/20",
    step: "03",
  },
];

const stats = [
  { value: "94%", label: "Precisión promedio", icon: TrendingUp },
  { value: "< 2min", label: "Tiempo de análisis", icon: Zap },
  { value: "50+", label: "Productos soportados", icon: BarChart3 },
  { value: "100%", label: "Datos seguros", icon: Shield },
];

export function Home() {
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Redirect logged-in users to their dashboard
  useEffect(() => {
    if (isLoggedIn) {
      navigate("/dashboard", { replace: true });
    }
  }, [isLoggedIn, navigate]);

  const handleProtectedNav = (path: string) => {
    if (isLoggedIn) {
      navigate(path);
    } else {
      setShowLoginModal(true);
    }
  };

  return (
    <>
      <LoginRequiredModal open={showLoginModal} onClose={() => setShowLoginModal(false)} />

      <div className="min-h-[calc(100vh-4rem)] flex flex-col">
        {/* Hero Section */}
        <section className="relative flex flex-col items-center justify-center px-6 pt-20 pb-16 overflow-hidden">
          {/* Background glow */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-cyan-500/8 rounded-full blur-3xl" />
            <div className="absolute top-20 left-1/4 w-[200px] h-[200px] bg-blue-500/5 rounded-full blur-3xl" />
          </div>

          {/* Grid pattern */}
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                "linear-gradient(#06b6d4 1px, transparent 1px), linear-gradient(to right, #06b6d4 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="relative max-w-4xl mx-auto text-center"
          >
            {/* Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-1.5 mb-6">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-500 animate-pulse" />
              <span className="text-cyan-600" style={{ fontSize: "0.75rem", fontWeight: 500 }}>
                Sistema de soporte a decisiones farmacéuticas
              </span>
            </div>

            <h1 className="text-gray-900 mb-6" style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)", fontWeight: 700, lineHeight: 1.15 }}>
              Predicción de demanda y{" "}
              <span className="text-cyan-500">planificación de compras</span>
            </h1>

            <p className="text-gray-500 max-w-2xl mx-auto mb-10" style={{ fontSize: "1.125rem", lineHeight: 1.7 }}>
              Analiza el historial de ventas e inventario de tu farmacia para anticipar la demanda futura y
              optimizar las decisiones de compra con inteligencia artificial.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4">
              <button
                onClick={() => handleProtectedNav("/prediction")}
                className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-6 py-3 text-white transition-all hover:bg-cyan-400 hover:shadow-lg hover:shadow-cyan-500/25 active:scale-95"
                style={{ fontWeight: 600 }}
              >
                Iniciar nueva predicción
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleProtectedNav("/history")}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-6 py-3 text-gray-600 transition-all hover:border-gray-400 hover:text-gray-900"
              >
                Ver historial
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </motion.div>

          {/* Stats bar */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="relative mt-16 w-full max-w-3xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-px bg-gray-200 rounded-2xl overflow-hidden border border-gray-200"
          >
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="flex flex-col items-center gap-1 bg-white px-4 py-5">
                  <Icon className="h-4 w-4 text-cyan-500 mb-1" />
                  <span className="text-gray-900" style={{ fontSize: "1.5rem", fontWeight: 700 }}>
                    {stat.value}
                  </span>
                  <span className="text-gray-400 text-center" style={{ fontSize: "0.75rem" }}>
                    {stat.label}
                  </span>
                </div>
              );
            })}
          </motion.div>
        </section>

        {/* Features Section */}
        <section className="px-6 py-16 max-w-7xl mx-auto w-full">
          <div className="text-center mb-12">
            <h2 className="text-gray-900 mb-3" style={{ fontWeight: 600 }}>
              ¿Cómo funciona?
            </h2>
            <p className="text-gray-500" style={{ fontSize: "0.9375rem" }}>
              Un flujo simple de tres pasos para optimizar tus compras
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 * i }}
                  className={`relative rounded-2xl border ${f.border} bg-white p-6 group hover:bg-gray-50 transition-colors shadow-sm`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${f.bg} border ${f.border}`}>
                      <Icon className={`h-5 w-5 ${f.color}`} />
                    </div>
                    <span className="text-gray-100" style={{ fontSize: "2rem", fontWeight: 800 }}>
                      {f.step}
                    </span>
                  </div>
                  <h3 className="text-gray-900 mb-2" style={{ fontWeight: 600 }}>
                    {f.title}
                  </h3>
                  <p className="text-gray-500" style={{ fontSize: "0.875rem", lineHeight: 1.65 }}>
                    {f.description}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* CTA Section */}
        <section className="px-6 py-16 mt-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="max-w-4xl mx-auto rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-10 text-center relative overflow-hidden"
          >
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[400px] h-[200px] bg-cyan-500/10 rounded-full blur-3xl" />
            </div>
            <h2 className="text-gray-900 mb-3 relative" style={{ fontWeight: 600 }}>
              Listo para optimizar tus compras
            </h2>
            <p className="text-gray-500 mb-8 relative" style={{ fontSize: "0.9375rem" }}>
              Sube tus datos de ventas e inventario y obtén un plan de compras inteligente en minutos.
            </p>
            <button
              onClick={() => handleProtectedNav("/prediction")}
              className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-7 py-3 text-white transition-all hover:bg-cyan-400 hover:shadow-lg hover:shadow-cyan-500/30 active:scale-95 relative"
              style={{ fontWeight: 600 }}
            >
              Comenzar ahora
              <ArrowRight className="h-4 w-4" />
            </button>
          </motion.div>
        </section>
      </div>
    </>
  );
}