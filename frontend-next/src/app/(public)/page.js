import Link from "next/link";
import {
  ArrowRight, BadgeCheck, Building2, ClipboardCheck, FileText,
  HandCoins, Home, KeyRound, MapPin, PiggyBank, Search, ShieldCheck,
} from "lucide-react";
import { apiGet } from "@/lib/api-server";
import { opcoesDeFiltro } from "@/lib/imovel-filtros";
import { BuscaHero } from "@/components/public/BuscaHero";
import { SimuladorMCMV } from "@/components/public/SimuladorMCMV";
import { PorQueOValorMuda } from "@/components/public/PorQueOValorMuda";
import { AvisoValorVaria } from "@/components/public/AvisoValorVaria";
import { JsonLd } from "@/components/public/JsonLd";
import { jsonLdFAQ, jsonLdImobiliaria, jsonLdWebSite } from "@/lib/seo";
import { ImovelCardPublico } from "@/components/public/ImovelCardPublico";
import { WhatsAppFlutuante } from "@/components/public/WhatsAppFlutuante";

// Landing pública — reescrita a partir da análise das landings das
// imobiliárias e construtoras da região (Bela Mares, Construtora Mabel,
// Luh Imóveis, Kaza Imobiliária, Sarom Imóveis).
//
// O que a pesquisa mostrou e foi adotado aqui:
//   · busca com filtros no topo (Mabel e Kaza têm; as outras três não, e o
//     visitante fica sem saber por onde começar);
//   · WhatsApp flutuante (4 de 5 têm) — no mercado local o contato é por ali;
//   · financiamento como assunto principal, em linguagem leiga: MCMV, FGTS e
//     Caixa aparecem em todas;
//   · prova social em números (Bela Mares: "15 anos, 10 mil famílias");
//   · card com preço e specs visíveis (Kaza e Sarom acertam; Luh esconde as
//     specs e Sarom esconde o preço — que é a 1ª coisa que a pessoa procura).
//
// O que NENHUMA delas faz, e virou o diferencial: deixar buscar pela
// PARCELA. Quem compra o primeiro imóvel na região pensa em "quanto pago por
// mês", não em "quanto custa a casa".
export const metadata = {
  title: "Imóveis em Valparaíso, Cidade Ocidental e Luziânia | CRM IMOB",
  description:
    "Casas e apartamentos à venda e para alugar em Valparaíso de Goiás, Cidade Ocidental, Jardim Ingá, Luziânia e Novo Gama. Simule sua parcela, use o FGTS e financie pela Caixa com ajuda de quem entende.",
  alternates: { canonical: "/" },
  keywords: [
    "imobiliária Valparaíso de Goiás",
    "casas à venda Valparaíso de Goiás",
    "apartamento Cidade Ocidental",
    "imóveis Jardim Ingá",
    "imóveis Luziânia",
    "Minha Casa Minha Vida Goiás",
    "financiamento Caixa Entorno do DF",
  ],
  // Ao declarar `openGraph` a página SUBSTITUI o bloco do layout raiz — não
  // faz merge. Por isso siteName/locale/url são repetidos aqui; sem eles o
  // preview do WhatsApp perde o nome do site e a URL.
  openGraph: {
    title: "Imóveis em Valparaíso de Goiás e região",
    description:
      "Encontre pelo valor da parcela, simule o financiamento e fale com um corretor no WhatsApp.",
    type: "website",
    url: "/",
    siteName: "CRM IMOB",
    locale: "pt_BR",
  },
};

const NUMEROS = [
  { valor: "12+", rotulo: "anos na região" },
  { valor: "2.400+", rotulo: "famílias atendidas" },
  { valor: "6", rotulo: "cidades do Entorno" },
  { valor: "15min", rotulo: "resposta média" },
];

const PASSOS = [
  {
    icone: Search,
    titulo: "1. Escolha o imóvel",
    texto: "Busque por cidade, tipo ou pelo valor da parcela que cabe no seu bolso.",
  },
  {
    icone: ClipboardCheck,
    titulo: "2. A gente simula pra você",
    texto: "Vemos se o financiamento aprova, quanto entra de FGTS e qual fica a parcela.",
  },
  {
    icone: KeyRound,
    titulo: "3. Cuidamos da papelada",
    texto: "Documentos, contrato e assinatura. Você só precisa buscar a chave.",
  },
];

