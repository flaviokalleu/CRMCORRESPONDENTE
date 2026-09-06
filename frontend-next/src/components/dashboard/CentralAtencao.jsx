import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock3, ShieldAlert, UserRound } from "lucide-react";
import { statusInfo } from "@/lib/cliente-status";
import { Painel, PainelTitulo } from "./Painel";

const DAY = 86_400_000;

const daysSince = (iso) => {
  if (!iso) return 0;
  const value = new Date(iso).getTime();
  return Number.isNaN(value) ? 0 : Math.max(0, Math.floor((Date.now() - value) / DAY));
};

const shortDate = (iso) => {
  if (!iso) return "—";
  const value = new Date(iso);
  return Number.isNaN(value.getTime()) ? "—" : value.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
};

const nextAction = (status, type) => {
  const key = (status || "").toLowerCase();
  if (key.includes("document")) return "Conferir e cobrar documentos";
  if (key.includes("aguardando_aprov") || key.includes("análise") || key.includes("analise")) return "Analisar crédito e registrar decisão";
  if (key.includes("condicionado")) return "Revisar condicionantes do dossiê";
  if (key.includes("proposta")) return "Dar retorno sobre a proposta";
  if (key.includes("reserva")) return "Validar reserva e orçamento";
  if (type === "info") return "Realizar o primeiro contato";
  return "Atualizar andamento e próxima etapa";
};

function mergeItems(clientes, alertas, sla) {
  const map = new Map();
  for (const cliente of Array.isArray(clientes) ? clientes : []) {
    const updatedAt = cliente.updated_at || cliente.created_at;
    map.set(cliente.id, {
      id: cliente.id,
      nome: cliente.nome || "Cliente sem nome",
      status: cliente.status,
      responsavel: cliente.responsavel_nome || "Sem responsável",
      updatedAt,
      type: "warning",
      motivo: "Fila de atenção",
    });
  }
  for (const alert of Array.isArray(alertas?.notifications) ? alertas.notifications : []) {
    if (!alert.cliente_id) continue;
    const previous = map.get(alert.cliente_id);
    const updatedAt = alert.updated_at || alert.created_at;
    map.set(alert.cliente_id, {
      id: alert.cliente_id,
      nome: alert.cliente_nome || previous?.nome || "Cliente sem nome",
      status: alert.status || previous?.status || "",
      responsavel: alert.responsavel_nome || previous?.responsavel || "Sem responsável",
      updatedAt: previous?.updatedAt || updatedAt,
      type: alert.type === "alert" || previous?.type === "alert" ? "alert" : (previous?.type || alert.type),
      motivo: alert.type === "alert" ? alert.title : (previous?.motivo || alert.title),
    });
  }
  return Array.from(map.values())
    .map((item) => {
      const dias = daysSince(item.updatedAt);
      const nivel = dias > sla ? "vencido" : dias >= Math.ceil(sla * 0.7) ? "risco" : "prazo";
      return { ...item, dias, nivel, proximaAcao: nextAction(item.status, item.type) };
    })
    .sort((a, b) => {
      const weight = { vencido: 3, risco: 2, prazo: 1 };
      return weight[b.nivel] - weight[a.nivel] || b.dias - a.dias;
    });
}

const SLA_STYLE = {
  vencido: "border-red-200 bg-red-50 text-wb-bad",
  risco: "border-amber-200 bg-amber-50 text-wb-warn",
  prazo: "border-emerald-200 bg-emerald-50 text-wb-good",
};

