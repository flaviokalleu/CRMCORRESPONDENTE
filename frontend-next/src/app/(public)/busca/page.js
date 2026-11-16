import Link from "next/link";
import { apiGet } from "@/lib/api-server";
import { ArrowLeft, MessageCircle, Search, SearchX } from "@/components/icons";
import { ImovelCardPublico } from "@/components/public/ImovelCardPublico";
import { opcoesDeFiltro } from "@/lib/imovel-filtros";
import { linkWhatsAppPublico } from "@/lib/contato-publico";
import { whatsappPublico } from "@/lib/contato-publico-server";

// Busca de imóveis ("/busca?busca=termo"). Server Component — o termo vem
// via query string (GET), então dá para buscar direto no servidor.
//
// Mesmo cartão da vitrine (/imoveis), para a pessoa reconhecer o que vê.
// Sem termo ou sem resultado, a tela não fica em branco: sugere atalhos
// (tipos e cidades que existem na carteira) e o WhatsApp.
export const metadata = {
  title: "Buscar imóveis",
};

export default async function BuscaPage({ searchParams }) {
  // Número do WhatsApp cadastrado em "Minha empresa" da imobiliária da vitrine.
  const numeroWhats = await whatsappPublico();
  const linkWhats = (texto) => linkWhatsAppPublico(texto, numeroWhats);
  const { busca = "" } = await searchParams;
  const termo = String(busca || "").trim();

  let imoveis = [];
  if (termo) {
    const data = await apiGet(`/public/imoveis/busca?busca=${encodeURIComponent(termo)}`);
    imoveis = Array.isArray(data) ? data : data?.data || [];
  }

  let sugestoes = { tipos: [], cidades: [] };
  if (imoveis.length === 0) {
    const todos = await apiGet("/public/imoveis");
    sugestoes = opcoesDeFiltro(Array.isArray(todos) ? todos : todos?.data || []);
  }

  return (
    <div className="min-h-screen bg-cx-bg text-cx-text">
      <header className="border-b border-cx-border bg-white">
        <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6">
          <Link href="/imoveis" className="inline-flex min-h-10 items-center gap-1.5 text-sm text-cx-muted hover:text-cx-text">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Ver todos os imóveis
          </Link>
          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
            {termo ? `Resultados para “${termo}”` : "Buscar imóveis"}
          </h1>
          {termo && (
            <p className="mt-1 text-sm text-cx-muted">
              {imoveis.length} {imoveis.length === 1 ? "imóvel encontrado" : "imóveis encontrados"}.
            </p>
          )}

          <form action="/busca" method="GET" role="search" className="mt-4 flex max-w-xl gap-2">
            <label className="lst-busca">
              <Search aria-hidden="true" />
              <input
                type="search"
                name="busca"
                defaultValue={termo}
                placeholder="Bairro, rua ou nome do imóvel"
                aria-label="Buscar imóveis"
                autoFocus={!termo}
                className="cx-input"
              />
            </label>
            <button type="submit" className="lst-botao lst-botao-principal">
              Buscar
            </button>
          </form>
        </div>
      </header>

      <main id="conteudo" className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {imoveis.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {imoveis.map((imovel) => (
              <ImovelCardPublico key={imovel.id} imovel={imovel} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-cx-border bg-white px-6 py-12 text-center">
            <SearchX className="mx-auto h-8 w-8 text-cx-muted" aria-hidden="true" />
            <p className="mt-3 font-semibold">
              {termo ? `Nada encontrado para “${termo}”` : "Digite um bairro, rua ou o nome do imóvel"}
            </p>
            <p className="mx-auto mt-1 max-w-md text-sm text-cx-muted">
              {termo ? "Tente uma palavra mais curta ou escolha um atalho:" : "Ou comece por um destes atalhos:"}
            </p>

            {(sugestoes.tipos.length > 0 || sugestoes.cidades.length > 0) && (
              <nav aria-label="Atalhos" className="mt-4 flex flex-wrap justify-center gap-2">
                {sugestoes.tipos.map((t) => (
                  <Link key={t} href={`/imoveis?tipo=${encodeURIComponent(t)}`} className="lst-filtro">
                    {t}
                  </Link>
                ))}
                {sugestoes.cidades.map((c) => (
                  <Link key={c} href={`/imoveis?cidade=${encodeURIComponent(c)}`} className="lst-filtro">
                    {c}
                  </Link>
                ))}
              </nav>
            )}

            <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
              <a
                href={linkWhats(
                  termo
                    ? `Olá! Procurei por "${termo}" no site e não achei. Podem me ajudar?`
                    : "Olá! Estou procurando um imóvel. Podem me ajudar?"
                )}
                target="_blank"
                rel="noreferrer"
                className="lst-cta-whats"
              >
                <MessageCircle aria-hidden="true" /> Pedir ajuda no WhatsApp
              </a>
              <Link href="/imoveis" className="lst-botao">
                Ver todos os imóveis
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
