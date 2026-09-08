"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import {
  Search, Plus, Pencil, ChevronLeft, ChevronRight, ChevronDown, Loader2,
  Phone, MessageCircle, MoreVertical, Inbox, RefreshCw, StickyNote,
  LayoutGrid, Rows3, GripVertical, SlidersHorizontal, X,
  CheckCircle2, XCircle, Clock3, CircleDot,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { STATUS_LIST, statusInfo } from "@/lib/cliente-status";
import { ClienteNotas } from "@/components/ClienteNotas";
import { ClienteDrawer } from "@/components/ClienteDrawer";

const LIMIT = 12;
// No Kanban a paginação não faz sentido — uma lane com "12 de 15" mente sobre
// o tamanho da coluna. Buscamos a carteira inteira de uma vez.
const KANBAN_LIMIT = 300;

// Altura única de todo controle da toolbar. Um só valor evita a régua irregular
// que aparece quando input, select e botão vêm cada um com a altura padrão do
// seu componente; 44px também é alvo de toque confortável no celular.
const CONTROLE = "h-11";

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

// Ícone da lane. Derivado do `tone` que o STATUS_MAP já declara — não é um
// ícone inventado por status, é a leitura semântica que o sistema já fazia
// (positive/negative/attention/neutral) ganhando forma visual.
const ICONE_POR_TOM = {
  positive: CheckCircle2,
  negative: XCircle,
  attention: Clock3,
  neutral: CircleDot,
};

// Janela de páginas para a paginação numerada: sempre a 1ª e a última, mais
// uma faixa de 5 páginas consecutivas ao redor da atual (encostada no começo
// ou no fim quando a atual está perto de uma das pontas), e reticências no que
// for pulado. Devolve números e strings "…N", que a UI renderiza como
// separador inerte — a string precisa ser única por posição para servir de key.
const JANELA = 5;

function janelaDePaginas(atual, total) {
  if (total <= JANELA + 2) return Array.from({ length: total }, (_, i) => i + 1);
  let inicio = Math.max(2, atual - Math.floor(JANELA / 2));
  let fim = inicio + JANELA - 1;
  if (fim >= total) {
    fim = total - 1;
    inicio = Math.max(2, fim - JANELA + 1);
  }
  const paginas = [1];
  for (let n = inicio; n <= fim; n += 1) paginas.push(n);
  paginas.push(total);
  const saida = [];
  for (let i = 0; i < paginas.length; i += 1) {
    if (i > 0 && paginas[i] - paginas[i - 1] > 1) saida.push(`…${i}`);
    saida.push(paginas[i]);
  }
  return saida;
}

// Ações rápidas de um cliente: falar no WhatsApp, ligar e um menu com o resto.
// Usada na linha da tabela, no card do celular e no card do Kanban, para as três
// visões terem o mesmo repertório. Todo clique aqui é isolado com
// stopPropagation — o contêiner ao redor abre o drawer, e essas ações não devem
// disparar isso.
function AcoesRapidas({ cliente, onNotas, compacto = false }) {
  const fone = (cliente.telefone || "").replace(/\D/g, "");
  const tamanho = compacto ? "icon-xs" : "icon-sm";
  return (
    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
      {fone ? (
        <Button
          variant="ghost"
          size={tamanho}
          nativeButton={false}
          render={<a href={`https://wa.me/55${fone}`} target="_blank" rel="noreferrer" />}
          className="text-cx-muted hover:text-emerald-700"
          title="Falar no WhatsApp"
          aria-label={`Falar com ${cliente.nome || "cliente"} no WhatsApp`}
        >
          <MessageCircle />
        </Button>
      ) : null}
      {fone ? (
        <Button
          variant="ghost"
          size={tamanho}
          nativeButton={false}
          render={<a href={`tel:+55${fone}`} />}
          className="text-cx-muted hover:text-cx-blue"
          title="Ligar"
          aria-label={`Ligar para ${cliente.nome || "cliente"}`}
        >
          <Phone />
        </Button>
      ) : null}
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="ghost" size={tamanho} className="text-cx-muted" />}
          title="Mais ações"
          aria-label={`Mais ações para ${cliente.nome || "cliente"}`}
        >
          <MoreVertical />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-48!">
          <DropdownMenuItem render={<Link href={`/editar-cliente/${cliente.id}`} />}>
            <Pencil /> Editar cliente
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onNotas({ id: cliente.id, nome: cliente.nome })}>
            <StickyNote /> Notas
            <span className="ml-auto tabular-nums text-cx-muted">{cliente.notasCount ?? 0}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// Status como PÍLULA suave: fundo tingido no tom do estágio e o nome escrito
