import { apiGet } from "@/lib/api-server";
import { PageHeader, Avatar, EmptyState, Table, Thead, Th, Row, Td, formatBRL } from "@/components/ui/page";
import { KeyRound } from "lucide-react";

export const metadata = { title: "Clientes Aluguel" };

export default async function ClientesAluguelPage() {
  const data = await apiGet("/clientealuguel");
  const clientes = Array.isArray(data) ? data : [];

  const hoje = new Date();
  const emAtraso = (c) => {
    const dia = parseInt(c.dia_vencimento, 10);
    return !Number.isNaN(dia) && hoje.getDate() > dia;
  };

  return (
    <div className="p-6">
      <PageHeader title="Clientes Aluguel" subtitle={`${clientes.length} inquilino${clientes.length === 1 ? "" : "s"}`} />

      {clientes.length === 0 ? (
        <EmptyState icon={KeyRound} title="Nenhum inquilino cadastrado" hint="Os clientes de aluguel aparecerão aqui." />
      ) : (
        <Table className="min-w-[820px]">
          <Thead>
            <Th>Inquilino</Th>
            <Th>Contato</Th>
            <Th>CPF</Th>
            <Th right>Aluguel</Th>
            <Th>Vencimento</Th>
            <Th>Situação</Th>
          </Thead>
          <tbody>
            {clientes.map((c) => {
              const atraso = emAtraso(c);
              return (
                <Row key={c.id}>
                  <Td>
                    <div className="flex items-center gap-3">
                      <Avatar name={c.nome} />
                      <div className="min-w-0">
                        <p className="truncate font-medium text-white">{c.nome}</p>
                        <p className="truncate text-xs text-white/40">{c.email || "sem e-mail"}</p>
                      </div>
                    </div>
                  </Td>
                  <Td muted>{c.telefone || "—"}</Td>
                  <Td muted className="tabular-nums">{c.cpf || "—"}</Td>
                  <Td right className="tabular-nums">{formatBRL(c.valor_aluguel)}</Td>
                  <Td muted className="tabular-nums">{c.dia_vencimento ? `dia ${c.dia_vencimento}` : "—"}</Td>
                  <Td>
                    <span className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-[11px] font-medium text-white/70">
                      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: atraso ? "#f87171" : "#34d399" }} />
                      {atraso ? "Em atraso" : "Em dia"}
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
