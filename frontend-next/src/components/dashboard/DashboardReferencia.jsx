"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { UsersRound, Users, Funnel, FileText, House, DollarSign, ArrowRight, ShieldCheck, MapPinned } from "@/components/icons";
import { WebbaBrand } from "@/components/WebbaBrand";
import { statusInfo } from "@/lib/cliente-status";
import { imovelImageUrl, situacaoInfo } from "@/lib/imovel-meta";

// Blocos do dashboard operacional (KPIs, listas do dia e faixa de
// financiamento). A página /dashboard monta estes blocos junto com o painel
// gerencial numa leitura única.

const money = (value) => value == null ? "—" : Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

function Panel({ title, href, children }) {
  return (
    <section className="ref-panel">
      <div className="ref-panel-heading">
        <h2>{title}</h2>
        {href ? <Link href={href}>Ver todos <ArrowRight size={16} /></Link> : null}
      </div>
      {children}
    </section>
  );
}

function PropertyPhoto({ path, name }) {
  const [failed, setFailed] = useState(false);
  return path && !failed
    ? <Image unoptimized width={112} height={71} src={imovelImageUrl(path)} alt={name || "Imóvel"} onError={() => setFailed(true)} />
    : <span className="ref-property-placeholder"><House size={28} /></span>;
}

// KPIs da operação no formato MetricCard do kit (4 por linha).
export function KpisOperacao({ main, propostas, total, carteiraHref, responsavelNome }) {
  const kpis = [
    { title: "Carteira no escopo", value: total ?? 0, icon: UsersRound, detail: responsavelNome, href: carteiraHref },
    { title: "Leads no mês", value: main.clientesEsteMes ?? 0, icon: Users, detail: "Novos clientes cadastrados", growth: main.crescimentoMensal, href: "/clientes/lista" },
    { title: "Em atendimento", value: main.clientesPendentes ?? 0, icon: Funnel, detail: "Clientes pendentes na carteira", href: "/clientes/lista?view=kanban" },
    { title: "Propostas cadastradas", value: propostas == null ? "—" : propostas.length, icon: FileText, detail: "Propostas da sua operação", href: "/propostas" },
  ];
  return (
    <div className="ref-kpis">
      {kpis.map(({ title, value, icon: Icon, detail, growth, href }) => (
        <Link className="ref-kpi" href={href} key={title}>
          <div>
            <p>{title}</p>
            <div className="ref-kpi-value">
              <strong>{typeof value === "number" ? value.toLocaleString("pt-BR") : value}</strong>
              {Number.isFinite(growth) && (
                <span className={growth < 0 ? "ref-negative" : "ref-growth"}>
                  {growth < 0 ? "↓" : "↑"} {Math.abs(growth).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%
                </span>
              )}
            </div>
            <small>{detail}</small>
          </div>
          <span className="ref-kpi-icon"><Icon size={20} strokeWidth={2} /></span>
        </Link>
      ))}
    </div>
  );
}

// Listas do dia: leads recentes, tarefas da equipe e imóveis em destaque.
export function ListasOperacao({ imoveis, tarefas, recentes }) {
  const router = useRouter();
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState("");
  const [completed, setCompleted] = useState([]);
  const available = (imoveis ?? []).filter((i) => i.situacao_imovel?.toLowerCase() === "disponivel").slice(0, 3);
  const pending = (tarefas ?? []).filter((t) => !t.concluido && !completed.includes(t.id)).sort((a, b) => new Date(a.data) - new Date(b.data)).slice(0, 5);

  async function complete(id) {
    setBusy(id); setError("");
    try {
      const response = await fetch(`/api/backend/lembretes/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "concluido" }) });
      if (!response.ok) throw new Error("Não foi possível concluir a tarefa. Tente novamente.");
      setCompleted((list) => [...list, id]); router.refresh();
    } catch (err) { setError(err.message); } finally { setBusy(null); }
  }

  return (
    <div className="ref-lists">
      <Panel title="Leads recentes" href="/clientes/lista">
        {recentes?.length ? recentes.slice(0, 5).map((client) => (
          <Link href={`/clientes/lista?search=${encodeURIComponent(client.nome)}`} className="ref-client-row" key={client.id}>
            <span className="ref-avatar">{client.nome?.split(/\s+/).slice(0, 2).map((s) => s[0]).join("")}</span>
            <div><strong>{client.nome}</strong><small>{client.created_at ? new Date(client.created_at).toLocaleDateString("pt-BR") : "Cliente cadastrado"}</small></div>
            <span className={`ref-badge ${statusInfo(client.status).tone}`}>{statusInfo(client.status).label}</span>
          </Link>
        )) : <p className="ref-empty">{recentes == null ? "Não foi possível carregar os clientes." : "Nenhum cliente cadastrado."}</p>}
      </Panel>
      <Panel title="Tarefas da equipe" href="/lembretes">
        {error && <p role="alert" className="ref-negative">{error}</p>}
        {pending.length ? pending.map((task) => (
          <div className="ref-task-row" key={task.id}>
            <input type="checkbox" aria-label={`Concluir ${task.titulo}`} checked={false} disabled={busy === task.id} onChange={() => complete(task.id)} />
            <Link href="/lembretes"><strong>{task.titulo}</strong><small>{task.descricao || "Lembrete da operação"}</small></Link>
            <time>{task.data ? new Date(task.data).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) : "Sem prazo"}</time>
          </div>
        )) : <p className="ref-empty">{tarefas == null ? "Tarefas indisponíveis para este acesso." : "Tudo em dia! Nenhuma tarefa pendente."}</p>}
      </Panel>
      <Panel title="Imóveis em destaque" href="/imoveis/lista">
        {available.length ? available.map((item) => (
          <Link href={`/imovel/${item.id}`} className="ref-property" key={item.id}>
            <PropertyPhoto path={item.imagem_capa} name={item.nome_imovel} />
            <div>
              <strong>{item.nome_imovel}</strong>
              <small>{item.localizacao || item.endereco || "Localização não informada"}</small>
              <div><b>{money(item.valor_venda)}</b><span className="ref-badge positive">{situacaoInfo(item.situacao_imovel).label}</span></div>
            </div>
          </Link>
        )) : <p className="ref-empty">{imoveis == null ? "Não foi possível carregar os imóveis." : "Nenhum imóvel disponível no momento."}</p>}
      </Panel>
    </div>
  );
}

export function BannerFinanciamento() {
  return (
    <section className="ref-banner">
      <WebbaBrand />
      <h2>O financiamento que aproxima<br />você do seu novo lar.</h2>
      <span><DollarSign />Taxas<br />acessíveis</span>
      <span><MapPinned />Mais<br />oportunidades</span>
      <span><ShieldCheck />Segurança<br />e confiança</span>
      <a href="https://simuladorhabitacao.caixa.gov.br/simulacao" target="_blank" rel="noopener noreferrer">Faça simulação<br />agora <ArrowRight size={22} /></a>
    </section>
  );
}