// na cor cheia. A largura acompanha o texto — nomes curtos deixam de ocupar a
// mesma faixa que os longos, e a coluna respira.
//
// O par fundo/tinta vem de statusInfo (soft/ink), calculado para passar AA;
// não troque por STATUS_COLOR direto, que só passa sobre branco puro.
function StatusBadge({ status, className }) {
  const info = statusInfo(status);
  return (
    <Badge
      variant="secondary"
      className={cn("h-auto max-w-[190px] py-1 text-[11px] font-semibold", className)}
      style={{ backgroundColor: info.soft, color: info.ink }}
      title={info.label}
    >
      <span className="truncate">{info.label}</span>
    </Badge>
  );
}

// A mesma pílula, mas clicável: vira um Select para admin/correspondente
// (PATCH inline). O gatilho herda o par soft/ink do status atual, então a
// leitura de cor continua idêntica à do badge somente-leitura.
function StatusControl({ cliente, onChange, saving, className }) {
  const info = statusInfo(cliente.status);
  return (
    <Select
      value={cliente.status}
      onValueChange={(v) => v && v !== cliente.status && onChange(cliente.id, v)}
      disabled={saving}
    >
      <SelectTrigger
        size="sm"
        className={cn(
          "h-auto max-w-[210px] gap-1 rounded-full border-transparent py-1 pr-1.5 pl-2.5 text-[11px] font-semibold hover:opacity-80 disabled:cursor-wait [&>svg:last-child]:size-3 [&>svg:last-child]:opacity-70",
          className
        )}
        style={{ backgroundColor: info.soft, color: info.ink }}
        title={info.label}
        aria-label={`Status: ${info.label}. Alterar`}
      >
        <SelectValue>{() => <span className="truncate">{info.label}</span>}</SelectValue>
        {saving ? <Loader2 className="size-3 shrink-0 animate-spin" /> : null}
      </SelectTrigger>
      <SelectContent className="max-h-72 w-auto! min-w-64!">
        {STATUS_LIST.map((s) => (
          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// Placeholder de carregamento com a mesma altura da linha real, para a tabela
// não pular de tamanho quando os dados chegam.
function LinhasEsqueleto({ colunas }) {
  return Array.from({ length: 6 }).map((_, i) => (
    <TableRow key={i}>
      {Array.from({ length: colunas }).map((__, j) => (
        <TableCell key={j} className="px-4 py-3">
          <Skeleton className="h-5 w-full" />
        </TableCell>
      ))}
    </TableRow>
  ));
}

export function ClientesLista({ initialSearch = "",
  initialData,
  initialStatus = "",
  initialView = "lista",
  initialCorretor = "",
  initialInicio = "",
  initialFim = "",
  responsaveis = [],
}) {
  const { user } = useAuth();
  const canChangeStatus = !!(user?.is_administrador || user?.is_correspondente);

  const [clientes, setClientes] = useState(initialData?.clientes ?? []);
  const [pagination, setPagination] = useState(initialData?.pagination ?? { total: (initialData?.clientes ?? []).length, page: 1, limit: LIMIT, pages: 1 });
  const [q, setQ] = useState(initialSearch);
  const [status, setStatus] = useState(initialStatus);
  const [corretor, setCorretor] = useState(initialCorretor);
  const [inicio, setInicio] = useState(initialInicio);
  const [fim, setFim] = useState(initialFim);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [notesFor, setNotesFor] = useState(null); // { id, nome } — modal de notas
  const [view, setView] = useState(initialView); // "lista" | "kanban"
  const [editingId, setEditingId] = useState(null); // painel lateral de edição
  const [dragId, setDragId] = useState(null);
  const [overLane, setOverLane] = useState(null);
  const [filtrosAbertos, setFiltrosAbertos] = useState(false); // só no celular

  // Preferência de visão sobrevive ao reload (só conveniência local, por isso
  // localStorage e não servidor). Em janela anônima o acesso pode lançar.
  useEffect(() => {
    if (initialView === "kanban") return;
    try {
      const saved = window.localStorage.getItem("clientes:view");
      if (saved === "kanban" || saved === "lista") setView(saved);
    } catch {}
  }, [initialView]);
  const changeView = (v) => {
    if (!v) return;
    setView(v);
    try { window.localStorage.setItem("clientes:view", v); } catch {}
  };

  const fetchList = useCallback(async ({ q, status, corretor, inicio, fim, page, limit = LIMIT }) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (q) params.set("search", q);
      if (status) params.set("status", status);
      if (corretor) params.set("corretor", corretor);
      if (inicio) params.set("inicio", inicio);
      if (fim) params.set("fim", fim);
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
    const t = setTimeout(() => fetchList({ q, status, corretor, inicio, fim, page: view === "kanban" ? 1 : page, limit }), 300);
    return () => clearTimeout(t);
  }, [q, status, corretor, inicio, fim, page, view, fetchList]);

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

  const temFiltro = !!(q || status || corretor || inicio || fim);
  const filtrosAtivos = [status, corretor, inicio, fim].filter(Boolean).length;
  const limparFiltros = () => {
    setStatus(""); setCorretor(""); setInicio(""); setFim(""); setPage(1);
  };
  const recarregar = () =>
    fetchList({ q, status, corretor, inicio, fim, page, limit: view === "kanban" ? KANBAN_LIMIT : LIMIT });

  const vazio = clientes.length === 0 && !loading;

  return (
    <div className="space-y-4">
      {/* Cabeçalho — em telas estreitas o botão desce e ocupa a largura toda,
          em vez de espremer o título contra ele. */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-cx-text sm:text-2xl">Clientes</h1>
          <p className="text-sm text-cx-muted">
            {loading ? "Carregando…" : `${total} cliente${total === 1 ? "" : "s"}${temFiltro ? " no filtro" : ""}`}
          </p>
        </div>
        {/* `bg-cx-orange` e reescrito para o azul institucional por
            crm-design.css; a classe fica porque e a do botao primario em todas
            as outras telas — trocar so aqui faria esta pagina destoar. */}
        <Button
          nativeButton={false}
          render={<Link href="/clientes/adicionar" />}
          className={cn(CONTROLE, "w-full gap-2 bg-cx-orange px-4 text-sm font-semibold text-white hover:bg-cx-orange-dark sm:w-auto")}
        >
          <Plus /> Adicionar cliente
        </Button>
      </div>

      {/* Toolbar. Busca e visão ficam sempre visíveis; os filtros secundários
          são uma linha própria a partir de lg e um painel dobrável abaixo
          disso, para não virar uma parede de controles no celular. */}
      <Card className="gap-0 ring-cx-border bg-cx-surface p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative order-first basis-full sm:order-none sm:min-w-[200px] sm:flex-1 sm:basis-auto">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-cx-muted" />
            <Input
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
              placeholder="Buscar por nome, e-mail ou CPF…"
              aria-label="Buscar clientes"
              className={cn(CONTROLE, "border-cx-border pl-10! text-sm")}
            />
          </div>

          <ToggleGroup
            value={[view]}
            onValueChange={(v) => changeView(v[0])}
            spacing={0}
            variant="outline"
            aria-label="Modo de visualização"
            className={cn(CONTROLE, "shrink-0")}
          >
            <ToggleGroupItem value="lista" aria-label="Ver em lista" className="h-full px-3">
              <Rows3 /> <span className="hidden sm:inline">Lista</span>
            </ToggleGroupItem>
            <ToggleGroupItem value="kanban" aria-label="Ver em kanban" className="h-full px-3">
              <LayoutGrid /> <span className="hidden sm:inline">Kanban</span>
            </ToggleGroupItem>
          </ToggleGroup>

          <Button
            variant="outline"
            onClick={recarregar}
            aria-label="Recarregar lista"
            title="Recarregar"
            className={cn(CONTROLE, "aspect-square shrink-0 border-cx-border p-0 text-cx-muted")}
          >
            <RefreshCw className={loading ? "animate-spin" : undefined} />
          </Button>

          {/* Só no celular/tablet: abre a linha de filtros. */}
          <Button
            variant="outline"
            onClick={() => setFiltrosAbertos((v) => !v)}
            aria-expanded={filtrosAbertos}
            className={cn(CONTROLE, "shrink-0 gap-2 border-cx-border text-cx-muted lg:hidden")}
          >
            <SlidersHorizontal /> Filtros
            {filtrosAtivos > 0 ? (
              <span className="inline-flex size-5 items-center justify-center rounded-full bg-cx-blue text-[10px] font-bold text-white tabular-nums">
                {filtrosAtivos}
              </span>
            ) : null}
          </Button>
        </div>

        {/* Linha de filtros: sempre aberta em lg+, dobrável abaixo disso. */}
        <Collapsible open={filtrosAbertos} onOpenChange={setFiltrosAbertos}>
          <CollapsibleContent className="lg:hidden">
            <FiltrosSecundarios
              status={status} setStatus={setStatus}
              corretor={corretor} setCorretor={setCorretor}
              inicio={inicio} setInicio={setInicio}
              fim={fim} setFim={setFim}
              responsaveis={responsaveis}
              setPage={setPage}
              filtrosAtivos={filtrosAtivos}
              onLimpar={limparFiltros}
              className="pt-3"
            />
          </CollapsibleContent>
        </Collapsible>
        <FiltrosSecundarios
          status={status} setStatus={setStatus}
          corretor={corretor} setCorretor={setCorretor}
          inicio={inicio} setInicio={setInicio}
          fim={fim} setFim={setFim}
          responsaveis={responsaveis}
          setPage={setPage}
          filtrosAtivos={filtrosAtivos}
          onLimpar={limparFiltros}
          className="hidden pt-3 lg:flex"
        />
      </Card>

      {/* Vazio — um só componente para as duas visões. */}
      {vazio && (
        <Card className="items-center gap-3 ring-cx-border bg-cx-surface py-16 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl border border-cx-border text-cx-muted">
            <Inbox className="size-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-cx-text">Nenhum cliente encontrado</p>
            <p className="text-xs text-cx-muted">
              {temFiltro ? "Ajuste a busca ou os filtros." : "Cadastre o primeiro cliente para começar."}
            </p>
          </div>
          {temFiltro ? (
            <Button variant="outline" onClick={() => { setQ(""); limparFiltros(); }} className="border-cx-border">
              <X /> Limpar filtros
            </Button>
          ) : (
            <Button
              nativeButton={false}
              render={<Link href="/clientes/adicionar" />}
              className="gap-2 bg-cx-orange text-white hover:bg-cx-orange-dark"
            >
              <Plus /> Adicionar cliente
            </Button>
          )}
        </Card>
      )}

      {/* LISTA — tabela a partir de md; abaixo disso, cartões, porque uma
          tabela de 7 colunas em 360px só existe como rolagem lateral. */}
      {view === "lista" && !vazio && (
        <>
          <Card className="hidden overflow-hidden ring-cx-border bg-cx-surface p-0 lg:block">
            <Table className="min-w-[680px]">
              <TableHeader>
                <TableRow className="border-cx-border/[0.15] hover:bg-transparent">
                  {["Cliente", "CPF", "Contato", "Renda", "Responsável", "Status", "Ações"].map((h, i) => (
                    <TableHead
                      key={h}
                      className={cn(
                        "px-3! py-3! text-[10px] font-semibold tracking-[0.1em] text-cx-muted uppercase",
                        (i === 3 || i === 6) && "text-right",
                        i === 1 && "hidden xl:table-cell",
                        i === 4 && "hidden xl:table-cell"
                      )}
                    >
                      {h}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && clientes.length === 0 ? (
                  <LinhasEsqueleto colunas={7} />
                ) : (
                  clientes.map((c) => (
                    <TableRow
                      key={c.id}
                      onClick={() => setEditingId(c.id)}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setEditingId(c.id); }
                      }}
                      aria-label={`Abrir ${c.nome || "cliente"}`}
                      className={cn(
                        "cursor-pointer border-cx-border/[0.12] hover:bg-cx-bg focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-cx-blue",
                        loading && "opacity-50 transition-opacity"
                      )}
                    >
                      <TableCell className="px-3! py-3!">
                        <div className="flex items-center gap-3">
                          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-cx-border text-xs font-semibold text-cx-muted">
                            {initialsOf(c.nome)}
                          </span>
                          <span className="block min-w-0">
                            <span className="block truncate font-medium text-cx-text">{c.nome || "—"}</span>
                            <span className="block truncate text-xs text-cx-muted">{c.email || "sem e-mail"}</span>
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden px-3! py-3! text-cx-muted tabular-nums xl:table-cell">
                        {c.cpf ? maskCPF(c.cpf) : "—"}
                      </TableCell>
                      <TableCell className="px-3! py-3! text-cx-muted">
                        {c.telefone ? (
                          <a
                            href={`https://wa.me/55${(c.telefone || "").replace(/\D/g, "")}`}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1.5 hover:text-cx-text"
                          >
                            <Phone className="size-3.5" /> {c.telefone}
                          </a>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="px-3! py-3! text-right text-cx-muted tabular-nums">
                        {formatRenda(c) ? `R$ ${formatRenda(c)}` : "—"}
                      </TableCell>
                      <TableCell className="hidden px-3! py-3! text-cx-muted xl:table-cell">
                        {c.user?.first_name || "—"}
                      </TableCell>
                      <TableCell className="px-3! py-3!" onClick={(e) => e.stopPropagation()}>
                        {canChangeStatus
                          ? <StatusControl cliente={c} onChange={changeStatus} saving={savingId === c.id} />
                          : <StatusBadge status={c.status} />}
                      </TableCell>
                      <TableCell className="px-3! py-3!">
                        <div className="flex items-center justify-end">
                          <AcoesRapidas cliente={c} onNotas={setNotesFor} />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>

          {/* Mesma lista em cartões, para telas estreitas. */}
          <div className="grid gap-2 lg:hidden">
            {loading && clientes.length === 0
              ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-[112px] rounded-xl" />)
              : clientes.map((c) => (
                <Card
                  key={c.id}
                  onClick={() => setEditingId(c.id)}
                  tabIndex={0}
                  role="button"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setEditingId(c.id); }
                  }}
                  aria-label={`Abrir ${c.nome || "cliente"}`}
                  className={cn(
                    "cursor-pointer gap-3 ring-cx-border bg-cx-surface p-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cx-blue",
                    loading && "opacity-50 transition-opacity"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-cx-border text-xs font-semibold text-cx-muted">
                      {initialsOf(c.nome)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-cx-text">{c.nome || "—"}</p>
                      <p className="truncate text-xs text-cx-muted tabular-nums">
                        {c.cpf ? maskCPF(c.cpf) : "sem CPF"}
                      </p>
                    </div>
                    <AcoesRapidas cliente={c} onNotas={setNotesFor} />
                  </div>

                  <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                    <div className="flex min-w-0 gap-1.5">
                      <dt className="shrink-0 text-cx-muted">Renda</dt>
                      <dd className="truncate font-medium text-cx-text tabular-nums">
                        {formatRenda(c) ? `R$ ${formatRenda(c)}` : "—"}
                      </dd>
                    </div>
                    <div className="flex min-w-0 gap-1.5">
                      <dt className="shrink-0 text-cx-muted">Resp.</dt>
                      <dd className="truncate font-medium text-cx-text">{c.user?.first_name || "—"}</dd>
                    </div>
                  </dl>

                  <div className="flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
                    {canChangeStatus
                      ? <StatusControl cliente={c} onChange={changeStatus} saving={savingId === c.id} />
                      : <StatusBadge status={c.status} />}
                    {c.telefone ? (
                      <span className="truncate text-xs text-cx-muted">{c.telefone}</span>
                    ) : null}
                  </div>
                </Card>
              ))}
          </div>
        </>
      )}

      {/* KANBAN — rolagem horizontal com encaixe: no celular a lane ocupa quase
          a largura da tela e o scroll para uma a uma; no desktop são colunas
          fixas de 264px. */}
      {view === "kanban" && !vazio && (
        <div
          className={cn(
            "-mx-1 overflow-x-auto px-1 pb-2 [scrollbar-width:thin]",
            loading && "opacity-50 transition-opacity"
          )}
        >
          <div className="flex min-w-max gap-3">
            {lanes.map((lane) => {
              const Icone = ICONE_POR_TOM[lane.tone] || CircleDot;
              const ativa = overLane === lane.value && dragId;
              return (
                <section
                  key={lane.value || "sem-status"}
                  className="flex w-full shrink-0 flex-col sm:w-[264px]"
                  onDragOver={(e) => { e.preventDefault(); setOverLane(lane.value); }}
                  onDragLeave={() => setOverLane((v) => (v === lane.value ? null : v))}
                  onDrop={(e) => { e.preventDefault(); onDropLane(lane.value); }}
                  aria-label={`${lane.label} — ${lane.cards.length} cliente(s)`}
                >
                  <header className="overflow-hidden rounded-t-xl border border-b-0 border-cx-border bg-cx-surface">
                    <div className="h-1" style={{ backgroundColor: lane.solid }} />
                    <div className="flex items-center gap-2 px-3 py-2.5">
                      <span
                        className="inline-flex size-6 shrink-0 items-center justify-center rounded-lg"
                        style={{ backgroundColor: lane.soft, color: lane.ink }}
                      >
                        <Icone className="size-3.5" />
                      </span>
                      <span className="min-w-0 flex-1 truncate text-xs font-semibold text-cx-text">
                        {lane.label}
                      </span>
                      <Badge variant="secondary" className="tabular-nums">{lane.cards.length}</Badge>
                    </div>
                  </header>

                  <div
                    className={cn(
                      "flex min-h-[140px] flex-1 flex-col gap-2 rounded-b-xl border border-t-0 p-2 transition-colors",
                      ativa ? "border-cx-blue bg-cx-blue-soft" : "border-cx-border bg-cx-bg"
                    )}
                  >
                    {lane.cards.length === 0 ? (
                      <p className="px-1 py-6 text-center text-[11px] text-cx-muted">Vazio</p>
                    ) : (
                      lane.cards.map((c) => (
                        <Card
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
                          className={cn(
                            "group gap-2 ring-cx-border bg-cx-surface p-2.5 shadow-sm transition-shadow hover:ring-cx-blue hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-cx-blue",
                            canChangeStatus && "cursor-grab active:cursor-grabbing",
                            dragId === c.id && "opacity-40"
                          )}
                        >
                          <div className="flex items-start gap-2">
                            {canChangeStatus && (
                              <GripVertical className="mt-0.5 size-3.5 shrink-0 text-cx-border group-hover:text-cx-muted" />
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-semibold text-cx-text">{c.nome || "—"}</p>
                              <p className="truncate text-[11px] text-cx-muted tabular-nums">
                                {c.cpf ? maskCPF(c.cpf) : "sem CPF"}
                              </p>
                            </div>
                          </div>

                          <dl className="space-y-0.5 text-[11px]">
                            <div className="flex justify-between gap-2">
                              <dt className="text-cx-muted">Renda</dt>
                              <dd className="font-medium text-cx-text tabular-nums">
                                {formatRenda(c) ? `R$ ${formatRenda(c)}` : "—"}
                              </dd>
                            </div>
                            <div className="flex justify-between gap-2">
                              <dt className="text-cx-muted">Resp.</dt>
                              <dd className="truncate font-medium text-cx-text">{c.user?.first_name || "—"}</dd>
                            </div>
                          </dl>

                          <div className="flex items-center justify-between gap-2 border-t border-cx-border pt-2">
                            <span className="inline-flex items-center gap-1 text-[10px] text-cx-muted" title="Notas">
                              <StickyNote className="size-3" />
                              <span className="tabular-nums">{c.notasCount ?? 0}</span>
                            </span>
                            {savingId === c.id
                              ? <Loader2 className="size-3.5 animate-spin text-cx-muted" />
                              : <AcoesRapidas cliente={c} onNotas={setNotesFor} compacto />}
                          </div>
                        </Card>
                      ))
                    )}

                    <Button
                      variant="ghost"
                      size="sm"
                      nativeButton={false}
                      render={<Link href="/clientes/adicionar" />}
                      className="mt-auto w-full gap-1.5 text-[11px] font-semibold text-cx-blue hover:bg-cx-blue-soft"
                    >
                      <Plus /> Adicionar cliente
                    </Button>
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      )}

      {/* Paginação — só na lista; o Kanban carrega a carteira inteira. Os
          números somem no celular, onde não cabem: sobram anterior/próxima e a
          posição escrita. */}
      {view === "lista" && total > 0 && (
        <div className="flex flex-col-reverse items-center justify-between gap-3 text-xs text-cx-muted sm:flex-row">
          <span className="tabular-nums">
            Mostrando {from} a {to} de {total} {total === 1 ? "cliente" : "clientes"}
          </span>
          <nav className="flex items-center gap-1" aria-label="Paginação">
            <Button
              variant="outline"
              size="icon-sm"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              aria-label="Página anterior"
              className="border-cx-border text-cx-muted"
            >
              <ChevronLeft />
            </Button>
            <span className="px-2 font-semibold text-cx-text tabular-nums sm:hidden">
              {page} / {pages}
            </span>
            <span className="hidden items-center gap-1 sm:flex">
              {janelaDePaginas(page, pages).map((n) =>
                typeof n === "string" ? (
                  <span key={n} className="px-1" aria-hidden="true">…</span>
                ) : (
                  <Button
                    key={n}
                    variant={n === page ? "default" : "outline"}
                    size="icon-sm"
                    disabled={loading}
                    onClick={() => setPage(n)}
                    aria-current={n === page ? "page" : undefined}
                    className={cn(
                      "min-w-7 px-2 text-xs font-semibold tabular-nums",
                      n === page ? "bg-cx-blue text-white hover:bg-cx-blue-dark" : "border-cx-border text-cx-muted"
                    )}
                  >
                    {n}
                  </Button>
                ))}
            </span>
            <Button
              variant="outline"
              size="icon-sm"
              disabled={page >= pages || loading}
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              aria-label="Próxima página"
              className="border-cx-border text-cx-muted"
            >
              <ChevronRight />
            </Button>
          </nav>
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
      <Dialog open={!!notesFor} onOpenChange={(open) => { if (!open) setNotesFor(null); }}>
        <DialogContent className="max-h-[85vh] w-full gap-0 overflow-hidden p-0 sm:max-w-xl">
          <DialogHeader className="flex-row items-center gap-2.5 border-b border-cx-border px-5 py-3.5 pr-12">
            <StickyNote className="size-4 shrink-0 text-cx-muted" />
            <DialogTitle className="truncate text-sm font-semibold text-cx-text">
              Notas — {notesFor?.nome || "Cliente"}
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-y-auto p-5">
            {notesFor ? (
              <ClienteNotas
                clienteId={notesFor.id}
                embedded
                onCountChange={(n) =>
                  setClientes((cs) => cs.map((c) => (c.id === notesFor.id ? { ...c, notasCount: n } : c)))
                }
              />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Bloco de filtros secundários (status, responsável, período). Renderizado duas
// vezes — dentro do painel dobrável no celular e direto na toolbar em lg+ —
// para os dois casos não divergirem com o tempo.
function FiltrosSecundarios({
  status, setStatus, corretor, setCorretor, inicio, setInicio, fim, setFim,
  responsaveis, setPage, filtrosAtivos, onLimpar, className,
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2 border-t border-cx-border", className)}>
      <Select value={status} onValueChange={(v) => { setStatus(v ?? ""); setPage(1); }}>
        <SelectTrigger
          aria-label="Filtrar por status"
          className={cn(CONTROLE, "w-full border-cx-border text-sm sm:w-[210px]")}
        >
          <SelectValue placeholder="Todos os status" />
        </SelectTrigger>
        <SelectContent className="max-h-72 min-w-56!">
          <SelectItem value="">Todos os status</SelectItem>
          <SelectItem value="atencao">Fila de atenção</SelectItem>
          {STATUS_LIST.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
        </SelectContent>
      </Select>

      {responsaveis.length > 0 ? (
        <Select value={corretor} onValueChange={(v) => { setCorretor(v ?? ""); setPage(1); }}>
          <SelectTrigger
            aria-label="Filtrar por responsável"
            className={cn(CONTROLE, "w-full border-cx-border text-sm sm:w-[190px]")}
          >
            <SelectValue placeholder="Toda a equipe" />
          </SelectTrigger>
          <SelectContent className="max-h-72 min-w-56!">
            <SelectItem value="">Toda a equipe</SelectItem>
            {responsaveis.map((item) => (
              <SelectItem key={item.id} value={item.id}>{item.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}

      <div className="flex flex-1 flex-wrap items-center gap-2">
        <label className={cn(CONTROLE, "inline-flex flex-1 items-center gap-1.5 rounded-lg border border-cx-border px-3 text-xs text-cx-muted sm:w-[190px] sm:flex-none")}>
          <span className="shrink-0 whitespace-nowrap">De</span>
          <input
            type="date"
            value={inicio}
            onChange={(e) => { setInicio(e.target.value); setPage(1); }}
            className="w-full bg-transparent py-0! pr-0! pl-1! text-xs text-cx-text outline-none"
            aria-label="Data inicial"
          />
        </label>
        <label className={cn(CONTROLE, "inline-flex flex-1 items-center gap-1.5 rounded-lg border border-cx-border px-3 text-xs text-cx-muted sm:w-[190px] sm:flex-none")}>
          <span className="shrink-0 whitespace-nowrap">Até</span>
          <input
            type="date"
            value={fim}
            onChange={(e) => { setFim(e.target.value); setPage(1); }}
            className="w-full bg-transparent py-0! pr-0! pl-1! text-xs text-cx-text outline-none"
            aria-label="Data final"
          />
        </label>
      </div>

      {filtrosAtivos > 0 ? (
        <Button
          variant="ghost"
          onClick={onLimpar}
          className={cn(CONTROLE, "gap-1.5 text-xs text-cx-muted")}
        >
          <X /> Limpar
        </Button>
      ) : null}
    </div>
  );
}
