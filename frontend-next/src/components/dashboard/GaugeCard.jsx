"use client";

import { RadialBar, RadialBarChart, ResponsiveContainer } from "recharts";
import { GlassCard } from "./GlassCard";

// Anel de progresso + rótulo no centro, título e explicação embaixo.
// Uma métrica por card (não é série categórica), então a cor vem da escala
// de status: verde = aprovado, âmbar = em análise, vermelho = rejeitado.
export function GaugeCard({ value = 0, color, centerLabel, title, subtitle }) {
  const pct = Math.max(0, Math.min(100, value));
  const data = [{ value: pct, fill: color }];

  return (
    <GlassCard className="flex flex-col items-center py-5 text-center">
      <div className="relative h-[120px] w-[120px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart data={data} startAngle={90} endAngle={-270} innerRadius="76%" outerRadius="100%" barSize={9}>
            <RadialBar
              dataKey="value"
              cornerRadius={99}
              background={{ fill: "rgba(255,255,255,0.18)" }}
              isAnimationActive
              animationDuration={900}
              style={{ filter: `drop-shadow(0 0 6px ${color}99)` }}
            />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-tabular text-2xl font-bold leading-none text-cx-text">{pct.toFixed(0)}%</span>
          <span className="mt-0.5 text-[0.65rem] font-medium text-cx-muted">{centerLabel}</span>
        </div>
      </div>

      <h3 className="mt-3 text-sm font-semibold text-cx-text">{title}</h3>
      <p className="mt-0.5 text-xs text-cx-muted">{subtitle}</p>
    </GlassCard>
  );
}
