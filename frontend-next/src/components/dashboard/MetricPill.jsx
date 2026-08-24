// Faixa de métricas do topo: rótulo à esquerda, número em laranja à direita
// e uma barra fina de progresso embaixo. `ratio` é 0–100 e representa algo
// real (participação da métrica no seu total), não enfeite.
export function MetricPill({ icon: Icon, label, value, ratio = 100 }) {
  const pct = Math.max(2, Math.min(100, ratio));

  return (
    <div className="rounded-2xl border border-cx-border bg-cx-surface px-4 py-3 backdrop-blur-md">
      <div className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2 text-xs font-medium text-cx-muted">
          {Icon && <Icon className="h-3.5 w-3.5 shrink-0 text-cx-muted" />}
          <span className="truncate">{label}</span>
        </span>
        {/* Número em branco, não em laranja: sobre o vidro claro da aqua o
            laranja fica em 1,6:1 de contraste. O laranja segue presente na
            barra abaixo, que é forma cheia e aguenta o fundo claro. */}
        <span className="font-tabular text-lg font-bold leading-none text-cx-text">{value}</span>
      </div>
      <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-cx-border">
        <div
          className="h-full rounded-full bg-gradient-to-r from-caixa-orange to-caixa-orange-light"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
