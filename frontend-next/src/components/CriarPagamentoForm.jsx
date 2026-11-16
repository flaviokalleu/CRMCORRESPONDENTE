"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Check, ChevronDown, Copy, MessageCircle, Search, Send, X } from "@/components/icons";
import { PageHeader } from "@/components/ui/page";
import { FormField, FormAlert, focarPrimeiroErro } from "@/components/ui/form-field";
import { MoneyInput } from "@/components/ui/money-input";
import { FormActions } from "@/components/ui/form-actions";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { maskCpf, parseMoney, soDigitos } from "@/lib/masks";

// Client Component: cria cobranças avulsas via proxy Next.js
// (/api/backend/pagamentos/<tipo>) — nunca fala com o Go direto. A cobrança
// sai pelo Asaas da própria imobiliária; o link de pagamento volta em
// `asaas.invoice_url` (com `pagamento.invoice_url` como reserva).
// Payload (JSON): cliente_id, titulo, descricao, valor, data_vencimento
// (não vai no Pix), observacoes, enviar_whatsapp, enviar_email.

const FORMAS = [
  { value: "universal", titulo: "Ele escolhe", desc: "Pix, cartão ou boleto — o cliente decide na hora." },
  { value: "pix", titulo: "Só Pix", desc: "Código Pix na hora. Não tem data de vencimento." },
  { value: "boleto", titulo: "Só boleto", desc: "Boleto com a data de vencimento abaixo." },
];

const ENDPOINT = {
  boleto: "/api/backend/pagamentos/boleto",
  pix: "/api/backend/pagamentos/pix",
  universal: "/api/backend/pagamentos/universal",
};

const ORDEM = ["cliente", "valor", "titulo", "data_vencimento"];

// Datas no fuso de Brasília (toISOString usa UTC e, à noite, pulava um dia).
const diaBR = (d) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(d);
const hojeBR = () => diaBR(new Date());
const daquiASete = () => diaBR(new Date(Date.now() + 7 * 864e5));
// Teto da coluna valor_numerico numeric(10,2); título é varchar(255).
const VALOR_MAXIMO = 99999999.99;

const VAZIO = () => ({
  cliente_id: "",
  tipo: "universal",
  titulo: "",
  descricao: "",
  valor: "",
  data_vencimento: daquiASete(),
  observacoes: "",
  enviar_whatsapp: false,
  enviar_email: false,
});

