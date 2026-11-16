// Utilitários do módulo financeiro (painel, receitas, despesas, pagamentos).
// Sem hooks: servem tanto a Server quanto a Client Components.
//
// Datas: o backend grava `data` de receitas/despesas como meia-noite UTC
// ("2026-11-14T00:00:00Z"). Converter com new Date() no fuso de Brasília
// mostrava o dia ANTERIOR (13/11). Por isso tudo aqui compara e exibe pela
// parte "AAAA-MM-DD" da string, sem passar pelo fuso.

const FUSO = "America/Sao_Paulo";
const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const MESES_CURTOS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

// "AAAA-MM-DD" de hoje no fuso de Brasília.
export function hojeISO() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: FUSO, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export const diaISO = (valor) => (valor ? String(valor).slice(0, 10) : "");

// "2026-11-14T00:00:00Z" → "14/11/2026"
export function formatarData(valor) {
  const d = diaISO(valor);
  if (!d) return "—";
  const [a, m, dia] = d.split("-");
  return `${dia}/${m}/${a}`;
}

export const nomeMes = (mes) => MESES[mes - 1];
export const nomeMesCurto = (mes) => MESES_CURTOS[mes - 1];

const pad = (n) => String(n).padStart(2, "0");
const ultimoDia = (ano, mes) => new Date(Date.UTC(ano, mes, 0)).getUTCDate();

// Soma `delta` meses a (ano, mes) — mes de 1 a 12.
export function somarMeses(ano, mes, delta) {
  const total = ano * 12 + (mes - 1) + delta;
  return { ano: Math.floor(total / 12), mes: (total % 12) + 1 };
}

// Períodos rápidos. A ordem é a dos botões na tela.
export const PERIODOS = [
  { id: "mes", label: "Este mês" },
  { id: "anterior", label: "Mês passado" },
  { id: "3meses", label: "Últimos 3 meses" },
  { id: "tudo", label: "Tudo" },
];

// Intervalo [inicio, fim] em "AAAA-MM-DD" (fim inclusivo) e um texto curto
// para frases ("em novembro", "nos últimos 3 meses").
export function intervaloDoPeriodo(id, hoje = hojeISO()) {
  const [ano, mes] = hoje.split("-").map(Number);
  if (id === "tudo") return { id, inicio: null, fim: null, frase: "desde o início", rotulo: "Tudo" };
  if (id === "anterior") {
    const p = somarMeses(ano, mes, -1);
    return { id, inicio: `${p.ano}-${pad(p.mes)}-01`, fim: `${p.ano}-${pad(p.mes)}-${pad(ultimoDia(p.ano, p.mes))}`, frase: `em ${nomeMes(p.mes)}`, rotulo: "Mês passado" };
  }
  if (id === "3meses") {
    const p = somarMeses(ano, mes, -2);
    return { id, inicio: `${p.ano}-${pad(p.mes)}-01`, fim: `${ano}-${pad(mes)}-${pad(ultimoDia(ano, mes))}`, frase: "nos últimos 3 meses", rotulo: "Últimos 3 meses" };
  }
  return { id: "mes", inicio: `${ano}-${pad(mes)}-01`, fim: `${ano}-${pad(mes)}-${pad(ultimoDia(ano, mes))}`, frase: `em ${nomeMes(mes)}`, rotulo: "Este mês" };
}

export function periodoValido(id, padrao) {
  return PERIODOS.some((p) => p.id === id) ? id : padrao;
}

export function noIntervalo(valor, { inicio, fim }) {
  const d = diaISO(valor);
  if (!inicio || !fim) return true;
  return d >= inicio && d <= fim;
}

export const somar = (itens) => itens.reduce((s, i) => s + (Number(i.valor) || 0), 0);

// Agrupa por categoria (`tipo`) com total, do maior para o menor.
export function porCategoria(itens) {
  const mapa = new Map();
  for (const i of itens) {
    const chave = (i.tipo || "Sem categoria").trim();
    mapa.set(chave, (mapa.get(chave) || 0) + (Number(i.valor) || 0));
  }
  return [...mapa.entries()].map(([tipo, total]) => ({ tipo, total })).sort((a, b) => b.total - a.total);
}

// Série dos últimos `n` meses (o atual incluso) com entradas e saídas.
export function serieMensal(receitas, despesas, n = 6, hoje = hojeISO()) {
  const [ano, mes] = hoje.split("-").map(Number);
  const meses = Array.from({ length: n }, (_, i) => {
    const p = somarMeses(ano, mes, i - (n - 1));
    return { chave: `${p.ano}-${pad(p.mes)}`, mes: p.mes, ano: p.ano, entrou: 0, saiu: 0 };
  });
  const idx = new Map(meses.map((m, i) => [m.chave, i]));
  for (const r of receitas) { const i = idx.get(diaISO(r.data).slice(0, 7)); if (i !== undefined) meses[i].entrou += Number(r.valor) || 0; }
  for (const d of despesas) { const i = idx.get(diaISO(d.data).slice(0, 7)); if (i !== undefined) meses[i].saiu += Number(d.valor) || 0; }
  return meses;
}

// ── Pagamentos (cobranças enviadas a clientes) ─────────────────────────
// Status do backend: pendente | aprovado | rejeitado | cancelado | expirado |
// aguardando (o gateway marca "aguardando" quando a cobrança VENCEU sem
// pagamento — ver mapAsaasStatus em backend-go/internal/modules/pagamentos).
// Aqui viram um semáforo em português simples.
export function situacaoPagamento(p, hoje = hojeISO()) {
  const s = String(p.status || "").toLowerCase();
  if (s === "aprovado") return { id: "pago", label: "Pago", tom: "ok" };
  if (["cancelado", "rejeitado", "expirado"].includes(s)) return { id: "cancelado", label: "Cancelado", tom: "neutro" };
  const venc = diaISO(p.data_vencimento);
  if (s === "aguardando" || (venc && venc < hoje)) return { id: "atrasado", label: "Atrasado", tom: "perigo" };
  if (venc === hoje) return { id: "avencer", label: "Vence hoje", tom: "alerta" };
  return { id: "avencer", label: "A vencer", tom: "alerta" };
}

// `valor` do pagamento é TEXTO formatado ("2.000,00"); o número está em
// `valor_numerico`. Usar `valor` em contas dava NaN.
export function valorPagamento(p) {
  if (Number.isFinite(Number(p.valor_numerico)) && Number(p.valor_numerico) > 0) return Number(p.valor_numerico);
  const n = Number(String(p.valor ?? "").replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}
