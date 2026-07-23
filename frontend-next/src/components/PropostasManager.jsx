"use client";

import { useState } from "react";
import Link from "next/link";
import { FileText } from "lucide-react";

const STATUS_MAP = {
  pendente: { label: "Pendente", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  em_negociacao: { label: "Em Negociação", color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  aceita: { label: "Aceita", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  recusada: { label: "Recusada", color: "bg-red-500/20 text-red-400 border-red-500/30" },
  expirada: { label: "Expirada", color: "bg-gray-500/20 text-gray-400 border-gray-500/30" },
  cancelada: { label: "Cancelada", color: "bg-gray-500/20 text-gray-400 border-gray-500/30" },
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
          className="inline-flex items-center gap-1.5 rounded-lg border border-caixa-orange/30 bg-caixa-orange/10 px-3 py-2 text-xs font-semibold text-caixa-orange-light hover:bg-caixa-orange/15"
        >
          <FileText className="h-3.5 w-3.5" />
          Modelos de contrato
        </Link>
      </div>

      <form onSubmit={handleCreate} className="rounded-xl border border-white/10 bg-white/[0.04] p-4 grid gap-3 sm:grid-cols-3">
        <select
          value={form.cliente_id}
          onChange={(e) => setForm((p) => ({ ...p, cliente_id: e.target.value }))}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-caixa-orange/50"
          required
        >
          <option value="">Cliente...</option>
          {(clientes || []).map((c) => (
            <option key={c.id} value={c.id}>{c.nome}</option>
          ))}
        </select>
        <select
          value={form.imovel_id}
          onChange={(e) => setForm((p) => ({ ...p, imovel_id: e.target.value }))}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-caixa-orange/50"
          required
        >
          <option value="">Imóvel...</option>
          {(imoveis || []).map((i) => (
            <option key={i.id} value={i.id}>{i.nome_imovel || i.endereco}</option>
          ))}
        </select>
        <input
          type="number"
          placeholder="Valor ofertado (R$)"
          value={form.valor_ofertado}
          onChange={(e) => setForm((p) => ({ ...p, valor_ofertado: e.target.value }))}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-caixa-orange/50"
          required
        />
        <select
          value={form.forma_pagamento}
          onChange={(e) => setForm((p) => ({ ...p, forma_pagamento: e.target.value }))}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-caixa-orange/50"
        >
          {Object.entries(FORMA_MAP).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <input
          type="date"
          value={form.data_validade}
          onChange={(e) => setForm((p) => ({ ...p, data_validade: e.target.value }))}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-caixa-orange/50"
        />
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-caixa-orange px-4 py-2 text-sm font-semibold text-white hover:bg-caixa-orange-dark disabled:opacity-50"
        >
          {saving ? "Salvando..." : "Criar proposta"}
        </button>
        <input
          type="text"
          placeholder="Observações"
          value={form.observacoes}
          onChange={(e) => setForm((p) => ({ ...p, observacoes: e.target.value }))}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-caixa-orange/50 sm:col-span-3"
        />
      </form>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="space-y-3">
        {propostas.length === 0 ? (
          <p className="text-white/30 text-sm">Nenhuma proposta encontrada.</p>
        ) : (
          propostas.map((p) => {
            const s = STATUS_MAP[p.status] || STATUS_MAP.pendente;
            return (
              <div key={p.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold ${s.color}`}>{s.label}</span>
                      <span className="text-sm font-bold text-caixa-orange">{formatCurrency(p.valor_ofertado)}</span>
                    </div>
                    <p className="text-xs text-white/40">
                      {p.cliente?.nome || "Cliente"} · {p.imovel?.nome_imovel || "Imóvel"} · {FORMA_MAP[p.forma_pagamento] || p.forma_pagamento}
                    </p>
                    {p.observacoes && <p className="text-xs text-white/30">{p.observacoes}</p>}
                  </div>
                  <div className="flex gap-2 text-xs">
                    {(p.status === "pendente" || p.status === "em_negociacao") && (
                      <>
                        <button onClick={() => updateStatus(p.id, "aceita", { valor_aceito: p.valor_ofertado })} className="text-emerald-400 hover:underline">Aceitar</button>
                        <button onClick={() => updateStatus(p.id, "em_negociacao")} className="text-amber-400 hover:underline">Negociar</button>
                        <button onClick={() => updateStatus(p.id, "recusada")} className="text-red-400 hover:underline">Recusar</button>
                      </>
                    )}
                    <Link href={`/propostas/contratos?proposta=${p.id}`} className="inline-flex items-center gap-1 text-caixa-orange-light hover:underline">
                      <FileText className="h-3 w-3" />
                      Gerar contrato
                    </Link>
                    <button onClick={() => handleDelete(p.id)} className="text-white/40 hover:text-red-400 hover:underline">Excluir</button>
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
