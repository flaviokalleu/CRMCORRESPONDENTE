"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AlertCircle, ArrowRight, BadgePercent, Wallet } from "lucide-react";
import { COMPROMETIMENTO_MAXIMO, PRAZO_MAXIMO_MESES, simularMCMV } from "@/lib/mcmv";
import { AvisoValorVaria } from "./AvisoValorVaria";

// Simulador do Minha Casa Minha Vida na landing.
//
// A versão anterior perguntava "quanto você pode pagar por mês" e devolvia um
// teto com juros genéricos de mercado — o que era errado para o público desta
// região, que compra pelo MCMV com juros subsidiados de 4,25% a 10,5% ao ano,
// não com os ~9,4% do SBPE.
//
// Agora a pergunta é a que a pessoa sabe responder: A RENDA DA FAMÍLIA. Dela
// sai tudo — a faixa, o juro, o teto do imóvel e o subsídio. E a resposta é a
// que ela quer: até quanto dá para comprar e quanto fica a prestação.

const brl = (n) =>
  (Number(n) || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });

const onlyDigits = (v) => (v || "").toString().replace(/\D/g, "");
const digitsToReais = (d) => (d ? Number(d) / 100 : 0);
const maskReais = (v) =>
  (Number(v) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const RENDAS_RAPIDAS = [200000, 320000, 500000, 800000]; // em centavos

export function SimuladorMCMV() {
  const [rendaDigits, setRendaDigits] = useState("320000"); // R$ 3.200,00
  const [cotista, setCotista] = useState(false);
  const [fgtsDigits, setFgtsDigits] = useState("");

  const renda = digitsToReais(rendaDigits);
  const fgts = digitsToReais(fgtsDigits);

  const r = useMemo(
    () => simularMCMV({ renda, cotista, fgts }),
    [renda, cotista, fgts],
  );

  const anos = Math.round(PRAZO_MAXIMO_MESES / 12);

  return (
    <section id="parcela" className="scroll-mt-24 overflow-hidden rounded-2xl border border-cx-border bg-white">
      <div className="border-b border-cx-border bg-cx-blue-soft px-6 py-5 sm:px-8">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-cx-blue text-white">
            <Wallet className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-lg font-bold text-cx-text">Até quanto você consegue financiar?</h2>
            <p className="text-sm text-cx-muted">
              Responda a renda da família e a gente mostra a faixa do Minha Casa Minha Vida,
              o juro que você paga e quanto fica a prestação.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-2">
        {/* ── Entradas ─────────────────────────────────────────────── */}
        <div className="space-y-5">
          <div>
            <label htmlFor="mcmv-renda" className="mb-1.5 block text-sm font-semibold text-cx-text">
              Renda da família por mês
            </label>
            <p className="mb-2 text-xs text-cx-muted">
              Some tudo que entra em casa: seu salário, do cônjuge, pensão, aposentadoria.
            </p>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-cx-muted">
                R$
              </span>
              <input
                id="mcmv-renda"
                inputMode="numeric"
                value={maskReais(renda)}
                onChange={(e) => setRendaDigits(onlyDigits(e.target.value))}
                style={{ paddingLeft: "2.25rem" }}
                className="cx-input font-tabular text-lg font-semibold"
              />
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {RENDAS_RAPIDAS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setRendaDigits(String(c))}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                    rendaDigits === String(c)
                      ? "border-cx-orange bg-cx-orange text-white"
                      : "border-cx-border text-cx-text hover:border-cx-blue"
                  }`}
                >
                  {brl(c / 100)}
                </button>
              ))}
            </div>
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-cx-border p-3">
            <input
              type="checkbox"
              checked={cotista}
              onChange={(e) => setCotista(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-cx-blue"
            />
            <span>
              <span className="block text-sm font-semibold text-cx-text">
                Tenho 3 anos ou mais de FGTS
              </span>
              <span className="block text-xs text-cx-muted">
                Somando todos os empregos com carteira assinada. Quem tem paga juro menor.
              </span>
            </span>
          </label>

          <div>
            <label htmlFor="mcmv-fgts" className="mb-1.5 block text-sm font-semibold text-cx-text">
              Saldo do FGTS para usar de entrada{" "}
              <span className="font-normal text-cx-muted">(se souber)</span>
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-cx-muted">
                R$
              </span>
              <input
                id="mcmv-fgts"
                inputMode="numeric"
                value={maskReais(fgts)}
                onChange={(e) => setFgtsDigits(onlyDigits(e.target.value))}
                style={{ paddingLeft: "2.25rem" }}
                className="cx-input font-tabular"
              />
            </div>
          </div>
        </div>

        {/* ── Resultado ────────────────────────────────────────────── */}
        <div className="flex flex-col">
          <div className="rounded-xl bg-cx-bg p-5">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-cx-blue px-2.5 py-1 text-[0.7rem] font-bold text-white">
              <BadgePercent className="h-3.5 w-3.5" aria-hidden="true" />
              {r.faixa.nome}
              {r.faixa.nomeAlt ? ` · ${r.faixa.nomeAlt}` : ""}
            </span>
            <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-cx-muted">
              Você pode comprar um imóvel de até
            </p>
            <p className="font-tabular text-3xl font-bold text-cx-blue sm:text-4xl">
              {brl(r.poderDeCompra)}
            </p>

            <dl className="mt-4 space-y-2 border-t border-cx-border pt-4 text-sm">
              <Linha rotulo="Prestação estimada" valor={`${brl(r.parcelaEstimada)}/mês`} destaque />
              <Linha rotulo="Juros da sua faixa" valor={`${r.jurosAnual.toFixed(2).replace(".", ",")}% ao ano`} />
              <Linha rotulo="Prazo" valor={`${PRAZO_MAXIMO_MESES} meses (${anos} anos)`} />
              {r.subsidio > 0 && (
                <Linha rotulo="Subsídio do governo" valor={`+ ${brl(r.subsidio)}`} />
              )}
              {r.entrada > 0 && <Linha rotulo="Seu FGTS de entrada" valor={`+ ${brl(r.entrada)}`} />}
              <Linha rotulo="O banco financia" valor={brl(r.valorFinanciado)} />
            </dl>
          </div>

          {r.estouroDeTeto && (
            <p className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              Sua renda daria para financiar mais, mas o {r.faixa.nome} tem teto de{" "}
              {brl(r.tetoImovel)} por imóvel. Acima disso, o financiamento sai do programa.
            </p>
          )}

          {r.foraDoPrograma && (
            <p className="mt-3 flex items-start gap-2 rounded-lg border border-cx-border bg-cx-bg px-3 py-2 text-xs leading-relaxed text-cx-muted">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              Sua renda está acima do teto do Minha Casa Minha Vida (R$ 13 mil). O
              financiamento seria pelo SBPE, com juros de mercado.
            </p>
          )}

          {r.subsidio > 0 && (
            <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs leading-relaxed text-emerald-900">
              Aqui só está contado o subsídio <strong className="font-semibold">federal</strong>. Em
              Goiás existe ainda o subsídio <strong className="font-semibold">estadual</strong> (até
              R$ 47,4 mil para renda de até 3 salários mínimos), que soma por cima e pode reduzir
              bastante a sua parcela.
            </p>
          )}

          <AvisoValorVaria className="mt-3" contexto="geral" />

          <p className="mt-2 text-[0.7rem] leading-relaxed text-cx-muted">
            A prestação não pode passar de {Math.round(COMPROMETIMENTO_MAXIMO * 100)}% da renda —{" "}
            <strong className="font-semibold">{brl(r.parcelaMaxima)}</strong> no seu caso.
          </p>

          <div className="mt-4 flex flex-col gap-2.5 sm:flex-row">
            <Link
              href={`/imoveis?ate=${Math.round(r.poderDeCompra)}`}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-cx-orange px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-cx-orange-dark"
            >
              Ver imóveis até {brl(r.poderDeCompra)}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <a
              href={`https://wa.me/5561999999999?text=${encodeURIComponent(
                `Olá! Simulei no site: renda de ${brl(renda)}, ${r.faixa.nome}, posso comprar até ${brl(r.poderDeCompra)}. Podem me ajudar?`,
              )}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex flex-1 items-center justify-center rounded-lg border border-cx-border px-5 py-3 text-sm font-semibold text-cx-text transition-colors hover:border-cx-blue"
            >
              Falar com um corretor
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function Linha({ rotulo, valor, destaque }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-xs text-cx-muted">{rotulo}</dt>
      <dd
        className={`font-tabular text-right ${
          destaque ? "text-base font-bold text-cx-text" : "text-xs font-medium text-cx-text"
        }`}
      >
        {valor}
      </dd>
    </div>
  );
}
