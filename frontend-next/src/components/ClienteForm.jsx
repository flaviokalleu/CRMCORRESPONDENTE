"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  User, Mail, Phone, IdCard, Briefcase, Calendar, Wallet, Heart, ShieldCheck,
  Landmark, Users, FileText, Upload, MapPin, Save, Loader2, CheckCircle,
  AlertCircle, UserCheck, FolderOpen, Check, ChevronRight, X, Fingerprint,
  Coins, Contact,
} from "lucide-react";

// ── Formulário completo de cliente (criação + edição) ──────────────────────────
// Envia multipart/form-data (o backend Go lê via c.GetPostForm — JSON chega
// vazio!) com TODOS os campos de readClienteInput. A APRESENTAÇÃO é um "dossiê
// de financiamento" que se monta ao vivo; a lógica de submit é idêntica ao
// contrato do backend.
//
// GOTCHAS do backend replicados:
//   - valor_renda / conjuge_valor_renda são VARCHAR pt-BR ("2.000,00").
//   - booleans vão como "true"/"false"; datas como "YYYY-MM-DD".

const STATUS_OPTIONS = [
  { value: "aguardando_aprovacao", label: "Aguardando aprovação", tone: "amber" },
  { value: "proposta_apresentada", label: "Proposta apresentada", tone: "amber" },
  { value: "documentacao_pendente", label: "Documentação pendente", tone: "amber" },
  { value: "visita_efetuada", label: "Visita efetuada", tone: "amber" },
  { value: "condicionado", label: "Condicionado", tone: "amber" },
  { value: "cliente_aprovado", label: "Aprovado", tone: "green" },
  { value: "reprovado", label: "Reprovado", tone: "red" },
  { value: "reserva", label: "Reserva", tone: "amber" },
  { value: "conferencia_documento", label: "Conferência de documento", tone: "amber" },
  { value: "conformidade", label: "Conformidade", tone: "green" },
  { value: "concluido", label: "Venda concluída", tone: "green" },
  { value: "cancelado", label: "Cancelado", tone: "red" },
];

const RENDA_TIPOS = [
  { value: "formal", label: "Formal" },
  { value: "informal", label: "Informal" },
  { value: "mista", label: "Mista" },
];

// ── Helpers de máscara / formatação ────────────────────────────────────────────
const onlyDigits = (s) => (s || "").toString().replace(/\D/g, "");

const maskCPF = (v) =>
  onlyDigits(v).slice(0, 11)
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");

