"use client";

import { RadialBar, RadialBarChart, ResponsiveContainer } from "recharts";

// Gauge radial — uma métrica única (0–100%) como anel de progresso com
// glow. Usa uma cor por vez (não é categórico), então não entra na
// paleta multi-série — só o tom de acento do painel.
export function RadialGauge({ value, color, size = 96 }) {
  const data = [{ value: Math.max(0, Math.min(100, value)), fill: color }];

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          data={data}
          startAngle={90}
          endAngle={-270}
          innerRadius="72%"
          outerRadius="100%"
          barSize={7}
        >
          <RadialBar
            dataKey="value"
            cornerRadius={99}
            background={{ fill: "rgba(255,255,255,0.07)" }}
            isAnimationActive
            animationDuration={900}
            style={{ filter: `drop-shadow(0 0 5px ${color}80)` }}
          />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <span className="font-tabular text-sm font-bold text-white">{value.toFixed(0)}%</span>
      </div>
    </div>
  );
}
