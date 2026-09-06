// Base visual da Central de Inteligência. Mantém todos os blocos no mesmo
// ritmo de borda, raio e profundidade sem esconder a semântica do <section>.
export function Painel({ children, className = "", hero = false, ...props }) {
  return (
    <section
      className={`wb-panel ${hero ? "wb-panel-hero" : ""} p-5 ${className}`}
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
        <h2 className="text-sm font-semibold tracking-[-0.01em] text-wb-text">{titulo}</h2>
        {descricao ? <p className="mt-1 text-xs leading-relaxed text-wb-muted">{descricao}</p> : null}
      </div>
      {acao}
    </div>
  );
}
