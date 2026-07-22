import React, { useState, useMemo } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import {
  GripVertical, Eye, Edit, Trash2, Mail, Phone, Calendar,
  CreditCard, UserCircle, FileText, Clock, CheckCircle, X,
  AlertCircle, Target, Shield, DollarSign, Briefcase, MapPin,
  ArrowRight, Users, Zap, TrendingUp, ChevronDown, ChevronUp,
  Search, Filter, AlertTriangle, Flame, Timer, BarChart3
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";

// ─── Design tokens ────────────────────────────────────────────────────────────
const CARD = 'rgba(255,255,255,0.06)';
const CARD_HOVER = 'rgba(255,255,255,0.09)';
const BORDER = 'rgba(255,255,255,0.10)';
const INPUT_BG = 'rgba(255,255,255,0.05)';
const ACCENT_GRADIENT = 'linear-gradient(135deg, #F97316, #EA580C)';

const statusConfig = {
  aguardando_aprovacao:        { name: "Aguardando",         short: "AGU", color: '#eab308', icon: Clock, wipLimit: 15 },
  proposta_apresentada:        { name: "Proposta",           short: "PRO", color: '#3b82f6', icon: FileText, wipLimit: 10 },
  documentacao_pendente:       { name: "Doc. Pendente",      short: "DOC", color: '#f97316', icon: AlertCircle, wipLimit: 10 },
  visita_efetuada:             { name: "Visita",             short: "VIS", color: '#8b5cf6', icon: Eye, wipLimit: 8 },
  aguardando_cancelamento_qv:  { name: "Cancel./QV",        short: "C/Q", color: '#6b7280', icon: Clock, wipLimit: 5 },
  condicionado:                { name: "Condicionado",       short: "CON", color: '#d97706', icon: AlertCircle, wipLimit: 8 },
  cliente_aprovado:            { name: "Aprovado",           short: "APR", color: '#10b981', icon: CheckCircle, wipLimit: 0 },
  reprovado:                   { name: "Reprovado",          short: "REP", color: '#ef4444', icon: X, wipLimit: 0 },
  reserva:                     { name: "Reserva",            short: "RES", color: '#6366f1', icon: FileText, wipLimit: 10 },
  conferencia_documento:       { name: "Conf. Doc.",         short: "CFD", color: '#7c3aed', icon: FileText, wipLimit: 8 },
  nao_descondiciona:           { name: "N. Descondiciona",   short: "NDE", color: '#ec4899', icon: X, wipLimit: 0 },
  conformidade:                { name: "Conformidade",       short: "CFM", color: '#06b6d4', icon: CheckCircle, wipLimit: 10 },
  concluido:                   { name: "Concluído",          short: "FIN", color: '#059669', icon: CheckCircle, wipLimit: 0 },
  nao_deu_continuidade:        { name: "S/ Continuidade",    short: "S/C", color: '#64748b', icon: X, wipLimit: 0 },
};

const kanbanColumns = Object.keys(statusConfig);
const AVATAR_COLORS = ['#F97316', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#06b6d4', '#eab308'];

// ─── Card aging helper ────────────────────────────────────────────────────────
const getAgingInfo = (createdAt) => {
  if (!createdAt) return { days: 0, level: 'fresh', color: '#10b981', label: 'Novo' };
  const days = Math.floor((new Date() - new Date(createdAt)) / (1000 * 60 * 60 * 24));
  if (days <= 3) return { days, level: 'fresh', color: '#10b981', label: days === 0 ? 'Hoje' : `${days}d` };
  if (days <= 7) return { days, level: 'warm', color: '#eab308', label: `${days}d` };
  if (days <= 14) return { days, level: 'aging', color: '#f97316', label: `${days}d` };
  return { days, level: 'stale', color: '#ef4444', label: `${days}d` };
};

// ─── Summary bar ──────────────────────────────────────────────────────────────
const KanbanSummary = ({ clientesPorStatus, totalClientes }) => {
  const aging = useMemo(() => {
    let fresh = 0, warm = 0, old = 0;
    Object.values(clientesPorStatus).flat().forEach(c => {
      const a = getAgingInfo(c.created_at);
      if (a.level === 'fresh') fresh++;
      else if (a.level === 'warm') warm++;
      else old++;
    });
    return { fresh, warm, old };
  }, [clientesPorStatus]);

  return (
    <div className="flex items-center gap-2 mb-3 overflow-x-auto pb-1 kanban-scroll flex-wrap sm:flex-nowrap">
      {/* Total */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg flex-shrink-0"
        style={{ backgroundColor: CARD, border: `1px solid ${BORDER}` }}>
        <Users className="w-3 h-3 text-white/40" />
        <span className="text-[11px] font-bold text-white">{totalClientes}</span>
        <span className="text-[9px] text-white/30">total</span>
      </div>

      {/* Aging summary */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <div className="flex items-center gap-1 px-2 py-1 rounded-md" style={{ backgroundColor: 'rgba(16,185,129,0.1)' }}>
          <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
          <span className="text-[9px] font-bold text-green-400">{aging.fresh}</span>
        </div>
        <div className="flex items-center gap-1 px-2 py-1 rounded-md" style={{ backgroundColor: 'rgba(234,179,8,0.1)' }}>
          <div className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
          <span className="text-[9px] font-bold text-yellow-400">{aging.warm}</span>
        </div>
        <div className="flex items-center gap-1 px-2 py-1 rounded-md" style={{ backgroundColor: 'rgba(239,68,68,0.1)' }}>
          <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
          <span className="text-[9px] font-bold text-red-400">{aging.old}</span>
        </div>
      </div>

      {/* Per-status counters */}
      {kanbanColumns.map(key => {
        const count = clientesPorStatus[key]?.length || 0;
        if (count === 0) return null;
        const info = statusConfig[key];
        return (
          <div key={key} className="flex items-center gap-1 px-2 py-1 rounded-md flex-shrink-0"
            style={{ backgroundColor: `${info.color}10`, border: `1px solid ${info.color}15` }}>
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: info.color }} />
            <span className="text-[9px] font-bold" style={{ color: info.color }}>{count}</span>
            <span className="text-[7px] text-white/25">{info.short}</span>
          </div>
        );
      })}
    </div>
  );
};

// ─── Quick filters ────────────────────────────────────────────────────────────
const QuickFilters = ({ search, setSearch, agingFilter, setAgingFilter, responsavelFilter, setResponsavelFilter, responsaveis }) => (
  <div className="flex items-center gap-2 mb-3 overflow-x-auto pb-1 kanban-scroll">
    {/* Search */}
    <div className="relative flex-shrink-0">
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-white/25" />
      <input type="text" placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)}
        className="pl-7 pr-3 py-1.5 rounded-lg text-[10px] text-white placeholder-white/25 w-36 focus:outline-none focus:ring-1 focus:ring-[#F97316]/50"
        style={{ backgroundColor: INPUT_BG, border: `1px solid ${BORDER}` }} />
    </div>

    {/* Aging filter */}
    <div className="flex items-center gap-0.5 flex-shrink-0">
      {[
        { key: 'all', label: 'Todos', color: 'white' },
        { key: 'fresh', label: 'Novos', color: '#10b981' },
        { key: 'aging', label: 'Atrasados', color: '#ef4444' },
      ].map(f => (
        <button key={f.key} onClick={() => setAgingFilter(f.key)}
          className="px-2 py-1 rounded-md text-[9px] font-bold transition-all"
          style={{
            backgroundColor: agingFilter === f.key ? `${f.color === 'white' ? '#F97316' : f.color}20` : 'transparent',
            color: agingFilter === f.key ? (f.color === 'white' ? '#F97316' : f.color) : 'rgba(255,255,255,0.3)',
            border: `1px solid ${agingFilter === f.key ? (f.color === 'white' ? '#F97316' : f.color) + '30' : 'transparent'}`,
          }}>
          {f.label}
        </button>
      ))}
    </div>

    {/* Responsável filter */}
    {responsaveis.length > 0 && (
      <select value={responsavelFilter} onChange={(e) => setResponsavelFilter(e.target.value)}
        className="px-2 py-1.5 rounded-lg text-[10px] text-white focus:outline-none focus:ring-1 focus:ring-[#F97316]/50 [&>option]:bg-white [&>option]:text-gray-800"
        style={{ backgroundColor: INPUT_BG, border: `1px solid ${BORDER}` }}>
        <option value="">Todos responsáveis</option>
        {responsaveis.map(r => (
          <option key={r.id} value={r.id}>{r.name}</option>
        ))}
      </select>
    )}
  </div>
);

