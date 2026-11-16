"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { StickyNote, Send, Trash2, Loader2, User, Pencil, Check, X } from "@/components/icons";

const MAX_NOTA = 5000;

// Notas do cliente — listar + adicionar (todos os papéis: corretor, admin,
// correspondente). Usa as rotas Go /api/notas. O `criado_por_id` vai do usuário
// logado (endpoint não deriva do token). Exclusão fica só p/ admin/correspondente.
export function ClienteNotas({ clienteId, onCountChange, embedded = false }) {
  const { user } = useAuth();
  const canDelete = !!(user?.is_administrador || user?.is_correspondente);

  const [notas, setNotas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [texto, setTexto] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [editando, setEditando] = useState(null); // { id, texto }
  const [ocupado, setOcupado] = useState(null); // id em ação (salvar/concluir)

  const fetchNotas = async () => {
    try {
      const res = await fetch(`/api/backend/notas/clientes/${clienteId}/notas`, { cache: "no-store" });
      const data = await res.json().catch(() => []);
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  };

  useEffect(() => {
    let active = true;
    (async () => {
      const data = await fetchNotas();
      if (active) {
        setNotas(data);
        setLoading(false);
        onCountChange?.(data.length);
      }
    })();
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clienteId]);

  const add = async (e) => {
    e.preventDefault();
    const t = texto.trim();
    if (!t) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/backend/notas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cliente_id: Number(clienteId), texto: t, criado_por_id: user?.id }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || d.message || "Erro ao adicionar nota");
      }
      setTexto("");
      const data = await fetchNotas();
      setNotas(data);
      onCountChange?.(data.length);
    } catch (err) {
      setError(err.message || "Erro ao adicionar nota");
    } finally {
      setSubmitting(false);
    }
  };

  // Corrigir o texto de uma nota (PUT /notas/:id).
  const salvarEdicao = async () => {
    const t = editando?.texto.trim();
    if (!t) return;
    setOcupado(editando.id);
    setError("");
    try {
      const res = await fetch(`/api/backend/notas/${editando.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto: t }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Não foi possível salvar a nota.");
      }
      setNotas((ns) => ns.map((n) => (n.id === editando.id ? { ...n, texto: t } : n)));
      setEditando(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setOcupado(null);
    }
  };

  // Concluir = marcar a nota como vista (some o selo "nova").
  const concluir = async (id) => {
    setOcupado(id);
    setError("");
    try {
      const res = await fetch(`/api/backend/notas/${id}/concluir`, { method: "PUT" });
      if (!res.ok) throw new Error("Não foi possível concluir a nota.");
      setNotas((ns) => ns.map((n) => (n.id === id ? { ...n, nova: false } : n)));
    } catch (err) {
      setError(err.message);
    } finally {
      setOcupado(null);
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Excluir esta nota? Não dá para desfazer.")) return;
    const prev = notas;
    const next = prev.filter((n) => n.id !== id);
    setNotas(next);
    onCountChange?.(next.length);
    try {
      const res = await fetch(`/api/backend/notas/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
    } catch {
      setNotas(prev); // reverte a exclusão otimista
      onCountChange?.(prev.length);
      setError("Não foi possível excluir a nota.");
    }
  };

  const fmtDate = (d) => {
    try {
      return new Date(d).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  return (
    <section className={embedded ? "" : "mb-5 rounded-2xl border border-cx-border bg-cx-surface p-5"}>
      {!embedded && (
        <header className="mb-4 flex items-center gap-3 border-b border-cx-border/[0.15] pb-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cx-border bg-cx-surface text-cx-muted">
            <StickyNote className="h-4 w-4" />
          </span>
          <div>
            <h3 className="text-[15px] font-semibold tracking-tight text-cx-text">Notas</h3>
            <p className="text-[11px] text-cx-muted">
              {loading ? "Carregando…" : `${notas.length} nota${notas.length === 1 ? "" : "s"} neste cliente`}
            </p>
          </div>
        </header>
      )}

      {/* Adicionar */}
      <form onSubmit={add} className="crm-form mb-4">
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Escreva uma nota sobre este cliente…"
          rows={3}
          maxLength={MAX_NOTA}
          aria-label="Nova nota"
          className="w-full resize-y rounded-lg border border-cx-border bg-cx-surface px-3 py-2.5 text-sm text-cx-text placeholder-[#9aa6b4] outline-none transition-colors focus:border-cx-blue focus:ring-2 focus:ring-cx-blue/20"
        />
        {error && <p className="mt-1.5 text-xs text-red-700">{error}</p>}
        <div className="mt-2 flex justify-end">
          <button
            type="submit"
            disabled={submitting || !texto.trim()}
            className="inline-flex items-center gap-2 rounded-lg bg-cx-orange px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-cx-orange-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Adicionar nota
          </button>
        </div>
      </form>

      {/* Lista */}
      {loading ? (
        <div className="flex items-center gap-2 py-6 text-sm text-cx-muted">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando notas…
        </div>
      ) : notas.length === 0 ? (
        <p className="py-6 text-center text-sm text-cx-muted">Nenhuma nota ainda. Adicione a primeira acima.</p>
      ) : (
        <ul className="space-y-2.5">
          {notas.map((n) => (
            <li key={n.id} className="group rounded-xl border border-cx-border/[0.15] bg-cx-surface p-3.5">
              {editando?.id === n.id ? (
                <div>
                  <textarea
                    value={editando.texto}
                    onChange={(e) => setEditando({ id: n.id, texto: e.target.value })}
                    rows={3}
                    maxLength={MAX_NOTA}
                    aria-label="Editar nota"
                    className="w-full resize-y rounded-lg border border-cx-border bg-cx-surface px-3 py-2.5 text-sm text-cx-text outline-none focus:border-cx-blue focus:ring-2 focus:ring-cx-blue/20"
                  />
                  <div className="mt-2 flex justify-end gap-2">
                    <button type="button" onClick={() => setEditando(null)} className="cx-btn cx-btn-outline px-3 py-1.5 text-xs">
                      <X className="h-3.5 w-3.5" /> Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={salvarEdicao}
                      disabled={ocupado === n.id || !editando.texto.trim()}
                      className="cx-btn cx-btn-primary px-3 py-1.5 text-xs"
                    >
                      {ocupado === n.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Salvar nota
                    </button>
                  </div>
                </div>
              ) : (
                <p className="whitespace-pre-wrap break-words text-sm text-cx-muted">{n.texto}</p>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-cx-muted">
                <User className="h-3 w-3" />
                <span className="font-medium text-cx-muted">{n.criador_nome?.trim() || "Usuário"}</span>
                <span>·</span>
                <span className="tabular-nums">{fmtDate(n.data_criacao)}</span>
                {n.nova && <span className="ml-1 rounded-full bg-orange-50 px-1.5 py-0.5 text-[9px] font-semibold text-orange-700">nova</span>}
                {/* Ações visíveis sempre no toque; no mouse, aparecem ao passar
                    por cima (o celular não tem hover — antes a lixeira sumia). */}
                <span className="ml-auto flex items-center gap-1 transition-opacity [@media(hover:hover)]:opacity-0 group-hover:opacity-100 group-focus-within:opacity-100">
                  {n.nova && (
                    <button type="button" onClick={() => concluir(n.id)} disabled={ocupado === n.id} className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 hover:text-cx-text" title="Concluir nota">
                      <Check className="h-3.5 w-3.5" /> Concluir
                    </button>
                  )}
                  <button type="button" onClick={() => setEditando({ id: n.id, texto: n.texto })} className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 hover:text-cx-text" title="Editar nota">
                    <Pencil className="h-3.5 w-3.5" /> Editar
                  </button>
                  {canDelete && (
                    <button type="button" onClick={() => remove(n.id)} className="inline-flex items-center rounded-md px-1.5 py-1 hover:text-red-700" title="Excluir nota" aria-label="Excluir nota">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
