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
import { CircleAlert, TrendingDown, TrendingUp } from "lucide-react";
import { Painel, PainelTitulo } from "./Painel";

const fmt = (n) => (n ?? 0).toLocaleString("pt-BR");
const fmtPct = (n) => `${n > 0 ? "+" : ""}${(n ?? 0).toFixed(1).replace(".", ",")}%`;

function TooltipSemanal({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-wb-border bg-white px-3 py-2 text-xs shadow-xl shadow-slate-900/10">
      <p className="mb-1 font-semibold text-wb-text">{label}</p>
      {payload.map((item) => (
        <p key={item.dataKey} className="font-tabular mt-0.5" style={{ color: item.color }}>
          {fmt(item.value)} <span className="text-wb-muted">{item.name.toLowerCase()}</span>
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
    <Painel hero className={`flex flex-col ${className}`}>
      <PainelTitulo
        titulo={titulo}
        descricao={descricao}
        acao={
          crescimentoValido ? (
            <span
              className={`inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold ${
                positivo ? "bg-emerald-50 text-wb-good" : "bg-red-50 text-wb-bad"
              }`}
            >
              <IconeTendencia className="h-3.5 w-3.5" aria-hidden="true" />
              {fmtPct(crescimento)}
            </span>
          ) : null
        }
      />

      <div className="mb-3 flex items-baseline gap-2">
        <span className="font-tabular text-3xl font-semibold tracking-[-0.04em] text-wb-text">
          {fmt(total)}
        </span>
        <span className="text-xs text-wb-muted">{labelTotal}</span>
      </div>

      {indisponivel ? (
        <div className="flex h-[170px] flex-col items-center justify-center gap-2 text-center">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-red-50 text-wb-bad">
            <CircleAlert className="h-5 w-5" aria-hidden="true" />
          </span>
          <p className="text-sm font-medium text-wb-text">Comparativo indisponível</p>
          <p className="text-xs text-wb-muted">Atualize a página para tentar novamente.</p>
        </div>
      ) : temDados ? (
        <div
          className="h-[230px] w-full"
          role="img"
          aria-label="Gráfico de barras comparando os cadastros dos últimos sete dias com os sete dias anteriores"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={serie} margin={{ top: 8, right: 8, left: -14, bottom: 0 }}>
              <CartesianGrid stroke="#e8edf4" vertical={false} />
              <XAxis
                dataKey="rotulo"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#64748b", fontSize: 11 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#64748b", fontSize: 11 }}
                allowDecimals={false}
                width={42}
              />
              <Tooltip cursor={{ fill: "#f7f9fc" }} content={<TooltipSemanal />} />
              <Legend
                verticalAlign="top"
                align="right"
                iconType="circle"
                iconSize={7}
                wrapperStyle={{ fontSize: 11, color: "#64748b", paddingBottom: 12 }}
              />
              <Bar
                dataKey="anterior"
                name={nomeAnterior}
                fill="#b8c7d6"
                radius={[4, 4, 0, 0]}
                maxBarSize={28}
                isAnimationActive={false}
              />
              <Bar
                dataKey="atual"
                name={nomeAtual}
                fill="#005ca9"
                radius={[4, 4, 0, 0]}
                maxBarSize={28}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="flex min-h-[135px] items-center justify-center rounded-xl border border-dashed border-wb-border bg-wb-surface-2 px-4 text-center">
          <p className="text-sm text-wb-muted">Sem cadastros nas duas janelas comparadas.</p>
        </div>
      )}
    </Painel>
  );
}
