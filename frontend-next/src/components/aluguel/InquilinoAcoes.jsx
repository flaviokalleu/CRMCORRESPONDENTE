"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Wallet, Receipt, Gauge, TrendingUp, FileSignature, Trash2, Download } from "@/components/icons";
import { FormField } from "@/components/ui/form-field";
import { MoneyInput } from "@/components/ui/money-input";
import { formatBRL } from "@/components/ui/page";
import { maskMoney, parseMoney } from "@/lib/masks";

// Ações do inquilino (tela de detalhe): pagamento manual, cobrança avulsa,
// score, reajuste e contrato. Cada bloco fala com o backend pelo proxy e
// mostra a resposta na própria caixa — nunca alerta solto.

const hojeISO = () => new Date().toISOString().slice(0, 10);
const dataBR = (iso) => (iso ? new Date(`${String(iso).slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR") : "—");

async function chamar(url, { method = "GET", body } = {}) {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const e = new Error(data?.error || "Não deu certo. Tente de novo.");
    e.campo = data?.campo;
    throw e;
  }
  return data;
}

function Bloco({ icon: Icon, title, subtitle, children }) {
  return (
    <section className="crm-form-section crm-card">
      <header className="flex items-center gap-3 border-b">
        <span className="flex shrink-0 items-center justify-center border"><Icon aria-hidden="true" /></span>
        <div>
          <h3>{title}</h3>
          {subtitle && <p>{subtitle}</p>}
        </div>
      </header>
      {children}
    </section>
  );
}

function Aviso({ msg }) {
  if (!msg?.texto) return null;
  return <p role={msg.tom === "erro" ? "alert" : "status"} className="form-aviso mt-3" data-tom={msg.tom}>{msg.texto}</p>;
}

// Hook pequeno: estado de carregando + trava contra clique duplo + aviso.
function useAcao() {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);
  const trava = useRef(false);
  const rodar = async (fn) => {
    if (trava.current) return;
    trava.current = true;
    setLoading(true);
    setMsg(null);
    try {
      await fn();
    } catch (e) {
      setMsg({ tom: "erro", texto: e.message, campo: e.campo });
    } finally {
      trava.current = false;
      setLoading(false);
    }
  };
  return { loading, msg, setMsg, rodar };
}

function Pagamentos({ inquilino }) {
  const router = useRouter();
  const [data, setData] = useState(hojeISO());
  const [valor, setValor] = useState(maskMoney(String(Math.round(Number(inquilino.valor_aluguel || 0) * 100))));
  const [forma, setForma] = useState("pix");
  const { loading, msg, setMsg, rodar } = useAcao();
  const historico = Array.isArray(inquilino.historico_pagamentos) ? [...inquilino.historico_pagamentos].reverse() : [];

  const registrar = (e) => {
    e.preventDefault();
    if (parseMoney(valor) <= 0) return setMsg({ tom: "erro", texto: "Informe o valor pago.", campo: "valor" });
    if (!data) return setMsg({ tom: "erro", texto: "Escolha a data do pagamento.", campo: "data" });
    rodar(async () => {
      await chamar(`/api/backend/clientealuguel/${inquilino.id}/pagamento`, {
        method: "POST",
        body: { data, valor: parseMoney(valor), status: "pago", forma_pagamento: forma },
      });
      setMsg({ tom: "ok", texto: "Pagamento registrado." });
      router.refresh();
    });
  };
  const apagar = (p) => {
    if (!window.confirm(`Apagar o pagamento de ${formatBRL(p.valor)} do dia ${dataBR(p.data)}?`)) return;
    rodar(async () => {
      await chamar(`/api/backend/clientealuguel/${inquilino.id}/pagamento/${p.id}`, { method: "DELETE" });
      setMsg({ tom: "ok", texto: "Pagamento apagado." });
      router.refresh();
    });
  };

  return (
    <Bloco icon={Wallet} title="Pagamentos" subtitle="Registre o que o inquilino já pagou">
      <form onSubmit={registrar} noValidate className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <FormField id="pag-data" label="Data" error={msg?.campo === "data" ? msg.texto : undefined}>
          <input type="date" value={data} max="2200-12-31" onChange={(e) => setData(e.target.value)} />
        </FormField>
        <FormField id="pag-valor" label="Valor pago" error={msg?.campo === "valor" ? msg.texto : undefined}>
          <MoneyInput value={valor} onChange={setValor} />
        </FormField>
        <FormField id="pag-forma" label="Forma">
          <select value={forma} onChange={(e) => setForma(e.target.value)}>
            <option value="pix">Pix</option>
            <option value="boleto">Boleto</option>
            <option value="dinheiro">Dinheiro</option>
            <option value="transferencia">Transferência</option>
            <option value="cartao">Cartão</option>
          </select>
        </FormField>
        <div className="sm:col-span-3">
          <button type="submit" className="cx-btn cx-btn-primary" disabled={loading}>{loading ? "Salvando…" : "Registrar pagamento"}</button>
        </div>
      </form>
      {!msg?.campo && <Aviso msg={msg} />}
      {historico.length > 0 ? (
        <ul className="mt-4 divide-y divide-cx-border" aria-label="Pagamentos registrados">
          {historico.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 py-2 text-sm">
              <span className="text-cx-text">{dataBR(p.data)} · <strong>{formatBRL(p.valor)}</strong> <span className="text-cx-muted">· {p.forma_pagamento || "—"}</span></span>
              <button type="button" className="lst-acao lst-acao-perigo" aria-label={`Apagar pagamento de ${dataBR(p.data)}`} onClick={() => apagar(p)} disabled={loading}>
                <Trash2 aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-cx-muted">Nenhum pagamento registrado ainda.</p>
      )}
    </Bloco>
  );
}

function CobrancaAvulsa({ inquilino, cobrancas }) {
  const router = useRouter();
  const [valor, setValor] = useState("");
  const [venc, setVenc] = useState(hojeISO());
  const [descricao, setDescricao] = useState("");
  const { loading, msg, setMsg, rodar } = useAcao();

  const criar = (e) => {
    e.preventDefault();
    if (parseMoney(valor) <= 0) return setMsg({ tom: "erro", texto: "Informe o valor da cobrança.", campo: "valor" });
    if (!venc) return setMsg({ tom: "erro", texto: "Escolha a data de vencimento.", campo: "data_vencimento" });
    rodar(async () => {
      await chamar(`/api/backend/clientealuguel/${inquilino.id}/cobranca-avulsa`, {
        method: "POST",
        body: { valor: parseMoney(valor), data_vencimento: venc, descricao: descricao.trim() },
      });
      setMsg({ tom: "ok", texto: "Cobrança criada." });
      setValor(""); setDescricao("");
      router.refresh();
    });
  };

  return (
    <Bloco icon={Receipt} title="Cobrança avulsa" subtitle="Conserto, multa, condomínio ou outra taxa fora do aluguel">
      <form onSubmit={criar} noValidate className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <FormField id="cob-valor" label="Valor" error={msg?.campo === "valor" ? msg.texto : undefined}>
          <MoneyInput value={valor} onChange={setValor} placeholder="150,00" />
        </FormField>
        <FormField id="cob-venc" label="Vencimento" error={msg?.campo === "data_vencimento" ? msg.texto : undefined}>
          <input type="date" value={venc} max="2200-12-31" onChange={(e) => setVenc(e.target.value)} />
        </FormField>
        <FormField id="cob-desc" label="Descrição" optional>
          <input maxLength={255} value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex.: Troca do chuveiro" />
        </FormField>
        <div className="sm:col-span-3">
          <button type="submit" className="cx-btn cx-btn-primary" disabled={loading}>{loading ? "Criando…" : "Criar cobrança"}</button>
        </div>
      </form>
      {!msg?.campo && <Aviso msg={msg} />}
      {cobrancas.length > 0 && (
        <ul className="mt-4 divide-y divide-cx-border" aria-label="Cobranças">
          {cobrancas.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
              <span className="text-cx-text">{dataBR(c.data_vencimento)} · <strong>{formatBRL(c.valor)}</strong> {c.descricao && <span className="text-cx-muted">· {c.descricao}</span>}</span>
              <span className="ass-selo ass-tom-neutro">{c.status}</span>
            </li>
          ))}
        </ul>
      )}
    </Bloco>
  );
}

function Score({ inquilino }) {
  const router = useRouter();
  const inicial = (() => { try { return typeof inquilino.score_detalhes === "string" ? JSON.parse(inquilino.score_detalhes) : inquilino.score_detalhes; } catch { return null; } })();
  const [score, setScore] = useState(inicial);
  const { loading, msg, rodar } = useAcao();
  const calcular = () => rodar(async () => {
    const d = await chamar(`/api/backend/clientealuguel/${inquilino.id}/score`, { method: "POST" });
    setScore(d);
    router.refresh();
  });
  return (
    <Bloco icon={Gauge} title="Score do inquilino" subtitle="De 0 a 100, pelo histórico de pagamentos">
      {score?.score != null ? (
        <div className="space-y-1 text-sm">
          <p className="text-2xl font-semibold text-cx-text">{score.score} <span className="text-base text-cx-muted">· {score.classificacao}</span></p>
          <p className="text-cx-text">{score.recomendacao}</p>
          <p className="text-cx-muted">{score.total_pagamentos} pagamento(s) · {score.pontuais} em dia · {score.atrasados} com atraso</p>
        </div>
      ) : (
        <p className="text-sm text-cx-muted">Ainda não calculado.</p>
      )}
      <button type="button" className="cx-btn cx-btn-outline mt-4" onClick={calcular} disabled={loading}>{loading ? "Calculando…" : "Calcular score"}</button>
      <Aviso msg={msg} />
    </Bloco>
  );
}

function Reajuste({ inquilino }) {
  const router = useRouter();
  const [indice, setIndice] = useState("");
  const [previa, setPrevia] = useState(null);
  const { loading, msg, setMsg, rodar } = useAcao();
  const num = () => Number(String(indice).replace(",", "."));
  const validar = () => {
    const n = num();
    if (indice === "" || Number.isNaN(n) || n < -50 || n > 100) {
      setMsg({ tom: "erro", texto: "Use um percentual entre -50 e 100. Exemplo: 4,5", campo: "indice" });
      return false;
    }
    return true;
  };
  const simular = () => validar() && rodar(async () => {
    setPrevia(await chamar(`/api/backend/clientealuguel/${inquilino.id}/reajuste?indice=${num()}`));
  });
  const aplicar = () => {
    if (!validar() || !previa) return;
    if (!window.confirm(`Mudar o aluguel de ${formatBRL(previa.valor_anterior)} para ${formatBRL(previa.valor_novo)}?`)) return;
    rodar(async () => {
      await chamar(`/api/backend/clientealuguel/${inquilino.id}/reajuste/aplicar`, { method: "POST", body: { indice: num() } });
      setMsg({ tom: "ok", texto: "Reajuste aplicado. O novo valor já vale para as próximas cobranças." });
      setPrevia(null); setIndice("");
      router.refresh();
    });
  };
  return (
    <Bloco icon={TrendingUp} title="Reajuste anual" subtitle={`Índice do contrato: ${inquilino.indice_reajuste || "IGPM"}`}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField id="reaj-indice" label="Percentual do índice (%)" hint="Veja o acumulado de 12 meses do índice." error={msg?.campo === "indice" ? msg.texto : undefined}>
          <input inputMode="decimal" value={indice} onChange={(e) => { setIndice(e.target.value.replace(/[^\d.,-]/g, "").slice(0, 7)); setPrevia(null); }} placeholder="Ex.: 4,5" />
        </FormField>
      </div>
      {previa && (
        <p className="mt-3 text-sm text-cx-text">
          De <strong>{formatBRL(previa.valor_anterior)}</strong> para <strong>{formatBRL(previa.valor_novo)}</strong>
          {previa.data_aniversario && <> · aniversário do contrato em {dataBR(previa.data_aniversario)}</>}
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className="cx-btn cx-btn-outline" onClick={simular} disabled={loading}>Simular</button>
        <button type="button" className="cx-btn cx-btn-primary" onClick={aplicar} disabled={loading || !previa}>Aplicar reajuste</button>
      </div>
      {!msg?.campo && <Aviso msg={msg} />}
    </Bloco>
  );
}

function Contrato({ inquilino }) {
  const [texto, setTexto] = useState("");
  const { loading, msg, setMsg, rodar } = useAcao();
  const carregar = (modelo) => rodar(async () => {
    const d = await chamar(`/api/backend/clientealuguel/${inquilino.id}/contrato/texto${modelo ? "?modelo=padrao" : ""}`);
    setTexto(d.texto_contrato || "");
  });
  // O servidor ainda não gera PDF (motor não configurado): baixa se existir,
  // senão imprime o texto pelo navegador (lá dá para "Salvar como PDF").
  const imprimir = () => {
    const w = window.open("", "_blank");
    if (!w) return setMsg({ tom: "erro", texto: "O navegador bloqueou a janela. Libere pop-ups para este site." });
    const doc = w.document;
    doc.title = `Contrato - ${inquilino.nome}`;
    const pre = doc.createElement("pre");
    pre.textContent = texto;
    pre.style.cssText = "white-space:pre-wrap;font:12pt/1.5 serif;margin:2cm";
    doc.body.appendChild(pre);
    w.focus();
    w.print();
  };
  const baixarPdf = () => rodar(async () => {
    const res = await fetch(`/api/backend/clientealuguel/${inquilino.id}/contrato`);
    if (!res.ok) {
      setMsg({ tom: "erro", texto: "Ainda não há PDF salvo deste contrato. Use “Imprimir / salvar PDF”." });
      return;
    }
    const url = URL.createObjectURL(await res.blob());
    const a = document.createElement("a");
    a.href = url;
    a.download = `contrato_${inquilino.id}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  });
  const salvar = () => {
    if (!texto.trim()) return setMsg({ tom: "erro", texto: "O texto do contrato está vazio." });
    rodar(async () => {
      const d = await chamar(`/api/backend/clientealuguel/${inquilino.id}/contrato`, { method: "POST", body: { texto_contrato: texto } });
      setMsg({ tom: "ok", texto: d?.message || "Contrato salvo." });
    });
  };
  return (
    <Bloco icon={FileSignature} title="Contrato" subtitle="Gere o texto com os dados do inquilino, ajuste e salve">
      {!texto ? (
        <button type="button" className="cx-btn cx-btn-outline" onClick={() => carregar(false)} disabled={loading}>{loading ? "Abrindo…" : "Gerar / abrir contrato"}</button>
      ) : (
        <>
          <FormField id="contrato-texto" label="Texto do contrato">
            <textarea rows={14} value={texto} onChange={(e) => setTexto(e.target.value)} />
          </FormField>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="cx-btn cx-btn-primary" onClick={salvar} disabled={loading}>{loading ? "Salvando…" : "Salvar contrato"}</button>
            <button type="button" className="cx-btn cx-btn-outline" onClick={() => carregar(true)} disabled={loading}>Voltar ao modelo padrão</button>
            <button type="button" className="cx-btn cx-btn-outline" onClick={imprimir}>Imprimir / salvar PDF</button>
            <button type="button" className="cx-btn cx-btn-outline" onClick={baixarPdf} disabled={loading}>
              <Download className="h-4 w-4" aria-hidden="true" /> Baixar PDF salvo
            </button>
          </div>
        </>
      )}
      <Aviso msg={msg} />
    </Bloco>
  );
}

