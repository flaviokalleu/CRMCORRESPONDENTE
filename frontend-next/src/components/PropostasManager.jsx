"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  FileText, FileSignature, FileClock, Home as HomeIcon, Receipt, Plus, Search,
  Filter, ChevronLeft, ChevronRight, ChevronDown, MoreVertical, Check, Handshake,
  Send, X, Trash2, Loader2, Inbox, AlertTriangle, Lightbulb,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { TONE_SOFT, TONE_INK, TONE_SOLID } from "@/lib/cliente-status";
import { corDoAvatar, iniciaisDe } from "@/lib/cliente-visual";
import { userPhotoUrl } from "@/lib/user-avatar";

const LIMIT = 8; // paginação de 8 por página, como no mockup

const FORMA_MAP = { financiamento: "Financiamento", a_vista: "À vista", fgts: "FGTS", misto: "Misto" };

// Estágios REAIS do enum de propostas (models.Proposta / IsPropostaStatusValido,
// backend Go). O mockup mostrava rótulos que não existem no banco ("Enviada",
// "Em análise", "Contrato gerado", "Assinatura") — mapeamos os 6 valores reais
// para o espírito do mockup, sem inventar etapa nova: um filtro por uma etapa
// inexistente nunca devolveria resultado nenhum.
const PROPOSTA_STATUS = {
  pendente: { label: "Em elaboração", tone: "neutral" },
  em_negociacao: { label: "Em negociação", tone: "attention" },
  aceita: { label: "Aprovada", tone: "positive" },
  recusada: { label: "Reprovada", tone: "negative" },
  expirada: { label: "Expirada", tone: "neutral" },
  cancelada: { label: "Cancelada", tone: "negative" },
};

// Mesmo método de `lib/cliente-status.js`: a cor deriva do TOM semântico do
// status (positive/negative/attention/neutral), não de uma paleta nova. Os
// três tokens usados aqui (TONE_SOFT/INK/SOLID) já foram calibrados lá em AA
// — reaproveitamos em vez de inventar cor para Propostas.
function propostaStatusInfo(status) {
  const meta = PROPOSTA_STATUS[status] || { label: status || "—", tone: "neutral" };
  return {
    ...meta,
    soft: TONE_SOFT[meta.tone],
    ink: TONE_INK[meta.tone],
    solid: TONE_SOLID[meta.tone],
  };
}

// Os 4 cartões do topo. O mockup pedia Em elaboração/Enviadas/Aprovadas/
// Reprovadas, mas "Enviada" não é um status do enum — no lugar, contamos
// "Em negociação", que é o estágio real de avanço do pipeline depois da
// elaboração (o mais próximo do que "Enviada" queria comunicar).
const METRICAS = [
  { status: "pendente", label: "Em elaboração", Icon: FileText },
  { status: "em_negociacao", label: "Em negociação", Icon: Send },
  { status: "aceita", label: "Aprovadas", Icon: Check },
  { status: "recusada", label: "Reprovadas", Icon: X },
];

// "Modelos populares" da coluna lateral — 4 dos tipos reais de
// `lib/contract-templates.js` (não nomes inventados); o link já abre o editor
// de contrato existente em /propostas/contratos/[tipo].
const MODELOS_POPULARES = [
  { tipo: "compra_venda", label: "Contrato de compra e venda", desc: "Modelo padrão", Icon: FileSignature },
  { tipo: "promessa_compra_venda", label: "Promessa de compra e venda", desc: "Condições da negociação", Icon: FileClock },
  { tipo: "locacao_residencial", label: "Contrato de locação", desc: "Residencial", Icon: HomeIcon },
  { tipo: "recibo_sinal", label: "Recibo de sinal", desc: "Reserva de imóvel", Icon: Receipt },
];

const formatCurrency = (v) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

