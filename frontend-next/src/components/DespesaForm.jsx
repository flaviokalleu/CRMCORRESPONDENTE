"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Client Component simples de criação de despesa. POST via proxy
// (/api/backend/despesas) — referência: frontend/src/components/financeiro/DespesaForm.jsx
// (campos portados: tipo, valor, descricao, data, contratoId, corretorId).
export function DespesaForm() {
  const router = useRouter();
  const [form, setForm] = useState({ tipo: "", valor: "", descricao: "", data: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/backend/despesas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo: form.tipo,
          valor: parseFloat(String(form.valor).replace(",", ".")) || 0,
          descricao: form.descricao,
          data: form.data ? new Date(form.data).toISOString() : null,
        }),
      });
      if (res.ok) {
        setForm({ tipo: "", valor: "", descricao: "", data: "" });
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Erro ao criar despesa");
      }
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-white/10 bg-white/[0.04] p-4 space-y-3 mb-6">
      <h2 className="text-sm font-semibold text-white">Nova despesa</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <input
          type="text"
          placeholder="Tipo *"
          value={form.tipo}
          onChange={(e) => handleChange("tipo", e.target.value)}
          required
          className="rounded-md bg-white/5 border border-white/10 text-white px-3 py-2 text-sm placeholder-white/30"
        />
        <input
          type="text"
          inputMode="decimal"
          placeholder="Valor *"
          value={form.valor}
          onChange={(e) => handleChange("valor", e.target.value)}
          required
          className="rounded-md bg-white/5 border border-white/10 text-white px-3 py-2 text-sm placeholder-white/30"
        />
        <input
          type="date"
          value={form.data}
          onChange={(e) => handleChange("data", e.target.value)}
          required
          className="rounded-md bg-white/5 border border-white/10 text-white px-3 py-2 text-sm"
        />
      </div>
      <input
        type="text"
        placeholder="Descrição"
        value={form.descricao}
        onChange={(e) => handleChange("descricao", e.target.value)}
        className="w-full rounded-md bg-white/5 border border-white/10 text-white px-3 py-2 text-sm placeholder-white/30"
      />
      {error && <p className="text-xs text-red-300">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="rounded-md bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2"
      >
        {loading ? "Salvando..." : "Adicionar despesa"}
      </button>
    </form>
  );
}
