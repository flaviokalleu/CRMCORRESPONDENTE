"use client";

import { FormIntro } from "@/components/ui/form-intro";

import { useState } from "react";
import Link from "next/link";
import { FileText } from "lucide-react";

const STATUS_MAP = {
  pendente: { label: "Pendente", color: "bg-blue-50 text-sky-700 border-blue-200" },
  em_negociacao: { label: "Em Negociação", color: "bg-amber-50 text-amber-700 border-amber-200" },
  aceita: { label: "Aceita", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  recusada: { label: "Recusada", color: "bg-red-50 text-red-700 border-red-200" },
  expirada: { label: "Expirada", color: "bg-gray-50 text-gray-700 border-gray-200" },
  cancelada: { label: "Cancelada", color: "bg-gray-50 text-gray-700 border-gray-200" },
};

const FORMA_MAP = { financiamento: "Financiamento", a_vista: "À Vista", fgts: "FGTS", misto: "Misto" };

const formatCurrency = (v) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

// Client Component: lista de propostas (SSR) + form de criação e ações de
// status, tudo via proxy `/api/backend/propostas`.
export function PropostasManager({ initialPropostas, clientes, imoveis }) {
  const [propostas, setPropostas] = useState(initialPropostas || []);
  const [form, setForm] = useState({
    cliente_id: "", imovel_id: "", valor_ofertado: "", forma_pagamento: "financiamento", data_validade: "", observacoes: "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.cliente_id || !form.imovel_id || !form.valor_ofertado) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/backend/propostas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Erro ao criar proposta");
      const nova = await res.json();
      setPropostas((prev) => [...prev, nova.data || nova]);
      setForm({ cliente_id: "", imovel_id: "", valor_ofertado: "", forma_pagamento: "financiamento", data_validade: "", observacoes: "" });
    } catch (err) {
      setError(err.message || "Erro ao criar proposta");
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (id, status, extra = {}) => {
    try {
      await fetch(`/api/backend/propostas/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, ...extra }),
      });
      setPropostas((prev) => prev.map((p) => (p.id === id ? { ...p, status, ...extra } : p)));
    } catch {
      setError("Erro ao atualizar proposta");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Excluir esta proposta?")) return;
    try {
      await fetch(`/api/backend/propostas/${id}`, { method: "DELETE" });
      setPropostas((prev) => prev.filter((p) => p.id !== id));
    } catch {
      setError("Erro ao excluir proposta");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Link
          href="/propostas/contratos"
          className="inline-flex items-center gap-1.5 rounded-lg border border-caixa-orange/30 bg-cx-orange/10 px-3 py-2 text-xs font-semibold text-caixa-orange-light hover:bg-cx-orange/15"
        >
          <FileText className="h-3.5 w-3.5" />
          Modelos de contrato
        </Link>
      </div>

      <form onSubmit={handleCreate} className="crm-form rounded-xl border border-cx-border bg-cx-surface p-4 grid gap-3 sm:grid-cols-3">
        <div className="crm-form-heading"><FormIntro title="Nova proposta" description="Preencha os dados abaixo. Campos com * são obrigatórios." /></div>
        <label className="block "><span className="crm-field-label mb-2 block">Cliente *</span>
<select
          value={form.cliente_id}
          onChange={(e) => setForm((p) => ({ ...p, cliente_id: e.target.value }))}
          className="rounded-lg border border-cx-border bg-cx-surface px-3 py-2 text-sm text-cx-text outline-none focus:border-caixa-orange/50"
          required
        >
          <option value="">Cliente...</option>
          {(clientes || []).map((c) => (
            <option key={c.id} value={c.id}>{c.nome}</option>
          ))}
        </select>
</label>
        <label className="block "><span className="crm-field-label mb-2 block">Imóvel *</span>
<select
          value={form.imovel_id}
          onChange={(e) => setForm((p) => ({ ...p, imovel_id: e.target.value }))}
          className="rounded-lg border border-cx-border bg-cx-surface px-3 py-2 text-sm text-cx-text outline-none focus:border-caixa-orange/50"
          required
        >
          <option value="">Imóvel...</option>
          {(imoveis || []).map((i) => (
            <option key={i.id} value={i.id}>{i.nome_imovel || i.endereco}</option>
          ))}
        </select>
</label>
        <label className="block "><span className="crm-field-label mb-2 block">Valor ofertado (R$) *</span>
<input
          type="number"
          placeholder="Valor ofertado (R$)"
          value={form.valor_ofertado}
          onChange={(e) => setForm((p) => ({ ...p, valor_ofertado: e.target.value }))}
          className="rounded-lg border border-cx-border bg-cx-surface px-3 py-2 text-sm text-cx-text placeholder-[#9aa6b4] outline-none focus:border-caixa-orange/50"
          required
        />
</label>
        <label className="block "><span className="crm-field-label mb-2 block">Forma de pagamento</span>
<select
          value={form.forma_pagamento}
          onChange={(e) => setForm((p) => ({ ...p, forma_pagamento: e.target.value }))}
          className="rounded-lg border border-cx-border bg-cx-surface px-3 py-2 text-sm text-cx-text outline-none focus:border-caixa-orange/50"
        >
          {Object.entries(FORMA_MAP).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
</label>
        <label className="block "><span className="crm-field-label mb-2 block">Validade</span>
<input
          type="date"
          value={form.data_validade}
          onChange={(e) => setForm((p) => ({ ...p, data_validade: e.target.value }))}
          className="rounded-lg border border-cx-border bg-cx-surface px-3 py-2 text-sm text-cx-text outline-none focus:border-caixa-orange/50"
        />
</label>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-cx-orange px-4 py-2 text-sm font-semibold text-white hover:bg-cx-orange-dark disabled:opacity-50"
        >
          {saving ? "Salvando..." : "Criar proposta"}
        </button>
        <label className="block sm:col-span-3"><span className="crm-field-label mb-2 block">Observações</span>
<input
          type="text"
          placeholder="Observações"
          value={form.observacoes}
          onChange={(e) => setForm((p) => ({ ...p, observacoes: e.target.value }))}
          className="rounded-lg border border-cx-border bg-cx-surface px-3 py-2 text-sm text-cx-text placeholder-[#9aa6b4] outline-none focus:border-caixa-orange/50 "
        />
</label>
      </form>

      {error && <p className="text-sm text-red-700">{error}</p>}

      <div className="space-y-3">
        {propostas.length === 0 ? (
          <p className="text-cx-muted text-sm">Nenhuma proposta encontrada.</p>
        ) : (
          propostas.map((p) => {
            const s = STATUS_MAP[p.status] || STATUS_MAP.pendente;
            return (
              <div key={p.id} className="rounded-xl border border-cx-border bg-cx-surface p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold ${s.color}`}>{s.label}</span>
                      <span className="text-sm font-bold text-cx-orange-text">{formatCurrency(p.valor_ofertado)}</span>
                    </div>
                    <p className="text-xs text-cx-muted">
                      {p.cliente?.nome || "Cliente"} · {p.imovel?.nome_imovel || "Imóvel"} · {FORMA_MAP[p.forma_pagamento] || p.forma_pagamento}
                    </p>
                    {p.observacoes && <p className="text-xs text-cx-muted">{p.observacoes}</p>}
                  </div>
                  <div className="flex gap-2 text-xs">
                    {(p.status === "pendente" || p.status === "em_negociacao") && (
                      <>
                        <button onClick={() => updateStatus(p.id, "aceita", { valor_aceito: p.valor_ofertado })} className="text-emerald-700 hover:underline">Aceitar</button>
                        <button onClick={() => updateStatus(p.id, "em_negociacao")} className="text-amber-700 hover:underline">Negociar</button>
                        <button onClick={() => updateStatus(p.id, "recusada")} className="text-red-700 hover:underline">Recusar</button>
                      </>
                    )}
                    <Link href={`/propostas/contratos?proposta=${p.id}`} className="inline-flex items-center gap-1 text-cx-orange-text hover:underline">
                      <FileText className="h-3 w-3" />
                      Gerar contrato
                    </Link>
                    <button onClick={() => handleDelete(p.id)} className="text-cx-muted hover:text-red-700 hover:underline">Excluir</button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
