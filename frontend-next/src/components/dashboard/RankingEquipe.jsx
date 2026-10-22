"use client";

import Link from "next/link";
import { ArrowUpRight, Trophy } from "@/components/icons";
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
import { NEON, NeonGlow } from "@/lib/chart-neon";

const fmt = (n) => (n ?? 0).toLocaleString("pt-BR");

function TooltipEquipe({ active, payload, periodoLabel }) {
  if (!active || !payload?.length) return null;
  const item = payload[0]?.payload;
  return (
    <div className="ix-tooltip">
      <p className="font-semibold">{item.nomeCompleto}</p>
      <p className="mt-0.5">
        <strong className="font-tabular">{fmt(item.clientes)}</strong>{" "}
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
    <Painel futurista className={`flex flex-col ${className}`}>
      <PainelTitulo
        titulo="Produção da equipe"
        descricao={`Novos clientes por responsável · ${periodoLabel.toLowerCase()}.`}
        acao={
          <Link
            href="/corretores/lista"
            className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold"
          >
            Equipe <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        }
      />

      {dados.length === 0 ? (
        <div className="ix-chart-empty flex min-h-[220px] items-center justify-center px-4 text-center">
          <p className="text-sm">Nenhum cadastro de equipe no período selecionado.</p>
        </div>
      ) : (
        <>
          <div className="mb-1 flex items-center gap-2 rounded-xl border border-amber-300/25 bg-amber-300/10 px-3.5 py-2.5 text-sm text-amber-100">
            <Trophy className="h-4 w-4 text-amber-300" aria-hidden="true" />
            <span className="truncate">
              <strong className="font-semibold">{dados[0].nomeCompleto}</strong> lidera com{" "}
              {fmt(dados[0].clientes)} {dados[0].clientes === 1 ? "cadastro" : "cadastros"}.
            </span>
          </div>
          <div
            className="mt-4 w-full"
            style={{ height: Math.max(180, dados.length * 56 + 20) }}
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
                <defs>
                  <linearGradient id="rankLider" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={NEON.blueDeep} />
                    <stop offset="100%" stopColor={NEON.teal} />
                  </linearGradient>
                  <linearGradient id="rankDemais" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="rgba(96,165,250,0.35)" />
                    <stop offset="100%" stopColor="rgba(96,165,250,0.7)" />
                  </linearGradient>
                  <NeonGlow id="rankGlow" blur={3} />
                </defs>
                <CartesianGrid stroke={NEON.grid} horizontal={false} />
                <XAxis type="number" hide domain={[0, "dataMax + 1"]} allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="nomeCurto"
                  axisLine={false}
                  tickLine={false}
                  width={110}
                  tick={{ fill: NEON.text, fontSize: 13 }}
                />
                  <Tooltip cursor={{ fill: "rgba(96,165,250,0.08)" }} content={<TooltipEquipe periodoLabel={periodoLabel} />} />
                <Bar dataKey="clientes" radius={[0, 8, 8, 0]} maxBarSize={34} isAnimationActive={false} filter="url(#rankGlow)">
                  {dados.map((item, index) => (
                    <Cell
                      key={`${item.nomeCompleto}-${item.posicao}`}
                      fill={index === 0 ? "url(#rankLider)" : "url(#rankDemais)"}
                    />
                  ))}
                  <LabelList
                    dataKey="clientes"
                    position="right"
                    fill="#ffffff"
                    fontSize={13}
                    fontWeight={700}
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
