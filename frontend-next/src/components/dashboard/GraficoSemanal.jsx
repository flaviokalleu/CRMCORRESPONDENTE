"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CircleAlert, TrendingDown, TrendingUp } from "@/components/icons";
import { Painel, PainelTitulo } from "./Painel";
import { NEON, NeonGlow } from "@/lib/chart-neon";

const fmt = (n) => (n ?? 0).toLocaleString("pt-BR");
const fmtPct = (n) => `${n > 0 ? "+" : ""}${(n ?? 0).toFixed(1).replace(".", ",")}%`;

function TooltipSemanal({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="ix-tooltip">
      <p className="mb-1 font-semibold">{label}</p>
      {payload.map((item) => (
        <p key={item.dataKey} className="font-tabular mt-0.5">
          <strong style={{ color: item.dataKey === "atual" ? NEON.blue : NEON.axis }}>{fmt(item.value)}</strong> {item.name.toLowerCase()}
        </p>
      ))}
    </div>
  );
}

export function GraficoSemanal({
  rotulos = [],
  dados = [],
  anteriores = [],
  total = 0,
  crescimento,
  indisponivel = false,
  className = "",
  titulo = "Comparativo do período",
  descricao = "Entradas na janela selecionada comparadas ao período imediatamente anterior.",
  nomeAtual = "Período atual",
  nomeAnterior = "Período anterior",
  labelTotal = "novos clientes na janela atual",
}) {
  const serie = rotulos.map((rotulo, index) => ({
    rotulo,
    atual: dados[index] ?? 0,
    anterior: anteriores[index] ?? 0,
  }));
  const temDados = serie.some((item) => item.atual > 0 || item.anterior > 0);
  const crescimentoValido = typeof crescimento === "number" && Number.isFinite(crescimento);
  const positivo = crescimentoValido && crescimento >= 0;
  const IconeTendencia = positivo ? TrendingUp : TrendingDown;

  return (
    <Painel futurista className={`flex flex-col ${className}`}>
      <PainelTitulo
        titulo={titulo}
        descricao={descricao}
        acao={
          crescimentoValido ? (
            <span className={`ix-chip shrink-0 ${positivo ? "ix-chip-up" : "ix-chip-down"}`}>
              <IconeTendencia className="h-3.5 w-3.5" aria-hidden="true" />
              {fmtPct(crescimento)}
            </span>
          ) : null
        }
      />

      <div className="mb-3 flex items-baseline gap-2">
        <span className="ix-chart-kpi font-tabular text-4xl font-bold">
          {fmt(total)}
        </span>
        <span className="text-sm text-wb-muted">{labelTotal}</span>
      </div>

      {indisponivel ? (
        <div className="flex h-[280px] flex-col items-center justify-center gap-2 text-center">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-red-500/15 text-red-300">
            <CircleAlert className="h-5 w-5" aria-hidden="true" />
          </span>
          <p className="text-sm font-medium text-wb-text">Comparativo indisponível</p>
          <p className="text-xs text-wb-muted">Atualize a página para tentar novamente.</p>
        </div>
      ) : temDados ? (
        <div
          className="h-[300px] w-full"
          role="img"
          aria-label="Gráfico de barras comparando os cadastros dos últimos sete dias com os sete dias anteriores"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={serie} margin={{ top: 8, right: 8, left: -14, bottom: 0 }} barGap={4}>
              <defs>
                <linearGradient id="semAtual" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#93c5fd" />
                  <stop offset="100%" stopColor={NEON.blueDeep} />
                </linearGradient>
                <linearGradient id="semAnterior" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(148,163,184,0.55)" />
                  <stop offset="100%" stopColor="rgba(148,163,184,0.18)" />
                </linearGradient>
                <NeonGlow id="semGlow" blur={3} />
              </defs>
              <CartesianGrid stroke={NEON.grid} vertical={false} />
              <XAxis
                dataKey="rotulo"
                axisLine={false}
                tickLine={false}
                tick={{ fill: NEON.axis, fontSize: 12 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: NEON.axis, fontSize: 12 }}
                allowDecimals={false}
                width={42}
              />
              <Tooltip cursor={{ fill: "rgba(96,165,250,0.08)" }} content={<TooltipSemanal />} />
              <Legend
                verticalAlign="top"
                align="right"
                iconType="circle"
                iconSize={7}
                wrapperStyle={{ fontSize: 12, color: NEON.axis, paddingBottom: 14 }}
              />
              <Bar
                dataKey="anterior"
                name={nomeAnterior}
                fill="url(#semAnterior)"
                radius={[6, 6, 0, 0]}
                maxBarSize={30}
                isAnimationActive={false}
              />
              <Bar
                dataKey="atual"
                name={nomeAtual}
                fill="url(#semAtual)"
                filter="url(#semGlow)"
                radius={[6, 6, 0, 0]}
                maxBarSize={30}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="ix-chart-empty flex min-h-[280px] items-center justify-center px-4 text-center">
          <p className="text-sm">Sem cadastros nas duas janelas comparadas.</p>
        </div>
      )}
    </Painel>
  );
}
