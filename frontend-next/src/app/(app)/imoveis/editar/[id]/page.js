import { notFound } from "next/navigation";
import { apiGet } from "@/lib/api-server";
import { ImovelForm } from "@/components/ImovelForm";

export const metadata = { title: "Editar Imóvel" };

// Server Component: busca o imóvel e entrega ao form em modo edição (PUT
// multipart /imoveis/:id).
export default async function EditarImovelPage({ params }) {
  const { id } = await params;
  const imovel = await apiGet(`/imoveis/${id}`);

  if (!imovel || !imovel.id) {
    notFound();
  }

  return (
    <div className="p-6">
      <h1 className="mb-1 text-xl font-semibold text-white">Editar Imóvel</h1>
      <p className="mb-6 text-sm text-white/50">Atualize os dados e adicione novas imagens se necessário.</p>
      <ImovelForm mode="edit" imovelId={id} initial={imovel} />
    </div>
  );
}
