export function purchaseExportFilename(reference: string, format: "pdf" | "csv", now = new Date()): string {
  const date = new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  return `plan-compras-${reference}-${date}.${format}`;
}
