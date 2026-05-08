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
  Clock,
  ShoppingCart,
} from "lucide-react";
import { motion } from "motion/react";
import { useAuth } from "../context/AuthContext";

const passwordRequirements = [
  { label: "Al menos 8 caracteres", test: (p: string) => p.length >= 8 },
  { label: "Una letra mayúscula", test: (p: string) => /[A-Z]/.test(p) },
  { label: "Un número", test: (p: string) => /[0-9]/.test(p) },
];

export function Register() {
  const navigate = useNavigate();
  const { login } = useAuth();
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
      login({ name: form.name, email: form.email, pharmacy: form.pharmacy || "Mi Farmacia" });
      navigate("/dashboard");
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
    <div className="min-h-screen flex">
      {/* ── LEFT: solid cyan panel ── */}
      <div className="hidden lg:flex lg:w-5/12 flex-col relative overflow-hidden bg-cyan-500">
        {/* Decorative circles */}
        <div className="absolute -top-28 -right-28 w-72 h-72 rounded-full bg-white/5" />
        <div className="absolute top-1/3 -left-20 w-60 h-60 rounded-full bg-white/[0.07]" />
        <div className="absolute -bottom-24 right-8 w-64 h-64 rounded-full bg-white/5" />
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
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 bg-white overflow-y-auto">
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
          <div className="mb-7">
            <p className="text-cyan-500 mb-1" style={{ fontSize: "0.8125rem", fontWeight: 600, letterSpacing: "0.05em" }}>
              CREAR CUENTA
            </p>
            <h1 className="text-gray-900 mb-2" style={{ fontSize: "1.875rem", fontWeight: 700 }}>
              Registrarse
            </h1>
            <p className="text-gray-500" style={{ fontSize: "0.9375rem" }}>
              Crea una cuenta para guardar tus predicciones y exportar planes.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
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
                          <CheckCircle2 className={`h-3 w-3 transition-colors ${met ? "text-cyan-500" : "text-gray-300"}`} />
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
                <p className="text-red-500" style={{ fontSize: "0.75rem" }}>Las contraseñas no coinciden</p>
              )}
              {form.confirmPassword && form.confirmPassword === form.password && (
                <p className="text-cyan-500 flex items-center gap-1" style={{ fontSize: "0.75rem" }}>
                  <CheckCircle2 className="h-3 w-3" />
                  Las contraseñas coinciden
                </p>
              )}
            </div>

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