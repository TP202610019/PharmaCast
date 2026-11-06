import { AuthFieldError } from "../components/AuthFieldError";
import { PasswordRequirements } from "../components/PasswordRequirements";
import { AuthShell } from "../components/AuthShell";
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
  CheckCircle2,
  Clock,
  ShoppingCart,
} from "lucide-react";
import { motion } from "motion/react";
import { useAuth, extractApiErrorMessage } from "../context/AuthContext";

export function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [form, setForm] = useState({
    name: "",
    pharmacy: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof typeof form, string>>>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
    setFieldErrors((prev) => ({ ...prev, [key]: undefined, ...(key === "password" ? { confirmPassword: undefined } : {}) }));
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const errors: typeof fieldErrors = {};
    if (!form.name.trim()) errors.name = "Ingresa tu nombre.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errors.email = "Ingresa un correo válido.";
    if (form.password.length < 8) errors.password = "Usa al menos 8 caracteres.";
    else if (!/[A-Z]/.test(form.password)) errors.password = "Incluye una mayúscula.";
    else if (!/[0-9]/.test(form.password)) errors.password = "Incluye un número.";
    if (!form.confirmPassword) errors.confirmPassword = "Confirma tu contraseña.";
    else if (form.password !== form.confirmPassword) errors.confirmPassword = "Las contraseñas no coinciden.";
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;

    setLoading(true);
    try {
      await register(form.name.trim(), form.email.trim(), form.password, form.pharmacy || "Mi Farmacia");
      navigate("/panel");
    } catch (err) {
      setError(extractApiErrorMessage(err, "No se pudo crear la cuenta. Intenta de nuevo."));
    } finally {
      setLoading(false);
    }
  };



  return <AuthShell mode="register"><div className="auth-form">
          <div className="mb-7">
            <h1 className="text-gray-900 mb-2" style={{ fontSize: "1.875rem", fontWeight: 700 }}>
              Crea tu cuenta
            </h1>
            </div>

          <form noValidate onSubmit={handleSubmit} className="space-y-4">


            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label htmlFor="register-name" className="text-gray-700" style={{ fontSize: "0.8125rem", fontWeight: 500 }}>
                  Nombre <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input id="register-name" name="register-name" autoComplete="name"
                    type="text"
                    value={form.name}
                    onChange={set("name")}
                    placeholder="Tu nombre"
                    className="w-full rounded-xl border border-gray-300 bg-white pl-10 pr-3 py-2.5 text-gray-900 placeholder:text-gray-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
                    style={{ fontSize: "0.875rem" }}
                  />
                </div>
                <AuthFieldError message={fieldErrors.name} />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="register-pharmacy" className="text-gray-700" style={{ fontSize: "0.8125rem", fontWeight: 500 }}>
                  Farmacia
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input id="register-pharmacy" name="register-pharmacy" autoComplete="organization"
                    type="text"
                    value={form.pharmacy}
                    onChange={set("pharmacy")}
                    placeholder="Nombre"
                    className="w-full rounded-xl border border-gray-300 bg-white pl-10 pr-3 py-2.5 text-gray-900 placeholder:text-gray-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
                    style={{ fontSize: "0.875rem" }}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="register-email" className="text-gray-700" style={{ fontSize: "0.8125rem", fontWeight: 500 }}>
                Correo electrónico <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input id="register-email" name="register-email" autoComplete="email"
                  type="email"
                  value={form.email}
                  onChange={set("email")}
                  placeholder="tu@farmacia.com"
                  className="w-full rounded-xl border border-gray-300 bg-white pl-10 pr-4 py-2.5 text-gray-900 placeholder:text-gray-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
                  style={{ fontSize: "0.875rem" }}
                />
              </div>
              <AuthFieldError message={fieldErrors.email} />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="register-password" className="text-gray-700" style={{ fontSize: "0.8125rem", fontWeight: 500 }}>
                Contraseña <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input id="register-password" name="register-password" autoComplete="new-password"
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={set("password")}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-gray-300 bg-white pl-10 pr-12 py-2.5 text-gray-900 placeholder:text-gray-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
                  style={{ fontSize: "0.875rem" }}
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <AuthFieldError message={fieldErrors.password} />
              {(passwordFocused || form.password.length > 0) && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="space-y-2 pt-1"
                >
                  <PasswordRequirements password={form.password} />
                </motion.div>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="register-confirm" className="text-gray-700" style={{ fontSize: "0.8125rem", fontWeight: 500 }}>
                Confirmar contraseña <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input id="register-confirm" name="register-confirm" autoComplete="new-password"
                  type={showConfirm ? "text" : "password"}
                  value={form.confirmPassword}
                  onChange={set("confirmPassword")}
                  placeholder="••••••••"
                  className={`w-full rounded-xl border bg-white pl-10 pr-12 py-2.5 text-gray-900 placeholder:text-gray-400 outline-none focus:ring-2 transition-all ${
                    form.confirmPassword && form.confirmPassword !== form.password
                      ? "border-red-300 focus:border-red-400 focus:ring-red-400/10"
                      : form.confirmPassword && form.confirmPassword === form.password
                      ? "border-blue-400 focus:border-blue-500 focus:ring-blue-500/10"
                      : "border-gray-300 focus:border-blue-500 focus:ring-blue-500/10"
                  }`}
                  style={{ fontSize: "0.875rem" }}
                />
                <button
                  type="button"
                  aria-label={showConfirm ? "Ocultar confirmación" : "Mostrar confirmación"}
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <AuthFieldError message={fieldErrors.confirmPassword || (form.confirmPassword && form.confirmPassword !== form.password ? "Las contraseñas no coinciden." : "")} />
              {form.confirmPassword && form.confirmPassword === form.password && (
                <p className="text-blue-500 flex items-center gap-1" style={{ fontSize: "0.75rem" }}>
                  <CheckCircle2 className="h-3 w-3" />
                  Las contraseñas coinciden
                </p>
              )}
            </div>

            <p className="text-gray-400 pt-1" style={{ fontSize: "0.8125rem", lineHeight: 1.6 }}>
              Al registrarte aceptas nuestros{" "}
              <Link to="/terminos?from=register" className="text-blue-500 hover:text-blue-600 transition-colors">
                Términos de uso
              </Link>{" "}
              y{" "}
              <Link to="/terminos?from=register" className="text-blue-500 hover:text-blue-600 transition-colors">
                Política de privacidad
              </Link>
              .
            </p>

            <AuthFieldError message={error} />

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-500 px-6 py-3 text-white transition-all hover:bg-blue-400 hover:shadow-lg hover:shadow-blue-500/20 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
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
              to="/acceso"
              className="text-blue-500 hover:text-blue-600 transition-colors"
              style={{ fontWeight: 600 }}
            >
              Inicia sesión
            </Link>
          </p>

  </div></AuthShell>;
}
