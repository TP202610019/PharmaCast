import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Activity, Eye, EyeOff, ArrowRight, Lock, Mail, AlertCircle } from "lucide-react";
import { motion } from "motion/react";

export function Login() {
  const navigate = useNavigate();
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
      navigate("/");
    }, 1200);
  };

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col relative overflow-hidden bg-white border-r border-gray-100">
        {/* Decorative grid */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(#06b6d4 1px, transparent 1px), linear-gradient(to right, #06b6d4 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        {/* Glow top */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-cyan-500/8 rounded-full blur-3xl pointer-events-none" />
        {/* Glow bottom */}
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col h-full p-12">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group w-fit">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/30 group-hover:bg-cyan-500/20 transition-colors">
              <Activity className="h-5 w-5 text-cyan-500" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-gray-900 tracking-tight" style={{ fontSize: "0.9375rem", fontWeight: 700 }}>
                PharmaCast
              </span>
              <span className="text-gray-400" style={{ fontSize: "0.6rem", fontWeight: 400, letterSpacing: "0.1em" }}>
                PREDICTION SYSTEM
              </span>
            </div>
          </Link>

          {/* Center content */}
          <div className="flex-1 flex flex-col justify-center max-w-md">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 mb-6">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-500 animate-pulse" />
                <span className="text-cyan-600" style={{ fontSize: "0.6875rem", fontWeight: 500 }}>
                  Sistema activo
                </span>
              </div>

              <h2 className="text-gray-900 mb-4" style={{ fontSize: "2rem", fontWeight: 700, lineHeight: 1.2 }}>
                Predicción inteligente para tu{" "}
                <span className="text-cyan-500">farmacia</span>
              </h2>
              <p className="text-gray-500 mb-10" style={{ fontSize: "0.9375rem", lineHeight: 1.7 }}>
                Anticipa la demanda, optimiza tus compras y reduce el desabastecimiento con análisis de datos impulsado por IA.
              </p>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                {[
                  { value: "94%", label: "Precisión" },
                  { value: "< 2min", label: "Análisis" },
                  { value: "50+", label: "Productos" },
                ].map((s) => (
                  <div key={s.label} className="rounded-2xl border border-gray-100 bg-gray-50 p-4 text-center">
                    <p className="text-cyan-500 mb-1" style={{ fontSize: "1.25rem", fontWeight: 700 }}>
                      {s.value}
                    </p>
                    <p className="text-gray-400" style={{ fontSize: "0.75rem" }}>
                      {s.label}
                    </p>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Bottom note */}
          <p className="text-gray-300" style={{ fontSize: "0.75rem" }}>
            © 2026 PharmaCast · Todos los derechos reservados
          </p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
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
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-gray-900 mb-2" style={{ fontSize: "1.75rem", fontWeight: 700 }}>
              Bienvenido de nuevo
            </h1>
            <p className="text-gray-500" style={{ fontSize: "0.9375rem" }}>
              Ingresa tus credenciales para continuar
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Error */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3"
              >
                <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                <p className="text-red-600" style={{ fontSize: "0.875rem" }}>
                  {error}
                </p>
              </motion.div>
            )}

            {/* Email */}
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

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-gray-700" style={{ fontSize: "0.875rem", fontWeight: 500 }}>
                  Contraseña
                </label>
                <button
                  type="button"
                  className="text-cyan-500 hover:text-cyan-600 transition-colors"
                  style={{ fontSize: "0.8125rem" }}
                >
                  ¿Olvidaste tu contraseña?
                </button>
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

            {/* Submit */}
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

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-gray-400" style={{ fontSize: "0.8125rem" }}>
              o
            </span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Demo access */}
          <button
            type="button"
            onClick={() => navigate("/")}
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-6 py-3 text-gray-600 transition-all hover:border-gray-400 hover:text-gray-900 hover:shadow-sm"
            style={{ fontSize: "0.9375rem" }}
          >
            Acceder con cuenta demo
          </button>

          {/* Register link */}
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
