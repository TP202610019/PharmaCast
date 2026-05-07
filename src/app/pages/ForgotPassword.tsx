import { useState } from "react";
import { Link } from "react-router";
import { Activity, Mail, ArrowLeft, CheckCircle, AlertCircle, Send } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email) {
      setError("Por favor ingresa tu correo electrónico.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Por favor ingresa un correo electrónico válido.");
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 1400);
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
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-cyan-500/8 rounded-full blur-3xl pointer-events-none" />
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
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-500/10 border border-cyan-500/20 mb-6">
                <Mail className="h-8 w-8 text-cyan-500" />
              </div>

              <h2 className="text-gray-900 mb-4" style={{ fontSize: "1.75rem", fontWeight: 700, lineHeight: 1.2 }}>
                Recupera el acceso a tu{" "}
                <span className="text-cyan-500">cuenta</span>
              </h2>
              <p className="text-gray-500 mb-8" style={{ fontSize: "0.9375rem", lineHeight: 1.7 }}>
                Te enviaremos un enlace seguro a tu correo para que puedas restablecer tu contraseña en minutos.
              </p>

              {/* Steps */}
              <div className="space-y-4">
                {[
                  { step: "1", label: "Ingresa tu correo registrado" },
                  { step: "2", label: "Revisa tu bandeja de entrada" },
                  { step: "3", label: "Sigue el enlace y crea una nueva contraseña" },
                ].map((item) => (
                  <div key={item.step} className="flex items-center gap-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cyan-500/10 border border-cyan-500/20">
                      <span className="text-cyan-600" style={{ fontSize: "0.75rem", fontWeight: 700 }}>{item.step}</span>
                    </div>
                    <span className="text-gray-600" style={{ fontSize: "0.875rem" }}>{item.label}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

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
          {/* Back to login */}
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-gray-400 hover:text-gray-700 transition-colors mb-8"
            style={{ fontSize: "0.875rem" }}
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al inicio de sesión
          </Link>

          <AnimatePresence mode="wait">
            {!submitted ? (
              <motion.div
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="mb-8">
                  <h1 className="text-gray-900 mb-2" style={{ fontSize: "1.75rem", fontWeight: 700 }}>
                    ¿Olvidaste tu contraseña?
                  </h1>
                  <p className="text-gray-500" style={{ fontSize: "0.9375rem" }}>
                    Ingresa tu correo y te enviaremos instrucciones para recuperarla
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Error */}
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
                        Enviando instrucciones...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        Enviar instrucciones
                      </>
                    )}
                  </button>
                </form>

                <p className="text-center text-gray-500 mt-8" style={{ fontSize: "0.9375rem" }}>
                  ¿Recordaste tu contraseña?{" "}
                  <Link
                    to="/login"
                    className="text-cyan-500 hover:text-cyan-600 transition-colors"
                    style={{ fontWeight: 600 }}
                  >
                    Inicia sesión
                  </Link>
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
                className="text-center"
              >
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-cyan-500/10 border border-cyan-500/20 mx-auto mb-6">
                  <CheckCircle className="h-10 w-10 text-cyan-500" />
                </div>
                <h2 className="text-gray-900 mb-3" style={{ fontSize: "1.5rem", fontWeight: 700 }}>
                  ¡Correo enviado!
                </h2>
                <p className="text-gray-500 mb-2" style={{ fontSize: "0.9375rem", lineHeight: 1.6 }}>
                  Hemos enviado instrucciones de recuperación a:
                </p>
                <p className="text-cyan-500 mb-8" style={{ fontWeight: 600, fontSize: "0.9375rem" }}>
                  {email}
                </p>
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-left mb-8">
                  <p className="text-gray-500" style={{ fontSize: "0.8125rem", lineHeight: 1.6 }}>
                    Si no ves el correo en tu bandeja principal, revisa la carpeta de <span className="text-gray-700 font-medium">spam o correo no deseado</span>. El enlace de recuperación expira en <span className="text-gray-700 font-medium">24 horas</span>.
                  </p>
                </div>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-6 py-3 text-white transition-all hover:bg-cyan-400 hover:shadow-lg hover:shadow-cyan-500/20"
                  style={{ fontWeight: 600, fontSize: "0.9375rem" }}
                >
                  <ArrowLeft className="h-4 w-4" />
                  Volver al inicio de sesión
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
