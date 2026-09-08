"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import {
  Search, Plus, Pencil, ChevronLeft, ChevronRight, Loader2, Download,
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
import { Checkbox } from "@/components/ui/checkbox";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { STATUS_LIST, statusInfo } from "@/lib/cliente-status";
import { corDoAvatar, iniciaisDe, origemVisual, tempoRelativo, dataCurta } from "@/lib/cliente-visual";
import { userPhotoUrl } from "@/lib/user-avatar";
import { ClienteNotas } from "@/components/ClienteNotas";
import { ClienteDrawer } from "@/components/ClienteDrawer";

const LIMIT = 12;
// No Kanban a paginação não faz sentido — uma lane com "12 de 15" mente sobre o
// tamanho da coluna, então buscamos a carteira inteira. O backend capa o limit
// em 100 (repository.go), logo carteiras maiores ficam truncadas nessa visão.
const KANBAN_LIMIT = 100;

// Altura única de todo controle da barra superior. Um só valor evita a régua
// irregular que aparece quando input, select e botão vêm cada um com a altura
// padrão do seu componente; 44px também é alvo de toque confortável no celular.
const CONTROLE = "h-11";

// Abas do topo. Os grupos e seus nomes são definidos pelo backend em
// `models.GrupoStatus` — aqui só damos rótulo e ordem. `valor: ""` é a aba
// "Todos", que não manda recorte nenhum.
const ABAS = [
  { valor: "", label: "Todos", chaveContagem: "total" },
  { valor: "atendimento", label: "Em atendimento", chaveContagem: "atendimento" },
  { valor: "aprovados", label: "Aprovados", chaveContagem: "aprovados" },
  { valor: "perdidos", label: "Perdidos", chaveContagem: "perdidos" },
];

// Colunas da tabela, com largura declarada. A tabela é `table-fixed`: sem isso
// o navegador dá ~290px ao Status (a pílula é `w-fit` e não quebra) e a linha
// estoura a área útil, empurrando Responsável e Ações para fora da tela.
//
// Interesse e Responsável são as duas colunas que aparecem por último, e o
// gatilho é a largura do CONTAINER, não da viewport: a barra lateral come 240px
// fixos, então uma janela de 1440px dá 1128px de tabela e uma de 1280 dá 976 —
// um breakpoint de viewport erraria os dois casos. Daí o `@container` no cartão
// e as variantes `@[...]` aqui.
//
// Responsável vai por último por ser a informação menos consultada da linha:
// continua no cartão do celular e no painel de edição.
const COLUNAS = [
  { titulo: "Nome", largura: "w-auto" },
  { titulo: "Contato", largura: "w-[175px]" },
  { titulo: "Origem", largura: "w-[120px]" },
  { titulo: "Status", largura: "w-[230px]" },
  { titulo: "Interesse", largura: "w-[130px]", classe: "hidden @[1000px]:table-cell" },
  { titulo: "Último contato", largura: "w-[100px]" },
  { titulo: "Responsável", largura: "w-[128px]", classe: "hidden @[1180px]:table-cell" },
  { titulo: "Ações", largura: "w-[116px]" },
];

