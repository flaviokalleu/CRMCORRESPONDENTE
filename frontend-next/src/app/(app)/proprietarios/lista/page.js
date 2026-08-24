import { apiGet } from "@/lib/api-server";
import { ProprietarioAddForm } from "@/components/ProprietarioAddForm";
import { PageHeader, Avatar, EmptyState, Table, Thead, Th, Row, Td } from "@/components/ui/page";
import { UserSquare, Phone, MapPin } from "lucide-react";

export const metadata = { title: "Proprietários" };

export default async function ListaProprietariosPage() {
  const data = await apiGet("/proprietarios");
  const proprietarios = Array.isArray(data) ? data : data?.data ?? [];

  return (
    <div className="space-y-6 p-6">
      <PageHeader title="Proprietários" subtitle="Cadastre e gerencie os proprietários vinculados aos imóveis." />

      <ProprietarioAddForm />

      <div>
        <h2 className="mb-3 text-sm font-semibold text-cx-muted">Lista de proprietários</h2>
        {!data ? (
          <EmptyState icon={UserSquare} title="Não foi possível carregar os proprietários" />
        ) : proprietarios.length === 0 ? (
          <EmptyState icon={UserSquare} title="Nenhum proprietário cadastrado" hint="Adicione o primeiro proprietário acima." />
        ) : (
          <Table className="min-w-[640px]">
            <Thead>
              <Th>Proprietário</Th>
              <Th>Telefone</Th>
              <Th>Endereço</Th>
            </Thead>
            <tbody>
              {proprietarios.map((p) => (
                <Row key={p.id}>
                  <Td>
                    <div className="flex items-center gap-3">
                      <Avatar name={p.name} />
                      <span className="font-medium text-cx-text">{p.name}</span>
                    </div>
                  </Td>
                  <Td muted>
                    {p.phone ? (
                      <a href={`https://wa.me/55${(p.phone || "").replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 hover:text-cx-text">
                        <Phone className="h-3.5 w-3.5" /> {p.phone}
                      </a>
                    ) : "—"}
                  </Td>
                  <Td muted>
                    {p.address ? (
                      <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-cx-muted" /> {p.address}</span>
                    ) : "—"}
                  </Td>
                </Row>
              ))}
            </tbody>
          </Table>
        )}
      </div>
    </div>
  );
}
