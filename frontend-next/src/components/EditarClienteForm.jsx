"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const STATUS_OPTIONS = [
  { value: "aguardando_aprovacao", label: "Aguardando Aprovação" },
  { value: "proposta_apresentada", label: "Proposta Apresentada" },
  { value: "documentacao_pendente", label: "Documentação Pendente" },
  { value: "visita_efetuada", label: "Visita Efetuada" },
  { value: "condicionado", label: "Condicionado" },
  { value: "cliente_aprovado", label: "Aprovado" },
  { value: "reprovado", label: "Reprovado" },
  { value: "concluido", label: "Venda Concluída" },
];

// Client Component: recebe os dados iniciais do Server Component pai (page.js)
// e faz PUT via proxy (nunca chama o Go direto — ver AGENTS/regras do projeto).
// Portado de forma simplificada de frontend/src/components/EditarCliente.jsx
// (a versão antiga usa FormData/multipart para permitir upload de documentos
// junto da edição — não incluído aqui, ver docs-wiring-clientes.md).
export function EditarClienteForm({ clienteId, cliente }) {
  const [formData, setFormData] = useState({
    nome: cliente?.nome ?? "",
    email: cliente?.email ?? "",
    telefone: cliente?.telefone ?? "",
    cpf: cliente?.cpf ?? "",
    status: cliente?.status ?? "aguardando_aprovacao",
    valor_renda: cliente?.valor_renda ?? "",
    profissao: cliente?.profissao ?? "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setLoading(true);

    try {
      const res = await fetch(`/api/backend/clientes/${clienteId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          valor_renda: formData.valor_renda ? parseFloat(formData.valor_renda) : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || data.error || `Erro ao atualizar cliente (${res.status})`);
      }

      setSuccess(true);
      router.refresh();
    } catch (err) {
      setError(err.message || "Erro ao atualizar cliente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-4 rounded-xl border border-white/10 bg-white/[0.04] p-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Nome completo *">
          <input name="nome" value={formData.nome} onChange={handleChange} required className="input" />
        </Field>
        <Field label="E-mail *">
          <input type="email" name="email" value={formData.email} onChange={handleChange} required className="input" />
        </Field>
        <Field label="Telefone *">
          <input name="telefone" value={formData.telefone} onChange={handleChange} required className="input" />
        </Field>
        <Field label="CPF *">
          <input name="cpf" value={formData.cpf} onChange={handleChange} required className="input" />
        </Field>
        <Field label="Status">
          <select name="status" value={formData.status} onChange={handleChange} className="input">
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </Field>
        <Field label="Valor da renda mensal">
          <input type="number" step="0.01" name="valor_renda" value={formData.valor_renda} onChange={handleChange} className="input" />
        </Field>
        <Field label="Profissão">
          <input name="profissao" value={formData.profissao} onChange={handleChange} className="input" />
        </Field>
      </div>

      {error && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-sm text-red-300">{error}</div>
      )}
      {success && (
        <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-sm text-emerald-300">
          Cliente atualizado com sucesso!
        </div>
      )}

      <button type="submit" disabled={loading}
        className="rounded-lg bg-orange-600 hover:bg-orange-700 disabled:opacity-60 px-5 py-2.5 text-sm font-semibold text-white transition-colors">
        {loading ? "Salvando..." : "Salvar alterações"}
      </button>

      <style jsx>{`
        .input {
          width: 100%;
          padding: 0.6rem 0.75rem;
          border-radius: 0.5rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: white;
          font-size: 0.875rem;
        }
      `}</style>
    </form>
  );
}

function Field({ label, children }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-white/60">{label}</span>
      {children}
    </label>
  );
}
