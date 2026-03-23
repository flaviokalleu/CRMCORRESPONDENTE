import React, { useState, useEffect, useMemo, useCallback } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import {
  Edit, Trash2, Search, Eye, User, Calendar, Phone, Mail, Loader2,
  ChevronDown, X, FileText, UserCircle, CreditCard, Filter, MoreVertical,
  Plus, RefreshCw, Check, AlertCircle, Clock, Shield, CheckCircle, MapPin
} from "lucide-react";

import ModalCliente from "./ModalCliente";
import ModalNotas from "./ModalNotas";
import ModalEditarCliente from "./ModalEditarCliente";
import KanbanClientes from "./KanbanClientes";
import * as XLSX from "xlsx";

import { SafeList, SafeTable, useTranslationProtection } from "./SafeComponents";
import { generateStableKey } from "../utils/domUtils";

// ─── Design tokens ────────────────────────────────────────────────────────────
const CARD = 'rgba(255,255,255,0.06)';
const BORDER = 'rgba(255,255,255,0.10)';
const INPUT_BG = 'rgba(255,255,255,0.05)';
const ACCENT_GRADIENT = 'linear-gradient(135deg, #F97316, #EA580C)';
const inputStyle = { backgroundColor: INPUT_BG, border: `1px solid ${BORDER}` };

const statusMap = {
  aguardando_aprovacao: { name: "Aguardando Aprovação", color: "#eab308", icon: Clock, priority: 1 },
  proposta_apresentada: { name: "Proposta Apresentada", color: "#3b82f6", icon: FileText, priority: 2 },
  documentacao_pendente: { name: "Documentação Pendente", color: "#f97316", icon: AlertCircle, priority: 3 },
  visita_efetuada: { name: "Visita Efetuada", color: "#8b5cf6", icon: UserCircle, priority: 4 },
  aguardando_cancelamento_qv: { name: "Aguardando Cancelamento/QV", color: "#6b7280", icon: Clock, priority: 5 },
  condicionado: { name: "Condicionado", color: "#d97706", icon: AlertCircle, priority: 6 },
  cliente_aprovado: { name: "Aprovado", color: "#10b981", icon: Check, priority: 7 },
  reprovado: { name: "Reprovado", color: "#ef4444", icon: X, priority: 8 },
  reserva: { name: "Reserva", color: "#6366f1", icon: FileText, priority: 9 },
  conferencia_documento: { name: "Conferência de Documento", color: "#7c3aed", icon: FileText, priority: 10 },
  nao_descondiciona: { name: "Não Descondiciona", color: "#ec4899", icon: X, priority: 11 },
  conformidade: { name: "Conformidade", color: "#06b6d4", icon: Check, priority: 12 },
  concluido: { name: "Venda Concluída", color: "#059669", icon: Check, priority: 13 },
  nao_deu_continuidade: { name: "Não Deu Continuidade", color: "#64748b", icon: X, priority: 14 },
  aguardando_reserva_orcamentaria: { name: "Aguardando Reserva Orçamentária", color: "#6366f1", icon: CreditCard, priority: 15 },
  fechamento_proposta: { name: "Fechamento Proposta", color: "#14b8a6", icon: FileText, priority: 16 },
  processo_em_aberto: { name: "Processo Aberto", color: "#78716c", icon: FileText, priority: 17 },
};

