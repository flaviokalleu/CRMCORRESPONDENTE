import Link from "next/link";
import { apiGet } from "@/lib/api-server";
import ImovelCard from "@/components/public/ImovelCard";

// Vitrine pública de imóveis ("/imoveis", era "/imoveis-publicos" na SPA).
// Server Component — busca a lista completa direto no backend Go.
// Referência de lógica: frontend/src/pages/PublicImoveisPage.jsx (sem os
// filtros/paginação client-side por ora — lista simples, sem estilo elaborado).
export const metadata = {
  title: "Imóveis",
  description: "Explore nossa seleção completa de imóveis em Valparaíso de Goiás e região.",
};

export default async function ImoveisPublicosPage() {
  const data = await apiGet("/public/imoveis");
  const imoveis = Array.isArray(data) ? data : data?.data || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-6 flex items-center justify-between">
          <div>
            <Link href="/" className="text-sm text-caixa-primary hover:underline">
              &larr; Voltar
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 mt-1">Nossos Imóveis</h1>
          </div>
          <span className="text-sm text-gray-500">
            {imoveis.length} imóvel{imoveis.length !== 1 ? "eis" : ""} encontrado
            {imoveis.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {imoveis.length === 0 ? (
          <p className="text-center text-gray-500 py-12">Nenhum imóvel disponível no momento.</p>
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
