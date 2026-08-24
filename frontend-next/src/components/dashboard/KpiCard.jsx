import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

// Stat tile: um número por cartão, com rótulo, contexto e variação opcional.
//
// É o "não-gráfico" da vez — quando o dado é UM valor, plotá-lo não acrescenta
// nada; o número grande é a forma certa. A variação vem com seta + sinal, e
// nunca só com cor: verde/vermelho sozinhos excluem quem não distingue matiz.
export function KpiCard({ icon: Icon, label, value, hint, delta, invertDelta = false, href }) {
  const temDelta = typeof delta === "number" && Number.isFinite(delta);
  // Em métricas onde crescer é ruim (rejeições, fila parada), `invertDelta`
  // troca o significado sem trocar a leitura do sinal.
  const bom = temDelta && (invertDelta ? delta < 0 : delta > 0);
  const neutro = temDelta && Math.abs(delta) < 0.05;
  const SetaIcone = neutro ? Minus : delta > 0 ? ArrowUpRight : ArrowDownRight;

  const corpo = (
    <>
      <div className="flex items-start justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1.5 text-[0.7rem] font-medium uppercase tracking-wide text-cx-muted">
          {Icon && <Icon className="h-3.5 w-3.5 shrink-0" />}
          <span className="truncate">{label}</span>
        </span>
      </div>

      <p className="font-tabular mt-2 text-2xl font-bold leading-none text-cx-text">{value}</p>

      <div className="mt-2 flex items-center gap-2">
        {temDelta && (
          <span
            className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[0.68rem] font-semibold ${
              neutro
                ? "bg-cx-bg text-cx-muted"
                : bom
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-red-50 text-red-700"
            }`}
          >
            <SetaIcone className="h-3 w-3" aria-hidden="true" />
            {neutro ? "estável" : `${delta > 0 ? "+" : ""}${delta.toFixed(1)}%`}
          </span>
        )}
        {hint && <span className="truncate text-[0.68rem] text-cx-muted">{hint}</span>}
      </div>
    </>
  );

  const classe =
    "block rounded-xl border border-cx-border bg-cx-surface px-4 py-3.5 transition-colors";

  return href ? (
    <Link href={href} className={`${classe} hover:border-cx-blue`}>
      {corpo}
    </Link>
  ) : (
    <div className={classe}>{corpo}</div>
  );
}
