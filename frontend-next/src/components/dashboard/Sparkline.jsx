"use client";

import { useId } from "react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";

// Mini gráfico de tendência dentro de um stat tile — sem eixos, sem
// tooltip, só a forma da série. Decorativo por natureza (o número já
// carrega o valor exato), então marcado aria-hidden. ID do gradiente via
// useId (não a cor) — evita colisão de <linearGradient> quando duas
// sparklines usam a mesma cor na mesma página.
export function Sparkline({ data, color, height = 36 }) {
  const chartData = data.map((v, i) => ({ i, v }));
  const id = `spark-${useId().replace(/[:]/g, "")}`;

  return (
    <div className="w-full" style={{ height }} aria-hidden="true">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.4} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} fill={`url(#${id})`} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
