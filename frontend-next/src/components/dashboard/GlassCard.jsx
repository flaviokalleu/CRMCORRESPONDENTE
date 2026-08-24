// Moldura padrão dos cartões do dashboard no tema claro "cx": superfície
// branca com borda de 1px. (Antes era vidro sobre o gradiente aqua; o nome
// ficou por compatibilidade com os imports.)
export function GlassCard({ children, className = "" }) {
  return (
    <div
      className={`rounded-xl border border-cx-border bg-cx-surface p-4 ${className}`}
    >
      {children}
    </div>
  );
}

// Cabeçalho interno: ícone em quadrado laranja + título (e ação opcional
// à direita, tipo o par de botões Mensal/Semanal).
export function GlassCardHeader({ icon: Icon, title, subtitle, action }) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        {Icon && (
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-cx-orange text-white">
            <Icon className="h-[1.05rem] w-[1.05rem]" />
          </span>
        )}
        <div className="min-w-0">
          <h2 className="text-[0.95rem] font-semibold leading-tight text-cx-text">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-cx-muted">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
