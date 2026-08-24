"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Calculator, Search } from "lucide-react";

// Barra de busca do topo.
//
// Foi o padrão dominante na análise dos concorrentes da região (Construtora
// Mabel e Kaza Imobiliária abrem com filtros; Bela Mares, Luh e Sarom não
// têm nenhum e obrigam o visitante a garimpar em grade). Para quem é leigo,
// a busca no topo é o que responde "vocês têm o que eu procuro?" em 3s.
//
// Campos escolhidos pelo que o público de fato usa — e nenhum a mais:
// finalidade, cidade, tipo e TETO DE PREÇO. Nada de metragem ou código de
// imóvel, que só corretor usa.

// Cidades de atuação — fixa, porque a busca precisa oferecer a região toda
// mesmo quando ainda não há imóvel publicado naquela cidade.
const CIDADES_PADRAO = [
  "Valparaíso de Goiás",
  "Cidade Ocidental",
  "Luziânia",
  "Jardim Ingá",
  "Novo Gama",
  "Águas Lindas de Goiás",
  "Brasília",
];

// Os TIPOS vêm dos dados reais (prop `tipos`). Deixá-los fixos no código já
// custou caro: a carteira tinha "Cobertura" e o filtro não oferecia.
const TIPOS_PADRAO = ["Casa", "Apartamento", "Terreno", "Comercial"];

const TETOS = [
  { valor: "150000", rotulo: "Até R$ 150 mil" },
  { valor: "250000", rotulo: "Até R$ 250 mil" },
  { valor: "400000", rotulo: "Até R$ 400 mil" },
  { valor: "", rotulo: "Qualquer valor" },
];

export function BuscaHero({ tipos, cidades }) {
  const listaTipos = tipos?.length ? tipos : TIPOS_PADRAO;
  const listaCidades = cidades?.length
    ? [...new Set([...cidades, ...CIDADES_PADRAO])]
    : CIDADES_PADRAO;
  const router = useRouter();
  const [finalidade, setFinalidade] = useState("venda");
  const [cidade, setCidade] = useState("");
  const [tipo, setTipo] = useState("");
  const [teto, setTeto] = useState("");

  const buscar = (e) => {
    e.preventDefault();
    const p = new URLSearchParams();
    if (finalidade) p.set("finalidade", finalidade);
    if (cidade) p.set("cidade", cidade);
    if (tipo) p.set("tipo", tipo);
    if (teto) p.set("ate", teto);
    router.push(`/imoveis?${p.toString()}`);
  };

  return (
    <form
      onSubmit={buscar}
      className="rounded-2xl border border-cx-border bg-white p-3 shadow-xl shadow-black/5 sm:p-4"
    >
      {/* Finalidade como abas — decisão binária, merece o clique mais fácil */}
      <div className="mb-3 inline-flex rounded-lg bg-cx-bg p-1">
        {[
          { id: "venda", rotulo: "Comprar" },
          { id: "aluguel", rotulo: "Alugar" },
        ].map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFinalidade(f.id)}
            aria-pressed={finalidade === f.id}
            className={`rounded-md px-5 py-2 text-sm font-semibold transition-colors ${
              finalidade === f.id ? "bg-cx-blue text-white" : "text-cx-muted hover:text-cx-text"
            }`}
          >
            {f.rotulo}
          </button>
        ))}
      </div>

      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        <Campo id="b-cidade" rotulo="Onde?">
          <select
            id="b-cidade"
            value={cidade}
            onChange={(e) => setCidade(e.target.value)}
            className="cx-input"
          >
            <option value="">Todas as cidades</option>
            {listaCidades.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </Campo>

        <Campo id="b-tipo" rotulo="O quê?">
          <select id="b-tipo" value={tipo} onChange={(e) => setTipo(e.target.value)} className="cx-input">
            <option value="">Qualquer tipo</option>
            {listaTipos.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </Campo>

        <Campo id="b-teto" rotulo="Até quanto?">
          <select id="b-teto" value={teto} onChange={(e) => setTeto(e.target.value)} className="cx-input">
            {TETOS.map((t) => (
              <option key={t.rotulo} value={t.valor}>{t.rotulo}</option>
            ))}
          </select>
        </Campo>

        <div className="flex items-end">
          <button
            type="submit"
            className="inline-flex h-[42px] w-full items-center justify-center gap-2 rounded-lg bg-cx-orange px-5 text-sm font-bold text-white transition-colors hover:bg-cx-orange-dark"
          >
            <Search className="h-4 w-4" aria-hidden="true" />
            Buscar imóveis
          </button>
        </div>
      </div>

      {/* O diferencial: nenhum concorrente da região deixa buscar pela
          PARCELA, que é como o comprador leigo realmente pensa. */}
      <a
        href="#parcela"
        className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-cx-blue hover:underline"
      >
        <Calculator className="h-4 w-4" aria-hidden="true" />
        Não sabe quanto pode pagar? Descubra pela parcela
      </a>
    </form>
  );
}

function Campo({ id, rotulo, children }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-[0.7rem] font-semibold text-cx-muted">
        {rotulo}
      </label>
      {children}
    </div>
  );
}
