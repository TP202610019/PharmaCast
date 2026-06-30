import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]): void {
  const escape = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const csv = [headers.map(escape).join(","), ...rows.map((r) => r.map(escape).join(","))].join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadPdf(filename: string, title: string, subtitle: string, headers: string[], rows: (string | number)[][]): void {
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(15);
  doc.setTextColor(17, 24, 39);
  doc.text(title, 14, 16);
  if (subtitle) {
    doc.setFontSize(9);
    doc.setTextColor(107, 114, 128);
    doc.text(subtitle, 14, 23);
  }
  autoTable(doc, {
    startY: subtitle ? 29 : 24,
    head: [headers],
    body: rows.map((r) => r.map(String)),
    styles: { fontSize: 9, cellPadding: 4 },
    headStyles: { fillColor: [6, 182, 212], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });
  doc.save(filename);
}
