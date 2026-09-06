"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Painel, PainelTitulo } from "./Painel";

const CORES = {
  analise: "#a65308",
  aprovados: "#047857",
  reprovados: "#b42318",
};

const fmt = (n) => (n ?? 0).toLocaleString("pt-BR");
const fmtPct = (n) => (n == null ? "—" : `${n.toFixed(1).replace(".", ",")}%`);

function TooltipResultado({ active, payload }) {
  if (!active || !payload?.length) return null;
  const item = payload[0]?.payload;
  return (
    <div className="rounded-xl border border-wb-border bg-white px-3 py-2 text-xs shadow-xl shadow-slate-900/10">
      <p className="font-semibold text-wb-text">{item.rotulo}</p>
      <p className="mt-0.5 text-wb-muted">
        <span className="font-tabular font-semibold text-wb-text">{fmt(item.valor)}</span> clientes ·{" "}
        {fmtPct(item.parte)}
      </p>
    </div>
  );
}

export function EsteiraResultado({
  pendentes = 0,
  aprovados = 0,
  reprovados = 0,
  aguardando = 0,
  titulo = "Resultado da operação",
  className = "",
  taxaAprovacao,
  taxaResolucao,
  periodoLabel = "período selecionado",
}) {
  const total = pendentes + aprovados + reprovados;
  const decisoes = aprovados + reprovados;
  const aprovacaoDecidida = taxaAprovacao ?? (decisoes > 0 ? (aprovados / decisoes) * 100 : null);
  const resolucao = taxaResolucao ?? (total > 0 ? (decisoes / total) * 100 : null);
  const segmentos = [
    { chave: "analise", rotulo: "Em análise", valor: pendentes, cor: CORES.analise },
    { chave: "aprovados", rotulo: "Aprovados", valor: aprovados, cor: CORES.aprovados },
    { chave: "reprovados", rotulo: "Reprovados", valor: reprovados, cor: CORES.reprovados },
  ].map((item) => ({ ...item, parte: total > 0 ? (item.valor / total) * 100 : 0 }));

  return (
    <Painel className={`flex flex-col ${className}`}>
      <PainelTitulo
        titulo={titulo}
        descricao={`Distribuição das entradas no ${periodoLabel.toLowerCase()}.`}
        acao={
          <Link
            href="/clientes/lista?view=kanban"
            className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-wb-brand hover:text-wb-info"
          >
            Abrir funil <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        }
      />

      {total > 0 ? (
        <>
          <div className="grid flex-1 items-center gap-4 sm:grid-cols-[190px_1fr]">
            <div className="relative mx-auto h-[190px] w-full max-w-[210px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={segmentos}
                    dataKey="valor"
                    nameKey="rotulo"
                    cx="50%"
                    cy="50%"
                    innerRadius={58}
                    outerRadius={80}
                    paddingAngle={3}
                    stroke="none"
                    isAnimationActive={false}
                  >
                    {segmentos.map((item) => (
                      <Cell key={item.chave} fill={item.cor} />
                    ))}
                  </Pie>
                  <Tooltip content={<TooltipResultado />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 grid place-content-center text-center">
                <span className="font-tabular text-2xl font-semibold tracking-[-0.04em] text-wb-good">
                  {fmtPct(resolucao)}
                </span>
                <span className="mt-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-wb-muted">
                  resolvido
                </span>
              </div>
            </div>

            <div>
              <div className="mb-4 rounded-lg border border-emerald-100 bg-emerald-50/60 px-3 py-2">
                <p className="text-[0.65rem] font-bold uppercase tracking-[0.08em] text-wb-good">Aprovação das decisões</p>
                <p className="font-tabular mt-0.5 text-xl font-semibold text-wb-text">{fmtPct(aprovacaoDecidida)}</p>
                <p className="mt-0.5 text-[0.68rem] text-wb-muted">
                  {decisoes > 0 ? `${fmt(aprovados)} de ${fmt(decisoes)} decisões concluídas` : "Sem decisão concluída no período"}
                </p>
              </div>
              <ul className="space-y-3">
                {segmentos.map((item) => (
                  <li key={item.chave} className="flex items-center gap-2.5 text-sm">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-[4px]"
                      style={{ backgroundColor: item.cor }}
                      aria-hidden="true"
                    />
                    <span className="text-wb-muted">{item.rotulo}</span>
                    <span className="font-tabular ml-auto font-semibold text-wb-text">
                      {fmt(item.valor)}
                    </span>
                    <span className="font-tabular w-14 text-right text-xs text-wb-muted">
                      {fmtPct(item.parte)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {aguardando > 0 ? (
            <p className="mt-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-wb-warn">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-wb-warn" aria-hidden="true" />
              {fmt(aguardando)} {aguardando === 1 ? "cliente aguarda" : "clientes aguardam"} ação na fila atual.
            </p>
          ) : null}
        </>
      ) : (
        <p className="flex flex-1 items-center justify-center py-10 text-sm text-wb-muted">
          Nenhum cliente na carteira ainda.
        </p>
      )}
    </Painel>
  );
}
