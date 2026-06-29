import { ChevronDown, Calendar, Clock, ShoppingCart, Package, CheckCircle, BookOpen, Loader2, X, Star, AlertCircle } from "lucide-react";
import type { MappingFieldResponse, MappingConfigResponse } from "@/shared/types/api";
import type { UploadedFile } from "../types";

interface Props {
  files: UploadedFile[];
  forecastDays: number;
  setForecastDays: (d: number) => void;
  mappingTab: "sales" | "inventory";
  setMappingTab: (t: "sales" | "inventory") => void;
  salesMapping: Record<string, string>;
  setSalesMapping: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  inventoryMapping: Record<string, string>;
  setInventoryMapping: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  detectedSalesCols: string[];
  detectedInvCols: string[];
  fieldCatalog: MappingFieldResponse[];
  fieldCatalogLoading: boolean;
  savedMappings: MappingConfigResponse[];
  savedMappingsLoading: boolean;
  appliedMappingId: string | null;
  setAppliedMappingId: (id: string | null) => void;
  mappingName: string;
  setMappingName: (n: string) => void;
  saveAsDefault: boolean;
  setSaveAsDefault: React.Dispatch<React.SetStateAction<boolean>>;
  canProceed: () => boolean;
  today: string;
  FALLBACK_SALES_COLS: string[];
  FALLBACK_INV_COLS: string[];
}

