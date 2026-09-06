import Link from "next/link";
import { CalendarRange, Filter, Settings2 } from "lucide-react";
import { DashboardExportActions } from "./DashboardExportActions";

const PERIODOS = [
  ["hoje", "Hoje"],
  ["7d", "7 dias"],
  ["30d", "30 dias"],
  ["mes", "Mês"],
  ["12m", "12 meses"],
];

function hrefPeriodo(periodo, filtros) {
  const params = new URLSearchParams({ periodo });
  if (filtros.responsavel) params.set("responsavel", filtros.responsavel);
  params.set("meta", String(filtros.meta));
  params.set("sla", String(filtros.sla));
  return `/dashboard?${params.toString()}`;
}

export function DashboardToolbar({ filtros, responsaveis = [], podeFiltrarResponsavel, csvRows }) {
  return (
    <section className="dashboard-no-print wb-panel p-3.5" aria-label="Filtros do painel gerencial">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-blue-50 text-wb-brand">
            <Filter className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs font-semibold text-wb-text">Escopo gerencial</p>
            <p className="text-[0.68rem] text-wb-muted">
              Clientes e equipe seguem o recorte; caixa permanece corporativo.
            </p>
          </div>
          <nav className="ml-1 inline-flex flex-wrap gap-1 rounded-lg bg-wb-surface-2 p-1" aria-label="Período rápido">
            {PERIODOS.map(([value, label]) => (
              <Link
                key={value}
                href={hrefPeriodo(value, filtros)}
                aria-current={filtros.periodo === value ? "page" : undefined}
                className={`rounded-md px-2.5 py-1.5 text-[0.7rem] font-semibold transition-colors ${
                  filtros.periodo === value
                    ? "bg-wb-brand text-white shadow-sm"
                    : "text-wb-muted hover:bg-white hover:text-wb-text"
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>

        <DashboardExportActions
          rows={csvRows}
          filename={`painel-gerencial-${filtros.inicio}-${filtros.fim}`}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-end gap-2.5 border-t border-wb-border pt-3">
        <form method="get" className="flex flex-1 flex-wrap items-end gap-2.5">
          <input type="hidden" name="periodo" value={filtros.periodo} />
          {filtros.periodo === "personalizado" ? (
            <>
              <input type="hidden" name="inicio" value={filtros.inicio} />
              <input type="hidden" name="fim" value={filtros.fim} />
            </>
          ) : null}
          {podeFiltrarResponsavel ? (
            <label className="min-w-[190px] flex-1 sm:max-w-[250px]">
              <span className="mb-1 block text-[0.65rem] font-bold uppercase tracking-[0.1em] text-wb-muted">
                Responsável
              </span>
              <select
                name="responsavel"
                defaultValue={filtros.responsavel}
                className="h-9 w-full rounded-lg border border-wb-border bg-white px-3 text-xs text-wb-text outline-none focus:border-wb-brand focus:ring-2 focus:ring-blue-100"
              >
                <option value="">Toda a equipe</option>
                {responsaveis.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nome}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label>
            <span className="mb-1 block text-[0.65rem] font-bold uppercase tracking-[0.1em] text-wb-muted">
              Meta aprovação
            </span>
            <span className="flex h-9 items-center rounded-lg border border-wb-border bg-white px-2.5">
              <input
                name="meta"
                type="number"
                min="1"
                max="100"
                defaultValue={filtros.meta}
                className="w-11 bg-transparent text-right text-xs font-semibold text-wb-text outline-none"
              />
              <span className="ml-1 text-xs text-wb-muted">%</span>
            </span>
          </label>
          <label>
            <span className="mb-1 block text-[0.65rem] font-bold uppercase tracking-[0.1em] text-wb-muted">
              SLA da fila
            </span>
            <span className="flex h-9 items-center rounded-lg border border-wb-border bg-white px-2.5">
              <input
                name="sla"
                type="number"
                min="1"
                max="90"
                defaultValue={filtros.sla}
                className="w-10 bg-transparent text-right text-xs font-semibold text-wb-text outline-none"
              />
              <span className="ml-1 text-xs text-wb-muted">dias</span>
            </span>
          </label>
          <button
            type="submit"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-wb-brand px-3.5 text-xs font-semibold text-white transition-colors hover:bg-wb-brand/90"
          >
            <Settings2 className="h-3.5 w-3.5" aria-hidden="true" />
            Aplicar
          </button>
        </form>

        <details className="group relative">
          <summary className="inline-flex h-9 cursor-pointer list-none items-center gap-1.5 rounded-lg border border-wb-border bg-white px-3 text-xs font-semibold text-wb-muted transition-colors hover:text-wb-text">
            <CalendarRange className="h-3.5 w-3.5" aria-hidden="true" />
            Personalizado
          </summary>
          <form
            method="get"
            className="absolute right-0 z-30 mt-2 grid w-[310px] grid-cols-2 gap-2 rounded-xl border border-wb-border bg-white p-3 shadow-xl shadow-slate-900/10"
          >
            <input type="hidden" name="periodo" value="personalizado" />
            {filtros.responsavel ? <input type="hidden" name="responsavel" value={filtros.responsavel} /> : null}
            <input type="hidden" name="meta" value={filtros.meta} />
            <input type="hidden" name="sla" value={filtros.sla} />
            <label>
              <span className="mb-1 block text-[0.65rem] font-semibold text-wb-muted">Início</span>
              <input name="inicio" type="date" required defaultValue={filtros.inicio} className="h-9 w-full rounded-lg border border-wb-border px-2 text-xs" />
            </label>
            <label>
              <span className="mb-1 block text-[0.65rem] font-semibold text-wb-muted">Fim</span>
              <input name="fim" type="date" required defaultValue={filtros.fim} className="h-9 w-full rounded-lg border border-wb-border px-2 text-xs" />
            </label>
            <button type="submit" className="col-span-2 h-9 rounded-lg bg-wb-brand text-xs font-semibold text-white">
              Usar este período
            </button>
          </form>
        </details>
      </div>
    </section>
  );
}
