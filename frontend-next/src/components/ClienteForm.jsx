"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  User, Heart, ShieldCheck, Landmark, Save, UserCheck, FolderOpen, Check,
  ChevronRight, Fingerprint, Coins, Contact, ChevronDown,
} from "@/components/icons";
import { toast } from "sonner";
import { maskCpf as maskCPF, maskPhone, soDigitos } from "@/lib/masks";
import { cpfValido, emailValido, telefoneValido } from "@/lib/validar";
import { FormField, FormAlert, focarPrimeiroErro } from "@/components/ui/form-field";
import { MoneyInput } from "@/components/ui/money-input";
import { FormActions } from "@/components/ui/form-actions";
import { Dropzone as DropzoneBase } from "@/components/ui/dropzone";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { ClienteDocumentos } from "@/components/ClienteDocumentos";

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

// Sugestões de canal de captação para o campo Origem. É uma lista de partida
// (datalist), não um enum: o campo continua aceitando qualquer texto.
const ORIGENS_SUGERIDAS = [
  "Indicação", "Site", "Facebook", "Instagram", "Google", "WhatsApp",
  "Campanha", "Portal imobiliário", "Placa", "Balcão",
];

const RENDA_TIPOS = [
  { value: "formal", label: "Formal" },
  { value: "informal", label: "Informal" },
  { value: "mista", label: "Mista" },
];

// ── Helpers de máscara / formatação ────────────────────────────────────────────
const onlyDigits = soDigitos;

// Ordem dos campos na tela: o foco vai para o primeiro com erro.
const ORDEM_CAMPOS = [
  "nome", "email", "telefone", "cpf", "estado_civil", "naturalidade", "data_nascimento", "origem", "interesse", "data_criacao",
  "profissao", "valor_renda", "renda_tipo", "data_admissao", "numero_pis",
  "conjuge_nome", "conjuge_email", "conjuge_telefone", "conjuge_cpf", "conjuge_profissao", "conjuge_data_nascimento", "conjuge_valor_renda", "conjuge_renda_tipo", "conjuge_data_admissao",
  "fiador_nome", "fiador_cpf", "fiador_telefone", "fiador_email", "userId", "status",
];

// Tamanho máximo de cada texto = tamanho da coluna no banco (texto maior
// virava erro 500). origem/interesse têm colunas menores.
const MAX = { origem: 80, interesse: 160 };
const maxDe = (campo) => MAX[campo] ?? 255;

// Data AAAA-MM-DD: precisa existir, ser de 1900 em diante e não estar no futuro.
function erroData(valor, rotulo) {
  if (!valor) return null;
  const hoje = new Date().toLocaleDateString("sv-SE");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor) || valor < "1900-01-01") return `${rotulo}: data inválida. Use dia/mês/ano.`;
  if (valor > hoje) return `${rotulo} não pode ser no futuro.`;
  return null;
}

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
    // Data LOCAL de hoje: toISOString() é UTC e, depois das 21h, já marcava amanhã.
    data_criacao: new Date().toLocaleDateString("sv-SE"),

    profissao: c.profissao ?? "",
    origem: c.origem ?? "",
    interesse: c.interesse ?? "",
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
// Rótulo + controle + erro via FormField (htmlFor/id, aria-invalid). O id
// padrão é o `name` do campo, para o foco no primeiro erro achar o controle.
function Text({ label, id, error, hint, required, optional, className = "", ...props }) {
  return (
    <FormField id={id ?? props.name} label={label} error={error} hint={hint} required={required} optional={optional} className={className}>
      <input maxLength={props.type === "date" ? undefined : maxDe(id ?? props.name)} {...props} />
    </FormField>
  );
}

function Select({ label, id, error, hint, children, className = "", ...props }) {
  return (
    <FormField id={id ?? props.name} label={label} error={error} hint={hint} className={className}>
      <select {...props}>{children}</select>
    </FormField>
  );
}

function Money({ label, id, value, onChange, placeholder, hint, error }) {
  return (
    <FormField id={id} label={label} hint={hint} error={error}>
      <MoneyInput value={value} onChange={onChange} placeholder={placeholder} />
    </FormField>
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
      {/* flex-1: com base 0 o texto encolhe e o switch não cai para a linha de
          baixo no celular (a linha herda flex-wrap do layout). */}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-cx-text">{title}</p>
        {desc && <p className="text-xs text-cx-muted">{desc}</p>}
      </div>
      <Switch checked={checked} onChange={onChange} />
    </div>
  );
}

