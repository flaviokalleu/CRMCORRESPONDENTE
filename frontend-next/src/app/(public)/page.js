import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { apiGet } from "@/lib/api-server";
import { fraunces } from "@/lib/fonts";
import { Hero3D } from "@/components/public/Hero3D";
import { FeatureReelPlayer } from "@/components/public/FeatureReelPlayer";
import { FeaturesGrid } from "@/components/public/FeaturesGrid";
import { LuxImovelCard } from "@/components/public/LuxImovelCard";
import { Marquee } from "@/components/public/Marquee";
import { Spotlight } from "@/components/public/Spotlight";
import { CountUp } from "@/components/public/CountUp";
import { Reveal } from "@/components/public/Reveal";

// Landing "Casa & Ouro" — imobiliária de luxo, navy profundo + ouro fundido.
// Continua Server Component: metadados + texto renderizam no servidor (SEO
// real). 3D, Remotion e efeitos de cursor são ilhas de cliente isoladas.
export const metadata = {
  title: "CRM IMOB — Imóveis de alto padrão em Valparaíso de Goiás",
  description:
    "Encontre o imóvel dos seus sonhos em Valparaíso de Goiás. Casas, apartamentos e terrenos com atendimento personalizado, segurança jurídica e um CRM completo por trás.",
  openGraph: {
    title: "CRM IMOB — Imóveis de alto padrão",
    description:
      "Clientes, imóveis, aluguéis, financeiro e WhatsApp integrados em um só sistema.",
    type: "website",
  },
};

const STATS = [
  { to: 320, suffix: "+", label: "Imóveis no portfólio" },
  { to: 1200, suffix: "+", label: "Clientes atendidos" },
  { to: 98, suffix: "%", label: "Contratos no prazo" },
  { to: 15, suffix: "min", label: "Resposta média" },
];

