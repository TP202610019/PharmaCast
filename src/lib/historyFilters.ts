const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/\s+/g, " ");

export function matchesHistorySearch(record: { id: string; datasetName: string; date: string }, search: string): boolean {
  const query = normalize(search);
  if (!query) return true;
  const date = new Date(record.date);
  const dates = Number.isNaN(date.getTime()) ? [] : [
    date.toLocaleDateString("es-PE"),
    date.toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit", year: "numeric" }),
    date.toLocaleDateString("es-PE", { day: "numeric", month: "long", year: "numeric" }),
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`,
  ];
  return [record.id, record.datasetName, ...dates].some(value => normalize(value).includes(query));
}
