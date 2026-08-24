"use client";

import { useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Sector, Tooltip } from "recharts";
import { STATUS_COLORS } from "@/lib/chart-colors";

// Distribuição por status como donut — paleta de status fixa (nunca a
// categórica): verde=aprovado, âmbar=pendente, vermelho=reprovado. Fatia
// ativa "estoura" no hover (Sector customizado) e o total fica no centro,
// como em dashboards financeiros com efeito de destaque.
function TooltipContent({ active, payload }) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div className="rounded-lg border border-cx-border bg-[#0f1c33] px-2.5 py-1.5 text-xs shadow-xl">
      <p className="flex items-center gap-1.5 font-semibold text-cx-text">
        <span className="h-2 w-2 rounded-full" style={{ background: p.payload.color }} />
        {p.value.toLocaleString("pt-BR")} <span className="font-normal text-cx-muted">{p.name}</span>
      </p>
    </div>
  );
}

function renderActiveShape(props) {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 6}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        style={{ filter: `drop-shadow(0 0 6px ${fill}90)` }}
      />
    </g>
  );
}

export function StatusBreakdownChart({ aprovados, reprovados, pendentes }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const data = [
    { name: "Aprovados", value: aprovados ?? 0, color: STATUS_COLORS.good },
    { name: "Pendentes", value: pendentes ?? 0, color: STATUS_COLORS.warning },
    { name: "Reprovados", value: reprovados ?? 0, color: STATUS_COLORS.critical },
  ];
  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={150}>
        <PieChart>
          <Tooltip content={<TooltipContent />} />
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={44}
            outerRadius={62}
            paddingAngle={3}
            cornerRadius={4}
            stroke="none"
            activeIndex={activeIndex}
            activeShape={renderActiveShape}
            onMouseEnter={(_, i) => setActiveIndex(i)}
            isAnimationActive
            animationDuration={700}
          >
            {data.map((d) => (
              <Cell key={d.name} fill={d.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>

      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-tabular text-lg font-bold text-cx-text">{total.toLocaleString("pt-BR")}</span>
        <span className="text-[0.6rem] uppercase tracking-wide text-cx-muted">clientes</span>
      </div>

      <div className="mt-2 flex items-center justify-center gap-3 text-[0.65rem] text-cx-muted">
        {data.map((d) => (
          <span key={d.name} className="inline-flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: d.color }} />
            {d.name}
          </span>
        ))}
      </div>
    </div>
  );
}
