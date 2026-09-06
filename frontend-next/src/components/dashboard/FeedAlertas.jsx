import Link from "next/link";
import { ArrowUpRight, CheckCircle2, CircleAlert } from "lucide-react";
import { Painel, PainelTitulo } from "./Painel";

// ZONA 2 — Alertas operacionais: onde estão os problemas.
//
// Feed tipado das notificações geradas pelo backend (warning|info|alert) —
// a cor do ponto identifica a severidade, o texto informa. O contador de
// não lidos aparece no topo como chip.
const TOM_PONTO = {
  warning: "var(--color-wb-warn)",
  alert: "var(--color-wb-bad)",
  info: "var(--color-wb-info)",
};

const fmtData = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
};

export function FeedAlertas({ alertas, className = "" }) {
  const lista = Array.isArray(alertas?.notifications) ? alertas.notifications.slice(0, 6) : [];
  const naoLidos = alertas?.unreadCount ?? 0;

  return (
    <Painel id="alertas" className={`flex scroll-mt-20 flex-col ${className}`}>
      <PainelTitulo
        titulo="Alertas operacionais"
        descricao="Eventos recentes que podem mudar a prioridade do time."
        acao={
          naoLidos > 0 ? (
            <span className="wb-chip !border-red-200 !bg-red-50 !text-wb-bad">
              {naoLidos} {naoLidos === 1 ? "não lido" : "não lidos"}
            </span>
          ) : null
        }
      />

      {!alertas ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-8 text-center">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-red-50 text-wb-bad">
            <CircleAlert className="h-5 w-5" aria-hidden="true" />
          </span>
          <p className="text-sm font-medium text-wb-text">Alertas indisponíveis</p>
          <p className="text-xs text-wb-muted">Atualize a página para tentar novamente.</p>
        </div>
      ) : lista.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-8 text-center">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-emerald-50 text-wb-good">
            <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
          </span>
          <p className="text-sm font-medium text-wb-text">Operação tranquila</p>
          <p className="text-xs text-wb-muted">Nenhum alerta no momento.</p>
        </div>
      ) : (
        <ul className="-mr-2 max-h-[270px] divide-y divide-wb-border overflow-y-auto pr-2">
          {lista.map((a, i) => {
            const conteudo = (
              <>
                <span
                  className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: TOM_PONTO[a.type] ?? TOM_PONTO.info }}
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate text-xs font-semibold text-wb-text">{a.title}</p>
                    <span className="font-tabular shrink-0 text-[0.65rem] text-wb-muted">
                      {fmtData(a.created_at)}
                    </span>
                  </div>
                  {a.message ? (
                    <p className="mt-1 line-clamp-2 text-[0.72rem] leading-relaxed text-wb-muted">
                      {a.message}
                    </p>
                  ) : null}
                </div>
                {a.cliente_id ? (
                  <ArrowUpRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-wb-muted/40 transition group-hover:text-wb-brand" aria-hidden="true" />
                ) : null}
              </>
            );

            return (
              <li key={`${a.created_at ?? i}-${i}`}>
                {a.cliente_id ? (
                  <Link
                    href={`/editar-cliente/${a.cliente_id}`}
                    className="group -mx-2 flex items-start gap-2.5 rounded-xl px-2 py-3 transition-colors hover:bg-wb-surface-2"
                  >
                    {conteudo}
                  </Link>
                ) : (
                  <div className="flex items-start gap-2.5 py-3">{conteudo}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Painel>
  );
}
