// Paleta Caixa como aplicada na prática pela marca (ATMs, agências, App
// Caixa Tem, loteria): laranja dominante sobre branco/azul — a hierarquia
// que o cliente reconhece de fato, não a proporção "≤15%" do manual gráfico
// interno. Segue a identidade já usada no resto do app (--color-caixa-*).
export const CAIXA = {
  blue: "#1c60ab", // Pantone 293 — azul institucional
  blueLight: "#3987e5", // passo p/ superfície ESCURA (navy) — não usar sobre aqua
  blueDeep: "#0d3568",
  orange: "#f97316", // laranja da marca
  orangeDark: "#ea580c", // passo p/ superfície escura
  orangeLight: "#fdba74", // passo p/ superfície aqua, validado
};

// A superfície dos gráficos passou a ser CLARA (tema "cx": cartão branco
// #ffffff sobre página #f3f5f8). Isso inverte a lógica anterior: sobre fundo
// escuro só branco e navy sobreviviam; sobre branco é o contrário — as tintas
// claras somem e as saturadas/escuras é que leem.
//
// Contraste medido contra o cartão branco (#ffffff):
//   #1c60ab (azul institucional)  6,4:1  → série líder
//   #c2410c (laranja escurecido)  4,9:1  → série secundária
//
// O par continua separado por MATIZ e por LUMINÂNCIA, então segue legível em
// escala de cinza e para daltônicos. O laranja da marca (#f97316, 3,0:1) fica
// só no chrome da interface — formas cheias com texto branco em cima —, nunca
// como marca fina de dado.
export const CHART_COLORS = {
  white: CAIXA.blue, // nome mantido p/ não quebrar imports; agora é o azul
  navy: "#c2410c", // idem — a série secundária virou laranja escuro
  orange: "#c2410c",
};

// Paleta de status fixa (nunca reaproveitada para série categórica).
// Passos -600 do Tailwind: sobre o cartão branco os -300 antigos ficavam em
// ~1,4:1 e desapareciam. Estes ficam entre 3,4:1 e 4,8:1, e todo indicador
// continua acompanhado de número e rótulo em texto escuro.
export const STATUS_COLORS = {
  good: "#059669", // emerald-600
  warning: "#d97706", // amber-600
  serious: "#ea580c", // orange-600
  critical: "#dc2626", // red-600
};

// Chrome/tinta dos gráficos sobre a superfície clara: cinzas neutros. Antes
// era branco translúcido, que sumia por completo no branco.
export const CHART_CHROME = {
  surface: "#ffffff",
  gridline: "rgba(31,42,55,0.10)",
  axis: "rgba(31,42,55,0.25)",
  textPrimary: "#1f2a37",
  textSecondary: "#5b6b7c",
  textMuted: "#7a8899",
};
