import { apiGet } from "@/lib/api-server";
import { PageHeader, EmptyState, Table, Thead, Th, Row, Td, formatBRL } from "@/components/ui/page";
import { FileBarChart2 } from "lucide-react";

export const metadata = { title: "Laudos" };

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("pt-BR");
}

const STATUS = {
  vencido: { label: "Vencido", dot: "#f87171" },
  vencendo: { label: "Vencendo", dot: "#fbbf24" },
  vigente: { label: "Vigente", dot: "#34d399" },
};

export default async function LaudosPage() {
  const data = await apiGet("/laudos");
  const laudos = Array.isArray(data) ? data : data?.data ?? [];

  return (
    <div className="p-6">
      <PageHeader title="Laudos" subtitle="Gestão de laudos de avaliação imobiliária." />

      {!data ? (
        <EmptyState icon={FileBarChart2} title="Não foi possível carregar os laudos" />
      ) : laudos.length === 0 ? (
        <EmptyState icon={FileBarChart2} title="Nenhum laudo encontrado" />
      ) : (
        <Table className="min-w-[900px]">
          <Thead>
            <Th>Parceiro</Th>
            <Th>Tipo</Th>
            <Th>Endereço</Th>
            <Th right>Solicitado</Th>
            <Th right>Liberado</Th>
            <Th>Vencimento</Th>
            <Th>Status</Th>
          </Thead>
          <tbody>
            {laudos.map((l) => {
              const st = STATUS[l.status] || { label: l.status || "—", dot: "#94a3b8" };
              return (
                <Row key={l.id}>
                  <Td className="font-medium text-white">{l.parceiro}</Td>
                  <Td muted className="capitalize">{l.tipo_imovel}</Td>
                  <Td muted>{l.endereco}</Td>
                  <Td right className="tabular-nums">{formatBRL(l.valor_solicitado)}</Td>
                  <Td right className="tabular-nums">{formatBRL(l.valor_liberado)}</Td>
                  <Td muted className="tabular-nums">{formatDate(l.vencimento)}</Td>
                  <Td>
                    <span className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-[11px] font-medium text-white/70">
                      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: st.dot }} />
                      {st.label}
                    </span>
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
