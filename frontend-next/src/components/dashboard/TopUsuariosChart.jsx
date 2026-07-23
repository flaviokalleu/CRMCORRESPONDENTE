"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CHART_CHROME, CHART_COLORS } from "@/lib/chart-colors";

// Ranking (identidade, não categoria) → uma única cor, ordenado por
// magnitude, barras horizontais para caber nomes longos sem rotacionar o
// texto do eixo.
function TooltipContent({ active, payload }) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div className="rounded-lg border border-white/10 bg-[#0a1122] px-3 py-2 text-xs shadow-xl">
      <p className="font-semibold text-white">
        {p.value.toLocaleString("pt-BR")} <span className="font-normal text-white/40">clientes</span>
      </p>
    </div>
  );
}

export function TopUsuariosChart({ usuarios }) {
  if (!usuarios?.length) {
    return <p className="py-8 text-center text-xs text-white/40">Sem dados de ranking ainda.</p>;
  }

  const data = usuarios.map((u) => ({
    nome: `${u.user?.first_name ?? ""} ${u.user?.last_name ?? ""}`.trim() || u.user?.email || "—",
    clientes: u.clientes,
  }));

  return (
    <ResponsiveContainer width="100%" height={Math.max(140, data.length * 32)}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }} barGap={2}>
        <CartesianGrid horizontal={false} stroke={CHART_CHROME.gridline} />
        <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: CHART_CHROME.textMuted, fontSize: 11 }} />
        <YAxis
          type="category"
          dataKey="nome"
          axisLine={false}
          tickLine={false}
          width={120}
          tick={{ fill: CHART_CHROME.textSecondary, fontSize: 12 }}
        />
        <Tooltip content={<TooltipContent />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
        <Bar dataKey="clientes" radius={[0, 4, 4, 0]} maxBarSize={22}>
          {data.map((_, i) => (
            <Cell key={i} fill={i === 0 ? CHART_COLORS.orange : CHART_COLORS.blue} fillOpacity={i === 0 ? 1 : 1 - i * 0.14} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