// O telefone é texto livre; só reformatamos quando os dígitos batem com um
// número brasileiro, para não estragar o que já veio formatado (mesma regra
// de ClientesLista.jsx).
const maskTelefone = (v) => {
  const d = (v || "").replace(/\D/g, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return v || "";
};

const normalize = (v) => String(v || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const nomeCorretor = (p) => {
  const nome = [p.corretor?.first_name, p.corretor?.last_name].filter(Boolean).join(" ").trim();
  return nome || "Não atribuído";
};

// Janela de paginação — mesma lógica de ClientesLista.jsx (1ª e última página
// sempre visíveis, mais uma faixa de 5 ao redor da atual, com reticências no
// que for pulado).
function janelaDePaginas(atual, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  let inicio = Math.max(2, atual - 2);
  let fim = inicio + 4;
  if (fim >= total) {
    fim = total - 1;
    inicio = Math.max(2, fim - 4);
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

// Avatar do cliente: iniciais sobre fundo tingido, sorteado pelo nome — mesma
// solução de ClientesLista.jsx (lib/cliente-visual.js), para a tela ter a
// mesma família visual.
function AvatarCliente({ nome }) {
  return (
    <span
      aria-hidden="true"
      className={cn("flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold", corDoAvatar(nome))}
    >
      {iniciaisDe(nome)}
    </span>
  );
}

// Responsável: foto quando o corretor tem uma gravada, iniciais quando não
// tem — mesma solução de ClientesLista.jsx (componente Responsavel).
function AvatarResponsavel({ user }) {
  const nome = [user?.first_name, user?.last_name].filter(Boolean).join(" ").trim();
  const foto = userPhotoUrl(user?.photo);
  if (!user || !nome) return <span className="text-cx-muted">Não atribuído</span>;
  return (
    <span className="flex items-center gap-2">
      {foto ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={foto} alt="" className="size-6 shrink-0 rounded-full object-cover" />
      ) : (
        <span className={cn("flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold", corDoAvatar(nome))}>
          {iniciaisDe(nome)}
        </span>
      )}
      <span className="truncate">{user.first_name || nome}</span>
    </span>
  );
}

// Pílula de etapa: fundo tingido + ponto na cor cheia + rótulo. As três cores
// (soft/ink/solid) vêm de `propostaStatusInfo`, nunca de um valor solto.
function StatusPill({ status }) {
  const info = propostaStatusInfo(status);
  return (
    <span
      className="inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
      style={{ backgroundColor: info.soft, color: info.ink }}
    >
      <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: info.solid }} aria-hidden="true" />
      {info.label}
    </span>
  );
}

// Client Component: lista de propostas (dados vêm por SSR) + criação e ações
// de negociação, tudo via proxy `/api/backend/propostas`.
export function PropostasManager({ initialPropostas, clientes, imoveis, loadError = false }) {
  const [propostas, setPropostas] = useState(initialPropostas || []);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null); // id da proposta com uma ação em voo — trava novo clique nela

  const [search, setSearch] = useState("");
  const [stage, setStage] = useState("");
  const [corretorId, setCorretorId] = useState("");
  const [payment, setPayment] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(() => new Set());
  const [tipVisible, setTipVisible] = useState(true);

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    cliente_id: "", imovel_id: "", valor_ofertado: "", forma_pagamento: "financiamento", data_validade: "", observacoes: "",
  });

  // Corretores para o filtro "Responsável" — só quem de fato aparece na
  // carteira carregada, não a equipe inteira.
  const corretores = useMemo(() => {
    const mapa = new Map();
    for (const p of propostas) {
      if (!p.corretor?.id) continue;
      mapa.set(String(p.corretor.id), nomeCorretor(p));
    }
    return Array.from(mapa, ([id, nome]) => ({ id, nome })).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }, [propostas]);

  // Busca, etapa, responsável e forma de pagamento são todos client-side: o
  // endpoint Go (GET /propostas) só filtra por status, sem busca textual — daí
  // a página SSR carregar um lote maior (?limit=500) e filtrar aqui.
  const filtered = useMemo(() => propostas.filter((p) => {
    if (stage && p.status !== stage) return false;
    if (corretorId && String(p.corretor?.id) !== corretorId) return false;
    if (payment && p.forma_pagamento !== payment) return false;
    if (!search) return true;
    const alvo = normalize([p.cliente?.nome, p.imovel?.nome_imovel, p.imovel?.endereco, p.id].join(" "));
    return alvo.includes(normalize(search));
  }), [propostas, stage, corretorId, payment, search]);

  const total = filtered.length;
  const pages = Math.max(1, Math.ceil(total / LIMIT));
  const currentPage = Math.min(page, pages);
  const from = total === 0 ? 0 : (currentPage - 1) * LIMIT + 1;
  const to = Math.min(currentPage * LIMIT, total);
  const visiveis = filtered.slice((currentPage - 1) * LIMIT, currentPage * LIMIT);

  const contagem = (status) => propostas.filter((p) => p.status === status).length;
  const filtrosAtivos = payment ? 1 : 0;

  const idsVisiveis = visiveis.map((p) => p.id);
  const selecionadosVisiveis = idsVisiveis.filter((id) => selected.has(id));
  const todosSelecionados = idsVisiveis.length > 0 && selecionadosVisiveis.length === idsVisiveis.length;
  const alternarTodos = () => {
    setSelected((atual) => {
      const novo = new Set(atual);
      idsVisiveis.forEach((id) => (todosSelecionados ? novo.delete(id) : novo.add(id)));
      return novo;
    });
  };
  const alternarUm = (id) => {
    setSelected((atual) => {
      const novo = new Set(atual);
      if (novo.has(id)) novo.delete(id); else novo.add(id);
      return novo;
    });
  };

  // Atualização de status (aprovar/negociar/reprovar): otimista, com
  // `busyId` travando um segundo clique na MESMA proposta enquanto a
  // requisição está em voo (o defeito original disparava duas requisições em
  // rede lenta, com risco de dupla ação).
  const updateStatus = async (id, status, extra, acao) => {
    if (busyId === id) return;
    setBusyId(id);
    setError("");
    const anterior = propostas;
    setPropostas((prev) => prev.map((p) => (p.id === id ? { ...p, status, ...extra } : p)));
    try {
      const res = await fetch(`/api/backend/propostas/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, ...extra }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setPropostas(anterior); // reverte a atualização otimista
      setError(`Erro ao ${acao} a proposta. Tente novamente.`);
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (id) => {
    if (busyId === id) return;
    if (!window.confirm("Excluir esta proposta? Essa ação não pode ser desfeita.")) return;
    setBusyId(id);
    setError("");
    try {
      const res = await fetch(`/api/backend/propostas/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setPropostas((prev) => prev.filter((p) => p.id !== id));
      setSelected((prev) => {
        const novo = new Set(prev);
        novo.delete(id);
        return novo;
      });
    } catch {
      setError("Erro ao excluir a proposta. Tente novamente.");
    } finally {
      setBusyId(null);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (saving) return;
    if (!form.cliente_id || !form.imovel_id || !form.valor_ofertado) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/backend/propostas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          cliente_id: Number(form.cliente_id),
          imovel_id: Number(form.imovel_id),
          valor_ofertado: Number(form.valor_ofertado),
          data_validade: form.data_validade ? `${form.data_validade}T00:00:00Z` : null,
        }),
      });
      if (!res.ok) throw new Error();
      const nova = await res.json();
      setPropostas((prev) => [nova.data || nova, ...prev]);
      setOpen(false);
      setPage(1);
      setForm({ cliente_id: "", imovel_id: "", valor_ofertado: "", forma_pagamento: "financiamento", data_validade: "", observacoes: "" });
    } catch {
      setError("Erro ao criar a proposta. Confira os dados e tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Cabeçalho */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-cx-text sm:text-2xl">Propostas e Contratos</h1>
          <p className="text-sm text-cx-muted">Crie, acompanhe e gerencie suas propostas e contratos.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href="/propostas/contratos" />}
            className="gap-2 border-cx-border text-cx-text"
          >
            <FileText /> Modelos de contrato
          </Button>
          <Button onClick={() => setOpen(true)} className="gap-2 bg-cx-orange text-white hover:bg-cx-orange-dark">
            <Plus /> Nova proposta
          </Button>
        </div>
      </div>

      {/* Erro de ação (criar/negociar/excluir) — anunciado a leitor de tela e
          visualmente distinto do estado de lista vazia. */}
      {error && (
        <p role="alert" className="flex items-center gap-2 rounded-lg border border-wb-bad/30 bg-wb-bad/10 px-3 py-2 text-sm font-medium text-wb-bad">
          <AlertTriangle className="size-4 shrink-0" /> {error}
        </p>
      )}

      {/* 4 contadores do topo — clicáveis, filtram a tabela pela etapa. */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {METRICAS.map(({ status, label, Icon }) => {
          const info = propostaStatusInfo(status);
          const ativo = stage === status;
          return (
            <button
              key={status}
              type="button"
              onClick={() => { setStage(ativo ? "" : status); setPage(1); }}
              aria-pressed={ativo}
              className={cn(
                "flex items-center gap-3 rounded-xl border p-3 text-left transition-colors",
                ativo ? "border-cx-blue bg-cx-blue-soft" : "border-cx-border bg-cx-surface hover:bg-cx-bg"
              )}
            >
              <span
                className="flex size-10 shrink-0 items-center justify-center rounded-lg"
                style={{ backgroundColor: info.soft, color: info.ink }}
              >
                <Icon className="size-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-xl font-bold tabular-nums text-cx-text">{contagem(status)}</span>
                <span className="block truncate text-xs text-cx-muted">{label}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0 space-y-4">
          {/* Nav Propostas | Contratos | Modelos — só "Propostas" é esta
              página; os outros dois já existem no sistema. */}
          <nav aria-label="Propostas e contratos" className="flex w-fit gap-1 rounded-lg border border-cx-border bg-cx-surface p-1">
            <span aria-current="page" className="rounded-md bg-cx-blue px-3 py-1.5 text-sm font-medium text-white">Propostas</span>
            <Link href="/contratos/lista" className="rounded-md px-3 py-1.5 text-sm font-medium text-cx-muted hover:bg-cx-bg hover:text-cx-text">Contratos</Link>
            <Link href="/propostas/contratos" className="rounded-md px-3 py-1.5 text-sm font-medium text-cx-muted hover:bg-cx-bg hover:text-cx-text">Modelos</Link>
          </nav>

          <Card className="gap-0 ring-cx-border bg-cx-surface p-3">
            {/* Busca + etapa + responsável + mais filtros */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-cx-muted" />
                <Input
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  placeholder="Buscar por cliente, imóvel ou código..."
                  aria-label="Buscar propostas"
                  className="h-11 border-cx-border pl-10! text-sm"
                />
              </div>
              <Select value={stage} onValueChange={(v) => { setStage(v ?? ""); setPage(1); }}>
                <SelectTrigger aria-label="Filtrar etapa" className="h-11 w-full border-cx-border text-sm sm:w-[190px]">
                  <SelectValue placeholder="Todas as etapas" />
                </SelectTrigger>
                <SelectContent className="min-w-56!">
                  <SelectItem value="">Todas as etapas</SelectItem>
                  {Object.entries(PROPOSTA_STATUS).map(([value, meta]) => (
                    <SelectItem key={value} value={value}>{meta.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={corretorId} onValueChange={(v) => { setCorretorId(v ?? ""); setPage(1); }}>
                <SelectTrigger aria-label="Filtrar responsável" className="h-11 w-full border-cx-border text-sm sm:w-[190px]">
                  <SelectValue placeholder="Todos os corretores" />
                </SelectTrigger>
                <SelectContent className="min-w-56!">
                  <SelectItem value="">Todos os corretores</SelectItem>
                  {corretores.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                onClick={() => setFiltersOpen((v) => !v)}
                aria-expanded={filtersOpen}
                className="h-11 shrink-0 gap-2 border-cx-border text-cx-text"
              >
                <Filter className="size-4" /> Mais filtros
                {filtrosAtivos > 0 ? (
                  <span className="inline-flex size-5 items-center justify-center rounded-full bg-cx-blue text-[10px] font-bold text-white tabular-nums">
                    {filtrosAtivos}
                  </span>
                ) : (
                  <ChevronDown className="size-3.5" />
                )}
              </Button>
            </div>

            <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
              <CollapsibleContent>
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-cx-border pt-3">
                  <Select value={payment} onValueChange={(v) => { setPayment(v ?? ""); setPage(1); }}>
                    <SelectTrigger aria-label="Filtrar forma de pagamento" className="h-11 w-full border-cx-border text-sm sm:w-[200px]">
                      <SelectValue placeholder="Forma de pagamento" />
                    </SelectTrigger>
                    <SelectContent className="min-w-56!">
                      <SelectItem value="">Todas as formas</SelectItem>
                      {Object.entries(FORMA_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {filtrosAtivos > 0 && (
                    <Button variant="ghost" onClick={() => { setPayment(""); setPage(1); }} className="h-11 gap-1.5 text-xs text-cx-muted">
                      <X className="size-4" /> Limpar
                    </Button>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Tabela */}
            <div className="mt-3 -mx-3 overflow-x-auto border-t border-cx-border">
              <Table className="min-w-[900px] table-fixed">
                <TableHeader>
                  <TableRow className="border-cx-border/[0.15] hover:bg-transparent">
                    <TableHead className="w-10 px-3! py-3! text-center">
                      <Checkbox
                        className="mx-auto"
                        checked={todosSelecionados}
                        indeterminate={selecionadosVisiveis.length > 0 && !todosSelecionados}
                        onCheckedChange={alternarTodos}
                        aria-label="Selecionar propostas desta página"
                      />
                    </TableHead>
                    {["Cliente", "Imóvel", "Valor", "Etapa", "Data", "Responsável", "Ações"].map((titulo) => (
                      <TableHead key={titulo} className="px-3! py-3! text-center text-[10px] font-semibold tracking-[0.1em] text-cx-muted uppercase">
                        {titulo}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadError ? (
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={8} className="px-3! py-12!">
                        <div className="flex flex-col items-center gap-2 text-center">
                          <AlertTriangle className="size-6 text-wb-bad" />
                          <p role="alert" className="text-sm font-medium text-cx-text">Não foi possível carregar as propostas</p>
                          <p className="text-xs text-cx-muted">Verifique sua conexão e recarregue a página.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : visiveis.length === 0 ? (
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={8} className="px-3! py-12!">
                        <div className="flex flex-col items-center gap-2 text-center">
                          <Inbox className="size-6 text-cx-muted" />
                          <p className="text-sm font-medium text-cx-text">Nenhuma proposta encontrada</p>
                          <p className="text-xs text-cx-muted">
                            {propostas.length ? "Ajuste a busca ou os filtros para encontrar uma proposta." : "Crie a primeira proposta para começar."}
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    visiveis.map((p) => {
                      const data = p.created_at ? new Date(p.created_at) : null;
                      const emAberto = p.status === "pendente" || p.status === "em_negociacao";
                      const processando = busyId === p.id;
                      return (
                        <TableRow key={p.id} className="border-cx-border/[0.12]" data-state={selected.has(p.id) ? "selected" : undefined}>
                          <TableCell className="px-3! py-3! text-center">
                            <Checkbox
                              checked={selected.has(p.id)}
                              onCheckedChange={() => alternarUm(p.id)}
                              aria-label={`Selecionar proposta de ${p.cliente?.nome || "cliente"}`}
                            />
                          </TableCell>
                          <TableCell className="px-3! py-3!">
                            <div className="flex items-center gap-3">
                              <AvatarCliente nome={p.cliente?.nome} />
                              <div className="min-w-0">
                                <p className="truncate font-medium text-cx-blue">{p.cliente?.nome || "Cliente não informado"}</p>
                                <p className="truncate text-xs text-cx-muted tabular-nums">
                                  {p.cliente?.telefone ? maskTelefone(p.cliente.telefone) : `Proposta #${p.id}`}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="px-3! py-3! text-center">
                            <p className="truncate font-medium text-cx-text">{p.imovel?.nome_imovel || p.imovel?.endereco || "Imóvel não informado"}</p>
                            <p className="truncate text-xs text-cx-muted">
                              {[p.imovel?.tipo, p.imovel?.quartos ? `${p.imovel.quartos} quartos` : null].filter(Boolean).join(" · ") || "—"}
                            </p>
                          </TableCell>
                          <TableCell className="px-3! py-3! text-center font-semibold text-cx-text tabular-nums">
                            {formatCurrency(p.valor_ofertado)}
                          </TableCell>
                          <TableCell className="px-3! py-3! text-center">
                            <StatusPill status={p.status} />
                          </TableCell>
                          <TableCell className="px-3! py-3! text-center text-cx-muted">
                            {data && !Number.isNaN(data.getTime()) ? (
                              <>
                                <span className="block text-cx-text">{data.toLocaleDateString("pt-BR")}</span>
                                <span className="block text-xs tabular-nums">{data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
                              </>
                            ) : "—"}
                          </TableCell>
                          <TableCell className="px-3! py-3! text-center">
                            <AvatarResponsavel user={p.corretor} />
                          </TableCell>
                          <TableCell className="px-3! py-3! text-center">
                            <DropdownMenu>
                              <DropdownMenuTrigger
                                render={<Button variant="ghost" size="icon-sm" disabled={processando} className="text-cx-muted" />}
                                aria-label={`Ações da proposta de ${p.cliente?.nome || "cliente"}`}
                                aria-busy={processando}
                              >
                                {processando ? <Loader2 className="animate-spin" /> : <MoreVertical />}
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="min-w-48!">
                                {p.status === "pendente" && (
                                  <DropdownMenuItem onClick={() => updateStatus(p.id, "em_negociacao", {}, "negociar")}>
                                    <Handshake /> Marcar em negociação
                                  </DropdownMenuItem>
                                )}
                                {emAberto && (
                                  <>
                                    <DropdownMenuItem onClick={() => updateStatus(p.id, "aceita", { valor_aceito: p.valor_ofertado }, "aprovar")}>
                                      <Check /> Aprovar proposta
                                    </DropdownMenuItem>
                                    <DropdownMenuItem variant="destructive" onClick={() => updateStatus(p.id, "recusada", {}, "reprovar")}>
                                      <X /> Reprovar proposta
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                  </>
                                )}
                                <DropdownMenuItem render={<Link href={`/propostas/contratos?proposta=${p.id}`} />}>
                                  <FileText /> Gerar contrato
                                </DropdownMenuItem>
                                <DropdownMenuItem variant="destructive" onClick={() => handleDelete(p.id)}>
                                  <Trash2 /> Excluir proposta
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Rodapé: contagem à esquerda, paginação à direita. */}
            {!loadError && total > 0 && (
              <div className="mt-3 flex flex-col-reverse items-center justify-between gap-3 border-t border-cx-border pt-3 text-xs text-cx-muted sm:flex-row">
                <span className="tabular-nums">
                  Mostrando {from} a {to} de {total} {total === 1 ? "proposta" : "propostas"}
                  {selecionadosVisiveis.length > 0 && ` · ${selecionadosVisiveis.length} selecionada${selecionadosVisiveis.length > 1 ? "s" : ""}`}
                </span>
                <nav className="flex items-center gap-1" aria-label="Paginação">
                  <Button variant="outline" size="icon-sm" disabled={currentPage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} aria-label="Página anterior" className="border-cx-border text-cx-muted">
                    <ChevronLeft />
                  </Button>
                  {janelaDePaginas(currentPage, pages).map((n) => (
                    typeof n === "string" ? (
                      <span key={n} className="px-1" aria-hidden="true">…</span>
                    ) : (
                      <Button
                        key={n}
                        variant={n === currentPage ? "default" : "outline"}
                        size="icon-sm"
                        onClick={() => setPage(n)}
                        aria-current={n === currentPage ? "page" : undefined}
                        className={cn(
                          "min-w-7 px-2 text-xs font-semibold tabular-nums",
                          n === currentPage ? "bg-cx-blue text-white hover:bg-cx-blue-dark" : "border-cx-border text-cx-muted"
                        )}
                      >
                        {n}
                      </Button>
                    )
                  ))}
                  <Button variant="outline" size="icon-sm" disabled={currentPage >= pages} onClick={() => setPage((p) => Math.min(pages, p + 1))} aria-label="Próxima página" className="border-cx-border text-cx-muted">
                    <ChevronRight />
                  </Button>
                </nav>
              </div>
            )}
          </Card>
        </div>

        {/* Coluna lateral */}
        <aside className="space-y-4">
          <Card className="ring-cx-border bg-cx-surface p-4">
            <h2 className="text-sm font-semibold text-cx-text">Criar nova proposta</h2>
            <p className="mt-1 text-xs text-cx-muted">Preencha os dados, gere o documento e envie para o cliente.</p>
            <Button onClick={() => setOpen(true)} className="mt-3 w-full gap-2 bg-cx-orange text-white hover:bg-cx-orange-dark">
              <Plus /> Nova proposta
            </Button>
          </Card>

          <Card className="ring-cx-border bg-cx-surface p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-cx-text">Modelos populares</h2>
              <Link href="/propostas/contratos" className="text-xs font-medium text-cx-blue hover:underline">Ver todos</Link>
            </div>
            <div className="mt-3 space-y-1">
              {MODELOS_POPULARES.map(({ tipo, label, desc, Icon }) => (
                <Link key={tipo} href={`/propostas/contratos/${tipo}`} className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-cx-bg">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-cx-blue-soft text-cx-blue">
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-cx-text">{label}</span>
                    <span className="block truncate text-xs text-cx-muted">{desc}</span>
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-cx-muted" />
                </Link>
              ))}
            </div>
          </Card>

          {/* Dica dispensável — sem cartão de "assinatura digital": essa
              funcionalidade não existe no sistema. */}
          {tipVisible && (
            <Card className="relative ring-cx-border bg-cx-blue-soft p-4">
              <button
                type="button"
                onClick={() => setTipVisible(false)}
                aria-label="Fechar dica"
                className="absolute top-2 right-2 text-cx-muted hover:text-cx-text"
              >
                <X className="size-4" />
              </button>
              <Lightbulb className="size-5 text-cx-blue" />
              <h3 className="mt-2 text-sm font-semibold text-cx-text">Dica</h3>
              <p className="mt-1 text-xs text-cx-muted">Use os modelos prontos para ganhar tempo e evitar erros.</p>
            </Card>
          )}
        </aside>
      </div>

      {/* Diálogo de criação */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova proposta</DialogTitle>
            <DialogDescription>Preencha os dados abaixo. Campos com * são obrigatórios.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="proposta-cliente" className="mb-1.5">Cliente *</Label>
              <Select value={form.cliente_id} onValueChange={(v) => setForm((p) => ({ ...p, cliente_id: v ?? "" }))}>
                <SelectTrigger id="proposta-cliente" className="w-full border-cx-border">
                  <SelectValue placeholder="Selecione o cliente" />
                </SelectTrigger>
                <SelectContent className="min-w-64!">
                  {(clientes || []).map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="proposta-imovel" className="mb-1.5">Imóvel *</Label>
              <Select value={form.imovel_id} onValueChange={(v) => setForm((p) => ({ ...p, imovel_id: v ?? "" }))}>
                <SelectTrigger id="proposta-imovel" className="w-full border-cx-border">
                  <SelectValue placeholder="Selecione o imóvel" />
                </SelectTrigger>
                <SelectContent className="min-w-64!">
                  {(imoveis || []).map((i) => <SelectItem key={i.id} value={String(i.id)}>{i.nome_imovel || i.endereco}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="proposta-valor" className="mb-1.5">Valor ofertado (R$) *</Label>
              <Input
                id="proposta-valor"
                type="number"
                min="0"
                step="0.01"
                value={form.valor_ofertado}
                onChange={(e) => setForm((p) => ({ ...p, valor_ofertado: e.target.value }))}
                required
                className="border-cx-border"
              />
            </div>
            <div>
              <Label htmlFor="proposta-forma" className="mb-1.5">Forma de pagamento</Label>
              <Select value={form.forma_pagamento} onValueChange={(v) => setForm((p) => ({ ...p, forma_pagamento: v || "financiamento" }))}>
                <SelectTrigger id="proposta-forma" className="w-full border-cx-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(FORMA_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="proposta-validade" className="mb-1.5">Validade</Label>
              <Input
                id="proposta-validade"
                type="date"
                value={form.data_validade}
                onChange={(e) => setForm((p) => ({ ...p, data_validade: e.target.value }))}
                className="border-cx-border"
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="proposta-obs" className="mb-1.5">Observações</Label>
              <Input
                id="proposta-obs"
                value={form.observacoes}
                onChange={(e) => setForm((p) => ({ ...p, observacoes: e.target.value }))}
                className="border-cx-border"
              />
            </div>
            <DialogFooter className="sm:col-span-2">
              <Button type="submit" disabled={saving} className="gap-2 bg-cx-orange text-white hover:bg-cx-orange-dark">
                {saving ? <><Loader2 className="animate-spin" /> Salvando...</> : "Criar proposta"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
