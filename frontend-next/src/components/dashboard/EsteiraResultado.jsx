"use client";

import Link from "next/link";
import { ArrowUpRight } from "@/components/icons";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Painel, PainelTitulo } from "./Painel";
import { NEON, NeonGlow } from "@/lib/chart-neon";

const CORES = {
  analise: NEON.warn,
  aprovados: NEON.good,
  reprovados: NEON.bad,
};

const fmt = (n) => (n ?? 0).toLocaleString("pt-BR");
const fmtPct = (n) => (n == null ? "—" : `${n.toFixed(1).replace(".", ",")}%`);

function TooltipResultado({ active, payload }) {
  if (!active || !payload?.length) return null;
  const item = payload[0]?.payload;
  return (
    <div className="ix-tooltip">
      <p className="font-semibold">{item.rotulo}</p>
      <p className="mt-0.5">
        <strong className="font-tabular">{fmt(item.valor)}</strong> clientes · {fmtPct(item.parte)}
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
    <Painel futurista className={`flex flex-col ${className}`}>
      <PainelTitulo
        titulo={titulo}
        descricao={`Distribuição das entradas no ${periodoLabel.toLowerCase()}.`}
        acao={
          <Link href="/clientes/lista?view=kanban" className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold">
            Abrir funil <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        }
      />

      {total > 0 ? (
        <div className="flex flex-1 flex-col gap-5">
          {/* Rosca grande no topo; legenda embaixo — nada lado a lado apertado. */}
          <div className="relative mx-auto h-[240px] w-full max-w-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <defs><NeonGlow id="resGlow" blur={3} /></defs>
                <Pie
                  data={[{ valor: 1 }]}
                  dataKey="valor"
                  cx="50%"
                  cy="50%"
                  innerRadius={78}
                  outerRadius={112}
                  stroke="none"
                  fill="rgba(148,163,184,0.10)"
                  isAnimationActive={false}
                />
                <Pie
                  data={segmentos}
                  dataKey="valor"
                  nameKey="rotulo"
                  cx="50%"
                  cy="50%"
                  innerRadius={82}
                  outerRadius={108}
                  paddingAngle={3}
                  cornerRadius={6}
                  stroke="none"
                  isAnimationActive={false}
                  style={{ filter: "url(#resGlow)" }}
                >
                  {segmentos.map((item) => (
                    <Cell key={item.chave} fill={item.cor} />
                  ))}
                </Pie>
                <Tooltip content={<TooltipResultado />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 grid place-content-center text-center">
              <span className="ix-chart-kpi font-tabular text-4xl font-bold">{fmtPct(resolucao)}</span>
              <span className="mt-1 text-xs font-semibold uppercase tracking-[0.08em] text-wb-muted">resolvido</span>
            </div>
          </div>

          <ul className="grid gap-2.5">
            {segmentos.map((item) => (
              <li key={item.chave} className="flex items-center gap-3 text-sm">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.cor, boxShadow: `0 0 10px ${item.cor}` }} aria-hidden="true" />
                <span className="text-slate-300">{item.rotulo}</span>
                <span className="font-tabular ml-auto font-bold text-white">{fmt(item.valor)}</span>
                <span className="font-tabular w-16 text-right text-xs text-slate-400">{fmtPct(item.parte)}</span>
              </li>
            ))}
          </ul>

          <div className="mt-auto rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-[0.06em] text-emerald-300">Aprovação das decisões</p>
            <p className="font-tabular mt-1 text-2xl font-bold text-white">{fmtPct(aprovacaoDecidida)}</p>
            <p className="mt-0.5 text-xs text-slate-400">
              {decisoes > 0 ? `${fmt(aprovados)} de ${fmt(decisoes)} decisões concluídas` : "Sem decisão concluída no período"}
            </p>
          </div>

          {aguardando > 0 ? (
            <p className="flex items-start gap-2 rounded-xl border border-amber-300/25 bg-amber-300/10 px-3 py-2 text-xs leading-relaxed text-amber-200">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-300" aria-hidden="true" />
              {fmt(aguardando)} {aguardando === 1 ? "cliente aguarda" : "clientes aguardam"} ação na fila atual.
            </p>
          ) : null}
        </div>
      ) : (
        <p className="ix-chart-empty flex flex-1 items-center justify-center py-10 text-sm">
          Nenhum cliente na carteira ainda.
        </p>
      )}
    </Painel>
  );
}
