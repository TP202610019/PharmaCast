import type { LocalDatasetPreview } from "./localDatasetValidation";

export function validateLocalDataset(file: File): Promise<LocalDatasetPreview> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./localDataset.worker.ts", import.meta.url), { type: "module" });
    const timeout = window.setTimeout(() => {
      worker.terminate();
      reject(new Error("No se pudo validar el archivo. Revisa que no esté dañado y vuelve a seleccionarlo."));
    }, 60000);
    const stop = () => { window.clearTimeout(timeout); worker.terminate(); };
    worker.onmessage = ({ data }: MessageEvent<{ preview?: LocalDatasetPreview; error?: string }>) => {
      stop();
      if (data.preview) resolve(data.preview);
      else reject(new Error(data.error || "No se pudo leer el archivo."));
    };
    worker.onerror = () => { stop(); reject(new Error("No se pudo validar el archivo. Vuelve a seleccionarlo.")); };
    worker.postMessage(file);
  });
}
