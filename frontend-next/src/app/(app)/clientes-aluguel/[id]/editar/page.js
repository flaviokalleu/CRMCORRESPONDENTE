import { notFound } from "next/navigation";
import { apiGet } from "@/lib/api-server";
import { PageHeader } from "@/components/ui/page";
import { InquilinoForm } from "@/components/aluguel/InquilinoForm";

export const metadata = { title: "Editar inquilino" };

export default async function EditarInquilinoPage({ params }) {
  const { id } = await params;
  const [inquilino, imoveis, proprietarios] = await Promise.all([
    apiGet(`/clientealuguel/${id}`),
    apiGet("/alugueis"),
    apiGet("/proprietarios"),
  ]);
  if (!inquilino?.id) notFound();
  return (
    <div className="p-6">
      <PageHeader title="Editar inquilino" subtitle={inquilino.nome} />
      <InquilinoForm
        mode="edit"
        inquilino={inquilino}
        imoveis={Array.isArray(imoveis) ? imoveis : []}
        proprietarios={Array.isArray(proprietarios) ? proprietarios : []}
      />
    </div>
  );
}
