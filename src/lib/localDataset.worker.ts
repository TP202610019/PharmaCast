import { inspectLocalDataset } from "./localDatasetValidation";
self.onmessage = async (event: MessageEvent<File>) => {
  try { self.postMessage({ preview: await inspectLocalDataset(event.data) }); }
  catch (error) { self.postMessage({ error: error instanceof Error ? error.message : "No se pudo leer el archivo." }); }
};
