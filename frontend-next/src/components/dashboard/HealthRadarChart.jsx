"use client";

import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { CHART_CHROME, CHART_COLORS } from "@/lib/chart-colors";

// Radar de saúde do negócio — 5 indicadores normalizados em 0–100 no mesmo
// eixo (todos "quanto maior, melhor"), série única (não é comparação
// categórica, é o perfil de UMA entidade: o negócio agora). Preenchimento
// em gradiente com leve glow na borda.
function TooltipContent({ active, payload }) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div className="rounded-lg border border-white/10 bg-[#0f1c33] px-2.5 py-1.5 text-xs shadow-xl">
      <p className="font-semibold text-white">
        {p.payload.subject}: {p.value.toFixed(1)}%
      </p>
    </div>
  );
}

const clamp = (n) => Math.max(0, Math.min(100, n ?? 0));

export function HealthRadarChart({ taxaAprovacao, eficienciaMedia, taxaRejeicao, crescimentoMensal, crescimentoSemanal }) {
  const data = [
    { subject: "Aprovação", value: clamp(taxaAprovacao) },
    { subject: "Eficiência", value: clamp(eficienciaMedia) },
    { subject: "Retenção", value: clamp(100 - (taxaRejeicao ?? 0)) },
    { subject: "Cresc. mensal", value: clamp(crescimentoMensal) },
    { subject: "Cresc. semanal", value: clamp(crescimentoSemanal) },
  ];

  return (
    <ResponsiveContainer width="100%" height={210}>
      <RadarChart data={data} outerRadius="72%">
        <defs>
          <radialGradient id="radarFill">
            <stop offset="0%" stopColor={CHART_COLORS.orange} stopOpacity={0.55} />
            <stop offset="100%" stopColor={CHART_COLORS.orange} stopOpacity={0.08} />
          </radialGradient>
        </defs>
        <PolarGrid stroke={CHART_CHROME.gridline} />
        <PolarAngleAxis dataKey="subject" tick={{ fill: CHART_CHROME.textSecondary, fontSize: 10.5 }} />
        <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
        <Tooltip content={<TooltipContent />} />
        <Radar
          dataKey="value"
          stroke={CHART_COLORS.orange}
          strokeWidth={2}
          fill="url(#radarFill)"
          isAnimationActive
          animationDuration={800}
          style={{ filter: `drop-shadow(0 0 4px ${CHART_COLORS.orange}70)` }}
          dot={{ r: 3, fill: CHART_COLORS.orange, stroke: CHART_CHROME.surface, strokeWidth: 1.5 }}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
