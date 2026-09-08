// Regras das avaliações do SIOPI, isoladas da UI para que o modal, a lista, o
// drawer e a página concordem sobre quando perguntar, o que perguntar e como
// calcular. O percentual persistido é sempre o que o backend devolve — o daqui
// serve ao retorno visual enquanto o corretor digita.

// Espelha models.ResultadoPorStatus no Go. Só estes status representam uma
// decisão de avaliação; os demais não pedem registro nenhum.
export const RESULTADO_POR_STATUS = {
  cliente_aprovado: "aprovada",
  aprovado: "aprovada",
  condicionado: "condicionada",
  reprovado: "reprovada",
};

export function resultadoPorStatus(status) {
  return RESULTADO_POR_STATUS[status] || null;
}

export const RESULTADO_LABEL = {
  aprovada: "Aprovada",
  condicionada: "Condicionada",
  reprovada: "Reprovada",
};

// Os campos de cada tela, na ordem em que o SIOPI os mostra — a ordem importa:
// o corretor preenche olhando para o print, de cima para baixo.
// `tipo` decide o controle: texto, area, dinheiro, data, datahora ou inteiro.
export const CAMPOS_POR_RESULTADO = {
  aprovada: [
    { nome: "codigo_proposta", label: "Código Proposta", tipo: "texto" },
    { nome: "codigo_avaliacao", label: "Código Avaliação", tipo: "texto" },
    { nome: "protocolo_cadastro", label: "Protocolo do Cadastro", tipo: "texto" },
    { nome: "validade_inicio", label: "Validade — início", tipo: "data" },
    { nome: "validade_fim", label: "Validade — fim", tipo: "data" },
    { nome: "origem_recurso", label: "Origem de Recurso", tipo: "texto" },
    { nome: "modalidade", label: "Modalidade", tipo: "texto" },
    { nome: "produto", label: "Produto", tipo: "texto" },
    { nome: "valor_imovel", label: "Valor do Imóvel", tipo: "dinheiro" },
    { nome: "valor_financiamento", label: "Valor Financiamento", tipo: "dinheiro" },
    { nome: "prestacao", label: "Prestação", tipo: "dinheiro" },
    { nome: "indexador", label: "Indexador", tipo: "texto" },
    { nome: "sistema_amortizacao", label: "Sistema de Amortização", tipo: "texto" },
    { nome: "prazo_meses", label: "Prazo (meses)", tipo: "inteiro" },
    { nome: "sistema_originador", label: "Sistema Originador", tipo: "texto" },
    { nome: "agencia_relacionamento", label: "Agência de relacionamento", tipo: "texto" },
  ],
  condicionada: [
    { nome: "codigo_proposta", label: "Código Proposta", tipo: "texto" },
    { nome: "codigo_avaliacao", label: "Código Avaliação", tipo: "texto" },
    { nome: "codigo_correspondente", label: "Código do Correspondente", tipo: "texto" },
    { nome: "condicao_aprovacao", label: "Condição de Aprovação", tipo: "area" },
    { nome: "valor_prestacao_possivel", label: "Valor da prestação possível", tipo: "dinheiro" },
    { nome: "resposta_siric", label: "Resposta SIRIC", tipo: "datahora" },
  ],
  reprovada: [
    { nome: "codigo_proposta", label: "Código Proposta", tipo: "texto" },
    { nome: "codigo_avaliacao", label: "Código Avaliação", tipo: "texto" },
    { nome: "codigo_correspondente", label: "Código do Correspondente", tipo: "texto" },
    { nome: "motivo_reprovacao", label: "Motivo da Reprovação", tipo: "area" },
    { nome: "resposta_siric", label: "Resposta SIRIC", tipo: "datahora" },
  ],
};

// A tela aprovada traz "Prestação"; a condicionada traz "Valor da prestação
// Possível"; a reprovada não traz parcela nenhuma.
export function parcelaConsiderada(av) {
  if (!av) return null;
  if (av.resultado === "aprovada") return av.prestacao ?? null;
  if (av.resultado === "condicionada") return av.valor_prestacao_possivel ?? null;
  return null;
}

// Espelha clientes.CalcularPercentual no Go: parcela / renda * 100, uma casa.
export function percentualDaRenda(renda, parcela) {
  const r = Number(renda);
  const p = Number(parcela);
  if (!Number.isFinite(r) || !Number.isFinite(p) || r <= 0 || p < 0) return null;
  return Math.round((p / r) * 1000) / 10;
}

export function formatarPercentual(pct) {
  if (pct === null || pct === undefined) return "—";
  return `${Number(pct).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}