function Dropzone({ id, label, files, onChange }) {
  return (
    <div className="crm-field">
      <p className="crm-field-label">{label}</p>
      <DropzoneBase id={id} multiple files={files} onChange={onChange} accept="image/*,application/pdf" texto="Toque para enviar fotos ou PDF" />
    </div>
  );
}

function Section({ id, refCb, icon: Icon, title, subtitle, done, children }) {
  return (
    <section ref={refCb} id={id} className="crm-form-section crm-card scroll-mt-6">
      <header className="flex items-center gap-3 border-b">
        <span className="flex shrink-0 items-center justify-center border">
          <Icon aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h3>{title}</h3>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {done && <Check className="ml-auto h-4 w-4 text-primary" aria-label="Seção preenchida" />}
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
  const [erros, setErros] = useState({});
  const [maisAberto, setMaisAberto] = useState(false);
  // Muda a cada salvamento na edição para a lista de documentos recarregar.
  const [docsVersao, setDocsVersao] = useState(0);
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

  // Ao corrigir um campo, o erro dele some na hora (recuperação de erro).
  const set = (name, value) => {
    setForm((p) => ({ ...p, [name]: value }));
    setErros((p) => (p[name] ? { ...p, [name]: undefined } : p));
  };
  const onText = (e) => set(e.target.name, e.target.value);
  const onUpper = (e) => set(e.target.name, e.target.value.toUpperCase());
  const handleFiles = (key) => (list) => setFiles((p) => ({ ...p, [key]: list }));

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

    const novos = {};
    const tem = (v) => !!(v && v.toString().trim());
    if (!form.nome.trim()) novos.nome = "Escreva o nome do cliente.";
    if (!form.email.trim()) novos.email = "Escreva o e-mail do cliente.";
    else if (!emailValido(form.email)) novos.email = "Confira o e-mail. Exemplo: maria@email.com";
    if (!telefoneValido(form.telefone)) novos.telefone = "Escreva o telefone com DDD.";
    if (onlyDigits(form.cpf).length !== 11) novos.cpf = "O CPF precisa ter 11 números.";
    else if (!cpfValido(form.cpf)) novos.cpf = "CPF inválido. Confira os 11 números.";
    const datas = [
      ["data_nascimento", "Data de nascimento"], ["data_admissao", "Data de admissão", rendaFormal],
      ["data_criacao", "Data do cadastro", mode === "create"],
    ];
    const conjuge = isCasado && form.cadastrar_conjuge;
    if (conjuge) {
      if (tem(form.conjuge_email) && !emailValido(form.conjuge_email)) novos.conjuge_email = "Confira o e-mail do cônjuge.";
      if (tem(form.conjuge_telefone) && !telefoneValido(form.conjuge_telefone)) novos.conjuge_telefone = "Escreva o telefone com DDD.";
      if (tem(form.conjuge_cpf) && !cpfValido(form.conjuge_cpf)) novos.conjuge_cpf = "CPF inválido. Confira os 11 números.";
      datas.push(["conjuge_data_nascimento", "Nascimento do cônjuge"], ["conjuge_data_admissao", "Admissão do cônjuge", conjugeRendaFormal]);
    }
    if (form.possui_fiador) {
      if (tem(form.fiador_email) && !emailValido(form.fiador_email)) novos.fiador_email = "Confira o e-mail do fiador.";
      if (tem(form.fiador_telefone) && !telefoneValido(form.fiador_telefone)) novos.fiador_telefone = "Escreva o telefone com DDD.";
      if (tem(form.fiador_cpf) && !cpfValido(form.fiador_cpf)) novos.fiador_cpf = "CPF inválido. Confira os 11 números.";
    }
    for (const [campo, rotulo, visivel = true] of datas) {
      const msg = visivel ? erroData(form[campo], rotulo) : null;
      if (msg) novos[campo] = msg;
    }
    if (novos.data_criacao) setMaisAberto(true);
    if (Object.keys(novos).length) {
      setErros(novos);
      focarPrimeiroErro(novos, ORDEM_CAMPOS);
      return;
    }

    const fd = new FormData();
    const put = (k, v) => { if (v !== undefined && v !== null && v.toString().trim() !== "") fd.append(k, v); };
    // Opcional: na edição, vazio vai como "" para o backend APAGAR o valor
    // antigo (antes, apagar um campo e salvar não mudava nada). Na criação,
    // vazio simplesmente não vai.
    const opt = (k, v) => {
      const txt = v === undefined || v === null ? "" : v.toString().trim();
      if (txt) fd.append(k, txt);
      else if (mode === "edit") fd.append(k, "");
    };

    put("nome", form.nome.toUpperCase());
    put("email", form.email.trim());
    put("telefone", form.telefone);
    put("cpf", onlyDigits(form.cpf));
    put("estado_civil", form.estado_civil);
    opt("naturalidade", form.naturalidade.toUpperCase());
    opt("data_nascimento", formatDateOnly(form.data_nascimento));
    if (mode === "create") put("data_criacao", formatDateOnly(form.data_criacao));

    opt("profissao", form.profissao.toUpperCase());
    opt("origem", form.origem);
    opt("interesse", form.interesse.toUpperCase());
    opt("valor_renda", formatRendaFromDigits(form.valorRendaDigits));
    opt("renda_tipo", form.renda_tipo);
    // Campo escondido (admissão sem renda formal, PIS sem carteira, cônjuge e
    // fiador desligados) vai vazio: não pode ficar dado velho invisível.
    opt("data_admissao", rendaFormal ? formatDateOnly(form.data_admissao) : "");
    fd.append("possui_carteira_mais_tres_anos", form.possui_carteira_mais_tres_anos ? "true" : "false");
    opt("numero_pis", form.possui_carteira_mais_tres_anos ? form.numero_pis : "");
    fd.append("possui_dependente", form.possui_dependente ? "true" : "false");

    const conj = isCasado && form.cadastrar_conjuge;
    opt("conjuge_nome", conj ? form.conjuge_nome.toUpperCase() : "");
    opt("conjuge_email", conj ? form.conjuge_email.trim() : "");
    opt("conjuge_telefone", conj ? form.conjuge_telefone : "");
    opt("conjuge_cpf", conj ? onlyDigits(form.conjuge_cpf) : "");
    opt("conjuge_profissao", conj ? form.conjuge_profissao.toUpperCase() : "");
    opt("conjuge_data_nascimento", conj ? formatDateOnly(form.conjuge_data_nascimento) : "");
    opt("conjuge_valor_renda", conj ? formatRendaFromDigits(form.conjugeRendaDigits) : "");
    opt("conjuge_renda_tipo", conj ? form.conjuge_renda_tipo : "");
    opt("conjuge_data_admissao", conj && conjugeRendaFormal ? formatDateOnly(form.conjuge_data_admissao) : "");

    fd.append("possui_fiador", form.possui_fiador ? "true" : "false");
    opt("fiador_nome", form.possui_fiador ? form.fiador_nome.toUpperCase() : "");
    opt("fiador_cpf", form.possui_fiador ? onlyDigits(form.fiador_cpf) : "");
    opt("fiador_telefone", form.possui_fiador ? form.fiador_telefone : "");
    opt("fiador_email", form.possui_fiador ? form.fiador_email.trim() : "");

    if (showCaixa) fd.append("possui_formularios_caixa", form.possui_formularios_caixa ? "true" : "false");
    if (showSituacao) put("status", form.status);
    if (canAssign && form.userId) put("userId", form.userId);

    Object.entries(files).forEach(([field, list]) => list.forEach((file) => fd.append(field, file)));

    setLoading(true);
    try {
      const url = mode === "edit" ? `/api/backend/clientes/${clienteId}` : "/api/backend/clientes";
      const res = await fetch(url, { method: mode === "edit" ? "PUT" : "POST", body: fd });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        // Erro por campo vindo do servidor: mostra embaixo de cada campo.
        const porCampo = {};
        for (const d of Array.isArray(data?.details) ? data.details : []) {
          if (d?.field && d?.message && !porCampo[d.field]) porCampo[d.field] = d.message;
        }
        if (!Object.keys(porCampo).length && data?.campo && data?.error) porCampo[data.campo] = data.error;
        const visiveis = Object.keys(porCampo).filter((k) => ORDEM_CAMPOS.includes(k));
        if (visiveis.length) {
          if (porCampo.data_criacao) setMaisAberto(true);
          setErros((p) => ({ ...p, ...porCampo }));
          focarPrimeiroErro(porCampo, ORDEM_CAMPOS);
          toast.error("Confira os campos marcados.");
          return;
        }
        // Sem JSON = servidor fora do ar/reiniciando (o proxy devolve 500 cru).
        throw new Error(data?.error || data?.message || "Não foi possível falar com o servidor. Tente de novo em instantes.");
      }
      const saved = await res.json().catch(() => ({}));
      const novoId = saved?.cliente?.id ?? saved?.id;
      if (mode === "create") {
        toast.success(`${form.nome.trim() || "Cliente"} foi cadastrado.`, {
          action: { label: "Cadastrar outro", onClick: () => router.push("/clientes/adicionar") },
          duration: 8000,
        });
        router.push(novoId ? `/editar-cliente/${novoId}` : "/clientes/lista");
      } else {
        toast.success("Alterações salvas.");
        // Os arquivos já subiram: limpar evita reenviar tudo (duplicado) no
        // próximo "Salvar", e a lista de enviados recarrega com os novos.
        setFiles(EMPTY_FILES);
        setDocsVersao((v) => v + 1);
      }
      router.refresh();
    } catch (err) {
      const msg = err.message || "Não foi possível salvar o cliente. Tente de novo.";
      setError(msg);
      // A página rola dentro do <main> do layout, não na janela: o aviso
      // flutuante garante que a pessoa veja o erro de onde estiver.
      toast.error(msg);
      requestAnimationFrame(() => document.querySelector(".crm-alert[data-tom='erro']")?.scrollIntoView({ behavior: "smooth", block: "center" }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="crm-form crm-form-composed grid grid-cols-1 gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
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
        {error && <FormAlert titulo="Não deu para salvar">{error}</FormAlert>}

        {/* Identificação */}
        <Section id="identificacao" refCb={registerRef} icon={Fingerprint} title="Identificação" subtitle="Quem é o cliente" done={!!(form.nome && onlyDigits(form.cpf).length === 11)}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Text label="Nome completo" required error={erros.nome} name="nome" autoComplete="name" value={form.nome} onChange={onUpper} placeholder="MARIA DA SILVA" className="sm:col-span-2" />
            <Text label="E-mail" required error={erros.email} type="email" name="email" autoComplete="email" inputMode="email" value={form.email} onChange={onText} placeholder="maria@email.com" />
            <Text label="Telefone (WhatsApp)" required error={erros.telefone} type="tel" name="telefone" autoComplete="tel" inputMode="tel" value={form.telefone} onChange={(e) => set("telefone", maskPhone(e.target.value))} placeholder="(61) 99999-9999" />
            <Text label="CPF" required error={erros.cpf} name="cpf" inputMode="numeric" value={form.cpf} onChange={(e) => set("cpf", maskCPF(e.target.value))} placeholder="000.000.000-00" />
            <Select label="Estado civil" error={erros.estado_civil} name="estado_civil" value={form.estado_civil} onChange={onText}>
              <option value="solteiro">Solteiro(a)</option>
              <option value="casado">Casado(a)</option>
              <option value="divorciado">Divorciado(a)</option>
              <option value="viuvo">Viúvo(a)</option>
              <option value="uniao_estavel">União estável</option>
            </Select>
            <Text label="Naturalidade / cidade" error={erros.naturalidade} name="naturalidade" value={form.naturalidade} onChange={onUpper} placeholder="SÃO PAULO - SP" />
            <Text label="Data de nascimento" error={erros.data_nascimento} type="date" name="data_nascimento" value={form.data_nascimento} onChange={onText} />
            {/* Origem e interesse alimentam as colunas de mesmo nome na lista de
                clientes. A origem tem lista de sugestões mas aceita texto livre
                (o banco não restringe) — cada imobiliária capta por canais
                diferentes e a lista fixa envelheceria rápido. */}
            <Text
              label="Origem do contato"
              error={erros.origem}
              name="origem"
              list="origens-sugeridas"
              value={form.origem}
              onChange={onText}
              placeholder="Indicação, Site, Facebook…"
            />
            <datalist id="origens-sugeridas">
              {ORIGENS_SUGERIDAS.map((item) => <option key={item} value={item} />)}
            </datalist>
            <Text label="Interesse" error={erros.interesse} name="interesse" value={form.interesse} onChange={onUpper} placeholder="APARTAMENTO 2 QUARTOS" />
          </div>
          {/* Data do cadastro já vem com hoje; só abre quem precisa lançar um
              cadastro antigo. */}
          {mode === "create" && (
            <Collapsible className="mt-5" open={maisAberto} onOpenChange={setMaisAberto}>
              <CollapsibleTrigger className="crm-more-trigger">
                Mais detalhes (opcional)
                <ChevronDown className="h-4 w-4" aria-hidden="true" />
              </CollapsibleTrigger>
              <CollapsibleContent className="crm-more-panel">
                <Text label="Data do cadastro" error={erros.data_criacao} hint="Já vem com a data de hoje. Mude só se o cliente chegou antes." type="date" name="data_criacao" value={form.data_criacao} onChange={onText} className="max-w-xs" />
              </CollapsibleContent>
            </Collapsible>
          )}
        </Section>

        {/* Renda & trabalho */}
        <Section id="renda" refCb={registerRef} icon={Coins} title="Renda & trabalho" subtitle="Composição de renda do titular" done={!!(form.valorRendaDigits && form.renda_tipo)}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Text label="Profissão" error={erros.profissao} name="profissao" value={form.profissao} onChange={onUpper} placeholder="GERENTE DE VENDAS" />
            <Money label="Renda mensal" error={erros.valor_renda} id="valor_renda" hint="Pode deixar em branco se ainda não souber." value={formatRendaFromDigits(form.valorRendaDigits)} onChange={(v) => set("valorRendaDigits", onlyDigits(v))} placeholder="2.000,00" />
            <Select label="Tipo de renda" error={erros.renda_tipo} name="renda_tipo" value={form.renda_tipo} onChange={onText}>
              <option value="">Selecione</option>
              {RENDA_TIPOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </Select>
            {rendaFormal && (
              <Text label="Data de admissão" error={erros.data_admissao} type="date" name="data_admissao" value={form.data_admissao} onChange={onText} />
            )}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <SwitchRow title="Carteira há +3 anos" desc="Tempo de registro em carteira" checked={form.possui_carteira_mais_tres_anos} onChange={(v) => set("possui_carteira_mais_tres_anos", v)} />
            <SwitchRow title="Possui dependentes" desc="Filhos ou outros dependentes" checked={form.possui_dependente} onChange={(v) => set("possui_dependente", v)} />
          </div>
          {form.possui_carteira_mais_tres_anos && (
            <div className="mt-3 grid gap-3 duration-200 animate-in fade-in slide-in-from-top-1 sm:grid-cols-3">
              <Text label="Número do PIS" error={erros.numero_pis} name="numero_pis" value={form.numero_pis} onChange={onText} placeholder="123.45678.90-1" />
            </div>
          )}
        </Section>

        {/* Cônjuge */}
        {isCasado && (
          <Section id="conjuge" refCb={registerRef} icon={Heart} title="Cônjuge" subtitle="Compor renda com o parceiro(a)" done={form.cadastrar_conjuge && !!form.conjuge_nome}>
            <SwitchRow title="Cadastrar cônjuge" desc="Inclui o cônjuge na composição de renda" checked={form.cadastrar_conjuge} onChange={(v) => set("cadastrar_conjuge", v)} />
            {form.cadastrar_conjuge && (
              <div className="mt-4 grid grid-cols-1 gap-3 duration-200 animate-in fade-in slide-in-from-top-1 sm:grid-cols-2 lg:grid-cols-3">
                <Text label="Nome do cônjuge" error={erros.conjuge_nome} name="conjuge_nome" value={form.conjuge_nome} onChange={onUpper} placeholder="JOÃO DA SILVA" />
                <Text label="E-mail do cônjuge" error={erros.conjuge_email} type="email" inputMode="email" name="conjuge_email" value={form.conjuge_email} onChange={onText} placeholder="joao@email.com" />
                <Text label="Telefone do cônjuge" error={erros.conjuge_telefone} id="conjuge_telefone" type="tel" inputMode="tel" value={form.conjuge_telefone} onChange={(e) => set("conjuge_telefone", maskPhone(e.target.value))} placeholder="(00) 00000-0000" />
                <Text label="CPF do cônjuge" error={erros.conjuge_cpf} id="conjuge_cpf" inputMode="numeric" value={form.conjuge_cpf} onChange={(e) => set("conjuge_cpf", maskCPF(e.target.value))} placeholder="000.000.000-00" />
                <Text label="Profissão do cônjuge" error={erros.conjuge_profissao} name="conjuge_profissao" value={form.conjuge_profissao} onChange={onUpper} />
                <Text label="Nascimento do cônjuge" error={erros.conjuge_data_nascimento} type="date" name="conjuge_data_nascimento" value={form.conjuge_data_nascimento} onChange={onText} />
                <Money label="Renda do cônjuge" error={erros.conjuge_valor_renda} id="conjuge_valor_renda" value={formatRendaFromDigits(form.conjugeRendaDigits)} onChange={(v) => set("conjugeRendaDigits", onlyDigits(v))} placeholder="2.000,00" />
                <Select label="Tipo de renda do cônjuge" error={erros.conjuge_renda_tipo} name="conjuge_renda_tipo" value={form.conjuge_renda_tipo} onChange={onText}>
                  <option value="">Selecione</option>
                  {RENDA_TIPOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </Select>
                {conjugeRendaFormal && (
                  <Text label="Admissão do cônjuge" error={erros.conjuge_data_admissao} type="date" name="conjuge_data_admissao" value={form.conjuge_data_admissao} onChange={onText} />
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
              <Text label="Nome do fiador" error={erros.fiador_nome} name="fiador_nome" value={form.fiador_nome} onChange={onUpper} />
              <Text label="CPF do fiador" error={erros.fiador_cpf} id="fiador_cpf" inputMode="numeric" value={form.fiador_cpf} onChange={(e) => set("fiador_cpf", maskCPF(e.target.value))} placeholder="000.000.000-00" />
              <Text label="Telefone do fiador" error={erros.fiador_telefone} id="fiador_telefone" type="tel" inputMode="tel" value={form.fiador_telefone} onChange={(e) => set("fiador_telefone", maskPhone(e.target.value))} placeholder="(00) 00000-0000" />
              <Text label="E-mail do fiador" error={erros.fiador_email} type="email" inputMode="email" name="fiador_email" value={form.fiador_email} onChange={onText} />
            </div>
          )}
        </Section>

        {/* Caixa — só na edição, admin/correspondente */}
        {showCaixa && (
          <Section id="caixa" refCb={registerRef} icon={Landmark} title="Caixa" subtitle="Formulários e tela de aprovação" done={form.possui_formularios_caixa}>
            <SwitchRow title="Possui formulários Caixa" desc="Formulários exigidos no processo Caixa" checked={form.possui_formularios_caixa} onChange={(v) => set("possui_formularios_caixa", v)} />
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Dropzone id="doc-formulariosCaixa" label="Formulários Caixa" files={files.formulariosCaixa} onChange={handleFiles("formulariosCaixa")} />
              <Dropzone id="doc-tela_aprovacao" label="Tela de aprovação" files={files.tela_aprovacao} onChange={handleFiles("tela_aprovacao")} />
            </div>
          </Section>
        )}

        {/* Responsável */}
        {canAssign && usuarios.length > 0 && (
          <Section id="responsavel" refCb={registerRef} icon={UserCheck} title="Responsável" subtitle="Quem atende este cliente" done={!!form.userId}>
            <Select label="Usuário responsável" error={erros.userId} name="userId" value={form.userId} onChange={onText} className="max-w-md">
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
            <Select label="Status" error={erros.status} name="status" value={form.status} onChange={onText} className="max-w-md">
              {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
          </Section>
        )}

        {/* Documentos */}
        <Section id="documentos" refCb={registerRef} icon={FolderOpen} title="Documentos" subtitle="PDF ou imagens para análise" done={anyFiles}>
          {/* Na edição, o que já foi enviado aparece aqui para ver, baixar ou
              remover — antes a tela só deixava acrescentar, às cegas. */}
          {mode === "edit" && clienteId && (
            <div className="mb-5">
              <p className="crm-field-label">Já enviados</p>
              <ClienteDocumentos key={docsVersao} clienteId={clienteId} />
            </div>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Dropzone id="doc-documentosPessoais" label="Documentos pessoais" files={files.documentosPessoais} onChange={handleFiles("documentosPessoais")} />
            <Dropzone id="doc-extratoBancario" label="Extrato / contracheque" files={files.extratoBancario} onChange={handleFiles("extratoBancario")} />
            {form.possui_dependente && (
              <Dropzone id="doc-documentosDependente" label="Documentos dos dependentes" files={files.documentosDependente} onChange={handleFiles("documentosDependente")} />
            )}
            {isCasado && (
              <Dropzone id="doc-documentosConjuge" label="Documentos do cônjuge" files={files.documentosConjuge} onChange={handleFiles("documentosConjuge")} />
            )}
            {form.possui_fiador && (
              <Dropzone id="doc-fiadorDocumentos" label="Documentos do fiador" files={files.fiadorDocumentos} onChange={handleFiles("fiadorDocumentos")} />
            )}
          </div>
        </Section>

        <FormActions
          loading={loading}
          icon={Save}
          submitLabel={mode === "edit" ? "Salvar alterações" : "Cadastrar cliente"}
          cancelHref={mode === "edit" ? undefined : "/clientes/lista"}
        />
      </div>
    </form>
  );
}
