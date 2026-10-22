import { BellRing, CheckCircle2, Gauge, Target } from "@/components/icons";

const fmt = (n) => (n ?? 0).toLocaleString("pt-BR");
const fmtPct = (n) => (n == null ? "—" : `${n.toFixed(1).replace(".", ",")}%`);
const clamp = (n) => Math.min(100, Math.max(0, n ?? 0));

// Quadro de ícone tintado + barra no tom do status (MetricCard do kit).
const TONS = {
  good: { icon: "bg-green-100 text-green-600", bar: "bg-green-500" },
  warn: { icon: "bg-amber-100 text-amber-600", bar: "bg-amber-500" },
  bad: { icon: "bg-red-100 text-red-600", bar: "bg-red-500" },
  info: { icon: "bg-navy-soft text-primary", bar: "bg-primary" },
};

function MetaCard({ icon: Icon, label, value, hint, progress, tone = "info" }) {
  const style = TONS[tone];
  return (
    <article className="ref-kpi ref-meta">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p>{label}</p>
          <div className="ref-kpi-value"><strong className="font-tabular">{value}</strong></div>
          <small title={hint}>{hint}</small>
        </div>
        <span className={`ref-kpi-icon ${style.icon}`}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>
      {progress != null ? (
        <div className="ref-meta-bar" aria-hidden="true">
          <div className={style.bar} style={{ width: `${clamp(progress)}%` }} />
        </div>
      ) : null}
    </article>
  );
}

export function MetasGerenciais({ aprovacao, resolucao, meta, slaResumo, alertas, totalPeriodo }) {
  const aprovacaoTone = aprovacao == null ? "warn" : aprovacao >= meta ? "good" : "warn";
  const slaTone = slaResumo.vencidos > 0 ? "bad" : slaResumo.emRisco > 0 ? "warn" : "good";

  return (
    <section aria-label="Metas e nível de serviço">
      <div className="ref-kpis ref-metas">
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
