"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import {
  Search, Plus, Pencil, ChevronLeft, ChevronRight, Loader2,
  Phone, SlidersHorizontal, Inbox, RefreshCw, StickyNote, X,
} from "lucide-react";
import { STATUS_LIST, statusInfo } from "@/lib/cliente-status";
import { ClienteNotas } from "@/components/ClienteNotas";

const LIMIT = 12;

// Formata a renda (VARCHAR pt-BR "7000,00" ou numérico) com separador de milhar.
const formatRenda = (c) => {
  const raw = c.valor_renda_formatado || c.valor_renda || "";
  if (!raw) return "";
  const normalized = raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw;
  const n = parseFloat(normalized);
  if (Number.isNaN(n)) return raw;
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
const initialsOf = (nome) => {
  const p = (nome || "").trim().split(/\s+/).filter(Boolean);
  return p.length ? (p[0][0] + (p[1]?.[0] || "")).toUpperCase() : "?";
};
const maskCPF = (v) =>
  (v || "").replace(/\D/g, "").slice(0, 11)
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");

// Pílula neutra + ponto colorido semântico (visual corporativo, sem excesso de cor).
function StatusBadge({ status }) {
  const info = statusInfo(status);
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-[11px] font-medium whitespace-nowrap text-white/70">
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: info.dot }} />
      {info.label}
    </span>
  );
}

