"use client";

import Link from "next/link";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowUpRight, CircleAlert, TrendingDown, TrendingUp } from "@/components/icons";
import { Painel } from "./Painel";
import { NEON, NeonGlow } from "@/lib/chart-neon";

const TINTA = NEON.blue;
const GRID = NEON.grid;
const TEXTO_EIXO = NEON.axis;

const fmt = (n) => (n ?? 0).toLocaleString("pt-BR");
const fmtPct = (n) => `${n > 0 ? "+" : ""}${(n ?? 0).toFixed(1).replace(".", ",")}%`;

function DeltaChip({ valor, contexto = "vs. período anterior" }) {
  if (valor == null || Number.isNaN(valor)) return null;
  const positivo = valor >= 0;
  const Icone = positivo ? TrendingUp : TrendingDown;

  return (
    <span className={`ix-chip ${positivo ? "ix-chip-up" : "ix-chip-down"}`}>
      <Icone className="h-3.5 w-3.5" aria-hidden="true" />
      {fmtPct(valor)}
      <span className="font-medium opacity-70">{contexto}</span>
    </span>
  );
}

function TooltipContent({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const atual = payload.find((item) => item.dataKey === "atual");

  return (
    <div className="ix-tooltip">
      <p className="mb-1 font-semibold">{label}</p>
      {atual ? (
        <p className="font-tabular">
          <strong>{fmt(atual.value)}</strong> cadastros
        </p>
      ) : null}
    </div>
  );
}

export function GraficoEvolucao({ mensal, titulo = "Evolução da operação", className = "" }) {
  const dados = (mensal?.rotulos ?? []).map((rotulo, index) => ({
    rotulo,
    atual: mensal?.dados?.[index] ?? 0,
  }));
  const temDados = dados.length > 0 && dados.some((item) => item.atual > 0);

  return (
    <Painel futurista className={className}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="wb-eyebrow">Série histórica</p>
          <h2 className="mt-1 text-xl font-bold">{titulo}</h2>
          <p className="mt-1 text-sm">Últimos 12 meses · novos clientes cadastrados</p>
          <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-2">
            <span className="ix-chart-kpi font-tabular text-5xl font-bold leading-none">
              {fmt(mensal?.total)}
            </span>
            <span className="text-sm text-wb-muted">no período móvel</span>
            <DeltaChip valor={mensal?.crescimento} contexto="vs. 12 meses anteriores" />
          </div>
        </div>
        <Link
          href="/relatorio"
          className="inline-flex items-center gap-1 text-xs font-semibold text-wb-brand transition-colors hover:text-wb-info"
        >
          Relatório <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>

      <div className="mb-2 mt-4 flex items-center justify-end gap-4 text-xs text-wb-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: TINTA, boxShadow: `0 0 8px ${TINTA}` }} />
          Cadastros mensais
        </span>
        {mensal?.media > 0 ? (
          <span className="inline-flex items-center gap-1.5">
            <span className="h-0 w-4 border-t-2 border-dashed" style={{ borderColor: NEON.teal }} />
            Média de {fmt(Math.round(mensal.media))}/mês
          </span>
        ) : null}
      </div>

      {mensal?.indisponivel ? (
        <div className="flex h-[300px] flex-col items-center justify-center gap-2 text-center">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-red-500/15 text-red-300">
            <CircleAlert className="h-4 w-4" aria-hidden="true" />
          </span>
          <p className="text-sm font-medium text-wb-text">Evolução indisponível</p>
          <p className="text-xs text-wb-muted">Atualize a página para tentar novamente.</p>
        </div>
      ) : temDados ? (
        <div
          className="h-[340px] w-full"
          role="img"
          aria-label="Gráfico de área com os novos clientes cadastrados nos últimos doze meses"
        >
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={dados} margin={{ top: 8, right: 8, left: -14, bottom: 0 }}>
              <defs>
                <linearGradient id="wbHeroFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={TINTA} stopOpacity={0.45} />
                  <stop offset="60%" stopColor={NEON.blueDeep} stopOpacity={0.12} />
                  <stop offset="100%" stopColor={NEON.blueDeep} stopOpacity={0} />
                </linearGradient>
                <NeonGlow id="evoGlow" blur={4} />
              </defs>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis
                dataKey="rotulo"
                axisLine={false}
                tickLine={false}
                tick={{ fill: TEXTO_EIXO, fontSize: 12 }}
                dy={8}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: TEXTO_EIXO, fontSize: 12 }}
                allowDecimals={false}
                width={44}
                domain={[0, "auto"]}
              />
              <Tooltip
                content={<TooltipContent />}
                cursor={{ stroke: "rgba(96,165,250,0.5)", strokeDasharray: "3 3" }}
              />
              {mensal?.media > 0 ? (
                <ReferenceLine
                  y={mensal.media}
                  stroke={NEON.teal}
                  strokeOpacity={0.8}
                  strokeDasharray="6 4"
                />
              ) : null}
              <Area
                type="monotone"
                dataKey="atual"
                stroke={TINTA}
                strokeWidth={3}
                fill="url(#wbHeroFill)"
                filter="url(#evoGlow)"
                dot={{ r: 3.5, fill: NEON.bg, stroke: TINTA, strokeWidth: 2 }}
                activeDot={{ r: 6, fill: "#ffffff", stroke: TINTA, strokeWidth: 3 }}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="ix-chart-empty mt-3 flex min-h-[300px] items-center justify-center px-4 text-center">
          <p className="text-sm">A série será exibida assim que houver cadastros nos últimos 12 meses.</p>
        </div>
      )}
    </Painel>
  );
}