export function CriarPagamentoForm() {
  const [clientes, setClientes] = useState([]);
  const [loadingClientes, setLoadingClientes] = useState(true);
  const [busca, setBusca] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [erros, setErros] = useState({});
  const [resultado, setResultado] = useState(null);
  const [formData, setFormData] = useState(VAZIO);
  const topoRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/backend/clientes");
        if (res.ok) {
          const data = await res.json();
          setClientes(data.clientes || []);
        }
      } catch {
        setError("Não foi possível carregar a lista de clientes. Recarregue a página.");
      } finally {
        setLoadingClientes(false);
      }
    })();
  }, []);

  const set = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    const chave = field === "cliente_id" ? "cliente" : field;
    setErros((p) => (p[chave] ? { ...p, [chave]: undefined } : p));
  };

  const clienteSel = clientes.find((c) => String(c.id) === String(formData.cliente_id));

  const encontrados = useMemo(() => {
    const t = busca.trim().toLowerCase();
    if (!t) return clientes.slice(0, 8);
    const dig = soDigitos(t);
    return clientes
      .filter((c) => (c.nome || "").toLowerCase().includes(t) || (dig && soDigitos(c.cpf).includes(dig)))
      .slice(0, 8);
  }, [busca, clientes]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const valor = parseMoney(formData.valor);
    const novos = {};
    if (!formData.cliente_id) novos.cliente = "Escolha para quem é a cobrança.";
    if (!(valor > 0)) novos.valor = "Informe o valor da cobrança.";
    else if (valor > VALOR_MAXIMO) novos.valor = "Valor alto demais. O máximo é R$ 99.999.999,99.";
    if (!formData.titulo.trim()) novos.titulo = "Diga em poucas palavras o que está sendo cobrado.";
    if (formData.tipo !== "pix" && !formData.data_vencimento) novos.data_vencimento = "Escolha a data de vencimento.";
    else if (formData.tipo !== "pix" && formData.data_vencimento < hojeBR()) novos.data_vencimento = "A data de vencimento não pode ser no passado.";
    if (Object.keys(novos).length) {
      setErros(novos);
      focarPrimeiroErro(novos, ORDEM);
      return;
    }

    const payload = {
      cliente_id: parseInt(formData.cliente_id, 10),
      titulo: formData.titulo.trim(),
      descricao: formData.descricao,
      valor,
      observacoes: formData.observacoes,
      enviar_whatsapp: formData.enviar_whatsapp,
      enviar_email: formData.enviar_email,
    };
    if (formData.tipo !== "pix") payload.data_vencimento = formData.data_vencimento;

    setLoading(true);
    try {
      const res = await fetch(ENDPOINT[formData.tipo], {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const bruto = String(data.error || "");
        // 400/422/502: o servidor já manda a explicação em português simples.
        if ([400, 422, 502].includes(res.status) && bruto) throw new Error(bruto);
        // Erro do Asaas da imobiliária (chave ausente/errada): explica o que fazer.
        if (/asaas/i.test(bruto)) {
          throw new Error("A conta de cobranças (Asaas) da imobiliária recusou o pedido. Peça ao administrador para conferir a chave do Asaas nas configurações da empresa.");
        }
        if (res.status === 404) throw new Error("Não achamos esse cliente. Escolha o cliente de novo.");
        throw new Error(bruto || "Não foi possível criar a cobrança.");
      }
      setResultado({
        id: data.pagamento?.id,
        link: data.asaas?.invoice_url || data.pagamento?.invoice_url || "",
        cliente: clienteSel,
        valor,
        titulo: payload.titulo,
      });
      setFormData(VAZIO());
      setBusca("");
      topoRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (err) {
      setError(err.message || "Erro de conexão. Tente de novo.");
      topoRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    } finally {
      setLoading(false);
    }
  };

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(resultado.link);
      toast.success("Link copiado. É só colar na conversa com o cliente.");
    } catch {
      toast.error("Não deu para copiar. Toque e segure no link para copiar.");
    }
  };

  const whatsappHref = useMemo(() => {
    if (!resultado?.link) return "";
    const valorTxt = resultado.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    const primeiro = (resultado.cliente?.nome || "").trim().split(" ")[0] || "";
    const nome = primeiro.charAt(0).toUpperCase() + primeiro.slice(1).toLowerCase();
    const texto = `Olá${nome ? `, ${nome}` : ""}! Segue o link para pagamento de ${resultado.titulo} (${valorTxt}): ${resultado.link}`;
    let fone = soDigitos(resultado.cliente?.telefone);
    if (fone && fone.length <= 11) fone = `55${fone}`;
    return `https://wa.me/${fone}?text=${encodeURIComponent(texto)}`;
  }, [resultado]);

  return (
    <div ref={topoRef} className="scroll-mt-6">
      <PageHeader title="Nova cobrança" subtitle="Gere um link de pagamento e mande para o cliente." />

      <div className="mx-auto max-w-2xl space-y-5">
        {resultado && (
          <FormAlert
            tom="ok"
            titulo="Cobrança criada"
            acoes={
              <>
                {resultado.link && (
                  <>
                    <button type="button" className="cx-btn cx-btn-primary" onClick={copiar}>
                      <Copy className="h-4 w-4" aria-hidden="true" /> Copiar link
                    </button>
                    <a className="cx-btn cx-btn-outline" href={whatsappHref} target="_blank" rel="noreferrer">
                      <MessageCircle className="h-4 w-4" aria-hidden="true" /> Enviar no WhatsApp
                    </a>
                  </>
                )}
                <Link className="cx-btn cx-btn-outline" href="/pagamentos/lista">Ver cobranças</Link>
              </>
            }
          >
            {resultado.link ? (
              <>
                <p>Mande este link para {resultado.cliente?.nome || "o cliente"} pagar:</p>
                <a className="crm-link-box" href={resultado.link} target="_blank" rel="noreferrer">{resultado.link}</a>
              </>
            ) : (
              <p>A cobrança foi registrada, mas o link de pagamento ainda não veio. Confira em “Ver cobranças”.</p>
            )}
          </FormAlert>
        )}

        <form onSubmit={handleSubmit} noValidate className="crm-form crm-card space-y-5">
          {error && <FormAlert titulo="Não deu para criar a cobrança">{error}</FormAlert>}

          {/* 1. Cliente — busca por nome ou CPF */}
          <div className="crm-field">
            <label htmlFor="cliente">Para quem é a cobrança? <span className="crm-field-req" aria-hidden="true">*</span></label>
            {clienteSel ? (
              <div className="crm-picked">
                <div className="min-w-0">
                  <p className="crm-picker-name truncate">{clienteSel.nome}</p>
                  <p className="crm-picker-meta">{clienteSel.cpf ? `CPF ${maskCpf(clienteSel.cpf)}` : "Sem CPF"}</p>
                </div>
                <button type="button" className="crm-link-btn" onClick={() => set("cliente_id", "")}>
                  <X className="h-4 w-4" aria-hidden="true" /> Trocar
                </button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search className="ix-icon absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cx-muted" aria-hidden="true" />
                  <input
                    id="cliente"
                    type="search"
                    autoComplete="off"
                    value={busca}
                    onChange={(e) => { setBusca(e.target.value); setErros((p) => ({ ...p, cliente: undefined })); }}
                    placeholder={loadingClientes ? "Carregando clientes…" : "Digite o nome ou o CPF"}
                    disabled={loadingClientes}
                    aria-invalid={erros.cliente ? true : undefined}
                    aria-describedby={erros.cliente ? "cliente-erro" : undefined}
                  />
                </div>
                {!loadingClientes && (
                  <div className="crm-picker" role="listbox" aria-label="Clientes encontrados">
                    {encontrados.length === 0 ? (
                      <p className="p-4 text-sm text-cx-muted">
                        Nenhum cliente com esse nome ou CPF. <Link href="/clientes/adicionar">Cadastrar cliente</Link>
                      </p>
                    ) : (
                      encontrados.map((c) => (
                        <button key={c.id} type="button" role="option" aria-selected={false} onClick={() => set("cliente_id", String(c.id))}>
                          <span className="crm-picker-name">{c.nome}</span>
                          <span className="crm-picker-meta">{c.cpf ? `CPF ${maskCpf(c.cpf)}` : "Sem CPF"}</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </>
            )}
            {erros.cliente && <p id="cliente-erro" className="crm-field-error" role="alert">{erros.cliente}</p>}
          </div>

          {/* 2. Valor e o que está sendo cobrado */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField id="valor" label="Valor" required error={erros.valor}>
              <MoneyInput grande value={formData.valor} onChange={(v) => set("valor", v)} />
            </FormField>
            <FormField id="titulo" label="O que está sendo cobrado?" required error={erros.titulo}>
              <input value={formData.titulo} onChange={(e) => set("titulo", e.target.value)} placeholder="Ex.: Taxa de avaliação" maxLength={255} />
            </FormField>
          </div>

          {/* 3. Vencimento (Pix não tem) */}
          {formData.tipo !== "pix" && (
            <FormField id="data_vencimento" label="Vence em" required error={erros.data_vencimento} hint="Já sugerimos daqui a 7 dias." className="max-w-xs">
              <input type="date" min={hojeBR()} value={formData.data_vencimento} onChange={(e) => set("data_vencimento", e.target.value)} />
            </FormField>
          )}

          {/* 4. Forma de pagamento */}
          <fieldset className="crm-field">
            <legend className="crm-field-label mb-2">Como o cliente vai pagar?</legend>
            <div className="crm-options" role="radiogroup">
              {FORMAS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  role="radio"
                  aria-checked={formData.tipo === f.value}
                  className="crm-option"
                  onClick={() => set("tipo", f.value)}
                >
                  <span className="crm-option-mark">{formData.tipo === f.value && <Check aria-hidden="true" />}</span>
                  <span>
                    <span className="crm-option-title">{f.titulo}</span>
                    <span className="crm-option-desc">{f.desc}</span>
                  </span>
                </button>
              ))}
            </div>
          </fieldset>

          <Collapsible>
            <CollapsibleTrigger className="crm-more-trigger">
              Mais detalhes (opcional)
              <ChevronDown className="h-4 w-4" aria-hidden="true" />
            </CollapsibleTrigger>
            <CollapsibleContent className="crm-more-panel space-y-4">
              <FormField id="descricao" label="Descrição" hint="Aparece para o cliente na página de pagamento.">
                <textarea rows={2} value={formData.descricao} onChange={(e) => set("descricao", e.target.value)} />
              </FormField>
              <FormField id="observacoes" label="Anotações internas" hint="Só a equipe vê.">
                <textarea rows={2} value={formData.observacoes} onChange={(e) => set("observacoes", e.target.value)} />
              </FormField>
              <div className="flex flex-wrap gap-x-6">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={formData.enviar_whatsapp} onChange={(e) => set("enviar_whatsapp", e.target.checked)} />
                  Enviar sozinho pelo WhatsApp do sistema
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={formData.enviar_email} onChange={(e) => set("enviar_email", e.target.checked)} />
                  Enviar sozinho por e-mail
                </label>
              </div>
            </CollapsibleContent>
          </Collapsible>

          <FormActions loading={loading} icon={Send} submitLabel="Criar cobrança" loadingLabel="Criando…" cancelHref="/pagamentos/lista" />
        </form>
      </div>
    </div>
  );
}