// ─── Status Button ───────────────────────────────────────────────────────────
const StatusButton = ({ status, onChange, disabled, clienteId, onStatusUpdate, canChangeStatus }) => {
  const info = statusMap[status] || statusMap.aguardando_aprovacao;
  const [isEditing, setIsEditing] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState(status);
  const [isLoading, setIsLoading] = useState(false);
  const IconComponent = info.icon;
  const canEdit = canChangeStatus && !disabled;

  const handleSave = async () => {
    if (selectedStatus === status) { setIsEditing(false); return; }
    setIsLoading(true);
    try {
      await axios.patch(
        `${process.env.REACT_APP_API_URL}/clientes/${clienteId}/status`,
        { status: selectedStatus },
        { headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` } }
      );
      if (onStatusUpdate) onStatusUpdate(clienteId, selectedStatus);
      if (onChange) onChange(selectedStatus);
      setIsEditing(false);
    } catch (error) {
      setSelectedStatus(status);
      alert(error.code === 'ERR_NETWORK' ? 'Erro de rede.' : 'Erro ao atualizar status.');
    }
    setIsLoading(false);
  };

  if (isEditing && canEdit) {
    return (
      <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="flex flex-col gap-1.5 min-w-0 z-50 w-full max-w-[200px]">
        <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} autoFocus
          className="px-2 py-1.5 rounded-lg text-xs font-medium transition-all w-full [&>option]:bg-white [&>option]:text-gray-800"
          style={{ backgroundColor: INPUT_BG, border: `1px solid ${BORDER}`, color: '#fff' }}>
          {Object.entries(statusMap).map(([key, value]) => (
            <option key={key} value={key}>{value.name}</option>
          ))}
        </select>
        <div className="flex gap-1">
          <motion.button whileTap={{ scale: 0.95 }} onClick={handleSave} disabled={isLoading}
            className="flex-1 px-2 py-1 rounded-lg text-[10px] font-bold text-white disabled:opacity-50"
            style={{ background: ACCENT_GRADIENT }}>
            {isLoading ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : "Salvar"}
          </motion.button>
          <motion.button whileTap={{ scale: 0.95 }}
            onClick={() => { setIsEditing(false); setSelectedStatus(status); }}
            className="px-2 py-1 rounded-lg text-[10px] font-medium text-white/60"
            style={{ backgroundColor: CARD, border: `1px solid ${BORDER}` }}>
            <X className="w-3 h-3" />
          </motion.button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.button whileHover={{ scale: canEdit ? 1.02 : 1 }} whileTap={{ scale: canEdit ? 0.98 : 1 }}
      onClick={() => canEdit && setIsEditing(true)}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${canEdit ? 'cursor-pointer hover:brightness-110' : 'cursor-not-allowed opacity-75'}`}
      style={{ backgroundColor: `${info.color}20`, color: info.color, border: `1px solid ${info.color}30` }}
      title={canEdit ? "Clique para alterar status" : "Sem permissão para alterar"}>
      <IconComponent className="w-3 h-3 flex-shrink-0" />
      <span className="truncate">{info.name}</span>
    </motion.button>
  );
};

// ─── Avatar ──────────────────────────────────────────────────────────────────
const AVATAR_COLORS = ['#F97316', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#06b6d4', '#eab308'];
const UserAvatar = ({ user, size = "sm", notasCount = 0 }) => {
  const sizes = { sm: "w-9 h-9 text-[11px]", md: "w-11 h-11 text-xs", lg: "w-13 h-13 text-sm" };
  const initials = user ? `${user.first_name?.[0] || ""}${user.last_name?.[0] || ""}`.toUpperCase() : "?";
  const colorIdx = user?.id ? user.id % AVATAR_COLORS.length : 0;
  const bg = user ? `linear-gradient(135deg, ${AVATAR_COLORS[colorIdx]}, ${AVATAR_COLORS[colorIdx]}99)` : 'rgba(107,114,128,0.4)';

  return (
    <div className={`${sizes[size]} rounded-xl flex items-center justify-center text-white font-bold relative flex-shrink-0 shadow-lg`}
      style={{ background: bg }}
      title={user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username : ''}>
      {initials}
      {notasCount > 0 && (
        <span className="absolute -top-1.5 -right-1.5 text-white text-[7px] min-w-[18px] h-[18px] flex items-center justify-center rounded-full border-2 border-[#0B1426] font-black shadow-md"
          style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}>
          {notasCount}
        </span>
      )}
    </div>
  );
};

// ─── Stats Bar ───────────────────────────────────────────────────────────────
const StatsBar = ({ clientes }) => {
  const stats = useMemo(() => {
    const total = clientes.length;
    const aprovados = clientes.filter(c => c.status === 'cliente_aprovado' || c.status === 'concluido').length;
    const aguardando = clientes.filter(c => c.status === 'aguardando_aprovacao').length;
    const reprovados = clientes.filter(c => c.status === 'reprovado').length;
    const hoje = clientes.filter(c => c.created_at && new Date(c.created_at).toDateString() === new Date().toDateString()).length;
    return [
      { label: 'Total', value: total, color: '#3b82f6' },
      { label: 'Aprovados', value: aprovados, color: '#10b981' },
      { label: 'Aguardando', value: aguardando, color: '#eab308' },
      { label: 'Reprovados', value: reprovados, color: '#ef4444' },
      { label: 'Hoje', value: hoje, color: '#F97316' },
    ];
  }, [clientes]);

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
      {stats.map(s => (
        <motion.div key={s.label} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg flex-shrink-0"
          style={{ backgroundColor: `${s.color}12`, border: `1px solid ${s.color}25` }}>
          <span className="text-[10px] font-bold" style={{ color: s.color }}>{s.value}</span>
          <span className="text-[9px] font-medium text-white/40">{s.label}</span>
        </motion.div>
      ))}
    </div>
  );
};

// ─── Table Row ───────────────────────────────────────────────────────────────
const ListRow = ({ cliente, onEdit, onView, onDelete, canEditCliente, canChangeStatus, onStatusUpdate }) => {
  const notasCount = Array.isArray(cliente.notas) ? cliente.notas.length : (cliente.notasCount || 0);
  const rowRef = React.useRef(null);
  useTranslationProtection(rowRef);
  const canEdit = canEditCliente(cliente);
  const canAlterStatus = canChangeStatus(cliente);

  const formatDate = (d) => {
    if (!d) return '';
    const parts = d.split('T')[0].split('-');
    return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : d;
  };

  // Dias desde cadastro
  const diasCadastro = cliente.created_at ? Math.floor((new Date() - new Date(cliente.created_at)) / (1000 * 60 * 60 * 24)) : null;
  const statusInfo = statusMap[cliente.status] || statusMap.aguardando_aprovacao;

  return (
    <motion.tr ref={rowRef}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="transition-all duration-200 hover:bg-white/[0.04] group"
      style={{ borderBottom: `1px solid ${BORDER}` }} data-client-id={cliente.id} translate="no">
      {/* Cliente */}
      <td className="px-3 sm:px-4 py-3.5">
        <div className="flex items-center gap-3 min-w-0">
          <UserAvatar user={cliente.user} size="sm" notasCount={notasCount} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h4 className="font-bold text-white text-[13px] truncate group-hover:text-[#F97316] transition-colors">{cliente.nome}</h4>
              {cliente.tela_aprovacao && (
                <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md flex-shrink-0"
                  style={{ backgroundColor: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.2)' }}>
                  <Shield className="w-2.5 h-2.5 text-green-400" />
                  <span className="text-[8px] font-bold text-green-400 hidden xl:inline">Aprovação</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="text-[10px] text-white/35 truncate flex items-center gap-1">
                <Mail className="w-2.5 h-2.5 flex-shrink-0" />{cliente.email}
              </span>
              {cliente.valor_renda && (
                <span className="text-[10px] font-semibold hidden xl:flex items-center gap-1" style={{ color: '#10b981' }}>
                  R$ {parseFloat(cliente.valor_renda).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              )}
            </div>
            {/* Mobile extra info */}
            <div className="flex items-center gap-3 md:hidden mt-1 text-[10px] text-white/25">
              {cliente.telefone && <span className="flex items-center gap-1"><Phone className="w-2.5 h-2.5" />{cliente.telefone}</span>}
              {cliente.created_at && <span className="flex items-center gap-1"><Calendar className="w-2.5 h-2.5" />{formatDate(cliente.created_at).slice(0, 5)}</span>}
            </div>
          </div>
        </div>
      </td>

      {/* Status */}
      <td className="px-2 py-3.5">
        <div className="space-y-1.5">
          <StatusButton status={cliente.status} clienteId={cliente.id} disabled={false}
            canChangeStatus={canAlterStatus} onStatusUpdate={onStatusUpdate} />
          <div className="w-full h-1 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
            <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, ((18 - statusInfo.priority) / 17) * 100)}%` }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="h-full rounded-full" style={{ backgroundColor: statusInfo.color }} />
          </div>
        </div>
      </td>

      {/* Cadastro */}
      <td className="px-2 py-3.5 hidden md:table-cell">
        <div className="space-y-0.5">
          <span className="text-[10px] text-white/50 flex items-center gap-1">
            <Calendar className="w-2.5 h-2.5 text-white/20" />{formatDate(cliente.created_at)}
          </span>
          {diasCadastro !== null && (
            <span className="text-[7px] font-black px-1 py-0.5 rounded inline-block"
              style={{ backgroundColor: diasCadastro === 0 ? 'rgba(249,115,22,0.15)' : diasCadastro <= 7 ? 'rgba(59,130,246,0.1)' : 'rgba(139,92,246,0.08)',
                       color: diasCadastro === 0 ? '#F97316' : diasCadastro <= 7 ? '#3b82f6' : '#8b5cf6' }}>
              {diasCadastro === 0 ? 'HOJE' : diasCadastro === 1 ? 'ONTEM' : `${diasCadastro}d`}
            </span>
          )}
          {cliente.data_nascimento && (
            <p className="text-[8px] text-white/20">Nasc: {formatDate(cliente.data_nascimento)}</p>
          )}
        </div>
      </td>

      {/* Contato */}
      <td className="px-2 py-3.5 hidden md:table-cell">
        <div className="space-y-0.5">
          <span className="text-[10px] text-white/50 flex items-center gap-1 truncate">
            <Phone className="w-2.5 h-2.5 text-white/20" />{cliente.telefone || "N/A"}
          </span>
          <span className="text-[9px] text-white/30 flex items-center gap-1 truncate">
            <Mail className="w-2.5 h-2.5 text-white/15" />{cliente.email}
          </span>
        </div>
      </td>

      {/* CPF */}
      <td className="px-2 py-3.5 hidden lg:table-cell">
        <span className="text-[10px] text-white/45 font-mono">{cliente.cpf || "N/A"}</span>
      </td>

      {/* Renda */}
      <td className="px-2 py-3.5 hidden lg:table-cell">
        <div className="space-y-0.5">
          {cliente.valor_renda ? (
            <span className="text-[11px] font-bold" style={{ color: '#10b981' }}>
              R$ {parseFloat(cliente.valor_renda).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          ) : <span className="text-[10px] text-white/25">—</span>}
          {cliente.renda_tipo && (
            <span className="text-[7px] font-black px-1.5 py-0.5 rounded block w-fit"
              style={{
                backgroundColor: cliente.renda_tipo === 'formal' ? 'rgba(16,185,129,0.1)' : cliente.renda_tipo === 'informal' ? 'rgba(234,179,8,0.1)' : 'rgba(139,92,246,0.1)',
                color: cliente.renda_tipo === 'formal' ? '#10b981' : cliente.renda_tipo === 'informal' ? '#eab308' : '#8b5cf6',
              }}>
              {cliente.renda_tipo.toUpperCase()}
            </span>
          )}
          {cliente.profissao && (
            <p className="text-[8px] text-white/20 truncate max-w-[100px]">{cliente.profissao}</p>
          )}
          {cliente.data_admissao && (
            <p className="text-[7px] text-white/15">Adm: {formatDate(cliente.data_admissao)}</p>
          )}
        </div>
      </td>

      {/* Localidade */}
      <td className="px-2 py-3.5 hidden xl:table-cell">
        <div className="space-y-0.5">
          {cliente.naturalidade ? (
            <span className="text-[10px] text-white/45 flex items-center gap-1 truncate">
              <MapPin className="w-2.5 h-2.5 text-white/20 flex-shrink-0" />{cliente.naturalidade}
            </span>
          ) : <span className="text-[10px] text-white/20">—</span>}
          {cliente.estado_civil && (
            <span className="text-[7px] font-bold px-1.5 py-0.5 rounded inline-block"
              style={{
                backgroundColor: cliente.estado_civil === 'casado' ? 'rgba(236,72,153,0.1)' : 'rgba(255,255,255,0.04)',
                color: cliente.estado_civil === 'casado' ? '#ec4899' : 'rgba(255,255,255,0.3)',
                border: '1px solid ' + (cliente.estado_civil === 'casado' ? 'rgba(236,72,153,0.2)' : 'rgba(255,255,255,0.06)')
              }}>
              {cliente.estado_civil.charAt(0).toUpperCase() + cliente.estado_civil.slice(1)}
            </span>
          )}
        </div>
      </td>

      {/* Perfil */}
      <td className="px-2 py-3.5 hidden xl:table-cell">
        <div className="space-y-0.5">
          {[
            { label: 'FGTS 3+', active: cliente.possui_carteira_mais_tres_anos === true || cliente.possui_carteira_mais_tres_anos === 1 },
            { label: 'Dependente', active: cliente.possui_dependente === true || cliente.possui_dependente === 1 },
            { label: 'Fiador', active: cliente.possui_fiador === true || cliente.possui_fiador === 1 },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-1.5">
              {item.active
                ? <CheckCircle className="w-2.5 h-2.5 flex-shrink-0" style={{ color: '#10b981' }} />
                : <X className="w-2.5 h-2.5 flex-shrink-0 text-white/15" />}
              <span className={`text-[9px] ${item.active ? 'text-white/50' : 'text-white/15'}`}>{item.label}</span>
            </div>
          ))}
        </div>
      </td>

      {/* Responsável */}
      <td className="px-2 py-3.5 hidden sm:table-cell">
        <div className="flex items-center gap-2">
          {cliente.user && (
            <div className="w-6 h-6 rounded-lg flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0 shadow-sm"
              style={{ background: `linear-gradient(135deg, ${AVATAR_COLORS[(cliente.user?.id || 0) % AVATAR_COLORS.length]}, ${AVATAR_COLORS[(cliente.user?.id || 0) % AVATAR_COLORS.length]}88)` }}>
              {(cliente.user.first_name?.[0] || '').toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <span className="text-[10px] text-white/50 truncate block">
              {cliente.user && (cliente.user.first_name || cliente.user.last_name)
                ? `${cliente.user.first_name || ''} ${cliente.user.last_name || ''}`.trim()
                : cliente.user?.username || "N/A"}
            </span>
            {cliente.user && (cliente.user.is_administrador || cliente.user.is_correspondente || cliente.user.is_corretor) && (
              <span className="text-[7px] font-black px-1 py-0.5 rounded inline-block mt-0.5"
                style={{
                  backgroundColor: cliente.user.is_administrador ? 'rgba(239,68,68,0.1)' : cliente.user.is_correspondente ? 'rgba(59,130,246,0.1)' : 'rgba(249,115,22,0.1)',
                  color: cliente.user.is_administrador ? '#ef4444' : cliente.user.is_correspondente ? '#3b82f6' : '#F97316',
                }}>
                {cliente.user.is_administrador ? 'ADMIN' : cliente.user.is_correspondente ? 'CORRESP' : 'CORRETOR'}
              </span>
            )}
          </div>
        </div>
      </td>

      {/* Observações */}
      <td className="px-2 py-3.5 hidden 2xl:table-cell">
        {cliente.observacoes ? (
          <p className="text-[9px] text-white/30 truncate max-w-[120px]" title={cliente.observacoes}>
            {cliente.observacoes}
          </p>
        ) : <span className="text-[9px] text-white/15">—</span>}
      </td>

      {/* Ações */}
      <td className="px-2 py-3.5">
        <div className="flex items-center justify-center gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
          <motion.button whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}
            onClick={() => onView(cliente)} title="Ver detalhes"
            className="p-1.5 rounded-lg text-white/50 hover:text-[#3b82f6] hover:bg-[#3b82f6]/10 transition-all relative">
            <Eye className="w-4 h-4" />
            {notasCount > 0 && (
              <span className="absolute -top-1 -right-1 text-white text-[7px] min-w-[14px] h-[14px] flex items-center justify-center rounded-full font-black"
                style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}>
                {notasCount}
              </span>
            )}
          </motion.button>
          {canEdit && (
            <motion.button whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}
              onClick={() => onEdit(cliente)} title="Editar"
              className="p-1.5 rounded-lg text-white/50 hover:text-[#F97316] hover:bg-[#F97316]/10 transition-all">
              <Edit className="w-4 h-4" />
            </motion.button>
          )}
          {canEdit && (
            <motion.button whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}
              onClick={() => onDelete(cliente.id)} title="Excluir"
              className="p-1.5 rounded-lg text-white/50 hover:text-[#ef4444] hover:bg-[#ef4444]/10 transition-all">
              <Trash2 className="w-4 h-4" />
            </motion.button>
          )}
        </div>
      </td>
    </motion.tr>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────
const ListaClientes = () => {
  const { user } = useAuth();
  const [clientes, setClientes] = useState([]);
  const [corretores, setCorretores] = useState([]);
  const [filters, setFilters] = useState({ status: "Todos", corretor: "Todos", search: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [allClientes, setAllClientes] = useState([]);
  const [selectedCliente, setSelectedCliente] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isNotasModalOpen, setIsNotasModalOpen] = useState(false);
  const [selectedNotas, setSelectedNotas] = useState([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [kanbanMode, setKanbanMode] = useState(false);

  const canEditAll = user?.is_administrador || user?.is_correspondente;
  const isCorretor = user?.is_corretor && !user?.is_administrador && !user?.is_correspondente;

  const canEditCliente = (cliente) => {
    if (canEditAll) return true;
    if (isCorretor && cliente.user?.id === user?.id) return true;
    return false;
  };

  const canChangeStatus = () => canEditAll;

  const handleStatusUpdate = async (clienteId, newStatus) => {
    const token = localStorage.getItem('authToken');
    await axios.patch(`${process.env.REACT_APP_API_URL}/clientes/${clienteId}/status`,
      { status: newStatus }, { headers: { Authorization: `Bearer ${token}` } });
    setAllClientes(prev => prev.map(c => c.id === clienteId ? { ...c, status: newStatus } : c));
  };

  const fetchClientes = async (pageNum = 1, reset = true) => {
    if (pageNum === 1) setLoading(true); else setLoadingMore(true);
    try {
      const token = localStorage.getItem('authToken');
      const statusParam = filters.status !== "Todos" ? filters.status : undefined;
      let corretorParam;
      if (filters.corretor !== "Todos") corretorParam = filters.corretor;
      else if (isCorretor) corretorParam = user?.id;

      const response = await axios.get(`${process.env.REACT_APP_API_URL}/clientes`, {
        params: { status: statusParam, corretor: corretorParam, page: pageNum, limit: 20 },
        headers: { Authorization: `Bearer ${token}` }
      });

      let arr = [];
      if (Array.isArray(response.data)) arr = response.data;
      else if (response.data?.clientes) arr = response.data.clientes;

      if (reset || pageNum === 1) { setAllClientes(arr); setPage(1); }
      else setAllClientes(prev => [...prev, ...arr]);
      setHasMore(arr.length === 20);
      setError("");
    } catch { setError("Erro ao carregar clientes."); if (reset) setAllClientes([]); }
    setLoading(false); setLoadingMore(false);
  };

  const loadMore = () => { if (!loadingMore && hasMore) { const n = page + 1; setPage(n); fetchClientes(n, false); } };

  useEffect(() => {
    const handleScroll = () => {
      if (isModalOpen || isEditModalOpen || isNotasModalOpen) return;
      if (window.innerHeight + document.documentElement.scrollTop >= document.documentElement.offsetHeight - 100) loadMore();
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loadingMore, hasMore, page, isModalOpen, isEditModalOpen, isNotasModalOpen]);

  const fetchCorretores = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/corretor?all=true`,
        { headers: { Authorization: `Bearer ${token}` } });
      let c = [];
      if (response.data?.success && Array.isArray(response.data.data)) c = response.data.data;
      else if (Array.isArray(response.data)) c = response.data;
      setCorretores(c);
    } catch { setCorretores([]); }
  };

  useEffect(() => { setPage(1); setHasMore(true); fetchClientes(1, true); }, [filters.status, filters.corretor]);
  useEffect(() => { fetchCorretores(); }, []);
  useEffect(() => { return () => { setIsModalOpen(false); setIsNotasModalOpen(false); setIsEditModalOpen(false); setSelectedCliente(null); setSelectedNotas([]); }; }, []);

  const filteredClientes = useMemo(() => {
    let filtered = allClientes;
    if (filters.search) {
      const s = filters.search.toLowerCase();
      filtered = filtered.filter(c => c.nome?.toLowerCase().includes(s) || c.email?.toLowerCase().includes(s) || c.telefone?.includes(s) || c.cpf?.includes(s));
    }
    return filtered;
  }, [allClientes, filters.search]);

  const exportarExcel = async () => {
    try {
      const token = localStorage.getItem('authToken');
      let corretorParam; if (isCorretor) corretorParam = user?.id;
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/clientes`,
        { params: { limit: 10000, corretor: corretorParam }, headers: { Authorization: `Bearer ${token}` } });
      let todos = []; if (Array.isArray(response.data)) todos = response.data; else if (response.data?.clientes) todos = response.data.clientes;
      const data = todos.map(c => ({
        ID: c.id, Nome: c.nome, Email: c.email, Telefone: c.telefone, CPF: c.cpf,
        Status: statusMap[c.status]?.name || c.status,
        Responsável: c.user ? `${c.user.first_name || ""} ${c.user.last_name || ""}`.trim() || c.user.username : "",
        Data: c.created_at ? new Date(c.created_at).toLocaleDateString('pt-BR') : "",
        ValorRenda: c.valor_renda || "", TipoRenda: c.renda_tipo || "", Profissão: c.profissao || "",
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Clientes");
      XLSX.writeFile(wb, "clientes.xlsx");
    } catch { alert("Erro ao exportar."); }
  };

  const handleDelete = async (clienteId) => {
    const cliente = allClientes.find(c => c.id === clienteId);
    if (!cliente || !canEditCliente(cliente)) { alert("Sem permissão."); return; }
    if (!window.confirm("Excluir este cliente?")) return;
    try {
      const token = localStorage.getItem('authToken');
      await axios.delete(`${process.env.REACT_APP_API_URL}/clientes/${clienteId}`, { headers: { Authorization: `Bearer ${token}` } });
      setAllClientes(prev => prev.filter(c => c.id !== clienteId));
    } catch { alert("Erro ao excluir."); }
  };

  const handleEditSave = useCallback((updated) => {
    setAllClientes(prev => prev.map(c => c.id === updated.id ? { ...c, ...updated } : c));
    setIsEditModalOpen(false);
    setTimeout(() => setSelectedCliente(null), 150);
  }, []);

  const handleViewCliente = useCallback((cliente) => {
    setIsNotasModalOpen(false); setIsEditModalOpen(false);
    setTimeout(() => { setSelectedCliente(cliente); setIsModalOpen(true); }, 100);
  }, []);

  const handleEditCliente = useCallback((cliente) => {
    setIsModalOpen(false); setIsNotasModalOpen(false);
    setTimeout(() => { setSelectedCliente(cliente); setIsEditModalOpen(true); }, 100);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-caixa-gradient flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-t-transparent rounded-full animate-spin mx-auto mb-3"
            style={{ borderColor: '#F97316', borderTopColor: 'transparent' }} />
          <p className="text-xs text-white/50">Carregando clientes...</p>
        </div>
      </div>
    );
  }

  if (error && allClientes.length === 0) {
    return (
      <div className="min-h-screen bg-caixa-gradient flex items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle className="w-10 h-10 mx-auto mb-3" style={{ color: '#ef4444' }} />
          <p className="text-sm text-white/60 mb-4">{error}</p>
          <button onClick={() => fetchClientes(1, true)}
            className="px-5 py-2 rounded-xl text-sm font-bold text-white" style={{ background: ACCENT_GRADIENT }}>
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-caixa-gradient flex flex-col">

      {/* ── Header fixo ── */}
      <div className="sticky top-0 z-50 backdrop-blur-md flex-shrink-0"
        style={{ backgroundColor: CARD, borderBottom: `1px solid ${BORDER}` }}>
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: ACCENT_GRADIENT }}>
                <User className="w-4.5 h-4.5 text-white" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-white">
                  {canEditAll ? (kanbanMode ? "Kanban de Clientes" : "Lista de Clientes") : (kanbanMode ? "Kanban" : "Meus Clientes")}
                </h1>
                <p className="text-[10px] text-white/40">
                  {filteredClientes.length} encontrado(s)
                  {hasMore && ` · ${allClientes.length} carregados`}
                  {isCorretor && " · Apenas seus"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-white/60 hover:text-white transition-colors"
                style={{ backgroundColor: INPUT_BG, border: `1px solid ${BORDER}` }}>
                <Filter className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Filtros</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
              </button>

              <button onClick={() => fetchClientes(1, true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold text-white"
                style={{ background: ACCENT_GRADIENT }}>
                <RefreshCw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Atualizar</span>
              </button>

              {canEditAll && (
                <button onClick={exportarExcel}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-white/60 hover:text-white transition-colors"
                  style={{ backgroundColor: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.25)', color: '#10b981' }}>
                  <FileText className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Excel</span>
                </button>
              )}

              <button onClick={() => setKanbanMode(prev => !prev)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-white/60 hover:text-white transition-colors"
                style={kanbanMode ? { background: ACCENT_GRADIENT, color: '#fff' } : { backgroundColor: INPUT_BG, border: `1px solid ${BORDER}` }}>
                <span className="hidden sm:inline">{kanbanMode ? "Lista" : "Kanban"}</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <rect x="3" y="4" width="7" height="16" rx="2" className={kanbanMode ? "fill-current" : "stroke-current"} />
                  <rect x="14" y="4" width="7" height="16" rx="2" className={kanbanMode ? "fill-current" : "stroke-current"} />
                </svg>
              </button>
            </div>
          </div>

          {/* Stats pills */}
          <div className="py-2">
            <StatsBar clientes={allClientes} />
          </div>

          {/* Filtros */}
          <AnimatePresence>
            {showFilters && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="pb-3 pt-1">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/30 w-3.5 h-3.5" />
                      <input type="text" placeholder="Buscar clientes..." value={filters.search}
                        onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                        className="w-full pl-9 pr-4 py-2 rounded-lg text-xs text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#F97316]/60"
                        style={inputStyle} />
                    </div>
                    <select value={filters.status} onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                      className="px-3 py-2 rounded-lg text-xs text-white focus:outline-none focus:ring-2 focus:ring-[#F97316]/60 [&>option]:bg-white [&>option]:text-gray-800"
                      style={inputStyle}>
                      <option value="Todos">Todos os status</option>
                      {Object.entries(statusMap).map(([key, value]) => (
                        <option key={key} value={key}>{value.name}</option>
                      ))}
                    </select>
                    {(canEditAll || isCorretor) && (
                      <select value={filters.corretor} onChange={(e) => setFilters(prev => ({ ...prev, corretor: e.target.value }))}
                        className="px-3 py-2 rounded-lg text-xs text-white focus:outline-none focus:ring-2 focus:ring-[#F97316]/60 [&>option]:bg-white [&>option]:text-gray-800"
                        style={inputStyle}>
                        <option value="Todos">{canEditAll ? "Todos os usuários" : "Meus clientes"}</option>
                        {canEditAll && corretores.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.first_name} {c.last_name}
                            {c.is_administrador && " (Admin)"}{c.is_correspondente && " (Corresp.)"}{c.is_corretor && " (Corretor)"}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 p-3 sm:p-5">
        {kanbanMode ? (
          <KanbanClientes clientes={filteredClientes} user={user}
            onViewDetails={handleViewCliente} onEdit={handleEditCliente}
            onDelete={handleDelete} onStatusChange={handleStatusUpdate} />
        ) : (
          filteredClientes.length === 0 && !loading ? (
            <div className="text-center py-16">
              <User className="w-10 h-10 text-white/20 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-white/50 mb-1">Nenhum cliente encontrado</h3>
              <p className="text-[11px] text-white/30 mb-4">
                {filters.search || filters.status !== "Todos" ? "Ajuste os filtros." : "Nenhum cliente cadastrado."}
              </p>
              <button onClick={() => fetchClientes(1, true)}
                className="px-4 py-2 rounded-lg text-xs font-bold text-white" style={{ background: ACCENT_GRADIENT }}>
                Atualizar
              </button>
            </div>
          ) : (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl overflow-hidden backdrop-blur-md shadow-2xl shadow-black/20"
              style={{ backgroundColor: CARD, border: `1px solid ${BORDER}` }}>
              <div className="overflow-x-auto">
                <SafeTable className="w-full">
                  <thead>
                    <tr style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)', borderBottom: `1px solid ${BORDER}` }}>
                      <th className="px-3 py-3.5 text-left text-[10px] font-bold uppercase tracking-wider text-white/35">Cliente</th>
                      <th className="px-2 py-3.5 text-left text-[10px] font-bold uppercase tracking-wider text-white/35">Status</th>
                      <th className="px-2 py-3.5 text-left text-[10px] font-bold uppercase tracking-wider text-white/35 hidden md:table-cell">Cadastro</th>
                      <th className="px-2 py-3.5 text-left text-[10px] font-bold uppercase tracking-wider text-white/35 hidden md:table-cell">Contato</th>
                      <th className="px-2 py-3.5 text-left text-[10px] font-bold uppercase tracking-wider text-white/35 hidden lg:table-cell">CPF</th>
                      <th className="px-2 py-3.5 text-left text-[10px] font-bold uppercase tracking-wider text-white/35 hidden lg:table-cell">Renda</th>
                      <th className="px-2 py-3.5 text-left text-[10px] font-bold uppercase tracking-wider text-white/35 hidden xl:table-cell">Localidade</th>
                      <th className="px-2 py-3.5 text-left text-[10px] font-bold uppercase tracking-wider text-white/35 hidden xl:table-cell">Perfil</th>
                      <th className="px-2 py-3.5 text-left text-[10px] font-bold uppercase tracking-wider text-white/35 hidden sm:table-cell">Responsável</th>
                      <th className="px-2 py-3.5 text-left text-[10px] font-bold uppercase tracking-wider text-white/35 hidden 2xl:table-cell">Obs</th>
                      <th className="px-2 py-3.5 text-center text-[10px] font-bold uppercase tracking-wider text-white/35 w-24">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    <AnimatePresence mode="popLayout">
                      {filteredClientes.map((cliente) => (
                        <ListRow key={generateStableKey('cliente', cliente, cliente.id)}
                          cliente={cliente} canEditCliente={canEditCliente} canChangeStatus={canChangeStatus}
                          onView={handleViewCliente} onEdit={handleEditCliente}
                          onDelete={handleDelete} onStatusUpdate={handleStatusUpdate} />
                      ))}
                    </AnimatePresence>
                  </tbody>
                </SafeTable>
              </div>

              {/* Load more indicator */}
              {loadingMore && (
                <div className="flex items-center justify-center py-4" style={{ borderTop: `1px solid ${BORDER}` }}>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" style={{ color: '#F97316' }} />
                  <span className="text-[11px] text-white/40">Carregando mais...</span>
                </div>
              )}
              {!hasMore && allClientes.length > 0 && (
                <div className="text-center py-3" style={{ borderTop: `1px solid ${BORDER}` }}>
                  <span className="text-[10px] text-white/20">
                    {allClientes.length} clientes carregados
                  </span>
                </div>
              )}
            </motion.div>
          )
        )}
      </div>

      {/* Modals */}
      <AnimatePresence mode="wait">
        {isModalOpen && selectedCliente && (
          <ModalCliente key="modal-cliente" isOpen={isModalOpen}
            onClose={() => { setIsModalOpen(false); setTimeout(() => setSelectedCliente(null), 150); }}
            cliente={selectedCliente} />
        )}
        {isNotasModalOpen && selectedNotas && (
          <ModalNotas key="modal-notas" isOpen={isNotasModalOpen}
            onClose={() => { setIsNotasModalOpen(false); setTimeout(() => setSelectedNotas([]), 150); }}
            notas={selectedNotas} />
        )}
        {isEditModalOpen && selectedCliente && (
          <ModalEditarCliente key="modal-editar" isOpen={isEditModalOpen}
            onClose={() => { setIsEditModalOpen(false); setTimeout(() => setSelectedCliente(null), 150); }}
            cliente={selectedCliente || { documentos_pessoais: [] }} onSave={handleEditSave} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default ListaClientes;
