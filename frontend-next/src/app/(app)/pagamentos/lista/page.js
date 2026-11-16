import Link from "next/link";
import { apiGet } from "@/lib/api-server";
import { PagamentoRowActions } from "@/components/PagamentoRowActions";
import { PageHeader, EmptyState, Table, Thead, Th, Row, Td, formatBRL } from "@/components/ui/page";
import { Receipt, AlertCircle, Clock3, CheckCircle2 } from "@/components/icons";
import { hojeISO, situacaoPagamento, valorPagamento, formatarData, diaISO } from "@/lib/financeiro";

export const metadata = { title: "Pagamentos" };

const FILTROS = [
  { id: "", label: "Todas" },
  { id: "atrasado", label: "Atrasadas" },
  { id: "avencer", label: "A vencer" },
  { id: "pago", label: "Pagas" },
];

// Semáforo: atrasado (vermelho) primeiro, depois a vencer (amarelo) por
// vencimento mais próximo, depois pago/cancelado.
const ORDEM = { atrasado: 0, avencer: 1, pago: 2, cancelado: 3 };

export default async function ListaPagamentosPage({ searchParams }) {
  const [data, clientesR, sp] = await Promise.all([
    apiGet("/pagamentos?limit=100"),
    apiGet("/clientes?limit=500"),
    searchParams,
  ]);
  const hoje = hojeISO();
  const filtro = FILTROS.some((f) => f.id === sp?.situacao) ? sp.situacao : "";
  const clientes = new Map((clientesR?.clientes ?? []).map((c) => [c.id, c]));

  const todos = (data?.pagamentos ?? [])
    .map((p) => ({ p, s: situacaoPagamento(p, hoje), valor: valorPagamento(p) }))
    .sort((a, b) => ORDEM[a.s.id] - ORDEM[b.s.id] || diaISO(a.p.data_vencimento).localeCompare(diaISO(b.p.data_vencimento)));
  const grupo = (id) => todos.filter((x) => x.s.id === id);
  const soma = (lista) => lista.reduce((t, x) => t + x.valor, 0);
  const atrasados = grupo("atrasado");
  const aVencer = grupo("avencer");
  const pagos = grupo("pago");
  const lista = filtro ? grupo(filtro) : todos;

  const resumo = [
    { id: "atrasado", rotulo: "Atrasado", tom: "perigo", Icone: AlertCircle, itens: atrasados },
    { id: "avencer", rotulo: "A receber", tom: "alerta", Icone: Clock3, itens: aVencer },
    { id: "pago", rotulo: "Recebido", tom: "ok", Icone: CheckCircle2, itens: pagos },
  ];

  return (
    <div className="p-6">
      <PageHeader
        title="Pagamentos"
        subtitle="Links de pagamento (boleto, PIX ou cartão) enviados aos clientes."
        actionHref="/pagamentos/criar"
        actionLabel="Nova cobrança"
      />

      {!data ? (
        <EmptyState icon={Receipt} title="Não foi possível carregar as cobranças" hint="Atualize a página em instantes." />
      ) : todos.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="Nenhuma cobrança enviada ainda"
          hint="Use “Nova cobrança”, mande o link para o cliente pelo WhatsApp e acompanhe aqui quem já pagou e quem está atrasado."
        />
      ) : (
        <>
          <div className="fin-numeros">
            {resumo.map((r) => (
              <Link key={r.id} href={filtro === r.id ? "/pagamentos/lista" : `/pagamentos/lista?situacao=${r.id}`} className="crm-card fin-numero" data-tom={r.tom} aria-current={filtro === r.id ? "page" : undefined} scroll={false}>
                <span className="fin-numero-rotulo"><r.Icone className="size-4" aria-hidden="true" /> {r.rotulo}</span>
                <span className="fin-numero-valor">{formatBRL(soma(r.itens))}</span>
                <span className="fin-numero-nota">{r.itens.length} cobrança{r.itens.length === 1 ? "" : "s"}</span>
              </Link>
            ))}
          </div>

          <div className="fin-topo">
            <nav className="fin-periodos" aria-label="Filtrar por situação">
              {FILTROS.map((f) => (
                <Link key={f.id || "todas"} href={f.id ? `/pagamentos/lista?situacao=${f.id}` : "/pagamentos/lista"} className="fin-periodo" aria-current={f.id === filtro ? "page" : undefined} scroll={false}>
                  {f.label}
                </Link>
              ))}
            </nav>
          </div>

          {lista.length === 0 ? (
            <EmptyState icon={CheckCircle2} title={filtro === "atrasado" ? "Nenhuma cobrança atrasada" : "Nada por aqui"} hint="Escolha outro filtro acima." />
          ) : (
            <Table title="Cobranças">
              <Thead>
                <Th>Situação</Th>
                <Th>Cliente</Th>
                <Th>Cobrança</Th>
                <Th right>Valor</Th>
                <Th>Vencimento</Th>
                <Th right><span className="sr-only">Ações</span></Th>
              </Thead>
              <tbody>
                {lista.map(({ p, s, valor }) => {
                  const cliente = clientes.get(p.cliente_id);
                  return (
                    <Row key={p.id}>
                      <Td><span className={`ass-selo ass-tom-${s.tom}`}>{s.label}</span></Td>
                      <Td className="font-medium text-ink-heading">{cliente?.nome || "—"}</Td>
                      <Td>{p.titulo}</Td>
                      <Td right className="tabular-nums font-semibold whitespace-nowrap">{formatBRL(valor)}</Td>
                      <Td muted className="tabular-nums whitespace-nowrap">{formatarData(p.data_vencimento)}</Td>
                      <Td right><PagamentoRowActions pagamento={p} situacao={s} cliente={cliente} /></Td>
                    </Row>
                  );
                })}
              </tbody>
            </Table>
          )}
          {data.total > todos.length && (
            <p className="mt-3 text-sm text-cx-muted">Mostrando as {todos.length} cobranças mais recentes de {data.total}.</p>
          )}
        </>
      )}
    </div>
  );
}
