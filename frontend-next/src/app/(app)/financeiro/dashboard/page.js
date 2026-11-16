import Link from "next/link";
import { apiGet } from "@/lib/api-server";
import { PageHeader, EmptyState, formatBRL } from "@/components/ui/page";
import { Wallet, TrendingUp, TrendingDown, AlertCircle, Clock3, ArrowRight, Plus } from "@/components/icons";
import { PeriodoChips } from "@/components/financeiro/PeriodoChips";
import {
  hojeISO, intervaloDoPeriodo, periodoValido, noIntervalo, somar, porCategoria, serieMensal,
  nomeMes, nomeMesCurto, situacaoPagamento, valorPagamento,
} from "@/lib/financeiro";

export const metadata = { title: "Painel financeiro" };

// Responde, nesta ordem: quanto entrou, quanto saiu, quanto sobrou no período;
// o que está atrasado ou vence; e como os últimos meses se comparam.
// Os totais saem das listas de receitas/despesas (a mesma regra de data das
// telas de lista), para o número do painel bater com o da lista.
export default async function FinanceiroDashboardPage({ searchParams }) {
  const sp = await searchParams;
  const periodoId = periodoValido(sp?.periodo, "mes");
  const intervalo = intervaloDoPeriodo(periodoId);
  const hoje = hojeISO();

  const [receitasR, despesasR, dash, pagR] = await Promise.all([
    apiGet("/receitas"),
    apiGet("/despesas"),
    apiGet("/fluxocaixa/dashboard"),
    apiGet("/pagamentos?limit=100"),
  ]);

  if (receitasR === null || despesasR === null) {
    return (
      <div className="p-6">
        <PageHeader title="Painel financeiro" />
        <EmptyState icon={Wallet} title="Não foi possível carregar o financeiro" hint="Atualize a página em instantes." />
      </div>
    );
  }

  const receitas = receitasR.filter((r) => noIntervalo(r.data, intervalo));
  const despesas = despesasR.filter((d) => noIntervalo(d.data, intervalo));
  const entrou = somar(receitas);
  const saiu = somar(despesas);
  const sobrou = entrou - saiu;
  const semNada = receitasR.length === 0 && despesasR.length === 0;

  const serie = serieMensal(receitasR, despesasR, 6, hoje);
  const maxSerie = Math.max(1, ...serie.map((m) => Math.max(m.entrou, m.saiu)));
  const melhor = serie.reduce((a, m) => (m.entrou - m.saiu > a.entrou - a.saiu ? m : a), serie[0]);
  const gastos = porCategoria(despesas).slice(0, 4);
  const maxGasto = gastos[0]?.total || 1;

  const pagamentos = pagR?.pagamentos ?? [];
  const comSituacao = pagamentos.map((p) => ({ p, s: situacaoPagamento(p, hoje) }));
  const atrasados = comSituacao.filter((x) => x.s.id === "atrasado");
  const aVencer = comSituacao.filter((x) => x.s.id === "avencer");
  const somaPag = (lista) => lista.reduce((t, x) => t + valorPagamento(x.p), 0);
  const previstoEntrar = dash?.projection?.entradas ?? 0;
  const previstoSair = dash?.projection?.saidas ?? 0;

  const fraseSobrou = sobrou >= 0
    ? `${capitalizar(intervalo.frase)} sobraram ${formatBRL(sobrou)}`
    : `${capitalizar(intervalo.frase)} faltaram ${formatBRL(-sobrou)}`;

  return (
    <div className="p-6">
      <PageHeader title="Painel financeiro" subtitle="Quanto entrou, quanto saiu e o que precisa da sua atenção." />

      <div className="fin-topo">
        <PeriodoChips base="/financeiro/dashboard" atual={periodoId} />
        <div className="fin-atalhos">
          <Link href="/financeiro/receitas" className="fin-periodo"><Plus className="size-3" aria-hidden="true" /> Receita</Link>
          <Link href="/financeiro/despesas" className="fin-periodo"><Plus className="size-3" aria-hidden="true" /> Despesa</Link>
        </div>
      </div>

      {semNada ? (
        <EmptyState icon={Wallet} title="Seu financeiro ainda está vazio" hint="Lance o que entrou (comissões, taxas) e o que saiu (aluguel, contas). O painel passa a mostrar quanto sobrou a cada mês.">
          <div className="fin-atalhos justify-center">
            <Link href="/financeiro/receitas" className="crm-primary-action"><Plus className="size-4" /> Lançar receita</Link>
            <Link href="/financeiro/despesas" className="fin-periodo">Lançar despesa</Link>
          </div>
        </EmptyState>
      ) : (
        <>
          <section className="crm-card fin-frase" aria-live="polite">
            <p>Resultado do período · {intervalo.rotulo}</p>
            <strong data-tom={sobrou < 0 ? "perigo" : undefined}>{fraseSobrou}</strong>
          </section>

          <div className="fin-numeros">
            <Link href={`/financeiro/receitas?periodo=${periodoId}`} className="crm-card fin-numero" data-tom="ok">
              <span className="fin-numero-rotulo"><TrendingUp className="size-4" aria-hidden="true" /> Entrou</span>
              <span className="fin-numero-valor">{formatBRL(entrou)}</span>
              <span className="fin-numero-nota">{receitas.length} receita{receitas.length === 1 ? "" : "s"} · ver lista</span>
            </Link>
            <Link href={`/financeiro/despesas?periodo=${periodoId}`} className="crm-card fin-numero" data-tom="perigo">
              <span className="fin-numero-rotulo"><TrendingDown className="size-4" aria-hidden="true" /> Saiu</span>
              <span className="fin-numero-valor">{formatBRL(saiu)}</span>
              <span className="fin-numero-nota">{despesas.length} despesa{despesas.length === 1 ? "" : "s"} · ver lista</span>
            </Link>
            <div className="crm-card fin-numero" data-tom={sobrou < 0 ? "perigo" : "ok"}>
              <span className="fin-numero-rotulo"><Wallet className="size-4" aria-hidden="true" /> Sobrou</span>
              <span className="fin-numero-valor">{formatBRL(sobrou)}</span>
              <span className="fin-numero-nota">{entrou > 0 ? `${Math.round((sobrou / entrou) * 100)}% do que entrou` : saiu > 0 ? "Nada entrou neste período" : "Sem lançamentos neste período"}</span>
            </div>
          </div>

          <div className="fin-grade">
            <section className="crm-card fin-painel" aria-labelledby="fin-meses">
              <h2 id="fin-meses">
                {melhor && melhor.entrou - melhor.saiu > 0
                  ? `Seu melhor mês foi ${nomeMes(melhor.mes)}: sobraram ${formatBRL(melhor.entrou - melhor.saiu)}`
                  : "Entradas e saídas dos últimos 6 meses"}
              </h2>
              <p className="fin-painel-sub">Entrou × saiu, mês a mês (últimos 6 meses).</p>
              <div className="fin-barras" role="img" aria-label={serie.map((m) => `${nomeMes(m.mes)}: entrou ${formatBRL(m.entrou)}, saiu ${formatBRL(m.saiu)}`).join("; ")}>
                {serie.map((m) => (
                  <div key={m.chave} className="fin-barras-mes" data-atual={m.chave === hoje.slice(0, 7)} title={`${nomeMes(m.mes)} — entrou ${formatBRL(m.entrou)}, saiu ${formatBRL(m.saiu)}`}>
                    <div className="fin-barras-par">
                      <span className="fin-barra-entrou" style={{ height: `${(m.entrou / maxSerie) * 100}%` }} />
                      <span className="fin-barra-saiu" style={{ height: `${(m.saiu / maxSerie) * 100}%` }} />
                    </div>
                    <small>{nomeMesCurto(m.mes)}</small>
                  </div>
                ))}
              </div>
              <div className="fin-legenda">
                <span><i className="fin-barra-entrou" /> Entrou</span>
                <span><i className="fin-barra-saiu" /> Saiu</span>
              </div>
            </section>

            <section className="crm-card fin-painel" aria-labelledby="fin-atencao">
              <h2 id="fin-atencao">
                {atrasados.length > 0 ? `${atrasados.length} cobrança${atrasados.length === 1 ? "" : "s"} atrasada${atrasados.length === 1 ? "" : "s"}` : "Nada atrasado"}
              </h2>
              <p className="fin-painel-sub">Cobranças enviadas aos clientes e o que está previsto.</p>
              <ul className="fin-lista">
                <li>
                  <span className="inline-flex items-center gap-2"><span className="ass-selo ass-tom-perigo"><AlertCircle className="size-3" aria-hidden="true" /> Atrasado</span></span>
                  <b>{formatBRL(somaPag(atrasados))}</b>
                </li>
                <li>
                  <span className="inline-flex items-center gap-2"><span className="ass-selo ass-tom-alerta"><Clock3 className="size-3" aria-hidden="true" /> A vencer</span></span>
                  <b>{formatBRL(somaPag(aVencer))}</b>
                </li>
                {(previstoEntrar > 0 || previstoSair > 0) && (
                  <li>
                    <span>Agendado nos próximos 30 dias</span>
                    <b>{formatBRL(previstoEntrar - previstoSair)}</b>
                  </li>
                )}
              </ul>
              {pagamentos.length === 0 && <p className="fin-vazio">Nenhuma cobrança enviada ainda.</p>}
              <Link href={atrasados.length ? "/pagamentos/lista?situacao=atrasado" : "/pagamentos/lista"} className="fin-link">
                {atrasados.length ? "Ver atrasadas" : "Ver cobranças"} <ArrowRight className="size-3" aria-hidden="true" />
              </Link>
            </section>
          </div>

          <section className="crm-card fin-painel" aria-labelledby="fin-gastos">
            <h2 id="fin-gastos">
              {gastos[0] ? `Onde mais saiu dinheiro ${intervalo.frase}: ${gastos[0].tipo}` : `Nenhuma despesa ${intervalo.frase}`}
            </h2>
            <p className="fin-painel-sub">As maiores categorias de despesa no período escolhido.</p>
            {gastos.length > 0 ? (
              <ul className="fin-lista">
                {gastos.map((g) => (
                  <li key={g.tipo}>
                    <span>{g.tipo}</span>
                    <b>{formatBRL(g.total)}</b>
                    <span className="fin-lista-barra" aria-hidden="true"><span style={{ width: `${(g.total / maxGasto) * 100}%` }} /></span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="fin-vazio">Quando houver despesas neste período, as maiores aparecem aqui.</p>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function capitalizar(t) {
  return t.charAt(0).toUpperCase() + t.slice(1);
}
