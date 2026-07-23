"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CHART_CHROME, CHART_COLORS } from "@/lib/chart-colors";

// Série única (evolução mensal de clientes) → um eixo, uma cor, área
// preenchida com gradiente até a superfície. Grid/eixos recessivos,
// tooltip com crosshair no hover.
function TooltipContent({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-white/10 bg-[#0a1122] px-3 py-2 text-xs shadow-xl">
      <p className="mb-1 font-medium text-white/70">{label}</p>
      <p className="font-semibold text-white">
        {payload[0].value.toLocaleString("pt-BR")} <span className="font-normal text-white/40">clientes</span>
      </p>
    </div>
  );
}

export function MonthlyChart({ labels, data }) {
  const chartData = labels.map((label, i) => ({ label, value: data[i] ?? 0 }));

  return (
    <ResponsiveContainer width="100%" height={190}>
      <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="monthlyFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CHART_COLORS.orange} stopOpacity={0.35} />
            <stop offset="100%" stopColor={CHART_COLORS.orange} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke={CHART_CHROME.gridline} />
        <XAxis
          dataKey="label"
          axisLine={{ stroke: CHART_CHROME.axis }}
          tickLine={false}
          tick={{ fill: CHART_CHROME.textMuted, fontSize: 11 }}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          width={36}
          tick={{ fill: CHART_CHROME.textMuted, fontSize: 11 }}
        />
        <Tooltip content={<TooltipContent />} cursor={{ stroke: CHART_CHROME.axis, strokeDasharray: "3 3" }} />
        <Area
          type="monotone"
          dataKey="value"
          stroke={CHART_COLORS.orange}
          strokeWidth={2}
          fill="url(#monthlyFill)"
          activeDot={{ r: 4, fill: CHART_COLORS.orange, stroke: CHART_CHROME.surface, strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
