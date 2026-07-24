import { apiGet } from "@/lib/api-server";
import { AluguelRowActions } from "@/components/aluguel/AluguelRowActions";
import { PageHeader, EmptyState, Table, Thead, Th, Row, Td, formatBRL } from "@/components/ui/page";
import { KeyRound } from "lucide-react";

export const metadata = { title: "Aluguéis" };

export default async function AlugueisPage() {
  const alugueis = (await apiGet("/alugueis")) || [];
  const disponiveis = alugueis.filter((a) => !a.alugado).length;
  const ocupados = alugueis.filter((a) => a.alugado).length;

  return (
    <div className="p-6">
      <PageHeader
        title="Aluguéis"
        subtitle={`${disponiveis} disponíveis · ${ocupados} alugados · ${alugueis.length} total`}
        actionHref="/alugueis/adicionar"
        actionLabel="Adicionar imóvel"
      />

      {alugueis.length === 0 ? (
        <EmptyState icon={KeyRound} title="Nenhum imóvel para aluguel" hint="Cadastre o primeiro imóvel de locação." />
      ) : (
        <Table className="min-w-[880px]">
          <Thead>
            <Th>Imóvel</Th>
            <Th>Descrição</Th>
            <Th>Quartos</Th>
            <Th>Banheiros</Th>
            <Th right>Valor</Th>
            <Th>Vencimento</Th>
            <Th>Status</Th>
            <Th right>Ações</Th>
          </Thead>
          <tbody>
            {alugueis.map((a) => (
              <Row key={a.id}>
                <Td className="font-medium text-white">{a.nome_imovel || "—"}</Td>
                <Td muted className="max-w-xs truncate" title={a.descricao}>{a.descricao || "—"}</Td>
                <Td muted>{a.quartos ?? "—"}</Td>
                <Td muted>{a.banheiro ?? "—"}</Td>
                <Td right className="tabular-nums">{formatBRL(a.valor_aluguel)}</Td>
                <Td muted className="tabular-nums">{a.dia_vencimento ? `dia ${a.dia_vencimento}` : "—"}</Td>
                <Td>
                  <span className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-[11px] font-medium text-white/70">
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: a.alugado ? "#fbbf24" : "#34d399" }} />
                    {a.alugado ? "Alugado" : "Disponível"}
                  </span>
                </Td>
                <Td right><AluguelRowActions aluguel={a} /></Td>
              </Row>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