export default async function LandingPage() {
  const data = await apiGet("/public/imoveis?limit=6");
  const imoveis = Array.isArray(data) ? data : data?.data || [];

  return (
    <div className={`${fraunces.variable} min-h-screen bg-[#060A14] text-white`}>
      {/* ─── Header ─── */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/5 bg-[#060A14]/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <span className="font-display text-xl font-semibold tracking-tight">
            CRM <span className="text-caixa-orange">IMOB</span>
          </span>
          <nav className="flex items-center gap-5 text-sm sm:gap-7">
            <Link href="/imoveis" className="hidden text-white/60 transition-colors hover:text-white sm:inline">
              Imóveis
            </Link>
            <Link href="/precos" className="hidden text-white/60 transition-colors hover:text-white sm:inline">
              Preços
            </Link>
            <Link
              href="/login"
              className="rounded-full bg-gradient-to-br from-cx-orange to-cx-orange-dark px-5 py-2 text-xs font-semibold text-white shadow-lg shadow-cx-orange/25 transition-all hover:shadow-xl hover:shadow-cx-orange/25 sm:text-sm"
            >
              Entrar
            </Link>
          </nav>
        </div>
      </header>

      {/* ─── Hero ─── */}
      <section className="grain relative isolate overflow-hidden">
        <Spotlight />
        {/* auroras de fundo */}
        <div className="aurora aurora-drift left-[-10%] top-[-5%] h-[32rem] w-[32rem] bg-cx-orange/25" />
        <div className="aurora aurora-drift right-[-8%] top-[10%] h-[28rem] w-[28rem] bg-[#1e6fb8]/25" style={{ animationDelay: "-6s" }} />

        <div className="relative mx-auto grid min-h-[92vh] max-w-6xl grid-cols-1 items-center gap-8 px-4 pb-16 pt-32 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:pt-28">
          <Reveal>
            <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.25em] text-caixa-orange-light">
              <span className="h-1.5 w-1.5 rounded-full bg-cx-orange" />
              Valparaíso de Goiás
            </p>
            <h1 className="font-display text-5xl font-medium leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">
              O endereço
              <br />
              dos seus{" "}
              <span className="italic text-gold-shimmer">sonhos</span>
              <br />
              começa aqui.
            </h1>
            <p className="mt-7 max-w-md text-base leading-relaxed text-white/55 sm:text-lg">
              Imóveis selecionados com atendimento sob medida e segurança
              jurídica — sustentados por um CRM que cuida de cada detalhe,
              do primeiro contato às chaves na mão.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Link
                href="/imoveis"
                className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-cx-orange to-cx-orange-dark px-7 py-4 text-sm font-semibold shadow-xl shadow-cx-orange/25 transition-all hover:shadow-2xl hover:shadow-cx-orange/25"
              >
                Explorar imóveis
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="/precos"
                className="inline-flex items-center gap-2 rounded-full border border-white/15 px-7 py-4 text-sm font-semibold text-white/80 backdrop-blur-sm transition-colors hover:border-white/30 hover:text-white"
              >
                Conhecer planos
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          </Reveal>

          <Reveal delay={0.15} className="relative h-80 sm:h-[26rem] lg:h-[34rem]">
            <div className="absolute inset-0">
              <Hero3D />
            </div>
          </Reveal>
        </div>

        {/* faixa de stats ancorada no fim do hero */}
        <div className="relative border-t border-white/5">
          <div className="mx-auto grid max-w-6xl grid-cols-2 divide-x divide-white/5 px-4 sm:px-6 lg:grid-cols-4">
            {STATS.map((s) => (
              <div key={s.label} className="px-2 py-8 text-center sm:px-6">
                <div className="font-display text-3xl font-semibold text-gold-shimmer sm:text-4xl">
                  <CountUp to={s.to} suffix={s.suffix} />
                </div>
                <div className="mt-1 text-xs uppercase tracking-widest text-white/40 sm:text-sm">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Marquee ─── */}
      <Marquee />

      {/* ─── Módulos ─── */}
      <section className="grain relative overflow-hidden py-24 sm:py-32">
        <div className="aurora left-1/2 top-1/3 h-[26rem] w-[26rem] -translate-x-1/2 bg-cx-orange/10" />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
          <Reveal className="max-w-2xl">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.3em] text-caixa-orange">Plataforma completa</p>
            <h2 className="font-display text-4xl font-medium leading-tight tracking-tight sm:text-5xl">
              Uma imobiliária inteira,
              <br />
              <span className="text-white/50">orquestrada em um só sistema.</span>
            </h2>
          </Reveal>
          <div className="mt-14">
            <FeaturesGrid />
          </div>
        </div>
      </section>

      {/* ─── Remotion reel ─── */}
      <section className="grain relative overflow-hidden border-y border-white/5 bg-gradient-to-b from-caixa-primary to-[#060A14] py-24 sm:py-32">
        <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-4 sm:px-6 lg:grid-cols-2">
          <Reveal>
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.3em] text-caixa-orange">Em movimento</p>
            <h2 className="font-display text-4xl font-medium leading-tight tracking-tight sm:text-5xl">
              Veja o fluxo,<br />da chave à comissão.
            </h2>
            <p className="mt-5 max-w-md text-white/55">
              Do cadastro do cliente ao repasse ao proprietário — cada módulo
              conversa com o próximo automaticamente, sem retrabalho.
            </p>
          </Reveal>
          <Reveal delay={0.15}>
            <div className="group relative mx-auto w-full max-w-lg">
              {/* moldura com brilho */}
              <div className="absolute -inset-4 rounded-[2rem] bg-cx-orange/20 opacity-40 blur-2xl transition-opacity duration-500 group-hover:opacity-70" />
              <div className="relative aspect-video overflow-hidden rounded-3xl ring-gold shadow-2xl shadow-black/50">
                <FeatureReelPlayer />
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ─── Imóveis em destaque ─── */}
      <section className="grain relative overflow-hidden py-24 sm:py-32">
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
          <Reveal className="mb-14 flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-xl">
              <p className="mb-4 text-xs font-semibold uppercase tracking-[0.3em] text-caixa-orange">Seleção exclusiva</p>
              <h2 className="font-display text-4xl font-medium leading-tight tracking-tight sm:text-5xl">
                Imóveis em destaque
              </h2>
              <p className="mt-3 text-white/50">Curadoria de oportunidades em Valparaíso de Goiás.</p>
            </div>
            <Link
              href="/imoveis"
              className="group inline-flex shrink-0 items-center gap-2 rounded-full border border-white/15 px-6 py-3 text-sm font-semibold text-white/80 transition-colors hover:border-caixa-orange hover:text-white"
            >
              Ver todos
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </Reveal>

          {imoveis.length === 0 ? (
            <p className="text-white/40">Nenhum imóvel disponível no momento.</p>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {imoveis.slice(0, 6).map((imovel, i) => (
                <Reveal key={imovel.id} delay={i * 0.05}>
                  <LuxImovelCard imovel={imovel} />
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ─── CTA band ─── */}
      <section className="relative px-4 pb-24 sm:px-6">
        <div className="grain relative mx-auto max-w-6xl overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-cx-orange via-caixa-orange-dark to-[#b8430e] px-8 py-16 text-center sm:py-20">
          <div className="aurora aurora-drift left-[10%] top-[-20%] h-64 w-64 bg-white/20" />
          <Reveal>
            <h2 className="relative font-display text-4xl font-medium leading-tight tracking-tight sm:text-5xl">
              Pronto para encontrar
              <br />o seu próximo endereço?
            </h2>
            <p className="relative mx-auto mt-4 max-w-md text-white/80">
              Fale com um especialista agora mesmo pelo WhatsApp e receba uma
              seleção personalizada.
            </p>
            <div className="relative mt-8 flex flex-wrap items-center justify-center gap-4">
              <a
                href="https://wa.me/556182511308"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full bg-white px-8 py-4 text-sm font-semibold text-caixa-orange-dark shadow-xl transition-transform hover:scale-[1.03]"
              >
                Falar no WhatsApp
              </a>
              <Link
                href="/imoveis"
                className="rounded-full border border-white/40 px-8 py-4 text-sm font-semibold text-white transition-colors hover:bg-white/10"
              >
                Ver imóveis
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-white/5 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 text-sm text-white/40 sm:flex-row sm:px-6">
          <span className="font-display text-base text-white/70">
            CRM <span className="text-caixa-orange">IMOB</span>
          </span>
          <span>&copy; {new Date().getFullYear()} CRM IMOB. Todos os direitos reservados.</span>
          <a
            href="https://wa.me/556182511308"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-caixa-orange-light transition-colors hover:text-caixa-orange"
          >
            Fale conosco
          </a>
        </div>
      </footer>
    </div>
  );
}
