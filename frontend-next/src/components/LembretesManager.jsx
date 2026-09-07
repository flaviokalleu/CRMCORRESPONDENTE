"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Bell, CalendarDays, Check, CheckCheck, ChevronLeft, ChevronRight, Clock3, FileText, ListTodo, Plus, Search, Trash2, Users, X, Zap } from "lucide-react";
import styles from "./LembretesManager.module.css";

const zone = "America/Sao_Paulo";
const dayKey = (value) => new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value));
const dayDate = (key) => new Date(`${key}T12:00:00-03:00`);
const labelDate = (key) => dayDate(key).toLocaleDateString("pt-BR", { timeZone: zone, day: "2-digit", month: "long" });
const shiftDay = (key, amount) => { const date = dayDate(key); date.setUTCDate(date.getUTCDate() + amount); return dayKey(date); };

export function LembretesManager({ initialLembretes, initialNow, loadError = false }) {
  const [lembretes, setLembretes] = useState(initialLembretes || []);
  const [filter, setFilter] = useState("agenda");
  const [search, setSearch] = useState("");
  const [selectedDay, setSelectedDay] = useState(null);
  const today = dayKey(initialNow);
  const tomorrow = shiftDay(today, 1);
  const [month, setMonth] = useState(today.slice(0, 7));
  const [form, setForm] = useState({ titulo: "", descricao: "", data: today, hora: "09:00" });
  const [error, setError] = useState(loadError ? "Não foi possível carregar os lembretes. Atualize a página para tentar novamente." : "");
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(null);
  const dialog = useRef(null);
  const active = lembretes.filter((item) => !item.concluido);
  const overdue = active.filter((item) => dayKey(item.data) < today);
  const completed = lembretes.filter((item) => item.concluido);
  const endOfWeek = shiftDay(today, 6 - dayDate(today).getUTCDay());
  const changeFilter = (value) => { setFilter(value); setSelectedDay(null); };
  const openCreate = () => { setForm((current) => ({ ...current, data: selectedDay || today })); setFormError(""); dialog.current?.showModal(); };

  async function create(event) {
    event.preventDefault();
    if (!form.titulo.trim() || busy !== null) return;
    setBusy("create"); setFormError("");
    try {
      const response = await fetch("/api/backend/lembretes", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titulo: form.titulo.trim(), descricao: form.descricao.trim(), data: `${form.data}T${form.hora}:00-03:00` }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error || "Não foi possível criar o lembrete.");
      setLembretes((items) => [...items, result]);
      setForm({ titulo: "", descricao: "", data: today, hora: "09:00" });
      setSearch(""); changeFilter("agenda"); setError(""); dialog.current.close();
    } catch (err) { setFormError(err.message); }
    finally { setBusy(null); }
  }

  async function update(item, remove = false) {
    if (busy !== null || (remove && !window.confirm(`Excluir “${item.titulo}”?`))) return;
    setBusy(item.id); setError("");
    try {
      const response = await fetch(`/api/backend/lembretes/${item.id}`, {
        method: remove ? "DELETE" : "PUT",
        ...(!remove && { headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: item.concluido ? "pendente" : "concluido" }) }),
      });
      if (!response.ok) throw new Error("Não foi possível salvar a alteração. Tente novamente.");
      setLembretes((items) => remove ? items.filter((value) => value.id !== item.id) : items.map((value) => value.id === item.id ? { ...value, concluido: !value.concluido } : value));
    } catch (err) { setError(err.message); }
    finally { setBusy(null); }
  }

  const counts = [
    { key: "hoje", label: "Hoje", count: active.filter((item) => dayKey(item.data) === today).length, Icon: CalendarDays, tone: "blue" },
    { key: "atrasados", label: "Atrasados", count: overdue.length, Icon: Bell, tone: "orange" },
    { key: "semana", label: "Esta semana", count: active.filter((item) => dayKey(item.data) >= today && dayKey(item.data) <= endOfWeek).length, Icon: Clock3, tone: "blue" },
    { key: "concluidos", label: "Concluídos", count: completed.length, Icon: CheckCheck, tone: "green" },
  ];
  const visible = (filter === "concluidos" ? completed : active).filter((item) => {
    const key = dayKey(item.data);
    if (selectedDay && key !== selectedDay) return false;
    if (filter === "hoje" && key !== today) return false;
    if (filter === "atrasados" && key >= today) return false;
    if (filter === "semana" && (key < today || key > endOfWeek)) return false;
    return `${item.titulo} ${item.descricao || ""}`.toLocaleLowerCase("pt-BR").includes(search.toLocaleLowerCase("pt-BR"));
  }).sort((a, b) => new Date(a.data) - new Date(b.data));
  const groups = new Map();
  visible.forEach((item) => { const key = dayKey(item.data); if (!groups.has(key)) groups.set(key, []); groups.get(key).push(item); });
  const first = new Date(`${month}-01T12:00:00Z`);
  const daysInMonth = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  const marked = new Set(active.map((item) => dayKey(item.data)));
  const moveMonth = (amount) => { const next = new Date(first); next.setUTCMonth(next.getUTCMonth() + amount); setMonth(next.toISOString().slice(0, 7)); };

  return (
    <div className={styles.page}>
      <div className={styles.layout}>
        <div className={styles.main}>
          <header className={styles.hero}>
            <div className={styles.heroCopy}>
              <p className={styles.eyebrow}>LEMBRETES</p>
              <h1>Seu dia organizado,<br /><span>mais negócios realizados.</span></h1>
              <p className={styles.subtitle}>Acompanhe seus lembretes e nunca perca uma oportunidade.</p>
            </div>
            <div className={styles.heroArt} aria-hidden="true" />
            <p className={styles.heroQuote}>DISCIPLINA HOJE.<br />MAIS CONQUISTAS AMANHÃ.<i /></p>
          </header>
          <button className={`${styles.primary} ${styles.mobileCreate}`} onClick={openCreate}><Plus size={21} />Novo lembrete</button>
          <div className={styles.stats} aria-label="Resumo dos lembretes">
            {counts.map(({ key, label, count, Icon, tone }) => <button key={key} className={`${styles.stat} ${styles[tone]} ${filter === key ? styles.statSelected : ""}`} onClick={() => changeFilter(filter === key ? "agenda" : key)} aria-pressed={filter === key}>
              <span className={styles.statIcon}><Icon size={25} strokeWidth={1.8} /></span><span><strong>{loadError ? "—" : count}</strong><small>{label}</small></span>
            </button>)}
          </div>
          <div className={styles.toolbar}>
            <div className={styles.tabs}><button onClick={() => changeFilter("agenda")} className={filter === "agenda" && !selectedDay ? styles.activeTab : ""}>Minha agenda</button><button onClick={() => changeFilter("concluidos")} className={filter === "concluidos" ? styles.activeTab : ""}>Concluídos</button></div>
            <label className={styles.search}><Search size={16} /><input aria-label="Buscar lembrete" placeholder="Buscar lembrete..." value={search} onChange={(event) => setSearch(event.target.value)} /></label>
          </div>
          {(selectedDay || !["agenda", "concluidos"].includes(filter)) && <div className={styles.filterLabel}><span>{selectedDay ? `Agenda de ${labelDate(selectedDay)}` : counts.find((item) => item.key === filter)?.label}</span><button onClick={() => changeFilter("agenda")}>Limpar filtro <X size={14} /></button></div>}
          {error && <p role="alert" className={styles.error}>{error}</p>}
          <div className={styles.agenda}>
            {[...groups].map(([key, items]) => <section className={styles.dayCard} key={key}>
              <div className={styles.dayHeading}><h2>{key === today ? "Hoje" : key === tomorrow ? "Amanhã" : dayDate(key).toLocaleDateString("pt-BR", { weekday: "long", timeZone: zone })}<span> · </span>{labelDate(key)}</h2><small>{items.length} {items.length === 1 ? "lembrete" : "lembretes"}</small></div>
              {items.map((item) => <article className={styles.row} key={item.id}>
                <div className={styles.time}><span className={`${styles.dot} ${key < today && !item.concluido ? styles.lateDot : ""}`} /><time dateTime={item.data}>{new Date(item.data).toLocaleTimeString("pt-BR", { timeZone: zone, hour: "2-digit", minute: "2-digit" })}</time></div>
                <span className={styles.rowIcon}>{item.concluido ? <Check size={20} /> : <FileText size={20} />}</span>
                <div className={styles.rowText}><h3>{item.titulo}</h3>{item.descricao && <p>{item.descricao}</p>}</div>
                <span className={`${styles.badge} ${item.concluido ? styles.doneBadge : key < today ? styles.lateBadge : ""}`}>{item.concluido ? "Concluído" : key < today ? "Atrasado" : "Agendado"}</span>
                <div className={styles.rowActions}><button className={styles.complete} disabled={busy !== null} onClick={() => update(item)} aria-label={`${item.concluido ? "Reabrir" : "Concluir"} ${item.titulo}`}><Check size={15} /><span>{item.concluido ? "Reabrir" : "Concluir"}</span></button><button disabled={busy !== null} className={styles.delete} onClick={() => update(item, true)} aria-label={`Excluir ${item.titulo}`}><Trash2 size={16} /></button></div>
              </article>)}
            </section>)}
            {!visible.length && !loadError && <div className={styles.empty}><span><CalendarDays size={32} /></span><h2>{search ? "Nenhum lembrete encontrado" : filter === "concluidos" ? "Seus lembretes concluídos aparecem aqui" : "Espaço para sua próxima conquista"}</h2><p>{search ? "Experimente buscar por outro título ou descrição." : "Organize os próximos passos e cuide de cada oportunidade."}</p><button className={styles.primary} onClick={openCreate}><Plus size={18} />Novo lembrete</button></div>}
          </div>
          <p className={styles.footnote}><Clock3 size={13} /> Horários de Brasília</p>
        </div>
        <aside className={styles.aside} aria-label="Calendário e ações">
          <button className={`${styles.primary} ${styles.newButton}`} onClick={openCreate}><Plus size={21} />Novo lembrete</button>
          <section className={styles.sideCard}>
            <h2>Meu calendário</h2>
            <div className={styles.monthHeading}><h3>{first.toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" })}</h3><div><button aria-label="Mês anterior" onClick={() => moveMonth(-1)}><ChevronLeft size={16} /></button><button aria-label="Próximo mês" onClick={() => moveMonth(1)}><ChevronRight size={16} /></button></div></div>
            <div className={styles.calendar}>
              {["D", "S", "T", "Q", "Q", "S", "S"].map((label, index) => <span className={styles.weekday} key={index}>{label}</span>)}
              {Array.from({ length: first.getUTCDay() }, (_, index) => <span key={`blank-${index}`} />)}
              {Array.from({ length: daysInMonth }, (_, index) => {
                const key = `${month}-${String(index + 1).padStart(2, "0")}`;
                return <button key={key} aria-label={`Ver lembretes de ${labelDate(key)} de ${month.slice(0, 4)}`} aria-pressed={selectedDay === key} aria-current={key === today ? "date" : undefined} className={`${styles.calendarDay} ${key === today ? styles.today : ""} ${selectedDay === key ? styles.selectedDay : ""}`} onClick={() => { setSelectedDay(selectedDay === key ? null : key); setFilter("agenda"); }}>{index + 1}{marked.has(key) && <i />}</button>;
              })}
            </div>
            <button className={styles.backToday} onClick={() => { setMonth(today.slice(0, 7)); changeFilter("hoje"); }}>Ir para hoje</button>
          </section>
          <section className={styles.sideCard}><h2>Ações rápidas</h2><div className={styles.quickActions}>
            <button onClick={() => changeFilter("hoje")}><span><CalendarDays size={21} /></span>Hoje</button>
            <Link href="/clientes/lista"><span><Users size={21} /></span>Abrir leads</Link>
            <button onClick={() => changeFilter("concluidos")}><span className={styles.green}><CheckCheck size={21} /></span>Concluídos</button>
            <button onClick={openCreate}><span className={styles.orange}><Plus size={22} /></span>Novo</button>
          </div></section>
          <section className={`${styles.sideCard} ${overdue.length ? styles.alertCard : styles.calmCard}`}><div className={styles.alertCopy}><Zap size={32} fill="currentColor" /><div><h2>{overdue.length ? "Não deixe oportunidades para depois!" : "Tudo em dia. Continue assim!"}</h2><p>{overdue.length ? `Você tem ${overdue.length} ${overdue.length === 1 ? "lembrete atrasado" : "lembretes atrasados"}.` : "Cada pequeno passo faz a diferença."}</p></div></div><button onClick={() => changeFilter(overdue.length ? "atrasados" : "hoje")}>{overdue.length ? "Ver atrasados" : "Ver minha agenda"}<ArrowRight size={17} /></button></section>
          <section className={`${styles.sideCard} ${styles.quoteCard}`}><ListTodo size={29} /><blockquote>“Pequenas ações diárias<br />geram grandes resultados.”</blockquote><div><i /><strong>CAI<span>X</span>A</strong></div></section>
        </aside>
      </div>
      <dialog ref={dialog} className={styles.dialog} aria-labelledby="new-reminder-title" onCancel={(event) => { if (busy === "create") event.preventDefault(); }}>
        <form onSubmit={create}>
          <div className={styles.dialogHeading}><div><p className={styles.eyebrow}>SUA PRÓXIMA CONQUISTA</p><h2 id="new-reminder-title">Novo lembrete</h2></div><button type="button" aria-label="Fechar" disabled={busy === "create"} onClick={() => dialog.current.close()}><X size={21} /></button></div>
          <label>Título<input autoFocus required maxLength={255} placeholder="Ex.: Retornar contato com o cliente" value={form.titulo} onChange={(event) => setForm({ ...form, titulo: event.target.value })} /></label>
          <div className={styles.formDates}><label>Data<input required type="date" value={form.data} onChange={(event) => setForm({ ...form, data: event.target.value })} /></label><label>Horário de Brasília<input required type="time" value={form.hora} onChange={(event) => setForm({ ...form, hora: event.target.value })} /></label></div>
          <label>Descrição <small>(opcional)</small><textarea rows={3} placeholder="O que você precisa lembrar?" value={form.descricao} onChange={(event) => setForm({ ...form, descricao: event.target.value })} /></label>
          {formError && <p role="alert" className={styles.error}>{formError}</p>}
          <div className={styles.dialogFooter}><button type="button" disabled={busy === "create"} onClick={() => dialog.current.close()}>Cancelar</button><button className={styles.primary} disabled={busy === "create"} type="submit">{busy === "create" ? "Salvando..." : "Salvar lembrete"}</button></div>
        </form>
      </dialog>
    </div>
  );
}
