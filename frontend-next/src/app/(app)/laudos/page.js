import { apiGet } from "@/lib/api-server";
import { PageHeader, EmptyState, Table, Thead, Th, Row, Td, formatBRL } from "@/components/ui/page";
import { FileBarChart2 } from "@/components/icons";

export const metadata = { title: "Laudos" };

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("pt-BR");
}

// Semáforo com os tokens de status (crm-design.css › Shell e configurações).
const STATUS = {
  vencido: { label: "Vencido", tom: "status-perigo" },
  vencendo: { label: "Vence em breve", tom: "status-alerta" },
  vigente: { label: "Válido", tom: "status-ok" },
};

export default async function LaudosPage() {
  const data = await apiGet("/laudos");
  const laudos = Array.isArray(data) ? data : data?.data ?? [];

  return (
    <div className="p-6">
      <PageHeader title="Laudos" subtitle="Laudos de avaliação dos imóveis financiados: valor pedido, valor aprovado e validade." />

      {!data ? (
        <EmptyState icon={FileBarChart2} title="Não foi possível carregar os laudos" hint="Recarregue a página em alguns instantes." />
      ) : laudos.length === 0 ? (
        <EmptyState
          icon={FileBarChart2}
          title="Nenhum laudo por aqui ainda"
          hint="Quando o banco avaliar um imóvel, o laudo aparece aqui com o valor aprovado e a data de validade. A coluna Situação mostra quais estão perto de vencer."
        />
      ) : (
        <Table title="Lista de laudos" className="min-w-[900px]">
          <Thead>
            <Th>Parceiro</Th>
            <Th>Tipo</Th>
            <Th>Endereço</Th>
            <Th right>Valor pedido</Th>
            <Th right>Valor aprovado</Th>
            <Th>Válido até</Th>
            <Th>Situação</Th>
          </Thead>
          <tbody>
            {laudos.map((l) => {
              const st = STATUS[l.status] || { label: l.status || "—", tom: "" };
              return (
                <Row key={l.id}>
                  <Td className="font-medium text-cx-text">{l.parceiro}</Td>
                  <Td muted className="capitalize">{l.tipo_imovel}</Td>
                  <Td muted>{l.endereco}</Td>
                  <Td right className="tabular-nums">{formatBRL(l.valor_solicitado)}</Td>
                  <Td right className="tabular-nums">{formatBRL(l.valor_liberado)}</Td>
                  <Td muted className="tabular-nums">{formatDate(l.vencimento)}</Td>
                  <Td>
                    <span className={`status-selo ${st.tom}`}>{st.label}</span>
                  </Td>
                </Row>
              );
            })}
          </tbody>
        </Table>
      )}
    </div>
  );
}
