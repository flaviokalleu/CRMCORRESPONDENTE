"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Client Component simples de criação de receita. POST via proxy
// (/api/backend/receitas) — referência: frontend/src/components/financeiro/ReceitaForm.jsx
// (campos portados: tipo, valor, descricao, data, contratoId).
export function ReceitaForm() {
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
      const res = await fetch("/api/backend/receitas", {
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
        setError(data.error || "Erro ao criar receita");
      }
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-cx-border bg-cx-surface p-4 space-y-3 mb-6">
      <h2 className="text-sm font-semibold text-cx-text">Nova receita</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <input
          type="text"
          placeholder="Tipo *"
          value={form.tipo}
          onChange={(e) => handleChange("tipo", e.target.value)}
          required
          className="rounded-md bg-cx-surface border border-cx-border text-cx-text px-3 py-2 text-sm placeholder-[#9aa6b4]"
        />
        <input
          type="text"
          inputMode="decimal"
          placeholder="Valor *"
          value={form.valor}
          onChange={(e) => handleChange("valor", e.target.value)}
          required
          className="rounded-md bg-cx-surface border border-cx-border text-cx-text px-3 py-2 text-sm placeholder-[#9aa6b4]"
        />
        <input
          type="date"
          value={form.data}
          onChange={(e) => handleChange("data", e.target.value)}
          required
          className="rounded-md bg-cx-surface border border-cx-border text-cx-text px-3 py-2 text-sm"
        />
      </div>
      <input
        type="text"
        placeholder="Descrição"
        value={form.descricao}
        onChange={(e) => handleChange("descricao", e.target.value)}
        className="w-full rounded-md bg-cx-surface border border-cx-border text-cx-text px-3 py-2 text-sm placeholder-[#9aa6b4]"
      />
      {error && <p className="text-xs text-red-700">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="rounded-md bg-cx-orange hover:bg-cx-orange-dark disabled:opacity-50 text-white text-sm font-semibold px-4 py-2"
      >
        {loading ? "Salvando..." : "Adicionar receita"}
      </button>
    </form>
  );
}
