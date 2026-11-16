"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Calendar, Check, Home, Plus, Trash2, X, MessageCircle } from "@/components/icons";
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

const FORM_VAZIO = { cliente_id: "", imovel_id: "", data_visita: "", observacoes: "" };

export function VisitasManager({ initialVisitas, clientes, imoveis }) {
  const [visitas, setVisitas] = useState(initialVisitas || []);
  const [form, setForm] = useState(FORM_VAZIO);
  const [aberto, setAberto] = useState(false);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
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

  const criar = async (e) => {
    e.preventDefault();
    if (!form.cliente_id || !form.imovel_id || !form.data_visita) {
      setErro("Escolha o cliente, o imóvel e o dia/horário.");
      return;
    }
    setSalvando(true);
    setErro("");
    try {
      const res = await fetch("/api/backend/visitas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error || "Não foi possível agendar a visita.");
      const nova = body?.data || body;
      // A resposta nem sempre traz cliente/imóvel aninhados — completa para exibir.
      const cliente = nova.cliente || clientes?.find((c) => String(c.id) === String(form.cliente_id));
      const imovel = nova.imovel || imoveis?.find((i) => String(i.id) === String(form.imovel_id));
      setVisitas((prev) => [...prev, { ...nova, cliente, imovel }]);
      setForm(FORM_VAZIO);
      setAberto(false);
      setFiltro("proximas");
      toast.success("Visita agendada.", { description: "Que tal confirmar com o cliente pelo WhatsApp?" });
    } catch (err) {
      setErro(err.message);
    } finally {
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
          <button type="button" className="lst-botao lst-botao-principal" onClick={() => setAberto(true)}>
            <Plus aria-hidden="true" /> Agendar visita
          </button>
        )}
      </div>

      {aberto && (
        <form onSubmit={criar} className="lst-painel" noValidate>
          <div className="flex items-center justify-between gap-3">
            <h2 className="lst-painel-titulo">Agendar visita</h2>
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
              <Check aria-hidden="true" /> {salvando ? "Agendando…" : "Agendar visita"}
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
            <button type="button" className="lst-botao lst-botao-principal" onClick={() => setAberto(true)}>
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
                      <button type="button" className="lst-botao" onClick={() => mudarStatus(v, "realizada")}>
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
