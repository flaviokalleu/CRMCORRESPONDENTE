// Formatação e textos da assinatura. Texto para leigo: nada de "trialing".

export function brl(v) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v) || 0);
}

// Vencimento vem como DATE (meia-noite UTC): formatar em UTC para não cair no dia anterior.
export function dataDaFatura(v) {
  if (!v) return "—";
  return new Date(v).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

export function data(v) {
  if (!v) return "—";
  return new Date(v).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

function dias(n) {
  return n === 1 ? "1 dia" : `${n} dias`;
}

// Mensagem principal + tom do semáforo para cada situação.
export function situacaoEmTexto(acesso) {
  const a = acesso || {};
  switch (a.situacao) {
    case "teste":
      return {
        tom: a.dias_restantes <= 2 ? "alerta" : "ok",
        selo: "Teste grátis",
        titulo: a.dias_restantes <= 1 ? "Seu teste grátis acaba hoje" : `Seu teste grátis acaba em ${dias(a.dias_restantes)}`,
        detalhe: `Pague a primeira mensalidade até ${data(a.bloqueia_em)} para continuar sem interrupção.`,
      };
    case "em_dia":
      return {
        tom: "ok",
        selo: "Em dia",
        titulo: "Sua assinatura está em dia",
        detalhe: a.pago_ate ? `Pago até ${data(a.pago_ate)}.` : "Sem mensalidade pendente.",
      };
    case "atrasada":
      return {
        tom: "alerta",
        selo: "Pagamento atrasado",
        titulo: "A mensalidade venceu",
        detalhe: `Pague até ${data(a.bloqueia_em)} para o acesso não ser suspenso.`,
      };
    case "teste_acabou":
      return {
        tom: "perigo",
        selo: "Acesso suspenso",
        titulo: "Seu teste grátis terminou",
        detalhe: "Pague a mensalidade para liberar o acesso. Nenhum dado foi apagado.",
      };
    case "bloqueada":
      return {
        tom: "perigo",
        selo: "Acesso suspenso",
        titulo: "O acesso foi suspenso por falta de pagamento",
        detalhe: "Assim que o pagamento for confirmado, o acesso volta sozinho. Nenhum dado foi apagado.",
      };
    case "bloqueio_manual":
      return {
        tom: "perigo",
        selo: "Acesso suspenso",
        titulo: "O acesso desta empresa está suspenso",
        detalhe: "Fale com o suporte para entender o motivo e liberar o acesso.",
      };
    case "cancelada":
      return {
        tom: "neutro",
        selo: "Cancelada",
        titulo: "A assinatura foi cancelada",
        detalhe: "Escolha um plano para voltar a usar o sistema.",
      };
    default:
      return { tom: "neutro", selo: "Sem assinatura", titulo: "Nenhuma assinatura encontrada", detalhe: "Fale com o suporte." };
  }
}

export const STATUS_FATURA = {
  pendente: { texto: "A pagar", tom: "alerta" },
  vencida: { texto: "Vencida", tom: "perigo" },
  paga: { texto: "Paga", tom: "ok" },
  estornada: { texto: "Estornada", tom: "neutro" },
  cancelada: { texto: "Cancelada", tom: "neutro" },
};

export const FORMA = { pix: "Pix", boleto: "Boleto", cartao: "Cartão", manual: "Baixa manual" };
