"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import {
  Search, Plus, Pencil, ChevronLeft, ChevronRight, Loader2,
  Phone, SlidersHorizontal, Inbox, RefreshCw, StickyNote, X,
  LayoutGrid, Rows3, GripVertical,
} from "lucide-react";
import { STATUS_LIST, statusInfo } from "@/lib/cliente-status";
import { ClienteNotas } from "@/components/ClienteNotas";
import { ClienteDrawer } from "@/components/ClienteDrawer";

const LIMIT = 12;
// No Kanban a paginação não faz sentido — uma lane com "12 de 15" mente sobre
// o tamanho da coluna. Buscamos a carteira inteira de uma vez.
const KANBAN_LIMIT = 300;

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

// Status como FLECHA de esteira: forma cheia no tom semântico, com o nome
// em branco dentro. A cor identifica o estágio de longe; o nome dentro é que
// informa — a leitura não depende de distinguir matiz.
function StatusBadge({ status }) {
  const info = statusInfo(status);
  return (
    <span
      className="cx-chevron inline-flex w-[190px] items-center py-1 pl-2.5 text-[11px] font-semibold whitespace-nowrap text-white"
      style={{ backgroundColor: info.solid }}
      title={info.label}
    >
      <span className="truncate">{info.label}</span>
    </span>
  );
}

