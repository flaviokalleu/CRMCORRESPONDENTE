"use client";

import { FormIntro } from "@/components/ui/form-intro";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, X, Pencil, Trash2 } from "@/components/icons";
import { FormField } from "@/components/ui/form-field";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { maskPhone } from "@/lib/masks";
import { telefoneValido } from "@/lib/validar";

// Formulário de proprietário (criar e editar). Sempre via proxy
// (/api/backend/...), nunca o Go direto. O backend devolve {error, campo}.
function CamposProprietario({ inicial, onSalvo, onCancelar, rotuloSalvar }) {
  const [form, setForm] = useState(() => ({
    name: inicial?.name ?? "",
    phone: inicial?.phone ? maskPhone(inicial.phone) : "",
    address: inicial?.address ?? "",
  }));
  const [erros, setErros] = useState({});
  const [erroGeral, setErroGeral] = useState("");
  const [saving, setSaving] = useState(false);
  const enviando = useRef(false); // trava contra clique duplo (criava dois)
  const router = useRouter();

  const set = (k, v) => {
    setForm((p) => ({ ...p, [k]: v }));
    setErros((p) => (p[k] ? { ...p, [k]: undefined } : p));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (enviando.current) return;
    setErroGeral("");
    const novos = {};
    if (!form.name.trim()) novos.name = "Informe o nome do proprietário.";
    if (form.phone && !telefoneValido(form.phone)) novos.phone = "Escreva o telefone com DDD. Exemplo: (61) 99999-9999";
    if (Object.keys(novos).length) {
      setErros(novos);
      document.getElementById(novos.name ? "prop-name" : "prop-phone")?.focus();
      return;
    }

    enviando.current = true;
    setSaving(true);
    try {
      const res = await fetch(inicial?.id ? `/api/backend/proprietarios/${inicial.id}` : "/api/backend/proprietarios", {
        method: inicial?.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        // Telefone vai formatado, como nos cadastros antigos: o "Falar com"
        // mostra o texto gravado.
        body: JSON.stringify({ name: form.name.trim(), phone: form.phone, address: form.address.trim() }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        if (data?.campo && ["name", "phone", "address"].includes(data.campo)) {
          setErros({ [data.campo]: data.error });
          return;
        }
        throw new Error(data?.error || "Erro ao salvar proprietário. Tente de novo.");
      }
      toast.success(inicial?.id ? "Proprietário atualizado." : "Proprietário cadastrado.");
      router.refresh();
      onSalvo?.();
    } catch (err) {
      setErroGeral(err.message);
    } finally {
      enviando.current = false;
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="crm-form">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <FormField id="prop-name" label="Nome completo" required error={erros.name}>
          <input className="cx-input" maxLength={255} placeholder="Ex.: Maria Aparecida Souza" autoFocus
            value={form.name} onChange={(e) => set("name", e.target.value)} />
        </FormField>
        <FormField id="prop-phone" label="Telefone" optional error={erros.phone}>
          <input className="cx-input" placeholder="(61) 99999-9999" inputMode="tel"
            value={form.phone} onChange={(e) => set("phone", maskPhone(e.target.value))} />
        </FormField>
        <FormField id="prop-address" label="Endereço" optional error={erros.address}>
          <input className="cx-input" maxLength={255} placeholder="Rua, número, bairro, cidade"
            value={form.address} onChange={(e) => set("address", e.target.value)} />
        </FormField>
      </div>
      {erroGeral && <p className="lst-erro mt-3" role="alert">{erroGeral}</p>}
      <div className="lst-painel-rodape">
        <button type="submit" disabled={saving} className="lst-botao lst-botao-principal">
          {saving ? "Salvando…" : rotuloSalvar}
        </button>
        <button type="button" className="lst-botao" onClick={onCancelar}>Cancelar</button>
      </div>
    </form>
  );
}

// Cadastro sem sair da página (fechado por padrão: a lista é o que se consulta).
export function ProprietarioAddForm() {
  const [aberto, setAberto] = useState(false);

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
    <div className="lst-painel">
      <div className="flex items-start justify-between gap-3">
        <FormIntro title="Novo proprietário" description="Nome e telefone bastam para começar." />
        <button type="button" className="lst-acao" onClick={() => setAberto(false)} aria-label="Fechar">
          <X aria-hidden="true" />
        </button>
      </div>
      <CamposProprietario rotuloSalvar="Salvar proprietário" onSalvo={() => setAberto(false)} onCancelar={() => setAberto(false)} />
    </div>
  );
}

// Editar e excluir na linha da lista (antes não existia: telefone errado
// ficava errado para sempre).
export function ProprietarioRowActions({ proprietario }) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [erro, setErro] = useState("");

  async function excluir() {
    if (!window.confirm(`Excluir ${proprietario.name}? Os contratos ligados a ele ficam sem proprietário. Não dá para desfazer.`)) return;
    setExcluindo(true);
    setErro("");
    try {
      const res = await fetch(`/api/backend/proprietarios/${proprietario.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Não foi possível excluir. Tente de novo.");
      toast.success("Proprietário excluído.");
      router.refresh();
    } catch (e) {
      setErro(e.message);
    } finally {
      setExcluindo(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center justify-end gap-2">
        <button type="button" className="lst-acao" onClick={() => setEditando(true)} aria-label={`Editar ${proprietario.name}`} title="Editar">
          <Pencil aria-hidden="true" />
        </button>
        <button type="button" className="lst-acao lst-acao-perigo" onClick={excluir} disabled={excluindo} aria-label={`Excluir ${proprietario.name}`} title="Excluir">
          <Trash2 aria-hidden="true" />
        </button>
      </div>
      {erro && <p className="lst-erro" role="alert">{erro}</p>}
      <Dialog open={editando} onOpenChange={setEditando}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar proprietário</DialogTitle>
            <DialogDescription>Corrija nome, telefone ou endereço.</DialogDescription>
          </DialogHeader>
          {editando && (
            <CamposProprietario inicial={proprietario} rotuloSalvar="Salvar alterações"
              onSalvo={() => setEditando(false)} onCancelar={() => setEditando(false)} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
