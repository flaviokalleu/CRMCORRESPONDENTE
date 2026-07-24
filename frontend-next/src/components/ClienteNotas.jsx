"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { StickyNote, Send, Trash2, Loader2, User } from "lucide-react";

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

  const remove = async (id) => {
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
    <section className={embedded ? "" : "mb-5 rounded-2xl border border-white/10 bg-white/[0.025] p-5"}>
      {!embedded && (
        <header className="mb-4 flex items-center gap-3 border-b border-white/[0.07] pb-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white/60">
            <StickyNote className="h-4 w-4" />
          </span>
          <div>
            <h3 className="text-[15px] font-semibold tracking-tight text-white">Notas</h3>
            <p className="text-[11px] text-white/40">
              {loading ? "Carregando…" : `${notas.length} nota${notas.length === 1 ? "" : "s"} neste cliente`}
            </p>
          </div>
        </header>
      )}

      {/* Adicionar */}
      <form onSubmit={add} className="mb-4">
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Escreva uma nota sobre este cliente…"
          rows={3}
          className="w-full resize-y rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder-white/25 outline-none transition-colors focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/25"
        />
        {error && <p className="mt-1.5 text-xs text-red-300">{error}</p>}
        <div className="mt-2 flex justify-end">
          <button
            type="submit"
            disabled={submitting || !texto.trim()}
            className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Adicionar nota
          </button>
        </div>
      </form>

      {/* Lista */}
      {loading ? (
        <div className="flex items-center gap-2 py-6 text-sm text-white/40">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando notas…
        </div>
      ) : notas.length === 0 ? (
        <p className="py-6 text-center text-sm text-white/35">Nenhuma nota ainda. Adicione a primeira acima.</p>
      ) : (
        <ul className="space-y-2.5">
          {notas.map((n) => (
            <li key={n.id} className="group rounded-xl border border-white/[0.07] bg-white/[0.02] p-3.5">
              <p className="whitespace-pre-wrap text-sm text-white/85">{n.texto}</p>
              <div className="mt-2 flex items-center gap-2 text-[11px] text-white/40">
                <User className="h-3 w-3" />
                <span className="font-medium text-white/55">{n.criador_nome?.trim() || "Usuário"}</span>
                <span>·</span>
                <span className="tabular-nums">{fmtDate(n.data_criacao)}</span>
                {n.nova && <span className="ml-1 rounded-full bg-orange-500/15 px-1.5 py-0.5 text-[9px] font-semibold text-orange-300">nova</span>}
                {canDelete && (
                  <button
                    type="button"
                    onClick={() => remove(n.id)}
                    className="ml-auto inline-flex items-center gap-1 text-white/30 opacity-0 transition-opacity hover:text-red-300 group-hover:opacity-100"
                    title="Excluir nota"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
