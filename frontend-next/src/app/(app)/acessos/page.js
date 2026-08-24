import { apiGet } from "@/lib/api-server";
import { PageHeader, Table, Thead, Th, Row, Td } from "@/components/ui/page";

export const metadata = { title: "Acessos" };

function Stat({ label, value }) {
  return (
    <div className="rounded-2xl border border-cx-border bg-cx-surface p-4">
      <p className="text-2xl font-semibold tabular-nums text-cx-text">{value}</p>
      <p className="mt-1 text-xs text-cx-muted">{label}</p>
    </div>
  );
}

export default async function AcessosPage() {
  const data = await apiGet("/acessos");
  const acessos = data?.acessos || (Array.isArray(data) ? data : []);
  const stats = await apiGet("/acessos/stats");

  return (
    <div className="space-y-6 p-6">
      <PageHeader title="Monitor de Acessos" subtitle="Acompanhe os acessos ao sistema." />

      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Total de acessos" value={stats.totalAcessos ?? 0} />
          <Stat label="Corretores" value={stats.acessosPorRole?.corretor ?? 0} />
          <Stat label="Correspondentes" value={stats.acessosPorRole?.correspondente ?? 0} />
          <Stat label="Visitantes" value={stats.acessosPorRole?.anonimo ?? 0} />
        </div>
      )}

      <Table className="min-w-[720px]">
        <Thead>
          <Th>Usuário</Th>
          <Th>IP</Th>
          <Th>Dispositivo</Th>
          <Th>Página</Th>
          <Th>Data/Hora</Th>
        </Thead>
        <tbody>
          {acessos.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-4 py-10 text-center text-sm text-cx-muted">Nenhum acesso encontrado.</td>
            </tr>
          ) : (
            acessos.map((a) => (
              <Row key={a.id}>
                <Td className="text-cx-text">
                  {a.user ? `${a.user.first_name || ""} ${a.user.last_name || ""}`.trim() : a.user_id ? `Usuário #${a.user_id}` : "Anônimo"}
                </Td>
                <Td muted className="tabular-nums">{a.ip}</Td>
                <Td muted>{a.deviceType || "Desconhecido"}</Td>
                <Td muted>{a.page || "N/D"}</Td>
                <Td muted className="tabular-nums">{a.timestamp ? new Date(a.timestamp).toLocaleString("pt-BR") : ""}</Td>
              </Row>
            ))
          )}
        </tbody>
      </Table>
    </div>
  );
}
