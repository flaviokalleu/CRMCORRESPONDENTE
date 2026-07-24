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
  return { ...meta, dot: TONE_DOT[meta.tone] };
}
