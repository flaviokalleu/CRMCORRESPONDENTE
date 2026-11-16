"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UserSquare, KeyRound, Coins, ShieldCheck, Save } from "@/components/icons";
import { FormField, FormAlert, focarPrimeiroErro } from "@/components/ui/form-field";
import { MoneyInput } from "@/components/ui/money-input";
import { FormActions } from "@/components/ui/form-actions";
import { maskCpf, maskPhone, maskMoney, parseMoney, soDigitos } from "@/lib/masks";
import { cpfValido, telefoneValido, emailValido } from "@/lib/validar";

// Cadastro e edição de inquilino (POST/PUT /clientealuguel, JSON). O backend
// devolve {error, campo} quando um campo está errado; o erro aparece embaixo
// dele. Datas vão como AAAA-MM-DD (input date).

const ORDEM = [
  "nome", "cpf", "telefone", "email", "data_nascimento", "cidade_nascimento",
  "aluguel_id", "valor_aluguel", "dia_vencimento", "data_inicio_contrato", "data_fim_contrato", "indice_reajuste",
  "proprietario_id", "proprietario_telefone", "proprietario_pix", "taxa_administracao",
  "corretor_nome", "corretor_percentual", "corretor_pix",
  "fiador_nome", "fiador_cpf", "fiador_telefone", "fiador_email", "fiador_data_nascimento", "fiador_cidade_nascimento",
];

const data10 = (v) => (v ? String(v).slice(0, 10) : "");
const dinheiro = (n) => (n ? maskMoney(String(Math.round(Number(n) * 100))) : "");

function inicial(c = {}) {
  return {
    nome: c.nome ?? "",
    cpf: c.cpf ? maskCpf(c.cpf) : "",
    telefone: c.telefone ? maskPhone(c.telefone) : "",
    email: c.email ?? "",
    data_nascimento: data10(c.data_nascimento),
    cidade_nascimento: c.cidade_nascimento ?? "",
    aluguel_id: c.aluguel_id ? String(c.aluguel_id) : "",
    valor_aluguel: dinheiro(c.valor_aluguel),
    dia_vencimento: c.dia_vencimento ? String(c.dia_vencimento) : "",
    data_inicio_contrato: data10(c.data_inicio_contrato),
    data_fim_contrato: data10(c.data_fim_contrato),
    indice_reajuste: c.indice_reajuste || "IGPM",
    proprietario_id: c.proprietario_id ? String(c.proprietario_id) : "",
    proprietario_nome: c.proprietario_nome ?? "",
    proprietario_telefone: c.proprietario_telefone ? maskPhone(c.proprietario_telefone) : "",
    proprietario_pix: c.proprietario_pix ?? "",
    taxa_administracao: c.taxa_administracao != null ? String(c.taxa_administracao) : "10",
    corretor_nome: c.corretor_nome ?? "",
    corretor_percentual: c.corretor_percentual ? String(c.corretor_percentual) : "",
    corretor_pix: c.corretor_pix ?? "",
    tem_fiador: !!c.tem_fiador,
    fiador_nome: c.fiador_nome ?? "",
    fiador_cpf: c.fiador_cpf ? maskCpf(c.fiador_cpf) : "",
    fiador_telefone: c.fiador_telefone ? maskPhone(c.fiador_telefone) : "",
    fiador_email: c.fiador_email ?? "",
    fiador_data_nascimento: data10(c.fiador_data_nascimento),
    fiador_cidade_nascimento: c.fiador_cidade_nascimento ?? "",
  };
}

