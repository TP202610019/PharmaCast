import { useRef } from "react";
import { Upload, Package, CheckCircle, AlertCircle } from "lucide-react";
import type { UploadedFile } from "../types";

interface Props {
  files: UploadedFile[];
  isDragOver: boolean;
  setIsDragOver: (v: boolean) => void;
  uploadError: string;
  uploadFile: (file: File, type: "sales" | "inventory") => void;
  removeFile: (name: string) => void;
  handleFileInput: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  salesInputRef: React.RefObject<HTMLInputElement | null>;
  inventoryInputRef: React.RefObject<HTMLInputElement | null>;
  formatSize: (bytes: number) => string;
}

export function StepUpload({
  files, isDragOver, setIsDragOver, uploadError,
  uploadFile, removeFile, handleFileInput,
  fileInputRef, salesInputRef, inventoryInputRef,
  formatSize,
}: Props) {
  const salesFile = files.find((f) => f.type === "sales");
  const invFile   = files.find((f) => f.type === "inventory");

  return (
    <div className="space-y-6">
      <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" multiple className="hidden" onChange={handleFileInput} />
      <input ref={salesInputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f, "sales"); e.target.value = ""; }} />
      <input ref={inventoryInputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f, "inventory"); e.target.value = ""; }} />

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-gray-900 mb-1" style={{ fontWeight: 600 }}>Carga de archivos</h2>
        <p className="text-gray-400 mb-5" style={{ fontSize: "0.875rem" }}>
          Sube tus archivos en formato CSV o Excel. Ventas es obligatorio; inventario es opcional.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Sales zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setIsDragOver(false); const f = e.dataTransfer.files[0]; if (f) uploadFile(f, "sales"); }}
            className={`rounded-xl border-2 border-dashed p-5 transition-all ${salesFile ? "border-cyan-500/40 bg-cyan-500/5" : isDragOver ? "border-cyan-500 bg-cyan-500/5" : "border-gray-200 hover:border-cyan-500/40"}`}
          >
            <div className="flex flex-col items-center gap-3 text-center">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${salesFile ? "bg-cyan-500/10 border-cyan-500/20" : "bg-gray-100 border-gray-200"}`}>
                {salesFile ? <CheckCircle className="h-5 w-5 text-cyan-500" /> : <Upload className="h-5 w-5 text-gray-400" />}
              </div>
              <div>
                <p className="text-gray-900" style={{ fontWeight: 600, fontSize: "0.875rem" }}>
                  Datos de ventas <span className="text-red-400">*</span>
                </p>
                {salesFile ? (
                  <p className="text-cyan-600 mt-0.5 truncate max-w-[160px]" style={{ fontSize: "0.75rem", fontWeight: 500 }}>{salesFile.name}</p>
                ) : (
                  <p className="text-gray-400 mt-0.5" style={{ fontSize: "0.75rem" }}>Historial de ventas (CSV/Excel)</p>
                )}
              </div>
              <div className="flex gap-2 flex-wrap justify-center">
                <button onClick={() => salesInputRef.current?.click()}
                  className="rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-3 py-1.5 text-cyan-600 hover:bg-cyan-500/20 transition-all"
                  style={{ fontSize: "0.75rem", fontWeight: 500 }}>
                  {salesFile ? "Cambiar" : "+ Seleccionar"}
                </button>
                {salesFile && (
                  <button onClick={() => removeFile(salesFile.name)}
                    className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-red-400 hover:bg-red-100 transition-all"
                    style={{ fontSize: "0.75rem" }}>
                    Quitar
                  </button>
                )}
              </div>
              {salesFile && (
                <p className="text-gray-400" style={{ fontSize: "0.7rem" }}>
                  {formatSize(salesFile.size)}{salesFile.rows != null && ` · ${salesFile.rows.toLocaleString()} filas`}
                  {salesFile.uploading && " · Subiendo…"}{salesFile.datasetId && " · ✓ Subido"}
                </p>
              )}
            </div>
          </div>

          {/* Inventory zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setIsDragOver(false); const f = e.dataTransfer.files[0]; if (f) uploadFile(f, "inventory"); }}
            className={`rounded-xl border-2 border-dashed p-5 transition-all ${invFile ? "border-blue-500/40 bg-blue-500/5" : isDragOver ? "border-blue-500/40 bg-blue-500/5" : "border-gray-200 hover:border-blue-500/30"}`}
          >
            <div className="flex flex-col items-center gap-3 text-center">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${invFile ? "bg-blue-500/10 border-blue-500/20" : "bg-gray-100 border-gray-200"}`}>
                {invFile ? <CheckCircle className="h-5 w-5 text-blue-500" /> : <Package className="h-5 w-5 text-gray-400" />}
              </div>
              <div>
                <p className="text-gray-900" style={{ fontWeight: 600, fontSize: "0.875rem" }}>
                  Registro de inventario{" "}
                  <span className="text-gray-400" style={{ fontWeight: 400, fontSize: "0.75rem" }}>(opcional)</span>
                </p>
                {invFile ? (
                  <p className="text-blue-600 mt-0.5 truncate max-w-[160px]" style={{ fontSize: "0.75rem", fontWeight: 500 }}>{invFile.name}</p>
                ) : (
                  <p className="text-gray-400 mt-0.5" style={{ fontSize: "0.75rem" }}>Stock actual por producto</p>
                )}
              </div>
              <div className="flex gap-2 flex-wrap justify-center">
                <button onClick={() => inventoryInputRef.current?.click()}
                  className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-1.5 text-blue-600 hover:bg-blue-500/20 transition-all"
                  style={{ fontSize: "0.75rem", fontWeight: 500 }}>
                  {invFile ? "Cambiar" : "+ Seleccionar"}
                </button>
                {invFile && (
                  <button onClick={() => removeFile(invFile.name)}
                    className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-red-400 hover:bg-red-100 transition-all"
                    style={{ fontSize: "0.75rem" }}>
                    Quitar
                  </button>
                )}
              </div>
              {invFile && (
                <p className="text-gray-400" style={{ fontSize: "0.7rem" }}>
                  {formatSize(invFile.size)}{invFile.rows != null && ` · ${invFile.rows.toLocaleString()} filas`}
                  {invFile.uploading && " · Subiendo…"}{invFile.datasetId && " · ✓ Subido"}
                </p>
              )}
            </div>
          </div>
        </div>

        {uploadError && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
            <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
            <p className="text-red-600" style={{ fontSize: "0.8125rem" }}>{uploadError}</p>
          </div>
        )}
      </div>

      {files.length > 0 && (
        <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4 flex gap-3">
          <CheckCircle className="h-4 w-4 text-cyan-500 mt-0.5 shrink-0" />
          <p className="text-cyan-700" style={{ fontSize: "0.8125rem", fontWeight: 500 }}>
            {files.some((f) => f.type === "inventory")
              ? "Escenario: predicción con control de stock"
              : "Escenario básico: predicción de demanda"}
          </p>
        </div>
      )}

      {files.length === 0 && (
        <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4 flex gap-3">
          <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />
          <p className="text-yellow-600" style={{ fontSize: "0.8125rem" }}>Debes cargar al menos un archivo para continuar</p>
        </div>
      )}
    </div>
  );
}
