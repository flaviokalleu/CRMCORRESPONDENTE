"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Home, KeyRound, UserSquare, ArrowLeft, ArrowRight, CheckCircle2, AlertTriangle,
} from "lucide-react";
import { EtapaIdentidade } from "./EtapaIdentidade";

const onlyDigits = (s) => (s || "").toString().replace(/\D/g, "");

const DADOS_INICIAIS = { nome: "", cpf: "", email: "", telefone: "", data_nascimento: "" };

const PAPEL_LABEL = { comprador: "comprador", inquilino: "inquilino", proprietario: "proprietário(a)" };

// Passo 0: só a escolha do papel — nenhum campo aparece antes disso, essa é
// a simplificação central da tela (hoje é preciso saber de antemão qual das
// três telas antigas abrir; aqui a pessoa escolhe o papel primeiro).
const PAPEL_CARDS = [
  { value: "comprador", label: "Comprador", desc: "Vai comprar um imóvel — inicia o dossiê de financiamento.", icon: Home },
  { value: "inquilino", label: "Inquilino", desc: "Vai alugar um imóvel — inicia o cadastro de locação.", icon: KeyRound },
  { value: "proprietario", label: "Proprietário", desc: "Dono de imóvel para venda ou aluguel — inicia o repasse.", icon: UserSquare },
];

// Etapas de cada papel, só para orientar visualmente onde a Identidade se
// encaixa no fluxo completo. As etapas depois de Identidade não são
// construídas aqui de propósito (ver ruling do Task 8) — elas continuam
// vivendo nas telas/formulários que já existem e funcionam hoje; essa tela
// só cria a pessoa e a ficha mínima, então redireciona.
const ETAPAS_POR_PAPEL = {
  comprador: ["Identidade", "Renda e trabalho", "Cônjuge", "Fiador", "Documentos e formulários Caixa"],
  inquilino: ["Identidade", "Contrato e valores", "Fiador", "Documentos"],
  proprietario: ["Identidade", "Dados de repasse"],
};

// Para onde mandar a pessoa depois de salvar, para completar a ficha na tela
// que já existe hoje para aquele papel:
//   - comprador    -> direto em /editar-cliente/<ficha_id> (ClienteForm.jsx
//     completo, mode="edit"). `ficha_id` vem na resposta de POST /pessoas
//     (backend-go/internal/modules/pessoas: PessoaComPapeis.FichaID) — o id
//     da ficha de clientes criada na mesma transação. Se por algum motivo a
//     resposta não trouxer (ex.: contrato mudar sem o frontend acompanhar),
//     cai de volta na lista com busca em vez de gerar um link quebrado.
//   - inquilino    -> /clientes-aluguel: hoje é só uma lista (não existe
//     formulário de inquilino nesse frontend ainda), então é o melhor
//     destino disponível. Gap pré-existente, fora do escopo desta tarefa.
//   - proprietario -> /proprietarios/lista: tem o cadastro rápido, mas não
//     tem edição por id nem busca — mesma limitação do inquilino, mesmo gap.
const DESTINO_POR_PAPEL = {
  comprador: {
    href: (resultado, busca) =>
      resultado?.ficha_id
        ? `/editar-cliente/${resultado.ficha_id}`
        : `/clientes/lista${busca ? `?search=${encodeURIComponent(busca)}` : ""}`,
    label: (resultado) => (resultado?.ficha_id ? "Abrir a ficha do cliente" : "Ir para a lista de clientes"),
    resta: "renda e trabalho, cônjuge, fiador e os formulários Caixa",
  },
  inquilino: {
    href: () => "/clientes-aluguel",
    label: () => "Ir para clientes de aluguel",
    resta: "contrato e valores, fiador e documentos",
  },
  proprietario: {
    href: () => "/proprietarios/lista",
    label: () => "Ir para proprietários",
    resta: "os dados de repasse",
  },
};

