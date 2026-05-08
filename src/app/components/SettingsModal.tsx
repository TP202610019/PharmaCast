import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X, User, Mail, Building2, Lock, Eye, EyeOff, CheckCircle2,
  Save, ChevronRight, Settings2, ShoppingCart, Package,
  Pencil, AlertCircle,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

interface Props { open: boolean; onClose: () => void; }

/* ── Variable definitions ── */
const SALES_VARS = {
  required: [
    { key: "sale_date",  label: "Fecha de venta",          desc: "Columna con la fecha de cada venta" },
    { key: "product",   label: "Producto / medicamento",   desc: "Nombre del producto vendido" },
    { key: "quantity",  label: "Cantidad vendida",         desc: "Unidades vendidas por registro" },
    { key: "category",  label: "Categoría",                desc: "Categoría del medicamento" },
  ],
  optional: [
    { key: "price",          label: "Precio",               desc: "Precio de venta unitario" },
    { key: "product_type",   label: "Tipo de producto",     desc: "Clasificación adicional del producto" },
    { key: "unit",           label: "Unidad de medida",     desc: "Unidades, cajas, ampollas..." },
    { key: "payment_method", label: "Método de pago",       desc: "Efectivo, tarjeta, etc." },
    { key: "discount",       label: "Promoción / descuento",desc: "Descuento aplicado (%)" },
  ],
};

const INVENTORY_VARS = {
  required: [
    { key: "inv_product",   label: "Producto / medicamento", desc: "Nombre del producto en inventario" },
    { key: "current_stock", label: "Stock actual",           desc: "Cantidad disponible en stock" },
    { key: "expiry_date",   label: "Fecha de vencimiento",   desc: "Fecha de vencimiento del lote" },
  ],
  optional: [
    { key: "min_stock",      label: "Stock mínimo",          desc: "Nivel mínimo antes de reponer" },
    { key: "safety_stock",   label: "Stock de seguridad",    desc: "Buffer de inventario de seguridad" },
    { key: "batch",          label: "Lote",                  desc: "Número o identificador de lote" },
    { key: "unit_cost",      label: "Costo unitario",        desc: "Precio de compra por unidad" },
    { key: "product_status", label: "Estado del producto",   desc: "Activo, descontinuado, etc." },
  ],
};

const VARS_STORAGE_KEY = "pharmacast_vars";

function loadVars() {
  try { return JSON.parse(localStorage.getItem(VARS_STORAGE_KEY) ?? "{}"); } catch { return {}; }
}

type EditField = "name" | "pharmacy" | "password" | null;

