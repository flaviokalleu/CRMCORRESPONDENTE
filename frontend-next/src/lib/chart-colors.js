// Paleta Caixa como aplicada na prática pela marca (ATMs, agências, App
// Caixa Tem, loteria): laranja dominante sobre branco/azul — a hierarquia
// que o cliente reconhece de fato, não a proporção "≤15%" do manual gráfico
// interno. Segue a identidade já usada no resto do app (--color-caixa-*).
export const CAIXA = {
  blue: "#1c60ab", // Pantone 293 — azul institucional
  blueLight: "#3987e5", // passo p/ superfície escura, validado
  blueDeep: "#0d3568",
  orange: "#f97316", // laranja da marca
  orangeDark: "#ea580c", // passo p/ superfície escura, validado — mesmo tom do hover dos CTAs do app
};

// Par validado com o script do skill de dataviz contra a superfície do
// card (#0f1c33) — lightness band, chroma floor, separação CVD (ΔE 27.7
// protan / 34.1 normal) e contraste, todos PASS. Laranja é a cor líder (dado
// em destaque); azul é o acento secundário/estrutural.
export const CHART_COLORS = {
  orange: CAIXA.orangeDark,
  blue: CAIXA.blueLight,
};

// Paleta de status fixa (nunca reaproveitada para série categórica).
export const STATUS_COLORS = {
  good: "#0ca30c",
  warning: "#fab219",
  serious: "#ec835a",
  critical: "#d03b3b",
};

// Chrome/tinta dos gráficos — ajustado à superfície "terminal" escura do
// dashboard (mais profunda que o navy padrão do app).
export const CHART_CHROME = {
  surface: "#0a1122",
  gridline: "rgba(148,180,255,0.07)",
  axis: "rgba(148,180,255,0.16)",
  textPrimary: "#f5f7fb",
  textSecondary: "rgba(226,232,255,0.55)",
  textMuted: "rgba(226,232,255,0.32)",
};
