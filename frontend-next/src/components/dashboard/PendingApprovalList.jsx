import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";

export function PendingApprovalList({ clientes }) {
  if (!clientes?.length) {
    return <p className="py-6 text-center text-xs text-cx-muted">Nenhum cliente aguardando aprovação.</p>;
  }

  return (
    <ul className="divide-y divide-cx-border">
      {clientes.slice(0, 6).map((c) => (
        <li key={c.id}>
          <Link
            href={`/editar-cliente/${c.id}`}
            className="flex items-center justify-between gap-3 py-2.5 text-sm transition-colors hover:text-cx-text"
          >
            <span className="flex items-center gap-2.5 truncate text-cx-muted">
              <Clock className="h-3.5 w-3.5 shrink-0 text-cx-orange-text" />
              <span className="truncate">{c.nome || "Sem nome"}</span>
            </span>
            <ArrowRight className="h-3.5 w-3.5 shrink-0 text-cx-muted" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
