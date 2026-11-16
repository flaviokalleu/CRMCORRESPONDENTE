"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { situacaoEmTexto, brl, dataDaFatura, STATUS_FATURA, FORMA } from "./formatos";

async function chamar(caminho, corpo) {
  const res = await fetch(`/api/backend${caminho}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(corpo || {}),
  });
  const dados = await res.json().catch(() => ({}));
  return { ok: res.ok, dados };
}

// Tela "Minha assinatura". Ordem pensada para quem só quer resolver:
// 1) situação + UMA ação principal (pagar); 2) plano; 3) histórico.
// Nome em português dos recursos que o cadeado do menu pode pedir.
const NOME_RECURSO = { has_whatsapp: "o WhatsApp", has_pagamentos: "as cobranças online", has_relatorios_avancados: "os relatórios avançados" };

export function MinhaAssinatura({ resumo, faturas, planos, recurso }) {
  const t = situacaoEmTexto(resumo.acesso);
  const fatura = resumo.fatura_aberta;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1>Minha assinatura</h1>
        <p>Veja a situação da sua empresa, pague a mensalidade e mude de plano.</p>
      </div>

      <section className={`crm-card ass-destaque ass-tom-${t.tom} p-6 sm:p-8`}>
        <span className="ass-selo">{t.selo}</span>
        <h2 className="mt-3 text-2xl">{t.titulo}</h2>
        <p className="mt-1 text-base text-cx-muted">{t.detalhe}</p>

        {fatura && (
          <Pagamento fatura={fatura} resumo={resumo} />
        )}
      </section>

      <Plano resumo={resumo} planos={planos} recurso={recurso} />

      <Historico faturas={faturas} />
    </div>
  );
}

function Pagamento({ fatura, resumo }) {
  const [carregando, setCarregando] = useState(false);
  const [pedeDocumento, setPedeDocumento] = useState(false);
  const [documento, setDocumento] = useState("");
  const [erro, setErro] = useState("");

  if (!resumo.pode_gerenciar) {
    return (
      <p className="mt-6 text-base font-semibold text-cx-text">
        Só o administrador da empresa pode pagar. Avise-o para não perder o acesso.
      </p>
    );
  }

  async function pagar(e) {
    e?.preventDefault();
    setErro("");
    setCarregando(true);
    const { ok, dados } = await chamar(`/assinatura/faturas/${fatura.id}/pagar`, documento ? { documento } : {});
    setCarregando(false);
    if (ok && dados.link) {
      window.location.href = dados.link;
      return;
    }
    if (dados.code === "PRECISA_DOCUMENTO") {
      setPedeDocumento(true);
      return;
    }
    setErro(dados.error || "Não foi possível abrir o pagamento. Tente de novo.");
  }

  return (
    <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-sm text-cx-muted">{fatura.descricao}</p>
        <p className="ass-valor mt-1">{brl(fatura.valor)}</p>
        <p className="mt-1 text-sm text-cx-muted">Vence em {dataDaFatura(fatura.vencimento)} · Pix, boleto ou cartão</p>
      </div>

      <form onSubmit={pagar} className="flex w-full flex-col gap-2 sm:w-auto">
        {pedeDocumento && (
          <label className="text-sm font-semibold text-cx-text">
            CPF ou CNPJ de quem paga
            <input
              autoFocus
              inputMode="numeric"
              value={documento}
              onChange={(e) => setDocumento(e.target.value)}
              placeholder="Só os números"
              maxLength={18}
              className="cx-input mt-1 h-12 w-full text-base"
            />
          </label>
        )}
        <Button type="submit" size="lg" disabled={carregando || (pedeDocumento && documento.replace(/\D/g, "").length < 11)}>
          {carregando ? "Abrindo pagamento…" : pedeDocumento ? "Continuar para o pagamento" : "Pagar agora"}
        </Button>
        {erro && <p role="alert" className="text-sm font-semibold text-destructive">{erro}</p>}
      </form>
    </div>
  );
}

function Plano({ resumo, planos, recurso }) {
  const router = useRouter();
  const nomeRecurso = recurso && NOME_RECURSO[recurso];
  const comRecurso = nomeRecurso ? planos.filter((p) => p[recurso]).map((p) => p.nome) : [];
  const [aberto, setAberto] = useState(Boolean(nomeRecurso && resumo.pode_gerenciar));
  const [salvando, setSalvando] = useState(null);
  const [aviso, setAviso] = useState("");
  const atual = resumo.plano;
  const agendado = resumo.plano_agendado;

  async function escolher(plano) {
    setSalvando(plano.id);
    setAviso("");
    const { ok, dados } = await chamar("/assinatura/trocar-plano", { plan_id: plano.id });
    setSalvando(null);
    setAviso(ok ? dados.mensagem : dados.error || "Não foi possível trocar o plano.");
    if (ok) {
      setAberto(false);
      router.refresh();
    }
  }

  return (
    <section className="crm-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-cx-muted">Seu plano</p>
          <p className="text-xl font-bold text-cx-text">{atual?.nome || "—"}</p>
          <p className="text-sm text-cx-muted">
            {brl(resumo.mensalidade)} por {resumo.ciclo === "anual" ? "ano" : "mês"}
          </p>
          {agendado && (
            <p className="mt-1 text-sm font-semibold text-cx-text">
              Muda para {agendado.nome} na próxima renovação.
            </p>
          )}
        </div>
        {resumo.pode_gerenciar && planos.length > 1 && (
          <Button variant="outline" onClick={() => setAberto((v) => !v)} aria-expanded={aberto}>
            {aberto ? "Fechar" : "Mudar de plano"}
          </Button>
        )}
      </div>

      {nomeRecurso && (
        <p role="note" className="ass-aviso-recurso mt-4">
          O plano {atual?.nome || "atual"} não inclui {nomeRecurso}.
          {comRecurso.length ? ` Está incluído no ${comRecurso.join(" e no ")}.` : ""}
          {resumo.pode_gerenciar ? "" : " Peça ao administrador da empresa para mudar de plano."}
        </p>
      )}

      <Uso limites={resumo.limites} />

      {aviso && <p role="status" className="mt-4 text-sm font-semibold text-cx-text">{aviso}</p>}

      {aberto && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {planos.slice(0, 3).map((p) => {
            const eAtual = p.id === atual?.id && !agendado;
            return (
              <div key={p.id} className="ass-plano crm-card flex flex-col p-5" data-atual={eAtual}>
                <p className="text-lg font-bold text-cx-text">{p.nome}</p>
                <p className="mt-1 text-2xl font-extrabold text-cx-text">
                  {brl(p.preco_mensal)}<span className="text-sm font-medium text-cx-muted">/mês</span>
                </p>
                {p.descricao && <p className="mt-2 flex-1 text-sm text-cx-muted">{p.descricao}</p>}
                <Button
                  className="mt-4"
                  variant={eAtual ? "outline" : "default"}
                  disabled={eAtual || salvando != null}
                  onClick={() => escolher(p)}
                >
                  {eAtual ? "Plano atual" : salvando === p.id ? "Trocando…" : "Escolher este"}
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function Historico({ faturas }) {
  if (!faturas.length) return null;
  return (
    <section className="crm-card p-6">
      <h2 className="text-lg">Faturas</h2>
      <ul className="mt-4 divide-y divide-[var(--border)]">
        {faturas.map((f) => {
          const s = STATUS_FATURA[f.status] || STATUS_FATURA.cancelada;
          return (
            <li key={f.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div>
                <p className="font-semibold text-cx-text">{brl(f.valor)}</p>
                <p className="text-sm text-cx-muted">
                  Vencimento {dataDaFatura(f.vencimento)}
                  {f.forma_pagamento ? ` · ${FORMA[f.forma_pagamento] || f.forma_pagamento}` : ""}
                </p>
              </div>
              <span className={`ass-selo ass-tom-${s.tom}`}>{s.texto}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

const NOME_LIMITE = { clientes: "Clientes", imoveis: "Imóveis", alugueis: "Aluguéis", usuarios: "Usuários" };

// Uso do plano: barra simples, âmbar a partir de 80%, vermelho no limite.
function Uso({ limites }) {
  if (!limites) return null;
  const itens = ["clientes", "imoveis", "alugueis", "usuarios"].filter((k) => limites[k]);
  return (
    <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {itens.map((k) => {
        const { limite, atual } = limites[k];
        const ilimitado = !limite;
        const pct = ilimitado ? 0 : Math.min(100, Math.round((atual / limite) * 100));
        const tom = pct >= 100 ? "perigo" : pct >= 80 ? "alerta" : "ok";
        return (
          <div key={k}>
            <dt className="text-sm text-cx-muted">{NOME_LIMITE[k]}</dt>
            <dd className="text-base font-semibold text-cx-text">
              {ilimitado ? `${atual} · sem limite` : `${atual} de ${limite}`}
            </dd>
            {!ilimitado && (
              <div className={`ass-barra ass-tom-${tom}`} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${NOME_LIMITE[k]}: ${pct}% do limite`}>
                <span style={{ width: `${pct}%` }} />
              </div>
            )}
          </div>
        );
      })}
    </dl>
  );
}
