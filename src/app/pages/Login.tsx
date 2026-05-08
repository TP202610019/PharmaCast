import { useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  Activity, Eye, EyeOff, ArrowRight, Lock, Mail, AlertCircle,
  CheckCircle2, Clock, ShoppingCart,
} from "lucide-react";
import { motion } from "motion/react";
import { useAuth } from "../context/AuthContext";

export function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError("Por favor completa todos los campos.");
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      // Extract name from email as demo
      const namePart = email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
      login({ name: namePart, email, pharmacy: "Mi Farmacia" });
      navigate("/dashboard");
    }, 1200);
  };

  return (
    <div className="min-h-screen flex">
      {/* ── LEFT: solid cyan panel ── */}
      <div className="hidden lg:flex lg:w-5/12 flex-col relative overflow-hidden bg-cyan-500">
        {/* Decorative circles */}
        <div className="absolute -top-32 -left-32 w-80 h-80 rounded-full bg-white/5" />
        <div className="absolute top-1/2 -right-24 w-64 h-64 rounded-full bg-white/5" />
        <div className="absolute -bottom-20 left-10 w-56 h-56 rounded-full bg-white/[0.07]" />
        {/* Subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "linear-gradient(white 1px, transparent 1px), linear-gradient(to right, white 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        <div className="relative z-10 flex flex-col h-full p-12">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group w-fit">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 border border-white/25 group-hover:bg-white/25 transition-colors">
              <Activity className="h-5 w-5 text-white" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-white tracking-tight" style={{ fontSize: "0.9375rem", fontWeight: 700 }}>
                PharmaCast
              </span>
              <span className="text-white/50" style={{ fontSize: "0.6rem", fontWeight: 400, letterSpacing: "0.1em" }}>
                PREDICTION SYSTEM
              </span>
            </div>
          </Link>

          {/* Center message */}
          <div className="flex-1 flex flex-col justify-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >

              <p className="text-white/60 mb-2" style={{ fontSize: "0.75rem", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                Sistema de soporte de decisiones
              </p>
              <h2 className="text-white mb-5" style={{ fontSize: "1.875rem", fontWeight: 700, lineHeight: 1.2 }}>
                Predice. Planifica.<br />Optimiza.
              </h2>
              <p className="text-white/65 mb-8" style={{ fontSize: "0.9375rem", lineHeight: 1.75 }}>
                Predecir la demanda y planificar las compras de la farmacia en minutos, sin reemplazar tu sistema de gestión actual.
              </p>

              <div className="space-y-3">
                {[
                  { icon: Clock, text: "Predicción a 30 / 60 / 90 días" },
                  { icon: ShoppingCart, text: "Plan priorizado por criticidad" },
                  { icon: CheckCircle2, text: "Compatible con tu sistema actual" },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.text} className="flex items-center gap-3">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 border border-white/15 shrink-0">
                        <Icon className="h-3.5 w-3.5 text-white" />
                      </div>
                      <span className="text-white/80" style={{ fontSize: "0.875rem" }}>{item.text}</span>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>

          <p className="text-white/35" style={{ fontSize: "0.75rem" }}>
            © 2026 PharmaCast · Todos los derechos reservados
          </p>
        </div>
      </div>

      {/* ── RIGHT: pure white form panel ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-white">
        {/* Mobile logo */}
        <div className="lg:hidden mb-8">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10 border border-cyan-500/30">
              <Activity className="h-4 w-4 text-cyan-500" />
            </div>
            <span className="text-gray-900 tracking-tight" style={{ fontSize: "0.9375rem", fontWeight: 700 }}>
              PharmaCast
            </span>
          </Link>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="mb-8">
            <p className="text-cyan-500 mb-1" style={{ fontSize: "0.8125rem", fontWeight: 600, letterSpacing: "0.05em" }}>
              BIENVENIDO DE VUELTA
            </p>
            <h1 className="text-gray-900 mb-2" style={{ fontSize: "1.875rem", fontWeight: 700 }}>
              Iniciar sesión
            </h1>
            <p className="text-gray-500" style={{ fontSize: "0.9375rem" }}>
              Accede para continuar tus predicciones y revisar el historial.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3"
              >
                <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                <p className="text-red-600" style={{ fontSize: "0.875rem" }}>{error}</p>
              </motion.div>
            )}

            <div className="space-y-1.5">
              <label className="text-gray-700" style={{ fontSize: "0.875rem", fontWeight: 500 }}>
                Correo electrónico
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@farmacia.com"
                  className="w-full rounded-xl border border-gray-300 bg-white pl-10 pr-4 py-3 text-gray-900 placeholder:text-gray-400 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/10 transition-all"
                  style={{ fontSize: "0.9375rem" }}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-gray-700" style={{ fontSize: "0.875rem", fontWeight: 500 }}>
                  Contraseña
                </label>
                <Link
                  to="/forgot-password"
                  className="text-cyan-500 hover:text-cyan-600 transition-colors"
                  style={{ fontSize: "0.8125rem" }}
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-gray-300 bg-white pl-10 pr-12 py-3 text-gray-900 placeholder:text-gray-400 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/10 transition-all"
                  style={{ fontSize: "0.9375rem" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-cyan-500 px-6 py-3 text-white transition-all hover:bg-cyan-400 hover:shadow-lg hover:shadow-cyan-500/20 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ fontWeight: 600, fontSize: "0.9375rem" }}
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Iniciando sesión...
                </>
              ) : (
                <>
                  Iniciar sesión
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-gray-400" style={{ fontSize: "0.8125rem" }}>o</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <button
            type="button"
            onClick={() => {
              login({ name: "Dr. Demo", email: "demo@pharmacast.com", pharmacy: "Farmacia PharmaCast" });
              navigate("/dashboard");
            }}
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-6 py-3 text-gray-600 transition-all hover:border-gray-400 hover:text-gray-900 hover:shadow-sm"
            style={{ fontSize: "0.9375rem" }}
          >
            Acceder con cuenta demo
          </button>

          <p className="text-center text-gray-500 mt-8" style={{ fontSize: "0.9375rem" }}>
            ¿No tienes una cuenta?{" "}
            <Link
              to="/register"
              className="text-cyan-500 hover:text-cyan-600 transition-colors"
              style={{ fontWeight: 600 }}
            >
              Regístrate gratis
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