const maskPhone = (v) => {
  const d = onlyDigits(v).slice(0, 11);
  if (d.length <= 10) return d.replace(/^(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d)/, "$1-$2");
  return d.replace(/^(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
};

const centavosToReais = (digits) => (onlyDigits(digits) ? parseInt(onlyDigits(digits), 10) / 100 : 0);
const formatReais = (n) => n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatRendaFromDigits = (digits) => (onlyDigits(digits) ? formatReais(centavosToReais(digits)) : "");
const formatDateOnly = (s) => (s ? s.toString().slice(0, 10) : "");

// ── Estado inicial ──────────────────────────────────────────────────────────────
function buildInitialState(initial) {
  const c = initial || {};
  const lower = (v) => (v ? v.toString().toLowerCase() : "");
  return {
    nome: c.nome ?? "",
    email: c.email ?? "",
    telefone: c.telefone ?? "",
    cpf: c.cpf ? maskCPF(c.cpf) : "",
    estado_civil: lower(c.estado_civil) || "solteiro",
    naturalidade: c.naturalidade ?? "",
    data_nascimento: formatDateOnly(c.data_nascimento),
    data_criacao: new Date().toISOString().slice(0, 10),

    profissao: c.profissao ?? "",
    valorRendaDigits: onlyDigits(c.valor_renda),
    renda_tipo: lower(c.renda_tipo),
    data_admissao: formatDateOnly(c.data_admissao),
    possui_carteira_mais_tres_anos: !!c.possui_carteira_mais_tres_anos,
    numero_pis: c.numero_pis ?? "",
    possui_dependente: !!c.possui_dependente,

    cadastrar_conjuge: (lower(c.estado_civil) === "casado" && !!c.conjuge_nome) || false,
    conjuge_nome: c.conjuge_nome ?? "",
    conjuge_email: c.conjuge_email ?? "",
    conjuge_telefone: c.conjuge_telefone ?? "",
    conjuge_cpf: c.conjuge_cpf ? maskCPF(c.conjuge_cpf) : "",
    conjuge_profissao: c.conjuge_profissao ?? "",
    conjuge_data_nascimento: formatDateOnly(c.conjuge_data_nascimento),
    conjugeRendaDigits: onlyDigits(c.conjuge_valor_renda),
    conjuge_renda_tipo: lower(c.conjuge_renda_tipo),
    conjuge_data_admissao: formatDateOnly(c.conjuge_data_admissao),

    possui_fiador: !!c.possui_fiador,
    fiador_nome: c.fiador_nome ?? "",
    fiador_cpf: c.fiador_cpf ? maskCPF(c.fiador_cpf) : "",
    fiador_telefone: c.fiador_telefone ?? "",
    fiador_email: c.fiador_email ?? "",

    possui_formularios_caixa: !!c.possui_formularios_caixa,

    status: c.status ?? "aguardando_aprovacao",
    userId: c.user_id ? String(c.user_id) : "",
  };
}

const EMPTY_FILES = {
  documentosPessoais: [], extratoBancario: [], documentosDependente: [],
  documentosConjuge: [], fiadorDocumentos: [], formulariosCaixa: [], tela_aprovacao: [],
};

// ── UI atoms ─────────────────────────────────────────────────────────────────
const fieldCls =
  "w-full rounded-lg border border-cx-border bg-cx-surface px-3 py-2.5 text-sm text-cx-text placeholder-[#9aa6b4] outline-none transition-colors focus:border-cx-blue focus:bg-cx-surface focus:ring-2 focus:ring-cx-blue/20 [&>option]:bg-white [&>option]:text-cx-text";

function Label({ children, icon: Icon }) {
  return (
    <span className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-cx-muted">
      {Icon && <Icon className="h-3 w-3" />}
      {children}
    </span>
  );
}

function Text({ label, icon, className = "", ...props }) {
  return (
    <label className={`block ${className}`}>
      <Label icon={icon}>{label}</Label>
      <input {...props} className={fieldCls} />
    </label>
  );
}

function Select({ label, icon, children, className = "", ...props }) {
  return (
    <label className={`block ${className}`}>
      <Label icon={icon}>{label}</Label>
      <select {...props} className={fieldCls}>{children}</select>
    </label>
  );
}

function Money({ label, icon, value, onChange, placeholder }) {
  return (
    <label className="block">
      <Label icon={icon}>{label}</Label>
      <div className="flex items-stretch overflow-hidden rounded-lg border border-cx-border bg-cx-surface transition-colors focus-within:border-orange-200 focus-within:ring-2 focus-within:ring-orange-500/25">
        <span className="flex items-center border-r border-cx-border bg-cx-surface px-3 text-xs font-semibold text-cx-muted">R$</span>
        <input
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          inputMode="numeric"
          className="w-full bg-transparent px-3 py-2.5 text-sm tabular-nums text-cx-text placeholder-[#9aa6b4] outline-none"
        />
      </div>
    </label>
  );
}

function Switch({ checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? "bg-cx-orange" : "bg-cx-border"}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${checked ? "translate-x-5" : ""}`}
      />
    </button>
  );
}

function SwitchRow({ checked, onChange, title, desc }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-cx-border bg-cx-surface px-4 py-3">
      <div>
        <p className="text-sm font-medium text-cx-text">{title}</p>
        {desc && <p className="text-[11px] text-cx-muted">{desc}</p>}
      </div>
      <Switch checked={checked} onChange={onChange} />
    </div>
  );
}

function Dropzone({ label, icon: Icon, files, onChange, onClear }) {
  return (
    <div className="space-y-1.5">
      <Label icon={Icon}>{label}</Label>
      <label className="group flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-cx-border bg-cx-surface px-4 py-5 text-center transition-colors hover:border-orange-200 hover:bg-cx-surface">
        <Upload className="h-5 w-5 text-cx-muted transition-colors group-hover:text-orange-700" />
        <span className="text-[11px] text-cx-muted group-hover:text-cx-muted">Selecionar arquivos</span>
        <input type="file" multiple onChange={onChange} className="hidden" />
      </label>
      {files.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {files.map((f, i) => (
            <span key={i} className="inline-flex max-w-[150px] items-center gap-1 truncate rounded-md border border-cx-orange/30 bg-orange-50 px-2 py-1 text-[10px] text-cx-orange-text">
              <FileText className="h-3 w-3 shrink-0" />
              <span className="truncate">{f.name}</span>
            </span>
          ))}
          <button type="button" onClick={onClear} className="inline-flex items-center gap-1 rounded-md border border-cx-border px-2 py-1 text-[10px] text-cx-muted hover:text-cx-muted">
            <X className="h-3 w-3" /> limpar
          </button>
        </div>
      )}
    </div>
  );
}

function Section({ id, refCb, icon: Icon, title, subtitle, done, children }) {
  return (
    <section ref={refCb} id={id} className="scroll-mt-6 rounded-2xl border border-cx-border bg-cx-surface p-5 sm:p-6">
      <header className="mb-5 flex items-center gap-3 border-b border-cx-border/[0.15] pb-4">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-colors ${done ? "border-cx-orange/40 bg-orange-50 text-cx-orange-text" : "border-cx-border bg-cx-surface text-cx-muted"}`}>
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold tracking-tight text-cx-text">{title}</h3>
          {subtitle && <p className="truncate text-[11px] text-cx-muted">{subtitle}</p>}
        </div>
        {done && <Check className="ml-auto h-4 w-4 text-orange-700" />}
      </header>
      {children}
    </section>
  );
}

