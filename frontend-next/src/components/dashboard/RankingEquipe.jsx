"use client";

import Link from "next/link";
import { ArrowUpRight, Trophy } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Painel, PainelTitulo } from "./Painel";

const fmt = (n) => (n ?? 0).toLocaleString("pt-BR");

function TooltipEquipe({ active, payload, periodoLabel }) {
  if (!active || !payload?.length) return null;
  const item = payload[0]?.payload;
  return (
    <div className="rounded-xl border border-wb-border bg-white px-3 py-2 text-xs shadow-xl shadow-slate-900/10">
      <p className="font-semibold text-wb-text">{item.nomeCompleto}</p>
      <p className="mt-0.5 text-wb-muted">
        <span className="font-tabular font-semibold text-wb-brand">{fmt(item.clientes)}</span>{" "}
        {item.clientes === 1 ? "novo cliente" : "novos clientes"} · {periodoLabel.toLowerCase()}
      </p>
    </div>
  );
}

export function RankingEquipe({ usuarios, periodoLabel = "Período selecionado", className = "" }) {
  const lista = Array.isArray(usuarios) ? usuarios.slice(0, 5) : [];
  const dados = lista.map((item, index) => {
    const nomeCompleto =
      `${item.user?.first_name ?? ""} ${item.user?.last_name ?? ""}`.trim() || "Sem nome";
    const partes = nomeCompleto.split(/\s+/);
    const nomeCurto = partes.length > 1 ? `${partes[0]} ${partes.at(-1).charAt(0)}.` : partes[0];
    return {
      posicao: index + 1,
      nomeCompleto,
      nomeCurto,
      clientes: item.clientes ?? 0,
    };
  });

  return (
    <Painel className={`flex flex-col ${className}`}>
      <PainelTitulo
        titulo="Produção da equipe"
        descricao={`Novos clientes por responsável · ${periodoLabel.toLowerCase()}.`}
        acao={
          <Link
            href="/corretores/lista"
            className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-wb-brand hover:text-wb-info"
          >
            Equipe <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        }
      />

      {dados.length === 0 ? (
        <div className="flex min-h-[135px] items-center justify-center rounded-xl border border-dashed border-wb-border bg-wb-surface-2 px-4 text-center">
          <p className="text-sm text-wb-muted">Nenhum cadastro de equipe no período selecionado.</p>
        </div>
      ) : (
        <>
          <div className="mb-1 flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50/70 px-3 py-2 text-xs text-wb-brand">
            <Trophy className="h-4 w-4 text-amber-600" aria-hidden="true" />
            <span className="truncate">
              <strong className="font-semibold">{dados[0].nomeCompleto}</strong> lidera com{" "}
              {fmt(dados[0].clientes)} {dados[0].clientes === 1 ? "cadastro" : "cadastros"}.
            </span>
          </div>
          <div
            className="mt-3 h-[235px] w-full"
            role="img"
            aria-label="Gráfico de barras com a produção mensal dos cinco primeiros membros da equipe"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={dados}
                layout="vertical"
                margin={{ top: 4, right: 30, left: 4, bottom: 0 }}
                barCategoryGap="24%"
              >
                <CartesianGrid stroke="#edf1f6" horizontal={false} />
                <XAxis type="number" hide domain={[0, "dataMax + 1"]} allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="nomeCurto"
                  axisLine={false}
                  tickLine={false}
                  width={86}
                  tick={{ fill: "#64748b", fontSize: 11 }}
                />
                  <Tooltip cursor={{ fill: "#f7f9fc" }} content={<TooltipEquipe periodoLabel={periodoLabel} />} />
                <Bar dataKey="clientes" radius={[0, 6, 6, 0]} isAnimationActive={false}>
                  {dados.map((item, index) => (
                    <Cell
                      key={`${item.nomeCompleto}-${item.posicao}`}
                      fill={index === 0 ? "#005ca9" : "#9fc3df"}
                    />
                  ))}
                  <LabelList
                    dataKey="clientes"
                    position="right"
                    fill="#17243a"
                    fontSize={11}
                    fontWeight={600}
                    formatter={fmt}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </Painel>
  );
}
