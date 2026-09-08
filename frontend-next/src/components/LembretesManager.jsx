"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Trash2,
  Clock,
  AlertCircle,
  Calendar,
  Phone,
  MessageSquare,
  MapPin,
  User,
  FileText,
  ChevronUp,
  ChevronDown,
  Zap,
  MoreVertical,
  Send,
  Home,
  DollarSign,
  Bell,
  Plus,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// Client Component: gerencia lembretes via proxy `/api/backend/...`
export function LembretesManager({ initialLembretes }) {
  const [lembretes, setLembretes] = useState(initialLembretes || []);
  const [showConcluidos, setShowConcluidos] = useState(false);
  const [form, setForm] = useState({ titulo: "", descricao: "", data: "", prioridade: "media" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const router = useRouter();

  const ativos = useMemo(() => lembretes.filter((l) => !l.concluido), [lembretes]);
  const concluidos = useMemo(() => lembretes.filter((l) => l.concluido), [lembretes]);

  // Agrupar por data
  const groupedLembretes = useMemo(() => {
    const list = showConcluidos ? concluidos : ativos;
    const groups = {};
    list.forEach((l) => {
      const dateKey = l.data || "sem-data";
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(l);
    });
    // Ordenar grupos: hoje, amanhã, depois, sem data
    const today = new Date().toISOString().split("T")[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];
    return Object.entries(groups).sort(([a], [b]) => {
      if (a === today) return -1;
      if (b === today) return 1;
      if (a === tomorrow) return -1;
      if (b === tomorrow) return 1;
      if (a === "sem-data") return 1;
      if (b === "sem-data") return -1;
      return a.localeCompare(b);
    });
  }, [ativos, concluidos, showConcluidos]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.titulo.trim() || !form.data) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/backend/lembretes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Erro ao criar lembrete");
      const novo = await res.json();
      setLembretes((prev) => [...prev, novo]);
      setForm({ titulo: "", descricao: "", data: "", prioridade: "media" });
      setShowForm(false);
      router.refresh();
    } catch (err) {
      setError(err.message || "Erro ao criar lembrete");
    } finally {
      setSaving(false);
    }
  };

  const handleConcluir = async (id) => {
    try {
      await fetch(`/api/backend/lembretes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "concluido" }),
      });
      setLembretes((prev) => prev.map((l) => (l.id === id ? { ...l, concluido: true } : l)));
    } catch {
      setError("Erro ao concluir lembrete");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Excluir este lembrete?")) return;
    try {
      await fetch(`/api/backend/lembretes/${id}`, { method: "DELETE" });
      setLembretes((prev) => prev.filter((l) => l.id !== id));
    } catch {
      setError("Erro ao excluir lembrete");
    }
  };

  const formatDateLabel = (dateStr) => {
    if (!dateStr || dateStr === "sem-data") return "Sem data";
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (date.getTime() === today.getTime()) return "Hoje";
    if (date.getTime() === tomorrow.getTime()) return "Amanhã";
    return date.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  };

  const isOverdue = (dateStr) => {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    date.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const isToday = (dateStr) => {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date.getTime() === today.getTime();
  };

  const getPriorityStyle = (prioridade) => {
    switch (prioridade) {
      case "alta": return "bg-red-500";
      case "media": return "bg-orange-500";
      case "baixa": return "bg-blue-500";
      default: return "bg-cx-muted";
    }
  };

  const getPriorityBadge = (prioridade) => {
    switch (prioridade) {
      case "alta": return { bg: "bg-red-50", text: "text-red-700", label: "Alta" };
      case "media": return { bg: "bg-orange-50", text: "text-orange-700", label: "Média" };
      case "baixa": return { bg: "bg-blue-50", text: "text-blue-700", label: "Baixa" };
      default: return { bg: "bg-cx-blue-soft", text: "text-cx-blue", label: "Normal" };
    }
  };

  const getTipoIcon = (tipo) => {
    switch (tipo) {
      case "ligacao": return Phone;
      case "whatsapp": return MessageSquare;
      case "visita": return MapPin;
      case "documento": return FileText;
      case "reuniao": return Home;
      case "pagamento": return DollarSign;
      case "simulacao": return FileText;
      default: return Bell;
    }
  };

  const getTipoColor = (tipo) => {
    switch (tipo) {
      case "ligacao": return "bg-green-50 text-green-600";
      case "whatsapp": return "bg-green-50 text-green-600";
      case "visita": return "bg-blue-50 text-blue-600";
      case "documento": return "bg-orange-50 text-orange-600";
      case "reuniao": return "bg-blue-50 text-blue-600";
      case "pagamento": return "bg-emerald-50 text-emerald-600";
      case "simulacao": return "bg-orange-50 text-orange-600";
      default: return "bg-cx-blue-soft text-cx-blue";
    }
  };

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-cx-blue/5 via-white to-white p-8 md:p-12 border border-cx-border">
        <div className="relative z-10 max-w-2xl">
          <span className="inline-block px-3 py-1 text-xs font-semibold tracking-widest uppercase text-cx-blue bg-cx-blue-soft rounded-full mb-4">
            LEMBRETES
          </span>
          <h1 className="font-heading text-3xl md:text-4xl font-bold tracking-tight text-cx-text mb-3">
            Seu dia organizado,
            <br />
            <span className="text-cx-blue">mais negócios realizados.</span>
          </h1>
          <p className="text-cx-muted text-lg max-w-md">
            Acompanhe seus lembretes e nunca perca uma oportunidade.
          </p>
        </div>
        {/* Decorative house image placeholder */}
        <div className="absolute right-0 top-0 h-full w-1/2 md:w-2/5 opacity-60" aria-hidden="true">
          <div className="absolute inset-0 bg-gradient-to-l from-transparent via-white/50 to-white" />
          <svg className="absolute right-4 bottom-4 w-64 h-48 text-cx-blue/20" viewBox="0 0 200 150" fill="none" aria-hidden="true">
            <path d="M20 120 L20 50 L50 20 L180 20 L180 100 L150 100 L150 60 L50 60 L50 100 L20 100 Z" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.1"/>
            <rect x="40" y="40" width="30" height="30" rx="2" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.1"/>
            <rect x="80" y="40" width="30" height="30" rx="2" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.1"/>
            <rect x="120" y="40" width="30" height="30" rx="2" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.1"/>
            <rect x="40" y="80" width="110" height="40" rx="2" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.1"/>
          </svg>
        </div>
      </section>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={Calendar}
          iconBg="bg-cx-blue-soft"
          iconColor="text-cx-blue"
          value={ativos.filter(l => isToday(l.data)).length}
          label="Hoje"
        />
        <StatCard
          icon={AlertCircle}
          iconBg="bg-orange-50"
          iconColor="text-orange-600"
          value={ativos.filter(l => isOverdue(l.data)).length}
          label="Atrasados"
          valueColor="text-red-600"
        />
        <StatCard
          icon={Clock}
          iconBg="bg-cx-blue-soft"
          iconColor="text-cx-blue"
          value={ativos.filter(l => {
            if (!l.data) return false;
            const d = new Date(l.data);
            const today = new Date();
            today.setHours(0,0,0,0);
            const weekLater = new Date(today);
            weekLater.setDate(weekLater.getDate() + 7);
            d.setHours(0,0,0,0);
            return d > today && d <= weekLater;
          }).length}
          label="Esta semana"
        />
        <StatCard
          icon={Check}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
          value={concluidos.length}
          label="Concluídos"
        />
      </div>

      {/* Main Content + Right Panel */}
      <div className="grid lg:grid-cols-[1fr_320px] gap-6">
        {/* Center Column - Lista de Lembretes */}
        <div className="space-y-6">
          {groupedLembretes.length === 0 ? (
            <Card className="border-cx-border">
              <CardContent className="py-12 px-6 text-center">
                <div className="crm-avatar w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  {showConcluidos ? (
                    <Check className="w-8 h-8" strokeWidth={1.5} />
                  ) : (
                    <Clock className="w-8 h-8" strokeWidth={1.5} />
                  )}
                </div>
                <h3 className="text-cx-text font-medium text-lg mb-1">
                  {showConcluidos ? "Nenhum lembrete concluído" : "Nenhum lembrete ativo"}
                </h3>
                <p className="text-cx-muted">
                  {showConcluidos
                    ? "Lembretes concluídos aparecerão aqui."
                    : "Crie seu primeiro lembrete no painel ao lado."}
                </p>
              </CardContent>
            </Card>
          ) : (
            groupedLembretes.map(([dateKey, items]) => (
              <LembreteGroup
                key={dateKey}
                dateKey={dateKey}
                items={items}
                showConcluidos={showConcluidos}
                onConcluir={handleConcluir}
                onDelete={handleDelete}
              />
            ))
          )}

          {/* Próximos dias collapsed */}
          <Card className="border-cx-border">
            <CardContent className="py-4 px-6">
              <div className="flex items-center justify-between">
                <span className="text-cx-muted text-sm font-medium">Próximos dias</span>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-cx-muted text-sm mt-2">
                {ativos.filter(l => {
                  if (!l.data) return false;
                  const d = new Date(l.data);
                  const today = new Date();
                  today.setHours(0,0,0,0);
                  const weekLater = new Date(today);
                  weekLater.setDate(weekLater.getDate() + 7);
                  d.setHours(0,0,0,0);
                  return d > weekLater;
                }).length} lembretes após esta semana
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Right Panel */}
        <div className="space-y-6 lg:sticky lg:top-24">
          {/* Novo Lembrete Card */}
          <Card className="border-cx-border">
            <CardContent className="p-6">
              {showForm ? (
                <form onSubmit={handleCreate} className="space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <CardTitle className="text-lg">Novo lembrete</CardTitle>
                    <button
                      type="button"
                      onClick={() => setShowForm(false)}
                      className="p-1 rounded-lg text-cx-muted hover:bg-cx-bg hover:text-cx-text transition-colors"
                      aria-label="Fechar"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="space-y-2">
                    <label className="block">
                      <span className="crm-field-label text-sm block mb-1">Título *</span>
                      <input
                        type="text"
                        placeholder="Ex: Ligar para cliente"
                        value={form.titulo}
                        onChange={(e) => setForm(p => ({ ...p, titulo: e.target.value }))}
                        className="cx-input"
                        required
                        maxLength={100}
                        autoFocus
                      />
                    </label>
                    <label className="block">
                      <span className="crm-field-label text-sm block mb-1">Data *</span>
                      <input
                        type="date"
                        value={form.data}
                        onChange={(e) => setForm(p => ({ ...p, data: e.target.value }))}
                        className="cx-input"
                        required
                        min={new Date().toISOString().split("T")[0]}
                      />
                    </label>
                    <label className="block">
                      <span className="crm-field-label text-sm block mb-1">Horário</span>
                      <input
                        type="time"
                        value={form.hora || ""}
                        onChange={(e) => setForm(p => ({ ...p, hora: e.target.value }))}
                        className="cx-input"
                      />
                    </label>
                    <label className="block">
                      <span className="crm-field-label text-sm block mb-1">Prioridade</span>
                      <select
                        value={form.prioridade}
                        onChange={(e) => setForm(p => ({ ...p, prioridade: e.target.value }))}
                        className="cx-input"
                      >
                        <option value="baixa">Baixa</option>
                        <option value="media">Média</option>
                        <option value="alta">Alta</option>
                      </select>
                    </label>
                    <label className="block">
                      <span className="crm-field-label text-sm block mb-1">Tipo</span>
                      <select
                        value={form.tipo || ""}
                        onChange={(e) => setForm(p => ({ ...p, tipo: e.target.value }))}
                        className="cx-input"
                      >
                        <option value="">Selecione...</option>
                        <option value="ligacao">Ligação</option>
                        <option value="whatsapp">WhatsApp</option>
                        <option value="visita">Visita</option>
                        <option value="documento">Documentação</option>
                        <option value="reuniao">Reunião</option>
                        <option value="pagamento">Pagamento</option>
                        <option value="simulacao">Simulação</option>
                      </select>
                    </label>
                    <label className="block">
                      <span className="crm-field-label text-sm block mb-1">Descrição</span>
                      <textarea
                        placeholder="Detalhes opcionais..."
                        value={form.descricao}
                        onChange={(e) => setForm(p => ({ ...p, descricao: e.target.value }))}
                        className="cx-input"
                        rows={3}
                        maxLength={500}
                      />
                    </label>
                    <label className="block">
                      <span className="crm-field-label text-sm block mb-1">Cliente (opcional)</span>
                      <input
                        type="text"
                        placeholder="Nome do cliente"
                        value={form.cliente || ""}
                        onChange={(e) => setForm(p => ({ ...p, cliente: e.target.value }))}
                        className="cx-input"
                      />
                    </label>
                  </div>
                  {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
                  <div className="flex gap-2 pt-2">
                    <Button type="submit" className="flex-1" disabled={saving}>
                      {saving ? "Salvando..." : "Criar lembrete"}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                      Cancelar
                    </Button>
                  </div>
                </form>
              ) : (
                <Button
                  className="w-full justify-center gap-2 bg-cx-blue hover:bg-cx-blue-dark h-11 text-base"
                  onClick={() => setShowForm(true)}
                >
                  <Plus className="w-4 h-4" />
                  Novo lembrete
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Calendário */}
          <CalendarPanel />

          {/* Ações Rápidas */}
          <Card className="border-cx-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Ações rápidas</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 gap-3">
                <QuickAction icon={Phone} iconColor="text-green-600" bg="bg-green-50" label="Ligar" />
                <QuickAction icon={MessageSquare} iconColor="text-green-600" bg="bg-green-50" label="WhatsApp" />
                <QuickAction icon={User} iconColor="text-cx-blue" bg="bg-cx-blue-soft" label="Abrir lead" />
                <QuickAction icon={Plus} iconColor="text-orange-600" bg="bg-orange-50" label="Novo lembrete" />
              </div>
            </CardContent>
          </Card>

          {/* Atrasados Alert */}
          {ativos.some(l => isOverdue(l.data)) && (
            <Card className="border-cx-border bg-red-50 border-red-100">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                    <Zap className="w-5 h-5 text-red-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-red-700 font-semibold text-sm">Não deixe oportunidades para depois!</h4>
                    <p className="text-red-600 text-sm mt-1">
                      Você tem {ativos.filter(l => isOverdue(l.data)).length} lembrete(s) atrasado(s).
                    </p>
                    <Button variant="outline" size="sm" className="mt-3 border-red-200 text-red-700 hover:bg-red-50">
                      Ver agora →
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Motivational Card */}
          <Card className="border-cx-border">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-cx-blue-soft flex items-center justify-center">
                <svg className="w-6 h-6 text-cx-blue" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M3 3v18h18" />
                  <path d="m19 9-5 5-4-4-3 3" />
                </svg>
              </div>
              <p className="text-cx-text font-medium text-sm leading-relaxed">
                "Pequenas ações diárias<br />geram grandes resultados."
              </p>
              <div className="flex items-center justify-center gap-2 mt-4">
                <div className="h-0.5 w-16 bg-gradient-to-r from-cx-blue to-cx-orange" />
              </div>
              <p className="text-cx-blue font-bold text-lg mt-3">CAIXA</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ===== Sub-components =====

function StatCard({ icon: Icon, iconBg, iconColor, value, label, valueColor = "text-cx-text" }) {
  return (
    <Card className="border-cx-border">
      <CardContent className="p-5 flex items-center gap-4">
        <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center", iconBg)}>
          <Icon className={cn("w-5 h-5", iconColor)} strokeWidth={2} />
        </div>
        <div>
          <div className={cn("font-heading text-2xl font-bold", valueColor)}>{value}</div>
          <div className="text-cx-muted text-sm">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function LembreteGroup({ dateKey, items, showConcluidos, onConcluir, onDelete }) {
  const isTodayGroup = dateKey === new Date().toISOString().split("T")[0];
  const isTomorrowGroup = dateKey === new Date(Date.now() + 86400000).toISOString().split("T")[0];
  const label = dateKey === "sem-data" ? "Sem data" : 
    isTodayGroup ? `Hoje • ${new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long" })}` :
    isTomorrowGroup ? `Amanhã • ${new Date(Date.now() + 86400000).toLocaleDateString("pt-BR", { day: "2-digit", month: "long" })}` :
    new Date(dateKey).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
  
  const [expanded, setExpanded] = useState(!isTodayGroup && !isTomorrowGroup ? false : true);

  const sortedItems = [...items].sort((a, b) => {
    if (!a.data && !b.data) return 0;
    if (!a.data) return 1;
    if (!b.data) return -1;
    return new Date(a.data) - new Date(b.data);
  });

  return (
    <Card className="border-cx-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-heading text-lg font-semibold text-cx-text">{label}</span>
            <span className="px-2 py-0.5 text-xs font-medium bg-cx-bg text-cx-muted rounded-full">
              {items.length} lembrete{items.length !== 1 ? "s" : ""}
            </span>
          </div>
          {dateKey !== "sem-data" && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setExpanded(!expanded)}
              aria-expanded={expanded}
              aria-label={expanded ? "Recolher" : "Expandir"}
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {expanded && (
          <div className="space-y-1">
            {sortedItems.map((l, idx) => (
              <LembreteRow
                key={l.id}
                item={l}
                index={idx}
                isLast={idx === sortedItems.length - 1}
                onConcluir={onConcluir}
                onDelete={onDelete}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function LembreteRow({ item, index, isLast, onConcluir, onDelete }) {
  const overdue = !item.concluido && isOverdue(item.data);
  const today = isToday(item.data);
  const priorityStyle = getPriorityStyle(item.prioridade);
  const priorityBadge = getPriorityBadge(item.prioridade);
  const TipoIcon = getTipoIcon(item.tipo);
  const tipoColor = getTipoColor(item.tipo);

  const isOverdue = (dateStr) => {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    date.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };
  const isToday = (dateStr) => {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date.getTime() === today.getTime();
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-2 py-3 transition-colors",
        item.concluido ? "opacity-60 bg-cx-blue-soft/30" : "",
        !isLast && "border-b border-cx-border/50"
      )}
    >
      {/* Priority indicator */}
      <div className={cn("w-2.5 h-2.5 rounded-full flex-shrink-0 mt-0.5", priorityStyle)} />

      {/* Time */}
      <div className="w-14 text-right text-sm font-medium text-cx-text flex-shrink-0">
        {formatTime(item.data)}
      </div>

      {/* Type icon */}
      <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0", tipoColor)}>
        <TipoIcon className="w-4.5 h-4.5" strokeWidth={2} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn(
            "font-medium text-sm truncate",
            item.concluido ? "text-cx-muted line-through" : "text-cx-text"
          )}>
            {item.titulo}
          </span>
          {item.cliente && (
            <span className="text-xs text-cx-muted">• {item.cliente}</span>
          )}
        </div>
        {item.descricao && (
          <p className={cn("text-xs mt-0.5 truncate", item.concluido ? "text-cx-muted" : "text-cx-muted")}>
            {item.descricao}
          </p>
        )}
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <span className={cn("px-2 py-0.5 text-xs font-medium rounded-full", priorityBadge.bg, priorityBadge.text)}>
            {priorityBadge.label}
          </span>
          {item.tipo && (
            <span className={cn("px-2 py-0.5 text-xs font-medium rounded-full", tipoColor)}>
              {item.tipo.charAt(0).toUpperCase() + item.tipo.slice(1)}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {item.tipo === "ligacao" && (
          <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600 hover:bg-green-50" title="Ligar">
            <Phone className="w-4 h-4" />
          </Button>
        )}
        {(item.tipo === "whatsapp" || item.tipo === "ligacao") && (
          <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600 hover:bg-green-50" title="WhatsApp">
            <MessageSquare className="w-4 h-4" />
          </Button>
        )}
        {item.tipo === "visita" && (
          <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:bg-blue-50" title="Ver endereço">
            <MapPin className="w-4 h-4" />
          </Button>
        )}
        <Button variant="ghost" size="icon" className="h-8 w-8 text-cx-muted hover:bg-cx-bg hover:text-cx-text" title="Abrir">
          <User className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-cx-muted hover:bg-cx-bg hover:text-cx-text" title="Mais opções">
          <MoreVertical className="w-4 h-4" />
        </Button>
        {!item.concluido && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-emerald-600 hover:bg-emerald-50"
            onClick={() => onConcluir(item.id)}
            title="Concluir"
          >
            <Check className="w-4 h-4" strokeWidth={2.5} />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-red-600 hover:bg-red-50"
          onClick={() => onDelete(item.id)}
          title="Excluir"
        >
          <Trash2 className="w-4 h-4" strokeWidth={2} />
        </Button>
      </div>
    </div>
  );
}

function CalendarPanel() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  const monthName = currentMonth.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  // Mock: days with lembretes (in real app, this would come from data)
  const daysWithLembretes = new Set([3, 8, 12, 18, 23, today.getDate()]);

  const prevMonth = () => setCurrentMonth(d => new Date(d.getFullYear(), d.getMonth() - 1));
  const nextMonth = () => setCurrentMonth(d => new Date(d.getFullYear(), d.getMonth() + 1));
  const isCurrentMonth = currentMonth.getMonth() === today.getMonth() && currentMonth.getFullYear() === today.getFullYear();

  return (
    <Card className="border-cx-border">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Meu calendário</CardTitle>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={prevMonth} aria-label="Mês anterior">
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={nextMonth} aria-label="Próximo mês">
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="text-cx-muted text-sm mb-3">{monthName}</div>
        <div className="grid grid-cols-7 gap-1 text-center text-sm">
          {["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => (
            <div key={d} className="text-cx-muted text-xs font-medium py-1">{d}</div>
          ))}
          {Array.from({ length: firstDayOfMonth }, (_, i) => (
            <div key={`empty-${i}`} className="p-2" />
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const isToday = isCurrentMonth && day === today.getDate();
            const hasLembrete = daysWithLembretes.has(day);
            return (
              <button
                key={day}
                className={cn(
                  "relative p-2 rounded-lg transition-colors",
                  isToday ? "bg-cx-blue text-white font-semibold" : "text-cx-text hover:bg-cx-bg",
                  hasLembrete && !isToday && "after:content-[''] after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1.5 after:h-1.5 after:rounded-full after:bg-orange-500"
                )}
              >
                {day}
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function QuickAction({ icon: Icon, iconColor, bg, label }) {
  return (
    <button className={cn("flex flex-col items-center gap-2 p-3 rounded-xl border border-cx-border hover:border-cx-blue/50 transition-colors", bg)}>
      <Icon className={cn("w-5 h-5", iconColor)} strokeWidth={2} />
      <span className="text-xs font-medium text-cx-text">{label}</span>
    </button>
  );
}