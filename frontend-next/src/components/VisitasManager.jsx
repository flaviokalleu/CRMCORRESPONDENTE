"use client";

import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Calendar, Check, Home, Plus, Trash2, X, MessageCircle, Pencil, Star } from "@/components/icons";
import { linkWhatsApp } from "@/components/ui/contato-rapido";

// Agenda de visitas. A lista vem primeiro (é o que se consulta todo dia); o
// formulário só abre quando a pessoa pede. Filtros rápidos com contador e um
// alerta para visita que já passou e ainda não teve resultado marcado.

const STATUS = {
  agendada: { rotulo: "Agendada", tom: "ass-tom-neutro" },
  reagendada: { rotulo: "Reagendada", tom: "ass-tom-neutro" },
  realizada: { rotulo: "Realizada", tom: "ass-tom-ok" },
  cancelada: { rotulo: "Cancelada", tom: "ass-tom-perigo" },
};

const pad = (n) => String(n).padStart(2, "0");
const chaveDia = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const aberta = (v) => v.status === "agendada" || v.status === "reagendada" || !v.status;

function grupoDe(v, hojeKey) {
  const d = v.data_visita ? new Date(v.data_visita) : null;
  if (aberta(v)) {
    if (d && chaveDia(d) < hojeKey) return "baixa";
    if (d && chaveDia(d) === hojeKey) return "hoje";
    return "proximas";
  }
  return v.status;
}

const FORM_VAZIO = { id: null, cliente_id: "", imovel_id: "", data_visita: "", observacoes: "" };

