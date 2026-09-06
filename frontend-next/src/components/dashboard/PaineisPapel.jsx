import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Painel, PainelTitulo } from "./Painel";

// Blocos-variantes por PAPEL — ocupam os mesmos slots da grade, mas respondem
// à pergunta que aquele papel faz (ver lógica de papéis em dashboard/page.js):
//
//   corretor       → "como está a MINHA carteira"
//   correspondente → "qual é a MINHA eficiência de análise"
//   não-admin      → no lugar do ranking do time, as próprias taxas
const fmt = (n) => (n ?? 0).toLocaleString("pt-BR");
const fmtPct = (n) => (n == null ? "—" : `${n.toFixed(1).replace(".", ",")}%`);

function LinhaStat({ rotulo, valor, hint }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-wb-border pb-3 last:border-0 last:pb-0">
      <span className="text-sm text-wb-muted">{rotulo}</span>
      <span className="text-right">
        <span className="font-tabular text-sm font-semibold text-wb-text">{valor}</span>
        {hint && <span className="ml-2 text-[0.68rem] text-wb-muted">{hint}</span>}
      </span>
    </div>
  );
}

// Corretor — zona 2, slot 1 (no lugar do Fluxo de caixa, que é só do admin).
export function BlocoCarteira({ total, esteMes, aguardando, imoveisDisponiveis, className = "" }) {
  return (
    <Painel className={`flex flex-col ${className}`}>
      <PainelTitulo
        titulo="Minha carteira"
        descricao="Visão consolidada dos clientes sob sua responsabilidade."
        acao={
          <Link href="/clientes/lista" className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-wb-brand hover:text-wb-info">
            Abrir <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        }
      />
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-tabular text-3xl font-semibold leading-none tracking-[-0.04em] text-wb-text sm:text-4xl">
          {fmt(total)}
        </span>
        <span className="text-sm text-wb-muted">
          {total === 1 ? "cliente sob minha responsabilidade" : "clientes sob minha responsabilidade"}
        </span>
      </div>
      <div className="mt-5 space-y-3">
        <LinhaStat rotulo="Novos este mês" valor={fmt(esteMes)} />
        <LinhaStat rotulo="Aguardando aprovação" valor={fmt(aguardando)} />
        <LinhaStat rotulo="Imóveis disponíveis" valor={imoveisDisponiveis == null ? "—" : fmt(imoveisDisponiveis)} hint="prontos para ofertar" />
      </div>
    </Painel>
  );
}

// Correspondente — zona 2, slot 1 (idem).
export function BlocoRitmo({ entradasPeriodo, periodoLabel, taxaAprovacao, aguardando, className = "" }) {
  return (
    <Painel className={`flex flex-col ${className}`}>
      <PainelTitulo
        titulo="Ritmo da operação"
        descricao={`Volume no ${periodoLabel.toLowerCase()} e pressão atual sobre a fila.`}
        acao={
          <Link href="/clientes/lista?status=atencao" className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-wb-brand hover:text-wb-info">
            Abrir fila <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        }
      />
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-tabular text-3xl font-semibold leading-none tracking-[-0.04em] text-wb-analytics sm:text-4xl">
          {fmt(entradasPeriodo)}
        </span>
        <span className="text-sm text-wb-muted">novos clientes no período</span>
      </div>
      <div className="mt-5 space-y-3">
        <LinhaStat rotulo="Período analisado" valor={periodoLabel} />
        <LinhaStat rotulo="Aprovação das decisões" valor={fmtPct(taxaAprovacao)} />
        <LinhaStat rotulo="Aguardando decisão" valor={fmt(aguardando)} />
      </div>
    </Painel>
  );
}

// Corretor/correspondente — zona 3, slot 1 (no lugar do Ranking da equipe):
// as três taxas do próprio recorte, em barras.
export function PainelTaxas({ taxaAprovacao, taxaResolucao, taxaRejeicao, className = "" }) {
  const linhas = [
    { rotulo: "Aprovação das decisões", valor: taxaAprovacao, cor: "var(--color-wb-good)" },
    { rotulo: "Resolução das entradas", valor: taxaResolucao, cor: "var(--color-wb-brand)" },
    { rotulo: "Rejeição das decisões", valor: taxaRejeicao, cor: "var(--color-wb-bad)" },
  ];
  return (
    <Painel className={`flex flex-col ${className}`}>
      <PainelTitulo
        titulo="Desfecho da carteira"
        descricao="Aprovação/rejeição usam decisões concluídas; resolução usa todas as entradas."
        acao={
          <Link href="/clientes/lista?view=kanban" className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-wb-brand hover:text-wb-info">
            Funil <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        }
      />
      <ul className="space-y-4">
        {linhas.map((l) => (
          <li key={l.rotulo}>
            <div className="mb-1.5 flex items-baseline justify-between gap-2">
              <span className="text-xs text-wb-muted">{l.rotulo}</span>
              <span className="font-tabular text-sm font-semibold text-wb-text">{fmtPct(l.valor)}</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-wb-surface-2">
              <div
                className="h-full rounded-full"
                style={{ width: `${Math.min(100, Math.max(0, l.valor ?? 0))}%`, backgroundColor: l.cor }}
              />
            </div>
          </li>
        ))}
      </ul>
    </Painel>
  );
}
