import React, { useState, useEffect, useMemo, useCallback } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import {
  Edit, Trash2, Search, Eye, User, Calendar, Phone, Mail, Loader2, 
  ChevronDown, X, FileText, UserCircle, CreditCard, Filter, MoreVertical,
  Plus, RefreshCw, Check, AlertCircle, Clock, Shield, CheckCircle
} from "lucide-react";

import ModalCliente from "./ModalCliente";
import ModalNotas from "./ModalNotas";
import ModalEditarCliente from "./ModalEditarCliente";
import KanbanClientes from "./KanbanClientes";
import * as XLSX from "xlsx";

// ✅ IMPORTAR PROTEÇÕES DOM
import { SafeList, SafeTable, useTranslationProtection } from "./SafeComponents";
import { generateStableKey } from "../utils/domUtils";

const statusMap = {
  aguardando_aprovacao: {
    name: "Aguardando Aprovação",
    color: "bg-yellow-500",
    bgColor: "bg-yellow-50",
    textColor: "text-yellow-800",
    icon: Clock,
    priority: 1
  },
  proposta_apresentada: {
    name: "Proposta Apresentada",
    color: "bg-blue-500",
    bgColor: "bg-blue-50",
    textColor: "text-blue-800",
    icon: FileText,
    priority: 2
  },
  documentacao_pendente: {
    name: "Documentação Pendente",
    color: "bg-orange-500",
    bgColor: "bg-orange-50",
    textColor: "text-orange-800",
    icon: AlertCircle,
    priority: 3
  },
  visita_efetuada: {
    name: "Visita Efetuada",
    color: "bg-purple-500",
    bgColor: "bg-purple-50",
    textColor: "text-purple-800",
    icon: UserCircle,
    priority: 4
  },
  aguardando_cancelamento_qv: {
    name: "Aguardando Cancelamento/QV",
    color: "bg-gray-500",
    bgColor: "bg-gray-50",
    textColor: "text-gray-800",
    icon: Clock,
    priority: 5
  },
  condicionado: {
    name: "Condicionado",
    color: "bg-amber-500",
    bgColor: "bg-amber-50",
    textColor: "text-amber-800",
    icon: AlertCircle,
    priority: 6
  },
  cliente_aprovado: {
    name: "Aprovado",
    color: "bg-green-500",
    bgColor: "bg-green-50",
    textColor: "text-green-800",
    icon: Check,
    priority: 7
  },
  reprovado: {
    name: "Reprovado",
    color: "bg-red-500",
    bgColor: "bg-red-50",
    textColor: "text-red-800",
    icon: X,
    priority: 8
  },
  reserva: {
    name: "Reserva",
    color: "bg-indigo-500",
    bgColor: "bg-indigo-50",
    textColor: "text-indigo-800",
    icon: FileText,
    priority: 9
  },
  conferencia_documento: {
    name: "Conferência de Documento",
    color: "bg-purple-700",
    bgColor: "bg-purple-100",
    textColor: "text-purple-900",
    icon: FileText,
    priority: 10
  },
  nao_descondiciona: {
    name: "Não Descondiciona",
    color: "bg-pink-500",
    bgColor: "bg-pink-50",
    textColor: "text-pink-800",
    icon: X,
    priority: 11
  },
  conformidade: {
    name: "Conformidade",
    color: "bg-cyan-500",
    bgColor: "bg-cyan-50",
    textColor: "text-cyan-800",
    icon: Check,
    priority: 12
  },
  concluido: {
    name: "Venda Concluída",
    color: "bg-emerald-500",
    bgColor: "bg-emerald-50",
    textColor: "text-emerald-800",
    icon: Check,
    priority: 13
  },
  nao_deu_continuidade: {
    name: "Não Deu Continuidade",
    color: "bg-slate-500",
    bgColor: "bg-slate-50",
    textColor: "text-slate-800",
    icon: X,
    priority: 14
  },
  // status antigos e extras para compatibilidade
  aguardando_reserva_orcamentaria: {
    name: "Aguardando Reserva Orçamentária",
    color: "bg-indigo-500",
    bgColor: "bg-indigo-50",
    textColor: "text-indigo-800",
    icon: CreditCard,
    priority: 15
  },
  fechamento_proposta: {
    name: "Fechamento Proposta",
    color: "bg-teal-500",
    bgColor: "bg-teal-50",
    textColor: "text-teal-800",
    icon: FileText,
    priority: 16
  },
  processo_em_aberto: {
    name: "Processo Aberto",
    color: "bg-stone-500",
    bgColor: "bg-stone-50",
    textColor: "text-stone-800",
    icon: FileText,
    priority: 17
  },
};