// A mesma flecha, mas clicável: vira <select> para admin/correspondente
// (PATCH inline). O <select> fica transparente por cima da forma, então o
// clique em qualquer ponto da flecha abre a lista.
function StatusControl({ cliente, onChange, saving }) {
  const info = statusInfo(cliente.status);
  // Largura fixa para todas as flechas (a coluna lê como uma esteira). O
  // <select> nativo se dimensionaria pela opção mais longa e ignoraria essa
  // largura, então quem desenha é o texto visível e o <select> fica invisível
  // por cima, cobrindo a flecha inteira — clique em qualquer ponto abre a lista.
  return (
    <div
      className="cx-chevron relative inline-flex w-[190px] items-center py-1 pl-2.5 text-[11px] font-semibold whitespace-nowrap text-white transition-opacity hover:opacity-90"
      style={{ backgroundColor: info.solid }}
      title={info.label}
    >
      <span className="flex-1 truncate">{info.label}</span>
      {saving
        ? <Loader2 className="ml-1.5 h-3 w-3 shrink-0 animate-spin text-white" />
        : <SlidersHorizontal className="ml-1.5 h-3 w-3 shrink-0 text-white/80" />}
      <select
        value={cliente.status}
        disabled={saving}
        onChange={(e) => onChange(cliente.id, e.target.value)}
        className="absolute inset-0 h-full w-full cursor-pointer appearance-none opacity-0 disabled:cursor-wait [&>option]:bg-white [&>option]:text-cx-text"
        title="Alterar status"
        aria-label={`Status: ${info.label}. Alterar`}
      >
        {STATUS_LIST.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
      </select>
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
  const [view, setView] = useState("lista"); // "lista" | "kanban"
  const [editingId, setEditingId] = useState(null); // painel lateral de edição
  const [dragId, setDragId] = useState(null);
  const [overLane, setOverLane] = useState(null);

  // Preferência de visão sobrevive ao reload (só conveniência local, por isso
  // localStorage e não servidor). Em janela anônima o acesso pode lançar.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("clientes:view");
      if (saved === "kanban" || saved === "lista") setView(saved);
    } catch {}
  }, []);
  const changeView = (v) => {
    setView(v);
    try { window.localStorage.setItem("clientes:view", v); } catch {}
  };

  // Fecha o modal de notas com Esc.
  useEffect(() => {
    if (!notesFor) return;
    const onKey = (e) => { if (e.key === "Escape") setNotesFor(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [notesFor]);

  const fetchList = useCallback(async ({ q, status, page, limit = LIMIT }) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (q) params.set("search", q);
      if (status) params.set("status", status);
      const res = await fetch(`/api/backend/clientes?${params.toString()}`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      setClientes(Array.isArray(data) ? data : data.clientes ?? []);
      setPagination(data.pagination ?? { total: 0, page: 1, limit, pages: 1 });
    } finally {
      setLoading(false);
    }
  }, []);

  const didMount = useRef(false);
  useEffect(() => {
    // Alternar para o Kanban precisa refazer a busca mesmo no primeiro efeito:
    // o initialData do servidor veio paginado em LIMIT.
    if (!didMount.current && view === "lista") { didMount.current = true; return; }
    didMount.current = true;
    const limit = view === "kanban" ? KANBAN_LIMIT : LIMIT;
    const t = setTimeout(() => fetchList({ q, status, page: view === "kanban" ? 1 : page, limit }), 300);
    return () => clearTimeout(t);
  }, [q, status, page, view, fetchList]);

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

  // Uma lane por status do enum, na ordem do STATUS_LIST (que já reflete a
  // ordem do atendimento). Todo cliente cai em alguma lane — se o status vier
  // fora do enum, entra na lane "Sem status".
  const lanes = useMemo(() => {
    const porStatus = new Map(STATUS_LIST.map((s) => [s.value, []]));
    const orfaos = [];
    for (const c of clientes) {
      const bucket = porStatus.get(c.status);
      if (bucket) bucket.push(c);
      else orfaos.push(c);
    }
    const out = STATUS_LIST.map((s) => ({ ...s, ...statusInfo(s.value), cards: porStatus.get(s.value) }));
    if (orfaos.length) out.push({ value: "", label: "Sem status", ...statusInfo(""), cards: orfaos });
    return out;
  }, [clientes]);

  const onDropLane = (laneValue) => {
    setOverLane(null);
    const id = dragId;
    setDragId(null);
    if (!id || !laneValue) return;
    const atual = clientes.find((c) => c.id === id);
    if (!atual || atual.status === laneValue) return;
    changeStatus(id, laneValue);
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
          <h1 className="text-xl font-semibold tracking-tight text-cx-text">Clientes</h1>
          <p className="text-sm text-cx-muted">
            {loading ? "Carregando…" : `${total} cliente${total === 1 ? "" : "s"}${status || q ? " no filtro" : ""}`}
          </p>
        </div>
        <Link href="/clientes/adicionar" className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-500">
          <Plus className="h-4 w-4" /> Adicionar cliente
        </Link>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2.5 rounded-2xl border border-cx-border bg-cx-surface p-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cx-muted" />
          <input
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1); }}
            placeholder="Buscar por nome, e-mail ou CPF…"
            className="w-full rounded-lg border border-cx-border bg-cx-surface py-2.5 pl-9 pr-3 text-sm text-cx-text placeholder-[#9aa6b4] outline-none transition-colors focus:border-cx-blue focus:ring-2 focus:ring-cx-blue/20"
          />
        </div>
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="rounded-lg border border-cx-border bg-cx-surface px-3 py-2.5 text-sm text-cx-text outline-none transition-colors focus:border-cx-blue [&>option]:bg-white [&>option]:text-cx-text"
        >
          <option value="">Todos os status</option>
          {STATUS_LIST.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <div className="inline-flex overflow-hidden rounded-lg border border-cx-border">
          {[
            { id: "lista", label: "Lista", Icon: Rows3 },
            { id: "kanban", label: "Kanban", Icon: LayoutGrid },
          ].map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => changeView(id)}
              aria-pressed={view === id}
              className={`inline-flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold transition-colors ${
                view === id ? "bg-cx-blue text-white" : "bg-cx-surface text-cx-muted hover:bg-cx-bg"
              }`}
            >
              <Icon className="h-3.5 w-3.5" /> {label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => fetchList({ q, status, page, limit: view === "kanban" ? KANBAN_LIMIT : LIMIT })}
          className="inline-flex items-center justify-center rounded-lg border border-cx-border bg-cx-surface p-2.5 text-cx-muted transition-colors hover:text-cx-text"
          title="Recarregar"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Tabela */}
      {view === "lista" && (
      <div className="overflow-hidden rounded-2xl border border-cx-border bg-cx-surface">
        {clientes.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cx-border bg-cx-surface text-cx-muted">
              <Inbox className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-cx-text">Nenhum cliente encontrado</p>
              <p className="text-xs text-cx-muted">{q || status ? "Ajuste a busca ou o filtro." : "Cadastre o primeiro cliente para começar."}</p>
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
                <tr className="border-b border-cx-border/[0.15] text-[10px] uppercase tracking-[0.1em] text-cx-muted">
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
                  <tr key={c.id} className="border-b border-cx-border/[0.12] last:border-0 hover:bg-cx-surface">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-cx-border bg-cx-surface text-xs font-semibold text-cx-muted">
                          {initialsOf(c.nome)}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-cx-text">{c.nome || "—"}</p>
                          <p className="truncate text-xs text-cx-muted">{c.email || "sem e-mail"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 tabular-nums text-cx-muted">{c.cpf ? maskCPF(c.cpf) : "—"}</td>
                    <td className="px-4 py-3 text-cx-muted">
                      {c.telefone ? (
                        <a href={`https://wa.me/55${(c.telefone || "").replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 hover:text-cx-text">
                          <Phone className="h-3.5 w-3.5" /> {c.telefone}
                        </a>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-cx-muted">{formatRenda(c) ? `R$ ${formatRenda(c)}` : "—"}</td>
                    <td className="px-4 py-3 text-cx-muted">{c.user?.first_name || "—"}</td>
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
                              ? "border-orange-200 bg-orange-50 text-orange-700 hover:border-orange-500/60"
                              : "border-cx-border text-cx-muted hover:border-cx-border hover:text-cx-text"
                          }`}
                          title={(c.notasCount ?? 0) > 0 ? "Ver e adicionar notas" : "Adicionar nota"}
                        >
                          <StickyNote className="h-3.5 w-3.5" />
                          <span className="tabular-nums">{c.notasCount ?? 0}</span>
                        </button>
                        <Link href={`/editar-cliente/${c.id}`} className="inline-flex items-center gap-1.5 rounded-lg border border-cx-border px-2.5 py-1.5 text-xs font-semibold text-cx-muted transition-colors hover:border-cx-border hover:text-cx-text">
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
      )}

      {/* Kanban — as lanes se encaixam uma na outra como peças de quebra-cabeça:
          cada cabeçalho tem a ponta à direita e o mesmo recorte à esquerda, então
          a ponta de uma entra no vão da seguinte. */}
      {view === "kanban" && (
        <div className={`overflow-x-auto pb-2 ${loading ? "opacity-50 transition-opacity" : "transition-opacity"}`}>
          <div className="flex min-w-max gap-0 pr-4">
            {lanes.map((lane, i) => (
              <div
                key={lane.value || "sem-status"}
                className="flex w-[228px] shrink-0 flex-col"
                onDragOver={(e) => { e.preventDefault(); setOverLane(lane.value); }}
                onDragLeave={() => setOverLane((v) => (v === lane.value ? null : v))}
                onDrop={(e) => { e.preventDefault(); onDropLane(lane.value); }}
              >
                <div
                  className={`${i === 0 ? "cx-chevron" : "cx-chevron cx-chevron-linked"} flex items-center gap-2 py-2.5 text-[11px] font-semibold text-white`}
                  style={{ backgroundColor: lane.solid }}
                  title={`${lane.label} — ${lane.cards.length}`}
                >
                  <span className="flex-1 truncate">{lane.label}</span>
                  <span className="rounded-full bg-black/20 px-1.5 py-0.5 text-[10px] tabular-nums">
                    {lane.cards.length}
                  </span>
                </div>

                <div
                  className={`mr-2 mt-2 flex min-h-[120px] flex-1 flex-col gap-2 rounded-xl border p-2 transition-colors ${
                    overLane === lane.value && dragId
                      ? "border-cx-blue bg-cx-blue-soft"
                      : "border-cx-border bg-cx-bg"
                  }`}
                >
                  {lane.cards.length === 0 ? (
                    <p className="px-1 py-6 text-center text-[11px] text-cx-muted">Vazio</p>
                  ) : (
                    lane.cards.map((c) => (
                      <article
                        key={c.id}
                        draggable={canChangeStatus}
                        onDragStart={() => setDragId(c.id)}
                        onDragEnd={() => { setDragId(null); setOverLane(null); }}
                        onClick={() => setEditingId(c.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setEditingId(c.id); }
                        }}
                        className={`group rounded-lg border border-cx-border bg-cx-surface p-2.5 shadow-sm transition-shadow hover:border-cx-blue hover:shadow-md ${
                          canChangeStatus ? "cursor-grab active:cursor-grabbing" : ""
                        } ${dragId === c.id ? "opacity-40" : ""}`}
                      >
                        <div className="flex items-start gap-2">
                          {canChangeStatus && (
                            <GripVertical className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cx-border group-hover:text-cx-muted" />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-semibold text-cx-text">{c.nome || "—"}</p>
                            <p className="truncate text-[11px] tabular-nums text-cx-muted">
                              {c.cpf ? maskCPF(c.cpf) : "sem CPF"}
                            </p>
                          </div>
                        </div>

                        <dl className="mt-2 space-y-0.5 text-[11px]">
                          <div className="flex justify-between gap-2">
                            <dt className="text-cx-muted">Renda</dt>
                            <dd className="tabular-nums font-medium text-cx-text">
                              {formatRenda(c) ? `R$ ${formatRenda(c)}` : "—"}
                            </dd>
                          </div>
                          <div className="flex justify-between gap-2">
                            <dt className="text-cx-muted">Resp.</dt>
                            <dd className="truncate font-medium text-cx-text">{c.user?.first_name || "—"}</dd>
                          </div>
                        </dl>

                        <div className="mt-2 flex items-center justify-between gap-2 border-t border-cx-border pt-2">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setNotesFor({ id: c.id, nome: c.nome }); }}
                            className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-1 text-[10px] font-medium transition-colors ${
                              (c.notasCount ?? 0) > 0
                                ? "border-orange-200 bg-orange-50 text-orange-700"
                                : "border-cx-border text-cx-muted hover:text-cx-text"
                            }`}
                            title="Notas"
                          >
                            <StickyNote className="h-3 w-3" />
                            <span className="tabular-nums">{c.notasCount ?? 0}</span>
                          </button>
                          {savingId === c.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-cx-muted" />
                          ) : (
                            <Link
                              href={`/editar-cliente/${c.id}`}
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 rounded-md border border-cx-border px-1.5 py-1 text-[10px] font-semibold text-cx-muted transition-colors hover:text-cx-text"
                            >
                              <Pencil className="h-3 w-3" /> Editar
                            </Link>
                          )}
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Paginação — só na lista; o Kanban carrega a carteira inteira */}
      {view === "lista" && total > 0 && (
        <div className="flex items-center justify-between text-xs text-cx-muted">
          <span className="tabular-nums">{from}–{to} de {total}</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 rounded-lg border border-cx-border px-2.5 py-1.5 font-medium text-cx-muted transition-colors hover:text-cx-text disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Anterior
            </button>
            <span className="px-2 tabular-nums">{page} / {pages}</span>
            <button
              type="button"
              disabled={page >= pages || loading}
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              className="inline-flex items-center gap-1 rounded-lg border border-cx-border px-2.5 py-1.5 font-medium text-cx-muted transition-colors hover:text-cx-text disabled:cursor-not-allowed disabled:opacity-40"
            >
              Próximo <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Painel lateral de edição rápida */}
      {editingId && (
        <ClienteDrawer
          clienteId={editingId}
          onClose={() => setEditingId(null)}
          onSaved={(id, patch) =>
            setClientes((cs) => cs.map((c) => (c.id === id ? { ...c, ...patch } : c)))
          }
        />
      )}

      {/* Modal de notas */}
      {notesFor && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setNotesFor(null)}
        >
          <div
            className="mt-[6vh] w-full max-w-xl rounded-2xl border border-cx-border bg-cx-surface shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-cx-border px-5 py-3.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <StickyNote className="h-4 w-4 shrink-0 text-cx-muted" />
                <h3 className="truncate text-sm font-semibold text-cx-text">Notas — {notesFor.nome || "Cliente"}</h3>
              </div>
              <button
                type="button"
                onClick={() => setNotesFor(null)}
                className="rounded-lg p-1.5 text-cx-muted transition-colors hover:bg-cx-bg hover:text-cx-text"
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
