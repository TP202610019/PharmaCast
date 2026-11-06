import { AuthShell } from "../components/AuthShell";
import { useState, useRef, useEffect } from "react";
import { Link } from "react-router";
import { Lock, Eye, EyeOff, Activity, Mail, ArrowLeft, CheckCircle, AlertCircle, Send, RefreshCw, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

type Step = "email" | "verify" | "reset" | "success";

export function ForgotPassword() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Code state
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [codeError, setCodeError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Reset state
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [resetError, setResetError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    return () => { if (cooldownRef.current) clearInterval(cooldownRef.current); };
  }, []);

  const startCooldown = () => {
    setResendCooldown(60);
    cooldownRef.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) { clearInterval(cooldownRef.current!); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email) { setError("Por favor ingresa tu correo electrónico."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError("Por favor ingresa un correo electrónico válido."); return; }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStep("verify");
      startCooldown();
      setTimeout(() => inputRefs.current[0]?.focus(), 300);
    }, 1400);
  };

  const handleCodeInput = (idx: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...code];
    next[idx] = digit;
    setCode(next);
    setCodeError("");
    if (digit && idx < 5) inputRefs.current[idx + 1]?.focus();
  };

  const handleCodeKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !code[idx] && idx > 0) inputRefs.current[idx - 1]?.focus();
    if (e.key === "ArrowLeft" && idx > 0) inputRefs.current[idx - 1]?.focus();
    if (e.key === "ArrowRight" && idx < 5) inputRefs.current[idx + 1]?.focus();
  };

  const handleCodePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const next = Array(6).fill("").map((_, i) => pasted[i] ?? "");
    setCode(next);
    const focusIdx = Math.min(pasted.length, 5);
    setTimeout(() => inputRefs.current[focusIdx]?.focus(), 0);
  };

  const handleResend = () => {
    if (resendCooldown > 0) return;
    setCode(["", "", "", "", "", ""]);
    setCodeError("");
    startCooldown();
    setTimeout(() => inputRefs.current[0]?.focus(), 100);
  };

  const handleVerify = () => {
    const fullCode = code.join("");
    if (fullCode.length < 6) { setCodeError("Por favor ingresa los 6 dígitos del código."); return; }
    setVerifying(true);
    setCodeError("");
    setTimeout(() => {
      setVerifying(false);
      setStep("reset");
    }, 1400);
  };

  const handleSavePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setResetError("");
    if (newPass.length < 8) { setResetError("La nueva contraseña debe tener al menos 8 caracteres."); return; }
    if (newPass !== confirmPass) { setResetError("Las contraseñas no coinciden."); return; }
    
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setStep("success");
    }, 1200);
  };

  return <AuthShell mode="recovery"><div className="auth-form auth-recovery-form">          <AnimatePresence mode="wait">

            {/* ── STEP 1: EMAIL ── */}
            {step === "email" && (
              <motion.div key="email" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.25 }}>
                <div className="mb-8">
                  <p className="text-blue-500 mb-1" style={{ fontSize: "0.8125rem", fontWeight: 600, letterSpacing: "0.05em" }}>PASO 1 DE 3</p>
                  <h1 className="text-gray-900 mb-2" style={{ fontSize: "1.75rem", fontWeight: 700 }}>¿Olvidaste tu contraseña?</h1>
                  <p className="text-gray-500" style={{ fontSize: "0.9375rem" }}>Ingresa tu correo y te enviaremos un código de 6 dígitos</p>
                </div>

                <form onSubmit={handleEmailSubmit} className="space-y-5">
                  {error && (
                    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                      <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                      <p className="text-red-600" style={{ fontSize: "0.875rem" }}>{error}</p>
                    </motion.div>
                  )}
                  <div className="space-y-1.5">
                    <label className="text-gray-700" style={{ fontSize: "0.875rem", fontWeight: 500 }}>Correo electrónico</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@farmacia.com"
                        className="w-full rounded-xl border border-gray-300 bg-white pl-10 pr-4 py-3 text-gray-900 placeholder:text-gray-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
                        style={{ fontSize: "0.9375rem" }} />
                    </div>
                  </div>
                  <button type="submit" disabled={loading}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-500 px-6 py-3 text-white transition-all hover:bg-blue-400 hover:shadow-lg hover:shadow-blue-500/20 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
                    style={{ fontWeight: 600, fontSize: "0.9375rem" }}>
                    {loading ? (
                      <><svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>Enviando código...</>
                    ) : (
                      <><Send className="h-4 w-4" />Enviar código de verificación</>
                    )}
                  </button>
                </form>

                <p className="text-center text-gray-500 mt-8" style={{ fontSize: "0.9375rem" }}>
                  ¿Recordaste tu contraseña?{" "}
                  <Link to="/acceso" className="text-blue-500 hover:text-blue-600 transition-colors" style={{ fontWeight: 600 }}>Inicia sesión</Link>
                </p>
              </motion.div>
            )}

            {/* ── STEP 2: CODE VERIFICATION ── */}
            {step === "verify" && (
              <motion.div key="verify" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.25 }}>
                <div className="mb-8">
                  <p className="text-blue-500 mb-1" style={{ fontSize: "0.8125rem", fontWeight: 600, letterSpacing: "0.05em" }}>PASO 2 DE 3</p>
                  <h1 className="text-gray-900 mb-2" style={{ fontSize: "1.75rem", fontWeight: 700 }}>Verifica tu identidad</h1>

                  {/* Info banner */}
                  <div className="flex items-start gap-3 mt-4 rounded-xl border border-blue-500/20 bg-blue-500/5 px-4 py-3.5">
                    <ShieldCheck className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-gray-700" style={{ fontSize: "0.875rem", fontWeight: 500 }}>
                        Se envió un código de 6 dígitos a:
                      </p>
                      <p className="text-blue-600 mt-0.5" style={{ fontSize: "0.875rem", fontWeight: 700 }}>{email}</p>
                      <p className="text-gray-400 mt-1" style={{ fontSize: "0.75rem" }}>Revisa tu bandeja de entrada y la carpeta de spam</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* 6-digit code inputs */}
                  <div>
                    <label className="text-gray-700 mb-3 block" style={{ fontSize: "0.875rem", fontWeight: 500 }}>
                      Código de verificación
                    </label>
                    <div className="flex gap-3 justify-between" onPaste={handleCodePaste}>
                      {code.map((digit, i) => (
                        <input
                          key={i}
                          ref={(el) => { inputRefs.current[i] = el; }}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleCodeInput(i, e.target.value)}
                          onKeyDown={(e) => handleCodeKeyDown(i, e)}
                          className={`h-14 w-12 rounded-xl border-2 text-center outline-none transition-all text-gray-900 ${
                            digit
                              ? "border-blue-500 bg-blue-500/5 shadow-sm shadow-blue-500/10"
                              : codeError
                              ? "border-red-300 bg-red-50"
                              : "border-gray-300 bg-white hover:border-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                          }`}
                          style={{ fontSize: "1.375rem", fontWeight: 700 }}
                        />
                      ))}
                    </div>
                    {codeError && (
                      <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="text-red-500 mt-2 flex items-center gap-1.5" style={{ fontSize: "0.8125rem" }}>
                        <AlertCircle className="h-3.5 w-3.5" />{codeError}
                      </motion.p>
                    )}
                  </div>

                  {/* Verify button */}
                  <button onClick={handleVerify} disabled={verifying || code.join("").length < 6}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-500 px-6 py-3 text-white transition-all hover:bg-blue-400 hover:shadow-lg hover:shadow-blue-500/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ fontWeight: 600, fontSize: "0.9375rem" }}>
                    {verifying ? (
                      <><svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>Verificando...</>
                    ) : (
                      <><ShieldCheck className="h-4 w-4" />Verificar código</>
                    )}
                  </button>

                  {/* Resend code */}
                  <div className="flex flex-col items-center gap-2 pt-2">
                    <p className="text-gray-500" style={{ fontSize: "0.875rem" }}>¿No recibiste el código?</p>
                    {resendCooldown > 0 ? (
                      <div className="flex items-center gap-2 text-gray-400" style={{ fontSize: "0.875rem" }}>
                        <RefreshCw className="h-3.5 w-3.5" />
                        <span>Reenviar en <span className="text-gray-600" style={{ fontWeight: 600 }}>{resendCooldown}s</span></span>
                      </div>
                    ) : (
                      <button onClick={handleResend}
                        className="flex items-center gap-1.5 text-blue-500 hover:text-blue-600 transition-colors"
                        style={{ fontSize: "0.875rem", fontWeight: 600 }}>
                        <RefreshCw className="h-3.5 w-3.5" />
                        Reenviar código
                      </button>
                    )}
                  </div>

                  {/* Change email */}
                  <div className="text-center border-t border-gray-100 pt-5">
                    <button onClick={() => { setStep("email"); setCode(["", "", "", "", "", ""]); setCodeError(""); }}
                      className="text-gray-400 hover:text-gray-600 transition-colors" style={{ fontSize: "0.8125rem" }}>
                      ← Cambiar correo electrónico
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── STEP 3: RESET PASSWORD ── */}
            {step === "reset" && (
              <motion.div key="reset" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.25 }}>
                <div className="mb-8">
                  <p className="text-blue-500 mb-1" style={{ fontSize: "0.8125rem", fontWeight: 600, letterSpacing: "0.05em" }}>PASO 3 DE 3</p>
                  <h1 className="text-gray-900 mb-2" style={{ fontSize: "1.75rem", fontWeight: 700 }}>Crea una nueva contraseña</h1>
                  <p className="text-gray-500" style={{ fontSize: "0.9375rem" }}>Asegúrate de que tenga al menos 8 caracteres.</p>
                </div>

                <form onSubmit={handleSavePassword} className="space-y-5">
                  {resetError && (
                    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                      <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                      <p className="text-red-600" style={{ fontSize: "0.875rem" }}>{resetError}</p>
                    </motion.div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <label className="text-gray-700 block mb-1.5" style={{ fontSize: "0.875rem", fontWeight: 500 }}>Nueva contraseña</label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input type={showNewPass ? "text" : "password"} value={newPass}
                          onChange={(e) => setNewPass(e.target.value)} placeholder="Mín. 8 caracteres" autoFocus
                          className="w-full rounded-xl border border-gray-300 bg-white pl-10 pr-10 py-3 text-gray-900 placeholder:text-gray-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
                          style={{ fontSize: "0.9375rem" }} />
                        <button type="button" onClick={() => setShowNewPass(!showNewPass)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                          {showNewPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="text-gray-700 block mb-1.5" style={{ fontSize: "0.875rem", fontWeight: 500 }}>Confirmar nueva contraseña</label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input type={showConfirmPass ? "text" : "password"} value={confirmPass}
                          onChange={(e) => setConfirmPass(e.target.value)} placeholder="Repite la nueva contraseña"
                          className={`w-full rounded-xl border bg-white pl-10 pr-10 py-3 text-gray-900 placeholder:text-gray-400 outline-none focus:ring-2 transition-all ${
                            confirmPass && confirmPass === newPass
                              ? "border-green-400 focus:border-green-500 focus:ring-green-500/20"
                              : "border-gray-300 focus:border-blue-500 focus:ring-blue-500/10"
                          }`}
                          style={{ fontSize: "0.9375rem" }} />
                        <button type="button" onClick={() => setShowConfirmPass(!showConfirmPass)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                          {showConfirmPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {confirmPass && confirmPass === newPass && (
                        <p className="flex items-center gap-1 text-green-500 mt-2" style={{ fontSize: "0.8125rem" }}>
                          <CheckCircle className="h-3.5 w-3.5" /> Las contraseñas coinciden
                        </p>
                      )}
                    </div>
                  </div>

                  <button type="submit" disabled={saving || !newPass || !confirmPass}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-500 px-6 py-3 text-white transition-all hover:bg-blue-400 hover:shadow-lg hover:shadow-blue-500/20 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed mt-4"
                    style={{ fontWeight: 600, fontSize: "0.9375rem" }}>
                    {saving ? (
                      <><svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>Guardando...</>
                    ) : (
                      <>Guardar</>
                    )}
                  </button>
                </form>
              </motion.div>
            )}

            {/* ── SUCCESS POPUP / VIEW ── */}
            {step === "success" && (
              <motion.div key="success" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }} className="text-center relative z-10 bg-white rounded-3xl p-8 border border-gray-100 shadow-xl shadow-blue-500/5">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-green-500/10 border border-green-500/20 mx-auto mb-6">
                  <CheckCircle className="h-10 w-10 text-green-500" />
                </div>
                <h2 className="text-gray-900 mb-3" style={{ fontSize: "1.5rem", fontWeight: 700 }}>Cambio de contraseña exitoso</h2>
                <p className="text-gray-500 mb-8" style={{ fontSize: "0.9375rem", lineHeight: 1.6 }}>
                  Tu contraseña se ha actualizado correctamente. Ya puedes acceder a tu cuenta de PharmaCast con tus nuevas credenciales.
                </p>
                <Link to="/acceso"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-500 px-6 py-3 text-white transition-all hover:bg-blue-400 hover:shadow-lg hover:shadow-blue-500/20"
                  style={{ fontWeight: 600, fontSize: "0.9375rem" }}>
                  <ArrowLeft className="h-4 w-4" />
                  Iniciar sesión
                </Link>
              </motion.div>
            )}
          </AnimatePresence></div></AuthShell>;
}
