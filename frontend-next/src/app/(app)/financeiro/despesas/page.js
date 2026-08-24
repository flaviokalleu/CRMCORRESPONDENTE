import { apiGet } from "@/lib/api-server";
import { DespesaForm } from "@/components/DespesaForm";
import { PageHeader, EmptyState, Table, Thead, Th, Row, Td, formatBRL } from "@/components/ui/page";
import { TrendingDown } from "lucide-react";

export const metadata = { title: "Despesas" };

export default async function DespesasPage() {
  const despesas = (await apiGet("/despesas")) ?? [];

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <PageHeader title="Despesas" subtitle="Lance e acompanhe as saídas do fluxo de caixa." />

      <DespesaForm />

      {despesas.length === 0 ? (
        <EmptyState icon={TrendingDown} title="Nenhuma despesa cadastrada" hint="Registre a primeira saída acima." />
      ) : (
        <Table>
          <Thead>
            <Th>#</Th>
            <Th>Tipo</Th>
            <Th>Descrição</Th>
            <Th right>Valor</Th>
            <Th>Data</Th>
          </Thead>
          <tbody>
            {despesas.map((d) => (
              <Row key={d.id}>
                <Td muted className="tabular-nums">#{d.id}</Td>
                <Td>{d.tipo}</Td>
                <Td muted>{d.descricao || "—"}</Td>
                <Td right className="tabular-nums text-red-700">{formatBRL(d.valor)}</Td>
                <Td muted className="tabular-nums">{d.data ? new Date(d.data).toLocaleDateString("pt-BR") : "—"}</Td>
              </Row>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
