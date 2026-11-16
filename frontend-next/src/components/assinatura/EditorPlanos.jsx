"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { brl } from "./formatos";

const RECURSOS = [
  ["has_pagamentos", "Cobranças (boleto e Pix)"],
  ["has_whatsapp", "WhatsApp"],
  ["has_relatorios_avancados", "Relatórios avançados"],
  ["has_ai_analysis", "Análise com IA"],
  ["has_multi_usuarios", "Vários usuários"],
  ["has_api_access", "Acesso à API"],
  ["has_suporte_prioritario", "Suporte prioritário"],
  ["has_dominio_customizado", "Domínio próprio"],
];

const LIMITES = [
  ["max_clientes", "Clientes"],
  ["max_imoveis", "Imóveis"],
  ["max_alugueis", "Aluguéis"],
  ["max_usuarios", "Usuários"],
];

const NOVO = {
  nome: "", slug: "", descricao: "", preco_mensal: 0, preco_anual: 0, trial_dias: 7, ordem: 10, ativo: true,
  features_extras: {},
  max_clientes: 0, max_imoveis: 0, max_alugueis: 0, max_usuarios: 0, max_storage_mb: 500, max_file_size_mb: 10,
  ...Object.fromEntries(RECURSOS.map(([k]) => [k, false])),
};

const slugify = (t) =>
  t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function EditorPlanos({ planos }) {
  const [editando, setEditando] = useState(null); // id do plano ou "novo"

  return (
    <section className="crm-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-cx-muted">Os planos marcados como “na vitrine” aparecem no cadastro e na troca de plano.</p>
        <Button onClick={() => setEditando("novo")}>Novo plano</Button>
      </div>

      {editando === "novo" && <FormPlano plano={NOVO} novo onFechar={() => setEditando(null)} />}

      <ul className="mt-4 divide-y divide-[var(--border)]">
        {planos.map((p) => (
          <li key={p.id} className="py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span>
                <span className="block font-semibold text-cx-text">
                  {p.nome} {!p.ativo && <span className="text-sm font-medium text-cx-muted">(fora da vitrine)</span>}
                </span>
                <span className="block text-sm text-cx-muted">
                  {brl(p.preco_mensal)}/mês · {p.trial_dias ? `${p.trial_dias} dias de teste` : "sem teste"}
                </span>
              </span>
              <Button variant="outline" size="sm" onClick={() => setEditando(editando === p.id ? null : p.id)} aria-expanded={editando === p.id}>
                {editando === p.id ? "Fechar" : "Editar"}
              </Button>
            </div>
            {editando === p.id && <FormPlano plano={p} onFechar={() => setEditando(null)} />}
          </li>
        ))}
      </ul>
    </section>
  );
}

function FormPlano({ plano, novo, onFechar }) {
  const router = useRouter();
  const [v, setV] = useState({ ...plano, descricao: plano.descricao || "" });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const set = (k, valor) => setV((o) => ({ ...o, [k]: valor }));
  const num = (k) => (e) => set(k, e.target.value === "" ? 0 : Number(e.target.value));

  async function salvar(e) {
    e.preventDefault();
    if (!v.nome.trim()) {
      setErro("Dê um nome ao plano.");
      return;
    }
    setSalvando(true);
    setErro("");
    const corpo = { ...v, slug: v.slug || slugify(v.nome), descricao: v.descricao || null };
    const res = await fetch(`/api/backend/super-admin/plans${novo ? "" : `/${plano.id}`}`, {
      method: novo ? "POST" : "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(corpo),
    });
    const dados = await res.json().catch(() => ({}));
    setSalvando(false);
    if (!res.ok) {
      setErro(dados.error || "Não foi possível salvar o plano.");
      return;
    }
    onFechar();
    router.refresh();
  }

  return (
    <form onSubmit={salvar} className="mt-4 space-y-4 rounded-lg bg-[var(--muted)] p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Campo rotulo="Nome">
          <input value={v.nome} onChange={(e) => set("nome", e.target.value)} className="cx-input h-10 w-full" />
        </Campo>
        <Campo rotulo="Descrição curta">
          <input value={v.descricao} onChange={(e) => set("descricao", e.target.value)} className="cx-input h-10 w-full" />
        </Campo>
        <Campo rotulo="Preço mensal (R$)">
          <input type="number" min="0" step="0.01" value={v.preco_mensal} onChange={num("preco_mensal")} className="cx-input h-10 w-full" />
        </Campo>
        <Campo rotulo="Preço anual (R$, 0 = sem opção anual)">
          <input type="number" min="0" step="0.01" value={v.preco_anual} onChange={num("preco_anual")} className="cx-input h-10 w-full" />
        </Campo>
        <Campo rotulo="Dias de teste grátis">
          <input type="number" min="0" max="60" value={v.trial_dias} onChange={num("trial_dias")} className="cx-input h-10 w-full" />
        </Campo>
        <Campo rotulo="Ordem na vitrine">
          <input type="number" min="0" value={v.ordem} onChange={num("ordem")} className="cx-input h-10 w-full" />
        </Campo>
      </div>

      <fieldset>
        <legend className="text-sm font-semibold text-cx-text">Limites (0 = sem limite)</legend>
        <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {LIMITES.map(([k, rotulo]) => (
            <Campo key={k} rotulo={rotulo}>
              <input type="number" min="0" value={v[k]} onChange={num(k)} className="cx-input h-10 w-full" />
            </Campo>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-sm font-semibold text-cx-text">Recursos incluídos</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {RECURSOS.map(([k, rotulo]) => (
            <label key={k} className="flex min-h-10 items-center gap-2 text-sm text-cx-text">
              <input type="checkbox" checked={!!v[k]} onChange={(e) => set(k, e.target.checked)} className="size-5" />
              {rotulo}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="flex min-h-10 items-center gap-2 text-sm font-semibold text-cx-text">
        <input type="checkbox" checked={!!v.ativo} onChange={(e) => set("ativo", e.target.checked)} className="size-5" />
        Na vitrine (aparece no cadastro e na troca de plano)
      </label>

      {erro && <p role="alert" className="text-sm font-semibold text-destructive">{erro}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={salvando}>{salvando ? "Salvando…" : novo ? "Criar plano" : "Salvar plano"}</Button>
        <Button type="button" variant="ghost" onClick={onFechar}>Cancelar</Button>
      </div>
    </form>
  );
}

function Campo({ rotulo, children }) {
  return (
    <label className="block text-sm font-semibold text-cx-text">
      {rotulo}
      <span className="mt-1 block">{children}</span>
    </label>
  );
}
