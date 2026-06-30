import { ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  page: number;
  total: number;
  pageSize: number;
  onChange: (p: number) => void;
}

export function Paginator({ page, total, pageSize, onChange }: Props) {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;

  const pages: (number | "...")[] = [];
  const delta = 1;
  const range: number[] = [];
  for (let i = Math.max(2, page - delta); i <= Math.min(totalPages - 1, page + delta); i++) range.push(i);
  pages.push(1);
  if (range[0] > 2) pages.push("...");
  pages.push(...range);
  if (range[range.length - 1] < totalPages - 1) pages.push("...");
  if (totalPages > 1) pages.push(totalPages);

  const btnBase = "flex h-7 min-w-[1.75rem] items-center justify-center rounded-lg border px-1 transition-all";

  return (
    <div className="flex items-center justify-between pt-4 border-t border-gray-100 mt-2">
      <p className="text-gray-400" style={{ fontSize: "0.75rem" }}>
        {Math.min((page - 1) * pageSize + 1, total)}–{Math.min(page * pageSize, total)} de {total}
      </p>
      <div className="flex items-center gap-1">
        <button onClick={() => onChange(page - 1)} disabled={page === 1}
          className={`${btnBase} border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed`}>
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        {pages.map((p, i) =>
          p === "..." ? (
            <span key={`ellipsis-${i}`} className="px-1 text-gray-400" style={{ fontSize: "0.75rem" }}>…</span>
          ) : (
            <button key={p} onClick={() => onChange(p as number)}
              className={`${btnBase} ${p === page ? "border-cyan-500 bg-cyan-500 text-white" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}
              style={{ fontSize: "0.75rem", fontWeight: p === page ? 600 : 400 }}>
              {p}
            </button>
          )
        )}
        <button onClick={() => onChange(page + 1)} disabled={page === totalPages}
          className={`${btnBase} border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed`}>
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