// Status Button com atualização em tempo real
const StatusButton = ({ status, onChange, disabled, clienteId, onStatusUpdate, canChangeStatus }) => {
  const info = statusMap[status] || statusMap.aguardando_aprovacao;
  const [isEditing, setIsEditing] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState(status);
  const [isLoading, setIsLoading] = useState(false);
  const IconComponent = info.icon;

  // ✅ VERIFICAÇÃO: Usar canChangeStatus em vez de disabled
  const canEdit = canChangeStatus && !disabled;

  const handleSave = async () => {
    if (selectedStatus === status) {
      setIsEditing(false);
      return;
    }
    setIsLoading(true);
    try {
      const apiUrl = process.env.REACT_APP_API_URL;
      const url = `${apiUrl}/clientes/${clienteId}/status`;
      console.log('API URL:', apiUrl);
      console.log('PATCH URL:', url);
      await axios.patch(
        url,
        { status: selectedStatus },
        { headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` } }
      );
      // Atualização em tempo real
      if (onStatusUpdate) {
        onStatusUpdate(clienteId, selectedStatus);
      }
      if (onChange) onChange(selectedStatus);
      setIsEditing(false);
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      setSelectedStatus(status); // Reverte
      if (error.code === 'ERR_NETWORK') {
        alert('Erro de rede ao atualizar status. Verifique a URL da API e se o backend está rodando.');
      } else {
        alert('Erro ao atualizar status. Tente novamente.');
      }
    }
    setIsLoading(false);
  };

  if (isEditing && canEdit) {
    return (
      <motion.div 
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        className="flex flex-col gap-2 min-w-0 z-50 w-full max-w-[200px]"
      >
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg border border-caixa-primary/30 bg-white text-xs sm:text-sm font-medium focus:ring-2 focus:ring-caixa-primary focus:border-caixa-primary transition-all w-full"
          autoFocus
        >
          {Object.entries(statusMap).map(([key, value]) => (
            <option key={key} value={key}>{value.name}</option>
          ))}
        </select>
        <div className="flex gap-1 sm:gap-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSave}
            disabled={isLoading}
            className="flex-1 px-2 sm:px-3 py-1 sm:py-1.5 bg-caixa-primary text-white rounded-lg text-xs font-medium hover:bg-caixa-secondary transition-all disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : "Salvar"}
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              setIsEditing(false);
              setSelectedStatus(status);
            }}
            className="px-2 sm:px-3 py-1 sm:py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200 transition-all"
          >
            <X className="w-3 h-3 sm:hidden" />
            <span className="hidden sm:inline">Cancelar</span>
          </motion.button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.button
      whileHover={{ scale: canEdit ? 1.02 : 1 }}
      whileTap={{ scale: canEdit ? 0.98 : 1 }}
      onClick={() => canEdit && setIsEditing(true)}
      className={`
        inline-flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-medium
        ${info.color} text-white shadow-sm
        transition-all duration-200 min-w-0 max-w-full
        ${canEdit ? 'hover:shadow-md cursor-pointer' : 'cursor-not-allowed opacity-75'}
      `}
      title={canEdit ? "Clique para alterar status" : "Apenas administradores e correspondentes podem alterar status"}
    >
      <IconComponent className="w-3 h-3 flex-shrink-0" />
      <span className="truncate text-[10px] sm:text-xs leading-tight">
        {/* Versão encurtada para telas pequenas */}
        <span className="sm:hidden">
          {info.name.length > 12 ? `${info.name.substring(0, 12)}...` : info.name}
        </span>
        {/* Versão completa para telas maiores */}
        <span className="hidden sm:inline">{info.name}</span>
      </span>
    </motion.button>
  );
};

// Avatar com cores do sistema
const UserAvatar = ({ user, size = "sm", notasCount = 0 }) => {
  const sizeClasses = {
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-12 h-12 text-base"
  };

  if (!user) {
    return (
      <div className={`${sizeClasses[size]} rounded-full bg-gray-400 flex items-center justify-center text-white font-bold relative`}>
        ?
        {notasCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] min-w-[18px] h-[18px] flex items-center justify-center rounded-full border-2 border-white font-bold shadow">
            {notasCount}
          </span>
        )}
      </div>
    );
  }

  const initials = `${user.first_name?.[0] || ""}${user.last_name?.[0] || ""}`.toUpperCase();
  
  return (
    <div 
      className={`${sizeClasses[size]} rounded-full bg-caixa-orange flex items-center justify-center text-white font-bold shadow-sm relative`}
      title={`${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username}
    >
      {initials}
      {notasCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] min-w-[18px] h-[18px] flex items-center justify-center rounded-full border-2 border-white font-bold shadow">
          {notasCount}
        </span>
      )}
    </div>
  );
};

// Linha da tabela (modo lista)
const ListRow = ({ cliente, onEdit, onView, onDelete, canEditCliente, canChangeStatus, onStatusUpdate }) => {
  const [showMenu, setShowMenu] = useState(false);
  const notasCount = Array.isArray(cliente.notas) ? cliente.notas.length : (cliente.notasCount || 0);
  
  // ✅ PROTEÇÃO CONTRA TRADUÇÃO AUTOMÁTICA
  const rowRef = React.useRef(null);
  useTranslationProtection(rowRef);
  
  // ✅ VERIFICAR PERMISSÕES PARA ESTE CLIENTE ESPECÍFICO
  const canEdit = canEditCliente(cliente);
  const canAlterStatus = canChangeStatus(cliente);

  return (
    <tr
      ref={rowRef}
      className="border-b border-gray-200 hover:bg-gray-50 transition-colors group"
      data-client-id={cliente.id}
      translate="no"
    >
      {/* Cliente */}
      <td className="px-3 sm:px-6 py-4">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <UserAvatar user={cliente.user} size="sm" notasCount={notasCount} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
              <h4 className="font-semibold text-gray-900 truncate text-sm sm:text-base">{cliente.nome}</h4>
              
              {/* ✅ INDICADOR DE TELA DE APROVAÇÃO */}
              {cliente.tela_aprovacao && (
                <div className="flex items-center gap-1">
                  <Shield className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" title="Possui tela de aprovação" />
                  <span className="text-xs bg-green-100 text-green-800 px-1.5 sm:px-2 py-0.5 rounded-full font-medium hidden sm:inline">
                    Possui Tela de Aprovação
                  </span>
                  <span className="text-xs bg-green-100 text-green-800 px-1 py-0.5 rounded-full font-medium sm:hidden">
                    Tela Aprovação
                  </span>
                </div>
              )}
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-xs sm:text-sm text-gray-500">
              <div className="flex items-center gap-1 truncate">
                <Mail className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{cliente.email}</span>
              </div>
              {/* Mostrar telefone e data em telas pequenas */}
              <div className="flex items-center gap-3 md:hidden">
                {cliente.telefone && (
                  <div className="flex items-center gap-1">
                    <Phone className="w-3 h-3 text-gray-400" />
                    <span>{cliente.telefone}</span>
                  </div>
                )}
                {cliente.created_at && (
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-gray-400" />
                    <span>
                      {(() => {
                        const onlyDate = cliente.created_at.split('T')[0];
                        const d = onlyDate.split('-');
                        return d.length === 3 ? `${d[2]}/${d[1]}` : cliente.created_at;
                      })()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </td>

      {/* Status */}
      <td className="px-2 sm:px-6 py-4">
        <StatusButton
          status={cliente.status}
          clienteId={cliente.id}
          disabled={false}
          canChangeStatus={canAlterStatus}
          onStatusUpdate={onStatusUpdate}
        />
      </td>

      {/* Data - Oculta em telas pequenas */}
      <td className="px-2 sm:px-6 py-4 text-sm text-gray-600 hidden md:table-cell">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-400" />
          {cliente.created_at
            ? (() => {
                const onlyDate = cliente.created_at.split('T')[0];
                const d = onlyDate.split('-');
                return d.length === 3 ? `${d[2]}/${d[1]}/${d[0]}` : cliente.created_at;
              })()
            : ''}
        </div>
      </td>

      {/* Telefone - Oculta em telas pequenas e médias */}
      <td className="px-2 sm:px-6 py-4 text-sm text-gray-600 hidden lg:table-cell">
        <div className="flex items-center gap-2">
          <Phone className="w-4 h-4 text-gray-400" />
          <span className="truncate">{cliente.telefone || "N/A"}</span>
        </div>
      </td>

      {/* CPF - Oculta em telas pequenas e médias */}
      <td className="px-2 sm:px-6 py-4 text-sm text-gray-600 hidden lg:table-cell">
        <div className="flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-gray-400" />
          <span className="truncate">{cliente.cpf || "N/A"}</span>
        </div>
      </td>

      {/* Responsável - Oculta em telas muito pequenas */}
      <td className="px-2 sm:px-6 py-4 text-sm text-gray-600 hidden sm:table-cell">
        <div className="flex items-center gap-2">
          <UserCircle className="w-4 h-4 text-gray-400" />
          <span className="truncate">
            {cliente.user && (cliente.user.first_name || cliente.user.last_name)
              ? `${cliente.user.first_name || ''} ${cliente.user.last_name || ''}`.trim() || cliente.user.username || "Usuário"
              : cliente.user?.username || "Não atribuído"}
          </span>
        </div>
      </td>

      {/* Ações */}
      <td className="px-2 sm:px-6 py-4">
        <div className="flex items-center justify-center gap-1 sm:gap-2">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => onView(cliente)}
            className="p-1.5 sm:p-2 text-caixa-primary hover:bg-caixa-primary/10 rounded-lg transition-colors relative"
            title="Ver detalhes"
          >
            <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
            {notasCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] sm:text-[10px] min-w-[14px] sm:min-w-[18px] h-[14px] sm:h-[18px] flex items-center justify-center rounded-full border-2 border-white font-bold shadow">
                {notasCount}
              </span>
            )}
          </motion.button>
          
          {canEdit && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => onEdit(cliente)}
              className="p-1.5 sm:p-2 text-caixa-orange hover:bg-caixa-orange/10 rounded-lg transition-colors"
              title="Editar"
            >
              <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
            </motion.button>
          )}

          {canEdit && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => onDelete(cliente.id)}
              className="p-1.5 sm:p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              title="Excluir"
            >
              <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
            </motion.button>
          )}
        </div>
      </td>
    </tr>
  );
};