function Secao({ icon: Icon, title, subtitle, children }) {
  return (
    <section className="crm-form-section crm-card">
      <header className="flex items-center gap-3 border-b">
        <span className="flex shrink-0 items-center justify-center border">
          <Icon aria-hidden="true" />
        </span>
        <div>
          <h3>{title}</h3>
          {subtitle && <p>{subtitle}</p>}
        </div>
      </header>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

// Percentual: aceita "10", "10,5" ou "10.5"; devolve número ou NaN.
const pct = (v) => (String(v).trim() === "" ? 0 : Number(String(v).replace(",", ".")));

export function InquilinoForm({ mode = "create", inquilino, imoveis = [], proprietarios = [] }) {
  const router = useRouter();
  const [f, setF] = useState(() => inicial(inquilino));
  const [erros, setErros] = useState({});
  const [erroGeral, setErroGeral] = useState("");
  const [loading, setLoading] = useState(false);
  const enviando = useRef(false); // trava contra clique duplo

  const set = (k, v) => {
    setF((p) => ({ ...p, [k]: v }));
    setErros((p) => (p[k] ? { ...p, [k]: undefined } : p));
  };
  const txt = (k) => (e) => set(k, e.target.value);

  // Escolher o imóvel já traz o valor e o dia de vencimento cadastrados nele.
  const escolherImovel = (id) => {
    set("aluguel_id", id);
    const im = imoveis.find((i) => String(i.id) === id);
    if (!im) return;
    setF((p) => ({
      ...p,
      aluguel_id: id,
      valor_aluguel: p.valor_aluguel || dinheiro(im.valor_aluguel),
      dia_vencimento: p.dia_vencimento || (im.dia_vencimento ? String(im.dia_vencimento) : ""),
    }));
  };
  const escolherProprietario = (id) => {
    const p = proprietarios.find((x) => String(x.id) === id);
    setF((prev) => ({
      ...prev,
      proprietario_id: id,
      proprietario_nome: p?.name ?? "",
      proprietario_telefone: p?.phone ? maskPhone(p.phone) : prev.proprietario_telefone,
    }));
  };

  function validar() {
    const e = {};
    if (!f.nome.trim()) e.nome = "Escreva o nome do inquilino.";
    if (f.cpf && !cpfValido(f.cpf)) e.cpf = "CPF inválido. Confira os 11 números.";
    if (f.telefone && !telefoneValido(f.telefone)) e.telefone = "Escreva o telefone com DDD. Exemplo: (61) 99999-9999";
    if (f.email && !emailValido(f.email)) e.email = "Confira o e-mail. Exemplo: joao@email.com";
    if (parseMoney(f.valor_aluguel) <= 0) e.valor_aluguel = "Informe o valor do aluguel.";
    const dia = Number(f.dia_vencimento);
    if (!f.dia_vencimento || dia < 1 || dia > 31) e.dia_vencimento = "Use um dia entre 1 e 31.";
    if (f.data_inicio_contrato && f.data_fim_contrato && f.data_fim_contrato <= f.data_inicio_contrato)
      e.data_fim_contrato = "O fim precisa ser depois do início.";
    const taxa = pct(f.taxa_administracao);
    if (Number.isNaN(taxa) || taxa < 0 || taxa > 100) e.taxa_administracao = "Use de 0 a 100.";
    const com = pct(f.corretor_percentual);
    if (Number.isNaN(com) || com < 0 || com > 100) e.corretor_percentual = "Use de 0 a 100.";
    if (f.proprietario_telefone && !telefoneValido(f.proprietario_telefone)) e.proprietario_telefone = "Escreva o telefone com DDD.";
    if (f.tem_fiador) {
      if (!f.fiador_nome.trim()) e.fiador_nome = "Escreva o nome do fiador.";
      if (f.fiador_cpf && !cpfValido(f.fiador_cpf)) e.fiador_cpf = "CPF do fiador inválido.";
      if (f.fiador_telefone && !telefoneValido(f.fiador_telefone)) e.fiador_telefone = "Escreva o telefone com DDD.";
      if (f.fiador_email && !emailValido(f.fiador_email)) e.fiador_email = "Confira o e-mail do fiador.";
    }
    return e;
  }

  async function onSubmit(ev) {
    ev.preventDefault();
    if (enviando.current) return;
    setErroGeral("");
    const e = validar();
    if (Object.keys(e).length) {
      setErros(e);
      focarPrimeiroErro(e, ORDEM);
      return;
    }

    const corpo = {
      ...f,
      cpf: soDigitos(f.cpf),
      email: f.email.trim(),
      valor_aluguel: parseMoney(f.valor_aluguel),
      dia_vencimento: Number(f.dia_vencimento),
      aluguel_id: f.aluguel_id ? Number(f.aluguel_id) : null,
      proprietario_id: f.proprietario_id ? Number(f.proprietario_id) : null,
      taxa_administracao: pct(f.taxa_administracao),
      corretor_percentual: pct(f.corretor_percentual),
      fiador_cpf: f.tem_fiador ? soDigitos(f.fiador_cpf) : "",
      fiador_telefone: f.tem_fiador ? f.fiador_telefone : "",
    };
    if (!f.tem_fiador) {
      for (const k of ["fiador_nome", "fiador_email", "fiador_data_nascimento", "fiador_cidade_nascimento"]) corpo[k] = "";
    }

    enviando.current = true;
    setLoading(true);
    try {
      const url = mode === "edit" ? `/api/backend/clientealuguel/${inquilino.id}` : "/api/backend/clientealuguel";
      const res = await fetch(url, {
        method: mode === "edit" ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corpo),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        if (data?.campo && ORDEM.includes(data.campo)) {
          setErros({ [data.campo]: data.error });
          focarPrimeiroErro({ [data.campo]: data.error }, ORDEM);
          return;
        }
        throw new Error(data?.error || "Não foi possível salvar o inquilino. Tente de novo.");
      }
      toast.success(mode === "edit" ? "Inquilino atualizado." : "Inquilino cadastrado.");
      router.push(`/clientes-aluguel/${data?.id ?? inquilino?.id ?? ""}`);
      router.refresh();
    } catch (err) {
      setErroGeral(err.message);
      (document.getElementById("conteudo") || window).scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      enviando.current = false;
      setLoading(false);
    }
  }

  // Imóvel já ligado a este inquilino aparece mesmo que esteja "alugado".
  const opcoesImovel = imoveis.filter((i) => !i.alugado || String(i.id) === f.aluguel_id);

  return (
    <form onSubmit={onSubmit} noValidate className="crm-form crm-form-composed mx-auto max-w-3xl space-y-5">
      {erroGeral && <FormAlert titulo="Não deu para salvar">{erroGeral}</FormAlert>}

      <Secao icon={UserSquare} title="Inquilino" subtitle="Quem vai morar ou usar o imóvel">
        <FormField id="nome" label="Nome completo" required error={erros.nome} className="sm:col-span-2">
          <input maxLength={255} autoComplete="name" value={f.nome} onChange={txt("nome")} placeholder="Ex.: João da Silva" />
        </FormField>
        <FormField id="cpf" label="CPF" optional error={erros.cpf}>
          <input inputMode="numeric" value={f.cpf} onChange={(e) => set("cpf", maskCpf(e.target.value))} placeholder="000.000.000-00" />
        </FormField>
        <FormField id="telefone" label="Telefone (WhatsApp)" optional error={erros.telefone}>
          <input inputMode="tel" autoComplete="tel" value={f.telefone} onChange={(e) => set("telefone", maskPhone(e.target.value))} placeholder="(61) 99999-9999" />
        </FormField>
        <FormField id="email" label="E-mail" optional error={erros.email}>
          <input type="email" maxLength={255} autoComplete="email" value={f.email} onChange={txt("email")} placeholder="joao@email.com" />
        </FormField>
        <FormField id="data_nascimento" label="Data de nascimento" optional error={erros.data_nascimento}>
          <input type="date" min="1900-01-01" max="2100-12-31" value={f.data_nascimento} onChange={txt("data_nascimento")} />
        </FormField>
        <FormField id="cidade_nascimento" label="Cidade onde nasceu" optional error={erros.cidade_nascimento} className="sm:col-span-2">
          <input maxLength={255} value={f.cidade_nascimento} onChange={txt("cidade_nascimento")} placeholder="Ex.: Goiânia – GO" />
        </FormField>
      </Secao>

      <Secao icon={KeyRound} title="Locação" subtitle="Imóvel, valor e vencimento">
        <FormField id="aluguel_id" label="Imóvel alugado" optional error={erros.aluguel_id} className="sm:col-span-2"
          hint={imoveis.length ? "Ao escolher, o valor e o vencimento do imóvel são preenchidos." : "Nenhum imóvel de aluguel cadastrado ainda. Dá para ligar depois em Contratos."}>
          <select value={f.aluguel_id} onChange={(e) => escolherImovel(e.target.value)}>
            <option value="">Escolher depois</option>
            {opcoesImovel.map((i) => <option key={i.id} value={i.id}>{i.nome_imovel}</option>)}
          </select>
        </FormField>
        <FormField id="valor_aluguel" label="Valor do aluguel por mês" required error={erros.valor_aluguel}>
          <MoneyInput value={f.valor_aluguel} onChange={(v) => set("valor_aluguel", v)} placeholder="1.500,00" />
        </FormField>
        <FormField id="dia_vencimento" label="Dia do vencimento (1 a 31)" required error={erros.dia_vencimento}>
          <input inputMode="numeric" value={f.dia_vencimento} onChange={(e) => set("dia_vencimento", soDigitos(e.target.value).slice(0, 2))} placeholder="Ex.: 10" />
        </FormField>
        <FormField id="data_inicio_contrato" label="Início do contrato" optional error={erros.data_inicio_contrato}>
          <input type="date" min="1900-01-01" max="2200-12-31" value={f.data_inicio_contrato} onChange={txt("data_inicio_contrato")} />
        </FormField>
        <FormField id="data_fim_contrato" label="Fim do contrato" optional error={erros.data_fim_contrato}>
          <input type="date" min="1900-01-01" max="2200-12-31" value={f.data_fim_contrato} onChange={txt("data_fim_contrato")} />
        </FormField>
        <FormField id="indice_reajuste" label="Índice de reajuste" hint="Usado no reajuste anual do aluguel." error={erros.indice_reajuste}>
          <select value={f.indice_reajuste} onChange={txt("indice_reajuste")}>
            <option value="IGPM">IGP-M</option>
            <option value="IPCA">IPCA</option>
            <option value="INPC">INPC</option>
          </select>
        </FormField>
      </Secao>

      <Secao icon={Coins} title="Proprietário e repasse" subtitle="Para quem vai o aluguel e quanto fica com a imobiliária">
        <FormField id="proprietario_id" label="Proprietário" optional error={erros.proprietario_id} className="sm:col-span-2"
          hint={proprietarios.length ? undefined : "Cadastre o proprietário em Proprietários para escolher aqui."}>
          <select value={f.proprietario_id} onChange={(e) => escolherProprietario(e.target.value)}>
            <option value="">Escolher depois</option>
            {proprietarios.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </FormField>
        <FormField id="proprietario_telefone" label="Telefone do proprietário" optional error={erros.proprietario_telefone}>
          <input inputMode="tel" value={f.proprietario_telefone} onChange={(e) => set("proprietario_telefone", maskPhone(e.target.value))} placeholder="(61) 99999-9999" />
        </FormField>
        <FormField id="proprietario_pix" label="Pix do proprietário" optional error={erros.proprietario_pix}>
          <input maxLength={255} value={f.proprietario_pix} onChange={txt("proprietario_pix")} placeholder="CPF, e-mail, telefone ou chave" />
        </FormField>
        <FormField id="taxa_administracao" label="Taxa de administração (%)" error={erros.taxa_administracao} hint="Quanto do aluguel fica com a imobiliária.">
          <input inputMode="decimal" value={f.taxa_administracao} onChange={(e) => set("taxa_administracao", e.target.value.replace(/[^\d.,]/g, "").slice(0, 6))} placeholder="10" />
        </FormField>
        <FormField id="corretor_percentual" label="Comissão do corretor (%)" optional error={erros.corretor_percentual}>
          <input inputMode="decimal" value={f.corretor_percentual} onChange={(e) => set("corretor_percentual", e.target.value.replace(/[^\d.,]/g, "").slice(0, 6))} placeholder="0" />
        </FormField>
        <FormField id="corretor_nome" label="Corretor" optional error={erros.corretor_nome}>
          <input maxLength={255} value={f.corretor_nome} onChange={txt("corretor_nome")} placeholder="Nome do corretor" />
        </FormField>
        <FormField id="corretor_pix" label="Pix do corretor" optional error={erros.corretor_pix}>
          <input maxLength={255} value={f.corretor_pix} onChange={txt("corretor_pix")} />
        </FormField>
      </Secao>

      <Secao icon={ShieldCheck} title="Fiador" subtitle="Só se a locação tiver fiador">
        <div className="sm:col-span-2 flex items-center justify-between gap-4 rounded-xl border border-cx-border bg-cx-surface px-4 py-3">
          <p className="text-sm font-medium text-cx-text">Tem fiador</p>
          <button type="button" role="switch" aria-checked={f.tem_fiador} aria-label="Tem fiador"
            onClick={() => set("tem_fiador", !f.tem_fiador)} className="relative h-6 w-11 shrink-0 rounded-full">
            <span className="absolute h-5 w-5 rounded-full bg-white" />
          </button>
        </div>
        {f.tem_fiador && (
          <>
            <FormField id="fiador_nome" label="Nome do fiador" required error={erros.fiador_nome} className="sm:col-span-2">
              <input maxLength={255} value={f.fiador_nome} onChange={txt("fiador_nome")} />
            </FormField>
            <FormField id="fiador_cpf" label="CPF do fiador" optional error={erros.fiador_cpf}>
              <input inputMode="numeric" value={f.fiador_cpf} onChange={(e) => set("fiador_cpf", maskCpf(e.target.value))} placeholder="000.000.000-00" />
            </FormField>
            <FormField id="fiador_telefone" label="Telefone do fiador" optional error={erros.fiador_telefone}>
              <input inputMode="tel" value={f.fiador_telefone} onChange={(e) => set("fiador_telefone", maskPhone(e.target.value))} placeholder="(61) 99999-9999" />
            </FormField>
            <FormField id="fiador_email" label="E-mail do fiador" optional error={erros.fiador_email}>
              <input type="email" maxLength={255} value={f.fiador_email} onChange={txt("fiador_email")} />
            </FormField>
            <FormField id="fiador_data_nascimento" label="Nascimento do fiador" optional error={erros.fiador_data_nascimento}>
              <input type="date" min="1900-01-01" max="2100-12-31" value={f.fiador_data_nascimento} onChange={txt("fiador_data_nascimento")} />
            </FormField>
            <FormField id="fiador_cidade_nascimento" label="Cidade onde o fiador nasceu" optional error={erros.fiador_cidade_nascimento} className="sm:col-span-2">
              <input maxLength={255} value={f.fiador_cidade_nascimento} onChange={txt("fiador_cidade_nascimento")} />
            </FormField>
          </>
        )}
      </Secao>

      <FormActions loading={loading} icon={Save} submitLabel={mode === "edit" ? "Salvar alterações" : "Cadastrar inquilino"}
        cancelHref={mode === "edit" ? `/clientes-aluguel/${inquilino.id}` : "/clientes-aluguel"} />
    </form>
  );
}
