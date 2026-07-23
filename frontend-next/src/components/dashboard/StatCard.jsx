import { TrendingDown, TrendingUp } from "lucide-react";
import { Sparkline } from "./Sparkline";
import { CHART_COLORS } from "@/lib/chart-colors";

// Stat tile bem compacto — vidro escuro, ícone pequeno, número em
// destaque sem sobra de espaço.
export function StatCard({ icon: Icon, label, value, delta, trend, accent = "orange" }) {
  const hasDelta = typeof delta === "number" && !Number.isNaN(delta);
  const positive = hasDelta && delta >= 0;
  const accentColor = accent === "blue" ? CHART_COLORS.blue : CHART_COLORS.orange;

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-2 transition-colors hover:bg-white/[0.06]">
      <div className="flex items-center justify-between gap-1.5">
        {Icon && (
          <span
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded"
            style={{ background: `${accentColor}1a`, color: accentColor }}
          >
            <Icon className="h-3 w-3" strokeWidth={2} />
          </span>
        )}
        {hasDelta && (
          <span
            className={`font-tabular inline-flex items-center gap-0.5 rounded px-1 py-px text-[0.58rem] font-semibold ${
              positive ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
            }`}
          >
            {positive ? <TrendingUp className="h-2 w-2" /> : <TrendingDown className="h-2 w-2" />}
            {Math.abs(delta).toFixed(1)}%
          </span>
        )}
      </div>

      <p className="font-tabular mt-1 text-base font-bold leading-none text-white">{value}</p>
      <p className="mt-0.5 truncate text-[0.65rem] text-white/45">{label}</p>

      {trend?.length > 1 && (
        <div className="-mx-0.5 mt-1">
          <Sparkline data={trend} color={accentColor} height={14} />
        </div>
      )}
    </div>
  );
}
