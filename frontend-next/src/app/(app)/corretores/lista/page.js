import { apiGet } from "@/lib/api-server";
import { PageHeader, Avatar, EmptyState, Table, Thead, Th, Row, Td } from "@/components/ui/page";
import { UsersRound, Phone, BadgeCheck } from "lucide-react";

export const metadata = { title: "Lista de Corretores" };

export default async function ListaCorretoresPage() {
  const data = await apiGet("/corretor?all=true");
  const corretores = Array.isArray(data) ? data : data?.data ?? [];

  return (
    <div className="p-6">
      <PageHeader
        title="Corretores"
        subtitle={`${corretores.length} corretor${corretores.length === 1 ? "" : "es"}`}
        actionHref="/corretores/adicionar"
        actionLabel="Adicionar corretor"
      />

      {corretores.length === 0 ? (
        <EmptyState icon={UsersRound} title="Nenhum corretor cadastrado" hint="Adicione o primeiro corretor da equipe." />
      ) : (
        <Table className="min-w-[720px]">
          <Thead>
            <Th>Corretor</Th>
            <Th>Usuário</Th>
            <Th>Contato</Th>
            <Th>CRECI</Th>
          </Thead>
          <tbody>
            {corretores.map((c) => (
              <Row key={c.id}>
                <Td>
                  <div className="flex items-center gap-3">
                    <Avatar name={`${c.first_name} ${c.last_name}`} />
                    <div className="min-w-0">
                      <p className="truncate font-medium text-cx-text">{c.first_name} {c.last_name}</p>
                      <p className="truncate text-xs text-cx-muted">{c.email || "sem e-mail"}</p>
                    </div>
                  </div>
                </Td>
                <Td muted>@{c.username}</Td>
                <Td muted>
                  {c.telefone ? (
                    <a href={`https://wa.me/55${(c.telefone || "").replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 hover:text-cx-text">
                      <Phone className="h-3.5 w-3.5" /> {c.telefone}
                    </a>
                  ) : "—"}
                </Td>
                <Td muted>
                  {c.creci ? (
                    <span className="inline-flex items-center gap-1.5"><BadgeCheck className="h-3.5 w-3.5 text-cx-muted" /> {c.creci}</span>
                  ) : "—"}
                </Td>
              </Row>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
