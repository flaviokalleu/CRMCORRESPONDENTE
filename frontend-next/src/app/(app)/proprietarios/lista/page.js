import { apiGet } from "@/lib/api-server";
import { ProprietarioAddForm } from "@/components/ProprietarioAddForm";
import { PageHeader, Avatar, EmptyState, Table, Thead, Th, Row, Td } from "@/components/ui/page";
import { UserSquare, MapPin } from "@/components/icons";
import { ContatoRapido } from "@/components/ui/contato-rapido";

export const metadata = { title: "Proprietários" };

export default async function ListaProprietariosPage() {
  const data = await apiGet("/proprietarios");
  const proprietarios = Array.isArray(data) ? data : data?.data ?? [];

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Proprietários"
        subtitle={`${proprietarios.length} proprietário${proprietarios.length === 1 ? "" : "s"} · donos dos imóveis que você anuncia ou administra`}
      />

      <ProprietarioAddForm />

      <div>
        {!data ? (
          <EmptyState icon={UserSquare} title="Não foi possível carregar os proprietários" />
        ) : proprietarios.length === 0 ? (
          <EmptyState icon={UserSquare} title="Nenhum proprietário cadastrado" hint="Toque em “Novo proprietário” acima para cadastrar o primeiro." />
        ) : (
          <Table title="Lista de proprietários" className="min-w-[640px]">
            <Thead>
              <Th>Proprietário</Th>
              <Th>Falar com</Th>
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
                  <Td>
                    <ContatoRapido telefone={p.phone} nome={p.name} />
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