// Formata a renda (VARCHAR pt-BR "7000,00" ou numérico) com separador de milhar.
const formatRenda = (c) => {
  const raw = c.valor_renda_formatado || c.valor_renda || "";
  if (!raw) return "";
  const normalized = raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw;
  const n = parseFloat(normalized);
  if (Number.isNaN(n)) return raw;
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
const maskCPF = (v) =>
  (v || "").replace(/\D/g, "").slice(0, 11)
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
// O telefone é gravado como texto livre; só reformatamos quando os dígitos
// batem com um número brasileiro, para não estragar o que já veio formatado.
const maskTelefone = (v) => {
  const d = (v || "").replace(/\D/g, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return v || "";
};

// Ícone da lane do Kanban. Derivado do `tone` que o STATUS_MAP já declara — não
// é um ícone inventado por status, é a leitura semântica que o sistema já fazia
// (positive/negative/attention/neutral) ganhando forma visual.
const ICONE_POR_TOM = {
  positive: CheckCircle2,
  negative: XCircle,
  attention: Clock3,
  neutral: CircleDot,
};

// Janela de páginas para a paginação numerada: sempre a 1ª e a última, mais uma
// faixa de 5 páginas consecutivas ao redor da atual (encostada no começo ou no
// fim quando a atual está perto de uma das pontas), e reticências no que for
// pulado. Devolve números e strings "…N", que a UI renderiza como separador
// inerte — a string precisa ser única por posição para servir de key.
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

// Exporta os clientes recebidos como CSV. Separador `;` e BOM UTF-8 porque o
// destino real é o Excel em português, que lê vírgula como separador decimal e
// quebra os acentos sem o BOM.
function baixarCSV(clientes, nomeArquivo) {
  const colunas = [
    ["Nome", (c) => c.nome || ""],
    ["CPF", (c) => (c.cpf ? maskCPF(c.cpf) : "")],
    ["E-mail", (c) => c.email || ""],
    ["Telefone", (c) => maskTelefone(c.telefone)],
    ["Origem", (c) => c.origem || ""],
    ["Interesse", (c) => c.interesse || ""],
    ["Status", (c) => statusInfo(c.status).label],
    ["Renda", (c) => formatRenda(c)],
    ["Responsável", (c) => c.user?.first_name || ""],
    ["Última alteração", (c) => dataCurta(c.updated_at) || ""],
  ];
  const escapa = (v) => `"${String(v).replace(/"/g, '""')}"`;
  const linhas = [
    colunas.map(([titulo]) => escapa(titulo)).join(";"),
    ...clientes.map((c) => colunas.map(([, ler]) => escapa(ler(c))).join(";")),
  ];
  const blob = new Blob(["﻿" + linhas.join("\r\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nomeArquivo;
  a.click();
  URL.revokeObjectURL(url);
}

// Ações rápidas de um cliente: falar no WhatsApp, ligar e um menu com o resto.
// Usada na linha da tabela, no cartão do celular e no cartão do Kanban, para as
// três visões terem o mesmo repertório. Todo clique aqui é isolado com
// stopPropagation — o contêiner ao redor abre o painel de edição, e essas ações
// não devem disparar isso.
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
          className="bg-wb-good/10 text-wb-good hover:bg-wb-good/20"
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
        {/* globals.css aplica `body * { min-width: 0 }`, que anula o min-w do
            popup: sem o `!` o menu abre com ~20px e o texto sai na vertical. */}
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

// Avatar do cliente: iniciais sobre um fundo tingido, sorteado pelo nome. A cor
// aqui é só para o olho separar as linhas numa lista longa — quem carrega
// significado é a pílula de status, que tem coluna própria.
function AvatarCliente({ nome, className }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
        corDoAvatar(nome), className
      )}
    >
      {iniciaisDe(nome)}
    </span>
  );
}

// Responsável: foto quando o usuário tem uma gravada, iniciais quando não tem.
// A imagem é servida pelo Go através do proxy do Next (ver lib/user-avatar).
function Responsavel({ user }) {
  const nome = [user?.first_name, user?.last_name].filter(Boolean).join(" ").trim();
  const foto = userPhotoUrl(user?.photo);
  if (!user || !nome) return <span className="text-cx-muted">—</span>;
  return (
    <span className="flex items-center gap-2">
      {/* O arquivo vem do proxy do backend, fora do otimizador do next/image. */}
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

// Status como BARRA + TEXTO: um traço vertical na cor cheia do estágio e o nome
// escrito na cor de texto padrão da tabela.
//
// Vinte e uma linhas de fundo tingido faziam a coluna competir com o resto da
// tela; aqui a cor volta a ser acento. Como o nome não é mais escrito na cor do
// status, todos os estágios passam a ler a 13,6:1 (text-cx-text sobre branco),
// contra os 4,52:1 no limite do par soft/ink.
//
// `solid` é STATUS_COLOR — cor cheia, calibrada para o traço se distinguir do
// fundo do cartão. Não use `ink` aqui: ele foi escurecido para texto sobre o
// fundo tingido que este desenho não tem mais.
const BARRA_STATUS = "h-4 w-[3px] shrink-0 rounded-full";

function StatusBadge({ status, className }) {
  const info = statusInfo(status);
  return (
    <span
      className={cn("flex w-fit items-center gap-2 text-[13px]! font-medium text-cx-text", className)}
      title={info.label}
    >
      <span className={BARRA_STATUS} style={{ backgroundColor: info.solid }} aria-hidden="true" />
      <span className="truncate">{info.label}</span>
    </span>
  );
}

// O mesmo desenho, clicável: vira um Select para admin/correspondente (PATCH
// inline). Em repouso é indistinguível do badge de leitura; a seta e um leve
// realce de fundo só aparecem no hover e no foco, então a coluna em repouso não
// tem vinte e uma setas.
//
// A seta é injetada pelo próprio SelectTrigger (não é filha nossa), daí ela ser
// alcançada por `[&>svg:last-child]`. O espaço dela fica reservado desde o
// início — é opacidade, não display —, senão o texto salta ao passar o mouse.
// `aria-expanded` mantém a seta visível enquanto a lista está aberta.
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
          "h-auto w-fit max-w-full gap-2 rounded-md border-transparent bg-transparent py-1 pr-1.5 pl-2 text-[13px]! font-medium text-cx-text *:data-[slot=select-value]:gap-2",
          "transition-colors hover:bg-cx-bg aria-expanded:bg-cx-bg disabled:cursor-wait",
          "[&>svg:last-child]:size-3.5 [&>svg:last-child]:opacity-0 [&>svg:last-child]:transition-opacity",
          "hover:[&>svg:last-child]:opacity-60 focus-visible:[&>svg:last-child]:opacity-60 aria-expanded:[&>svg:last-child]:opacity-60",
          className
        )}
        title={info.label}
        aria-label={`Status: ${info.label}. Alterar`}
      >
        <SelectValue>
          {() => (
            <>
              <span className={BARRA_STATUS} style={{ backgroundColor: info.solid }} aria-hidden="true" />
              <span className="truncate">{info.label}</span>
            </>
          )}
        </SelectValue>
        {saving ? <Loader2 className="size-3.5 shrink-0 animate-spin text-cx-muted" /> : null}
      </SelectTrigger>
      <SelectContent className="max-h-72 w-auto! min-w-64!">
        {STATUS_LIST.map((s) => (
          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// Canal de captação: ícone + o texto que foi gravado. Traço quando ninguém
// preencheu — um vazio honesto é melhor que um canal inventado.
function CelulaOrigem({ origem }) {
  const visual = origemVisual(origem);
  if (!visual) return <span className="text-cx-muted">—</span>;
  const { Icon, cor, label } = visual;
  return (
    <span className="flex items-center justify-center gap-2">
      <Icon className={cn("size-4 shrink-0", cor)} />
      <span className="truncate">{label}</span>
    </span>
  );
}

// Último contato. O sistema não registra interações, então a referência é o
// `updated_at` do cliente: a última vez que alguém mexeu no cadastro. O título
// do elemento diz isso, para o número não ser lido como "última conversa".
function CelulaUltimoContato({ cliente }) {
  const relativo = tempoRelativo(cliente.updated_at);
  if (!relativo) return <span className="text-cx-muted">—</span>;
  return (
    <span className="block" title="Última alteração no cadastro">
      <span className="block text-cx-text">{relativo}</span>
      <span className="block text-xs text-cx-muted tabular-nums">{dataCurta(cliente.updated_at)}</span>
    </span>
  );
}

// Placeholder de carregamento com a mesma altura da linha real, para a tabela
// não pular de tamanho quando os dados chegam.
function LinhasEsqueleto({ colunas }) {
  return Array.from({ length: 6 }).map((_, i) => (
    <TableRow key={i}>
      {Array.from({ length: colunas }).map((__, j) => (
        <TableCell key={j} className="px-3! py-3!">
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
  const [contagens, setContagens] = useState(null);
  const [q, setQ] = useState(initialSearch);
  const [status, setStatus] = useState(initialStatus);
  const [grupo, setGrupo] = useState("");
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
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const [selecionados, setSelecionados] = useState(() => new Set());

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

  const paramsDe = useCallback(({ q, status, grupo, corretor, inicio, fim, page, limit }) => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (q) params.set("search", q);
    if (status) params.set("status", status);
    if (grupo) params.set("grupo", grupo);
    if (corretor) params.set("corretor", corretor);
    if (inicio) params.set("inicio", inicio);
    if (fim) params.set("fim", fim);
    return params;
  }, []);

  const fetchList = useCallback(async (filtros) => {
    setLoading(true);
    try {
      const params = paramsDe({ limit: LIMIT, ...filtros });
      const res = await fetch(`/api/backend/clientes?${params.toString()}`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      setClientes(Array.isArray(data) ? data : data.clientes ?? []);
      setPagination(data.pagination ?? { total: 0, page: 1, limit: filtros.limit ?? LIMIT, pages: 1 });
    } finally {
      setLoading(false);
    }
  }, [paramsDe]);

  // As contagens das abas vêm de um endpoint próprio (GROUP BY status no Go).
  // Ele ignora o recorte de status/grupo, mas respeita busca, responsável e
  // período — as abas contam dentro do mesmo universo que a tabela mostra.
  const fetchContagens = useCallback(async (filtros) => {
    const params = paramsDe({ ...filtros, grupo: "", status: "", page: 1, limit: 1 });
    try {
      const res = await fetch(`/api/backend/clientes/contagens?${params.toString()}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setContagens({ total: data.total ?? 0, ...(data.por_grupo ?? {}) });
    } catch {
      // Abas sem número continuam navegáveis; não vale derrubar a lista por isso.
    }
  }, [paramsDe]);

  const didMount = useRef(false);
  useEffect(() => {
    const limit = view === "kanban" ? KANBAN_LIMIT : LIMIT;
    const filtros = { q, status, grupo, corretor, inicio, fim, page: view === "kanban" ? 1 : page, limit };
    // A primeira renderização já tem os dados do servidor; só as contagens
    // faltam. Alternar para o Kanban refaz a busca mesmo assim, porque o
    // initialData veio paginado em LIMIT.
    if (!didMount.current && view === "lista") {
      didMount.current = true;
      fetchContagens(filtros);
      return;
    }
    didMount.current = true;
    const t = setTimeout(() => {
      fetchList(filtros);
      fetchContagens(filtros);
    }, 300);
    return () => clearTimeout(t);
  }, [q, status, grupo, corretor, inicio, fim, page, view, fetchList, fetchContagens]);

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
      // A troca move o cliente de grupo; sem recontar, a aba fica mentindo.
      fetchContagens({ q, status, grupo, corretor, inicio, fim, page, limit: LIMIT });
    } catch {
      setClientes(prev); // reverte
    } finally {
      setSavingId(null);
    }
  };

  // Uma lane por status do enum, na ordem do STATUS_LIST (que já reflete a ordem
  // do atendimento). Todo cliente cai em alguma lane — se o status vier fora do
  // enum, entra na lane "Sem status".
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

  const temFiltro = !!(q || status || grupo || corretor || inicio || fim);
  const filtrosAtivos = [status, corretor, inicio, fim].filter(Boolean).length;
  const limparFiltros = () => {
    setStatus(""); setCorretor(""); setInicio(""); setFim(""); setPage(1);
  };
  const recarregar = () =>
    fetchList({ q, status, grupo, corretor, inicio, fim, page, limit: view === "kanban" ? KANBAN_LIMIT : LIMIT });

  const trocarAba = (valor) => {
    setGrupo(valor);
    setStatus(""); // aba e filtro de status recortam a mesma coisa
    setPage(1);
    setSelecionados(new Set());
  };

  // Seleção: vive só na página visível. Guardar ids de páginas que já saíram da
  // tela criaria uma seleção invisível, que o usuário não tem como conferir
  // antes de exportar.
  const idsVisiveis = clientes.map((c) => c.id);
  const selecionadosVisiveis = idsVisiveis.filter((id) => selecionados.has(id));
  const todosSelecionados = idsVisiveis.length > 0 && selecionadosVisiveis.length === idsVisiveis.length;
  const alternarTodos = () => setSelecionados(todosSelecionados ? new Set() : new Set(idsVisiveis));
  const alternarUm = (id) => {
    setSelecionados((atual) => {
      const proximo = new Set(atual);
      if (proximo.has(id)) proximo.delete(id); else proximo.add(id);
      return proximo;
    });
  };

  const exportar = () => {
    const alvo = selecionadosVisiveis.length
      ? clientes.filter((c) => selecionados.has(c.id))
      : clientes;
    if (!alvo.length) return;
    baixarCSV(alvo, `clientes-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const vazio = clientes.length === 0 && !loading;
  const contagemDaAba = (aba) => contagens?.[aba.chaveContagem];

  return (
    <div className="space-y-4">
      {/* Cabeçalho */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-cx-text sm:text-2xl">Clientes</h1>
          <p className="text-sm text-cx-muted">Gerencie seus clientes e acompanhe todo o relacionamento.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={exportar}
            disabled={clientes.length === 0}
            className={cn(CONTROLE, "flex-1 gap-2 border-cx-border text-cx-text sm:flex-none")}
            title={selecionadosVisiveis.length ? `Exportar ${selecionadosVisiveis.length} selecionado(s)` : "Exportar a página atual"}
          >
            <Download /> Exportar
            {selecionadosVisiveis.length ? (
              <span className="tabular-nums">({selecionadosVisiveis.length})</span>
            ) : null}
          </Button>
          {/* `bg-cx-orange` é reescrito para o azul institucional por
              crm-design.css; a classe fica porque é a do botão primário em todas
              as outras telas — trocar só aqui faria esta página destoar. */}
          <Button
            nativeButton={false}
            render={<Link href="/clientes/adicionar" />}
            className={cn(CONTROLE, "flex-1 gap-2 bg-cx-orange px-4 text-sm font-semibold text-white hover:bg-cx-orange-dark sm:flex-none")}
          >
            <Plus /> Novo cliente
          </Button>
        </div>
      </div>

      {/* Abas por grupo + visão + filtros. As abas rolam na horizontal no
          celular, em vez de quebrar em duas fileiras. */}
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {ABAS.map((aba) => {
            const ativa = grupo === aba.valor;
            const n = contagemDaAba(aba);
            return (
              <button
                key={aba.valor || "todos"}
                type="button"
                onClick={() => trocarAba(aba.valor)}
                aria-pressed={ativa}
                className={cn(
                  "inline-flex shrink-0 items-center gap-2 rounded-lg px-3.5 text-sm font-medium transition-colors",
                  CONTROLE,
                  ativa
                    ? "bg-cx-blue text-white"
                    : "bg-cx-surface text-cx-muted ring-1 ring-cx-border hover:text-cx-text"
                )}
              >
                {aba.label}
                {typeof n === "number" ? (
                  <span
                    className={cn(
                      "rounded-md px-1.5 py-0.5 text-xs font-semibold tabular-nums",
                      ativa ? "bg-white/20" : "bg-cx-bg text-cx-muted"
                    )}
                  >
                    {n}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
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
            onClick={() => setFiltrosAbertos((v) => !v)}
            aria-expanded={filtrosAbertos}
            className={cn(CONTROLE, "shrink-0 gap-2 border-cx-border text-cx-text")}
          >
            <SlidersHorizontal /> Filtros
            {filtrosAtivos > 0 ? (
              <span className="inline-flex size-5 items-center justify-center rounded-full bg-cx-blue text-[10px] font-bold text-white tabular-nums">
                {filtrosAtivos}
              </span>
            ) : null}
          </Button>
          <Button
            variant="outline"
            onClick={recarregar}
            aria-label="Recarregar lista"
            title="Recarregar"
            className={cn(CONTROLE, "aspect-square shrink-0 border-cx-border p-0 text-cx-muted")}
          >
            <RefreshCw className={loading ? "animate-spin" : undefined} />
          </Button>
        </div>
      </div>

      {/* Busca sempre visível; o resto dos filtros abre no botão Filtros. */}
      <Card className="gap-0 ring-cx-border bg-cx-surface p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-cx-muted" />
          {/* crm-design.css impõe `padding: 11px 14px` em todo input dentro de
              .crm-content, com especificidade maior que a utilitária: sem o `!`
              o ícone fica em cima do texto. */}
          <Input
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1); }}
            placeholder="Buscar por nome, e-mail ou CPF…"
            aria-label="Buscar clientes"
            className={cn(CONTROLE, "border-cx-border pl-10! text-sm")}
          />
        </div>
        <Collapsible open={filtrosAbertos} onOpenChange={setFiltrosAbertos}>
          <CollapsibleContent>
            <FiltrosSecundarios
              status={status} setStatus={setStatus}
              corretor={corretor} setCorretor={setCorretor}
              inicio={inicio} setInicio={setInicio}
              fim={fim} setFim={setFim}
              responsaveis={responsaveis}
              setPage={setPage}
              filtrosAtivos={filtrosAtivos}
              onLimpar={limparFiltros}
            />
          </CollapsibleContent>
        </Collapsible>
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
            <Button variant="outline" onClick={() => { setQ(""); setGrupo(""); limparFiltros(); }} className="border-cx-border">
              <X /> Limpar filtros
            </Button>
          ) : (
            <Button
              nativeButton={false}
              render={<Link href="/clientes/adicionar" />}
              className="gap-2 bg-cx-orange text-white hover:bg-cx-orange-dark"
            >
              <Plus /> Novo cliente
            </Button>
          )}
        </Card>
      )}

      {/* LISTA — tabela a partir de lg; abaixo disso, cartões, porque uma tabela
          de nove colunas em 390px só existe como rolagem lateral. */}
      {view === "lista" && !vazio && (
        <>
          <Card className="@container hidden overflow-hidden ring-cx-border bg-cx-surface p-0 lg:block">
            <Table className="min-w-[820px] table-fixed">
              <TableHeader>
                <TableRow className="border-cx-border/[0.15] hover:bg-transparent">
                  <TableHead className="w-10 px-3! py-3! text-center">
                    <Checkbox
                      className="mx-auto"
                      checked={todosSelecionados}
                      indeterminate={selecionadosVisiveis.length > 0 && !todosSelecionados}
                      onCheckedChange={alternarTodos}
                      aria-label="Selecionar todos os clientes da página"
                    />
                  </TableHead>
                  {COLUNAS.map(({ titulo, largura, classe }) => (
                    <TableHead
                      key={titulo}
                      className={cn(
                        "px-3! py-3! text-center text-[10px] font-semibold tracking-[0.1em] text-cx-muted uppercase",
                        largura, classe
                      )}
                    >
                      {titulo}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && clientes.length === 0 ? (
                  <LinhasEsqueleto colunas={9} />
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
                      data-state={selecionados.has(c.id) ? "selected" : undefined}
                      className={cn(
                        "cursor-pointer border-cx-border/[0.12] hover:bg-cx-bg focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-cx-blue",
                        loading && "opacity-50 transition-opacity"
                      )}
                    >
                      <TableCell className="px-3! py-3! text-center" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          className="mx-auto"
                          checked={selecionados.has(c.id)}
                          onCheckedChange={() => alternarUm(c.id)}
                          aria-label={`Selecionar ${c.nome || "cliente"}`}
                        />
                      </TableCell>
                      <TableCell className="px-3! py-3! text-center">
                        <div className="flex items-center justify-center gap-3">
                          <AvatarCliente nome={c.nome} />
                          <span className="block min-w-0 text-left">
                            <span className="block truncate font-medium text-cx-text" title={c.nome || undefined}>{c.nome || "—"}</span>
                            <span className="block truncate text-xs text-cx-muted" title={c.email || undefined}>{c.email || "sem e-mail"}</span>
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="px-3! py-3! text-center text-cx-muted">
                        {c.telefone ? (
                          <a
                            href={`https://wa.me/55${(c.telefone || "").replace(/\D/g, "")}`}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center justify-center gap-1.5 hover:text-cx-text"
                          >
                            <MessageCircle className="size-3.5 shrink-0 text-wb-good" />
                            <span className="truncate tabular-nums">{maskTelefone(c.telefone)}</span>
                          </a>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="px-3! py-3! text-center text-cx-text">
                        <CelulaOrigem origem={c.origem} />
                      </TableCell>
                      <TableCell className="px-3! py-3! text-center" onClick={(e) => e.stopPropagation()}>
                        {canChangeStatus
                          ? <StatusControl cliente={c} onChange={changeStatus} saving={savingId === c.id} className="mx-auto" />
                          : <StatusBadge status={c.status} className="mx-auto" />}
                      </TableCell>
                      <TableCell className="hidden px-3! py-3! text-center text-cx-text @[1000px]:table-cell">
                        <span className="block truncate" title={c.interesse || undefined}>{c.interesse || <span className="text-cx-muted">—</span>}</span>
                      </TableCell>
                      <TableCell className="px-3! py-3! text-center text-cx-muted">
                        <CelulaUltimoContato cliente={c} />
                      </TableCell>
                      <TableCell className="hidden px-3! py-3! text-center text-cx-text @[1180px]:table-cell">
                        <Responsavel user={c.user} />
                      </TableCell>
                      <TableCell className="px-3! py-3!">
                        <div className="flex items-center justify-center">
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
              ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-[136px] rounded-xl" />)
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
                    <span onClick={(e) => e.stopPropagation()} className="pt-1">
                      <Checkbox
                        checked={selecionados.has(c.id)}
                        onCheckedChange={() => alternarUm(c.id)}
                        aria-label={`Selecionar ${c.nome || "cliente"}`}
                      />
                    </span>
                    <AvatarCliente nome={c.nome} className="size-10" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-cx-text">{c.nome || "—"}</p>
                      <p className="truncate text-xs text-cx-muted tabular-nums">
                        {c.telefone ? maskTelefone(c.telefone) : c.email || "sem contato"}
                      </p>
                    </div>
                    <AcoesRapidas cliente={c} onNotas={setNotesFor} />
                  </div>

                  <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                    <div className="flex min-w-0 gap-1.5">
                      <dt className="shrink-0 text-cx-muted">Origem</dt>
                      <dd className="min-w-0 truncate font-medium text-cx-text">{c.origem || "—"}</dd>
                    </div>
                    <div className="flex min-w-0 gap-1.5">
                      <dt className="shrink-0 text-cx-muted">Interesse</dt>
                      <dd className="min-w-0 truncate font-medium text-cx-text">{c.interesse || "—"}</dd>
                    </div>
                    <div className="flex min-w-0 gap-1.5">
                      <dt className="shrink-0 text-cx-muted">Resp.</dt>
                      <dd className="min-w-0 truncate font-medium text-cx-text">{c.user?.first_name || "—"}</dd>
                    </div>
                    <div className="flex min-w-0 gap-1.5">
                      <dt className="shrink-0 text-cx-muted">Contato</dt>
                      <dd className="min-w-0 truncate font-medium text-cx-text">{tempoRelativo(c.updated_at) || "—"}</dd>
                    </div>
                  </dl>

                  <div onClick={(e) => e.stopPropagation()}>
                    {canChangeStatus
                      ? <StatusControl cliente={c} onChange={changeStatus} saving={savingId === c.id} />
                      : <StatusBadge status={c.status} />}
                  </div>
                </Card>
              ))}
          </div>
        </>
      )}

      {/* KANBAN — rolagem horizontal de colunas fixas. No celular o globals.css
          converte a faixa em lista vertical (regra `.min-w-max`). */}
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
                            <AvatarCliente nome={c.nome} className="size-7 text-[10px]" />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-semibold text-cx-text">{c.nome || "—"}</p>
                              <p className="truncate text-[11px] text-cx-muted tabular-nums">
                                {c.cpf ? maskCPF(c.cpf) : "sem CPF"}
                              </p>
                            </div>
                          </div>

                          <dl className="space-y-0.5 text-[11px]">
                            <div className="flex justify-between gap-2">
                              <dt className="shrink-0 text-cx-muted">Interesse</dt>
                              <dd className="min-w-0 truncate font-medium text-cx-text">{c.interesse || "—"}</dd>
                            </div>
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
                      <Plus /> Novo cliente
                    </Button>
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      )}

      {/* Rodapé: contagem à esquerda, paginação à direita. Só na lista — o
          Kanban carrega a carteira inteira. */}
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

// Filtros secundários (status, responsável, período), abertos pelo botão
// Filtros. Ficam num componente próprio para o corpo da lista não crescer com
// oito controles que só aparecem sob demanda.
function FiltrosSecundarios({
  status, setStatus, corretor, setCorretor, inicio, setInicio, fim, setFim,
  responsaveis, setPage, filtrosAtivos, onLimpar,
}) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-cx-border pt-3">
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