// ─── Main ─────────────────────────────────────────────────────────────────────
const KanbanClientes = ({ clientes = [], onViewDetails, onViewNotas, onEdit, onDelete, onStatusChange, user }) => {
  const { hasRole } = useAuth();
  const canEditStatus = hasRole('administrador') || hasRole('correspondente');
  const [localClientes, setLocalClientes] = useState(clientes);
  const [collapsedCols, setCollapsedCols] = useState({});
  const [search, setSearch] = useState('');
  const [agingFilter, setAgingFilter] = useState('all');
  const [responsavelFilter, setResponsavelFilter] = useState('');

  React.useEffect(() => { setLocalClientes(clientes); }, [clientes]);

  // Unique responsáveis
  const responsaveis = useMemo(() => {
    const map = {};
    localClientes.forEach(c => {
      if (c.user?.id) {
        map[c.user.id] = { id: c.user.id, name: `${c.user.first_name || ''} ${c.user.last_name || ''}`.trim() || c.user.username || 'N/A' };
      }
    });
    return Object.values(map);
  }, [localClientes]);

  // Filtered clientes
  const filteredClientes = useMemo(() => {
    let result = localClientes;
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(c => c.nome?.toLowerCase().includes(s) || c.email?.toLowerCase().includes(s) || c.cpf?.includes(s) || c.telefone?.includes(s));
    }
    if (agingFilter === 'fresh') {
      result = result.filter(c => getAgingInfo(c.created_at).days <= 3);
    } else if (agingFilter === 'aging') {
      result = result.filter(c => getAgingInfo(c.created_at).days > 7);
    }
    if (responsavelFilter) {
      result = result.filter(c => String(c.user?.id) === responsavelFilter);
    }
    return result;
  }, [localClientes, search, agingFilter, responsavelFilter]);

  const clientesPorStatus = useMemo(() => {
    const g = {};
    kanbanColumns.forEach(k => { g[k] = []; });
    filteredClientes.forEach(c => {
      if (c.status && g.hasOwnProperty(c.status)) g[c.status].push(c);
      else g[kanbanColumns[0]].push(c);
    });
    return g;
  }, [filteredClientes]);

  const toggleCollapse = (key) => setCollapsedCols(prev => ({ ...prev, [key]: !prev[key] }));

  const handleDragEnd = async (result) => {
    const { destination, source, draggableId } = result;
    if (!destination || !canEditStatus) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const clienteId = parseInt(draggableId);
    const newStatus = destination.droppableId;
    let updated = Array.from(localClientes);
    const idx = updated.findIndex(c => c.id === clienteId);
    if (idx === -1) return;
    const moving = { ...updated[idx], status: newStatus };
    updated.splice(idx, 1);

    const inNew = updated.filter(c => c.status === newStatus);
    let insertAt = updated.length;
    let count = 0;
    for (let i = 0; i < updated.length; i++) {
      if (updated[i].status === newStatus) {
        if (count === destination.index) { insertAt = i; break; }
        count++;
      }
    }
    if (inNew.length === 0) insertAt = updated.length;
    updated.splice(insertAt, 0, moving);
    setLocalClientes(updated);

    if (onStatusChange) {
      try { await onStatusChange(clienteId, newStatus); }
      catch { setLocalClientes(localClientes); }
    }
  };

  // ─── Card ──────────────────────────────────────────────────────────────────
  const KanbanCard = ({ cliente, index }) => {
    const info = statusConfig[cliente.status] || statusConfig.aguardando_aprovacao;
    const notasCount = Array.isArray(cliente.notas) ? cliente.notas.length : 0;
    const colorIdx = (cliente.user?.id || cliente.id || 0) % AVATAR_COLORS.length;
    const aging = getAgingInfo(cliente.created_at);
    const [expanded, setExpanded] = useState(false);

    return (
      <Draggable draggableId={cliente.id.toString()} index={index} isDragDisabled={!canEditStatus}>
        {(provided, snapshot) => (
          <div ref={provided.innerRef} {...provided.draggableProps}
            className={`rounded-xl overflow-hidden transition-all duration-200 group ${
              snapshot.isDragging ? 'shadow-2xl shadow-[#F97316]/30 scale-[1.04] z-50' : ''
            }`}
            style={{
              ...provided.draggableProps.style,
              backgroundColor: snapshot.isDragging ? 'rgba(255,255,255,0.14)' : CARD,
              border: `1px solid ${snapshot.isDragging ? 'rgba(249,115,22,0.4)' : BORDER}`,
            }}>

            {/* Color strip + aging indicator */}
            <div className="flex h-1">
              <div className="flex-1" style={{ backgroundColor: info.color }} />
              <div className="w-8" style={{ backgroundColor: aging.color }} />
            </div>

            <div className="p-2.5">
              {/* Header */}
              <div className="flex items-start gap-2 mb-1.5">
                {/* Avatar with aging ring */}
                <div className="relative flex-shrink-0">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black text-white shadow-sm"
                    style={{ background: `linear-gradient(135deg, ${AVATAR_COLORS[colorIdx]}, ${AVATAR_COLORS[colorIdx]}77)` }}>
                    {cliente.nome?.charAt(0)?.toUpperCase() || "?"}
                  </div>
                  {/* Aging dot */}
                  <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2"
                    style={{ backgroundColor: aging.color, borderColor: '#0B1426' }}
                    title={`${aging.days} dias no sistema`} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <h4 className="text-[11px] font-bold text-white truncate group-hover:text-[#F97316] transition-colors">
                      {cliente.nome || "Sem nome"}
                    </h4>
                    {cliente.tela_aprovacao && <Shield className="w-2.5 h-2.5 flex-shrink-0 text-green-400" />}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {cliente.user && (
                      <span className="text-[8px] text-white/25 truncate">
                        {`${cliente.user.first_name || ''}`.trim() || 'N/A'}
                      </span>
                    )}
                    <span className="text-[7px] font-black px-1 py-0.5 rounded"
                      style={{ backgroundColor: `${aging.color}15`, color: aging.color }}>
                      {aging.label}
                    </span>
                  </div>
                </div>

                {/* Controls */}
                <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
                  <div {...provided.dragHandleProps}
                    className={`p-0.5 rounded transition-opacity ${canEditStatus ? 'opacity-20 group-hover:opacity-70 cursor-grab active:cursor-grabbing' : 'opacity-10'}`}>
                    <GripVertical className="w-3 h-3 text-white" />
                  </div>
                  {notasCount > 0 && (
                    <button onClick={(e) => { e.stopPropagation(); onViewNotas?.(cliente.notas); }}
                      className="relative p-0.5">
                      <FileText className="w-2.5 h-2.5 text-white/30" />
                      <span className="absolute -top-1 -right-1.5 text-[6px] font-black min-w-[10px] h-[10px] flex items-center justify-center rounded-full text-white bg-red-500">{notasCount}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Quick info */}
              <div className="space-y-0.5 mb-1.5">
                <div className="flex items-center gap-1 text-[8px] text-white/30">
                  <Phone className="w-2 h-2 flex-shrink-0" /><span className="truncate">{cliente.telefone || "—"}</span>
                </div>
                {cliente.valor_renda && (
                  <div className="flex items-center gap-1">
                    <DollarSign className="w-2 h-2 flex-shrink-0" style={{ color: '#10b981' }} />
                    <span className="text-[9px] font-bold" style={{ color: '#10b981' }}>
                      R$ {parseFloat(cliente.valor_renda).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </span>
                    {cliente.renda_tipo && (
                      <span className="text-[6px] font-black px-1 py-0.5 rounded"
                        style={{ backgroundColor: cliente.renda_tipo === 'formal' ? 'rgba(16,185,129,0.12)' : 'rgba(234,179,8,0.12)',
                                 color: cliente.renda_tipo === 'formal' ? '#10b981' : '#eab308' }}>
                        {cliente.renda_tipo.toUpperCase()}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Expandable */}
              <AnimatePresence>
                {expanded && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                    <div className="space-y-0.5 pb-1.5 mb-1.5" style={{ borderBottom: `1px solid ${BORDER}` }}>
                      <div className="flex items-center gap-1 text-[8px] text-white/25"><Mail className="w-2 h-2" /><span className="truncate">{cliente.email || "—"}</span></div>
                      {cliente.cpf && <div className="flex items-center gap-1 text-[8px] text-white/20 font-mono"><CreditCard className="w-2 h-2" />{cliente.cpf}</div>}
                      {cliente.profissao && <div className="flex items-center gap-1 text-[8px] text-white/20"><Briefcase className="w-2 h-2" /><span className="truncate">{cliente.profissao}</span></div>}
                      {cliente.naturalidade && <div className="flex items-center gap-1 text-[8px] text-white/20"><MapPin className="w-2 h-2" /><span className="truncate">{cliente.naturalidade}</span></div>}
                      {cliente.estado_civil && <div className="flex items-center gap-1 text-[8px] text-white/20"><Users className="w-2 h-2" />{cliente.estado_civil.charAt(0).toUpperCase() + cliente.estado_civil.slice(1)}</div>}
                      <div className="flex items-center gap-1 text-[8px] text-white/20"><Calendar className="w-2 h-2" />{cliente.created_at ? new Date(cliente.created_at).toLocaleDateString('pt-BR') : "—"}</div>
                      <div className="flex flex-wrap gap-1 pt-0.5">
                        {(cliente.possui_carteira_mais_tres_anos === true || cliente.possui_carteira_mais_tres_anos === 1) && (
                          <span className="text-[6px] font-bold px-1 py-0.5 rounded" style={{ backgroundColor: 'rgba(16,185,129,0.1)', color: '#10b981' }}>FGTS</span>
                        )}
                        {(cliente.possui_dependente === true || cliente.possui_dependente === 1) && (
                          <span className="text-[6px] font-bold px-1 py-0.5 rounded" style={{ backgroundColor: 'rgba(6,182,212,0.1)', color: '#06b6d4' }}>DEP</span>
                        )}
                        {(cliente.possui_fiador === true || cliente.possui_fiador === 1) && (
                          <span className="text-[6px] font-bold px-1 py-0.5 rounded" style={{ backgroundColor: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}>FIADOR</span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Actions */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-0.5">
                  <button onClick={(e) => { e.stopPropagation(); onViewDetails?.(cliente); }}
                    className="flex items-center gap-0.5 px-1.5 py-1 rounded-md text-[8px] font-semibold text-white/35 hover:text-[#3b82f6] hover:bg-[#3b82f6]/10 transition-all">
                    <Eye className="w-2.5 h-2.5" />Ver
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
                    className="flex items-center gap-0.5 px-1.5 py-1 rounded-md text-[8px] font-semibold text-white/25 hover:text-white/50 hover:bg-white/[0.04] transition-all">
                    {expanded ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
                  </button>
                </div>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={(e) => { e.stopPropagation(); onEdit?.(cliente); }}
                    className="p-1 rounded-md text-white/25 hover:text-[#F97316] hover:bg-[#F97316]/10 transition-all">
                    <Edit className="w-2.5 h-2.5" />
                  </button>
                  {user?.is_administrador && (
                    <button onClick={(e) => { e.stopPropagation(); onDelete?.(cliente.id); }}
                      className="p-1 rounded-md text-white/25 hover:text-[#ef4444] hover:bg-[#ef4444]/10 transition-all">
                      <Trash2 className="w-2.5 h-2.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </Draggable>
    );
  };

  // ─── Column ──────────────────────────────────────────────────────────────────
  const KanbanColumn = ({ statusKey, clientes: colClientes }) => {
    const info = statusConfig[statusKey];
    if (!info) return null;
    const Icon = info.icon;
    const isCollapsed = collapsedCols[statusKey];
    const wipLimit = info.wipLimit;
    const wipPct = wipLimit > 0 ? Math.min(100, (colClientes.length / wipLimit) * 100) : 0;
    const isOverWip = wipLimit > 0 && colClientes.length > wipLimit;
    const isNearWip = wipLimit > 0 && colClientes.length >= wipLimit * 0.8;

    // Column stats
    const totalRenda = colClientes.reduce((s, c) => s + (parseFloat(c.valor_renda) || 0), 0);
    const avgDays = colClientes.length > 0
      ? Math.round(colClientes.reduce((s, c) => s + (getAgingInfo(c.created_at).days), 0) / colClientes.length)
      : 0;

    return (
      <div className={`flex-shrink-0 transition-all duration-300 ${isCollapsed ? 'w-12' : 'w-[280px]'}`}>
        <div className={`rounded-2xl h-full backdrop-blur-md overflow-hidden relative ${isOverWip ? 'ring-1 ring-red-500/30' : ''}`}
          style={{ backgroundColor: CARD, border: `1px solid ${isOverWip ? 'rgba(239,68,68,0.3)' : BORDER}` }}>

          {/* Glow */}
          <div className="absolute top-0 left-0 right-0 h-20 pointer-events-none"
            style={{ background: `linear-gradient(180deg, ${info.color}06 0%, transparent 100%)` }} />

          {/* Header */}
          <div className="relative z-10 cursor-pointer" onClick={() => toggleCollapse(statusKey)}>
            {isCollapsed ? (
              <div className="flex flex-col items-center gap-2 px-1 py-4">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: info.color }} />
                <span className="text-[7px] font-black text-white/40" style={{ writingMode: 'vertical-rl' }}>{info.name}</span>
                <span className="text-[9px] font-black px-1.5 py-0.5 rounded"
                  style={{ backgroundColor: `${info.color}20`, color: info.color }}>{colClientes.length}</span>
              </div>
            ) : (
              <div className="px-3 py-2.5" style={{ borderBottom: `1px solid ${BORDER}` }}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
                      style={{ background: `linear-gradient(135deg, ${info.color}, ${info.color}88)` }}>
                      <Icon className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-[11px] font-bold text-white truncate">{info.name}</span>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {isOverWip && <AlertTriangle className="w-3 h-3 text-red-400" />}
                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${isOverWip ? 'animate-pulse' : ''}`}
                      style={{ backgroundColor: isOverWip ? 'rgba(239,68,68,0.2)' : `${info.color}18`,
                               color: isOverWip ? '#ef4444' : info.color }}>
                      {colClientes.length}{wipLimit > 0 ? `/${wipLimit}` : ''}
                    </span>
                  </div>
                </div>

                {/* WIP progress bar */}
                {wipLimit > 0 && (
                  <div className="w-full h-1 rounded-full overflow-hidden mb-1.5" style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}>
                    <motion.div initial={{ width: 0 }} animate={{ width: `${wipPct}%` }}
                      transition={{ duration: 0.5 }} className="h-full rounded-full"
                      style={{ backgroundColor: isOverWip ? '#ef4444' : isNearWip ? '#eab308' : info.color }} />
                  </div>
                )}

                {/* Column stats */}
                <div className="flex items-center gap-3 text-[8px] text-white/20">
                  {totalRenda > 0 && (
                    <span className="flex items-center gap-0.5">
                      <DollarSign className="w-2 h-2" />R$ {(totalRenda / 1000).toFixed(0)}k
                    </span>
                  )}
                  {avgDays > 0 && (
                    <span className="flex items-center gap-0.5">
                      <Timer className="w-2 h-2" />~{avgDays}d média
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Droppable */}
          {!isCollapsed && (
            <Droppable droppableId={statusKey}>
              {(provided, snapshot) => (
                <div ref={provided.innerRef} {...provided.droppableProps}
                  className={`p-1.5 space-y-1.5 max-h-[calc(100vh-320px)] overflow-y-auto kanban-scroll transition-all duration-200 ${
                    snapshot.isDraggingOver ? 'bg-[#F97316]/[0.04]' : ''
                  }`}
                  style={{ minHeight: 80 }}>
                  {colClientes.map((cliente, index) => (
                    <KanbanCard key={cliente.id} cliente={cliente} index={index} />
                  ))}
                  {provided.placeholder}

                  {colClientes.length === 0 && !snapshot.isDraggingOver && (
                    <div className="text-center py-8 px-2">
                      <div className="w-8 h-8 rounded-lg mx-auto mb-1.5 flex items-center justify-center"
                        style={{ backgroundColor: `${info.color}08` }}>
                        <Icon className="w-4 h-4" style={{ color: `${info.color}25` }} />
                      </div>
                      <p className="text-[9px] text-white/12">Vazio</p>
                    </div>
                  )}
                  {colClientes.length === 0 && snapshot.isDraggingOver && (
                    <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }}
                      className="text-center py-8 rounded-xl"
                      style={{ border: `2px dashed ${info.color}40`, backgroundColor: `${info.color}05` }}>
                      <ArrowRight className="w-4 h-4 mx-auto mb-1" style={{ color: info.color }} />
                      <p className="text-[9px] font-bold" style={{ color: info.color }}>Solte aqui</p>
                    </motion.div>
                  )}
                </div>
              )}
            </Droppable>
          )}

          {/* Collapsed droppable */}
          {isCollapsed && (
            <Droppable droppableId={statusKey}>
              {(provided, snapshot) => (
                <div ref={provided.innerRef} {...provided.droppableProps}
                  className={`p-1 min-h-[40px] transition-colors ${snapshot.isDraggingOver ? 'bg-[#F97316]/10' : ''}`}>
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          )}
        </div>
      </div>
    );
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <KanbanSummary clientesPorStatus={clientesPorStatus} totalClientes={filteredClientes.length} />
      <QuickFilters search={search} setSearch={setSearch}
        agingFilter={agingFilter} setAgingFilter={setAgingFilter}
        responsavelFilter={responsavelFilter} setResponsavelFilter={setResponsavelFilter}
        responsaveis={responsaveis} />

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-2 overflow-x-auto pb-4 kanban-scroll">
          {kanbanColumns.map(key => (
            <KanbanColumn key={key} statusKey={key}
              clientes={Array.isArray(clientesPorStatus[key]) ? clientesPorStatus[key] : []} />
          ))}
        </div>
      </DragDropContext>

      <style>{`
        .kanban-scroll::-webkit-scrollbar { height: 5px; width: 3px; }
        .kanban-scroll::-webkit-scrollbar-track { background: rgba(255,255,255,0.02); border-radius: 4px; }
        .kanban-scroll::-webkit-scrollbar-thumb { background: rgba(249,115,22,0.15); border-radius: 4px; }
        .kanban-scroll::-webkit-scrollbar-thumb:hover { background: rgba(249,115,22,0.3); }
      `}</style>
    </>
  );
};

export default KanbanClientes;