// datetime-local ("2026-11-20T15:30", hora do aparelho) → ISO com fuso.
// Mandar o texto cru fazia o Go recusar a data, e os ids iam como texto
// ("12") num campo numérico: agendar visita sempre falhava.
const paraISO = (local) => new Date(local).toISOString();
const paraLocal = (iso) => {
  const d = new Date(iso);
  return `${chaveDia(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export function VisitasManager({ initialVisitas, clientes, imoveis }) {
  const [visitas, setVisitas] = useState(initialVisitas || []);
  const [form, setForm] = useState(FORM_VAZIO);
  const [aberto, setAberto] = useState(false);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const enviando = useRef(false);
  // Painel "Como foi?" de uma visita: comentário do cliente + nota 1–5.
  const [resultado, setResultado] = useState(null);
  const hojeKey = chaveDia(new Date());

  const contagem = useMemo(() => {
    const c = { proximas: 0, hoje: 0, baixa: 0, realizada: 0, cancelada: 0 };
    for (const v of visitas) {
      const g = grupoDe(v, hojeKey);
      if (g === "hoje") c.hoje++;
      if (g === "hoje" || g === "proximas") c.proximas++;
      if (g === "baixa") c.baixa++;
      if (g === "realizada") c.realizada++;
      if (g === "cancelada") c.cancelada++;
    }
    return c;
  }, [visitas, hojeKey]);

  const [filtro, setFiltro] = useState(() => (contagem.baixa > 0 ? "baixa" : "proximas"));

  const lista = useMemo(() => {
    const f = visitas.filter((v) => {
      const g = grupoDe(v, hojeKey);
      if (filtro === "proximas") return g === "proximas" || g === "hoje";
      return g === filtro;
    });
    const dir = filtro === "proximas" || filtro === "hoje" ? 1 : -1;
    return f.sort((a, b) => dir * (new Date(a.data_visita) - new Date(b.data_visita)));
  }, [visitas, filtro, hojeKey]);

  const abrirForm = (v) => {
    setErro("");
    setForm(v?.id
      ? { id: v.id, cliente_id: String(v.cliente_id), imovel_id: String(v.imovel_id), data_visita: paraLocal(v.data_visita), observacoes: v.observacoes || "" }
      : FORM_VAZIO);
    setAberto(true);
  };

  const criar = async (e) => {
    e.preventDefault();
    if (enviando.current) return;
    if (!form.cliente_id || !form.imovel_id || !form.data_visita) {
      setErro("Escolha o cliente, o imóvel e o dia/horário.");
      return;
    }
    const quando = new Date(form.data_visita);
    if (Number.isNaN(quando.getTime()) || quando.getFullYear() < 2000 || quando.getFullYear() > 2100) {
      setErro("Data inválida. Escolha o dia no calendário.");
      return;
    }
    if (!form.id && quando < new Date()) {
      setErro("Esse horário já passou. Para agendar, escolha um horário a partir de agora.");
      return;
    }
    enviando.current = true;
    setSalvando(true);
    setErro("");
    try {
      const corpo = form.id
        ? { data_visita: paraISO(form.data_visita), observacoes: form.observacoes.trim() }
        : {
            cliente_id: Number(form.cliente_id),
            imovel_id: Number(form.imovel_id),
            data_visita: paraISO(form.data_visita),
            observacoes: form.observacoes.trim() || null,
          };
      const res = await fetch(form.id ? `/api/backend/visitas/${form.id}` : "/api/backend/visitas", {
        method: form.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corpo),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.message || body?.error || "Não foi possível salvar a visita.");
      const salva = body?.data || body;
      // A resposta nem sempre traz cliente/imóvel aninhados — completa para exibir.
      const cliente = salva.cliente || clientes?.find((c) => String(c.id) === String(form.cliente_id));
      const imovel = salva.imovel || imoveis?.find((i) => String(i.id) === String(form.imovel_id));
      if (form.id) {
        setVisitas((prev) => prev.map((x) => (x.id === salva.id ? { ...x, ...salva, cliente: x.cliente || cliente, imovel: x.imovel || imovel } : x)));
        toast.success("Visita atualizada.");
      } else {
        setVisitas((prev) => [...prev, { ...salva, cliente, imovel }]);
        setFiltro("proximas");
        toast.success("Visita agendada.", { description: "Que tal confirmar com o cliente pelo WhatsApp?" });
      }
      setForm(FORM_VAZIO);
      setAberto(false);
    } catch (err) {
      setErro(err.message);
    } finally {
      enviando.current = false;
      setSalvando(false);
    }
  };

  // Salva o "Como foi?": marca realizada com o comentário e a nota.
  const salvarResultado = async (e) => {
    e.preventDefault();
    if (enviando.current) return;
    const v = visitas.find((x) => x.id === resultado.id);
    enviando.current = true;
    setSalvando(true);
    try {
      const corpo = { status: "realizada", feedback_cliente: resultado.feedback.trim() };
      if (resultado.nota) corpo.nota_avaliacao = resultado.nota;
      const res = await fetch(`/api/backend/visitas/${v.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corpo),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.message || "Não foi possível salvar.");
      setVisitas((prev) => prev.map((x) => (x.id === v.id ? { ...x, ...(body?.data || {}), cliente: x.cliente, imovel: x.imovel } : x)));
      setResultado(null);
      toast.success("Visita marcada como realizada.");
    } catch (err) {
      toast.error(err.message);
    } finally {
      enviando.current = false;
      setSalvando(false);
    }
  };

  const mudarStatus = async (v, status) => {
    const anterior = v.status;
    setVisitas((prev) => prev.map((x) => (x.id === v.id ? { ...x, status } : x)));
    try {
      const res = await fetch(`/api/backend/visitas/${v.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      toast.success(status === "realizada" ? "Visita marcada como realizada." : "Visita cancelada.", {
        action: { label: "Desfazer", onClick: () => mudarStatus({ ...v, status }, anterior || "agendada") },
      });
    } catch {
      setVisitas((prev) => prev.map((x) => (x.id === v.id ? { ...x, status: anterior } : x)));
      toast.error("Não foi possível atualizar a visita.");
    }
  };

  const excluir = async (v) => {
    if (!window.confirm(`Excluir a visita de ${v.cliente?.nome || "cliente"}? Não dá para desfazer.`)) return;
    try {
      const res = await fetch(`/api/backend/visitas/${v.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setVisitas((prev) => prev.filter((x) => x.id !== v.id));
      toast.success("Visita excluída.");
    } catch {
      toast.error("Não foi possível excluir a visita.");
    }
  };

  const FILTROS = [
    { id: "proximas", rotulo: "Próximas", n: contagem.proximas },
    { id: "hoje", rotulo: "Hoje", n: contagem.hoje, tom: contagem.hoje ? "ass-tom-alerta" : "" },
    { id: "baixa", rotulo: "Já passaram — dar baixa", n: contagem.baixa, tom: contagem.baixa ? "ass-tom-perigo" : "" },
    { id: "realizada", rotulo: "Realizadas", n: contagem.realizada, tom: "ass-tom-ok" },
    { id: "cancelada", rotulo: "Canceladas", n: contagem.cancelada },
  ];

  return (
    <div className="space-y-5">
      <div className="lst-ferramentas">
        <div className="lst-filtros min-w-0 flex-1" role="group" aria-label="Filtrar visitas">
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
          <button type="button" className="lst-botao lst-botao-principal" onClick={() => abrirForm()}>
            <Plus aria-hidden="true" /> Agendar visita
          </button>
        )}
      </div>

      {aberto && (
        <form onSubmit={criar} className="lst-painel" noValidate>
          <div className="flex items-center justify-between gap-3">
            <h2 className="lst-painel-titulo">{form.id ? "Editar visita" : "Agendar visita"}</h2>
            <button type="button" className="lst-acao" onClick={() => setAberto(false)} aria-label="Fechar">
              <X aria-hidden="true" />
            </button>
          </div>
          <div className="lst-painel-grade">
            <label className="block">
              <span className="crm-field-label mb-1 block">Cliente</span>
              <select
                className="cx-input"
                value={form.cliente_id}
                disabled={!!form.id}
                autoFocus
                onChange={(e) => setForm((p) => ({ ...p, cliente_id: e.target.value }))}
              >
                <option value="">Escolha o cliente…</option>
                {(clientes || []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="crm-field-label mb-1 block">Imóvel</span>
              <select
                className="cx-input"
                value={form.imovel_id}
                disabled={!!form.id}
                onChange={(e) => setForm((p) => ({ ...p, imovel_id: e.target.value }))}
              >
                <option value="">Escolha o imóvel…</option>
                {(imoveis || []).map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.nome_imovel || i.endereco}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="crm-field-label mb-1 block">Dia e horário</span>
              <input
                type="datetime-local"
                className="cx-input"
                value={form.data_visita}
                max="2100-12-31T23:59"
                onChange={(e) => setForm((p) => ({ ...p, data_visita: e.target.value }))}
              />
            </label>
            <label className="lst-largo block">
              <span className="crm-field-label mb-1 block">
                Observações <span className="crm-field-opt">(opcional)</span>
              </span>
              <input
                className="cx-input"
                placeholder="Ex.: levar planta e IPTU; chave na portaria"
                value={form.observacoes}
                maxLength={1000}
                onChange={(e) => setForm((p) => ({ ...p, observacoes: e.target.value }))}
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
              <Check aria-hidden="true" /> {salvando ? "Salvando…" : form.id ? "Salvar alterações" : "Agendar visita"}
            </button>
            <button type="button" className="lst-botao" onClick={() => setAberto(false)}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      {lista.length === 0 ? (
        <div className="crm-empty crm-card flex flex-col items-center justify-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-navy-soft text-primary">
            <Calendar className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <p className="text-base font-semibold text-ink-heading">
              {filtro === "baixa" ? "Nenhuma visita pendente de resultado" : "Nenhuma visita aqui"}
            </p>
            <p className="text-sm text-cx-muted">
              {filtro === "proximas"
                ? "Agende a próxima visita e confirme com o cliente pelo WhatsApp."
                : "Troque o filtro acima para ver as outras visitas."}
            </p>
          </div>
          {filtro === "proximas" && (
            <button type="button" className="lst-botao lst-botao-principal" onClick={() => abrirForm()}>
              <Plus aria-hidden="true" /> Agendar visita
            </button>
          )}
        </div>
      ) : (
        <ul className="lst-lista">
          {lista.map((v) => {
            const g = grupoDe(v, hojeKey);
            const s = STATUS[v.status] || STATUS.agendada;
            const tom = g === "baixa" ? "ass-tom-perigo" : g === "hoje" ? "ass-tom-alerta" : s.tom;
            const d = v.data_visita ? new Date(v.data_visita) : null;
            const nomeImovel = v.imovel?.nome_imovel || v.imovel?.endereco || "Imóvel";
            const quando = d
              ? `${d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" })} às ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
              : "Sem data";
            const nomeCliente = v.cliente?.nome || "Cliente";
            const primeiroNome = nomeCliente.split(" ")[0];
            const wa = aberta(v)
              ? linkWhatsApp(
                  v.cliente?.telefone,
                  `Olá, ${primeiroNome.charAt(0)}${primeiroNome.slice(1).toLowerCase()}! Confirmando nossa visita ao imóvel "${nomeImovel}" ${d ? `em ${d.toLocaleDateString("pt-BR")} às ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : ""}. Posso contar com você?`
                )
              : "";
            return (
              <li key={v.id} className={`lst-item ${tom}`}>
                <div className="lst-item-corpo">
                  <p className="lst-item-titulo">{nomeCliente}</p>
                  <div className="lst-item-meta">
                    <span>
                      <Calendar aria-hidden="true" /> {quando}
                    </span>
                    <span>
                      <Home aria-hidden="true" /> {nomeImovel}
                    </span>
                    {g === "baixa" ? (
                      <span className="ass-selo ass-tom-perigo">Já passou — como foi?</span>
                    ) : (
                      <span className={`ass-selo ${tom}`}>{g === "hoje" ? "Hoje" : s.rotulo}</span>
                    )}
                  </div>
                  {v.observacoes && (
                    <p className="lst-item-texto">{v.observacoes}</p>
                  )}
                  {(v.feedback_cliente || v.nota_avaliacao) && (
                    <p className="lst-item-texto">
                      {v.nota_avaliacao ? `Nota ${v.nota_avaliacao}/5` : ""}{v.nota_avaliacao && v.feedback_cliente ? " · " : ""}{v.feedback_cliente}
                    </p>
                  )}
                  {resultado?.id === v.id && (
                    <form onSubmit={salvarResultado} className="lst-painel mt-3" noValidate>
                      <h3 className="lst-painel-titulo">Como foi a visita?</h3>
                      <label className="mt-2 block">
                        <span className="crm-field-label mb-1 block">
                          O que o cliente achou <span className="crm-field-opt">(opcional)</span>
                        </span>
                        <textarea className="cx-input" rows={2} maxLength={1000} value={resultado.feedback}
                          placeholder="Ex.: gostou da planta, achou a garagem pequena"
                          onChange={(e) => setResultado((r) => ({ ...r, feedback: e.target.value }))} />
                      </label>
                      <div className="mt-2" role="group" aria-label="Nota do cliente para o imóvel, de 1 a 5">
                        <span className="crm-field-label mb-1 block">
                          Nota do cliente <span className="crm-field-opt">(opcional)</span>
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <button key={n} type="button" className="lst-filtro" aria-pressed={resultado.nota === n}
                              aria-label={`Nota ${n}`} onClick={() => setResultado((r) => ({ ...r, nota: r.nota === n ? null : n }))}>
                              <Star aria-hidden="true" /> {n}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="lst-painel-rodape">
                        <button type="submit" className="lst-botao lst-botao-principal" disabled={salvando}>
                          <Check aria-hidden="true" /> {salvando ? "Salvando…" : "Marcar como realizada"}
                        </button>
                        <button type="button" className="lst-botao" onClick={() => setResultado(null)}>Cancelar</button>
                      </div>
                    </form>
                  )}
                </div>
                <div className="lst-item-acoes">
                  {wa && (
                    <a
                      href={wa}
                      target="_blank"
                      rel="noreferrer"
                      className="lst-acao lst-acao-whats"
                      title="Confirmar no WhatsApp"
                      aria-label={`Confirmar visita com ${nomeCliente} no WhatsApp`}
                    >
                      <MessageCircle aria-hidden="true" />
                    </a>
                  )}
                  {aberta(v) && (
                    <>
                      <button type="button" className="lst-botao" onClick={() => setResultado({ id: v.id, feedback: v.feedback_cliente || "", nota: v.nota_avaliacao || null })}>
                        <Check aria-hidden="true" /> Foi realizada
                      </button>
                      <button
                        type="button"
                        className="lst-acao lst-acao-perigo"
                        onClick={() => mudarStatus(v, "cancelada")}
                        title="Cancelar visita"
                        aria-label={`Cancelar visita de ${nomeCliente}`}
                      >
                        <X aria-hidden="true" />
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    className="lst-acao"
                    onClick={() => abrirForm(v)}
                    title="Editar"
                    aria-label={`Editar visita de ${nomeCliente}`}
                  >
                    <Pencil aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className="lst-acao lst-acao-perigo"
                    onClick={() => excluir(v)}
                    title="Excluir"
                    aria-label={`Excluir visita de ${nomeCliente}`}
                  >
                    <Trash2 aria-hidden="true" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
