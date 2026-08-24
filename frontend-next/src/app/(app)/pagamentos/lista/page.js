import { apiGet } from "@/lib/api-server";
import { PagamentoRowActions } from "@/components/PagamentoRowActions";
import { PageHeader, EmptyState, Table, Thead, Th, Row, Td, formatBRL } from "@/components/ui/page";
import { Receipt } from "lucide-react";

export const metadata = { title: "Pagamentos" };

// Tom semântico do status do pagamento (Asaas).
function statusDot(status) {
  const s = (status || "").toLowerCase();
  if (/receb|confirm|pago/.test(s)) return "#34d399";
  if (/vencid|overdue|atras/.test(s)) return "#f87171";
  if (/pend|aguard/.test(s)) return "#fbbf24";
  return "#94a3b8";
}

export default async function ListaPagamentosPage() {
  const data = await apiGet("/pagamentos");
  const pagamentos = data?.pagamentos ?? [];

  return (
    <div className="p-6">
      <PageHeader
        title="Pagamentos"
        subtitle="Cobranças avulsas via Asaas (boleto, PIX, universal)"
        actionHref="/pagamentos/criar"
        actionLabel="Criar pagamento"
      />

      {!data ? (
        <EmptyState icon={Receipt} title="Não foi possível carregar os pagamentos" />
      ) : pagamentos.length === 0 ? (
        <EmptyState icon={Receipt} title="Nenhum pagamento cadastrado" hint="Crie a primeira cobrança avulsa." />
      ) : (
        <Table className="min-w-[820px]">
          <Thead>
            <Th>#</Th>
            <Th>Título</Th>
            <Th>Tipo</Th>
            <Th right>Valor</Th>
            <Th>Status</Th>
            <Th>Vencimento</Th>
            <Th right>Ações</Th>
          </Thead>
          <tbody>
            {pagamentos.map((p) => (
              <Row key={p.id}>
                <Td muted className="tabular-nums">#{p.id}</Td>
                <Td className="font-medium text-cx-text">{p.titulo}</Td>
                <Td muted className="text-xs uppercase">{p.tipo}</Td>
                <Td right className="tabular-nums">{formatBRL(p.valor)}</Td>
                <Td>
                  <span className="inline-flex items-center gap-1.5 rounded-md border border-cx-border bg-cx-surface px-2 py-1 text-[11px] font-medium text-cx-muted">
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: statusDot(p.status) }} />
                    {p.status}
                  </span>
                </Td>
                <Td muted className="tabular-nums">
                  {p.data_vencimento ? new Date(p.data_vencimento).toLocaleDateString("pt-BR") : "—"}
                </Td>
                <Td right>
                  <PagamentoRowActions pagamento={p} />
                </Td>
              </Row>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
