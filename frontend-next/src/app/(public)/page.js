import Link from "next/link";
import { apiGet } from "@/lib/api-server";
import ImovelCard from "@/components/public/ImovelCard";

// Landing page pública ("/"). Server Component — busca alguns imóveis em
// destaque no servidor (SSR real, sem loading spinner client-side).
// Referência de lógica: frontend/src/pages/LandingPage.jsx (fetch de
// `${VITE_API_URL}/imoveis?limit=6`).
export const metadata = {
  title: "CRM IMOB — Imóveis em Valparaíso de Goiás",
  description:
    "Encontre o imóvel dos seus sonhos em Valparaíso de Goiás. Casas, apartamentos e terrenos com atendimento personalizado e segurança jurídica.",
};

export default async function LandingPage() {
  const data = await apiGet("/public/imoveis?limit=6");
  const imoveis = Array.isArray(data) ? data : data?.data || [];

  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <span className="font-bold text-caixa-primary text-lg">CRM IMOB</span>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/imoveis" className="text-gray-700 hover:text-caixa-primary">
              Imóveis
            </Link>
            <Link href="/precos" className="text-gray-700 hover:text-caixa-primary">
              Preços
            </Link>
            <Link href="/login" className="text-gray-700 hover:text-caixa-primary">
              Entrar
            </Link>
          </nav>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-4 py-16 text-center">
        <h1 className="text-3xl sm:text-4xl font-bold text-caixa-primary mb-4">
          Gestão imobiliária completa, em um só lugar.
        </h1>
        <p className="text-gray-600 max-w-2xl mx-auto mb-8">
          Encontre o imóvel dos seus sonhos em Valparaíso de Goiás. Casas, apartamentos e terrenos
          com atendimento personalizado e segurança jurídica.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/imoveis"
            className="bg-caixa-orange text-white px-6 py-3 rounded-lg font-semibold hover:bg-caixa-orange-dark transition-colors"
          >
            Ver imóveis
          </Link>
          <Link
            href="/precos"
            className="border border-caixa-primary text-caixa-primary px-6 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
          >
            Ver planos
          </Link>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 pb-16">
        <h2 className="text-2xl font-bold text-caixa-primary mb-6">Imóveis em destaque</h2>

        {imoveis.length === 0 ? (
          <p className="text-gray-500">Nenhum imóvel disponível no momento.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {imoveis.slice(0, 6).map((imovel) => (
              <ImovelCard key={imovel.id} imovel={imovel} />
            ))}
          </div>
        )}
      </section>

      <footer className="border-t border-gray-200 bg-white py-8">
        <div className="max-w-6xl mx-auto px-4 text-sm text-gray-500 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>&copy; {new Date().getFullYear()} CRM IMOB. Todos os direitos reservados.</span>
          <a
            href="https://wa.me/556182511308"
            target="_blank"
            rel="noopener noreferrer"
            className="text-caixa-primary font-medium hover:underline"
          >
            Fale conosco no WhatsApp
          </a>
        </div>
      </footer>
    </div>
  );
}
