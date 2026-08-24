// Moldura do dashboard "aqua": vidro claro sobre o gradiente azul→turquesa.
// Diferente do ChartCard (vidro escuro do tema terminal) — este assume um
// fundo colorido e vivo, então a borda é mais clara e o blur mais forte.
export function GlassCard({ children, className = "" }) {
  return (
    <div
      className={`rounded-2xl border border-cx-border bg-cx-surface p-4 shadow-[0_8px_32px_rgba(3,25,50,0.25)] backdrop-blur-md ${className}`}
    >
      {children}
    </div>
  );
}

// Cabeçalho interno: ícone em quadrado laranja + título (e ação opcional
// à direita, tipo o par de botões Mensal/Semanal).
export function GlassCardHeader({ icon: Icon, title, subtitle, action }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="flex items-center gap-3">
        {Icon && (
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-caixa-orange text-white shadow-lg shadow-orange-900/30">
            <Icon className="h-[1.05rem] w-[1.05rem]" />
          </span>
        )}
        <div>
          <h2 className="text-[0.95rem] font-semibold leading-tight text-cx-text">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-cx-muted">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}
