"use client";

import { FormIntro } from "@/components/ui/form-intro";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Trash2, Clock, AlertCircle, Calendar } from "lucide-react";

// Client Component: recebe a lista inicial (buscada no servidor via apiGet) e
// cuida de criar/concluir/excluir lembretes. Chamadas passam pelo proxy
// `/api/backend/...` (nunca direto no Go, nunca localStorage).
export function LembretesManager({ initialLembretes }) {
  const [lembretes, setLembretes] = useState(initialLembretes || []);
  const [showConcluidos, setShowConcluidos] = useState(false);
  const [form, setForm] = useState({ titulo: "", descricao: "", data: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const ativos = lembretes.filter((l) => !l.concluido);
  const concluidos = lembretes.filter((l) => l.concluido);
  const lista = showConcluidos ? concluidos : ativos;

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.titulo.trim() || !form.data) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/backend/lembretes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Erro ao criar lembrete");
      const novo = await res.json();
      setLembretes((prev) => [...prev, novo]);
      setForm({ titulo: "", descricao: "", data: "" });
      router.refresh();
    } catch (err) {
      setError(err.message || "Erro ao criar lembrete");
    } finally {
      setSaving(false);
    }
  };

  const handleConcluir = async (id) => {
    try {
      await fetch(`/api/backend/lembretes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "concluido" }),
      });
      setLembretes((prev) => prev.map((l) => (l.id === id ? { ...l, concluido: true } : l)));
    } catch {
      setError("Erro ao concluir lembrete");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Excluir este lembrete?")) return;
    try {
      await fetch(`/api/backend/lembretes/${id}`, { method: "DELETE" });
      setLembretes((prev) => prev.filter((l) => l.id !== id));
    } catch {
      setError("Erro ao excluir lembrete");
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.getTime() === today.getTime()) return "Hoje";
    if (date.getTime() === tomorrow.getTime()) return "Amanhã";
    
    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  const isOverdue = (dateStr) => {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    date.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const isToday = (dateStr) => {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date.getTime() === today.getTime();
  };

  return (
    <div className="space-y-6 cx-page">
      {/* Formulário de criação */}
      <form onSubmit={handleCreate} className="crm-form rounded-xl border border-cx-border bg-cx-surface p-6 grid gap-4 sm:grid-cols-4">
        <div className="crm-form-heading sm:col-span-4">
          <FormIntro title="Novo lembrete" description="Preencha os dados abaixo. Campos com * são obrigatórios." />
        </div>
        
        <label className="block sm:col-span-2">
          <span className="crm-field-label mb-2 block">Título *</span>
          <input
            type="text"
            placeholder="Título do lembrete"
            value={form.titulo}
            onChange={(e) => setForm((p) => ({ ...p, titulo: e.target.value }))}
            className="cx-input"
            required
            maxLength={100}
          />
        </label>
        
        <label className="block sm:col-span-2">
          <span className="crm-field-label mb-2 block">Data *</span>
          <input
            type="date"
            value={form.data}
            onChange={(e) => setForm((p) => ({ ...p, data: e.target.value }))}
            className="cx-input"
            required
            min={new Date().toISOString().split("T")[0]}
          />
        </label>
        
        <label className="block sm:col-span-4">
          <span className="crm-field-label mb-2 block">Descrição</span>
          <textarea
            placeholder="Descrição opcional"
            value={form.descricao}
            onChange={(e) => setForm((p) => ({ ...p, descricao: e.target.value }))}
            className="cx-input"
            rows={2}
            maxLength={500}
          />
        </label>
        
        <div className="sm:col-span-4 flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="cx-btn cx-btn-primary"
          >
            {saving ? "Salvando..." : "Criar lembrete"}
          </button>
          {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
        </div>
      </form>

      {/* Abas de filtro */}
      <div className="flex gap-2" role="tablist" aria-label="Filtrar lembretes">
        <button
          role="tab"
          aria-selected={!showConcluidos}
          onClick={() => setShowConcluidos(false)}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            !showConcluidos 
              ? "bg-cx-blue-soft text-cx-blue" 
              : "bg-cx-bg text-cx-muted hover:bg-cx-border"
          }`}
        >
          Ativos <span className="ml-2 px-2 py-0.5 text-xs bg-cx-bg rounded-full">{ativos.length}</span>
        </button>
        <button
          role="tab"
          aria-selected={showConcluidos}
          onClick={() => setShowConcluidos(true)}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            showConcluidos 
              ? "bg-cx-blue-soft text-cx-blue" 
              : "bg-cx-bg text-cx-muted hover:bg-cx-border"
          }`}
        >
          Concluídos <span className="ml-2 px-2 py-0.5 text-xs bg-cx-bg rounded-full">{concluidos.length}</span>
        </button>
      </div>

      {/* Lista/Tabela */}
      <div className="crm-table overflow-hidden">
        {lista.length === 0 ? (
          <div className="crm-empty text-center py-12">
            <div className="crm-avatar w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              {showConcluidos ? (
                <Check className="w-8 h-8" strokeWidth={1.5} />
              ) : (
                <Clock className="w-8 h-8" strokeWidth={1.5} />
              )}
            </div>
            <p className="text-cx-text font-medium">
              {showConcluidos ? "Nenhum lembrete concluído" : "Nenhum lembrete ativo"}
            </p>
            <p className="text-cx-muted mt-1">
              {showConcluidos 
                ? "Lembretes concluídos aparecerão aqui." 
                : "Crie seu primeiro lembrete acima."}
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th scope="col" className="px-4 py-3">Lembrete</th>
                <th scope="col" className="px-4 py-3 hidden md:table-cell">Descrição</th>
                <th scope="col" className="px-4 py-3">Data</th>
                <th scope="col" className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((l) => {
                const overdue = !l.concluido && isOverdue(l.data);
                const today = isToday(l.data);
                
                return (
                  <tr 
                    key={l.id} 
                    className={`${l.concluido ? "bg-cx-blue-soft/30" : ""} transition-colors hover:bg-cx-bg/50`}
                    style={{ opacity: l.concluido ? 0.7 : 1 }}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {l.concluido ? (
                          <Check className="w-5 h-5 text-emerald-600 flex-shrink-0" strokeWidth={2.5} />
                        ) : overdue ? (
                          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" strokeWidth={2} />
                        ) : today ? (
                          <Calendar className="w-5 h-5 text-cx-orange flex-shrink-0" strokeWidth={2} />
                        ) : (
                          <Calendar className="w-5 h-5 text-cx-muted flex-shrink-0" strokeWidth={1.5} />
                        )}
                        <div>
                          <span className={`${l.concluido ? "line-through text-cx-muted" : "text-cx-text font-medium"} block`}>
                            {l.titulo}
                          </span>
                          {l.descricao && (
                            <span className={`text-xs ${l.concluido ? "text-cx-muted" : "text-cx-muted"}`}>
                              {l.descricao}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-cx-muted">
                      {l.descricao || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        l.concluido 
                          ? "bg-emerald-50 text-emerald-700" 
                          : overdue 
                            ? "bg-red-50 text-red-700" 
                            : today 
                              ? "bg-orange-50 text-orange-700" 
                              : "bg-cx-blue-soft text-cx-blue"
                      }`}>
                        <Calendar className="w-3.5 h-3.5" strokeWidth={2} />
                        {formatDate(l.data)}
                        {overdue && !l.concluido && <span className="ml-1">atrasado</span>}
                        {today && !l.concluido && <span className="ml-1">hoje</span>}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {!l.concluido && (
                          <button
                            onClick={() => handleConcluir(l.id)}
                            className="p-2 rounded-lg text-cx-muted hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
                            aria-label="Marcar como concluído"
                            title="Concluir"
                          >
                            <Check className="w-4 h-4" strokeWidth={2.5} />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(l.id)}
                          className="p-2 rounded-lg text-cx-muted hover:bg-red-50 hover:text-red-600 transition-colors"
                          aria-label="Excluir lembrete"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" strokeWidth={2} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}