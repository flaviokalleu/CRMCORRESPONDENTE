// Status do cliente — alinhado ao enum STATUS_VALIDOS do backend Go
// (internal/models/cliente.go). Em vez de 21 cores distintas (poluição visual),
// agrupamos em 4 tons SEMÂNTICOS discretos; a UI usa pílula neutra + um pequeno
// ponto colorido, mantendo um visual corporativo/sóbrio.

// tons: positive (aprovado/concluído), negative (reprovado/cancelado),
// attention (aguardando/pendente/condicionado), neutral (em andamento).
export const TONE_DOT = {
  positive: "#34d399", // emerald-400
  negative: "#f87171", // red-400
  attention: "#fbbf24", // amber-400
  neutral: "#94a3b8", // slate-400
};

// Preenchimento da flecha de status. Cada status tem a SUA cor — 21 tons
// distintos, um por valor do enum, para que cada lane do Kanban se distinga da
// vizinha de relance.
//
// Restrição que define a paleta: a flecha é forma cheia e leva o nome em
// BRANCO dentro, então toda cor precisa passar AA (4,5:1) sobre branco. Por
// isso são todos passos escuros (-700/-800/-900 do Tailwind); a pior do
// conjunto é #047857 com 4,92:1. Não clareie nenhuma sem reconferir.
//
// A cor NÃO é o que carrega o significado — o nome dentro da flecha é. O tom
// semântico (positive/negative/attention/neutral) continua vivo em `tone` e é
// o que deve ser usado para agrupar ou colorir gráficos.
export const STATUS_COLOR = {
  aguardando_aprovacao: "#b45309",
  proposta_apresentada: "#0369a1",
  documentacao_pendente: "#c2410c",
  visita_efetuada: "#0e7490",
  aguardando_cancelamento_qv: "#a16207",
  condicionado: "#6d28d9",
  cliente_aprovado: "#047857",
  reprovado: "#b91c1c",
  reserva: "#4338ca",
  conferencia_documento: "#0f766e",
  nao_descondiciona: "#be123c",
  conformidade: "#4d7c0f",
  concluido: "#15803d",
  nao_deu_continuidade: "#44403c",
  aguardando_reserva_orcamentaria: "#7e22ce",
  fechamento_proposta: "#1d4ed8",
  processo_em_aberto: "#334155",
  aprovado: "#065f46",
  em_andamento: "#3f3f46",
  finalizado: "#166534",
  cancelado: "#7f1d1d",
};

// Pílula suave — fundo tingido + nome na cor do status. Substitui a flecha
// sólida na lista e no Kanban.
//
// Estes valores NÃO foram escolhidos a olho: STATUS_COLOR foi calibrado no
// limite de AA sobre BRANCO PURO (a pior era 4,92:1), então qualquer fundo
// tingido derruba abaixo de 4,5:1. STATUS_SOFT é o próprio tom a 12% sobre
// branco, e STATUS_INK é o tom escurecido por cálculo até voltar a passar AA
// sobre esse fundo. Cinco precisaram escurecer; os outros dezesseis ficaram
// iguais a STATUS_COLOR. Pior contraste do conjunto: 4,52:1.
//
// Se mexer em STATUS_COLOR, recalcule estes dois mapas — não ajuste no olho.
export const STATUS_SOFT = {
  aguardando_aprovacao: "#f6eae1",
  proposta_apresentada: "#e1edf4",
  documentacao_pendente: "#f8e8e2",
  visita_efetuada: "#e2eef2",
  aguardando_cancelamento_qv: "#f4ece1",
  condicionado: "#ede5fa",
  cliente_aprovado: "#e1efeb",
  reprovado: "#f7e4e4",
  reserva: "#e8e7f9",
  conferencia_documento: "#e2efee",
  nao_descondiciona: "#f7e3e8",
  conformidade: "#eaefe2",
  concluido: "#e3f0e8",
  nao_deu_continuidade: "#e9e8e8",
  aguardando_reserva_orcamentaria: "#f0e4f9",
  fechamento_proposta: "#e4eafa",
  processo_em_aberto: "#e7e8eb",
  aprovado: "#e1ece9",
  em_andamento: "#e8e8e9",
  finalizado: "#e3ede7",
  cancelado: "#f0e4e4",
};

