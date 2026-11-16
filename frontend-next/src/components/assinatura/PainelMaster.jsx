"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { brl, data } from "./formatos";
import { FichaEmpresa } from "./FichaEmpresa";
import { EditorPlanos } from "./EditorPlanos";

// Selo e texto curto de cada situação (mesma regra do backend).
export const SITUACAO = {
  teste: { texto: "Em teste", tom: "ok" },
  em_dia: { texto: "Em dia", tom: "ok" },
  atrasada: { texto: "Atrasada", tom: "alerta" },
  teste_acabou: { texto: "Teste acabou", tom: "perigo" },
  bloqueada: { texto: "Suspensa", tom: "perigo" },
  bloqueio_manual: { texto: "Bloqueada", tom: "perigo" },
  cancelada: { texto: "Cancelada", tom: "neutro" },
  sem_assinatura: { texto: "Sem assinatura", tom: "neutro" },
};

// Filtros por intenção (o que o dono quer fazer), não por status técnico.
const FILTROS = [
  { id: "todas", texto: "Todas", aceita: () => true },
  { id: "atencao", texto: "Pedem atenção", aceita: (e) => ["atrasada", "teste_acabou", "bloqueada", "bloqueio_manual"].includes(e.situacao) },
  { id: "teste", texto: "Em teste", aceita: (e) => e.situacao === "teste" },
  { id: "em_dia", texto: "Em dia", aceita: (e) => e.situacao === "em_dia" },
];

export function PainelMaster({ painel, planos }) {
  const [aba, setAba] = useState("empresas");
  const m = painel?.metricas || {};

  return (
    <div className="space-y-6">
      <div>
        <h1>Painel da plataforma</h1>
        <p>Acompanhe as imobiliárias, a cobrança das assinaturas e os planos.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Numero rotulo="Receita recorrente (mês)" valor={brl(m.mrr)} />
        <Numero rotulo="Recebido este mês" valor={brl(m.recebido_mes)} />
        <Numero rotulo="Em teste grátis" valor={m.em_teste ?? 0} />
        <Numero rotulo="Pedem atenção" valor={(m.atrasadas ?? 0) + (m.suspensas ?? 0)} destaque={(m.atrasadas ?? 0) + (m.suspensas ?? 0) > 0} />
      </div>

      <div role="tablist" aria-label="Seções do painel" className="flex gap-2">
        {[["empresas", "Imobiliárias"], ["planos", "Planos"]].map(([id, texto]) => (
          <Button key={id} role="tab" aria-selected={aba === id} variant={aba === id ? "default" : "outline"} onClick={() => setAba(id)}>
            {texto}
          </Button>
        ))}
      </div>

      {aba === "empresas" ? <Empresas empresas={painel?.empresas || []} planos={planos} /> : <EditorPlanos planos={planos} />}
    </div>
  );
}

function Numero({ rotulo, valor, destaque }) {
  return (
    <div className={`crm-card p-5 ${destaque ? "ass-destaque ass-tom-alerta" : ""}`}>
      <p className="text-sm text-cx-muted">{rotulo}</p>
      <p className="mt-1 text-2xl font-extrabold text-cx-text">{valor}</p>
    </div>
  );
}

function Empresas({ empresas, planos }) {
  const router = useRouter();
  const [filtro, setFiltro] = useState("todas");
  const [busca, setBusca] = useState("");
  const [aberta, setAberta] = useState(null);

  const lista = useMemo(() => {
    const f = FILTROS.find((x) => x.id === filtro) || FILTROS[0];
    const b = busca.trim().toLowerCase();
    return empresas.filter((e) => f.aceita(e) && (!b || `${e.nome} ${e.email}`.toLowerCase().includes(b)));
  }, [empresas, filtro, busca]);

  return (
    <section className="crm-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar">
          {FILTROS.map((f) => (
            <Button key={f.id} size="sm" variant={filtro === f.id ? "default" : "outline"} aria-pressed={filtro === f.id} onClick={() => setFiltro(f.id)}>
              {f.texto}
            </Button>
          ))}
        </div>
        <input
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome ou e-mail"
          aria-label="Buscar imobiliária"
          className="cx-input h-10 w-full sm:w-72"
        />
      </div>

      {lista.length === 0 ? (
        <p className="mt-6 text-base text-cx-muted">Nenhuma imobiliária neste filtro.</p>
      ) : (
        <ul className="mt-4 divide-y divide-[var(--border)]">
          {lista.map((e) => {
            const s = SITUACAO[e.situacao] || SITUACAO.sem_assinatura;
            return (
              <li key={e.id}>
                <button
                  type="button"
                  onClick={() => setAberta(e.id)}
                  className="flex w-full flex-wrap items-center justify-between gap-3 py-3 text-left hover:bg-[var(--muted)]"
                >
                  <span className="min-w-0">
                    <span className="block font-semibold text-cx-text">
                      {e.nome} {e.plataforma && <span className="text-sm font-medium text-cx-muted">(plataforma)</span>}
                    </span>
                    <span className="block text-sm text-cx-muted">
                      {e.plano || "Sem plano"} · {brl(e.mensalidade)}/mês{e.pago_ate ? ` · até ${data(e.pago_ate)}` : ""}
                    </span>
                  </span>
                  <span className={`ass-selo ass-tom-${s.tom}`}>{s.texto}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {aberta && (
        <FichaEmpresa
          tenantId={aberta}
          planos={planos}
          onFechar={() => setAberta(null)}
          onMudou={() => router.refresh()}
        />
      )}
    </section>
  );
}
