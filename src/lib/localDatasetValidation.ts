import { read, utils } from "xlsx";

export interface LocalDatasetPreview { headers: string[]; rows: number }

function validateHeaders(values: unknown[]): string[] {
  const headers = values.map(value => String(value ?? "").trim());
  while (headers.length && !headers[headers.length - 1]) headers.pop();
  if (headers.length < 2 || headers.some(value => !value))
    throw new Error("La primera fila debe contener los nombres de las columnas, sin celdas vacías.");
  if (new Set(headers.map(value => value.toLocaleLowerCase())).size !== headers.length)
    throw new Error("Hay nombres de columnas repetidos en la primera fila.");
  return headers;
}

function readCsv(text: string): LocalDatasetPreview {
  text = text.replace(/^\uFEFF/, "");
  if (text.includes("\0") || text.includes("\uFFFD"))
    throw new Error("El CSV contiene caracteres no válidos. Guárdalo como CSV UTF-8.");
  const firstLine = text.split(/\r?\n/, 1)[0];
  const count = (delimiter: string) => {
    let quotes = false, total = 0;
    for (let i = 0; i < firstLine.length; i++) {
      if (firstLine[i] === '"') {
        if (quotes && firstLine[i + 1] === '"') i++;
        else quotes = !quotes;
      } else if (!quotes && firstLine[i] === delimiter) total++;
    }
    return total;
  };
  const delimiter = [",", ";", "\t"].sort((a, b) => count(b) - count(a))[0];
  let cell = "", row: string[] = [], headers: string[] | undefined;
  let quoted = false, closedQuote = false, rows = 0;
  const endRow = () => {
    row.push(cell); cell = ""; closedQuote = false;
    if (!headers) headers = validateHeaders(row);
    else if (row.some(value => value.trim())) {
      if (row.length !== headers.length)
        throw new Error("El CSV tiene filas con distinta cantidad de columnas. Revisa su separador y contenido.");
      rows++;
    }
    row = [];
  };
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char !== '"') cell += char;
      else if (text[i + 1] === '"') { cell += '"'; i++; }
      else { quoted = false; closedQuote = true; }
    } else if (char === delimiter) { row.push(cell); cell = ""; closedQuote = false; }
    else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i++;
      endRow();
    } else if (char === '"' && !cell && !closedQuote) quoted = true;
    else if (char === '"' || (closedQuote && char.trim()))
      throw new Error("El CSV contiene comillas incorrectas. Revisa el archivo.");
    else if (!closedQuote) cell += char;
  }
  if (quoted) throw new Error("El CSV está incompleto: hay comillas sin cerrar.");
  if (cell || row.length || closedQuote) endRow();
  if (!headers || !rows) throw new Error("El archivo debe tener encabezados y al menos una fila de datos.");
  return { headers, rows };
}

/** Parses only in the browser (inside a worker); no HTTP or storage calls. */
export async function inspectLocalDataset(file: File): Promise<LocalDatasetPreview> {
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (!["csv", "xls", "xlsx"].includes(extension ?? ""))
    throw new Error("Formato no permitido. Usa un archivo CSV, XLS o XLSX.");
  if (!file.size) throw new Error("El archivo está vacío.");
  if (file.size > 30 * 1024 * 1024) throw new Error("El archivo supera el límite de 30 MB.");
  if (extension === "csv") return readCsv(await file.text());
  const bytes = new Uint8Array(await file.arrayBuffer());
  const signature = extension === "xlsx" ? [0x50, 0x4b, 0x03, 0x04] : [0xd0, 0xcf, 0x11, 0xe0];
  if (!signature.every((value, index) => bytes[index] === value))
    throw new Error("El contenido no corresponde a un archivo Excel válido.");
  let workbook;
  try { workbook = read(bytes, { type: "array" }); }
  catch { throw new Error("No se pudo leer el archivo Excel. Puede estar dañado o protegido."); }
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet?.["!ref"]) throw new Error("El archivo Excel está vacío.");
  const range = utils.decode_range(sheet["!ref"]);
  const firstRow = Array.from({ length: range.e.c + 1 }, (_, column) => sheet[utils.encode_cell({ r: 0, c: column })]?.v);
  const headers = validateHeaders(firstRow);
  const dataRows = new Set<number>();
  for (const key of Object.keys(sheet)) {
    if (key.startsWith("!") || sheet[key]?.v == null || String(sheet[key].v).trim() === "") continue;
    const cell = utils.decode_cell(key);
    if (cell.r > 0) dataRows.add(cell.r);
  }
  if (!dataRows.size) throw new Error("El archivo debe tener encabezados y al menos una fila de datos.");
  return { headers, rows: dataRows.size };
}