export const STATUS_INK = {
  aguardando_aprovacao: "#ad5009",
  proposta_apresentada: "#0369a1",
  documentacao_pendente: "#ba3e0c",
  visita_efetuada: "#0e7490",
  aguardando_cancelamento_qv: "#975c07",
  condicionado: "#6d28d9",
  cliente_aprovado: "#047857",
  reprovado: "#b91c1c",
  reserva: "#4338ca",
  conferencia_documento: "#0f766e",
  nao_descondiciona: "#be123c",
  conformidade: "#4a770e",
  concluido: "#147b3b",
  nao_deu_continuidade: "#44403c",
  aguardando_reserva_orcamentaria: "#7e22ce",
  fechamento_proposta: "#1d4ed8",
  processo_em_aberto: "#334155",
  aprovado: "#065f46",
  em_andamento: "#3f3f46",
  finalizado: "#166534",
  cancelado: "#7f1d1d",
};

// Fundo/tinta de fallback para status fora do enum (lane "Sem status").
export const TONE_SOFT = {
  positive: "#e1efeb",
  negative: "#f7e4e4",
  attention: "#f6eae1",
  neutral: "#e7e8eb",
};

export const TONE_INK = {
  positive: "#047857",
  negative: "#b91c1c",
  attention: "#ad5009",
  neutral: "#334155",
};

// Fallback por tom, para status fora do enum (lane "Sem status").
export const TONE_SOLID = {
  positive: "#047857",
  negative: "#b91c1c",
  attention: "#b45309",
  neutral: "#475569",
};

const S = (label, tone) => ({ label, tone });

export const STATUS_MAP = {
  aguardando_aprovacao: S("Aguardando aprovação", "attention"),
  proposta_apresentada: S("Proposta apresentada", "neutral"),
  documentacao_pendente: S("Documentação pendente", "attention"),
  visita_efetuada: S("Visita efetuada", "neutral"),
  aguardando_cancelamento_qv: S("Aguardando cancelamento/QV", "attention"),
  condicionado: S("Condicionado", "attention"),
  cliente_aprovado: S("Aprovado", "positive"),
  reprovado: S("Reprovado", "negative"),
  reserva: S("Reserva", "neutral"),
  conferencia_documento: S("Conferência de documento", "neutral"),
  nao_descondiciona: S("Não descondiciona", "negative"),
  conformidade: S("Conformidade", "positive"),
  concluido: S("Venda concluída", "positive"),
  nao_deu_continuidade: S("Não deu continuidade", "negative"),
  aguardando_reserva_orcamentaria: S("Aguardando reserva orçamentária", "attention"),
  fechamento_proposta: S("Fechamento de proposta", "neutral"),
  processo_em_aberto: S("Processo em aberto", "neutral"),
  aprovado: S("Aprovado", "positive"),
  em_andamento: S("Em andamento", "neutral"),
  finalizado: S("Finalizado", "positive"),
  cancelado: S("Cancelado", "negative"),
};

export const STATUS_LIST = Object.entries(STATUS_MAP).map(([value, meta]) => ({ value, ...meta }));

export function statusInfo(value) {
  const meta = STATUS_MAP[value] || { label: value || "—", tone: "neutral" };
  return {
    ...meta,
    dot: TONE_DOT[meta.tone],
    solid: STATUS_COLOR[value] || TONE_SOLID[meta.tone],
    soft: STATUS_SOFT[value] || TONE_SOFT[meta.tone],
    ink: STATUS_INK[value] || TONE_INK[meta.tone],
  };
}
