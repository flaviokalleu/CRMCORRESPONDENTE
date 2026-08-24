"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CHART_CHROME, CHART_COLORS } from "@/lib/chart-colors";

// Duas séries (esta semana vs semana anterior) → mesmo eixo, cores
// categóricas na ordem fixa (slot 1 laranja, slot 2 azul), gap de 2px entre
// barras adjacentes, legenda sempre visível com 2+ séries.
function TooltipContent({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-cx-border bg-cx-surface px-3 py-2 text-xs shadow-xl">
      <p className="mb-1.5 font-medium text-cx-muted">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="flex items-center gap-1.5 text-cx-text">
          <span className="h-2 w-2 rounded-full" style={{ background: p.fill }} />
          {p.value.toLocaleString("pt-BR")}
          <span className="font-normal text-cx-muted">{p.name}</span>
        </p>
      ))}
    </div>
  );
}

function LegendContent({ payload }) {
  return (
    <div className="mt-2 flex items-center justify-center gap-5 text-xs text-cx-muted">
      {payload.map((p) => (
        <span key={p.value} className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          {p.value}
        </span>
      ))}
    </div>
  );
}

export function WeeklyChart({ labels, atual, anterior }) {
  const chartData = labels.map((label, i) => ({
    label,
    "Esta semana": atual[i] ?? 0,
    "Semana anterior": anterior[i] ?? 0,
  }));

  return (
    <ResponsiveContainer width="100%" height={190}>
      <BarChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }} barGap={2}>
        <CartesianGrid vertical={false} stroke={CHART_CHROME.gridline} />
        <XAxis
          dataKey="label"
          axisLine={{ stroke: CHART_CHROME.axis }}
          tickLine={false}
          tick={{ fill: CHART_CHROME.textMuted, fontSize: 11 }}
        />
        <YAxis axisLine={false} tickLine={false} width={36} tick={{ fill: CHART_CHROME.textMuted, fontSize: 11 }} />
        <Tooltip content={<TooltipContent />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
        <Legend content={<LegendContent />} />
        <Bar dataKey="Esta semana" fill={CHART_COLORS.white} radius={[4, 4, 0, 0]} maxBarSize={28} />
        <Bar dataKey="Semana anterior" fill={CHART_COLORS.navy} radius={[4, 4, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}
