import Link from "next/link";
import { ArrowLeft, MessageCircle, SearchX } from "lucide-react";
import { apiGet } from "@/lib/api-server";
import { ImovelCardPublico } from "@/components/public/ImovelCardPublico";
import { WhatsAppFlutuante } from "@/components/public/WhatsAppFlutuante";
import { AvisoValorVaria } from "@/components/public/AvisoValorVaria";
import { filtrarImoveis, filtrosAtivos, opcoesDeFiltro } from "@/lib/imovel-filtros";
import { JsonLd } from "@/components/public/JsonLd";
import { jsonLdBreadcrumb } from "@/lib/seo";

export const metadata = {
  title: "Imóveis à venda em Valparaíso de Goiás e região",
  description:
    "Casas, apartamentos e terrenos em Valparaíso de Goiás, Cidade Ocidental, Jardim Ingá e Luziânia — com o valor da parcela já calculado.",
  alternates: { canonical: "/imoveis" },
};

// Vitrine pública COM filtros.
//
// Antes esta página ignorava qualquer parâmetro e listava tudo: a busca do
// topo da landing levava a um beco sem saída. Agora ela honra cidade, tipo,
// teto de preço e quartos, mostra o que está filtrado e deixa remover um a um.
export default async function ImoveisPublicosPage({ searchParams }) {
  const sp = await searchParams;
  const filtros = {
    finalidade: sp?.finalidade || "venda",
    cidade: sp?.cidade || "",
    tipo: sp?.tipo || "",
    ate: sp?.ate || "",
    quartos: sp?.quartos || "",
  };

  const data = await apiGet("/public/imoveis");
  const todos = Array.isArray(data) ? data : data?.data || [];
  const { tipos, cidades } = opcoesDeFiltro(todos);

  // A carteira pública é só de VENDA — locação vive noutro módulo e ainda não
  // é exposta publicamente. Em vez de devolver resultados de venda para quem
  // pediu aluguel (o que seria enganoso), a página assume a lacuna.
  const buscandoAluguel = filtros.finalidade === "aluguel";
  const resultados = buscandoAluguel ? [] : filtrarImoveis(todos, filtros);
  const ativos = filtrosAtivos(filtros);

  const semFiltro = (chave) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(filtros)) {
      if (k !== chave && v && !(k === "finalidade" && v === "venda")) p.set(k, v);
    }
    const qs = p.toString();
    return qs ? `/imoveis?${qs}` : "/imoveis";
  };

  return (
    <div className="min-h-screen bg-cx-bg text-cx-text">
      <JsonLd
        data={jsonLdBreadcrumb([
          { nome: "Início", url: "/" },
          { nome: "Imóveis", url: "/imoveis" },
        ])}
      />
      <header className="border-b border-cx-border bg-white">
        <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-cx-muted hover:text-cx-text"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> Início
          </Link>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-cx-text sm:text-3xl">
            {buscandoAluguel ? "Imóveis para alugar" : "Imóveis à venda"}
          </h1>
          <p className="mt-1 text-sm text-cx-muted">
            {buscandoAluguel
              ? "Nossa carteira de locação não está publicada no site ainda."
              : `${resultados.length} ${resultados.length === 1 ? "imóvel encontrado" : "imóveis encontrados"}${
                  ativos.length ? " com os filtros aplicados" : ""
                }.`}
          </p>

          {ativos.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {ativos.map((f) => (
                <Link
                  key={f.chave}
                  href={semFiltro(f.chave)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-cx-blue-soft px-3 py-1 text-xs font-semibold text-cx-blue hover:bg-cx-border"
                  title={`Remover filtro: ${f.rotulo}`}
                >
                  {f.rotulo} <span aria-hidden="true">×</span>
                </Link>
              ))}
              <Link href="/imoveis" className="text-xs font-semibold text-cx-muted hover:underline">
                Limpar tudo
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* Atalhos rápidos — o leigo raramente sabe o que quer filtrar; damos
          os cortes mais comuns já prontos. */}
      {!buscandoAluguel && (
        <div className="border-b border-cx-border bg-white">
          <div className="mx-auto flex max-w-6xl flex-wrap gap-2 px-4 pb-4 sm:px-6">
            {tipos.map((t) => (
              <Link
                key={t}
                href={`/imoveis?tipo=${encodeURIComponent(t)}`}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  filtros.tipo === t
                    ? "border-cx-orange bg-cx-orange text-white"
                    : "border-cx-border text-cx-text hover:border-cx-blue"
                }`}
              >
                {t}
              </Link>
            ))}
            {cidades.map((c) => (
              <Link
                key={c}
                href={`/imoveis?cidade=${encodeURIComponent(c)}`}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  filtros.cidade === c
                    ? "border-cx-orange bg-cx-orange text-white"
                    : "border-cx-border text-cx-text hover:border-cx-blue"
                }`}
              >
                {c}
              </Link>
            ))}
          </div>
        </div>
      )}

      <main id="conteudo" className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {resultados.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-cx-border bg-white py-14 text-center">
            <SearchX className="mx-auto h-8 w-8 text-cx-border" aria-hidden="true" />
            <p className="mt-3 text-sm font-semibold text-cx-text">
              {buscandoAluguel
                ? "Ainda não publicamos os imóveis de aluguel aqui"
                : "Nenhum imóvel com esses filtros"}
            </p>
            <p className="mx-auto mt-1 max-w-md text-sm text-cx-muted">
              {buscandoAluguel
                ? "Temos imóveis para locação na carteira. Chame no WhatsApp que mandamos as opções disponíveis."
                : "Tente ampliar o valor ou tirar um filtro. Se preferir, a gente busca para você."}
            </p>
            <div className="mt-5 flex flex-col justify-center gap-2.5 px-6 sm:flex-row">
              <a
                href="https://wa.me/5561999999999?text=Ol%C3%A1!%20N%C3%A3o%20achei%20o%20que%20procuro%20no%20site.%20Podem%20me%20ajudar%3F"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-cx-orange px-5 py-2.5 text-sm font-bold text-white hover:bg-cx-orange-dark"
              >
                <MessageCircle className="h-4 w-4" aria-hidden="true" />
                Pedir no WhatsApp
              </a>
              {ativos.length > 0 && (
                <Link
                  href="/imoveis"
                  className="inline-flex items-center justify-center rounded-lg border border-cx-border px-5 py-2.5 text-sm font-semibold text-cx-text hover:border-cx-blue"
                >
                  Ver todos os imóveis
                </Link>
              )}
            </div>
          </div>
        ) : (
          <>
            <AvisoValorVaria variante="linha" contexto="lista" className="mb-4" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {resultados.map((imovel) => (
                <ImovelCardPublico key={imovel.id} imovel={imovel} />
              ))}
            </div>
          </>
        )}
      </main>

      <WhatsAppFlutuante />
    </div>
  );
}
