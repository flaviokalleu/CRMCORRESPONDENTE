import Link from "next/link";
import { ArrowRight, Inbox } from "lucide-react";
import { statusInfo } from "@/lib/cliente-status";

const diasDesde = (iso) => {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms)) return null;
  return Math.max(0, Math.floor(ms / 86400000));
};

// Fila de trabalho: a lista do que precisa de AÇÃO, não um relatório.
//
// Por isso cada linha carrega há quantos dias o cliente está parado naquele
// status — é o dado que decide a ordem de atacar — e leva direto para a ficha.
// A flecha de status usa a mesma cor da lista/Kanban, então a leitura é a
// mesma em todo o sistema.
export function FilaTrabalho({ clientes = [], titulo, vazio, href, limite = 6 }) {
  const lista = Array.isArray(clientes) ? clientes.slice(0, limite) : [];

  return (
    <section className="rounded-xl border border-cx-border bg-cx-surface p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-cx-text">{titulo}</h2>
        {href && (
          <Link
            href={href}
            className="inline-flex items-center gap-1 text-[0.7rem] font-semibold text-cx-blue hover:underline"
          >
            Ver todos <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </Link>
        )}
      </div>

      {lista.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <Inbox className="h-6 w-6 text-cx-border" aria-hidden="true" />
          <p className="text-xs text-cx-muted">{vazio}</p>
        </div>
      ) : (
        <ul className="mt-3 divide-y divide-cx-border">
          {lista.map((c) => {
            const info = statusInfo(c.status);
            const dias = diasDesde(c.updated_at || c.created_at);
            return (
              <li key={c.id}>
                <Link
                  href={`/editar-cliente/${c.id}`}
                  className="flex items-center gap-3 py-2.5 transition-colors hover:bg-cx-bg"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-cx-text">{c.nome || "—"}</p>
                    <span
                      className="cx-chevron mt-1 inline-flex w-[150px] items-center py-0.5 pl-2 text-[0.62rem] font-semibold text-white"
                      style={{ backgroundColor: info.solid }}
                      title={info.label}
                    >
                      <span className="truncate">{info.label}</span>
                    </span>
                  </div>
                  {dias !== null && (
                    <span
                      className={`font-tabular shrink-0 rounded-md px-1.5 py-0.5 text-[0.65rem] font-semibold ${
                        dias >= 15
                          ? "bg-red-50 text-red-700"
                          : dias >= 7
                            ? "bg-amber-50 text-amber-700"
                            : "bg-cx-bg text-cx-muted"
                      }`}
                      title={`Parado há ${dias} dia(s) neste status`}
                    >
                      {dias}d
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
