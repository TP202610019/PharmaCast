import { AuthShell } from "../components/AuthShell";
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  Activity, Eye, EyeOff, ArrowRight, Lock, Mail, AlertCircle,
  CheckCircle2, Clock, ShoppingCart,
} from "lucide-react";
import { motion } from "motion/react";
import { useAuth, extractApiErrorMessage } from "../context/AuthContext";

export function Login() {
  const navigate = useNavigate();
  const { login, loginDemo } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError("Por favor completa todos los campos.");
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
      navigate("/panel");
    } catch (err) {
      setError(extractApiErrorMessage(err, "Correo o contraseña incorrectos."));
    } finally {
      setLoading(false);
    }
  };

  const handleDemo = async () => {
    setLoading(true); setError("");
    try { await loginDemo(); navigate("/panel"); }
    catch (err) { setError(extractApiErrorMessage(err, "No se pudo acceder a la cuenta demo.")); }
    finally { setLoading(false); }
  };

  return <AuthShell mode="login"><div className="auth-form">
          <div className="mb-8">
            <h1 className="text-gray-900 mb-2" style={{ fontSize: "1.875rem", fontWeight: 700 }}>
              Iniciar sesión
            </h1>
            </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                role="alert" className="flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3"
              >
                <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                <p className="text-red-600" style={{ fontSize: "0.875rem" }}>{error}</p>
              </motion.div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="login-email" className="text-gray-700" style={{ fontSize: "0.875rem", fontWeight: 500 }}>
                Correo electrónico
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input id="login-email" name="login-email" autoComplete="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@farmacia.com"
                  className="w-full rounded-xl border border-gray-300 bg-white pl-10 pr-4 py-3 text-gray-900 placeholder:text-gray-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
                  style={{ fontSize: "0.9375rem" }}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="login-password" className="text-gray-700" style={{ fontSize: "0.875rem", fontWeight: 500 }}>
                  Contraseña
                </label>
                <Link
                  to="/acceso/recuperar"
                  className="text-blue-500 hover:text-blue-600 transition-colors"
                  style={{ fontSize: "0.8125rem" }}
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input id="login-password" name="login-password" autoComplete="current-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-gray-300 bg-white pl-10 pr-12 py-3 text-gray-900 placeholder:text-gray-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
                  style={{ fontSize: "0.9375rem" }}
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
            </div>

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
            onClick={handleDemo}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-6 py-3 text-gray-600 transition-all hover:border-gray-400 hover:text-gray-900 hover:shadow-sm"
            style={{ fontSize: "0.9375rem" }}
          >
            Acceder con cuenta demo
          </button>

          <p className="text-center text-gray-500 mt-8" style={{ fontSize: "0.9375rem" }}>
            ¿No tienes una cuenta?{" "}
            <Link
              to="/registro"
              className="text-blue-500 hover:text-blue-600 transition-colors"
              style={{ fontWeight: 600 }}
            >
              Crear una cuenta
            </Link>
          </p>

  </div></AuthShell>;
}