export function CentralAtencao({ clientes, alertas, sla = 7, href, className = "" }) {
  const items = mergeItems(clientes, alertas, sla);
  const vencidos = items.filter((item) => item.nivel === "vencido").length;
  const emRisco = items.filter((item) => item.nivel === "risco").length;
  const noPrazo = items.filter((item) => item.nivel === "prazo").length;
  const conformidade = items.length ? (noPrazo / items.length) * 100 : 100;

  return (
    <Painel id="alertas" className={`scroll-mt-20 ${className}`}>
      <PainelTitulo
        titulo="Central de atenção"
        descricao="Fila e alertas reunidos por cliente, com responsável, prazo e próxima ação."
        acao={
          <Link href={href} className="inline-flex items-center gap-1 text-xs font-semibold text-wb-brand hover:text-wb-info">
            Ver carteira <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        }
      />

      {items.length === 0 ? (
        <div className="flex items-center justify-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50/60 px-4 py-7 text-center">
          <CheckCircle2 className="h-6 w-6 text-wb-good" aria-hidden="true" />
          <div className="text-left">
            <p className="text-sm font-semibold text-wb-text">Operação em dia</p>
            <p className="text-xs text-wb-muted">Nenhuma situação ativa exige acompanhamento agora.</p>
          </div>
        </div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_250px]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead>
                <tr className="border-b border-wb-border text-[0.62rem] font-bold uppercase tracking-[0.1em] text-wb-muted">
                  <th className="pb-2.5 pr-3">Cliente e etapa</th>
                  <th className="px-3 pb-2.5">Responsável</th>
                  <th className="px-3 pb-2.5">Última ação</th>
                  <th className="px-3 pb-2.5">SLA</th>
                  <th className="pl-3 pb-2.5">Próxima ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-wb-border">
                {items.slice(0, 8).map((item) => {
                  const status = statusInfo(item.status);
                  return (
                    <tr key={item.id} className="group">
                      <td className="py-3 pr-3">
                        <Link href={`/editar-cliente/${item.id}`} className="block min-w-0">
                          <p className="truncate text-sm font-semibold text-wb-text group-hover:text-wb-brand">{item.nome}</p>
                          <span className="mt-1 inline-flex items-center gap-1.5 text-[0.68rem] text-wb-muted">
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: status.solid }} />
                            {status.label}
                          </span>
                        </Link>
                      </td>
                      <td className="px-3 py-3 text-xs text-wb-muted">
                        <span className="inline-flex items-center gap-1.5"><UserRound className="h-3.5 w-3.5" />{item.responsavel}</span>
                      </td>
                      <td className="font-tabular px-3 py-3 text-xs text-wb-muted">
                        {shortDate(item.updatedAt)} · {item.dias === 0 ? "hoje" : `há ${item.dias}d`}
                      </td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex rounded-md border px-2 py-1 text-[0.66rem] font-bold ${SLA_STYLE[item.nivel]}`}>
                          {item.nivel === "vencido" ? `${item.dias - sla}d vencido` : item.nivel === "risco" ? "Em risco" : "No prazo"}
                        </span>
                      </td>
                      <td className="pl-3 py-3">
                        <Link href={`/editar-cliente/${item.id}`} className="inline-flex items-center gap-1 text-xs font-semibold text-wb-brand hover:text-wb-info">
                          {item.proximaAcao}<ArrowRight className="h-3 w-3 shrink-0" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <aside className="rounded-xl border border-wb-border bg-wb-surface-2 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[0.65rem] font-bold uppercase tracking-[0.1em] text-wb-muted">Conformidade SLA</p>
                <p className="font-tabular mt-1 text-3xl font-semibold tracking-[-0.04em] text-wb-text">
                  {conformidade.toFixed(0)}%
                </p>
              </div>
              <span className={`grid h-9 w-9 place-items-center rounded-lg ${vencidos ? "bg-red-50 text-wb-bad" : "bg-emerald-50 text-wb-good"}`}>
                {vencidos ? <ShieldAlert className="h-4 w-4" /> : <Clock3 className="h-4 w-4" />}
              </span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
              <div className="h-full rounded-full bg-wb-good" style={{ width: `${conformidade}%` }} />
            </div>
            <dl className="mt-4 space-y-2.5 text-xs">
              <div className="flex justify-between"><dt className="text-wb-muted">Vencidos</dt><dd className="font-tabular font-semibold text-wb-bad">{vencidos}</dd></div>
              <div className="flex justify-between"><dt className="text-wb-muted">Em risco</dt><dd className="font-tabular font-semibold text-wb-warn">{emRisco}</dd></div>
              <div className="flex justify-between"><dt className="text-wb-muted">No prazo</dt><dd className="font-tabular font-semibold text-wb-good">{noPrazo}</dd></div>
              <div className="flex justify-between border-t border-wb-border pt-2.5"><dt className="text-wb-muted">Prazo configurado</dt><dd className="font-tabular font-semibold text-wb-text">{sla} dias</dd></div>
            </dl>
          </aside>
        </div>
      )}
    </Painel>
  );
}
