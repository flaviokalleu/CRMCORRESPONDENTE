import Link from "next/link";
import { PERIODOS } from "@/lib/financeiro";

// Filtro de período a um toque (lei de Hick: 4 opções fixas em vez de dois
// campos de data). Vai na URL (?periodo=…) para o link poder ser guardado.
export function PeriodoChips({ base, atual, extra = {} }) {
  return (
    <nav className="fin-periodos" aria-label="Período">
      {PERIODOS.map((p) => {
        const qs = new URLSearchParams({ ...extra, periodo: p.id }).toString();
        return (
          <Link key={p.id} href={`${base}?${qs}`} className="fin-periodo" aria-current={p.id === atual ? "page" : undefined} scroll={false}>
            {p.label}
          </Link>
        );
      })}
    </nav>
  );
}
