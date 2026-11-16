"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Check, Clock, Plus, Trash2, X, CalendarCheck, AlertCircle } from "@/components/icons";

// Tarefas (lembretes) do dia a dia.
//
// O backend guarda só: titulo, descricao, data (com hora) e concluido. A tela
// antiga mostrava prioridade, tipo, cliente, calendário e "ações rápidas" que
// não eram salvos nem funcionavam — saíram. O que ficou: filtros rápidos com
// contador, grupos por dia, marcar como feita com um toque (e desfazer) e um
// formulário curto com atalhos de data. (Sem useMemo: o React Compiler memoiza.)

const pad = (n) => String(n).padStart(2, "0");
const chaveDia = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const somaDias = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

// "2026-11-20" + "14:30" → "2026-11-20T14:30:00-03:00" (fuso do aparelho).
// Mandar só a data fazia o Go gravar meia-noite UTC = 21h do dia anterior.
function dataComFuso(dia, hora) {
  const local = new Date(`${dia}T${hora || "09:00"}:00`);
  const off = -local.getTimezoneOffset();
  const sinal = off >= 0 ? "+" : "-";
  const abs = Math.abs(off);
  return `${dia}T${hora || "09:00"}:00${sinal}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}

function situacao(l, hojeKey) {
  if (l.concluido) return "feita";
  if (!l.data) return "proxima";
  const k = chaveDia(new Date(l.data));
  if (k < hojeKey) return "atrasada";
  if (k === hojeKey) return "hoje";
  return "proxima";
}

const TOM = { atrasada: "ass-tom-perigo", hoje: "ass-tom-alerta", proxima: "ass-tom-neutro", feita: "ass-tom-ok" };

function rotuloDia(key, hojeKey, amanhaKey) {
  if (key === hojeKey) return "Hoje";
  if (key === amanhaKey) return "Amanhã";
  const d = new Date(`${key}T12:00:00`);
  const txt = d.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
  return txt.charAt(0).toUpperCase() + txt.slice(1);
}

function diasDeAtraso(l, hoje) {
  const d = new Date(l.data);
  d.setHours(0, 0, 0, 0);
  const h = new Date(hoje);
  h.setHours(0, 0, 0, 0);
  return Math.round((h - d) / 86400000);
}

const FORM_VAZIO = { titulo: "", descricao: "", dia: "", hora: "" };

export function LembretesManager({ initialLembretes }) {
  const [lembretes, setLembretes] = useState(initialLembretes || []);
  const [filtro, setFiltro] = useState("fazer");
  const [aberto, setAberto] = useState(false);
  const [form, setForm] = useState(FORM_VAZIO);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  const hoje = new Date();
  const hojeKey = chaveDia(hoje);
  const amanhaKey = chaveDia(somaDias(hoje, 1));
  const semanaKey = chaveDia(somaDias(hoje, 7));

  const contagem = (() => {
    const c = { fazer: 0, atrasada: 0, hoje: 0, semana: 0, feita: 0 };
    for (const l of lembretes) {
      const s = situacao(l, hojeKey);
      if (s === "feita") c.feita++;
      else {
        c.fazer++;
        if (s === "atrasada") c.atrasada++;
        if (s === "hoje") c.hoje++;
        if (s === "proxima" && l.data && chaveDia(new Date(l.data)) <= semanaKey) c.semana++;
      }
    }
    return c;
  })();

  const grupos = (() => {
    const visiveis = lembretes.filter((l) => {
      const s = situacao(l, hojeKey);
      if (filtro === "feita") return s === "feita";
      if (s === "feita") return false;
      if (filtro === "atrasada") return s === "atrasada";
      if (filtro === "hoje") return s === "hoje";
      if (filtro === "semana") return s === "proxima" && l.data && chaveDia(new Date(l.data)) <= semanaKey;
      return true;
    });
    const ordem = [...visiveis].sort((a, b) =>
      filtro === "feita" ? new Date(b.data) - new Date(a.data) : new Date(a.data) - new Date(b.data)
    );
    const mapa = new Map();
    for (const l of ordem) {
      const s = situacao(l, hojeKey);
      const key = s === "atrasada" ? "atrasadas" : l.data ? chaveDia(new Date(l.data)) : "sem-data";
      if (!mapa.has(key)) mapa.set(key, []);
      mapa.get(key).push(l);
    }
    return [...mapa.entries()];
  })();

  const abrirForm = () => {
    setForm({ ...FORM_VAZIO, dia: hojeKey });
    setErro("");
    setAberto(true);
  };

  const criar = async (e) => {
    e.preventDefault();
    if (!form.titulo.trim()) return setErro("Escreva o que precisa ser feito.");
    if (!form.dia) return setErro("Escolha o dia.");
    setSalvando(true);
    setErro("");
    try {
      const res = await fetch("/api/backend/lembretes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo: form.titulo.trim(),
          descricao: form.descricao.trim() || null,
          data: dataComFuso(form.dia, form.hora),
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error || "Não foi possível salvar a tarefa.");
      setLembretes((prev) => [...prev, body]);
      setForm({ ...FORM_VAZIO, dia: form.dia });
      setAberto(false);
      toast.success("Tarefa anotada.");
    } catch (err) {
      setErro(err.message);
    } finally {
      setSalvando(false);
    }
  };

  const marcar = async (l, feita) => {
    setLembretes((prev) => prev.map((x) => (x.id === l.id ? { ...x, concluido: feita } : x)));
    try {
      const res = await fetch(`/api/backend/lembretes/${l.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: feita ? "concluido" : "pendente" }),
      });
      if (!res.ok) throw new Error();
      if (feita) {
        toast.success("Tarefa feita!", {
          description: l.titulo,
          action: { label: "Desfazer", onClick: () => marcar(l, false) },
        });
      }
    } catch {
      setLembretes((prev) => prev.map((x) => (x.id === l.id ? { ...x, concluido: !feita } : x)));
      toast.error("Não foi possível atualizar a tarefa. Tente de novo.");
    }
  };

  const excluir = async (l) => {
    if (!window.confirm(`Excluir a tarefa "${l.titulo}"? Não dá para desfazer.`)) return;
    try {
      const res = await fetch(`/api/backend/lembretes/${l.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setLembretes((prev) => prev.filter((x) => x.id !== l.id));
      toast.success("Tarefa excluída.");
    } catch {
      toast.error("Não foi possível excluir a tarefa.");
    }
  };

  const FILTROS = [
    { id: "fazer", rotulo: "Para fazer", n: contagem.fazer },
    { id: "atrasada", rotulo: "Atrasadas", n: contagem.atrasada, tom: contagem.atrasada ? "ass-tom-perigo" : "" },
    { id: "hoje", rotulo: "Hoje", n: contagem.hoje, tom: contagem.hoje ? "ass-tom-alerta" : "" },
    { id: "semana", rotulo: "Próximos 7 dias", n: contagem.semana },
    { id: "feita", rotulo: "Feitas", n: contagem.feita, tom: "ass-tom-ok" },
  ];

  const atalhos = [
    { rotulo: "Hoje", dia: hojeKey },
    { rotulo: "Amanhã", dia: amanhaKey },
    { rotulo: "Daqui a 1 semana", dia: semanaKey },
  ];

  return (
    <div className="space-y-5">
      <div className="lst-ferramentas">
        <div className="lst-filtros min-w-0 flex-1" role="group" aria-label="Filtrar tarefas">
          {FILTROS.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`lst-filtro ${f.tom || ""}`}
              aria-pressed={filtro === f.id}
              onClick={() => setFiltro(f.id)}
            >
              {f.rotulo} <span className="lst-filtro-n">{f.n}</span>
            </button>
          ))}
        </div>
        {!aberto && (
          <button type="button" className="lst-botao lst-botao-principal" onClick={abrirForm}>
            <Plus aria-hidden="true" /> Nova tarefa
          </button>
        )}
      </div>

      {aberto && (
        <form onSubmit={criar} className="lst-painel" noValidate>
          <div className="flex items-center justify-between gap-3">
            <h2 className="lst-painel-titulo">Nova tarefa</h2>
            <button type="button" className="lst-acao" onClick={() => setAberto(false)} aria-label="Fechar">
              <X aria-hidden="true" />
            </button>
          </div>
          <div className="lst-painel-grade">
            <label className="lst-largo block">
              <span className="crm-field-label mb-1 block">O que precisa fazer?</span>
              <input
                className="cx-input"
                placeholder="Ex.: Ligar para a Fernanda sobre a documentação"
                value={form.titulo}
                maxLength={120}
                autoFocus
                onChange={(e) => setForm((p) => ({ ...p, titulo: e.target.value }))}
              />
            </label>
            <div className="lst-largo">
              <span className="crm-field-label mb-1 block">Quando?</span>
              <div className="flex flex-wrap items-center gap-2">
                {atalhos.map((a) => (
                  <button
                    key={a.dia}
                    type="button"
                    className="lst-filtro"
                    aria-pressed={form.dia === a.dia}
                    onClick={() => setForm((p) => ({ ...p, dia: a.dia }))}
                  >
                    {a.rotulo}
                  </button>
                ))}
                <input
                  type="date"
                  className="cx-input lst-campo-curto"
                  aria-label="Outro dia"
                  value={form.dia}
                  min={hojeKey}
                  onChange={(e) => setForm((p) => ({ ...p, dia: e.target.value }))}
                />
                <input
                  type="time"
                  className="cx-input lst-campo-curto"
                  aria-label="Horário (opcional)"
                  title="Horário (opcional — se deixar vazio, fica 09:00)"
                  value={form.hora}
                  onChange={(e) => setForm((p) => ({ ...p, hora: e.target.value }))}
                />
              </div>
            </div>
            <label className="lst-largo block">
              <span className="crm-field-label mb-1 block">
                Detalhes <span className="crm-field-opt">(opcional)</span>
              </span>
              <textarea
                className="cx-input"
                rows={2}
                maxLength={500}
                placeholder="Ex.: pedir holerite e comprovante de residência"
                value={form.descricao}
                onChange={(e) => setForm((p) => ({ ...p, descricao: e.target.value }))}
              />
            </label>
          </div>
          {erro && (
            <p className="lst-erro mt-3" role="alert">
              {erro}
            </p>
          )}
          <div className="lst-painel-rodape">
            <button type="submit" className="lst-botao lst-botao-principal" disabled={salvando}>
              <Check aria-hidden="true" /> {salvando ? "Salvando…" : "Salvar tarefa"}
            </button>
            <button type="button" className="lst-botao" onClick={() => setAberto(false)}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      {grupos.length === 0 ? (
        <Vazio filtro={filtro} onNova={abrirForm} temPendentes={contagem.fazer > 0} onVerTodas={() => setFiltro("fazer")} />
      ) : (
        <div>
          {grupos.map(([key, itens]) => (
            <section key={key} className="lst-grupo" aria-label={key}>
              <h2 className="lst-grupo-titulo">
                {key === "atrasadas" ? "Atrasadas" : key === "sem-data" ? "Sem data" : rotuloDia(key, hojeKey, amanhaKey)}
                <small>
                  {itens.length} {itens.length === 1 ? "tarefa" : "tarefas"}
                </small>
              </h2>
              <ul className="lst-lista">
                {itens.map((l) => {
                  const s = situacao(l, hojeKey);
                  const d = l.data ? new Date(l.data) : null;
                  const atraso = s === "atrasada" ? diasDeAtraso(l, hoje) : 0;
                  return (
                    <li key={l.id} className={`lst-item ${TOM[s]}`} data-feito={l.concluido ? "true" : undefined}>
                      <button
                        type="button"
                        className="lst-check"
                        aria-pressed={!!l.concluido}
                        aria-label={l.concluido ? `Reabrir: ${l.titulo}` : `Marcar como feita: ${l.titulo}`}
                        title={l.concluido ? "Reabrir" : "Marcar como feita"}
                        onClick={() => marcar(l, !l.concluido)}
                      >
                        <Check aria-hidden="true" />
                      </button>
                      <div className="lst-item-corpo">
                        <p className="lst-item-titulo">{l.titulo}</p>
                        {l.descricao && <p className="lst-item-texto">{l.descricao}</p>}
                        {d && (
                          <div className="lst-item-meta">
                            <span>
                              <Clock aria-hidden="true" />
                              {key === "atrasadas" &&
                                `${d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} · `}
                              {d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                            {atraso > 0 && (
                              <span className="ass-selo ass-tom-perigo">
                                <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
                                {atraso === 1 ? "1 dia de atraso" : `${atraso} dias de atraso`}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="lst-item-acoes">
                        <button
                          type="button"
                          className="lst-acao lst-acao-perigo"
                          onClick={() => excluir(l)}
                          aria-label={`Excluir: ${l.titulo}`}
                          title="Excluir"
                        >
                          <Trash2 aria-hidden="true" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function Vazio({ filtro, onNova, temPendentes, onVerTodas }) {
  const textos = {
    fazer: ["Nada pendente por aqui", "Anote a próxima ligação, visita ou documento que você não pode esquecer."],
    atrasada: ["Nenhuma tarefa atrasada", "Tudo em dia. Bom trabalho!"],
    hoje: ["Nada marcado para hoje", "Aproveite para adiantar as próximas tarefas."],
    semana: ["Nada para os próximos 7 dias", "Que tal já anotar os retornos da semana?"],
    feita: ["Nenhuma tarefa feita ainda", "Quando você marcar o círculo de uma tarefa, ela aparece aqui."],
  };
  const [titulo, dica] = textos[filtro] || textos.fazer;
  return (
    <div className="crm-empty crm-card flex flex-col items-center justify-center gap-3 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-navy-soft text-primary">
        <CalendarCheck className="h-6 w-6" aria-hidden="true" />
      </div>
      <div>
        <p className="text-base font-semibold text-ink-heading">{titulo}</p>
        <p className="text-sm text-cx-muted">{dica}</p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <button type="button" className="lst-botao lst-botao-principal" onClick={onNova}>
          <Plus aria-hidden="true" /> Nova tarefa
        </button>
        {filtro !== "fazer" && temPendentes && (
          <button type="button" className="lst-botao" onClick={onVerTodas}>
            Ver tudo que falta fazer
          </button>
        )}
      </div>
    </div>
  );
}