function Progresso({ papel }) {
  const etapas = ETAPAS_POR_PAPEL[papel];
  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
        {etapas.map((nome, i) => (
          <div key={nome} className="flex items-center gap-2">
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                i === 0 ? "bg-cx-orange text-white" : "border border-cx-border text-cx-muted"
              }`}
            >
              {i + 1}
            </span>
            <span className={`text-xs whitespace-nowrap ${i === 0 ? "font-semibold text-cx-text" : "text-cx-muted"}`}>
              {nome}
            </span>
            {i < etapas.length - 1 && <span className="h-px w-4 bg-cx-border" aria-hidden="true" />}
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-cx-muted">
        Só a identidade é preenchida aqui. As demais etapas continuam na ficha, depois de salvar.
      </p>
    </div>
  );
}

export function PessoaWizard() {
  const [fase, setFase] = useState("papel"); // papel | identidade | sucesso | conflito
  const [papel, setPapel] = useState("");
  const [dados, setDados] = useState(DADOS_INICIAIS);
  const [pessoaEncontrada, setPessoaEncontrada] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [resultado, setResultado] = useState(null);

  const handleChange = (patch) => setDados((prev) => ({ ...prev, ...patch }));

  const handleEscolherPapel = (value) => {
    setPapel(value);
    setErro("");
    setFase("identidade");
  };

  const handleReiniciar = () => {
    setFase("papel");
    setPapel("");
    setDados(DADOS_INICIAIS);
    setPessoaEncontrada(null);
    setErro("");
    setResultado(null);
  };

  async function handleSalvar(e) {
    e.preventDefault();
    const nome = dados.nome.trim();
    if (!nome) {
      setErro("Informe o nome da pessoa.");
      return;
    }
    setErro("");
    setSalvando(true);
    try {
      const res = await fetch("/api/backend/pessoas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          papel,
          nome,
          cpf: onlyDigits(dados.cpf),
          email: dados.email.trim(),
          telefone: dados.telefone.trim(),
          data_nascimento: dados.data_nascimento,
        }),
      });

      if (res.status === 201) {
        const data = await res.json().catch(() => null);
        setResultado(data);
        setFase("sucesso");
        return;
      }
      if (res.status === 409) {
        setFase("conflito");
        return;
      }
      const data = await res.json().catch(() => null);
      setErro(data?.error || "Não foi possível salvar. Confira os dados e tente novamente.");
    } catch {
      setErro("Não foi possível salvar. Verifique sua conexão e tente novamente.");
    } finally {
      setSalvando(false);
    }
  }

  if (fase === "papel") {
    return (
      <div className="grid gap-4 sm:grid-cols-3">
        {PAPEL_CARDS.map(({ value, label, desc, icon: Icon }) => (
          <button
            key={value}
            type="button"
            onClick={() => handleEscolherPapel(value)}
            className="flex flex-col items-start gap-3 rounded-2xl border border-cx-border bg-cx-surface p-5 text-left transition-colors hover:border-cx-blue hover:bg-cx-blue/5"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-cx-border bg-cx-surface text-cx-blue">
              <Icon className="h-5 w-5" />
            </span>
            <span className="text-base font-semibold text-cx-text">{label}</span>
            <span className="text-sm text-cx-muted">{desc}</span>
          </button>
        ))}
      </div>
    );
  }

  if (fase === "sucesso") {
    const destino = DESTINO_POR_PAPEL[papel];
    const buscaQuery = onlyDigits(resultado?.cpf) || resultado?.nome || "";
    const outrosPapeis = Object.values(resultado?.papeis || {}).filter(Boolean).length > 1;

    return (
      <div className="space-y-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
        <div className="flex items-center gap-2 text-emerald-800">
          <CheckCircle2 className="h-5 w-5" />
          <h2 className="text-base font-semibold">
            {outrosPapeis ? `Papel de ${PAPEL_LABEL[papel]} adicionado` : "Pessoa cadastrada"}
          </h2>
        </div>
        <p className="text-sm text-emerald-900">
          {outrosPapeis
            ? `${resultado?.nome} já existia no sistema e agora também é ${PAPEL_LABEL[papel]}.`
            : `${resultado?.nome} foi cadastrado(a) como ${PAPEL_LABEL[papel]}.`}{" "}
          Falta completar {destino.resta} — isso é feito na ficha, não aqui.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href={destino.href(resultado, buscaQuery)}
            className="inline-flex items-center gap-2 rounded-lg bg-cx-orange px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-cx-orange-dark"
          >
            {destino.label(resultado)} <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href={`/pessoas?busca=${encodeURIComponent(buscaQuery)}`}
            className="inline-flex items-center gap-2 rounded-lg border border-cx-border px-4 py-2.5 text-sm font-semibold text-cx-text transition-colors hover:border-cx-blue"
          >
            Ver em Pessoas
          </Link>
          <button
            type="button"
            onClick={handleReiniciar}
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-cx-muted transition-colors hover:text-cx-text"
          >
            Cadastrar outra pessoa
          </button>
        </div>
      </div>
    );
  }

  if (fase === "conflito") {
    const buscaQuery = onlyDigits(dados.cpf) || dados.nome || "";
    return (
      <div className="space-y-4 rounded-2xl border border-amber-200 bg-amber-50 p-6">
        <div className="flex items-center gap-2 text-amber-800">
          <AlertTriangle className="h-5 w-5" />
          <h2 className="text-base font-semibold">Essa pessoa já tem esse papel</h2>
        </div>
        <p className="text-sm text-amber-900">
          {pessoaEncontrada?.nome || dados.nome} já está cadastrado(a) como {PAPEL_LABEL[papel]}. Não é possível
          adicionar o mesmo papel de novo — abra a ficha existente em vez de criar uma duplicada.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href={`/pessoas?busca=${encodeURIComponent(buscaQuery)}`}
            className="inline-flex items-center gap-2 rounded-lg bg-cx-orange px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-cx-orange-dark"
          >
            Ver ficha existente <ArrowRight className="h-4 w-4" />
          </Link>
          <button
            type="button"
            onClick={() => setFase("identidade")}
            className="inline-flex items-center gap-2 rounded-lg border border-cx-border px-4 py-2.5 text-sm font-semibold text-cx-text transition-colors hover:border-cx-blue"
          >
            <ArrowLeft className="h-4 w-4" /> Voltar
          </button>
        </div>
      </div>
    );
  }

  // fase === "identidade"
  return (
    <form onSubmit={handleSalvar} className="space-y-5 rounded-2xl border border-cx-border bg-cx-surface p-5">
      <Progresso papel={papel} />

      <EtapaIdentidade
        dados={dados}
        onChange={handleChange}
        papel={papel}
        pessoaEncontrada={pessoaEncontrada}
        onPessoaEncontrada={setPessoaEncontrada}
      />

      {erro && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{erro}</div>}

      <div className="flex items-center justify-between border-t border-cx-border pt-4">
        <button
          type="button"
          onClick={() => setFase("papel")}
          disabled={salvando}
          className="inline-flex items-center gap-2 rounded-lg border border-cx-border px-4 py-2.5 text-sm font-semibold text-cx-text transition-colors hover:border-cx-blue disabled:opacity-50"
        >
          <ArrowLeft className="h-4 w-4" /> Trocar papel
        </button>
        <button
          type="submit"
          disabled={salvando}
          className="inline-flex items-center gap-2 rounded-lg bg-cx-orange px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-cx-orange-dark disabled:opacity-50"
        >
          {salvando ? "Salvando…" : "Salvar"}
        </button>
      </div>
    </form>
  );
}
