import { useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  Activity,
  Eye,
  EyeOff,
  ArrowRight,
  Lock,
  Mail,
  User,
  Building2,
  AlertCircle,
  CheckCircle2,
  Upload,
  Cpu,
  BarChart3,
  ShoppingCart,
} from "lucide-react";
import { motion } from "motion/react";

const passwordRequirements = [
  { label: "Al menos 8 caracteres", test: (p: string) => p.length >= 8 },
  { label: "Una letra mayúscula", test: (p: string) => /[A-Z]/.test(p) },
  { label: "Un número", test: (p: string) => /[0-9]/.test(p) },
];

export function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    pharmacy: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!form.name || !form.email || !form.password || !form.confirmPassword) {
      setError("Por favor completa todos los campos obligatorios.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    if (form.password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      navigate("/");
    }, 1400);
  };

  const passwordStrength = passwordRequirements.filter((r) => r.test(form.password)).length;

  const strengthLabel = ["Débil", "Regular", "Fuerte"][passwordStrength - 1] ?? "";
  const strengthColor =
    passwordStrength === 3
      ? "bg-cyan-500"
      : passwordStrength === 2
      ? "bg-yellow-400"
      : passwordStrength === 1
      ? "bg-red-400"
      : "bg-gray-200";

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-5/12 flex-col relative overflow-hidden bg-white border-r border-gray-100">
        {/* Decorative grid */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(#06b6d4 1px, transparent 1px), linear-gradient(to right, #06b6d4 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-cyan-500/6 rounded-full blur-3xl pointer-events-none" />
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
          <div className="flex-1 flex flex-col justify-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 mb-6">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-500 animate-pulse" />
                <span className="text-cyan-600" style={{ fontSize: "0.6875rem", fontWeight: 500 }}>
                  Registro gratuito
                </span>
              </div>

              <h2 className="text-gray-900 mb-3" style={{ fontSize: "1.75rem", fontWeight: 700, lineHeight: 1.25 }}>
                Así de fácil con{" "}
                <span className="text-cyan-500">PharmaCast</span>
              </h2>
              <p className="text-gray-400 mb-8" style={{ fontSize: "0.875rem", lineHeight: 1.65 }}>
                De tus datos de ventas a un plan de compras inteligente en 4 pasos.
              </p>

              {/* How it works — 4 steps */}
              <div className="space-y-1">
                {[
                  { step: "01", icon: Upload, label: "Carga tus datos", desc: "Sube CSV o Excel con ventas e inventario", color: "text-cyan-500", bg: "bg-cyan-500/10 border-cyan-500/20" },
                  { step: "02", icon: Cpu, label: "Análisis IA", desc: "Pipeline ARIMA + ML ensemble en segundos", color: "text-blue-500", bg: "bg-blue-500/10 border-blue-500/20" },
                  { step: "03", icon: BarChart3, label: "Visualiza resultados", desc: "Gráficas interactivas de demanda predicha", color: "text-purple-500", bg: "bg-purple-500/10 border-purple-500/20" },
                  { step: "04", icon: ShoppingCart, label: "Plan de compras", desc: "Recomendaciones priorizadas listas para exportar", color: "text-orange-500", bg: "bg-orange-500/10 border-orange-500/20" },
                ].map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <motion.div
                      key={item.step}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, delay: 0.15 + i * 0.1 }}
                      className="flex items-start gap-3.5"
                    >
                      {/* Left: icon + vertical line */}
                      <div className="flex flex-col items-center">
                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${item.bg}`}>
                          <Icon className={`h-4.5 w-4.5 ${item.color}`} style={{ height: 18, width: 18 }} />
                        </div>
                        {i < 3 && <div className="w-px flex-1 bg-gray-100 my-1" style={{ minHeight: 16 }} />}
                      </div>
                      {/* Right: text */}
                      <div className="pb-4">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-300" style={{ fontSize: "0.625rem", fontWeight: 700, letterSpacing: "0.08em" }}>{item.step}</span>
                          <span className="text-gray-900" style={{ fontSize: "0.875rem", fontWeight: 600 }}>{item.label}</span>
                        </div>
                        <p className="text-gray-400 mt-0.5" style={{ fontSize: "0.8125rem" }}>{item.desc}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          </div>

          <p className="text-gray-300" style={{ fontSize: "0.75rem" }}>
            © 2026 PharmaCast · Todos los derechos reservados
          </p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 overflow-y-auto">
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
          <div className="mb-7">
            <h1 className="text-gray-900 mb-2" style={{ fontSize: "1.75rem", fontWeight: 700 }}>
              Crear cuenta
            </h1>
            <p className="text-gray-500" style={{ fontSize: "0.9375rem" }}>
              Completa el formulario para registrarte
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
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

            {/* Name + Pharmacy row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-gray-700" style={{ fontSize: "0.8125rem", fontWeight: 500 }}>
                  Nombre <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={form.name}
                    onChange={set("name")}
                    placeholder="Tu nombre"
                    className="w-full rounded-xl border border-gray-300 bg-white pl-10 pr-3 py-2.5 text-gray-900 placeholder:text-gray-400 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/10 transition-all"
                    style={{ fontSize: "0.875rem" }}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-gray-700" style={{ fontSize: "0.8125rem", fontWeight: 500 }}>
                  Farmacia
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={form.pharmacy}
                    onChange={set("pharmacy")}
                    placeholder="Nombre"
                    className="w-full rounded-xl border border-gray-300 bg-white pl-10 pr-3 py-2.5 text-gray-900 placeholder:text-gray-400 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/10 transition-all"
                    style={{ fontSize: "0.875rem" }}
                  />
                </div>
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-gray-700" style={{ fontSize: "0.8125rem", fontWeight: 500 }}>
                Correo electrónico <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="email"
                  value={form.email}
                  onChange={set("email")}
                  placeholder="tu@farmacia.com"
                  className="w-full rounded-xl border border-gray-300 bg-white pl-10 pr-4 py-2.5 text-gray-900 placeholder:text-gray-400 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/10 transition-all"
                  style={{ fontSize: "0.875rem" }}
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-gray-700" style={{ fontSize: "0.8125rem", fontWeight: 500 }}>
                Contraseña <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={set("password")}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-gray-300 bg-white pl-10 pr-12 py-2.5 text-gray-900 placeholder:text-gray-400 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/10 transition-all"
                  style={{ fontSize: "0.875rem" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {/* Password strength */}
              {(passwordFocused || form.password.length > 0) && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="space-y-2 pt-1"
                >
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${strengthColor}`}
                        style={{ width: `${(passwordStrength / 3) * 100}%` }}
                      />
                    </div>
                    {strengthLabel && (
                      <span
                        className={`${
                          passwordStrength === 3
                            ? "text-cyan-500"
                            : passwordStrength === 2
                            ? "text-yellow-500"
                            : "text-red-400"
                        }`}
                        style={{ fontSize: "0.75rem", fontWeight: 500 }}
                      >
                        {strengthLabel}
                      </span>
                    )}
                  </div>
                  <div className="space-y-1">
                    {passwordRequirements.map((req) => {
                      const met = req.test(form.password);
                      return (
                        <div key={req.label} className="flex items-center gap-1.5">
                          <CheckCircle2
                            className={`h-3 w-3 transition-colors ${met ? "text-cyan-500" : "text-gray-300"}`}
                          />
                          <span
                            className={`transition-colors ${met ? "text-gray-600" : "text-gray-400"}`}
                            style={{ fontSize: "0.75rem" }}
                          >
                            {req.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </div>

            {/* Confirm password */}
            <div className="space-y-1.5">
              <label className="text-gray-700" style={{ fontSize: "0.8125rem", fontWeight: 500 }}>
                Confirmar contraseña <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type={showConfirm ? "text" : "password"}
                  value={form.confirmPassword}
                  onChange={set("confirmPassword")}
                  placeholder="••••••••"
                  className={`w-full rounded-xl border bg-white pl-10 pr-12 py-2.5 text-gray-900 placeholder:text-gray-400 outline-none focus:ring-2 transition-all ${
                    form.confirmPassword && form.confirmPassword !== form.password
                      ? "border-red-300 focus:border-red-400 focus:ring-red-400/10"
                      : form.confirmPassword && form.confirmPassword === form.password
                      ? "border-cyan-400 focus:border-cyan-500 focus:ring-cyan-500/10"
                      : "border-gray-300 focus:border-cyan-500 focus:ring-cyan-500/10"
                  }`}
                  style={{ fontSize: "0.875rem" }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {form.confirmPassword && form.confirmPassword !== form.password && (
                <p className="text-red-500" style={{ fontSize: "0.75rem" }}>
                  Las contraseñas no coinciden
                </p>
              )}
              {form.confirmPassword && form.confirmPassword === form.password && (
                <p className="text-cyan-500 flex items-center gap-1" style={{ fontSize: "0.75rem" }}>
                  <CheckCircle2 className="h-3 w-3" />
                  Las contraseñas coinciden
                </p>
              )}
            </div>

            {/* Terms */}
            <p className="text-gray-400 pt-1" style={{ fontSize: "0.8125rem", lineHeight: 1.6 }}>
              Al registrarte aceptas nuestros{" "}
              <Link to="/terms" className="text-cyan-500 hover:text-cyan-600 transition-colors">
                Términos de uso
              </Link>{" "}
              y{" "}
              <Link to="/terms" className="text-cyan-500 hover:text-cyan-600 transition-colors">
                Política de privacidad
              </Link>
              .
            </p>

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
                  Creando cuenta...
                </>
              ) : (
                <>
                  Crear cuenta
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Login link */}
          <p className="text-center text-gray-500 mt-6" style={{ fontSize: "0.9375rem" }}>
            ¿Ya tienes una cuenta?{" "}
            <Link
              to="/login"
              className="text-cyan-500 hover:text-cyan-600 transition-colors"
              style={{ fontWeight: 600 }}
            >
              Inicia sesión
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}