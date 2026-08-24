"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Loader2, X, Save, ExternalLink, AlertCircle,
  User, Coins, Heart, ShieldCheck, ClipboardList,
} from "lucide-react";
import { STATUS_LIST, statusInfo } from "@/lib/cliente-status";

// Painel lateral de edição do cliente.
//
// Abre ao clicar num card do Kanban, busca o cadastro em GET /clientes/:id e
// traz TODOS os campos de texto do contrato, divididos em seções colapsáveis.
// O que fica de fora — e só por isso o link para o cadastro completo existe —
// são os UPLOADS de documento, que exigem o fluxo multipart com arquivo.
//
// Contrato do backend (mesmo do ClienteForm):
//   - PUT /clientes/:id é multipart/form-data e TODO campo é opcional
//     (ponteiro no Go), então mandamos só o que mudou;
//   - valor_renda / conjuge_valor_renda são VARCHAR pt-BR ("2.000,00");
//   - booleans vão como "true"/"false"; datas como "YYYY-MM-DD"; cpf só dígitos.

const onlyDigits = (v) => (v || "").toString().replace(/\D/g, "");
const centavosToBRL = (digits) =>
  digits
    ? (Number(digits) / 100).toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : "";
const maskCPF = (v) =>
  onlyDigits(v).slice(0, 11)
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
const dateOnly = (s) => (s ? s.toString().slice(0, 10) : "");
const lower = (v) => (v ? v.toString().toLowerCase() : "");
const toBool = (v) => v === true || v === "true" || v === 1 || v === "1";

const ESTADO_CIVIL = [
  { value: "solteiro", label: "Solteiro(a)" },
  { value: "casado", label: "Casado(a)" },
  { value: "divorciado", label: "Divorciado(a)" },
  { value: "viuvo", label: "Viúvo(a)" },
  { value: "uniao_estavel", label: "União estável" },
];
const RENDA_TIPOS = [
  { value: "", label: "Selecione" },
  { value: "formal", label: "Formal" },
  { value: "informal", label: "Informal" },
  { value: "mista", label: "Mista" },
];

// A divisão do painel espelha as seções do cadastro completo, para quem
// alterna entre os dois não precisar reaprender onde cada campo mora.
const SECOES = [
  {
    id: "identificacao",
    titulo: "Identificação",
    icon: User,
    campos: [
      { key: "nome", label: "Nome completo", type: "text", upper: true, full: true },
      { key: "email", label: "E-mail", type: "email", upper: true, full: true },
      { key: "telefone", label: "Telefone", type: "text" },
      { key: "cpf", label: "CPF", type: "cpf" },
      { key: "estado_civil", label: "Estado civil", type: "select", options: ESTADO_CIVIL },
      { key: "naturalidade", label: "Naturalidade", type: "text", upper: true },
      { key: "data_nascimento", label: "Data de nascimento", type: "date" },
      { key: "data_criacao", label: "Data do cadastro", type: "date" },
    ],
  },
  {
    id: "renda",
    titulo: "Renda & trabalho",
    icon: Coins,
    campos: [
      { key: "profissao", label: "Profissão", type: "text", upper: true, full: true },
      { key: "valor_renda", label: "Renda mensal", type: "money" },
      { key: "renda_tipo", label: "Tipo de renda", type: "select", options: RENDA_TIPOS },
      { key: "data_admissao", label: "Data de admissão", type: "date" },
      { key: "numero_pis", label: "Número do PIS", type: "text" },
      { key: "possui_carteira_mais_tres_anos", label: "Carteira há mais de 3 anos", type: "bool", full: true },
      { key: "possui_dependente", label: "Possui dependentes", type: "bool", full: true },
    ],
  },
  {
    id: "conjuge",
    titulo: "Cônjuge",
    icon: Heart,
    campos: [
      { key: "conjuge_nome", label: "Nome do cônjuge", type: "text", upper: true, full: true },
      { key: "conjuge_email", label: "E-mail", type: "email", upper: true, full: true },
      { key: "conjuge_telefone", label: "Telefone", type: "text" },
      { key: "conjuge_cpf", label: "CPF", type: "cpf" },
      { key: "conjuge_profissao", label: "Profissão", type: "text", upper: true },
      { key: "conjuge_data_nascimento", label: "Data de nascimento", type: "date" },
      { key: "conjuge_valor_renda", label: "Renda mensal", type: "money" },
      { key: "conjuge_renda_tipo", label: "Tipo de renda", type: "select", options: RENDA_TIPOS },
      { key: "conjuge_data_admissao", label: "Data de admissão", type: "date" },
    ],
  },
  {
    id: "fiador",
    titulo: "Fiador",
    icon: ShieldCheck,
    campos: [
      { key: "possui_fiador", label: "Possui fiador", type: "bool", full: true },
      { key: "fiador_nome", label: "Nome do fiador", type: "text", upper: true, full: true },
      { key: "fiador_email", label: "E-mail", type: "email", upper: true, full: true },
      { key: "fiador_telefone", label: "Telefone", type: "text" },
      { key: "fiador_cpf", label: "CPF", type: "cpf" },
    ],
  },
  {
    id: "situacao",
    titulo: "Situação",
    icon: ClipboardList,
    campos: [
      { key: "status", label: "Status do atendimento", type: "status", full: true },
      { key: "possui_formularios_caixa", label: "Possui formulários da Caixa", type: "bool", full: true },
    ],
  },
];

