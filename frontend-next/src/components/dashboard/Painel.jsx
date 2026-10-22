// Base visual da Central de Inteligência. Mantém todos os blocos no mesmo
// ritmo de borda, raio e profundidade sem esconder a semântica do <section>.
// `futurista` troca o cartão claro pelo painel escuro dos gráficos (ix-chart).
export function Painel({ children, className = "", hero = false, futurista = false, ...props }) {
  return (
    <section
      className={`${futurista ? "ix-chart" : "wb-panel"} ${hero && !futurista ? "wb-panel-hero" : ""} p-6 ${className}`}
      {...props}
    >
      {children}
    </section>
  );
}

export function PainelTitulo({ titulo, descricao, acao = null }) {
  return (
    <div className="mb-5 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-xl font-bold text-wb-text">{titulo}</h2>
        {descricao ? <p className="mt-1 text-sm leading-relaxed text-wb-muted">{descricao}</p> : null}
      </div>
      {acao}
    </div>
  );
}