export function StepMapping({
  files, forecastDays, setForecastDays,
  mappingTab, setMappingTab,
  salesMapping, setSalesMapping,
  inventoryMapping, setInventoryMapping,
  detectedSalesCols, detectedInvCols,
  fieldCatalog, fieldCatalogLoading,
  savedMappings, savedMappingsLoading,
  appliedMappingId, setAppliedMappingId,
  mappingName, setMappingName,
  saveAsDefault, setSaveAsDefault,
  canProceed, today,
  FALLBACK_SALES_COLS, FALLBACK_INV_COLS,
}: Props) {
  const hasSales    = files.some((f) => f.type === "sales");
  const hasInventory = files.some((f) => f.type === "inventory");
  const salesCols   = detectedSalesCols.length ? detectedSalesCols : hasSales    ? FALLBACK_SALES_COLS : [];
  const invCols     = detectedInvCols.length   ? detectedInvCols   : hasInventory ? FALLBACK_INV_COLS   : [];

  const salesCatalogFields = fieldCatalog.filter((f) => f.fieldType === "sales");
  const invCatalogFields   = fieldCatalog.filter((f) => f.fieldType === "inventory");

  const activeMapping    = mappingTab === "sales" ? salesMapping    : inventoryMapping;
  const setActiveMapping = mappingTab === "sales" ? setSalesMapping : setInventoryMapping;
  const activeReqVars    = (mappingTab === "sales" ? salesCatalogFields : invCatalogFields).filter((f) => f.isRequired).map((f) => ({ key: f.fieldKey, label: f.displayName }));
  const activeOptVars    = (mappingTab === "sales" ? salesCatalogFields : invCatalogFields).filter((f) => !f.isRequired).map((f) => ({ key: f.fieldKey, label: f.displayName }));
  const activeCols       = mappingTab === "sales" ? salesCols : invCols;
  const hasActiveFile    = mappingTab === "sales" ? hasSales : hasInventory;

  const salesReqFields = salesCatalogFields.filter((f) => f.isRequired);
  const salesReqDone   = salesReqFields.filter((f) => salesMapping[f.fieldKey]).length;
  const invReqFields   = invCatalogFields.filter((f) => f.isRequired);
  const invReqDone     = invReqFields.filter((f) => inventoryMapping[f.fieldKey]).length;

  return (
    <div className="space-y-5">
      {/* Config card */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-gray-900 mb-4" style={{ fontWeight: 600 }}>Configuración del análisis</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4 text-blue-500" />
              <span className="text-gray-500" style={{ fontSize: "0.8125rem" }}>Fecha actual del sistema</span>
            </div>
            <p className="text-gray-900" style={{ fontWeight: 500 }}>{today}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-cyan-500" />
              <span className="text-gray-500" style={{ fontSize: "0.8125rem" }}>Período de predicción</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { days: 7,  label: "7 días",  hint: "Recomendado" },
                { days: 14, label: "14 días", hint: "Moderado" },
                { days: 30, label: "30 días", hint: "Largo plazo" },
              ].map(({ days, label, hint }) => (
                <button key={days} onClick={() => setForecastDays(days)}
                  className={`rounded-lg border py-2 px-1 transition-all flex flex-col items-center ${forecastDays === days ? "border-cyan-500 bg-cyan-500/10 text-cyan-500" : "border-gray-300 bg-white text-gray-500 hover:border-gray-400"}`}>
                  <span style={{ fontSize: "0.875rem", fontWeight: forecastDays === days ? 600 : 400 }}>{label}</span>
                  <span style={{ fontSize: "0.6875rem", opacity: 0.7 }}>{hint}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Variable mapping card */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="px-6 pt-5 pb-4 border-b border-gray-100">
          <h2 className="text-gray-900 mb-1" style={{ fontWeight: 600 }}>Identificar variables del dataset</h2>
          <p className="text-gray-400" style={{ fontSize: "0.8125rem" }}>
            Indica a qué columna de tu archivo corresponde cada variable que requiere el sistema
          </p>
        </div>

        {/* Saved mapping selector */}
        <div className="px-6 pt-4 pb-3 border-b border-gray-100 bg-gray-50/40">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="h-3.5 w-3.5 text-blue-500" />
            <span className="text-gray-700" style={{ fontSize: "0.8125rem", fontWeight: 600 }}>Configuración guardada</span>
            {savedMappingsLoading && <Loader2 className="h-3 w-3 animate-spin text-gray-400" />}
          </div>
          {savedMappings.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              <select
                className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-gray-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all cursor-pointer"
                style={{ fontSize: "0.8125rem", minWidth: 240 }}
                value={appliedMappingId ?? ""}
                onChange={(e) => {
                  const id = e.target.value;
                  setAppliedMappingId(id || null);
                  if (id) {
                    const cfg = savedMappings.find((m) => m.id === id);
                    if (cfg) {
                      const newMapping: Record<string, string> = {};
                      cfg.fields.forEach((f) => { newMapping[f.fieldKey] = f.datasetColumnName; });
                      setSalesMapping(newMapping);
                    }
                  }
                }}
              >
                <option value="">— Nueva configuración —</option>
                {savedMappings.map((m) => (
                  <option key={m.id} value={m.id}>{m.isDefault ? "★ " : ""}{m.configurationName}</option>
                ))}
              </select>
              {appliedMappingId && (
                <button
                  onClick={() => { setAppliedMappingId(null); setSalesMapping({}); }}
                  className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-gray-500 hover:text-red-500 hover:border-red-200 transition-all"
                  style={{ fontSize: "0.75rem" }}
                >
                  <X className="h-3 w-3" /> Limpiar
                </button>
              )}
            </div>
          ) : !savedMappingsLoading ? (
            <p className="text-gray-400" style={{ fontSize: "0.75rem" }}>
              No hay configuraciones guardadas aún. El mapeo que definas se guardará automáticamente.
            </p>
          ) : null}

          {!appliedMappingId && (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <input
                type="text"
                placeholder="Nombre de la configuración (opcional)"
                value={mappingName}
                onChange={(e) => setMappingName(e.target.value)}
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-gray-700 placeholder:text-gray-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
                style={{ fontSize: "0.8125rem", minWidth: 240 }}
              />
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={saveAsDefault}
                  onChange={(e) => setSaveAsDefault(e.target.checked)}
                  className="h-3.5 w-3.5 rounded accent-blue-500 cursor-pointer"
                />
                <Star className="h-3 w-3 text-yellow-500" />
                <span className="text-gray-600" style={{ fontSize: "0.75rem" }}>Guardar como predeterminada</span>
              </label>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="px-6 pt-4">
          <div className="flex gap-1 rounded-xl border border-gray-200 bg-gray-100 p-1 w-fit">
            {[
              { id: "sales",     label: "Registro de ventas", icon: ShoppingCart, done: salesReqDone, total: salesReqFields.length, hasFile: hasSales },
              { id: "inventory", label: "Inventario",         icon: Package,      done: invReqDone,   total: invReqFields.length,   hasFile: hasInventory },
            ].map((tab) => {
              const Icon = tab.icon;
              const active = mappingTab === tab.id;
              const allDone = tab.done === tab.total && tab.hasFile;
              return (
                <button key={tab.id} onClick={() => setMappingTab(tab.id as "sales" | "inventory")}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 transition-all ${active ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                  style={{ fontSize: "0.8125rem", fontWeight: active ? 600 : 400 }}>
                  <Icon className="h-3.5 w-3.5" />
                  {tab.label}
                  {tab.hasFile ? (
                    <span className={`rounded-full px-1.5 py-0.5 ${allDone ? "bg-cyan-500/15 text-cyan-600" : "bg-orange-100 text-orange-600"}`}
                      style={{ fontSize: "0.6875rem", fontWeight: 700 }}>
                      {tab.done}/{tab.total}
                    </span>
                  ) : (
                    <span className="rounded-full bg-gray-200 px-1.5 py-0.5 text-gray-400" style={{ fontSize: "0.6875rem" }}>Sin archivo</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="px-6 py-5">
          {!hasActiveFile ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50">
              {mappingTab === "sales" ? <ShoppingCart className="h-8 w-8 text-gray-300" /> : <Package className="h-8 w-8 text-gray-300" />}
              <div>
                <p className="text-gray-500" style={{ fontWeight: 500 }}>No se cargó un archivo de {mappingTab === "sales" ? "ventas" : "inventario"}</p>
                <p className="text-gray-400 mt-0.5" style={{ fontSize: "0.8125rem" }}>Vuelve al paso 1 para agregar el archivo o continúa sin él</p>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div>
                <p className="text-gray-500 mb-2" style={{ fontSize: "0.75rem", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>Columnas detectadas en el archivo</p>
                <div className="flex flex-wrap gap-2">
                  {activeCols.map((col) => {
                    const isMapped = Object.values(activeMapping).includes(col);
                    return (
                      <span key={col} className={`rounded-lg border px-2.5 py-1 transition-all ${isMapped ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-700" : "border-gray-200 bg-gray-50 text-gray-500"}`}
                        style={{ fontSize: "0.75rem", fontWeight: isMapped ? 600 : 400 }}>
                        {isMapped && <span className="mr-1">✓</span>}{col}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Required variables */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="h-2 w-2 rounded-full bg-red-500" />
                  <p className="text-gray-700" style={{ fontSize: "0.8125rem", fontWeight: 600 }}>Variables requeridas</p>
                  <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-red-500" style={{ fontSize: "0.6875rem", fontWeight: 600 }}>
                    {activeReqVars.filter((v) => activeMapping[v.key]).length}/{activeReqVars.length} asignadas
                  </span>
                </div>
                <div className="space-y-2">
                  {activeReqVars.map((v) => {
                    const val = activeMapping[v.key] ?? "";
                    const isMapped = !!val;
                    return (
                      <div key={v.key} className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-all ${isMapped ? "border-cyan-500/25 bg-cyan-500/5" : "border-gray-200 bg-white"}`}>
                        <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-all ${isMapped ? "border-cyan-500 bg-cyan-500" : "border-gray-300 bg-white"}`}>
                          {isMapped
                            ? <CheckCircle className="h-3.5 w-3.5 text-white" />
                            : <span className="text-red-400" style={{ fontSize: "0.6875rem", fontWeight: 700 }}>!</span>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-gray-900" style={{ fontSize: "0.8125rem", fontWeight: 500 }}>
                            {v.label} <span className="text-red-400">*</span>
                          </p>
                        </div>
                        <div className="relative shrink-0" style={{ minWidth: 185 }}>
                          <select value={val} onChange={(e) => setActiveMapping((m) => ({ ...m, [v.key]: e.target.value }))}
                            className={`w-full appearance-none rounded-lg border px-3 pr-8 py-2 text-gray-900 outline-none focus:ring-2 transition-all cursor-pointer ${isMapped ? "border-cyan-500/40 bg-white focus:border-cyan-500 focus:ring-cyan-500/10" : "border-gray-300 bg-white hover:border-gray-400 focus:border-cyan-500 focus:ring-cyan-500/10"}`}
                            style={{ fontSize: "0.8125rem" }}>
                            <option value="">Seleccionar columna…</option>
                            {activeCols.map((col) => <option key={col} value={col}>{col}</option>)}
                          </select>
                          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Optional variables */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="h-2 w-2 rounded-full bg-cyan-500" />
                  <p className="text-gray-700" style={{ fontSize: "0.8125rem", fontWeight: 600 }}>Variables opcionales</p>
                  <span className="rounded-full border border-cyan-200 bg-cyan-50 px-2 py-0.5 text-cyan-600" style={{ fontSize: "0.6875rem", fontWeight: 600 }}>Mejoran la precisión</span>
                </div>
                <div className="space-y-2">
                  {activeOptVars.map((v) => {
                    const val = activeMapping[v.key] ?? "";
                    const isMapped = !!val;
                    return (
                      <div key={v.key} className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-all ${isMapped ? "border-cyan-500/20 bg-cyan-500/[0.03]" : "border-gray-100 bg-gray-50/60"}`}>
                        <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-all ${isMapped ? "border-cyan-500 bg-cyan-500" : "border-gray-200 bg-white"}`}>
                          {isMapped
                            ? <CheckCircle className="h-3.5 w-3.5 text-white" />
                            : <span className="text-gray-300" style={{ fontSize: "0.6875rem", fontWeight: 700 }}>—</span>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-gray-600" style={{ fontSize: "0.8125rem", fontWeight: 500 }}>{v.label}</p>
                        </div>
                        <div className="relative shrink-0" style={{ minWidth: 185 }}>
                          <select value={val} onChange={(e) => setActiveMapping((m) => ({ ...m, [v.key]: e.target.value }))}
                            className="w-full appearance-none rounded-lg border border-gray-200 bg-white px-3 pr-8 py-2 text-gray-700 outline-none hover:border-gray-300 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/10 transition-all cursor-pointer"
                            style={{ fontSize: "0.8125rem" }}>
                            <option value="">No asignar</option>
                            {activeCols.map((col) => <option key={col} value={col}>{col}</option>)}
                          </select>
                          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50">
          <div className="flex flex-wrap items-center gap-6">
            {[
              { label: "Archivos cargados",    value: `${files.length}` },
              { label: "Período a predecir",   value: `${forecastDays} días` },
              { label: "Variables ventas",     value: hasSales    ? `${salesReqDone}/${salesReqFields.length} req.` : "Sin archivo", ok: hasSales    ? salesReqDone === salesReqFields.length : undefined },
              { label: "Variables inventario", value: hasInventory ? `${invReqDone}/${invReqFields.length} req.`   : "Sin archivo", ok: hasInventory ? invReqDone   === invReqFields.length   : undefined },
            ].map((item) => (
              <div key={item.label}>
                <p className="text-gray-400" style={{ fontSize: "0.6875rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>{item.label}</p>
                <p className={`mt-0.5 ${item.ok === true ? "text-cyan-600" : item.ok === false ? "text-orange-500" : "text-gray-900"}`}
                  style={{ fontSize: "0.875rem", fontWeight: 600 }}>{item.value}</p>
              </div>
            ))}
          </div>
          {!canProceed() && (
            <p className="flex items-center gap-1.5 text-orange-500 mt-3" style={{ fontSize: "0.8125rem" }}>
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              Asigna todas las variables requeridas para continuar
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