const TONE = {
  green: "border-emerald-200 bg-emerald-50 text-emerald-700",
  red: "border-red-200 bg-red-50 text-red-700",
  amber: "border-amber-200 bg-amber-50 text-amber-700",
};

// ── Componente principal ────────────────────────────────────────────────────────
export function ClienteForm({ mode = "create", clienteId, initial }) {
  const router = useRouter();
  const { user } = useAuth();
  const [form, setForm] = useState(() => buildInitialState(initial));
  const [files, setFiles] = useState(EMPTY_FILES);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [usuarios, setUsuarios] = useState([]);

  const canAssign = !!(user?.is_administrador || user?.is_correspondente);
  // Aprovação (status) e formulários Caixa são exclusivos de admin/correspondente.
  // Corretor cadastra e edita dados, mas nunca muda status nem mexe na Caixa.
  const canManageApproval = canAssign;
  const showSituacao = canManageApproval;
  const showCaixa = mode === "edit" && canManageApproval; // aba Caixa só na edição

  useEffect(() => {
    if (!canAssign) return;
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/backend/user", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        const list = Array.isArray(data) ? data : data?.users ?? data?.data ?? [];
        if (active) setUsuarios(list);
      } catch {
        /* silencioso */
      }
    })();
    return () => { active = false; };
  }, [canAssign]);

  const set = (name, value) => setForm((p) => ({ ...p, [name]: value }));
  const onText = (e) => set(e.target.name, e.target.value);
  const onUpper = (e) => set(e.target.name, e.target.value.toUpperCase());
  const handleFiles = (key) => (e) => setFiles((p) => ({ ...p, [key]: Array.from(e.target.files) }));
  const clearFiles = (key) => () => setFiles((p) => ({ ...p, [key]: [] }));

  const isCasado = form.estado_civil === "casado";
  const rendaFormal = form.renda_tipo === "formal" || form.renda_tipo === "mista";
  const conjugeRendaFormal = form.conjuge_renda_tipo === "formal" || form.conjuge_renda_tipo === "mista";

  // ── Estado derivado do dossiê ──
  const rendaCliente = centavosToReais(form.valorRendaDigits);
  const rendaConjuge = isCasado && form.cadastrar_conjuge ? centavosToReais(form.conjugeRendaDigits) : 0;
  const rendaTotal = rendaCliente + rendaConjuge;
  const anyFiles = Object.values(files).some((l) => l.length > 0);
  const statusMeta = STATUS_OPTIONS.find((s) => s.value === form.status) || STATUS_OPTIONS[0];

  const dossieChips = [
    { key: "conjuge", label: "Cônjuge", on: isCasado && form.cadastrar_conjuge && !!form.conjuge_nome },
    { key: "fiador", label: "Fiador", on: form.possui_fiador && !!form.fiador_nome },
    ...(showCaixa ? [{ key: "caixa", label: "Caixa", on: form.possui_formularios_caixa }] : []),
    { key: "docs", label: "Docs", on: anyFiles },
  ];

  // ── Seções (visibilidade + completude) ──
  const sections = useMemo(() => [
    { id: "identificacao", label: "Identificação", icon: Fingerprint, done: !!(form.nome && onlyDigits(form.cpf).length === 11) },
    { id: "renda", label: "Renda & trabalho", icon: Coins, done: !!(form.valorRendaDigits && form.renda_tipo) },
    { id: "conjuge", label: "Cônjuge", icon: Heart, visible: isCasado, done: form.cadastrar_conjuge && !!form.conjuge_nome },
    { id: "fiador", label: "Fiador", icon: ShieldCheck, done: form.possui_fiador && !!form.fiador_nome },
    { id: "caixa", label: "Caixa", icon: Landmark, visible: showCaixa, done: form.possui_formularios_caixa },
    { id: "responsavel", label: "Responsável", icon: UserCheck, visible: canAssign && usuarios.length > 0, done: !!form.userId },
    { id: "situacao", label: "Situação", icon: Contact, visible: showSituacao, done: form.status !== "aguardando_aprovacao" },
    { id: "documentos", label: "Documentos", icon: FolderOpen, done: anyFiles },
  ].filter((s) => s.visible !== false), [form, isCasado, canAssign, usuarios.length, anyFiles, showCaixa, showSituacao]);

  const doneCount = sections.filter((s) => s.done).length;
  const progress = Math.round((doneCount / sections.length) * 100);

  // ── Scroll-spy + navegação ──
  const refs = useRef({});
  const [active, setActive] = useState("identificacao");
  useEffect(() => {
    const els = Object.values(refs.current).filter(Boolean);
    if (!els.length) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (vis[0]) setActive(vis[0].target.id);
      },
      { rootMargin: "-15% 0px -70% 0px", threshold: 0 }
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [sections.length]);

  const goTo = (id) => refs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
  // Callback de ref estável: deriva a chave do próprio id do <section>, evitando
  // criar closures por render (react-hooks/refs).
  const registerRef = useCallback((el) => {
    if (el?.id) refs.current[el.id] = el;
  }, []);

  const initials = useMemo(() => {
    const parts = form.nome.trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "";
    return (parts[0][0] + (parts[1]?.[0] || "")).toUpperCase();
  }, [form.nome]);

  // ── Submit (contrato do backend — inalterado) ──
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!form.nome.trim() || !form.email.trim() || !form.telefone.trim() || onlyDigits(form.cpf).length !== 11) {
      setError("Preencha nome, e-mail, telefone e um CPF com 11 dígitos.");
      goTo("identificacao");
      return;
    }

    const fd = new FormData();
    const put = (k, v) => { if (v !== undefined && v !== null && v.toString().trim() !== "") fd.append(k, v); };

    put("nome", form.nome.toUpperCase());
    put("email", form.email.toUpperCase());
    put("telefone", form.telefone);
    put("cpf", onlyDigits(form.cpf));
    put("estado_civil", form.estado_civil);
    put("naturalidade", form.naturalidade.toUpperCase());
    put("data_nascimento", formatDateOnly(form.data_nascimento));
    if (mode === "create") put("data_criacao", formatDateOnly(form.data_criacao));

    put("profissao", form.profissao.toUpperCase());
    put("valor_renda", formatRendaFromDigits(form.valorRendaDigits));
    put("renda_tipo", form.renda_tipo);
    if (rendaFormal) put("data_admissao", formatDateOnly(form.data_admissao));
    fd.append("possui_carteira_mais_tres_anos", form.possui_carteira_mais_tres_anos ? "true" : "false");
    if (form.possui_carteira_mais_tres_anos) put("numero_pis", form.numero_pis);
    fd.append("possui_dependente", form.possui_dependente ? "true" : "false");

    if (isCasado && form.cadastrar_conjuge) {
      put("conjuge_nome", form.conjuge_nome.toUpperCase());
      put("conjuge_email", form.conjuge_email.toUpperCase());
      put("conjuge_telefone", form.conjuge_telefone);
      put("conjuge_cpf", onlyDigits(form.conjuge_cpf));
      put("conjuge_profissao", form.conjuge_profissao.toUpperCase());
      put("conjuge_data_nascimento", formatDateOnly(form.conjuge_data_nascimento));
      put("conjuge_valor_renda", formatRendaFromDigits(form.conjugeRendaDigits));
      put("conjuge_renda_tipo", form.conjuge_renda_tipo);
      if (conjugeRendaFormal) put("conjuge_data_admissao", formatDateOnly(form.conjuge_data_admissao));
    }

    fd.append("possui_fiador", form.possui_fiador ? "true" : "false");
    if (form.possui_fiador) {
      put("fiador_nome", form.fiador_nome.toUpperCase());
      put("fiador_cpf", onlyDigits(form.fiador_cpf));
      put("fiador_telefone", form.fiador_telefone);
      put("fiador_email", form.fiador_email.toUpperCase());
    }

    if (showCaixa) fd.append("possui_formularios_caixa", form.possui_formularios_caixa ? "true" : "false");
    if (showSituacao) put("status", form.status);
    if (canAssign && form.userId) put("userId", form.userId);

    Object.entries(files).forEach(([field, list]) => list.forEach((file) => fd.append(field, file)));

    setLoading(true);
    try {
      const url = mode === "edit" ? `/api/backend/clientes/${clienteId}` : "/api/backend/clientes";
      const res = await fetch(url, { method: mode === "edit" ? "PUT" : "POST", body: fd });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const details = Array.isArray(data?.details) ? data.details.map((d) => d.message).join(" | ") : null;
        throw new Error(details || data.message || data.error || `Erro (${res.status})`);
      }
      setSuccess(mode === "edit" ? "Cliente atualizado." : "Cliente cadastrado.");
      if (mode === "create") { setForm(buildInitialState(null)); setFiles(EMPTY_FILES); }
      router.refresh();
      refs.current.identificacao?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (err) {
      setError(err.message || "Erro ao salvar cliente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
      {/* ══ Coluna esquerda: DOSSIÊ AO VIVO ══ */}
      <aside className="lg:sticky lg:top-2 lg:self-start">
        <div className="space-y-4">
          {/* ficha */}
          <div className="overflow-hidden rounded-2xl border border-cx-border bg-cx-surface">
            <div className="flex items-center gap-3 p-4">
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-base font-bold ${initials ? "bg-gradient-to-br from-orange-500 to-orange-600 text-white" : "border border-dashed border-cx-border text-cx-muted"}`}>
                {initials || <User className="h-5 w-5" />}
              </div>
              <div className="min-w-0">
                <p className={`truncate text-sm font-semibold ${form.nome ? "text-cx-text" : "text-cx-muted"}`}>
                  {form.nome || "Novo cliente"}
                </p>
                <p className="truncate text-[11px] tabular-nums text-cx-muted">
                  {form.cpf || "CPF não informado"}
                </p>
              </div>
            </div>

            <div className="px-4 pb-2">
              <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${TONE[statusMeta.tone]}`}>
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                {statusMeta.label}
              </span>
            </div>

            {/* renda combinada */}
            <div className="border-t border-cx-border/[0.15] p-4">
              <div className="flex items-baseline justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-cx-muted">Renda combinada</span>
                {rendaConjuge > 0 && <span className="text-[10px] text-cx-muted">2 rendas</span>}
              </div>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-cx-text">
                <span className="text-sm text-cx-muted">R$ </span>{formatReais(rendaTotal)}
              </p>
              <div className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-cx-surface">
                {rendaTotal > 0 ? (
                  <>
                    <div className="h-full bg-orange-500" style={{ width: `${(rendaCliente / rendaTotal) * 100}%` }} />
                    <div className="h-full bg-orange-500/40" style={{ width: `${(rendaConjuge / rendaTotal) * 100}%` }} />
                  </>
                ) : (
                  <div className="h-full w-full bg-cx-surface" />
                )}
              </div>
              {rendaConjuge > 0 && (
                <div className="mt-2 flex justify-between text-[10px] tabular-nums text-cx-muted">
                  <span><span className="mr-1 inline-block h-2 w-2 rounded-sm bg-orange-500 align-middle" />Titular R$ {formatReais(rendaCliente)}</span>
                  <span><span className="mr-1 inline-block h-2 w-2 rounded-sm bg-orange-500/40 align-middle" />Cônjuge R$ {formatReais(rendaConjuge)}</span>
                </div>
              )}
            </div>

            {/* chips */}
            <div className="flex flex-wrap gap-1.5 border-t border-cx-border/[0.15] p-4">
              {dossieChips.map((chip) => (
                <span key={chip.key} className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium transition-colors ${chip.on ? "bg-orange-50 text-cx-orange-text" : "bg-cx-bg text-cx-muted"}`}>
                  {chip.on ? <Check className="h-2.5 w-2.5" /> : <span className="h-2.5 w-2.5 rounded-full border border-current" />}
                  {chip.label}
                </span>
              ))}
            </div>
          </div>

          {/* índice / scroll-spy */}
          <nav className="hidden rounded-2xl border border-cx-border bg-cx-surface p-2 lg:block">
            <div className="flex items-center justify-between px-2 py-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-cx-muted">Seções</span>
              <span className="text-[10px] font-semibold tabular-nums text-orange-700">{progress}%</span>
            </div>
            <ul className="relative">
              <span className="absolute left-[15px] top-3 bottom-3 w-px bg-cx-surface" aria-hidden />
              {sections.map((s) => {
                const isActive = active === s.id;
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => goTo(s.id)}
                      className={`relative flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-[13px] transition-colors ${isActive ? "bg-cx-surface text-cx-text" : "text-cx-muted hover:text-cx-muted"}`}
                    >
                      <span className={`z-10 flex h-3 w-3 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${s.done ? "border-cx-orange bg-cx-orange" : isActive ? "border-cx-orange bg-cx-surface" : "border-cx-border bg-cx-surface"}`}>
                        {s.done && <Check className="h-2 w-2 text-cx-text" strokeWidth={4} />}
                      </span>
                      {s.label}
                      {isActive && <ChevronRight className="ml-auto h-3.5 w-3.5 text-orange-700" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </aside>

      {/* ══ Coluna direita: FORMULÁRIO ══ */}
      <div className="space-y-5">
        {(error || success) && (
          <div className={`flex items-center gap-2.5 rounded-xl border px-4 py-3 text-sm ${success ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}>
            {success ? <CheckCircle className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
            {success || error}
          </div>
        )}

        {/* Identificação */}
        <Section id="identificacao" refCb={registerRef} icon={Fingerprint} title="Identificação" subtitle="Quem é o cliente" done={!!(form.nome && onlyDigits(form.cpf).length === 11)}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Text label="Nome completo *" icon={User} name="nome" value={form.nome} onChange={onUpper} required placeholder="MARIA DA SILVA" className="sm:col-span-2" />
            <Text label="E-mail *" icon={Mail} type="email" name="email" value={form.email} onChange={onUpper} required placeholder="MARIA@EMAIL.COM" />
            <Text label="Telefone *" icon={Phone} name="telefone" value={form.telefone} onChange={(e) => set("telefone", maskPhone(e.target.value))} required placeholder="(00) 00000-0000" />
            <Text label="CPF *" icon={IdCard} name="cpf" value={form.cpf} onChange={(e) => set("cpf", maskCPF(e.target.value))} required placeholder="000.000.000-00" />
            <Select label="Estado civil" icon={Heart} name="estado_civil" value={form.estado_civil} onChange={onText}>
              <option value="solteiro">Solteiro(a)</option>
              <option value="casado">Casado(a)</option>
              <option value="divorciado">Divorciado(a)</option>
              <option value="viuvo">Viúvo(a)</option>
              <option value="uniao_estavel">União estável</option>
            </Select>
            <Text label="Naturalidade / cidade" icon={MapPin} name="naturalidade" value={form.naturalidade} onChange={onUpper} placeholder="SÃO PAULO - SP" />
            <Text label="Data de nascimento" icon={Calendar} type="date" name="data_nascimento" value={form.data_nascimento} onChange={onText} />
            {mode === "create" && (
              <Text label="Data do cadastro" icon={Calendar} type="date" name="data_criacao" value={form.data_criacao} onChange={onText} />
            )}
          </div>
        </Section>

        {/* Renda & trabalho */}
        <Section id="renda" refCb={registerRef} icon={Coins} title="Renda & trabalho" subtitle="Composição de renda do titular" done={!!(form.valorRendaDigits && form.renda_tipo)}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Text label="Profissão" icon={Briefcase} name="profissao" value={form.profissao} onChange={onUpper} placeholder="GERENTE DE VENDAS" />
            <Money label="Renda mensal *" icon={Wallet} value={formatRendaFromDigits(form.valorRendaDigits)} onChange={(e) => set("valorRendaDigits", onlyDigits(e.target.value))} placeholder="2.000,00" />
            <Select label="Tipo de renda" icon={Coins} name="renda_tipo" value={form.renda_tipo} onChange={onText}>
              <option value="">Selecione</option>
              {RENDA_TIPOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </Select>
            {rendaFormal && (
              <Text label="Data de admissão" icon={Calendar} type="date" name="data_admissao" value={form.data_admissao} onChange={onText} />
            )}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <SwitchRow title="Carteira há +3 anos" desc="Tempo de registro em carteira" checked={form.possui_carteira_mais_tres_anos} onChange={(v) => set("possui_carteira_mais_tres_anos", v)} />
            <SwitchRow title="Possui dependentes" desc="Filhos ou outros dependentes" checked={form.possui_dependente} onChange={(v) => set("possui_dependente", v)} />
          </div>
          {form.possui_carteira_mais_tres_anos && (
            <div className="mt-3 grid gap-3 duration-200 animate-in fade-in slide-in-from-top-1 sm:grid-cols-3">
              <Text label="Número do PIS" icon={ShieldCheck} name="numero_pis" value={form.numero_pis} onChange={onText} placeholder="123.45678.90-1" />
            </div>
          )}
        </Section>

        {/* Cônjuge */}
        {isCasado && (
          <Section id="conjuge" refCb={registerRef} icon={Heart} title="Cônjuge" subtitle="Compor renda com o parceiro(a)" done={form.cadastrar_conjuge && !!form.conjuge_nome}>
            <SwitchRow title="Cadastrar cônjuge" desc="Inclui o cônjuge na composição de renda" checked={form.cadastrar_conjuge} onChange={(v) => set("cadastrar_conjuge", v)} />
            {form.cadastrar_conjuge && (
              <div className="mt-4 grid grid-cols-1 gap-3 duration-200 animate-in fade-in slide-in-from-top-1 sm:grid-cols-2 lg:grid-cols-3">
                <Text label="Nome do cônjuge" icon={User} name="conjuge_nome" value={form.conjuge_nome} onChange={onUpper} placeholder="JOÃO DA SILVA" />
                <Text label="E-mail do cônjuge" icon={Mail} type="email" name="conjuge_email" value={form.conjuge_email} onChange={onUpper} />
                <Text label="Telefone do cônjuge" icon={Phone} value={form.conjuge_telefone} onChange={(e) => set("conjuge_telefone", maskPhone(e.target.value))} placeholder="(00) 00000-0000" />
                <Text label="CPF do cônjuge" icon={IdCard} value={form.conjuge_cpf} onChange={(e) => set("conjuge_cpf", maskCPF(e.target.value))} placeholder="000.000.000-00" />
                <Text label="Profissão do cônjuge" icon={Briefcase} name="conjuge_profissao" value={form.conjuge_profissao} onChange={onUpper} />
                <Text label="Nascimento do cônjuge" icon={Calendar} type="date" name="conjuge_data_nascimento" value={form.conjuge_data_nascimento} onChange={onText} />
                <Money label="Renda do cônjuge" icon={Wallet} value={formatRendaFromDigits(form.conjugeRendaDigits)} onChange={(e) => set("conjugeRendaDigits", onlyDigits(e.target.value))} placeholder="2.000,00" />
                <Select label="Tipo de renda do cônjuge" icon={Coins} name="conjuge_renda_tipo" value={form.conjuge_renda_tipo} onChange={onText}>
                  <option value="">Selecione</option>
                  {RENDA_TIPOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </Select>
                {conjugeRendaFormal && (
                  <Text label="Admissão do cônjuge" icon={Calendar} type="date" name="conjuge_data_admissao" value={form.conjuge_data_admissao} onChange={onText} />
                )}
              </div>
            )}
          </Section>
        )}

        {/* Fiador */}
        <Section id="fiador" refCb={registerRef} icon={ShieldCheck} title="Fiador" subtitle="Garantia por fiador (opcional)" done={form.possui_fiador && !!form.fiador_nome}>
          <SwitchRow title="Cliente possui fiador" desc="Terceiro que garante o contrato" checked={form.possui_fiador} onChange={(v) => set("possui_fiador", v)} />
          {form.possui_fiador && (
            <div className="mt-4 grid grid-cols-1 gap-3 duration-200 animate-in fade-in slide-in-from-top-1 sm:grid-cols-2 lg:grid-cols-3">
              <Text label="Nome do fiador" icon={User} name="fiador_nome" value={form.fiador_nome} onChange={onUpper} />
              <Text label="CPF do fiador" icon={IdCard} value={form.fiador_cpf} onChange={(e) => set("fiador_cpf", maskCPF(e.target.value))} placeholder="000.000.000-00" />
              <Text label="Telefone do fiador" icon={Phone} value={form.fiador_telefone} onChange={(e) => set("fiador_telefone", maskPhone(e.target.value))} placeholder="(00) 00000-0000" />
              <Text label="E-mail do fiador" icon={Mail} type="email" name="fiador_email" value={form.fiador_email} onChange={onUpper} />
            </div>
          )}
        </Section>

        {/* Caixa — só na edição, admin/correspondente */}
        {showCaixa && (
          <Section id="caixa" refCb={registerRef} icon={Landmark} title="Caixa" subtitle="Formulários e tela de aprovação" done={form.possui_formularios_caixa}>
            <SwitchRow title="Possui formulários Caixa" desc="Formulários exigidos no processo Caixa" checked={form.possui_formularios_caixa} onChange={(v) => set("possui_formularios_caixa", v)} />
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Dropzone label="Formulários Caixa" icon={Landmark} files={files.formulariosCaixa} onChange={handleFiles("formulariosCaixa")} onClear={clearFiles("formulariosCaixa")} />
              <Dropzone label="Tela de aprovação" icon={Landmark} files={files.tela_aprovacao} onChange={handleFiles("tela_aprovacao")} onClear={clearFiles("tela_aprovacao")} />
            </div>
          </Section>
        )}

        {/* Responsável */}
        {canAssign && usuarios.length > 0 && (
          <Section id="responsavel" refCb={registerRef} icon={UserCheck} title="Responsável" subtitle="Quem atende este cliente" done={!!form.userId}>
            <Select label="Usuário responsável" icon={User} name="userId" value={form.userId} onChange={onText} className="max-w-md">
              <option value="">Manter padrão (você)</option>
              {usuarios.map((u) => (
                <option key={u.id} value={u.id}>
                  {`${u.first_name || ""} ${u.last_name || ""}`.trim()}{u.email ? ` — ${u.email}` : ""}
                </option>
              ))}
            </Select>
          </Section>
        )}

        {/* Situação — status só admin/correspondente */}
        {showSituacao && (
          <Section id="situacao" refCb={registerRef} icon={Contact} title="Situação" subtitle="Etapa no funil" done={form.status !== "aguardando_aprovacao"}>
            <Select label="Status" icon={Contact} name="status" value={form.status} onChange={onText} className="max-w-md">
              {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
          </Section>
        )}

        {/* Documentos */}
        <Section id="documentos" refCb={registerRef} icon={FolderOpen} title="Documentos" subtitle="PDF ou imagens para análise" done={anyFiles}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Dropzone label="Documentos pessoais" icon={IdCard} files={files.documentosPessoais} onChange={handleFiles("documentosPessoais")} onClear={clearFiles("documentosPessoais")} />
            <Dropzone label="Extrato / contracheque" icon={Wallet} files={files.extratoBancario} onChange={handleFiles("extratoBancario")} onClear={clearFiles("extratoBancario")} />
            {form.possui_dependente && (
              <Dropzone label="Documentos dos dependentes" icon={Users} files={files.documentosDependente} onChange={handleFiles("documentosDependente")} onClear={clearFiles("documentosDependente")} />
            )}
            {isCasado && (
              <Dropzone label="Documentos do cônjuge" icon={Heart} files={files.documentosConjuge} onChange={handleFiles("documentosConjuge")} onClear={clearFiles("documentosConjuge")} />
            )}
            {form.possui_fiador && (
              <Dropzone label="Documentos do fiador" icon={ShieldCheck} files={files.fiadorDocumentos} onChange={handleFiles("fiadorDocumentos")} onClear={clearFiles("fiadorDocumentos")} />
            )}
          </div>
        </Section>

        {/* CTA */}
        <div className="sticky bottom-4 z-10">
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-orange-900/40 ring-1 ring-orange-400/30 transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <><Loader2 className="h-5 w-5 animate-spin" /> Salvando…</>
            ) : (
              <><Save className="h-5 w-5" /> {mode === "edit" ? "Salvar alterações" : "Cadastrar cliente"}</>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
