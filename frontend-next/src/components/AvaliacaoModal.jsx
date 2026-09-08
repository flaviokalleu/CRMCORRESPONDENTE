"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  CAMPOS_POR_RESULTADO, RESULTADO_LABEL, parcelaConsiderada, percentualDaRenda, formatarPercentual,
} from "@/lib/avaliacao";

// Dinheiro é guardado como string de dígitos de centavo, igual ao ClienteDrawer:
// a máscara pt-BR é derivada na exibição e o número real sai da divisão por 100.
const onlyDigits = (v) => (v || "").toString().replace(/\D/g, "");
const centavosToBRL = (digits) =>
  digits
    ? (Number(digits) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : "";
const paraNumero = (digits) => (digits ? Number(digits) / 100 : null);
const numeroParaCentavos = (n) =>
  n === null || n === undefined || n === "" ? "" : String(Math.round(Number(n) * 100));

// valor_renda do cadastro é VARCHAR pt-BR ("2.000,00").
const rendaCadastroEmCentavos = (valorRenda) => {
  if (!valorRenda) return "";
  const n = Number(String(valorRenda).replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? String(Math.round(n * 100)) : "";
};

const TIPOS_DINHEIRO = new Set(["dinheiro"]);

// resposta_siric é a única prop "datahora": o servidor guarda e devolve um
// instante em UTC (ISO com "Z"), mas o <input type="datetime-local"> não
// carrega fuso nenhum — o texto que ele mostra e aceita é sempre hora de
// PAREDE local, nunca UTC. Por isso não dá para simplesmente cortar a string
// ISO com slice(0, 16): isso exibiria a hora UTC como se já fosse local, e ao
// salvar de volta esse mesmo texto seria reinterpretado como local e
// deslocado pelo fuso outra vez — cada ciclo de edição empurraria o horário
// adiante pelo offset do navegador (e viraria a data perto da meia-noite).
const pad2 = (n) => String(n).padStart(2, "0");

// UTC (ISO devolvido pelo servidor) -> hora local no formato do datetime-local.
const utcIsoParaDatetimeLocal = (isoUtc) => {
  if (!isoUtc) return "";
  const d = new Date(isoUtc);
  if (Number.isNaN(d.getTime())) return "";
  // getFullYear/getMonth/getDate/getHours/getMinutes leem os componentes na
  // hora LOCAL do ambiente (navegador do corretor), que é exatamente o que o
  // datetime-local espera.
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
};

// Hora local do datetime-local -> instante UTC (ISO) para enviar ao servidor.
const datetimeLocalParaUtcIso = (local) => {
  if (!local) return null;
  const [dataParte, horaParte] = local.split("T");
  const [ano, mes, dia] = dataParte.split("-").map(Number);
  const [hora, minuto] = (horaParte || "00:00").split(":").map(Number);
  // Construindo o Date a partir dos componentes separados (em vez de parsear
  // a string), os valores são sempre interpretados como hora LOCAL — a mesma
  // convenção do input — e o Date resultante já carrega o instante UTC
  // correto por dentro; toISOString() só formata para o que o servidor espera.
  return new Date(ano, mes - 1, dia, hora, minuto).toISOString();
};

export default function AvaliacaoModal({
  clienteId, clienteNome, valorRenda, resultado, avaliacao, aberto, onFechar, onSalvo,
}) {
  const router = useRouter();
  // Memoizado: `CAMPOS_POR_RESULTADO[resultado] || []` cria um array novo a
  // cada render, e ele está na dependência do efeito de seed abaixo — sem
  // memo, o efeito reroda para sempre e o setForm entra em loop.
  const campos = useMemo(() => CAMPOS_POR_RESULTADO[resultado] || [], [resultado]);
  const pedeRenda = resultado === "aprovada" || resultado === "condicionada";

  const [form, setForm] = useState({});
  const [renda, setRenda] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  const rendaCadastro = rendaCadastroEmCentavos(valorRenda);

  useEffect(() => {
    if (!aberto) return;
    const inicial = {};
    for (const campo of campos) {
      const bruto = avaliacao?.[campo.nome];
      if (bruto === null || bruto === undefined) { inicial[campo.nome] = ""; continue; }
      if (TIPOS_DINHEIRO.has(campo.tipo)) inicial[campo.nome] = numeroParaCentavos(bruto);
      else if (campo.tipo === "data") inicial[campo.nome] = String(bruto).slice(0, 10);
      else if (campo.tipo === "datahora") inicial[campo.nome] = utcIsoParaDatetimeLocal(bruto);
      else inicial[campo.nome] = String(bruto);
    }
    setForm(inicial);
    setRenda(
      avaliacao?.renda_utilizada != null ? numeroParaCentavos(avaliacao.renda_utilizada) : rendaCadastro
    );
    setErro("");
  }, [aberto, avaliacao, resultado, rendaCadastro, campos]);

  const parcela = useMemo(() => {
    const base = { resultado };
    if (resultado === "aprovada") base.prestacao = paraNumero(form.prestacao);
    if (resultado === "condicionada") base.valor_prestacao_possivel = paraNumero(form.valor_prestacao_possivel);
    return parcelaConsiderada(base);
  }, [form, resultado]);

  const pct = useMemo(
    () => (pedeRenda ? percentualDaRenda(paraNumero(renda), parcela) : null),
    [pedeRenda, renda, parcela]
  );
  const divergente = !!rendaCadastro && !!renda && renda !== rendaCadastro;

  const setCampo = (nome, valor) => setForm((f) => ({ ...f, [nome]: valor }));

  const montarCorpo = () => {
    const corpo = { resultado };
    for (const campo of campos) {
      const v = form[campo.nome];
      if (v === "" || v === undefined) continue;
      if (TIPOS_DINHEIRO.has(campo.tipo)) corpo[campo.nome] = paraNumero(v);
      else if (campo.tipo === "inteiro") corpo[campo.nome] = Number(v);
      else if (campo.tipo === "data") corpo[campo.nome] = new Date(`${v}T00:00:00`).toISOString();
      else if (campo.tipo === "datahora") corpo[campo.nome] = datetimeLocalParaUtcIso(v);
      else corpo[campo.nome] = v;
    }
    // Obrigatórios sempre viajam como string, mesmo vazios: quem recusa é o
    // servidor, com a mensagem certa.
    corpo.codigo_proposta = form.codigo_proposta || "";
    corpo.codigo_avaliacao = form.codigo_avaliacao || "";
    if (pedeRenda) corpo.renda_utilizada = paraNumero(renda);
    return corpo;
  };

  const salvar = async (navegar) => {
    setErro("");
    setSalvando(true);
    try {
      const editando = !!avaliacao?.id;
      const url = editando
        ? `/api/backend/clientes/${clienteId}/avaliacoes/${avaliacao.id}`
        : `/api/backend/clientes/${clienteId}/avaliacoes`;
      const res = await fetch(url, {
        method: editando ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(montarCorpo()),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Não foi possível salvar a avaliação");
      onSalvo?.(data?.avaliacao);
      onFechar?.();
      if (navegar) router.push(`/clientes/${clienteId}/aprovacao`);
    } catch (e) {
      setErro(e.message);
    } finally {
      setSalvando(false);
    }
  };

  if (!resultado) return null;

  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && !salvando && onFechar?.()}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Avaliação {RESULTADO_LABEL[resultado]}</DialogTitle>
          <DialogDescription>
            Os dados da tela do SIOPI de {clienteNome || "este cliente"}.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          {campos.map((campo) => (
            <div key={campo.nome} className={campo.tipo === "area" ? "sm:col-span-2" : ""}>
              <label className="mb-1 block text-[11px] font-medium text-cx-muted" htmlFor={`av-${campo.nome}`}>
                {campo.label}
              </label>
              {campo.tipo === "area" ? (
                <textarea
                  id={`av-${campo.nome}`}
                  rows={3}
                  value={form[campo.nome] || ""}
                  onChange={(e) => setCampo(campo.nome, e.target.value)}
                  className="cx-input"
                />
              ) : campo.tipo === "dinheiro" ? (
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-cx-muted">R$</span>
                  <input
                    id={`av-${campo.nome}`}
                    inputMode="numeric"
                    value={centavosToBRL(form[campo.nome]) || "0,00"}
                    onChange={(e) => setCampo(campo.nome, onlyDigits(e.target.value))}
                    style={{ paddingLeft: "2.25rem" }}
                    className="cx-input tabular-nums"
                  />
                </div>
              ) : (
                <input
                  id={`av-${campo.nome}`}
                  type={campo.tipo === "data" ? "date" : campo.tipo === "datahora" ? "datetime-local" : "text"}
                  inputMode={campo.tipo === "inteiro" ? "numeric" : undefined}
                  value={form[campo.nome] || ""}
                  onChange={(e) =>
                    setCampo(campo.nome, campo.tipo === "inteiro" ? onlyDigits(e.target.value) : e.target.value)
                  }
                  className="cx-input"
                />
              )}
            </div>
          ))}

          {pedeRenda ? (
            <>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-cx-muted" htmlFor="av-renda">
                  Renda utilizada na aprovação
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-cx-muted">R$</span>
                  <input
                    id="av-renda"
                    inputMode="numeric"
                    value={centavosToBRL(renda) || "0,00"}
                    onChange={(e) => setRenda(onlyDigits(e.target.value))}
                    style={{ paddingLeft: "2.25rem" }}
                    className="cx-input tabular-nums"
                  />
                </div>
                {rendaCadastro ? (
                  <p className="mt-1 text-[11px] text-cx-muted">
                    No cadastro: R$ {centavosToBRL(rendaCadastro)}
                    {divergente ? " — diferente do valor acima" : ""}
                  </p>
                ) : null}
              </div>

              <div className="rounded-lg border border-cx-border bg-cx-surface px-4 py-3">
                <p className="text-[11px] font-medium text-cx-muted">Comprometimento da renda</p>
                <p className="text-2xl font-semibold tabular-nums text-cx-text">{formatarPercentual(pct)}</p>
              </div>
            </>
          ) : null}
        </div>

        {erro ? <p className="text-xs text-red-600">{erro}</p> : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => onFechar?.()} disabled={salvando}>
            Depois
          </Button>
          <Button onClick={() => salvar(true)} disabled={salvando}>
            {salvando ? "Salvando…" : "Salvar e abrir a avaliação"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