// Badge que vira <select> ao clicar (admin/correspondente) — PATCH inline.
function StatusControl({ cliente, onChange, saving }) {
  const info = statusInfo(cliente.status);
  return (
    <div className="relative inline-flex items-center rounded-md border border-white/10 bg-white/[0.04] transition-colors hover:border-white/20">
      <span className="pointer-events-none absolute left-2.5 h-1.5 w-1.5 rounded-full" style={{ backgroundColor: info.dot }} />
      <select
        value={cliente.status}
        disabled={saving}
        onChange={(e) => onChange(cliente.id, e.target.value)}
        className="cursor-pointer appearance-none bg-transparent py-1 pl-5 pr-6 text-[11px] font-medium text-white/70 outline-none transition-opacity focus:ring-1 focus:ring-white/20 disabled:opacity-50 [&>option]:bg-[#0f1a30] [&>option]:text-white"
        title="Alterar status"
      >
        {STATUS_LIST.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
      </select>
      {saving
        ? <Loader2 className="pointer-events-none absolute right-1.5 h-3 w-3 animate-spin text-white/50" />
        : <SlidersHorizontal className="pointer-events-none absolute right-1.5 h-3 w-3 text-white/30" />}
    </div>
  );
}

export function ClientesLista({ initialData }) {
  const { user } = useAuth();
  const canChangeStatus = !!(user?.is_administrador || user?.is_correspondente);

  const [clientes, setClientes] = useState(initialData?.clientes ?? []);
  const [pagination, setPagination] = useState(initialData?.pagination ?? { total: (initialData?.clientes ?? []).length, page: 1, limit: LIMIT, pages: 1 });
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [notesFor, setNotesFor] = useState(null); // { id, nome } — modal de notas

  // Fecha o modal de notas com Esc.
  useEffect(() => {
    if (!notesFor) return;
    const onKey = (e) => { if (e.key === "Escape") setNotesFor(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [notesFor]);

  const fetchList = useCallback(async ({ q, status, page }) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
      if (q) params.set("search", q);
      if (status) params.set("status", status);
      const res = await fetch(`/api/backend/clientes?${params.toString()}`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      setClientes(Array.isArray(data) ? data : data.clientes ?? []);
      setPagination(data.pagination ?? { total: 0, page: 1, limit: LIMIT, pages: 1 });
    } finally {
      setLoading(false);
    }
  }, []);

  const didMount = useRef(false);
  useEffect(() => {
    if (!didMount.current) { didMount.current = true; return; }
    const t = setTimeout(() => fetchList({ q, status, page }), 300);
    return () => clearTimeout(t);
  }, [q, status, page, fetchList]);

  const changeStatus = async (id, newStatus) => {
    const prev = clientes;
    setSavingId(id);
    setClientes((cs) => cs.map((c) => (c.id === id ? { ...c, status: newStatus } : c)));
    try {
      const res = await fetch(`/api/backend/clientes/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setClientes(prev); // reverte
    } finally {
      setSavingId(null);
    }
  };

  const total = pagination.total ?? 0;
  const pages = pagination.pages ?? 1;
  const from = total === 0 ? 0 : (page - 1) * LIMIT + 1;
  const to = Math.min(page * LIMIT, total);

  return (
    <div className="space-y-4">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-white">Clientes</h1>
          <p className="text-sm text-white/45">
            {loading ? "Carregando…" : `${total} cliente${total === 1 ? "" : "s"}${status || q ? " no filtro" : ""}`}
          </p>
        </div>
        <Link href="/clientes/adicionar" className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-500">
          <Plus className="h-4 w-4" /> Adicionar cliente
        </Link>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2.5 rounded-2xl border border-white/10 bg-white/[0.025] p-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
          <input
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1); }}
            placeholder="Buscar por nome, e-mail ou CPF…"
            className="w-full rounded-lg border border-white/10 bg-white/[0.03] py-2.5 pl-9 pr-3 text-sm text-white placeholder-white/25 outline-none transition-colors focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/25"
          />
        </div>
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white outline-none transition-colors focus:border-orange-500/50 [&>option]:bg-[#0f1a30]"
        >
          <option value="">Todos os status</option>
          {STATUS_LIST.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <button
          type="button"
          onClick={() => fetchList({ q, status, page })}
          className="inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] p-2.5 text-white/60 transition-colors hover:text-white"
          title="Recarregar"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Tabela */}
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
        {clientes.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-white/30">
              <Inbox className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">Nenhum cliente encontrado</p>
              <p className="text-xs text-white/40">{q || status ? "Ajuste a busca ou o filtro." : "Cadastre o primeiro cliente para começar."}</p>
            </div>
            {!q && !status && (
              <Link href="/clientes/adicionar" className="mt-1 inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700">
                <Plus className="h-4 w-4" /> Adicionar cliente
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/[0.07] text-[10px] uppercase tracking-[0.1em] text-white/40">
                  <th className="px-4 py-3 font-semibold">Cliente</th>
                  <th className="px-4 py-3 font-semibold">CPF</th>
                  <th className="px-4 py-3 font-semibold">Contato</th>
                  <th className="px-4 py-3 text-right font-semibold">Renda</th>
                  <th className="px-4 py-3 font-semibold">Responsável</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 text-right font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody className={loading ? "opacity-50 transition-opacity" : "transition-opacity"}>
                {clientes.map((c) => (
                  <tr key={c.id} className="border-b border-white/[0.05] last:border-0 hover:bg-white/[0.03]">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.06] text-xs font-semibold text-white/70">
                          {initialsOf(c.nome)}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-white">{c.nome || "—"}</p>
                          <p className="truncate text-xs text-white/40">{c.email || "sem e-mail"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 tabular-nums text-white/60">{c.cpf ? maskCPF(c.cpf) : "—"}</td>
                    <td className="px-4 py-3 text-white/60">
                      {c.telefone ? (
                        <a href={`https://wa.me/55${(c.telefone || "").replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 hover:text-white">
                          <Phone className="h-3.5 w-3.5" /> {c.telefone}
                        </a>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-white/80">{formatRenda(c) ? `R$ ${formatRenda(c)}` : "—"}</td>
                    <td className="px-4 py-3 text-white/60">{c.user?.first_name || "—"}</td>
                    <td className="px-4 py-3">
                      {canChangeStatus
                        ? <StatusControl cliente={c} onChange={changeStatus} saving={savingId === c.id} />
                        : <StatusBadge status={c.status} />}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setNotesFor({ id: c.id, nome: c.nome })}
                          className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                            (c.notasCount ?? 0) > 0
                              ? "border-orange-500/40 bg-orange-500/10 text-orange-300 hover:border-orange-500/60"
                              : "border-white/10 text-white/60 hover:border-white/25 hover:text-white"
                          }`}
                          title={(c.notasCount ?? 0) > 0 ? "Ver e adicionar notas" : "Adicionar nota"}
                        >
                          <StickyNote className="h-3.5 w-3.5" />
                          <span className="tabular-nums">{c.notasCount ?? 0}</span>
                        </button>
                        <Link href={`/editar-cliente/${c.id}`} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs font-semibold text-white/60 transition-colors hover:border-white/25 hover:text-white">
                          <Pencil className="h-3.5 w-3.5" /> Editar
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Paginação */}
      {total > 0 && (
        <div className="flex items-center justify-between text-xs text-white/45">
          <span className="tabular-nums">{from}–{to} de {total}</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1.5 font-medium text-white/70 transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Anterior
            </button>
            <span className="px-2 tabular-nums">{page} / {pages}</span>
            <button
              type="button"
              disabled={page >= pages || loading}
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1.5 font-medium text-white/70 transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              Próximo <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Modal de notas */}
      {notesFor && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setNotesFor(null)}
        >
          <div
            className="mt-[6vh] w-full max-w-xl rounded-2xl border border-white/10 bg-[#0f1a30] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <StickyNote className="h-4 w-4 shrink-0 text-white/50" />
                <h3 className="truncate text-sm font-semibold text-white">Notas — {notesFor.nome || "Cliente"}</h3>
              </div>
              <button
                type="button"
                onClick={() => setNotesFor(null)}
                className="rounded-lg p-1.5 text-white/50 transition-colors hover:bg-white/5 hover:text-white"
                title="Fechar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto p-5">
              <ClienteNotas
                clienteId={notesFor.id}
                embedded
                onCountChange={(n) =>
                  setClientes((cs) => cs.map((c) => (c.id === notesFor.id ? { ...c, notasCount: n } : c)))
                }
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
