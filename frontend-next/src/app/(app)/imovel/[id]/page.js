import { notFound } from "next/navigation";
import { apiGet } from "@/lib/api-server";
import { ImovelDetalhe } from "@/components/ImovelDetalhe";

export const metadata = { title: "Detalhe do Imóvel" };

// Server Component: busca o imóvel no Go e entrega ao Client Component, que
// cuida da galeria e das ações (editar/excluir).
export default async function ImovelDetalhePage({ params }) {
  const { id } = await params;
  const imovel = await apiGet(`/imoveis/${id}`);

  if (!imovel || !imovel.id) {
    notFound();
  }

  return <ImovelDetalhe imovel={imovel} />;
}
