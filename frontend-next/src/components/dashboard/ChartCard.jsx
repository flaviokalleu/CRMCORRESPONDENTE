import { CHART_COLORS } from "@/lib/chart-colors";

// Moldura padrão dos painéis — vidro escuro consistente, um pontinho de
// cor ao lado do título (não uma faixa colorida inteira) pra identificar
// o painel sem gritar.
export function ChartCard({ title, subtitle, action, live, tag = "blue", children, className = "" }) {
  const dotColor = tag === "orange" ? CHART_COLORS.white : CHART_COLORS.navy;

  return (
    <div className={`rounded-lg border border-cx-border bg-cx-surface p-3 ${className}`}>
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: dotColor }} />
          <div>
            <h2 className="text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-cx-muted">{title}</h2>
            {subtitle && <p className="font-tabular mt-0.5 text-xs text-cx-muted">{subtitle}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {live && (
            <span className="inline-flex items-center gap-1.5 text-[0.65rem] font-medium uppercase tracking-wide text-emerald-700/80">
              <span className="pulse-dot" />
              ao vivo
            </span>
          )}
          {action}
        </div>
      </div>
      {children}
    </div>
  );
}
