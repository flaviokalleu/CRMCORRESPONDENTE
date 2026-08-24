// ─── Minha Casa Minha Vida — parâmetros e cálculo ────────────────────────────
//
// ATENÇÃO: estes números são POLÍTICA PÚBLICA e mudam por portaria/decreto.
// Foram levantados em agosto/2026 a partir de fontes secundárias (portais de
// construtoras e simuladores de mercado), NÃO do normativo da Caixa. Antes de
// usar comercialmente, confira com o gerente do banco ou no site da Caixa e
// ajuste aqui — é o único lugar do sistema que precisa mudar.
//
// Como o programa funciona, em uma frase: o banco olha a RENDA FAMILIAR,
// enquadra numa faixa, e dessa faixa saem três coisas — a taxa de juros, o
// teto do imóvel e se há subsídio. A parcela nunca pode passar de 30% da
// renda, e o prazo vai até 420 meses (35 anos).

export const PRAZO_MAXIMO_MESES = 420;
export const COMPROMETIMENTO_MAXIMO = 0.3; // a prestação não pode passar de 30% da renda

// Região: Valparaíso de Goiás, Cidade Ocidental, Luziânia e o Entorno do DF
// ficam no Centro-Oeste, e por serem RIDE/região metropolitana de Brasília
// entram no teto mais alto de imóvel.
export const REGIAO = "S/SE/CO";

// `cotista` = quem tem 3 anos de FGTS (somados, em qualquer empregador).
// Cotista paga menos juros — por isso a pergunta aparece no simulador.
export const FAIXAS = [
  {
    id: 1,
    nome: "Faixa 1",
    rendaAte: 3200,
    jurosCotista: 4.25,
    jurosNaoCotista: 4.75,
    tetoImovel: 264000,
    subsidioMaximo: 55000,
    resumo: "Menor juro do programa e subsídio do governo de até R$ 55 mil.",
  },
  {
    id: 2,
    nome: "Faixa 2",
    rendaAte: 5000,
    jurosCotista: 5.5,
    jurosNaoCotista: 6.0,
    tetoImovel: 264000,
    // Na Faixa 2 o subsídio é DECRESCENTE conforme a renda sobe; usamos um
    // teto menor como estimativa conservadora, não o máximo do programa.
    subsidioMaximo: 20000,
    resumo: "Ainda tem subsídio, menor conforme a renda aumenta.",
  },
  {
    id: 3,
    nome: "Faixa 3",
    rendaAte: 9600,
    jurosCotista: 7.66,
    jurosNaoCotista: 8.16,
    tetoImovel: 400000,
    subsidioMaximo: 0,
    resumo: "Sem subsídio, mas com juros bem abaixo do mercado.",
  },
  {
    id: 4,
    nome: "Faixa 4",
    nomeAlt: "Classe Média",
    rendaAte: 13000,
    jurosCotista: 10.0,
    jurosNaoCotista: 10.5,
    tetoImovel: 600000,
    subsidioMaximo: 0,
    resumo: "Faixa da classe média, criada para rendas de até R$ 13 mil.",
  },
];

// Acima do teto da Faixa 4 o MCMV não alcança — cai no SBPE (financiamento
// comum), com taxa de mercado.
export const SBPE = {
  id: 0,
  nome: "SBPE (fora do MCMV)",
  jurosCotista: 11.49,
  jurosNaoCotista: 11.49,
  tetoImovel: Infinity,
  subsidioMaximo: 0,
  resumo: "Renda acima do programa: financiamento comum, a juros de mercado.",
};

export function faixaPorRenda(renda) {
  const r = Number(renda) || 0;
  return FAIXAS.find((f) => r <= f.rendaAte) || SBPE;
}

const taxaMensalDe = (anual) => Math.pow(1 + anual / 100, 1 / 12) - 1;

/**
 * Simula o enquadramento a partir da renda familiar.
 *
 * A conta parte da PARCELA, não do preço: o limite real de quem compra o
 * primeiro imóvel é quanto cabe no orçamento mensal (30% da renda). Dessa
 * parcela voltamos ao valor financiável e só então somamos entrada e subsídio.
 *
 * Sistema SAC — a primeira parcela é a maior:
 *   parcela1 = (F / n) + F*i   →   F = parcela1 / (1/n + i)
 */
export function simularMCMV({ renda, cotista = false, fgts = 0, prazoMeses = PRAZO_MAXIMO_MESES }) {
  const rendaNum = Number(renda) || 0;
  const faixa = faixaPorRenda(rendaNum);
  const jurosAnual = cotista ? faixa.jurosCotista : faixa.jurosNaoCotista;
  const i = taxaMensalDe(jurosAnual);

  const parcelaMaxima = rendaNum * COMPROMETIMENTO_MAXIMO;
  const financiavel = parcelaMaxima > 0 ? parcelaMaxima / (1 / prazoMeses + i) : 0;

  const subsidio = faixa.subsidioMaximo || 0;
  const entrada = Number(fgts) || 0;

  // Poder de compra bruto = o que o banco financia + FGTS + subsídio.
  const bruto = financiavel + entrada + subsidio;
  // ...limitado pelo teto de imóvel da faixa.
  const limitadoPeloTeto = Math.min(bruto, faixa.tetoImovel);
  const estouroDeTeto = bruto > faixa.tetoImovel;

  // Se o teto cortou, a parcela real cai junto (financia-se menos).
  const financiadoReal = Math.max(0, limitadoPeloTeto - entrada - subsidio);
  const parcelaReal = financiadoReal * (1 / prazoMeses + i);

  return {
    faixa,
    jurosAnual,
    cotista,
    prazoMeses,
    parcelaMaxima,
    parcelaEstimada: parcelaReal,
    valorFinanciado: financiadoReal,
    subsidio,
    entrada,
    poderDeCompra: limitadoPeloTeto,
    tetoImovel: faixa.tetoImovel,
    estouroDeTeto,
    foraDoPrograma: faixa.id === 0,
  };
}

/**
 * Parcela estimada de um imóvel de valor conhecido — usada nos cards da
 * vitrine, onde não sabemos a renda de quem está olhando.
 *
 * Premissa declarada no rótulo: Faixa 3 sem cotista (8,16% a.a.), 420 meses e
 * 20% de entrada. É o cenário do meio; quem se enquadra nas faixas 1 e 2 paga
 * MENOS, quem está fora do programa paga mais.
 */
export const PREMISSA_CARD = {
  jurosAnual: 8.16,
  prazoMeses: PRAZO_MAXIMO_MESES,
  entradaPct: 0.2,
  rotulo: "estimativa: 20% de entrada, 35 anos, 8,16% a.a. (MCMV Faixa 3)",
};

export function parcelaDoImovel(valor) {
  const v = Number(valor) || 0;
  if (v <= 0) return null;
  const financiado = v * (1 - PREMISSA_CARD.entradaPct);
  const i = taxaMensalDe(PREMISSA_CARD.jurosAnual);
  return financiado * (1 / PREMISSA_CARD.prazoMeses + i);
}

// Renda necessária para bancar uma parcela, no limite dos 30%.
export function rendaNecessaria(parcela) {
  return (Number(parcela) || 0) / COMPROMETIMENTO_MAXIMO;
}
