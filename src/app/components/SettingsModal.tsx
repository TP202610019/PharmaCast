import { PasswordRequirements, passwordRequirements } from "./PasswordRequirements";
import { AuthFieldError } from "./AuthFieldError";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X, User, Mail, Building2, Lock, Eye, EyeOff, CheckCircle2,
  Save,
  Pencil,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

interface Props { open: boolean; onClose: () => void; }

type EditField = "name" | "pharmacy" | "password" | null;

export function SettingsModal({ open, onClose }: Props) {
  const { user, updateUser } = useAuth();

  const [editField, setEditField] = useState<EditField>(null);
  const [saved, setSaved] = useState(false);

  /* ── Inline edit state ── */
  const [editNameVal, setEditNameVal] = useState("");
  const [editPharmacyVal, setEditPharmacyVal] = useState("");
  const [passVals, setPassVals] = useState({ current: "", newPass: "", confirm: "" });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passError, setPassError] = useState("");

  const openEdit = (field: EditField) => {
    setPassError("");
    setPassVals({ current: "", newPass: "", confirm: "" });
    setShowCurrent(false); setShowNew(false); setShowConfirm(false);
    if (field === "name") setEditNameVal(user?.name ?? "");
    if (field === "pharmacy") setEditPharmacyVal(user?.pharmacy ?? "");
    setEditField(field);
  };

  const closeEdit = () => setEditField(null);

  const saveEdit = () => {
    if (editField === "name") {
      if (!editNameVal.trim()) return;
      updateUser({ name: editNameVal.trim() });
    } else if (editField === "pharmacy") {
      if (!editPharmacyVal.trim()) return;
      updateUser({ pharmacy: editPharmacyVal.trim() });
    } else if (editField === "password") {
      setPassError("");
      if (!passVals.current) { setPassError("Ingresa tu contraseña actual."); return; }
      if (!passwordRequirements.every((rule) => rule.test(passVals.newPass))) { setPassError("Completa los requisitos de la contraseña."); return; }
      if (passVals.newPass !== passVals.confirm) { setPassError("Las contraseñas no coinciden."); return; }
    }
    setSaved(true);
    setTimeout(() => { setSaved(false); closeEdit(); }, 1200);
  };

  const handleClose = () => {
    setEditField(null);
    setPassError("");
    onClose();
  };

  return (
    <>
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div key="settings-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 settings-backdrop bg-black/25" onClick={handleClose} />

            {/* Modal */}
            <motion.div key="settings-modal" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.16, ease: "easeOut" }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">

              <div role="dialog" aria-modal="true" aria-label="Mi cuenta" className="settings-dialog bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-2xl pointer-events-auto flex flex-col relative"
                style={{ maxHeight: "80vh" }}>

                {/* ── Header ── */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
                  <div className="flex items-center gap-3">
                    <div>
                      <h2 className="text-gray-900" style={{ fontSize: "1rem", fontWeight: 700 }}>Mi cuenta</h2>
                      
                    </div>
                  </div>
                  <button onClick={handleClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* ── Content ── */}
                <div className="settings-body flex-1 overflow-y-auto">

                  <div className="settings-account p-6 space-y-4 relative">
                    {/* User avatar row */}
                    <div className="settings-profile flex items-center gap-4 px-1 py-3">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-500 shrink-0">
                        <span className="text-white" style={{ fontSize: "1.375rem", fontWeight: 700 }}>{(user?.name ?? "U")[0].toUpperCase()}</span>
                      </div>
                      <div>
                        <p className="text-gray-900" style={{ fontWeight: 700 }}>{user?.name}</p>
                        <p className="text-gray-400" style={{ fontSize: "0.8125rem" }}>{user?.email}</p>
                        <p className="text-gray-400" style={{ fontSize: "0.75rem" }}>{user?.pharmacy}</p>
                      </div>
                    </div>

                    {/* Info rows */}
                    {[
                      {
                        icon: User, label: "Nombre completo", value: user?.name ?? "", field: "name" as const,
                        color: "text-blue-500", bg: "bg-blue-500/10 border-blue-500/20",
                      },
                      {
                        icon: Building2, label: "Farmacia", value: user?.pharmacy ?? "", field: "pharmacy" as const,
                        color: "text-purple-500", bg: "bg-purple-500/10 border-purple-500/20",
                      },
                      {
                        icon: Mail, label: "Correo electrónico", value: user?.email ?? "", field: null,
                        color: "text-gray-400", bg: "bg-gray-100 border-gray-200", readonly: true,
                      },
                      {
                        icon: Lock, label: "Contraseña", value: "••••••••••", field: "password" as const,
                        color: "text-orange-500", bg: "bg-orange-500/10 border-orange-500/20",
                      },
                    ].map((row) => {
                      const Icon = row.icon;
                      return (
                        <div key={row.label} className="settings-account-row flex items-center gap-4 py-4">
                          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${row.bg}`}>
                            <Icon className={`h-4 w-4 ${row.color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-gray-500" style={{ fontSize: "0.75rem" }}>{row.label}</p>
                            <p className="text-gray-900 truncate" style={{ fontSize: "0.9rem", fontWeight: 500 }}>{row.value}</p>
                          </div>
                          {row.field && !row.readonly && (
                            <button onClick={() => openEdit(row.field as EditField)}
                              className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-gray-500 hover:border-gray-300 hover:text-gray-700 transition-all shrink-0"
                              style={{ fontSize: "0.75rem", fontWeight: 500 }}>
                              <Pencil className="h-3 w-3" />{row.field === "password" ? "Cambiar" : "Editar"}
                            </button>
                          )}
                          {row.readonly && (
                            <span className="rounded-full border border-gray-200 bg-gray-100 px-2.5 py-1 text-gray-400 shrink-0" style={{ fontSize: "0.6875rem" }}>
                              No editable
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                </div>

                {/* ── Footer ── */}
                <div className="settings-footer px-6 border-t border-gray-100 flex items-center justify-between gap-3 shrink-0">
                  <button onClick={handleClose} className="rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-gray-600 transition-all hover:border-gray-400 hover:text-gray-900" style={{ fontSize: "0.875rem" }}>
                    Cerrar
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Mini popup overlay ── */}
      <AnimatePresence>
        {open && editField !== null && (
          <motion.div key="edit-popup-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" onClick={closeEdit}>
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              role="dialog" aria-modal="true" className="pc-dialog settings-edit-dialog bg-white rounded-2xl border border-gray-200 shadow-2xl p-6 w-full max-w-sm mx-4 relative overflow-hidden"
              onClick={(e) => e.stopPropagation()}>

              {/* Name / Pharmacy popup */}
              {(editField === "name" || editField === "pharmacy") && (
                <>
                  <div className="flex items-center gap-2 mb-4">
                    {editField === "name"
                      ? <User className="h-4 w-4 text-blue-500" />
                      : <Building2 className="h-4 w-4 text-purple-500" />}
                    <h3 className="text-gray-900" style={{ fontWeight: 700, fontSize: "0.9375rem" }}>
                      {editField === "name" ? "Cambiar nombre" : "Cambiar farmacia"}
                    </h3>
                  </div>
                  <div className="relative mb-4">
                    <input type="text"
                      value={editField === "name" ? editNameVal : editPharmacyVal}
                      onChange={(e) => editField === "name" ? setEditNameVal(e.target.value) : setEditPharmacyVal(e.target.value)}
                      autoComplete="off" autoFocus
                      className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-gray-900 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/10 transition-all"
                      style={{ fontSize: "0.9375rem" }}
                      onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") closeEdit(); }}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={closeEdit} className="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-2 text-gray-600 hover:border-gray-400 transition-all" style={{ fontSize: "0.875rem" }}>
                      Cancelar
                    </button>
                    <button onClick={saveEdit}
                      className={`flex-1 flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-white transition-all ${saved ? "bg-green-500" : "bg-cyan-500 hover:bg-cyan-400"}`}
                      style={{ fontSize: "0.875rem", fontWeight: 600 }}>
                      {saved ? <><CheckCircle2 className="h-4 w-4" />Guardado</> : <><Save className="h-3.5 w-3.5" />Guardar</>}
                    </button>
                  </div>
                </>
              )}

              {/* Password popup */}
              {editField === "password" && (
                <>
                  <div className="flex items-center gap-2 mb-5">
                    <Lock className="h-4 w-4 text-blue-500" />
                    <h3 className="text-gray-900" style={{ fontWeight: 700, fontSize: "0.9375rem" }}>Cambiar contraseña</h3>
                  </div>

                  {/* Current password — muted style */}
                  <div className="mb-4">
                    <label className="text-gray-500 block mb-1.5" style={{ fontSize: "0.75rem", fontWeight: 500 }}>
                      Contraseña actual
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                      <input type={showCurrent ? "text" : "password"} value={passVals.current}
                        onChange={(e) => setPassVals((p) => ({ ...p, current: e.target.value }))}
                        placeholder="Tu contraseña actual" autoComplete="current-password" autoFocus
                        className="w-full rounded-lg border border-gray-200 bg-white pl-9 pr-10 py-2 text-gray-700 placeholder:text-gray-300 outline-none focus:border-gray-300 transition-all"
                        style={{ fontSize: "0.875rem" }} />
                      <button type="button" onClick={() => setShowCurrent(!showCurrent)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showCurrent ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* New password — highlighted style */}
                  <div className="space-y-4 mb-4">
                    <div>
                      <label className="text-gray-700 block mb-1.5" style={{ fontSize: "0.75rem", fontWeight: 500 }}>Nueva contraseña</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                        <input type={showNew ? "text" : "password"} value={passVals.newPass}
                          onChange={(e) => setPassVals((p) => ({ ...p, newPass: e.target.value }))}
                          placeholder="Mín. 8 caracteres" autoComplete="new-password"
                          className="w-full rounded-lg border border-gray-200 bg-white pl-9 pr-10 py-2 text-gray-900 placeholder:text-gray-300 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/10 transition-all"
                          style={{ fontSize: "0.875rem" }} />
                        <button type="button" onClick={() => setShowNew(!showNew)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                          {showNew ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                      {passVals.newPass && <div className="mt-2"><PasswordRequirements password={passVals.newPass} /></div>}
                    </div>
                    <div>
                      <label className="text-gray-700 block mb-1.5" style={{ fontSize: "0.75rem", fontWeight: 500 }}>Confirmar nueva contraseña</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                        <input type={showConfirm ? "text" : "password"} value={passVals.confirm}
                          onChange={(e) => setPassVals((p) => ({ ...p, confirm: e.target.value }))}
                          placeholder="Repite la nueva contraseña" autoComplete="new-password"
                          className={`w-full rounded-lg border bg-white pl-9 pr-10 py-2 text-gray-900 placeholder:text-gray-300 outline-none focus:ring-1 transition-all ${
                            passVals.confirm && passVals.confirm === passVals.newPass
                              ? "border-green-400 focus:border-green-500 focus:ring-green-500/20"
                              : "border-gray-200 focus:border-blue-500 focus:ring-blue-500/10"
                          }`}
                          style={{ fontSize: "0.875rem" }} />
                        <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                          {showConfirm ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                      {passVals.confirm && passVals.confirm === passVals.newPass && (
                        <p className="flex items-center gap-1 text-green-500 mt-1" style={{ fontSize: "0.75rem" }}>
                          <CheckCircle2 className="h-3 w-3" /> Las contraseñas coinciden
                        </p>
                      )}
                    </div>
                  </div>

                  <AuthFieldError message={passError} />

                  <div className="flex gap-2 mt-3">
                    <button onClick={closeEdit} className="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-2 text-gray-600 hover:border-gray-400 transition-all" style={{ fontSize: "0.875rem" }}>
                      Cancelar
                    </button>
                    <button onClick={saveEdit}
                      className={`flex-1 flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-white transition-all ${saved ? "bg-green-500" : "bg-blue-500 hover:bg-blue-600"}`}
                      style={{ fontSize: "0.875rem", fontWeight: 600 }}>
                      {saved ? <><CheckCircle2 className="h-4 w-4" />Guardado</> : <><Save className="h-3.5 w-3.5" />Actualizar</>}
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}