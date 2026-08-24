"use client";

import { useState } from "react";
import Link from "next/link";
import { Filter } from "lucide-react";
import { CATEGORICAL } from "@/lib/chart-colors";

// Funil do atendimento como barra empilhada única + legenda com valores.
//
// Por que barra empilhada e não pizza: a pergunta aqui é "como a carteira se
// distribui entre as etapas" — composição de um todo. Uma pizza obriga a
// comparar ângulos; uma barra única compara comprimentos, que o olho lê bem.
//
// Identidade nunca vem só da cor: cada etapa aparece na legenda com marcador,
// nome e número. As cores saem da paleta CATEGORICAL em ordem fixa (validada
// para daltonismo), e há um vão de 2px entre segmentos para separar as fatias
// sem depender do contraste entre elas.
export function FunilCard({ etapas, total, titulo = "Funil de atendimento", href, nota }) {
  const [ativa, setAtiva] = useState(null);
  const soma = etapas.reduce((acc, e) => acc + e.valor, 0);
  const base = total ?? soma;

  if (!base) {
    return (
      <section className="rounded-xl border border-cx-border bg-cx-surface p-5">
        <Cabecalho titulo={titulo} href={href} />
        <p className="py-8 text-center text-xs text-cx-muted">
          Nenhum cliente classificado ainda.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-cx-border bg-cx-surface p-5">
      <Cabecalho titulo={titulo} href={href} total={base} />

      <div className="mt-4 flex h-7 w-full gap-[2px] overflow-hidden rounded-md">
        {etapas.map((e, i) => {
          const pct = (e.valor / base) * 100;
          if (pct <= 0) return null;
          return (
            <div
              key={e.chave}
              role="presentation"
              onMouseEnter={() => setAtiva(e.chave)}
              onMouseLeave={() => setAtiva(null)}
              className="h-full transition-opacity first:rounded-l-md last:rounded-r-md"
              style={{
                width: `${pct}%`,
                backgroundColor: CATEGORICAL[i % CATEGORICAL.length],
                opacity: ativa && ativa !== e.chave ? 0.45 : 1,
              }}
              title={`${e.rotulo}: ${e.valor} (${pct.toFixed(1).replace(".", ",")}%)`}
            />
          );
        })}
      </div>

      <ul className="mt-4 grid gap-x-4 gap-y-2 sm:grid-cols-2">
        {etapas.map((e, i) => {
          const pct = base ? (e.valor / base) * 100 : 0;
          const conteudo = (
            <>
              <span
                className="mt-1 h-2.5 w-2.5 shrink-0 rounded-sm"
                style={{ backgroundColor: CATEGORICAL[i % CATEGORICAL.length] }}
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs text-cx-text">{e.rotulo}</span>
                <span className="font-tabular block text-[0.68rem] text-cx-muted">
                  {e.valor.toLocaleString("pt-BR")} · {pct.toFixed(1).replace(".", ",")}%
                </span>
              </span>
            </>
          );
          return (
            <li
              key={e.chave}
              onMouseEnter={() => setAtiva(e.chave)}
              onMouseLeave={() => setAtiva(null)}
              className="flex items-start gap-2"
            >
              {e.href ? (
                <Link href={e.href} className="flex flex-1 items-start gap-2 rounded hover:bg-cx-bg">
                  {conteudo}
                </Link>
              ) : (
                conteudo
              )}
            </li>
          );
        })}
      </ul>

      {nota && (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[0.7rem] leading-relaxed text-amber-800">
          {nota}
        </p>
      )}
    </section>
  );
}

function Cabecalho({ titulo, href, total }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-cx-blue" aria-hidden="true" />
        <h2 className="text-sm font-semibold text-cx-text">{titulo}</h2>
      </div>
      {typeof total === "number" && (
        <span className="font-tabular text-xs text-cx-muted">
          {total.toLocaleString("pt-BR")} no total
        </span>
      )}
      {href && (
        <Link href={href} className="text-[0.7rem] font-semibold text-cx-blue hover:underline">
          Ver lista
        </Link>
      )}
    </div>
  );
}
