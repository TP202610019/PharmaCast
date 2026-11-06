import type { CSSProperties } from "react";
import "../../styles/analysis.css";
import type { LucideIcon } from "lucide-react";

export function AnalysisMetrics({ items }: { items: { label: string; value: string; icon: LucideIcon; emphasis?: boolean }[] }) {
  return <dl className="analysis-metrics" style={{ "--metric-count": items.length } as CSSProperties}>
    {items.map(item => { const Icon = item.icon; return <div key={item.label}><dt><Icon size={18} aria-hidden="true"/>{item.label}</dt><dd>{item.value}</dd></div>; })}
  </dl>;
}

export function AnalysisTabs<T extends string>({ tabs, active, onChange }: { tabs: { id: T; label: string; icon: LucideIcon }[]; active: T; onChange: (id: T) => void }) {
  return <nav className="analysis-tabs" aria-label="Selecciona una vista del análisis"><div className="analysis-tabs-control">{tabs.map(tab => {
    const Icon = tab.icon;
    return <button type="button" key={tab.id} aria-pressed={active === tab.id} className={active === tab.id ? "is-active" : undefined} onClick={() => onChange(tab.id)}><Icon size={16}/>{tab.label}</button>;
  })}</div></nav>;
}

const priorityOptions = [
  { id: "all", label: "Todos" },
  { id: "critical", label: "Crítico" },
  { id: "high", label: "Alto" },
  { id: "medium", label: "Medio" },
  { id: "low", label: "Bajo" },
];

export function PriorityFilter({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <div className="analysis-priority-filter" role="group" aria-label="Filtrar por prioridad">
    {priorityOptions.map(option => <button type="button" key={option.id} aria-pressed={value === option.id}
      className={value === option.id ? "is-active" : undefined} onClick={() => onChange(option.id)}>{option.label}</button>)}
  </div>;
}
