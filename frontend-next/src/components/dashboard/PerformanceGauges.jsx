import { RadialGauge } from "./RadialGauge";
import { STATUS_COLORS } from "@/lib/chart-colors";

export function PerformanceGauges({ taxaAprovacao, taxaRejeicao, eficienciaMedia }) {
  const items = [
    { label: "Aprovação", value: taxaAprovacao ?? 0, color: STATUS_COLORS.good },
    { label: "Rejeição", value: taxaRejeicao ?? 0, color: STATUS_COLORS.critical },
    { label: "Eficiência", value: eficienciaMedia ?? 0, color: STATUS_COLORS.warning },
  ];

  return (
    <div className="flex items-center justify-around gap-2 py-1">
      {items.map((it) => (
        <div key={it.label} className="flex flex-col items-center gap-1.5">
          <RadialGauge value={it.value} color={it.color} size={76} />
          <span className="text-[0.65rem] text-white/50">{it.label}</span>
        </div>
      ))}
    </div>
  );
}
