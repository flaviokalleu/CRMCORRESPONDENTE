"use client";

import { FormIntro } from "@/components/ui/form-intro";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, X } from "@/components/icons";
import { maskPhone } from "@/lib/masks";

// Client Component pequeno usado dentro da página Server de proprietários,
// só para permitir cadastro sem sair da página. Sempre via proxy
// (/api/backend/...), nunca o Go direto.
export function ProprietarioAddForm() {
  const [form, setForm] = useState({ name: "", phone: "", address: "" });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  // Fechado por padrão: a lista é o que se consulta; o cadastro abre sob pedido.
  const [aberto, setAberto] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: "", text: "" });

    if (!form.name.trim()) {
      setMessage({ type: "error", text: "Informe o nome do proprietário" });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/backend/proprietarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || data?.message || "Erro ao cadastrar proprietário");

      setForm({ name: "", phone: "", address: "" });
      setMessage({ type: "", text: "" });
      setAberto(false);
      toast.success("Proprietário cadastrado.");
      router.refresh();
    } catch (err) {
      setMessage({ type: "error", text: err.message || "Erro ao cadastrar proprietário" });
    } finally {
      setSaving(false);
    }
  };

  const inputClass = "cx-input";

  if (!aberto) {
    return (
      <div>
        <button type="button" className="lst-botao lst-botao-principal" onClick={() => setAberto(true)}>
          <Plus aria-hidden="true" /> Novo proprietário
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="crm-form lst-painel">
      <div className="flex items-start justify-between gap-3">
        <FormIntro title="Novo proprietário" description="Nome e telefone bastam para começar." />
        <button type="button" className="lst-acao" onClick={() => setAberto(false)} aria-label="Fechar">
          <X aria-hidden="true" />
        </button>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="block"><span className="crm-field-label mb-2 block">Nome completo</span>
<input
          className={inputClass}
          placeholder="Ex.: Maria Aparecida Souza"
          autoFocus
          value={form.name}
          onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
        />
</label>
        <label className="block"><span className="crm-field-label mb-2 block">Telefone</span>
<input
          className={inputClass}
          placeholder="(61) 99999-9999"
          inputMode="tel"
          value={form.phone}
          onChange={(e) => setForm((prev) => ({ ...prev, phone: maskPhone(e.target.value) }))}
        />
</label>
        <label className="block"><span className="crm-field-label mb-2 block">Endereço <span className="crm-field-opt">(opcional)</span></span>
<input
          className={inputClass}
          placeholder="Rua, número, bairro, cidade"
          value={form.address}
          onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
        />
</label>
      </div>
      {message.text && (
        <p className="lst-erro mt-3" role="alert">
          {message.text}
        </p>
      )}
      <div className="lst-painel-rodape">
        <button type="submit" disabled={saving} className="lst-botao lst-botao-principal">
          {saving ? "Salvando…" : "Salvar proprietário"}
        </button>
        <button type="button" className="lst-botao" onClick={() => setAberto(false)}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
