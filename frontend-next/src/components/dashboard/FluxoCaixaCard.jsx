"use client";

import Link from "next/link";
import { ArrowUpRight, CircleAlert, TrendingUp } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatBRL } from "@/components/ui/page";
import { Painel, PainelTitulo } from "./Painel";

const fmt = (n) => (n ?? 0).toLocaleString("pt-BR");

function TooltipFluxo({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-wb-border bg-white px-3 py-2 text-xs shadow-xl shadow-slate-900/10">
      <p className="mb-1 font-semibold text-wb-text">{label}</p>
      {payload.map((item) => (
        <p key={item.dataKey} className="font-tabular mt-0.5" style={{ color: item.color }}>
          {item.name}: {formatBRL(item.value, { compact: true })}
        </p>
      ))}
    </div>
  );
}

export function FluxoCaixaCard({ fluxo, periodoLabel = "período selecionado", className = "" }) {
  const receitas = fluxo?.totalReceitas ?? 0;
  const despesas = fluxo?.totalDespesas ?? 0;
  const lucro = fluxo?.lucro ?? receitas - despesas;
  const pendencias = fluxo?.pendencias ?? 0;
  const projection = fluxo?.projection ?? {};
  const series = Array.isArray(fluxo?.monthlySeries) ? fluxo.monthlySeries : [];
  const temHistorico = series.some((item) => (item.receitas ?? 0) > 0 || (item.despesas ?? 0) > 0);
  const lucroPositivo = lucro >= 0;

  return (
    <Painel className={`flex flex-col ${className}`}>
      <PainelTitulo
        titulo="Fluxo e previsão de caixa"
        descricao={`Realizado no ${periodoLabel.toLowerCase()} e tendência móvel de seis meses.`}
        acao={
          <Link href="/financeiro/dashboard" className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-wb-brand hover:text-wb-info">
            Financeiro <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        }
      />

      {!fluxo ? (
        <div className="flex min-h-[150px] flex-col items-center justify-center gap-2 text-center">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-red-50 text-wb-bad"><CircleAlert className="h-5 w-5" /></span>
          <p className="text-sm font-medium text-wb-text">Financeiro indisponível</p>
          <p className="text-xs text-wb-muted">Os totais não puderam ser consultados.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-3 rounded-xl border border-wb-border bg-wb-surface-2 px-3.5 py-3 sm:col-span-1">
              <p className="text-[0.62rem] font-bold uppercase tracking-[0.09em] text-wb-muted">Saldo realizado</p>
              <p className={`font-tabular mt-1 text-2xl font-semibold tracking-[-0.04em] ${lucroPositivo ? "text-wb-good" : "text-wb-bad"}`}>
                {formatBRL(lucro, { compact: true })}
              </p>
            </div>
            <div className="rounded-xl border border-wb-border px-3 py-3">
              <p className="text-[0.62rem] font-bold uppercase tracking-[0.09em] text-wb-muted">Receitas</p>
              <p className="font-tabular mt-1 text-sm font-semibold text-wb-good">{formatBRL(receitas, { compact: true })}</p>
            </div>
            <div className="rounded-xl border border-wb-border px-3 py-3">
              <p className="text-[0.62rem] font-bold uppercase tracking-[0.09em] text-wb-muted">Despesas</p>
              <p className="font-tabular mt-1 text-sm font-semibold text-wb-bad">{formatBRL(despesas, { compact: true })}</p>
            </div>
          </div>

          {temHistorico ? (
            <div className="mt-3 h-[185px] w-full" role="img" aria-label="Receitas e despesas mensais dos últimos seis meses">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={series} margin={{ top: 4, right: 2, left: -24, bottom: 0 }} barCategoryGap="24%">
                  <CartesianGrid stroke="#edf1f6" vertical={false} />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 10 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 9 }} tickFormatter={(v) => formatBRL(v, { compact: true })} />
                  <Tooltip cursor={{ fill: "#f7f9fc" }} content={<TooltipFluxo />} />
                  <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 10, color: "#64748b" }} />
                  <Bar dataKey="receitas" name="Receitas" fill="#047857" radius={[3, 3, 0, 0]} maxBarSize={20} isAnimationActive={false} />
                  <Bar dataKey="despesas" name="Despesas" fill="#b42318" radius={[3, 3, 0, 0]} maxBarSize={20} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="mt-3 flex min-h-[88px] items-center justify-center rounded-xl border border-dashed border-wb-border bg-wb-surface-2 px-4 text-center">
              <p className="text-xs text-wb-muted">Cadastre receitas e despesas para formar a curva mensal.</p>
            </div>
          )}

          <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-blue-100 bg-blue-50/60 px-3 py-2.5">
            <div className="min-w-0">
              <p className="inline-flex items-center gap-1.5 text-[0.65rem] font-bold uppercase tracking-[0.08em] text-wb-brand">
                <TrendingUp className="h-3.5 w-3.5" /> Projeção em 30 dias
              </p>
              <p className="font-tabular mt-0.5 text-sm font-semibold text-wb-text">{formatBRL(projection.saldoProjetado ?? lucro, { compact: true })}</p>
            </div>
            <p className="text-right text-[0.68rem] leading-relaxed text-wb-muted">
              +{formatBRL(projection.entradas ?? 0, { compact: true })}<br />−{formatBRL(projection.saidas ?? 0, { compact: true })}
            </p>
          </div>

          {pendencias > 0 ? (
            <p className="mt-2 text-[0.68rem] text-wb-muted">
              {fmt(pendencias)} {pendencias === 1 ? "lançamento futuro cadastrado" : "lançamentos futuros cadastrados"}.
            </p>
          ) : null}
        </>
      )}
    </Painel>
  );
}
