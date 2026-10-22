// Tema "futurista" dos gráficos do dashboard: painel navy escuro, séries em
// azul/teal luminosos com brilho suave. Só os gráficos usam este tema — o
// resto do painel segue o padrão claro do design system.
//
// Contraste sobre o fundo (#0f1d38): azul #60a5fa 6,6:1, teal #2dd4bf 9,5:1,
// eixo #94a3b8 6,9:1. Status em tons claros para ler no escuro.
export const NEON = {
  bg: "#0f1d38",
  blue: "#60a5fa",
  blueDeep: "#2563eb",
  teal: "#2dd4bf",
  muted: "rgba(148, 163, 184, 0.45)",
  grid: "rgba(148, 163, 184, 0.14)",
  axis: "#94a3b8",
  text: "#e2e8f0",
  good: "#34d399",
  warn: "#fbbf24",
  bad: "#f87171",
};

// Filtro SVG de brilho para linhas e barras (usar dentro de <defs>).
export function NeonGlow({ id = "ixGlow", blur = 4 }) {
  return (
    <filter id={id} x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation={blur} result="b" />
      <feMerge>
        <feMergeNode in="b" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  );
}
