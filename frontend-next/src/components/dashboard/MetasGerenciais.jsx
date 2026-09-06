import { BellRing, CheckCircle2, Gauge, Target } from "lucide-react";

const fmt = (n) => (n ?? 0).toLocaleString("pt-BR");
const fmtPct = (n) => (n == null ? "—" : `${n.toFixed(1).replace(".", ",")}%`);
const clamp = (n) => Math.min(100, Math.max(0, n ?? 0));

const TONS = {
  good: { icon: "bg-emerald-50 text-wb-good", bar: "bg-wb-good", value: "text-wb-good" },
  warn: { icon: "bg-amber-50 text-wb-warn", bar: "bg-wb-warn", value: "text-wb-warn" },
  bad: { icon: "bg-red-50 text-wb-bad", bar: "bg-wb-bad", value: "text-wb-bad" },
  info: { icon: "bg-blue-50 text-wb-brand", bar: "bg-wb-brand", value: "text-wb-brand" },
};

function MetaCard({ icon: Icon, label, value, hint, progress, tone = "info" }) {
  const style = TONS[tone];
  return (
    <article className="wb-panel min-w-0 p-4">
      <div className="flex items-start gap-3">
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${style.icon}`}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.1em] text-wb-muted">{label}</p>
          <p className={`font-tabular mt-1 text-2xl font-semibold tracking-[-0.04em] ${style.value}`}>{value}</p>
          <p className="mt-1 truncate text-[0.7rem] text-wb-muted" title={hint}>{hint}</p>
        </div>
      </div>
      {progress != null ? (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-wb-surface-2" aria-hidden="true">
          <div className={`h-full rounded-full ${style.bar}`} style={{ width: `${clamp(progress)}%` }} />
        </div>
      ) : null}
    </article>
  );
}

export function MetasGerenciais({ aprovacao, resolucao, meta, slaResumo, alertas, totalPeriodo }) {
  const aprovacaoTone = aprovacao == null ? "warn" : aprovacao >= meta ? "good" : "warn";
  const slaTone = slaResumo.vencidos > 0 ? "bad" : slaResumo.emRisco > 0 ? "warn" : "good";

  return (
    <section aria-labelledby="metas-title">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="wb-eyebrow">Governança</p>
          <h2 id="metas-title" className="mt-1 text-base font-semibold tracking-[-0.02em] text-wb-text">
            Metas e nível de serviço
          </h2>
        </div>
        <p className="text-xs text-wb-muted">Indicadores com base, meta e prazo explícitos.</p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetaCard
          icon={Target}
          label="Aprovação das decisões"
          value={fmtPct(aprovacao)}
          hint={aprovacao == null ? "Sem decisões concluídas no período" : `Meta gerencial de ${meta}%`}
          progress={aprovacao}
          tone={aprovacaoTone}
        />
        <MetaCard
          icon={CheckCircle2}
          label="Resolução do período"
          value={fmtPct(resolucao)}
          hint={`${fmt(totalPeriodo)} ${totalPeriodo === 1 ? "entrada analisada" : "entradas analisadas"}`}
          progress={resolucao}
          tone={(resolucao ?? 0) >= 50 ? "good" : "info"}
        />
        <MetaCard
          icon={Gauge}
          label={`SLA de ${slaResumo.sla} dias`}
          value={fmtPct(slaResumo.conformidade)}
          hint={`${fmt(slaResumo.vencidos)} vencido${slaResumo.vencidos === 1 ? "" : "s"} · ${fmt(slaResumo.emRisco)} em risco`}
          progress={slaResumo.conformidade}
          tone={slaTone}
        />
        <MetaCard
          icon={BellRing}
          label="Situações ativas"
          value={fmt(alertas)}
          hint={alertas === 1 ? "1 cliente requer acompanhamento" : `${fmt(alertas)} clientes requerem acompanhamento`}
          tone={alertas > 0 ? "warn" : "good"}
        />
      </div>
    </section>
  );
}
