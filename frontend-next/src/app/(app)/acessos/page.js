import Link from "next/link";
import { apiGet } from "@/lib/api-server";
import { PageHeader, EmptyState, Table, Thead, Th, Row, Td } from "@/components/ui/page";
import { Activity, Plus } from "@/components/icons";

export const metadata = { title: "Acessos" };

const APARELHO = { mobile: "Celular", tablet: "Tablet", desktop: "Computador" };

function quem(a) {
  if (a.user) return `${a.user.first_name || ""} ${a.user.last_name || ""}`.trim() || a.user.email || "Usuário";
  return a.user_id ? `Usuário #${a.user_id}` : "Visitante (sem login)";
}

function quando(ts) {
  if (!ts) return "—";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default async function AcessosPage() {
  const [data, stats] = await Promise.all([apiGet("/acessos"), apiGet("/acessos/stats")]);
  const acessos = data?.acessos || (Array.isArray(data) ? data : []);
  const total24h = stats?.resumo?.totalAcessos ?? 0;

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Acessos"
        subtitle={
          total24h > 0
            ? `Quem entrou no sistema e de onde. ${total24h.toLocaleString("pt-BR")} ${total24h === 1 ? "acesso" : "acessos"} nas últimas 24 horas.`
            : "Quem entrou no sistema, quando e de qual aparelho."
        }
      />

      {!data ? (
        <EmptyState icon={Activity} title="Não foi possível carregar os acessos" hint="Recarregue a página em alguns instantes." />
      ) : acessos.length === 0 ? (
        <EmptyState
          icon={Activity}
          title="Ainda não há acessos registrados"
          hint="Quando você e sua equipe usarem o sistema, cada entrada aparece aqui: quem foi, quando e se foi pelo celular ou computador. Comece cadastrando um corretor da sua equipe."
        >
          <Link href="/corretores/adicionar" className="cx-btn cx-btn-primary">
            <Plus className="h-4 w-4" aria-hidden="true" /> Cadastrar corretor
          </Link>
        </EmptyState>
      ) : (
        <Table title="Últimos acessos" className="min-w-[560px]">
          <Thead>
            <Th>Quem</Th>
            <Th>Quando</Th>
            <Th>Celular ou computador</Th>
          </Thead>
          <tbody>
            {acessos.map((a) => (
              <Row key={a.id}>
                <Td className="font-medium text-cx-text">{quem(a)}</Td>
                <Td muted className="tabular-nums">{quando(a.timestamp)}</Td>
                <Td muted>
                  <span className="block">{APARELHO[a.device_type] || "Não identificado"}</span>
                  {a.ip && <span className="form-dica block tabular-nums">IP {a.ip}</span>}
                </Td>
              </Row>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