// Componente principal
const ListaClientes = () => {
  const { user } = useAuth();
  const [clientes, setClientes] = useState([]);
  const [corretores, setCorretores] = useState([]);
  const [filters, setFilters] = useState({
    status: "Todos",
    corretor: "Todos",
    search: ""
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  
  // ✅ SCROLL INFINITO - NOVOS ESTADOS
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [allClientes, setAllClientes] = useState([]); // Todos os clientes carregados
  
  // Modals
  const [selectedCliente, setSelectedCliente] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isNotasModalOpen, setIsNotasModalOpen] = useState(false);
  const [selectedNotas, setSelectedNotas] = useState([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // ✅ PERMISSÕES: Separar edição de status
  const canEditAll = user?.is_administrador || user?.is_correspondente;
  const isCorretor = user?.is_corretor && !user?.is_administrador && !user?.is_correspondente;

  // ✅ FUNÇÃO PARA VERIFICAR SE PODE EDITAR UM CLIENTE ESPECÍFICO
  const canEditCliente = (cliente) => {
    // Admin e Correspondente podem editar qualquer cliente
    if (canEditAll) return true;
    
    // Corretor pode editar apenas seus próprios clientes
    if (isCorretor && cliente.user?.id === user?.id) return true;
    
    return false;
  };

  // ✅ FUNÇÃO PARA VERIFICAR SE PODE ALTERAR STATUS
  const canChangeStatus = (cliente) => {
    // APENAS Admin e Correspondente podem alterar status
    return canEditAll;
  };

  // ✅ ATUALIZAÇÃO DE STATUS
  const handleStatusUpdate = (clienteId, newStatus) => {
    setAllClientes(prevClientes => 
      prevClientes.map(cliente => 
        cliente.id === clienteId 
          ? { ...cliente, status: newStatus }
          : cliente
      )
    );
  };

  // ✅ FETCH CLIENTES COM PAGINAÇÃO
  const fetchClientes = async (pageNum = 1, reset = true) => {
    if (pageNum === 1) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const token = localStorage.getItem('authToken');
      const statusParam = filters.status !== "Todos" ? filters.status : undefined;
      
      // ✅ LÓGICA DE FILTRO POR CORRETOR
      let corretorParam;
      if (filters.corretor !== "Todos") {
        corretorParam = filters.corretor;
      } else if (isCorretor) {
        // Se é corretor (não admin/correspondente), mostrar apenas seus clientes
        corretorParam = user?.id;
      }
      
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/clientes`,
        {
          params: { 
            status: statusParam,
            corretor: corretorParam,
            page: pageNum,
            limit: 20 // ✅ 20 por página para scroll infinito
          },
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      let clientesArray = [];
      if (Array.isArray(response.data)) clientesArray = response.data;
      else if (response.data?.clientes) clientesArray = response.data.clientes;
      
      if (reset || pageNum === 1) {
        // ✅ MANTER ORDEM ORIGINAL DA API - NUNCA REORDENAR
        setAllClientes(clientesArray);
        setPage(1);
      } else {
        // ✅ PARA PÁGINAS ADICIONAIS, MANTER ORDEM ORIGINAL
        setAllClientes(prev => [...prev, ...clientesArray]);
      }

      // ✅ VERIFICAR SE HÁ MAIS PÁGINAS
      setHasMore(clientesArray.length === 20); // Se veio menos que 20, não há mais
      setError("");
    } catch (error) {
      setError("Erro ao carregar clientes.");
      if (reset) setAllClientes([]);
    }
    
    setLoading(false);
    setLoadingMore(false);
  };

  // ✅ FUNÇÃO PARA CARREGAR MAIS
  const loadMore = () => {
    if (!loadingMore && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchClientes(nextPage, false);
    }
  };

  // ✅ SCROLL INFINITO - DETECTAR FINAL DA PÁGINA
  useEffect(() => {
    const handleScroll = () => {
      // Não carregar mais se modal estiver aberto
      if (isModalOpen || isEditModalOpen || isNotasModalOpen) return;
      
      if (window.innerHeight + document.documentElement.scrollTop >= document.documentElement.offsetHeight - 100) {
        loadMore();
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loadingMore, hasMore, page, isModalOpen, isEditModalOpen, isNotasModalOpen]);

  const fetchCorretores = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/corretor?all=true`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      let corretores = [];
      if (response.data?.success && Array.isArray(response.data.data)) {
        corretores = response.data.data;
      } else if (Array.isArray(response.data)) {
        corretores = response.data;
      }
      
      console.log('Corretores carregados para filtros:', corretores.length);
      setCorretores(corretores);
    } catch (error) {
      console.error('Erro ao carregar corretores:', error);
      setCorretores([]);
    }
  };

  // ✅ RESETAR PÁGINA QUANDO FILTROS MUDAREM
  useEffect(() => { 
    setPage(1);
    setHasMore(true);
    fetchClientes(1, true); 
  }, [filters.status, filters.corretor]);
  
  useEffect(() => { fetchCorretores(); }, []);

  // Cleanup ao desmontar componente
  useEffect(() => {
    return () => {
      setIsModalOpen(false);
      setIsNotasModalOpen(false);
      setIsEditModalOpen(false);
      setSelectedCliente(null);
      setSelectedNotas([]);
    };
  }, []);

  // ✅ FILTROS LOCAIS (SEM RESETAR PÁGINA)
  const filteredClientes = useMemo(() => {
    let filtered = allClientes;
    
    if (filters.search) {
      const search = filters.search.toLowerCase();
      filtered = filtered.filter((c) =>
        c.nome?.toLowerCase().includes(search) ||
        c.email?.toLowerCase().includes(search) ||
        c.telefone?.includes(search) ||
        c.cpf?.includes(search)
      );
    }
    
    // ✅ MANTER ORDEM ORIGINAL - Não reordenar após atualizações
    // Apenas ordena na primeira carga ou quando filtros mudam
    // Comentado: return filtered.sort((a, b) => {
    //   const statusA = statusMap[a.status]?.priority || 999;
    //   const statusB = statusMap[b.status]?.priority || 999;
    //   return statusA - statusB;
    // });
    
    return filtered;
  }, [allClientes, filters.search]);

  // ✅ FUNÇÃO PARA EXPORTAR TODOS (BUSCAR TUDO)
  const exportarExcel = async () => {
    try {
      const token = localStorage.getItem('authToken');
      
      // ✅ APLICAR MESMA LÓGICA DE PERMISSÃO PARA EXPORTAÇÃO
      let corretorParam;
      if (isCorretor) {
        // Se é corretor, exportar apenas seus clientes
        corretorParam = user?.id;
      }
      
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/clientes`,
        {
          params: { 
            limit: 10000, // Buscar todos para exportar
            corretor: corretorParam // Aplicar filtro de corretor se necessário
          },
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      let todosClientes = [];
      if (Array.isArray(response.data)) todosClientes = response.data;
      else if (response.data?.clientes) todosClientes = response.data.clientes;

      const data = todosClientes.map(cliente => ({
        ID: cliente.id,
        Nome: cliente.nome,
        Email: cliente.email,
        Telefone: cliente.telefone,
        CPF: cliente.cpf,
        Status: statusMap[cliente.status]?.name || cliente.status,
        Responsável: cliente.user
          ? `${cliente.user.first_name || ""} ${cliente.user.last_name || ""}`.trim() || cliente.user.username
          : "",
        Data: cliente.created_at ? new Date(cliente.created_at).toLocaleDateString('pt-BR') : "",
        RG: cliente.rg || "",
        DataNascimento: cliente.data_nascimento || "",
        EstadoCivil: cliente.estado_civil || "",
        Profissão: cliente.profissao || "",
        Naturalidade: cliente.naturalidade || "",
        ValorRenda: cliente.valor_renda || "",
        TipoRenda: cliente.renda_tipo || "",
        PossuiDependente: cliente.possui_dependente ? "Sim" : "Não",
        PossuiFiador: cliente.possui_fiador ? "Sim" : "Não",
        FiadorNome: cliente.fiador_nome || "",
        FiadorCPF: cliente.fiador_cpf || "",
        FiadorTelefone: cliente.fiador_telefone || "",
        FiadorEmail: cliente.fiador_email || "",
        NumeroPIS: cliente.numero_pis || "",
        DataAdmissao: cliente.data_admissao || "",
        PossuiCarteiraMaisTresAnos: cliente.possui_carteira_mais_tres_anos ? "Sim" : "Não",
        PossuiFormulariosCaixa: cliente.possui_formularios_caixa ? "Sim" : "Não"
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Clientes");
      XLSX.writeFile(wb, "clientes.xlsx");
    } catch (error) {
      alert("Erro ao exportar clientes.");
    }
  };

  const handleDelete = async (clienteId) => {
    // ✅ ENCONTRAR O CLIENTE PARA VERIFICAR PERMISSÕES
    const cliente = allClientes.find(c => c.id === clienteId);
    if (!cliente) {
      alert("Cliente não encontrado.");
      return;
    }
    
    // ✅ VERIFICAR SE PODE DELETAR ESTE CLIENTE
    if (!canEditCliente(cliente)) {
      alert("Você não tem permissão para excluir este cliente.");
      return;
    }
    
    if (!window.confirm("Tem certeza que deseja excluir este cliente?")) return;
    
    try {
      const token = localStorage.getItem('authToken');
      await axios.delete(
        `${process.env.REACT_APP_API_URL}/clientes/${clienteId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAllClientes(prev => prev.filter(c => c.id !== clienteId));
    } catch {
      alert("Erro ao excluir cliente.");
    }
  };

  const handleEditSave = useCallback((updatedCliente) => {
    setAllClientes(prevClientes => 
      prevClientes.map(cliente => 
        cliente.id === updatedCliente.id 
          ? { ...cliente, ...updatedCliente }
          : cliente
      )
    );
    // Fechar modal após salvar
    setIsEditModalOpen(false);
    setTimeout(() => setSelectedCliente(null), 150);
  }, []);

  // Função para abrir modal cliente com cleanup
  const handleViewCliente = useCallback((cliente) => {
    // Fechar outros modais primeiro
    setIsNotasModalOpen(false);
    setIsEditModalOpen(false);
    
    setTimeout(() => {
      setSelectedCliente(cliente);
      setIsModalOpen(true);
    }, 100);
  }, []);

  // Função para abrir modal edição com cleanup
  const handleEditCliente = useCallback((cliente) => {
    // Fechar outros modais primeiro
    setIsModalOpen(false);
    setIsNotasModalOpen(false);
    
    setTimeout(() => {
      setSelectedCliente(cliente);
      setIsEditModalOpen(true);
    }, 100);
  }, []);


  // Kanban/List toggle state
  const [kanbanMode, setKanbanMode] = useState(false);

  // ✅ LOADING STATE
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-caixa-primary via-caixa-secondary to-caixa-primary flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-white mx-auto mb-4" />
          <p className="text-white">Carregando clientes...</p>
        </div>
      </div>
    );
  }

  // ✅ ERROR STATE
  if (error && allClientes.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-caixa-primary via-caixa-secondary to-caixa-primary flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center max-w-md w-full">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Erro ao carregar</h3>
          <p className="text-gray-600 mb-6">{error}</p>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => fetchClientes(1, true)}
            className="bg-caixa-primary text-white px-6 py-2 rounded-lg font-medium hover:bg-caixa-secondary transition-colors"
          >
            Tentar novamente
          </motion.button>
        </div>
      </div>
    );
  }

  return (
    // ✅ LAYOUT EXPANDIDO - TELA CHEIA
    <div className="min-h-screen bg-gradient-to-br from-caixa-primary via-caixa-secondary to-caixa-primary flex flex-col">
      {/* ✅ HEADER FIXO */}
      <div className="bg-white/10 border-b border-white/20 sticky top-0 z-50 backdrop-blur-md flex-shrink-0">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-caixa-orange rounded-xl flex items-center justify-center shadow-lg">
                <User className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-white">
                  {canEditAll ? (kanbanMode ? "Kanban de Clientes" : "Lista de Clientes") : (kanbanMode ? "Kanban - Meus Clientes" : "Meus Clientes")}
                </h1>
                <p className="text-sm text-caixa-extra-light">
                  {filteredClientes.length} encontrado(s) 
                  {hasMore && ` • ${allClientes.length} carregados`}
                  {isCorretor && " • Apenas seus clientes"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-4 py-2 text-white hover:bg-white/10 rounded-lg transition-colors border border-white/20"
              >
                <Filter className="w-4 h-4" />
                <span className="hidden sm:inline">Filtros</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => fetchClientes(1, true)}
                className="flex items-center gap-2 px-4 py-2 bg-caixa-orange text-white rounded-lg hover:bg-caixa-orange-light transition-colors shadow-lg"
              >
                <RefreshCw className="w-4 h-4" />
                <span className="hidden sm:inline">Atualizar</span>
              </motion.button>

              {/* ✅ BOTÃO EXPORTAR - APENAS PARA ADMIN E CORRESPONDENTE */}
              {canEditAll && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={exportarExcel}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-lg"
                >
                  <FileText className="w-4 h-4" />
                  <span className="hidden sm:inline">Exportar Excel</span>
                </motion.button>
              )}

              {/* Botão para alternar entre Lista e Kanban */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setKanbanMode((prev) => !prev)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors border border-white/20 ${kanbanMode ? 'bg-caixa-primary text-white' : 'bg-white/20 text-caixa-primary'}`}
                title={kanbanMode ? "Ver em lista" : "Ver em Kanban"}
              >
                <span className="hidden sm:inline">{kanbanMode ? "Ver em Lista" : "Ver em Kanban"}</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {kanbanMode ? (
                    <rect x="3" y="4" width="7" height="16" rx="2" className="fill-current" />
                  ) : (
                    <rect x="3" y="4" width="7" height="16" rx="2" className="stroke-current" />
                  )}
                  <rect x="14" y="4" width="7" height="16" rx="2" className={kanbanMode ? "fill-current" : "stroke-current"} />
                </svg>
              </motion.button>
            </div>
          </div>

          {/* ✅ FILTROS */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="pb-4 pt-2">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="text"
                        placeholder="Buscar clientes..."
                        value={filters.search}
                        onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                        className="w-full pl-10 pr-4 py-2 border border-white/20 bg-white/10 text-white placeholder-white/70 rounded-lg focus:ring-2 focus:ring-caixa-orange focus:border-transparent transition-all"
                      />
                    </div>
                    
                    <select
                      value={filters.status}
                      onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                      className="px-4 py-2 border border-white/20 bg-white/10 text-white rounded-lg focus:ring-2 focus:ring-caixa-orange focus:border-transparent transition-all"
                    >
                      <option value="Todos" className="text-gray-900">Todos os status</option>
                      {Object.entries(statusMap).map(([key, value]) => (
                        <option key={key} value={key} className="text-gray-900">{value.name}</option>
                      ))}
                    </select>
                    
                    {(canEditAll || isCorretor) && (
                      <select
                        value={filters.corretor}
                        onChange={(e) => setFilters(prev => ({ ...prev, corretor: e.target.value }))}
                        className="px-4 py-2 border border-white/20 bg-white/10 text-white rounded-lg focus:ring-2 focus:ring-caixa-orange focus:border-transparent transition-all"
                      >
                        <option value="Todos" className="text-gray-900">
                          {canEditAll ? "Todos os usuários" : "Meus clientes"}
                        </option>
                        {canEditAll && corretores.map(c => (
                          <option key={c.id} value={c.id} className="text-gray-900">
                            {c.first_name} {c.last_name}
                            {c.is_administrador && " (Admin)"}
                            {c.is_correspondente && " (Correspondente)"}
                            {c.is_corretor && " (Corretor)"}
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

      {/* ✅ CONTENT - TELA CHEIA */}
      <div className="flex-1 p-4 sm:p-6 lg:p-8">
        {kanbanMode ? (
          <KanbanClientes
            clientes={filteredClientes}
            user={user}
            onViewDetails={handleViewCliente}
            onEdit={handleEditCliente}
            onDelete={handleDelete}
            onStatusChange={handleStatusUpdate}
            // statusMap pode ser passado se quiser customizar as cores/ícones
          />
        ) : (
          filteredClientes.length === 0 && !loading ? (
            <div className="text-center py-20">
              <User className="w-12 h-12 text-white/50 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">Nenhum cliente encontrado</h3>
              <p className="text-caixa-extra-light mb-6">
                {filters.search || filters.status !== "Todos" ? 
                  "Tente ajustar os filtros de busca." : 
                  "Ainda não há clientes cadastrados."}
              </p>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={fetchClientes}
                className="bg-caixa-orange text-white px-6 py-2 rounded-lg hover:bg-caixa-orange-light transition-colors shadow-lg"
              >
                Atualizar lista
              </motion.button>
            </div>
          ) : (
            <div className="bg-white/10 border border-white/20 rounded-xl shadow-2xl overflow-hidden backdrop-blur-md w-full">
              <div className="overflow-x-auto">
                <SafeTable className="w-full table-fixed">
                  <thead>
                    <tr className="bg-white/10 border-b border-white/20">
                      <th className="w-[25%] min-w-[200px] px-3 sm:px-6 py-4 text-left text-xs sm:text-sm font-semibold text-white">Cliente</th>
                      <th className="w-[15%] min-w-[140px] px-2 sm:px-6 py-4 text-left text-xs sm:text-sm font-semibold text-white">Status</th>
                      <th className="w-[10%] min-w-[90px] px-2 sm:px-6 py-4 text-left text-xs sm:text-sm font-semibold text-white hidden md:table-cell">Data</th>
                      <th className="w-[12%] min-w-[100px] px-2 sm:px-6 py-4 text-left text-xs sm:text-sm font-semibold text-white hidden lg:table-cell">Telefone</th>
                      <th className="w-[12%] min-w-[100px] px-2 sm:px-6 py-4 text-left text-xs sm:text-sm font-semibold text-white hidden lg:table-cell">CPF</th>
                      <th className="w-[16%] min-w-[120px] px-2 sm:px-6 py-4 text-left text-xs sm:text-sm font-semibold text-white hidden sm:table-cell">Responsável</th>
                      <th className="w-[10%] min-w-[80px] px-2 sm:px-6 py-4 text-center text-xs sm:text-sm font-semibold text-white">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    <AnimatePresence mode="popLayout">
                      {filteredClientes.map((cliente) => (
                        <ListRow
                          key={generateStableKey('cliente', cliente, cliente.id)}
                          cliente={cliente}
                          canEditCliente={canEditCliente}
                          canChangeStatus={canChangeStatus}
                          onView={handleViewCliente}
                          onEdit={handleEditCliente}
                          onDelete={handleDelete}
                          onStatusUpdate={handleStatusUpdate}
                        />
                      ))}
                    </AnimatePresence>
                  </tbody>
                </SafeTable>
              </div>
            </div>
          )
        )}
      </div>

      {/* Modals */}
      <AnimatePresence mode="wait">
        {isModalOpen && selectedCliente && (
          <ModalCliente 
            key="modal-cliente"
            isOpen={isModalOpen} 
            onClose={() => {
              setIsModalOpen(false);
              setTimeout(() => setSelectedCliente(null), 150);
            }} 
            cliente={selectedCliente} 
          />
        )}
        {isNotasModalOpen && selectedNotas && (
          <ModalNotas 
            key="modal-notas"
            isOpen={isNotasModalOpen} 
            onClose={() => {
              setIsNotasModalOpen(false);
              setTimeout(() => setSelectedNotas([]), 150);
            }} 
            notas={selectedNotas} 
          />
        )}
        {isEditModalOpen && selectedCliente && (
          <ModalEditarCliente 
            key="modal-editar"
            isOpen={isEditModalOpen} 
            onClose={() => {
              setIsEditModalOpen(false);
              setTimeout(() => setSelectedCliente(null), 150);
            }} 
            cliente={selectedCliente || { documentos_pessoais: [] }} 
            onSave={handleEditSave}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default ListaClientes;