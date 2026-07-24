import { apiGet } from "@/lib/api-server";
import { PageHeader, Avatar, EmptyState, Table, Thead, Th, Row, Td } from "@/components/ui/page";
import { UsersRound, Phone, MapPin } from "lucide-react";

export const metadata = { title: "Lista de Correspondentes" };

export default async function ListaCorrespondentesPage() {
  const data = await apiGet("/correspondente/lista");
  const correspondentes = Array.isArray(data) ? data : data?.data ?? [];

  return (
    <div className="p-6">
      <PageHeader
        title="Correspondentes"
        subtitle={`${correspondentes.length} correspondente${correspondentes.length === 1 ? "" : "s"}`}
        actionHref="/correspondentes/adicionar"
        actionLabel="Adicionar correspondente"
      />

      {correspondentes.length === 0 ? (
        <EmptyState icon={UsersRound} title="Nenhum correspondente cadastrado" hint="Adicione o primeiro correspondente." />
      ) : (
        <Table className="min-w-[720px]">
          <Thead>
            <Th>Correspondente</Th>
            <Th>Usuário</Th>
            <Th>Contato</Th>
            <Th>Endereço</Th>
          </Thead>
          <tbody>
            {correspondentes.map((c) => (
              <Row key={c.id}>
                <Td>
                  <div className="flex items-center gap-3">
                    <Avatar name={`${c.first_name} ${c.last_name}`} />
                    <div className="min-w-0">
                      <p className="truncate font-medium text-white">{c.first_name} {c.last_name}</p>
                      <p className="truncate text-xs text-white/40">{c.email || "sem e-mail"}</p>
                    </div>
                  </div>
                </Td>
                <Td muted>@{c.username}</Td>
                <Td muted>
                  {c.telefone ? (
                    <a href={`https://wa.me/55${(c.telefone || "").replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 hover:text-white">
                      <Phone className="h-3.5 w-3.5" /> {c.telefone}
                    </a>
                  ) : "—"}
                </Td>
                <Td muted>
                  {c.address ? (
                    <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-white/35" /> {c.address}</span>
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
