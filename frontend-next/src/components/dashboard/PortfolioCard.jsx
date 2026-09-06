"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  Building2,
  CircleAlert,
  HandCoins,
  KeyRound,
} from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatBRL } from "@/components/ui/page";
import { Painel, PainelTitulo } from "./Painel";

const fmt = (n) => (n == null ? "—" : n.toLocaleString("pt-BR"));

function TooltipPortfolio({ active, payload }) {
  if (!active || !payload?.length) return null;
  const item = payload[0]?.payload;
  return (
    <div className="rounded-xl border border-wb-border bg-white px-3 py-2 text-xs shadow-xl shadow-slate-900/10">
      <p className="font-semibold text-wb-text">{item.nome}</p>
      <p className="font-tabular mt-0.5 text-wb-muted">{fmt(item.valor)} imóveis</p>
    </div>
  );
}

function Linha({ icone: Icone, rotulo, valor, hint, corIcone, href }) {
  const conteudo = (
    <>
      <span
        className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-wb-border bg-wb-surface-2"
        style={{ color: corIcone }}
      >
        <Icone className="h-4 w-4" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-wb-muted">{rotulo}</p>
        <p className="font-tabular truncate text-sm font-semibold text-wb-text">{valor}</p>
      </div>
      {hint ? <span className="shrink-0 text-[0.68rem] text-wb-muted">{hint}</span> : null}
      {href ? (
        <ArrowUpRight
          className="h-3.5 w-3.5 shrink-0 text-wb-muted/40 transition group-hover:text-wb-brand"
          aria-hidden="true"
        />
      ) : null}
    </>
  );

  return href ? (
    <Link
      href={href}
      className="group -mx-2 flex items-center gap-3 rounded-xl px-2 py-1.5 transition-colors hover:bg-wb-surface-2"
    >
      {conteudo}
    </Link>
  ) : (
    <div className="flex items-center gap-3">{conteudo}</div>
  );
}

export function PortfolioCard({
  imoveisTotal = 0,
  imoveisDisponiveis = 0,
  contratosAluguel = 0,
  renda,
  indisponivel = false,
  className = "",
}) {
  const fatiaDisponivel =
    imoveisTotal > 0 && imoveisDisponiveis != null
      ? (imoveisDisponiveis / imoveisTotal) * 100
      : 0;
  const dadosGrafico =
    imoveisTotal > 0 && imoveisDisponiveis != null
      ? [
          { nome: "Disponíveis", valor: imoveisDisponiveis, cor: "#1467ad" },
          {
            nome: "Reservados ou vendidos",
            valor: Math.max(0, imoveisTotal - imoveisDisponiveis),
            cor: "#dbe5ef",
          },
        ]
      : [];

  return (
    <Painel className={`flex flex-col ${className}`}>
      <PainelTitulo
        titulo="Portfólio"
        descricao="Disponibilidade atual para venda e locação."
        acao={
          <Link
            href="/imoveis/lista"
            className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-wb-brand hover:text-wb-info"
          >
            Imóveis <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        }
      />

      <div className="grid items-center gap-2 sm:grid-cols-[1fr_132px]">
        <div>
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="font-tabular text-3xl font-semibold leading-none tracking-[-0.04em] text-wb-text sm:text-4xl">
              {fmt(imoveisDisponiveis)}
            </span>
            <span className="text-sm text-wb-muted">
              {imoveisDisponiveis === 1 ? "imóvel disponível" : "imóveis disponíveis"}
            </span>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-wb-muted">
            {imoveisTotal == null
              ? "A carteira de imóveis está indisponível."
              : `de ${fmt(imoveisTotal)} imóveis cadastrados`}
          </p>
        </div>

        <div
          className="relative mx-auto h-[126px] w-[126px]"
          role="img"
          aria-label={`${Math.round(fatiaDisponivel)}% dos imóveis estão disponíveis`}
        >
          {dadosGrafico.length ? (
            <>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dadosGrafico}
                    dataKey="valor"
                    nameKey="nome"
                    innerRadius={43}
                    outerRadius={57}
                    paddingAngle={dadosGrafico[1].valor > 0 ? 3 : 0}
                    stroke="none"
                    isAnimationActive={false}
                  >
                    {dadosGrafico.map((item) => (
                      <Cell key={item.nome} fill={item.cor} />
                    ))}
                  </Pie>
                  <Tooltip content={<TooltipPortfolio />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 grid place-content-center text-center">
                <span className="font-tabular text-lg font-semibold text-wb-brand">
                  {Math.round(fatiaDisponivel)}%
                </span>
                <span className="text-[0.58rem] uppercase tracking-[0.08em] text-wb-muted">
                  disponível
                </span>
              </div>
            </>
          ) : (
            <div className="absolute inset-2 rounded-full border-[13px] border-wb-surface-2" />
          )}
        </div>
      </div>

      <div className="mt-4 space-y-3.5 border-t border-wb-border pt-4">
        <Linha
          icone={Building2}
          rotulo="Imóveis cadastrados"
          valor={fmt(imoveisTotal)}
          hint={imoveisTotal == null ? "indisponível" : `${Math.round(fatiaDisponivel)}% disponível`}
          corIcone="var(--color-wb-brand-ink)"
          href="/imoveis/lista"
        />
        <Linha
          icone={KeyRound}
          rotulo="Contratos de aluguel"
          valor={fmt(contratosAluguel)}
          corIcone="var(--color-wb-tech)"
          href="/alugueis"
        />
        <Linha
          icone={HandCoins}
          rotulo="Renda média da carteira"
          valor={formatBRL(renda?.rendaMedia, { compact: true })}
          hint={`${fmt(renda?.clientesComRenda)} com renda`}
          corIcone="var(--color-wb-analytics)"
        />
      </div>

      {indisponivel ? (
        <p className="mt-4 flex items-start gap-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs leading-relaxed text-wb-bad">
          <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Parte do portfólio não pôde ser atualizada agora.
        </p>
      ) : null}
    </Painel>
  );
}
