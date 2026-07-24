import { apiGet } from "@/lib/api-server";
import { ImoveisLista } from "@/components/ImoveisLista";

export const metadata = { title: "Imóveis" };

// Server Component: busca os imóveis no Go (SSR) e entrega ao Client Component,
// que cuida da busca e dos filtros (tipo/situação) localmente.
export default async function ListaImoveisPage() {
  const data = await apiGet("/imoveis");
  const imoveis = Array.isArray(data) ? data : data?.imoveis ?? data?.data ?? [];

  return (
    <div className="p-6">
      <ImoveisLista initialData={imoveis} />
    </div>
  );
}