export function SettingsModal({ open, onClose }: Props) {
  const { user, updateUser } = useAuth();

  const [mainTab, setMainTab] = useState<"account" | "variables">("account");
  const [varTab, setVarTab] = useState<"sales" | "inventory">("sales");
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

  /* ── Variable mappings ── */
  const [varMappings, setVarMappings] = useState<Record<string, string>>(loadVars);
  const [varsSaved, setVarsSaved] = useState(false);

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
      if (passVals.newPass.length < 8) { setPassError("La nueva contraseña debe tener al menos 8 caracteres."); return; }
      if (passVals.newPass !== passVals.confirm) { setPassError("Las contraseñas no coinciden."); return; }
    }
    setSaved(true);
    setTimeout(() => { setSaved(false); closeEdit(); }, 1200);
  };

  const saveVars = () => {
    localStorage.setItem(VARS_STORAGE_KEY, JSON.stringify(varMappings));
    setVarsSaved(true);
    setTimeout(() => setVarsSaved(false), 2000);
  };

  const handleClose = () => {
    setEditField(null);
    setPassError("");
    setMainTab("account");
    onClose();
  };

  const varDefs = varTab === "sales" ? SALES_VARS : INVENTORY_VARS;

  return (
    <>
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div key="settings-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 bg-black/25 backdrop-blur-sm" onClick={handleClose} />

            {/* Modal */}
            <motion.div key="settings-modal" initial={{ opacity: 0, scale: 0.93, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.93, y: 16 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">

              <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-2xl pointer-events-auto flex flex-col relative"
                style={{ maxHeight: "80vh" }}>

                {/* ── Header ── */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                      <Settings2 className="h-4.5 w-4.5 text-cyan-500" style={{ height: 18, width: 18 }} />
                    </div>
                    <div>
                      <h2 className="text-gray-900" style={{ fontSize: "1rem", fontWeight: 700 }}>Configuración de cuenta</h2>
                      <p className="text-gray-400" style={{ fontSize: "0.75rem" }}>Gestiona tu perfil y variables de predicción</p>
                    </div>
                  </div>
                  <button onClick={handleClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* ── Main tabs ── */}
                <div className="px-6 pt-4 pb-0 border-b border-gray-100 shrink-0">
                  <div className="flex gap-1">
                    {[
                      { id: "account", label: "Cuenta", icon: User },
                      { id: "variables", label: "Variables de predicción", icon: Settings2 },
                    ].map((tab) => {
                      const Icon = tab.icon;
                      const active = mainTab === tab.id;
                      return (
                        <button key={tab.id} onClick={() => { setMainTab(tab.id as any); setEditField(null); }}
                          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition-all ${active ? "border-cyan-500 text-cyan-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
                          style={{ fontSize: "0.875rem", fontWeight: active ? 600 : 400 }}>
                          <Icon className="h-4 w-4" />{tab.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* ── Content ── */}
                <div className="flex-1 overflow-y-auto">

                  {/* ────────── CUENTA TAB ────────── */}
                  {mainTab === "account" && (
                    <div className="p-6 space-y-4 relative">
                      {/* User avatar row */}
                      <div className="flex items-center gap-4 rounded-xl border border-gray-100 bg-gray-50 px-5 py-4">
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
                          <div key={row.label} className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white px-5 py-3.5 hover:border-gray-300 transition-all">
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
                                <Pencil className="h-3 w-3" />Cambiar
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
                  )}

                  {/* ────────── VARIABLES TAB ────────── */}
                  {mainTab === "variables" && (
                    <div className="p-6">
                      <div className="flex items-start justify-between gap-4 mb-5">
                        <div>
                          <h3 className="text-gray-900 mb-1" style={{ fontWeight: 600 }}>Identificación de variables</h3>
                          <p className="text-gray-400" style={{ fontSize: "0.8125rem", lineHeight: 1.6 }}>
                            Define el nombre de columna de tu dataset para cada variable del sistema. Serán usadas como valores predeterminados en futuras predicciones.
                          </p>
                        </div>
                      </div>

                      {/* Sub-tabs */}
                      <div className="flex gap-1 rounded-xl border border-gray-200 bg-gray-100 p-1 mb-5 w-fit">
                        {[
                          { id: "sales", label: "Registro de ventas", icon: ShoppingCart },
                          { id: "inventory", label: "Inventario", icon: Package },
                        ].map((tab) => {
                          const Icon = tab.icon;
                          const active = varTab === tab.id;
                          return (
                            <button key={tab.id} onClick={() => setVarTab(tab.id as any)}
                              className={`flex items-center gap-2 rounded-lg px-4 py-2 transition-all ${active ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                              style={{ fontSize: "0.8125rem", fontWeight: active ? 600 : 400 }}>
                              <Icon className="h-3.5 w-3.5" />{tab.label}
                            </button>
                          );
                        })}
                      </div>

                      <div className="space-y-5">
                        {/* Required */}
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                            <p className="text-gray-700" style={{ fontSize: "0.8125rem", fontWeight: 600 }}>Variables requeridas</p>
                            <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-red-500" style={{ fontSize: "0.6875rem", fontWeight: 600 }}>Obligatorias</span>
                          </div>
                          <div className="space-y-2">
                            {varDefs.required.map((v) => (
                              <div key={v.key} className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 hover:border-gray-300 transition-all">
                                <div>
                                  <p className="text-gray-900" style={{ fontSize: "0.8125rem", fontWeight: 500 }}>
                                    {v.label} <span className="text-red-400">*</span>
                                  </p>
                                  <p className="text-gray-400" style={{ fontSize: "0.6875rem" }}>{v.desc}</p>
                                </div>
                                <ChevronRight className="h-4 w-4 text-gray-300 shrink-0" />
                                <input
                                  type="text"
                                  placeholder={`ej. "${v.key}"`}
                                  value={varMappings[v.key] ?? ""}
                                  onChange={(e) => setVarMappings((m) => ({ ...m, [v.key]: e.target.value }))}
                                  className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-gray-900 placeholder:text-gray-300 outline-none focus:border-cyan-500 focus:bg-white focus:ring-1 focus:ring-cyan-500/10 transition-all"
                                  style={{ fontSize: "0.8125rem" }}
                                />
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Optional */}
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <span className="h-1.5 w-1.5 rounded-full bg-cyan-500" />
                            <p className="text-gray-700" style={{ fontSize: "0.8125rem", fontWeight: 600 }}>Variables opcionales</p>
                            <span className="rounded-full border border-cyan-200 bg-cyan-50 px-2 py-0.5 text-cyan-600" style={{ fontSize: "0.6875rem", fontWeight: 600 }}>Mejoran la precisión</span>
                          </div>
                          <div className="space-y-2">
                            {varDefs.optional.map((v) => (
                              <div key={v.key} className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-xl border border-gray-100 bg-gray-50/60 px-4 py-3 hover:border-gray-200 hover:bg-white transition-all">
                                <div>
                                  <p className="text-gray-600" style={{ fontSize: "0.8125rem", fontWeight: 500 }}>{v.label}</p>
                                  <p className="text-gray-400" style={{ fontSize: "0.6875rem" }}>{v.desc}</p>
                                </div>
                                <ChevronRight className="h-4 w-4 text-gray-200 shrink-0" />
                                <input
                                  type="text"
                                  placeholder={`ej. "${v.key}"`}
                                  value={varMappings[v.key] ?? ""}
                                  onChange={(e) => setVarMappings((m) => ({ ...m, [v.key]: e.target.value }))}
                                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-300 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/10 transition-all"
                                  style={{ fontSize: "0.8125rem" }}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* ── Footer ── */}
                <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between gap-3 shrink-0">
                  <button onClick={handleClose} className="rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-gray-600 transition-all hover:border-gray-400 hover:text-gray-900" style={{ fontSize: "0.875rem" }}>
                    Cerrar
                  </button>
                  {mainTab === "variables" && (
                    <button onClick={saveVars}
                      className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-white transition-all ${varsSaved ? "bg-green-500" : "bg-cyan-500 hover:bg-cyan-400 hover:shadow-lg hover:shadow-cyan-500/20"}`}
                      style={{ fontSize: "0.875rem", fontWeight: 600 }}>
                      {varsSaved ? <><CheckCircle2 className="h-4 w-4" />Guardado</> : <><Save className="h-4 w-4" />Guardar variables</>}
                    </button>
                  )}
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
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={closeEdit}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="bg-white rounded-2xl border border-gray-200 shadow-2xl p-6 w-full max-w-sm mx-4 relative overflow-hidden"
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
                      autoFocus
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
                    <Lock className="h-4 w-4 text-orange-500" />
                    <h3 className="text-gray-900" style={{ fontWeight: 700, fontSize: "0.9375rem" }}>Cambiar contraseña</h3>
                  </div>

                  {/* Current password — muted style */}
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-3.5 mb-2">
                    <label className="text-gray-500 block mb-1.5" style={{ fontSize: "0.75rem", fontWeight: 500 }}>
                      Contraseña actual
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                      <input type={showCurrent ? "text" : "password"} value={passVals.current}
                        onChange={(e) => setPassVals((p) => ({ ...p, current: e.target.value }))}
                        placeholder="Tu contraseña actual" autoFocus
                        className="w-full rounded-lg border border-gray-200 bg-white pl-9 pr-10 py-2 text-gray-700 placeholder:text-gray-300 outline-none focus:border-gray-300 transition-all"
                        style={{ fontSize: "0.875rem" }} />
                      <button type="button" onClick={() => setShowCurrent(!showCurrent)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showCurrent ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="flex items-center gap-2 my-3">
                    <div className="flex-1 h-px bg-gray-200" />
                    <span className="text-gray-400 shrink-0" style={{ fontSize: "0.6875rem" }}>Nueva contraseña</span>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>

                  {/* New password — highlighted style */}
                  <div className="rounded-xl border border-cyan-200 bg-cyan-500/3 p-3.5 space-y-3 mb-2" style={{ backgroundColor: "rgb(236 254 255 / 0.4)" }}>
                    <div>
                      <label className="text-cyan-700 block mb-1.5" style={{ fontSize: "0.75rem", fontWeight: 500 }}>Nueva contraseña</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-cyan-400" />
                        <input type={showNew ? "text" : "password"} value={passVals.newPass}
                          onChange={(e) => setPassVals((p) => ({ ...p, newPass: e.target.value }))}
                          placeholder="Mín. 8 caracteres"
                          className="w-full rounded-lg border border-cyan-200 bg-white pl-9 pr-10 py-2 text-gray-900 placeholder:text-gray-300 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 transition-all"
                          style={{ fontSize: "0.875rem" }} />
                        <button type="button" onClick={() => setShowNew(!showNew)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                          {showNew ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="text-cyan-700 block mb-1.5" style={{ fontSize: "0.75rem", fontWeight: 500 }}>Confirmar nueva contraseña</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-cyan-400" />
                        <input type={showConfirm ? "text" : "password"} value={passVals.confirm}
                          onChange={(e) => setPassVals((p) => ({ ...p, confirm: e.target.value }))}
                          placeholder="Repite la nueva contraseña"
                          className={`w-full rounded-lg border bg-white pl-9 pr-10 py-2 text-gray-900 placeholder:text-gray-300 outline-none focus:ring-1 transition-all ${
                            passVals.confirm && passVals.confirm === passVals.newPass
                              ? "border-green-400 focus:border-green-500 focus:ring-green-500/20"
                              : "border-cyan-200 focus:border-cyan-500 focus:ring-cyan-500/20"
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

                  {passError && (
                    <p className="flex items-center gap-1.5 text-red-500 mb-2" style={{ fontSize: "0.8125rem" }}>
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />{passError}
                    </p>
                  )}

                  <div className="flex gap-2 mt-3">
                    <button onClick={closeEdit} className="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-2 text-gray-600 hover:border-gray-400 transition-all" style={{ fontSize: "0.875rem" }}>
                      Cancelar
                    </button>
                    <button onClick={saveEdit}
                      className={`flex-1 flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-white transition-all ${saved ? "bg-green-500" : "bg-cyan-500 hover:bg-cyan-400"}`}
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