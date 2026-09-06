"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Users, Funnel, House, Handshake, DollarSign, ArrowRight, ShieldCheck, MapPinned } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { CaixaBrand } from "@/components/CaixaBrand";
import { statusInfo } from "@/lib/cliente-status";
import { imovelImageUrl, situacaoInfo } from "@/lib/imovel-meta";

const money = (value) => value == null ? "—" : Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const colors = ["#0064df", "#349cff", "#ffb923", "#ff8618", "#00a654"];
function Panel({ title, href, children, control }) {
  return <section className="ref-panel"><div className="ref-panel-heading"><h2>{title}</h2>{href ? <Link href={href}>Ver todos <ArrowRight size={16} /></Link> : control}</div>{children}</section>;
}
function PropertyPhoto({ path, name }) {
  const [failed, setFailed] = useState(false);
  return path && !failed ? <Image unoptimized width={112} height={71} src={imovelImageUrl(path)} alt={name || "Imóvel"} onError={() => setFailed(true)} /> : <span className="ref-property-placeholder"><House size={32} /></span>;
}

export function DashboardReferencia({ user, main, historical, imoveis, tarefas, recentes, propostas }) {
  const router = useRouter();
  const [months, setMonths] = useState(6);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState("");
  const [completed, setCompleted] = useState([]);
  const total = main.totalCount ?? main.totalClientes ?? 0;
  const status = [
    { name: "Pendentes", value: main.clientesPendentes ?? 0 },
    { name: "Aprovados", value: main.clientesAprovados ?? 0 },
    { name: "Reprovados", value: main.clientesReprovados ?? 0 },
  ];
  const statusTotal = status.reduce((sum, item) => sum + item.value, 0);
  const chart = (historical?.labels ?? []).map((name, i) => ({ name, leads: historical.currentData?.[i] ?? 0 })).slice(-months);
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
  const kpis = [
    { title: "Leads no mês", value: main.clientesEsteMes ?? 0, icon: Users, detail: "Novos clientes cadastrados", growth: main.crescimentoMensal, href: "/clientes/lista" },
    { title: "Em atendimento", value: main.clientesPendentes ?? 0, icon: Funnel, detail: "Clientes pendentes na carteira", href: "/clientes/lista?view=kanban" },
    { title: "Propostas cadastradas", value: propostas == null ? "—" : propostas.length, icon: House, detail: "Propostas da sua operação", href: "/propostas" },
    { title: "Clientes aprovados", value: main.clientesAprovados ?? 0, icon: Handshake, detail: "Aprovações na carteira", href: "/clientes/lista?status=cliente_aprovado" },
    { title: "Valor financiado", value: "—", icon: DollarSign, detail: "Indicador ainda não disponível" },
  ];
  return <div className="ref-dashboard">
    <section className="ref-welcome"><div><h1>Olá, {user.first_name || "bem-vindo"}!</h1><p>Acompanhe seus resultados e transforme mais sonhos em conquistas.</p></div><div className="ref-campaign"><strong>SONHOS<br />QUE CONSTROEM<br /><span>O BRASIL</span></strong><div className="ref-campaign-photo" role="img" aria-label="Família e casa própria" /></div></section>
    <div className="ref-kpis">{kpis.map(({ title, value, icon: Icon, detail, growth, href }) => {
      const content = <><span className="ref-kpi-icon"><Icon size={31} strokeWidth={2.5} /></span><div><p>{title}</p><div className="ref-kpi-value"><strong>{typeof value === "number" ? value.toLocaleString("pt-BR") : value}</strong>{Number.isFinite(growth) && <span className={growth < 0 ? "ref-negative" : "ref-growth"}>{growth < 0 ? "↓" : "↑"} {Math.abs(growth).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%</span>}</div><small>{detail}</small></div></>;
      return href ? <Link className="ref-kpi" href={href} key={title}>{content}</Link> : <div className="ref-kpi" key={title}>{content}</div>;
    })}</div>
    <div className="ref-charts">
      <Panel title="Evolução de Leads" control={<select aria-label="Período da evolução" value={months} onChange={(e) => setMonths(Number(e.target.value))}><option value={6}>Últimos 6 meses</option><option value={12}>Últimos 12 meses</option></select>}>
        <div className="ref-chart">{chart.length ? <ResponsiveContainer width="100%" height="100%"><AreaChart data={chart} margin={{ top: 12, right: 12, left: -20, bottom: 0 }}><defs><linearGradient id="refLeadGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2497f3" stopOpacity={0.6} /><stop offset="100%" stopColor="#2497f3" stopOpacity={0.05} /></linearGradient></defs><CartesianGrid stroke="#eef2f8" vertical /><XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#425a7d" }} /><YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#425a7d" }} /><Tooltip /><Area name="Leads" type="monotone" dataKey="leads" stroke="#0076ff" strokeWidth={2.5} fill="url(#refLeadGradient)" dot={{ r: 4, fill: "#087fff", stroke: "white", strokeWidth: 1.5 }} /></AreaChart></ResponsiveContainer> : <p className="ref-empty">Histórico indisponível.</p>}</div>
      </Panel>
      <Panel title="Status dos Leads" control={<span className="ref-scope">Carteira atual</span>}><div className="ref-status"><div className="ref-donut"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={statusTotal ? status : [{ name: "Sem dados", value: 1 }]} dataKey="value" innerRadius="64%" outerRadius="94%" stroke="none">{(statusTotal ? status : [{}]).map((item, i) => <Cell key={item.name || "empty"} fill={statusTotal ? [colors[0], colors[4], colors[3]][i] : "#eaf0f8"} />)}</Pie>{statusTotal > 0 && <Tooltip />}</PieChart></ResponsiveContainer><div className="ref-donut-label"><strong>{total.toLocaleString("pt-BR")}</strong><span>Leads</span></div></div><div className="ref-legend">{status.map((item, i) => <div key={item.name}><i style={{ background: [colors[0], colors[4], colors[3]][i] }} /><span>{item.name}</span><b>{statusTotal ? Math.round(item.value / statusTotal * 100) : 0}%</b></div>)}</div></div></Panel>
      <Panel title="Origem dos Leads" control={<span className="ref-scope">Carteira atual</span>}><div className="ref-origins">{["Facebook/Instagram", "Indicação", "Site", "WhatsApp", "Outros"].map((label) => <div key={label}><span>{label}</span><i /><span>—</span></div>)}</div><p className="ref-source-note">A origem dos leads ainda não é registrada no sistema.</p></Panel>
    </div>
    <div className="ref-lists">
      <Panel title="Leads Recentes" href="/clientes/lista">{recentes?.length ? recentes.slice(0, 5).map((client) => <Link href={`/clientes/lista?search=${encodeURIComponent(client.nome)}`} className="ref-client-row" key={client.id}><span className="ref-avatar">{client.nome?.split(/\s+/).slice(0, 2).map((s) => s[0]).join("")}</span><div><strong>{client.nome}</strong><small>{client.created_at ? new Date(client.created_at).toLocaleDateString("pt-BR") : "Cliente cadastrado"}</small></div><span className={`ref-badge ${statusInfo(client.status).tone}`}>{statusInfo(client.status).label}</span></Link>) : <p className="ref-empty">{recentes == null ? "Não foi possível carregar os clientes." : "Nenhum cliente cadastrado."}</p>}</Panel>
      <Panel title="Tarefas da Equipe" href="/lembretes">{error && <p role="alert" className="ref-negative">{error}</p>}{pending.length ? pending.map((task) => <div className="ref-task-row" key={task.id}><input type="checkbox" aria-label={`Concluir ${task.titulo}`} checked={false} disabled={busy === task.id} onChange={() => complete(task.id)} /><Link href="/lembretes"><strong>{task.titulo}</strong><small>{task.descricao || "Lembrete da operação"}</small></Link><time>{task.data ? new Date(task.data).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) : "Sem prazo"}</time></div>) : <p className="ref-empty">{tarefas == null ? "Tarefas indisponíveis para este acesso." : "Tudo em dia! Nenhuma tarefa pendente."}</p>}</Panel>
      <Panel title="Imóveis em Destaque" href="/imoveis/lista">{available.length ? available.map((item) => <Link href={`/imovel/${item.id}`} className="ref-property" key={item.id}><PropertyPhoto path={item.imagem_capa} name={item.nome_imovel} /><div><strong>{item.nome_imovel}</strong><small>{item.localizacao || item.endereco || "Localização não informada"}</small><div><b>{money(item.valor_venda)}</b><span className="ref-badge positive">{situacaoInfo(item.situacao_imovel).label}</span></div></div></Link>) : <p className="ref-empty">{imoveis == null ? "Não foi possível carregar os imóveis." : "Nenhum imóvel disponível no momento."}</p>}</Panel>
    </div>
    <section className="ref-banner"><CaixaBrand /><h2>O financiamento que aproxima<br />você do seu novo lar.</h2><span><DollarSign />Taxas<br />acessíveis</span><span><MapPinned />Mais<br />oportunidades</span><span><ShieldCheck />Segurança<br />e confiança</span><Link href="/imoveis/lista">Encontre o seu<br />novo lar <ArrowRight size={22} /></Link></section>
  </div>;
}
