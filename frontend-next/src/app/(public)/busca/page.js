import Link from "next/link";
import { apiGet } from "@/lib/api-server";
import ImovelCard from "@/components/public/ImovelCard";

// Busca de imóveis ("/busca?busca=termo"). Server Component — o termo vem
// via query string (GET), então dá para buscar direto no servidor sem
// precisar de "use client"/fetch client-side (mais simples e melhor p/ SEO).
// Referência de lógica: frontend/src/components/Busca.jsx
// (`GET ${VITE_API_URL}/imoveis/busca?busca=...`).
export const metadata = {
  title: "Buscar imóveis",
};

export default async function BuscaPage({ searchParams }) {
  const { busca = "" } = await searchParams;
  const termo = String(busca || "").trim();

  let imoveis = [];
  if (termo) {
    const data = await apiGet(`/imoveis/busca?busca=${encodeURIComponent(termo)}`);
    imoveis = Array.isArray(data) ? data : data?.data || [];
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <Link href="/" className="text-sm text-caixa-primary hover:underline">
            &larr; Voltar
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-1 mb-4">Resultados da Busca</h1>

          <form action="/busca" method="GET" className="flex gap-2 max-w-lg">
            <input
              type="text"
              name="busca"
              defaultValue={termo}
              placeholder="Buscar por nome ou localização..."
              className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-caixa-primary focus:border-caixa-primary"
            />
            <button
              type="submit"
              className="bg-caixa-primary text-white px-5 py-2 rounded-lg font-semibold hover:opacity-90"
            >
              Buscar
            </button>
          </form>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {!termo ? (
          <p className="text-center text-gray-500 py-12">Digite um termo para buscar imóveis.</p>
        ) : imoveis.length === 0 ? (
          <p className="text-center text-gray-500 py-12">
            Nenhum resultado encontrado para &quot;{termo}&quot;.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {imoveis.map((imovel) => (
              <ImovelCard key={imovel.id} imovel={imovel} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
