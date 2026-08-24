import { apiGet } from "@/lib/api-server";
import { ReceitaForm } from "@/components/ReceitaForm";
import { PageHeader, EmptyState, Table, Thead, Th, Row, Td, formatBRL } from "@/components/ui/page";
import { TrendingUp } from "lucide-react";

export const metadata = { title: "Receitas" };

export default async function ReceitasPage() {
  const receitas = (await apiGet("/receitas")) ?? [];

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <PageHeader title="Receitas" subtitle="Lance e acompanhe as entradas do fluxo de caixa." />

      <ReceitaForm />

      {receitas.length === 0 ? (
        <EmptyState icon={TrendingUp} title="Nenhuma receita cadastrada" hint="Registre a primeira entrada acima." />
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
            {receitas.map((r) => (
              <Row key={r.id}>
                <Td muted className="tabular-nums">#{r.id}</Td>
                <Td>{r.tipo}</Td>
                <Td muted>{r.descricao || "—"}</Td>
                <Td right className="tabular-nums text-emerald-700">{formatBRL(r.valor)}</Td>
                <Td muted className="tabular-nums">{r.data ? new Date(r.data).toLocaleDateString("pt-BR") : "—"}</Td>
              </Row>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
