"use client";

import { TrendingDown, TrendingUp } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip } from "recharts";
import { CHART_COLORS } from "@/lib/chart-colors";

// Métrica principal — mesmo tamanho compacto dos outros tiles, só com uma
// sparkline mensal completa ao fundo em vez de um recorte curto.
function TooltipContent({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-cx-border bg-[#0f1c33] px-2.5 py-1.5 text-[0.7rem] shadow-xl">
      <span className="font-tabular text-cx-text">{payload[0].value.toLocaleString("pt-BR")}</span>
      <span className="ml-1 text-cx-muted">{label}</span>
    </div>
  );
}

export function HeroMetric({ label, value, delta, labels, data }) {
  const hasDelta = typeof delta === "number" && !Number.isNaN(delta);
  const positive = hasDelta && delta >= 0;
  const chartData = labels.map((l, i) => ({ label: l, v: data[i] ?? 0 }));

  return (
    <div className="relative flex flex-col overflow-hidden rounded-lg border border-cx-border bg-cx-surface px-2.5 py-2 transition-colors hover:bg-cx-surface">
      <div className="flex items-center justify-between gap-1.5">
        <p className="truncate text-[0.65rem] text-cx-muted">{label}</p>
        {hasDelta && (
          <span
            className={`font-tabular inline-flex shrink-0 items-center gap-0.5 rounded px-1 py-px text-[0.58rem] font-semibold ${
              positive ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
            }`}
          >
            {positive ? <TrendingUp className="h-2 w-2" /> : <TrendingDown className="h-2 w-2" />}
            {Math.abs(delta).toFixed(1)}%
          </span>
        )}
      </div>

      <span className="font-tabular mt-1 text-base font-bold leading-none text-cx-text">{value}</span>

      {chartData.length > 1 && (
        <div className="-mx-0.5 mt-1 h-3.5 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 1, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="heroFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART_COLORS.white} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={CHART_COLORS.white} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Tooltip content={<TooltipContent />} cursor={{ stroke: "rgba(255,255,255,0.15)", strokeDasharray: "3 3" }} />
              <Area type="monotone" dataKey="v" stroke={CHART_COLORS.white} strokeWidth={1.5} fill="url(#heroFill)" isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
