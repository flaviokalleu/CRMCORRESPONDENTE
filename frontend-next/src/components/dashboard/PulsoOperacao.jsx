import Link from "next/link";
import {
  Activity,
  ArrowUpRight,
  BadgeCheck,
  BarChart3,
  BellRing,
  Building2,
  CalendarDays,
  Clock3,
  FileBarChart,
  Landmark,
  Plus,
  UsersRound,
} from "lucide-react";

const TOM_VALOR = {
  bom: "text-emerald-300",
  ruim: "text-rose-300",
  atencao: "text-amber-300",
  info: "text-sky-300",
};

const ICONES = {
  atividade: Activity,
  aprovacao: BadgeCheck,
  carteira: UsersRound,
  fila: Clock3,
  imovel: Building2,
  relatorio: BarChart3,
};

const ICONES_ACAO = {
  adicionar: Plus,
  fila: Clock3,
  relatorio: FileBarChart,
  carteira: UsersRound,
};

function Vital({ vital }) {
  const Icone = ICONES[vital.icone] ?? Activity;
  const corpo = (
    <>
      <div className="flex items-center justify-between gap-3">
        <span className="grid h-8 w-8 place-items-center rounded-md bg-white/[0.08] text-white/75 ring-1 ring-inset ring-white/10 transition-colors group-hover:bg-white/[0.12] group-hover:text-white">
          <Icone className="h-4 w-4" aria-hidden="true" />
        </span>
        {vital.href ? (
          <ArrowUpRight
            className="h-3.5 w-3.5 text-white/30 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-white/70"
            aria-hidden="true"
          />
        ) : null}
      </div>
      <p
        className={`font-tabular mt-3 text-2xl font-semibold leading-none tracking-[-0.04em] ${
          TOM_VALOR[vital.tom] ?? "text-white"
        }`}
      >
        {vital.valor}
      </p>
      <p className="mt-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.11em] text-white/65">
        {vital.rotulo}
      </p>
      <p className="mt-1 truncate text-[0.7rem] text-white/45">{vital.detalhe}</p>
    </>
  );

  const classe =
    "group block min-w-0 px-3.5 py-3 text-left transition-colors hover:bg-white/[0.035] sm:px-4";

  return vital.href ? (
    <Link
      href={vital.href}
      className={classe}
      aria-label={`${vital.rotulo}: ${vital.valor}. ${vital.detalhe}`}
    >
      {corpo}
    </Link>
  ) : (
    <div className={classe}>{corpo}</div>
  );
}

export function PulsoOperacao({
  nome,
  papel,
  saudacao = "Olá",
  subtitulo,
  dataFormatada,
  horaAtualizada,
  vitais = [],
  destaque,
  alertas = 0,
  acoes = [],
}) {
  return (
    <section className="wb-briefing overflow-hidden rounded-xl text-white shadow-[0_8px_24px_rgba(15,40,75,0.14)]">
      <div className="wb-briefing-orbit relative overflow-hidden px-5 pb-4 pt-4 sm:px-6 sm:pb-5 sm:pt-5">
        <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-white/60">
              <span className="inline-flex items-center gap-1.5 border-r border-white/20 pr-2.5 text-white/90">
                <Landmark className="h-3.5 w-3.5 text-cx-orange-bright" aria-hidden="true" />
                Painel gerencial
              </span>
              <span className="rounded-md border border-white/15 bg-white/[0.06] px-2.5 py-1 text-white/80">
                {papel}
              </span>
              {dataFormatada ? (
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                  {dataFormatada}
                </span>
              ) : null}
            </div>

            <h1 className="mt-3 text-2xl font-semibold tracking-[-0.035em] text-white sm:text-[1.75rem]">
              {saudacao}, {nome || "bem-vindo"}.
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/65 sm:text-[0.95rem]">
              {subtitulo}
            </p>

            {destaque ? (
              <p className="mt-3 inline-flex items-center gap-2 rounded-md border border-white/10 border-l-2 border-l-cx-orange-bright bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-white/80">
                <BadgeCheck className="h-3.5 w-3.5 text-cx-orange-bright" aria-hidden="true" />
                {destaque}
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2 lg:max-w-[420px] lg:justify-end">
            <span className="mr-1 inline-flex items-center gap-2 text-[0.7rem] text-white/55">
              <span className="pulse-dot" aria-hidden="true" />
              Dados consultados às {horaAtualizada}
            </span>
            {alertas > 0 ? (
              <Link
                href="/dashboard#alertas"
                className="inline-flex h-9 items-center gap-2 rounded-md border border-rose-300/20 bg-rose-300/10 px-3 text-xs font-semibold text-rose-100 transition-colors hover:bg-rose-300/15"
              >
                <BellRing className="h-3.5 w-3.5" aria-hidden="true" />
                {alertas} {alertas === 1 ? "situação ativa" : "situações ativas"}
              </Link>
            ) : null}
            {acoes.map((acao) => {
              const Icone = ICONES_ACAO[acao.icone] ?? ArrowUpRight;
              return (
                <Link
                  key={`${acao.href}-${acao.label}`}
                  href={acao.href}
                  className={
                    acao.primaria
                      ? "inline-flex h-9 items-center gap-2 rounded-md bg-cx-orange px-3.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-cx-orange-dark"
                      : "inline-flex h-9 items-center gap-2 rounded-md border border-white/15 bg-white/[0.06] px-3.5 text-xs font-semibold text-white/85 transition-colors hover:bg-white/[0.11] hover:text-white"
                  }
                >
                  <Icone className="h-3.5 w-3.5" aria-hidden="true" />
                  {acao.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 divide-x divide-y divide-white/10 border-t border-white/10 bg-black/[0.08] md:grid-cols-5 md:divide-y-0">
        {vitais.map((vital) => (
          <Vital key={vital.rotulo} vital={vital} />
        ))}
      </div>
    </section>
  );
}
