import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { statusInfo } from "@/lib/cliente-status";
import { Painel, PainelTitulo } from "./Painel";

// ZONA 3 (direita) — Fila de atenção: o que precisa de ação, não um relatório.
//
// Cada linha carrega há quantos dias o cliente está parado naquele status —
// é o dado que decide a ordem de ataque — e leva direto para a ficha.
// A flecha de status usa a mesma cor da lista/Kanban: leitura única no sistema.
const diasDesde = (iso) => {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms)) return null;
  return Math.max(0, Math.floor(ms / 86400000));
};

const dataCurta = (iso) => {
  if (!iso) return "";
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return "";
  return data.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
};

export function FilaAtencao({ clientes = [], titulo = "Precisam de atenção", vazio, href, limite = 6, className = "" }) {
  const lista = Array.isArray(clientes)
    ? clientes
        .slice()
        .sort((a, b) => {
          const dataA = new Date(a.updated_at || a.created_at).getTime();
          const dataB = new Date(b.updated_at || b.created_at).getTime();
          return (Number.isNaN(dataA) ? Infinity : dataA) - (Number.isNaN(dataB) ? Infinity : dataB);
        })
        .slice(0, limite)
    : [];

  return (
    <Painel className={`flex flex-col ${className}`}>
      <PainelTitulo
        titulo={titulo}
        descricao="Ordenados por tempo sem movimentação — os mais antigos aparecem primeiro."
        acao={
          href ? (
            <Link
              href={href}
              className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-wb-brand hover:text-wb-info"
            >
              Ver todos <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </Link>
          ) : null
        }
      />

      {lista.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-10 text-center">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-emerald-50 text-wb-good">
            <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
          </span>
          <p className="text-sm font-medium text-wb-text">Tudo em dia</p>
          <p className="text-xs text-wb-muted">{vazio}</p>
        </div>
      ) : (
        <ul className="divide-y divide-wb-border">
          {lista.map((c) => {
            const info = statusInfo(c.status);
            const dias = diasDesde(c.updated_at || c.created_at);
            const atualizacao = dataCurta(c.updated_at || c.created_at);
            return (
              <li key={c.id}>
                <Link
                  href={`/editar-cliente/${c.id}`}
                  className="group -mx-2 flex items-center gap-3 rounded-xl px-2 py-3 transition-colors hover:bg-wb-surface-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-wb-text">{c.nome || "Cliente sem nome"}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.7rem] text-wb-muted">
                      <span className="inline-flex min-w-0 items-center gap-1.5">
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: info.solid }} aria-hidden="true" />
                        <span className="truncate">{info.label}</span>
                      </span>
                      {atualizacao ? <span aria-hidden="true">·</span> : null}
                      {atualizacao ? <span>Atualizado em {atualizacao}</span> : null}
                    </div>
                  </div>
                  {dias !== null && (
                    <span
                      className={`font-tabular shrink-0 rounded-lg px-2 py-1 text-[0.68rem] font-semibold ${
                        dias >= 15
                          ? "bg-red-50 text-wb-bad"
                          : dias >= 7
                            ? "bg-amber-50 text-wb-warn"
                            : "bg-wb-surface-2 text-wb-muted"
                      }`}
                      title={`Parado há ${dias} dia(s) neste status`}
                    >
                      {dias === 0 ? "Hoje" : `${dias}d sem ação`}
                    </span>
                  )}
                  <ArrowRight className="h-4 w-4 shrink-0 text-wb-muted/40 transition group-hover:translate-x-0.5 group-hover:text-wb-brand" aria-hidden="true" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Painel>
  );
}