export function ExcluirInquilino({ inquilino }) {
  const router = useRouter();
  const { loading, msg, rodar } = useAcao();
  const excluir = () => {
    if (!window.confirm(`Excluir ${inquilino.nome}? O histórico de pagamentos e as cobranças dele também somem. Não dá para desfazer.`)) return;
    rodar(async () => {
      const res = await fetch(`/api/backend/clientealuguel/${inquilino.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Não foi possível excluir. Tente de novo.");
      toast.success("Inquilino excluído.");
      router.push("/clientes-aluguel");
      router.refresh();
    });
  };
  return (
    <>
      <button type="button" className="cx-btn cx-btn-outline" onClick={excluir} disabled={loading}>
        <Trash2 className="h-4 w-4" aria-hidden="true" /> {loading ? "Excluindo…" : "Excluir"}
      </button>
      {msg && <Aviso msg={msg} />}
    </>
  );
}

export function InquilinoAcoes({ inquilino, cobrancas = [] }) {
  return (
    <div className="space-y-5">
      <Pagamentos inquilino={inquilino} />
      <CobrancaAvulsa inquilino={inquilino} cobrancas={cobrancas} />
      <Score inquilino={inquilino} />
      <Reajuste inquilino={inquilino} />
      <Contrato inquilino={inquilino} />
    </div>
  );
}
