function detectCsvDelimiter(line: string): string {
  const candidates = [",", ";", "\t"];
  let best = ",";
  let bestCount = 0;
  for (const d of candidates) {
    let count = 0;
    let inQuote = false;
    for (const c of line) {
      if (c === '"') inQuote = !inQuote;
      else if (!inQuote && c === d) count++;
    }
    if (count > bestCount) { bestCount = count; best = d; }
  }
  return best;
}

function splitCsvLine(line: string, delimiter: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuote && line[i + 1] === '"') { current += '"'; i++; }
      else inQuote = !inQuote;
    } else if (c === delimiter && !inQuote) {
      fields.push(current); current = "";
    } else {
      current += c;
    }
  }
  fields.push(current);
  return fields;
}

export const parseCsvHeaders = (file: File): Promise<string[]> =>
  new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const raw = (e.target?.result as string) ?? "";
      const text = raw.replace(/^﻿/, "");
      const firstLine = text.split(/\r?\n/).find((l) => l.trim().length > 0) ?? "";
      if (!firstLine) { resolve([]); return; }
      const delimiter = detectCsvDelimiter(firstLine);
      const headers = splitCsvLine(firstLine, delimiter)
        .map((h) => h.trim().replace(/^"|"$/g, ""))
        .filter(Boolean);
      resolve(headers);
    };
    reader.onerror = () => resolve([]);
    reader.readAsText(file, "utf-8");
  });

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function detectFileType(name: string, index: number): "sales" | "inventory" {
  const n = name.toLowerCase();
  if (n.includes("venta") || n.includes("sale") || n.includes("ticket") || n.includes("transac")) return "sales";
  if (n.includes("inventario") || n.includes("inventory") || n.includes("stock") || n.includes("inv_")) return "inventory";
  return index === 0 ? "sales" : "inventory";
}