const FINANCIAMENTO = [
  {
    icone: Home,
    titulo: "Minha Casa Minha Vida",
    texto: "Juros menores e subsídio do governo para quem se enquadra na faixa de renda.",
  },
  {
    icone: PiggyBank,
    titulo: "Use o seu FGTS",
    texto: "O saldo da carteira pode virar entrada e diminuir bastante a sua parcela.",
  },
  {
    icone: HandCoins,
    titulo: "Financiamento pela Caixa",
    texto: "Somos correspondente: a análise começa aqui, sem você pegar fila no banco.",
  },
  {
    icone: FileText,
    titulo: "Nome sujo? Vamos olhar",
    texto: "Nem sempre impede. Fazemos a análise antes para você não perder tempo.",
  },
];

const CIDADES = [
  "Valparaíso de Goiás",
  "Cidade Ocidental",
  "Jardim Ingá",
  "Luziânia",
  "Novo Gama",
  "Águas Lindas",
];

export default async function LandingPage() {
  const data = await apiGet("/public/imoveis?limit=6");
  const imoveis = Array.isArray(data) ? data : data?.data || [];
  // Filtros montados a partir da carteira real (ver imovel-filtros.js).
  const { tipos, cidades } = opcoesDeFiltro(imoveis);

  return (
    <div className="min-h-screen bg-cx-bg text-cx-text">
      {/* Dados estruturados: quem é a empresa, onde atende e as dúvidas
          frequentes. É o que habilita o resultado rico no Google. */}
      <JsonLd data={jsonLdImobiliaria()} />
      <JsonLd data={jsonLdWebSite()} />
      <JsonLd data={jsonLdFAQ()} />

      {/* ─── Header ─────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-cx-border bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-cx-orange text-white">
              <Building2 className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="text-base font-bold tracking-tight text-cx-text">CRM IMOB</span>
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-medium text-cx-muted md:flex">
            <Link href="/imoveis" className="hover:text-cx-text">Imóveis</Link>
            <a href="#financiamento" className="hover:text-cx-text">Financiamento</a>
            <a href="#parcela" className="hover:text-cx-text">Simular parcela</a>
            <a href="#quanto-liberam" className="hover:text-cx-text">Quanto liberam?</a>
            <Link href="/precos" className="hover:text-cx-text">Planos</Link>
          </nav>

          <Link
            href="/login"
            className="rounded-lg border border-cx-border px-4 py-2 text-sm font-semibold text-cx-text transition-colors hover:border-cx-blue"
          >
            Entrar
          </Link>
        </div>
      </header>

      <main id="conteudo">
      {/* ─── Hero + busca ───────────────────────────────────────────── */}
      <section className="border-b border-cx-border bg-white">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
          <p className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-cx-blue-soft px-3 py-1 text-xs font-semibold text-cx-blue">
            <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
            Valparaíso, Cidade Ocidental, Luziânia e região
          </p>

          <h1 className="max-w-3xl text-3xl font-bold leading-tight tracking-tight text-cx-text sm:text-5xl">
            Sua casa própria começa por uma pergunta simples:{" "}
            <span className="text-cx-orange-text">quanto cabe no seu bolso?</span>
          </h1>
          <p className="mt-3 max-w-2xl text-base text-cx-muted sm:text-lg">
            A gente encontra o imóvel, vê se o financiamento aprova e cuida da papelada.
            Sem juridiquês e sem você perder o dia no banco.
          </p>

          <div className="mt-7">
            <BuscaHero tipos={tipos} cidades={cidades} />
          </div>

          {/* Atalhos por cidade — quem é da região busca pelo nome do lugar */}
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-cx-muted">Populares:</span>
            {CIDADES.map((c) => (
              <Link
                key={c}
                href={`/imoveis?cidade=${encodeURIComponent(c)}`}
                className="rounded-full border border-cx-border bg-white px-3 py-1.5 text-xs font-medium text-cx-text transition-colors hover:border-cx-blue hover:text-cx-blue"
              >
                {c}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Faixa de confiança ─────────────────────────────────────── */}
      <section className="border-b border-cx-border bg-cx-blue">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 py-6 sm:px-6 lg:grid-cols-4">
          {NUMEROS.map((n) => (
            <div key={n.rotulo} className="text-center">
              <p className="font-tabular text-2xl font-bold text-white sm:text-3xl">{n.valor}</p>
              <p className="mt-0.5 text-xs text-white/80">{n.rotulo}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Imóveis em destaque ────────────────────────────────────── */}
      <section className="border-y border-cx-border bg-white">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-cx-text sm:text-3xl">
                Imóveis disponíveis agora
              </h2>
              <p className="mt-1 text-sm text-cx-muted">
                Com o valor da parcela já calculado, para você não ter surpresa.
              </p>
            </div>
            <Link
              href="/imoveis"
              className="inline-flex items-center gap-1.5 rounded-lg border border-cx-border px-4 py-2.5 text-sm font-semibold text-cx-text transition-colors hover:border-cx-blue"
            >
              Ver todos <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          {imoveis.length === 0 ? (
            <p className="rounded-xl border border-dashed border-cx-border py-12 text-center text-sm text-cx-muted">
              Nenhum imóvel publicado no momento. Fale com a gente no WhatsApp que buscamos para você.
            </p>
          ) : (
            <>
              <AvisoValorVaria variante="linha" contexto="lista" className="mb-4" />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {imoveis.slice(0, 6).map((imovel) => (
                  <ImovelCardPublico key={imovel.id} imovel={imovel} />
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      {/* ─── Simulador MCMV (o diferencial) ─────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <SimuladorMCMV />
      </section>

      {/* ─── Por que o valor liberado muda de imóvel para imóvel ────── */}
      <section className="border-t border-cx-border bg-white">
        <PorQueOValorMuda />
      </section>

      {/* ─── Como financiar ─────────────────────────────────────────── */}
      <section id="financiamento" className="scroll-mt-20">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
          <h2 className="text-2xl font-bold tracking-tight text-cx-text sm:text-3xl">
            Dá para financiar. A gente te mostra como.
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-cx-muted">
            A maior dúvida de quem compra o primeiro imóvel é se o banco aprova.
            Respondemos isso antes de você se apegar a uma casa.
          </p>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FINANCIAMENTO.map(({ icone: Icone, titulo, texto }) => (
              <div key={titulo} className="rounded-xl border border-cx-border bg-white p-5">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-cx-blue-soft text-cx-blue">
                  <Icone className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className="mt-3 text-sm font-bold text-cx-text">{titulo}</h3>
                <p className="mt-1 text-xs leading-relaxed text-cx-muted">{texto}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Passo a passo ──────────────────────────────────────────── */}
      <section className="border-y border-cx-border bg-white">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
          <h2 className="text-2xl font-bold tracking-tight text-cx-text sm:text-3xl">
            Como funciona
          </h2>
          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            {PASSOS.map(({ icone: Icone, titulo, texto }) => (
              <div key={titulo} className="rounded-xl border border-cx-border p-5">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-cx-orange text-white">
                  <Icone className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className="mt-3 text-base font-bold text-cx-text">{titulo}</h3>
                <p className="mt-1 text-sm leading-relaxed text-cx-muted">{texto}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-4 rounded-xl bg-cx-bg p-5">
            <ShieldCheck className="h-6 w-6 shrink-0 text-cx-blue" aria-hidden="true" />
            <p className="flex-1 text-sm text-cx-text">
              <strong className="font-semibold">Corretor com CRECI e contrato registrado.</strong>{" "}
              Toda negociação passa por análise de documentação do imóvel e do vendedor.
            </p>
            <BadgeCheck className="hidden h-6 w-6 shrink-0 text-emerald-700 sm:block" aria-hidden="true" />
          </div>
        </div>
      </section>

      {/* ─── CTA final ──────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="rounded-2xl bg-cx-blue px-6 py-10 text-center sm:px-10 sm:py-14">
          <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Ainda com dúvida se consegue comprar?
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-white/85 sm:text-base">
            Faça a simulação em 2 minutos ou mande uma mensagem. A conversa é sem compromisso —
            e a resposta é sincera, mesmo quando é &quot;ainda não&quot;.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/simulador"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-cx-orange px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-cx-orange-dark"
            >
              Simular meu financiamento
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href="/imoveis"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/40 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              Só quero ver os imóveis
            </Link>
          </div>
        </div>
      </section>

      </main>

      {/* ─── Footer ─────────────────────────────────────────────────── */}
      <footer className="border-t border-cx-border bg-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3 sm:px-6">
          <div>
            <span className="text-base font-bold text-cx-text">CRM IMOB</span>
            <p className="mt-2 text-xs leading-relaxed text-cx-muted">
              Compra, venda e locação de imóveis no Entorno do DF.
              <br />
              CRECI [00000-J]
            </p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-cx-text">Atendimento</p>
            <ul className="mt-2 space-y-1 text-xs text-cx-muted">
              <li>[(00) 00000-0000]</li>
              <li>[contato@suaimobiliaria.com.br]</li>
              <li>Seg a Sex, 8h às 18h · Sáb, 8h às 12h</li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-cx-text">Onde atuamos</p>
            <p className="mt-2 text-xs leading-relaxed text-cx-muted">{CIDADES.join(" · ")}</p>
          </div>
        </div>
        <div className="border-t border-cx-border py-4">
          <p className="text-center text-[0.7rem] text-cx-muted">
            © {new Date().getFullYear()} CRM IMOB. Valores de parcela são estimativas e não
            constituem oferta de crédito.
          </p>
        </div>
      </footer>

      <WhatsAppFlutuante />
    </div>
  );
}
