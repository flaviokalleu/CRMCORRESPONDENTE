import Link from "next/link";
import { PageHeader, EmptyState, Table, Thead, Th, Row, Td, formatBRL } from "@/components/ui/page";
import { TrendingUp, TrendingDown, X } from "@/components/icons";
import { LancamentoForm } from "@/components/financeiro/LancamentoForm";
import { ExcluirLancamento } from "@/components/financeiro/ExcluirLancamento";
import { PeriodoChips } from "@/components/financeiro/PeriodoChips";
import { intervaloDoPeriodo, periodoValido, noIntervalo, somar, porCategoria, formatarData, diaISO } from "@/lib/financeiro";

const CONF = {
  receita: {
    rota: "receitas", base: "/financeiro/receitas", titulo: "Receitas", Icone: TrendingUp, classeValor: "fin-valor-entrou",
    subtitulo: "Todo dinheiro que entrou: comissões, taxas, assessorias.",
    totalFrase: "Entrou", vazio: "Nenhuma receita lançada", vazioDica: "Lance a primeira entrada — por exemplo, a comissão de uma venda — e ela aparece aqui e no painel financeiro.",
  },
  despesa: {
    rota: "despesas", base: "/financeiro/despesas", titulo: "Despesas", Icone: TrendingDown, classeValor: "fin-valor-saiu",
    subtitulo: "Todo dinheiro que saiu: aluguel, contas, marketing, repasses.",
    totalFrase: "Saiu", vazio: "Nenhuma despesa lançada", vazioDica: "Lance o primeiro gasto — por exemplo, o aluguel do escritório — e ele aparece aqui e no painel financeiro.",
  },
};

// Tela de receitas/despesas: período rápido + total do filtro em destaque +
// lista com categoria em selo. O cadastro abre na própria tela.
export function LancamentosPagina({ tipo, itens, carregou, sp = {} }) {
  const c = CONF[tipo];
  const periodoId = periodoValido(sp.periodo, "tudo");
  const intervalo = intervaloDoPeriodo(periodoId);
  const categoria = sp.categoria || "";
  const categorias = porCategoria(itens).map((x) => x.tipo);

  const doPeriodo = itens.filter((i) => noIntervalo(i.data, intervalo));
  const filtrados = (categoria ? doPeriodo.filter((i) => (i.tipo || "").trim() === categoria) : doPeriodo)
    .slice()
    .sort((a, b) => diaISO(b.data).localeCompare(diaISO(a.data)) || b.id - a.id);
  const total = somar(filtrados);
  const maior = porCategoria(doPeriodo)[0];
  const extra = categoria ? { categoria } : {};

  return (
    <div className="mx-auto max-w-5xl p-6">
      <PageHeader title={c.titulo} subtitle={c.subtitulo} />

      <div className="fin-topo">
        <PeriodoChips base={c.base} atual={periodoId} extra={extra} />
        <LancamentoForm tipo={tipo} categorias={categorias} />
      </div>

      {!carregou ? (
        <EmptyState icon={c.Icone} title={`Não foi possível carregar as ${c.titulo.toLowerCase()}`} hint="Atualize a página em instantes." />
      ) : itens.length === 0 ? (
        <EmptyState icon={c.Icone} title={c.vazio} hint={c.vazioDica} />
      ) : (
        <>
          <div className="crm-card fin-total" role="status">
            <p>
              {c.totalFrase} {intervalo.frase}
              {categoria && <> em <b className="text-ink-heading">{categoria}</b></>}
              {" · "}{filtrados.length} lançamento{filtrados.length === 1 ? "" : "s"}
              {!categoria && maior && doPeriodo.length > 1 && <> · maior parte em <b className="text-ink-heading">{maior.tipo}</b></>}
            </p>
            <strong className={c.classeValor}>{formatBRL(total)}</strong>
          </div>

          {categoria && (
            <p className="mb-3 text-sm text-cx-muted">
              Mostrando só <span className="fin-selo">{categoria}</span>{" "}
              <Link href={`${c.base}?periodo=${periodoId}`} className="fin-acao" scroll={false}>
                <X className="size-3" aria-hidden="true" /> Ver todas as categorias
              </Link>
            </p>
          )}

          {filtrados.length === 0 ? (
            <EmptyState icon={c.Icone} title={`Nada lançado ${intervalo.frase}`} hint="Escolha outro período acima ou lance um valor novo." />
          ) : (
            <Table title={`${c.titulo} ${intervalo.frase}`}>
              <Thead>
                <Th>Data</Th>
                <Th>Categoria</Th>
                <Th>Descrição</Th>
                <Th right>Valor</Th>
                <Th right><span className="sr-only">Ações</span></Th>
              </Thead>
              <tbody>
                {filtrados.map((i) => (
                  <Row key={i.id}>
                    <Td muted className="tabular-nums whitespace-nowrap">{formatarData(i.data)}</Td>
                    <Td>
                      <Link href={`${c.base}?${new URLSearchParams({ periodo: periodoId, categoria: (i.tipo || "").trim() })}`} className="fin-selo" scroll={false} title="Filtrar por esta categoria">
                        {i.tipo || "Sem categoria"}
                      </Link>
                    </Td>
                    <Td muted>{i.descricao || "—"}</Td>
                    <Td right><span className={c.classeValor}>{formatBRL(i.valor)}</span></Td>
                    <Td right>
                      <ExcluirLancamento rota={c.rota} id={i.id} descricao={i.descricao || i.tipo || "lançamento"} />
                    </Td>
                  </Row>
                ))}
              </tbody>
            </Table>
          )}
        </>
      )}
    </div>
  );
}