const TODOS_CAMPOS = SECOES.flatMap((s) => s.campos);
const MONEY_KEYS = new Set(["valor_renda", "conjuge_valor_renda"]);
const CPF_KEYS = new Set(["cpf", "conjuge_cpf", "fiador_cpf"]);
const BOOL_KEYS = new Set(TODOS_CAMPOS.filter((c) => c.type === "bool").map((c) => c.key));
const DATE_KEYS = new Set(TODOS_CAMPOS.filter((c) => c.type === "date").map((c) => c.key));

function estadoInicial(c) {
  const out = {};
  for (const campo of TODOS_CAMPOS) {
    const bruto = c[campo.key];
    if (BOOL_KEYS.has(campo.key)) out[campo.key] = toBool(bruto);
    else if (MONEY_KEYS.has(campo.key)) {
      const fmt = campo.key === "valor_renda" ? c.valor_renda_formatado : c.conjuge_valor_renda_formatado;
      out[campo.key] = onlyDigits(fmt || bruto);
    } else if (CPF_KEYS.has(campo.key)) out[campo.key] = onlyDigits(bruto);
    else if (DATE_KEYS.has(campo.key)) out[campo.key] = dateOnly(bruto);
    else if (campo.type === "select") out[campo.key] = lower(bruto);
    else out[campo.key] = bruto ?? "";
  }
  return out;
}

