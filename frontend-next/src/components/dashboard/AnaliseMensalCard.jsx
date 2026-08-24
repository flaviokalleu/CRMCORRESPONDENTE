"use client";

import { useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { SlidersHorizontal, TrendingUp } from "lucide-react";
import { GlassCard, GlassCardHeader } from "./GlassCard";
import { CHART_CHROME, CHART_COLORS } from "@/lib/chart-colors";

// Série única (clientes por período) → uma cor só: branco, a tinta líder
// validada contra a superfície aqua (ver chart-colors.js). Marcadores com
// miolo azul profundo para não sumirem sobre o vidro claro do card.
const LINE = CHART_COLORS.white;
const GRID = CHART_CHROME.gridline;
const AXIS_TEXT = CHART_CHROME.textMuted;

function TooltipContent({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-cx-border bg-[#08324f]/95 px-3 py-2 text-xs shadow-xl backdrop-blur">
      <p className="mb-0.5 font-medium text-cx-muted">{label}</p>
      <p className="font-tabular font-semibold text-cx-text">
        {payload[0].value.toLocaleString("pt-BR")} <span className="font-normal text-[#9aa6b4]">clientes</span>
      </p>
    </div>
  );
}

function ToggleButton({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
        active
          // Estado ATIVO é cromo, não ação — então azul institucional (6,4:1
          // com texto branco). O laranja da marca dá só 2,1:1 aqui e reprovava
          // no Lighthouse: em forma cheia ele só aguenta texto branco quando é
          // botão grande de ação, não uma pílula de 12px.
          ? "bg-cx-blue text-white"
          : "bg-cx-surface text-cx-muted hover:bg-cx-bg"
      }`}
    >
      {children}
    </button>
  );
}

export function AnaliseMensalCard({ mensal, semanal }) {
  const [periodo, setPeriodo] = useState("mensal");
  const serie = periodo === "mensal" ? mensal : semanal;
  const chartData = (serie?.labels ?? []).map((label, i) => ({ label, value: serie?.data?.[i] ?? 0 }));

  return (
    <GlassCard className="xl:col-span-2">
      <GlassCardHeader
        icon={TrendingUp}
        title="Análise Mensal"
        subtitle="Dados em tempo real"
        action={
          <div className="flex items-center gap-2">
            <ToggleButton active={periodo === "mensal"} onClick={() => setPeriodo("mensal")}>
              Mensal
            </ToggleButton>
            <ToggleButton active={periodo === "semanal"} onClick={() => setPeriodo("semanal")}>
              Semanal
            </ToggleButton>
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-cx-surface text-cx-muted">
              <SlidersHorizontal className="h-4 w-4" />
            </span>
          </div>
        }
      />

      <div className="mb-1 flex items-center justify-end gap-4 text-[0.7rem] text-cx-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full border-2 border-cx-border bg-transparent" />
          Clientes
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="pulse-dot" />
          Live Data
        </span>
      </div>

      {chartData.length ? (
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={chartData} margin={{ top: 10, right: 10, left: -18, bottom: 0 }}>
            <CartesianGrid stroke={GRID} strokeDasharray="0" vertical={false} />
            <XAxis
              dataKey="label"
              axisLine={{ stroke: GRID }}
              tickLine={false}
              tick={{ fill: AXIS_TEXT, fontSize: 11 }}
            />
            <YAxis axisLine={false} tickLine={false} width={40} tick={{ fill: AXIS_TEXT, fontSize: 11 }} />
            <Tooltip content={<TooltipContent />} cursor={{ stroke: "rgba(255,255,255,0.35)", strokeDasharray: "3 3" }} />
            <Line
              type="monotone"
              dataKey="value"
              stroke={LINE}
              strokeWidth={2}
              dot={{ r: 4, fill: CHART_CHROME.surface, stroke: LINE, strokeWidth: 2 }}
              activeDot={{ r: 6, fill: LINE, stroke: "#ffffff", strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <p className="py-16 text-center text-xs text-cx-muted">Sem dados no período.</p>
      )}
    </GlassCard>
  );
}
