"use client";

import { useState } from "react";
import { Loader2, Info, User, Mail, Phone, Calendar, Fingerprint } from "lucide-react";

const onlyDigits = (s) => (s || "").toString().replace(/\D/g, "");

// Mesma máscara de CPF de ClientesLista.jsx — mantida idêntica de propósito,
// não reinventada.
const maskCPF = (v) =>
  onlyDigits(v).slice(0, 11)
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");

// Mesma máscara de telefone de ClienteForm.jsx.
const maskPhone = (v) => {
  const d = onlyDigits(v).slice(0, 11);
  if (d.length <= 10) return d.replace(/^(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d)/, "$1-$2");
  return d.replace(/^(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
};

const PAPEL_LABEL = { comprador: "comprador", inquilino: "inquilino", proprietario: "proprietário(a)" };

function labelPapeis(papeis) {
  const ativos = ["comprador", "inquilino", "proprietario"].filter((p) => papeis?.[p]).map((p) => PAPEL_LABEL[p]);
  if (ativos.length === 0) return "nenhum papel";
  if (ativos.length === 1) return ativos[0];
  return `${ativos.slice(0, -1).join(", ")} e ${ativos[ativos.length - 1]}`;
}

const fieldCls =
  "w-full rounded-lg border border-cx-border bg-cx-surface px-3 py-2.5 text-sm text-cx-text placeholder-[#9aa6b4] outline-none transition-colors focus:border-cx-blue focus:ring-2 focus:ring-cx-blue/20";

function Campo({ label, icon: Icon, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-cx-muted">
        {Icon && <Icon className="h-3.5 w-3.5" />} {label}
      </span>
      {children}
    </label>
  );
}

// Etapa de identidade, comum aos três papéis. Ao sair do campo CPF, verifica
// se já existe pessoa com esse CPF (GET /pessoas/buscar) — resposta `null`
// é o caminho normal de "pessoa nova", não erro. Quando encontra, preenche
// nome/e-mail/telefone/nascimento e avisa que salvar vai ADICIONAR o papel
// escolhido a essa mesma pessoa, em vez de duplicar o cadastro.
export function EtapaIdentidade({ dados, onChange, papel, pessoaEncontrada, onPessoaEncontrada }) {
  const [buscando, setBuscando] = useState(false);
  const [erroBusca, setErroBusca] = useState("");

  async function handleCpfBlur() {
    const digits = onlyDigits(dados.cpf);
    setErroBusca("");
    // CPF incompleto ou vazio: não é erro (lead sem CPF é legítimo), só não
    // dá pra buscar — segue sem disparar a checagem.
    if (digits.length !== 11) {
      onPessoaEncontrada(null);
      return;
    }
    setBuscando(true);
    try {
      const res = await fetch(`/api/backend/pessoas/buscar?cpf=${digits}`, { cache: "no-store" });
      if (!res.ok) throw new Error();
      const pessoa = await res.json().catch(() => null);
      if (pessoa && pessoa.id) {
        onPessoaEncontrada(pessoa);
        onChange({
          nome: pessoa.nome || "",
          email: pessoa.email || "",
          telefone: pessoa.telefone ? maskPhone(pessoa.telefone) : "",
          data_nascimento: pessoa.data_nascimento ? pessoa.data_nascimento.slice(0, 10) : "",
        });
      } else {
        onPessoaEncontrada(null);
      }
    } catch {
      // Falha de rede não deve deixar um aviso de "pessoa encontrada" de uma
      // busca anterior grudado num CPF que não foi de fato verificado.
      onPessoaEncontrada(null);
      setErroBusca("Não foi possível verificar o CPF agora. Você pode continuar preenchendo normalmente.");
    } finally {
      setBuscando(false);
    }
  }

  const jaTemEssePapel = Boolean(pessoaEncontrada?.papeis?.[papel]);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo label="Nome completo *" icon={User}>
          <input
            className={fieldCls}
            value={dados.nome}
            onChange={(e) => onChange({ nome: e.target.value })}
            placeholder="Nome completo"
          />
        </Campo>
        <Campo label="CPF" icon={Fingerprint}>
          <div className="relative">
            <input
              className={fieldCls}
              value={maskCPF(dados.cpf)}
              onChange={(e) => onChange({ cpf: onlyDigits(e.target.value).slice(0, 11) })}
              onBlur={handleCpfBlur}
              placeholder="000.000.000-00"
              inputMode="numeric"
            />
            {buscando && (
              <Loader2 className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-cx-muted" />
            )}
          </div>
        </Campo>
        <Campo label="E-mail" icon={Mail}>
          <input
            type="email"
            className={fieldCls}
            value={dados.email}
            onChange={(e) => onChange({ email: e.target.value })}
            placeholder="email@exemplo.com"
          />
        </Campo>
        <Campo label="Telefone" icon={Phone}>
          <input
            className={fieldCls}
            value={dados.telefone}
            onChange={(e) => onChange({ telefone: maskPhone(e.target.value) })}
            placeholder="(00) 00000-0000"
          />
        </Campo>
        <Campo label="Data de nascimento" icon={Calendar}>
          <input
            type="date"
            className={fieldCls}
            value={dados.data_nascimento}
            onChange={(e) => onChange({ data_nascimento: e.target.value })}
          />
        </Campo>
      </div>

      {erroBusca && <p className="text-xs text-amber-700">{erroBusca}</p>}

      {pessoaEncontrada && (
        <div className="flex gap-2 rounded-lg border border-cx-blue/30 bg-cx-blue/5 px-4 py-3 text-sm text-cx-text">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-cx-blue" />
          <p>
            <strong>{pessoaEncontrada.nome}</strong> já está cadastrado(a) como{" "}
            <strong>{labelPapeis(pessoaEncontrada.papeis)}</strong>. Os dados foram preenchidos automaticamente.{" "}
            {jaTemEssePapel
              ? `Essa pessoa já é ${PAPEL_LABEL[papel]}.`
              : `Ao salvar, o papel de ${PAPEL_LABEL[papel]} será adicionado a essa mesma pessoa, em vez de criar um cadastro novo.`}
          </p>
        </div>
      )}
    </div>
  );
}