export function ClienteDrawer({ clienteId, onClose, onSaved }) {
  const [cliente, setCliente] = useState(null);
  const [form, setForm] = useState(null);
  const [original, setOriginal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState("");
  const [aberta, setAberta] = useState({ identificacao: true, renda: true, situacao: true });

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape" && !saving) onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, saving]);

  useEffect(() => {
    let cancelado = false;
    setLoading(true);
    setErro("");
    (async () => {
      try {
        const res = await fetch(`/api/backend/clientes/${clienteId}`, { cache: "no-store" });
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.error || "Não foi possível carregar o cliente");
        const c = data?.cliente ?? data;
        if (cancelado) return;
        const inicial = estadoInicial(c);
        setCliente(c);
        setForm(inicial);
        setOriginal(inicial);
      } catch (e) {
        if (!cancelado) setErro(e.message || "Erro ao carregar");
      } finally {
        if (!cancelado) setLoading(false);
      }
    })();
    return () => { cancelado = true; };
  }, [clienteId]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const alterados = useMemo(() => {
    if (!form || !original) return [];
    return Object.keys(form).filter((k) => form[k] !== original[k]);
  }, [form, original]);

  const salvar = async () => {
    if (!alterados.length) return;
    setSaving(true);
    setErro("");
    try {
      const fd = new FormData();
      // Só a diferença: campo ausente o backend trata como "não mexer".
      for (const k of alterados) {
        const v = form[k];
        if (MONEY_KEYS.has(k)) fd.append(k, centavosToBRL(v));
        else if (CPF_KEYS.has(k)) fd.append(k, onlyDigits(v));
        else if (DATE_KEYS.has(k)) fd.append(k, dateOnly(v));
        else if (BOOL_KEYS.has(k)) fd.append(k, v ? "true" : "false");
        else fd.append(k, v);
      }

      const res = await fetch(`/api/backend/clientes/${clienteId}`, { method: "PUT", body: fd });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Não foi possível salvar");

      setOriginal(form);
      // Atualiza a linha/card na lista sem refetch da carteira inteira.
      onSaved?.(clienteId, {
        ...(data?.cliente || {}),
        nome: form.nome,
        email: form.email,
        telefone: form.telefone,
        cpf: form.cpf,
        status: form.status,
        valor_renda_formatado: centavosToBRL(form.valor_renda),
      });
      onClose();
    } catch (e) {
      setErro(e.message || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const info = statusInfo(form?.status ?? cliente?.status);
  const responsavel = cliente?.user?.first_name
    ? `${cliente.user.first_name} ${cliente.user.last_name || ""}`.trim()
    : null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="Editar cliente">
      <div className="absolute inset-0 bg-black/40" onClick={() => !saving && onClose()} />

      <aside className="relative flex h-full w-full max-w-lg flex-col border-l border-cx-border bg-cx-surface shadow-2xl">
        <header className="flex items-start justify-between gap-3 border-b border-cx-border px-5 py-4">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-cx-text">
              {loading ? "Carregando…" : cliente?.nome || "Cliente"}
            </p>
            {!loading && (
              <>
                <span
                  className="cx-chevron mt-1.5 inline-flex w-[190px] items-center py-1 pl-2.5 text-[11px] font-semibold text-white"
                  style={{ backgroundColor: info.solid }}
                  title={info.label}
                >
                  <span className="truncate">{info.label}</span>
                </span>
                {responsavel && (
                  <p className="mt-1.5 text-[11px] text-cx-muted">Responsável: {responsavel}</p>
                )}
              </>
            )}
          </div>
          <button
            type="button"
            onClick={() => !saving && onClose()}
            className="rounded-lg p-1.5 text-cx-muted transition-colors hover:bg-cx-bg hover:text-cx-text"
            title="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-cx-muted">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando cadastro…
            </div>
          ) : !form ? (
            <p className="py-16 text-center text-sm text-cx-muted">{erro || "Cliente não encontrado."}</p>
          ) : (
            <div className="space-y-2.5">
              {SECOES.map((secao) => {
                const Icone = secao.icon;
                const aberto = !!aberta[secao.id];
                const mudouAqui = secao.campos.some((c) => alterados.includes(c.key));
                return (
                  <section key={secao.id} className="overflow-hidden rounded-xl border border-cx-border">
                    <button
                      type="button"
                      onClick={() => setAberta((a) => ({ ...a, [secao.id]: !a[secao.id] }))}
                      aria-expanded={aberto}
                      className="flex w-full items-center gap-2.5 bg-cx-bg px-3.5 py-2.5 text-left transition-colors hover:bg-cx-border/40"
                    >
                      <Icone className="h-4 w-4 shrink-0 text-cx-blue" />
                      <span className="flex-1 text-xs font-semibold text-cx-text">{secao.titulo}</span>
                      {mudouAqui && (
                        <span className="rounded-full bg-cx-blue-soft px-2 py-0.5 text-[10px] font-semibold text-cx-blue">
                          alterado
                        </span>
                      )}
                      <span className="text-[10px] text-cx-muted">{aberto ? "▲" : "▼"}</span>
                    </button>

                    {aberto && (
                      <div className="grid grid-cols-2 gap-3 p-3.5">
                        {secao.campos.map((campo) => (
                          <Campo
                            key={campo.key}
                            campo={campo}
                            valor={form[campo.key]}
                            onChange={(v) => set(campo.key, v)}
                          />
                        ))}
                      </div>
                    )}
                  </section>
                );
              })}

              <p className="pt-1 text-[11px] text-cx-muted">
                Envio de documentos continua no cadastro completo.
              </p>
            </div>
          )}

          {erro && !loading && (
            <p className="mt-3 flex items-start gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {erro}
            </p>
          )}
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-cx-border px-5 py-3.5">
          <Link
            href={`/editar-cliente/${clienteId}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-cx-blue hover:underline"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Cadastro completo
          </Link>
          <div className="flex items-center gap-2">
            {alterados.length > 0 && (
              <span className="text-[11px] text-cx-muted">
                {alterados.length} {alterados.length === 1 ? "campo alterado" : "campos alterados"}
              </span>
            )}
            <button type="button" onClick={() => !saving && onClose()} className="cx-btn cx-btn-outline px-4 py-2 text-xs">
              Cancelar
            </button>
            <button
              type="button"
              onClick={salvar}
              disabled={!alterados.length || saving || loading}
              className="cx-btn cx-btn-primary px-4 py-2 text-xs"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              {saving ? "Salvando…" : "Salvar"}
            </button>
          </div>
        </footer>
      </aside>
    </div>
  );
}

function Campo({ campo, valor, onChange }) {
  const id = `d-${campo.key}`;
  const wrap = campo.full ? "col-span-2" : "";

  if (campo.type === "bool") {
    return (
      <div className={wrap}>
        <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-cx-border px-3 py-2">
          <span className="text-xs text-cx-text">{campo.label}</span>
          <input
            id={id}
            type="checkbox"
            checked={!!valor}
            onChange={(e) => onChange(e.target.checked)}
            className="h-4 w-4 accent-cx-blue"
          />
        </label>
      </div>
    );
  }

  return (
    <div className={wrap}>
      <label className="mb-1 block text-[11px] font-medium text-cx-muted" htmlFor={id}>
        {campo.label}
      </label>

      {campo.type === "money" ? (
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-cx-muted">R$</span>
          {/* .cx-input define `padding` em CSS puro, que vence o utilitário pl-9
              do Tailwind (utilities ficam em layer) — daí o recuo inline. */}
          <input
            id={id}
            inputMode="numeric"
            value={centavosToBRL(valor) || "0,00"}
            onChange={(e) => onChange(onlyDigits(e.target.value))}
            style={{ paddingLeft: "2.25rem" }}
            className="cx-input tabular-nums"
          />
        </div>
      ) : campo.type === "status" ? (
        <select id={id} value={valor} onChange={(e) => onChange(e.target.value)} className="cx-input [&>option]:bg-white [&>option]:text-cx-text">
          {STATUS_LIST.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      ) : campo.type === "select" ? (
        <select id={id} value={valor} onChange={(e) => onChange(e.target.value)} className="cx-input [&>option]:bg-white [&>option]:text-cx-text">
          {campo.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : (
        <input
          id={id}
          type={campo.type === "date" ? "date" : campo.type === "email" ? "email" : "text"}
          value={campo.type === "cpf" ? maskCPF(valor) : valor}
          onChange={(e) =>
            onChange(
              campo.type === "cpf"
                ? onlyDigits(e.target.value)
                : campo.upper
                  ? e.target.value.toUpperCase()
                  : e.target.value,
            )
          }
          className="cx-input"
        />
      )}
    </div>
  );
}
