import ConjugeInfo from "./ConjugeInfo";
import React, { useState, useEffect } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import Toast from "./Toast"; // ✅ IMPORTAR O TOAST
import PDFPageViewer from "./PDFPageViewer"; // ✅ IMPORTAR O VISUALIZADOR DE PÁGINAS
import { 
  FaTimes, FaUser, FaPhone, FaEnvelope, FaIdCard, 
  FaDollarSign, FaCalendarAlt, FaBriefcase, FaUsers,
  FaEye, FaFileAlt, FaPlus, FaCheck, FaTrash,
  FaStickyNote, FaMapMarkerAlt, FaHeart, FaEdit,
  FaSpinner, FaList
} from "react-icons/fa";
import { 
  MdVisibility, MdAttachFile, MdLocationOn, 
  MdWork, MdFamily, MdDateRange, MdKeyboardArrowDown 
} from "react-icons/md";

const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

console.log('🔍 API URL configurada:', apiUrl);

// statusMap sincronizado com KanbanClientes.jsx e ListaClientes.jsx
const statusMap = {
  aguardando_aprovacao: {
    name: "Aguardando Aprovação",
    color: "bg-yellow-500",
    textColor: "text-yellow-800",
    darkColor: "bg-yellow-600",
    icon: "⏳"
  },
  proposta_apresentada: {
    name: "Proposta Apresentada",
    color: "bg-blue-500",
    textColor: "text-blue-800",
    darkColor: "bg-blue-600",
    icon: "📋"
  },
  documentacao_pendente: {
    name: "Documentação Pendente",
    color: "bg-orange-500",
    textColor: "text-orange-800",
    darkColor: "bg-orange-600",
    icon: "📄"
  },
  visita_efetuada: {
    name: "Visita Efetuada",
    color: "bg-purple-500",
    textColor: "text-purple-800",
    darkColor: "bg-purple-600",
    icon: "🏠"
  },
  aguardando_cancelamento_qv: {
    name: "Aguardando Cancelamento/QV",
    color: "bg-gray-500",
    textColor: "text-gray-800",
    darkColor: "bg-gray-600",
    icon: "🔄"
  },
  condicionado: {
    name: "Condicionado",
    color: "bg-amber-500",
    textColor: "text-amber-800",
    darkColor: "bg-amber-600",
    icon: "⚠️"
  },
  cliente_aprovado: {
    name: "Aprovado",
    color: "bg-green-500",
    textColor: "text-green-800",
    darkColor: "bg-green-600",
    icon: "✅"
  },
  reprovado: {
    name: "Reprovado",
    color: "bg-red-500",
    textColor: "text-red-800",
    darkColor: "bg-red-600",
    icon: "❌"
  },
  reserva: {
    name: "Reserva",
    color: "bg-indigo-500",
    textColor: "text-indigo-800",
    darkColor: "bg-indigo-600",
    icon: "📋"
  },
  conferencia_documento: {
    name: "Conferência de Documento",
    color: "bg-purple-700",
    textColor: "text-purple-900",
    darkColor: "bg-purple-800",
    icon: "📁"
  },
  nao_descondiciona: {
    name: "Não Descondiciona",
    color: "bg-pink-500",
    textColor: "text-pink-800",
    darkColor: "bg-pink-600",
    icon: "⛔"
  },
  conformidade: {
    name: "Conformidade",
    color: "bg-cyan-500",
    textColor: "text-cyan-800",
    darkColor: "bg-cyan-600",
    icon: "✔️"
  },
  concluido: {
    name: "Venda Concluída",
    color: "bg-emerald-500",
    textColor: "text-emerald-800",
    darkColor: "bg-emerald-600",
    icon: "🎉"
  },
  nao_deu_continuidade: {
    name: "Não Deu Continuidade",
    color: "bg-slate-500",
    textColor: "text-slate-800",
    darkColor: "bg-slate-600",
    icon: "⏸️"
  },
  aguardando_reserva_orcamentaria: {
    name: "Aguardando Reserva Orçamentária",
    color: "bg-indigo-500",
    textColor: "text-indigo-800",
    darkColor: "bg-indigo-600",
    icon: "💰"
  },
  fechamento_proposta: {
    name: "Fechamento Proposta",
    color: "bg-teal-500",
    textColor: "text-teal-800",
    darkColor: "bg-teal-600",
    icon: "🤝"
  },
  processo_em_aberto: {
    name: "Processo Aberto",
    color: "bg-stone-500",
    textColor: "text-stone-800",
    darkColor: "bg-stone-600",
    icon: "📁"
  },
};

const ModalCliente = ({ cliente, isOpen, onClose, onStatusChange }) => {
  const [nota, setNota] = useState("");
  const [documentLoading, setDocumentLoading] = useState({}); // ✅ NOVO: loading por documento
  const [status, setStatus] = useState(cliente?.status || "");
  const [loading, setLoading] = useState(false);
  const [notas, setNotas] = useState([]);
  const [activeTab, setActiveTab] = useState("info"); // ✅ ESTADO PARA CONTROLAR ABA ATIVA
  const [selectedDocumentForPageView, setSelectedDocumentForPageView] = useState(null); // ✅ NOVO: Para visualizar páginas
  const { user } = useAuth();

  // ✅ ESTADOS PARA O TOAST
  const [toast, setToast] = useState({
    isVisible: false,
    message: '',
    type: 'success'
  });

  // ✅ FUNÇÃO PARA MOSTRAR TOAST
  const showToast = (message, type = 'success') => {
    setToast({
      isVisible: true,
      message,
      type
    });
  };

  // ✅ FUNÇÃO PARA FECHAR TOAST
  const closeToast = () => {
    setToast(prev => ({ ...prev, isVisible: false }));
  };

  useEffect(() => {
    const fetchNotas = async () => {
      if (cliente?.id) {
        try {
          const token = localStorage.getItem("authToken");
          const response = await axios.get(
            `${apiUrl}/notas/clientes/${cliente.id}/notas`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );
          
          if (Array.isArray(response.data)) {
            console.log(`📝 ${response.data.length} notas carregadas`);
            console.log('📋 Dados das notas:', response.data);
            
            setNotas(response.data);
          } else {
            console.error("Esperado um array mas recebido:", response.data);
            setNotas([]);
          }
        } catch (error) {
          console.error("❌ Erro ao buscar notas:", error);
          setNotas([]);
        }
      }
    };

    if (isOpen) {
      fetchNotas();
      setStatus(cliente?.status || "");
      setActiveTab("info"); // ✅ RESETAR ABA ATIVA QUANDO ABRE O MODAL
    }
  }, [cliente, isOpen, apiUrl]);

  if (!isOpen) return null;

  const handleAddNota = async () => {
    if (nota.trim() === "") return;

    const novaNota = {
      cliente_id: cliente.id,
      processo_id: null,
      nova: true,
      destinatario: cliente.nome,
      texto: nota,
      data_criacao: new Date(),
      criado_por_id: user ? user.id : null,
    };

    try {
      const token = localStorage.getItem("authToken");
      const response = await axios.post(
        `${apiUrl}/notas`, 
        novaNota,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      
      console.log('✅ Nova nota criada:', response.data);
      
      const notasResponse = await axios.get(
        `${apiUrl}/notas/clientes/${cliente.id}/notas`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      
      if (Array.isArray(notasResponse.data)) {
        setNotas(notasResponse.data);
      }
      
      setNota("");

      // ✅ TOAST DE SUCESSO PARA NOVA NOTA
      if (response.data.whatsapp_enviado) {
        showToast('📝 Nota adicionada e notificação enviada via WhatsApp!', 'success');
      } else {
        showToast('📝 Nota adicionada com sucesso!', 'success');
      }
      
    } catch (error) {
      console.error("❌ Erro ao adicionar nota:", error);
      // ✅ TOAST DE ERRO
      showToast('❌ Erro ao adicionar nota. Tente novamente', 'error');
    }
  };

  const handleConcluirNota = async (id) => {
    try {
      // 1. Concluir a nota
      const response = await axios.put(`${apiUrl}/notas/${id}/concluir`);
      
      // 2. Atualizar a lista de notas no frontend
      setNotas((prevNotas) =>
        prevNotas.map((n) => (n.id === id ? response.data : n))
      );

      // 3. Enviar notificação para correspondentes
      try {
        const token = localStorage.getItem("authToken");
        
        // Buscar a nota que foi concluída para ter os detalhes
        const notaConcluida = notas.find(n => n.id === id);
        
        const notificacaoData = {
          clienteId: cliente.id,
          clienteNome: cliente.nome,
          notaTexto: notaConcluida?.texto || 'Nota concluída',
          notaId: id,
          usuarioConcluiu: user ? `${user.first_name} ${user.last_name}`.trim() : 'Sistema',
          acao: 'CONCLUIDA'
        };

        console.log('📤 Enviando notificação de conclusão:', notificacaoData);

        const notificationResponse = await axios.post(
          `${apiUrl}/whatsapp/notificarCorrespondentesNotaConcluida`,
          notificacaoData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        console.log('✅ Resposta da notificação:', notificationResponse.data);

        // ✅ MOSTRAR TOAST DE SUCESSO COM DETALHES
        if (notificationResponse.data.success) {
          const { enviadas, total, erros } = notificationResponse.data;
          showToast(
            `🎉 Nota concluída! Notificação enviada para ${enviadas}/${total} correspondentes via WhatsApp`,
            'success'
          );
        } else {
          showToast('⚠️ Nota concluída, mas houve erro ao enviar notificações', 'warning');
        }

      } catch (notificationError) {
        console.error('❌ Erro ao enviar notificação de conclusão:', notificationError);
        
        // ✅ TOAST DE AVISO SE A NOTIFICAÇÃO FALHAR
        if (notificationError.response?.status === 503) {
          showToast('✅ Nota concluída! ⚠️ WhatsApp desconectado - notificação não enviada', 'warning');
        } else {
          showToast('✅ Nota concluída! ❌ Erro ao enviar notificação WhatsApp', 'warning');
        }
      }

    } catch (error) {
      console.error("❌ Erro ao concluir nota:", error);
      // ✅ TOAST DE ERRO
      showToast('❌ Erro ao concluir a nota. Tente novamente', 'error');
    }
  };

  const handleDeletarNota = async (id) => {
    try {
      const token = localStorage.getItem("authToken");
      await axios.delete(`${apiUrl}/notas/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setNotas((prevNotas) => prevNotas.filter((n) => n.id !== id));
      showToast('🗑️ Nota deletada com sucesso!', 'success');
    } catch (error) {
      console.error("Erro ao deletar nota:", error);
      showToast('❌ Erro ao deletar nota. Tente novamente', 'error');
    }
  };

  const handleStatusChange = async (e) => {
    const newStatus = e.target.value;
    setStatus(newStatus);
    setLoading(true);

    try {
      const token = localStorage.getItem("authToken");
      await axios.patch(`${apiUrl}/clientes/${cliente.id}/status`, { 
        status: newStatus 
      }, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      showToast(`✅ Status alterado para: ${statusMap[newStatus]?.name || newStatus}`, 'success');
      
      if (onStatusChange) onStatusChange();
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      showToast('❌ Erro ao alterar status. Tente novamente', 'error');
      // Reverter o status em caso de erro
      setStatus(cliente?.status || "");
    } finally {
      setLoading(false);
    }
  };

  // ✅ FUNÇÃO CORRIGIDA PARA VISUALIZAR DOCUMENTOS COM VERIFICAÇÃO DE SEGURANÇA
  const handleDocumentClick = async (path, tipo) => {
    if (!path) {
      console.warn('⚠️ Caminho do documento não encontrado');
      showToast('⚠️ Documento não encontrado', 'warning');
      return;
    }

    // ✅ VALIDAÇÃO EXTRA: Verificar se o caminho pertence ao cliente atual
    if (!path.includes(cliente?.cpf)) {
      console.error(`🚨 TENTATIVA DE ACESSO INSEGURO BLOQUEADA! Path: ${path} não contém CPF: ${cliente?.cpf}`);
      showToast('❌ Erro de segurança: documento não pertence ao cliente', 'error');
      return;
    }

    // ✅ VERIFICAR SE O DOCUMENTO REALMENTE PERTENCE AO CLIENTE
    try {
      const token = localStorage.getItem("authToken");
      const verificarResponse = await axios.get(
        `${apiUrl}/clientes/${cliente.id}/documentos/${tipo}/verificar`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (verificarResponse.data.exists && verificarResponse.data.url) {
        console.log('✅ Documento validado com sucesso:');
        console.log('🌐 URL do documento validada:', verificarResponse.data.url);
        console.log('📂 Caminho do documento:', verificarResponse.data.path);
        console.log('👤 Cliente CPF:', cliente?.cpf);
        console.log('📋 Tipo do documento:', tipo);

        window.open(verificarResponse.data.url, "_blank");
      } else {
        console.warn('⚠️ Documento não existe ou não pertence ao cliente');
        console.log('📋 Resposta da verificação:', verificarResponse.data);
        showToast('⚠️ Documento não encontrado ou indisponível', 'warning');
      }
    } catch (error) {
      console.error('❌ Erro ao verificar documento:', error);
      console.log('📋 Detalhes do erro:', error.response?.data);
      if (error.response?.status === 403) {
        showToast('❌ Sem permissão para acessar este documento', 'error');
      } else if (error.response?.status === 404) {
        showToast('⚠️ Documento não encontrado', 'warning');
      } else {
        showToast('❌ Erro ao acessar documento', 'error');
      }
    }
  };

  // ✅ FUNÇÃO PARA REMOVER DOCUMENTO
  const handleRemoveDocument = async (tipo) => {
    if (!cliente?.id) {
      showToast('❌ Erro: Cliente não identificado', 'error');
      return;
    }

    // Confirmar remoção
    if (!window.confirm(`Tem certeza que deseja remover o documento "${tipo}"?`)) {
      return;
    }

    // Definir loading para o documento específico
    setDocumentLoading(prev => ({ ...prev, [tipo]: true }));

    try {
      const token = localStorage.getItem("authToken");
      
      const response = await axios.delete(
        `${apiUrl}/clientes/${cliente.id}/documentos/${tipo}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log('✅ Documento removido com sucesso:', response.data);
      
      // Atualizar o estado local do cliente para refletir a remoção
      // Nota: Isso é uma atualização otimista. Idealmente, você deveria 
      // recarregar os dados do cliente ou atualizar via props
      showToast(`🗑️ Documento "${tipo}" removido com sucesso!`, 'success');
      
      // Força uma atualização da página/componente pai se necessário
      if (onStatusChange) {
        onStatusChange(); // Isso pode disparar uma atualização no componente pai
      }

    } catch (error) {
      console.error('❌ Erro ao remover documento:', error);
      
      if (error.response?.status === 403) {
        showToast('❌ Sem permissão para remover este documento', 'error');
      } else if (error.response?.status === 404) {
        showToast('⚠️ Documento não encontrado', 'warning');
      } else {
        showToast('❌ Erro ao remover documento. Tente novamente', 'error');
      }
    } finally {
      // Remover loading do documento específico
      setDocumentLoading(prev => ({ ...prev, [tipo]: false }));
    }
  };

  const InfoCard = ({ icon: Icon, label, value, iconColor = "text-caixa-orange" }) => (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4 hover:bg-white/15 hover:border-caixa-orange/50 transition-all duration-300"
    >
      <div className="flex items-center gap-3 mb-2">
        <Icon className={`w-4 h-4 ${iconColor}`} />
        <span className="text-caixa-extra-light text-sm font-medium">{label}</span>
      </div>
      <p className="text-white font-semibold break-words">
        {value || "Não informado"}
      </p>
    </motion.div>
  );

  const DocumentButton = ({ path, label, icon: Icon = FaFileAlt, isRequired = false, tipo }) => {
    const { user } = useAuth();
    const canEdit = user?.is_administrador || user?.is_correspondente || 
                   (user?.is_corretor && cliente?.userId === user?.id);

    // ✅ DESTACAR TELA DE APROVAÇÃO
    const isApprovalDocument = tipo === 'tela_aprovacao';

    // ✅ VALIDAÇÃO DE SEGURANÇA: Verificar se o caminho realmente pertence ao cliente
    const isValidPath = (path) => {
      if (!path || !cliente?.cpf) {
        console.log(`🔒 Caminho inválido: path=${path}, cpf=${cliente?.cpf}`);
        return false;
      }
      
      // O caminho deve conter o CPF do cliente
      const isValid = path.includes(cliente.cpf);
      console.log(`🔒 Validação de caminho: ${path} para cliente ${cliente.cpf} = ${isValid ? 'VÁLIDO' : 'INVÁLIDO'}`);
      return isValid;
    };

    // Se o caminho não é válido para este cliente, trate como se não existisse
    const validPath = isValidPath(path) ? path : null;
    
    if (path && !validPath) {
      console.warn(`⚠️ BLOQUEADO: Tentativa de exibir documento que não pertence ao cliente atual. Path: ${path}, Cliente: ${cliente?.cpf}`);
    }

    return validPath ? (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`flex items-center gap-2 border rounded-xl p-4 transition-all duration-300 w-full ${
          isApprovalDocument 
            ? 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 hover:from-green-500/30 hover:to-emerald-500/30 border-2 border-green-500/50 hover:border-green-400/70 shadow-lg'
            : 'bg-white/10 hover:bg-white/15 border border-white/20 hover:border-caixa-orange/50'
        }`}
      >
        <div className="flex items-center gap-2 flex-1">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleDocumentClick(validPath, tipo)}
            className="flex items-center gap-3 flex-1"
          >
            <div className={`p-2 rounded-xl ${isApprovalDocument ? 'bg-green-500/30' : 'bg-caixa-orange/20'}`}>
              <Icon className={`w-5 h-5 ${isApprovalDocument ? 'text-green-400' : 'text-caixa-orange'}`} />
            </div>
            <div className="flex-1 text-left">
              <span className={`font-medium block ${isApprovalDocument ? 'text-green-300' : 'text-white'}`}>
                {isApprovalDocument && '🎯 '}{label}
              </span>
              <span className={`text-xs block truncate ${isApprovalDocument ? 'text-green-200' : 'text-caixa-extra-light'}`}>
                📎 {validPath.split('/').pop() || validPath}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-3 py-1.5 rounded-full border font-bold ${
                isApprovalDocument 
                  ? 'bg-green-500/30 text-green-300 border-green-500/50 animate-pulse'
                  : 'bg-green-500/20 text-green-400 border-green-500/30'
              }`}>
                {isApprovalDocument ? '🎯 APROVAÇÃO' : '✅ Enviado'}
              </span>
              <MdVisibility className={`w-5 h-5 ${isApprovalDocument ? 'text-green-400' : 'text-caixa-orange'}`} />
            </div>
          </motion.button>
          
          {/* Botão para visualizar páginas separadamente */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setSelectedDocumentForPageView({ clienteId: cliente.id, tipo })}
            className={`p-2 rounded-lg transition-colors ${
              isApprovalDocument 
                ? 'text-green-400 hover:text-green-300 hover:bg-green-500/10'
                : 'text-blue-400 hover:text-blue-300 hover:bg-blue-500/10'
            }`}
            title="Ver páginas separadamente"
          >
            <FaList className="w-4 h-4" />
          </motion.button>
        </div>
        
        {canEdit && (
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => handleRemoveDocument(tipo)}
            disabled={documentLoading[tipo]}
            className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Remover documento"
          >
            {documentLoading[tipo] ? (
              <FaSpinner className="w-4 h-4 animate-spin" />
            ) : (
              <FaTrash className="w-4 h-4" />
            )}
          </motion.button>
        )}
      </motion.div>
    ) : (
      <div className={`flex items-center gap-3 rounded-xl p-4 opacity-75 ${
        isApprovalDocument 
          ? 'bg-yellow-500/10 border-2 border-yellow-500/30'
          : 'bg-white/5 border border-white/10'
      }`}>
        <div className={`p-2 rounded-xl ${isApprovalDocument ? 'bg-yellow-500/20' : 'bg-gray-500/20'}`}>
          <Icon className={`w-5 h-5 ${isApprovalDocument ? 'text-yellow-400' : 'text-gray-400'}`} />
        </div>
        <div className="flex-1 text-left">
          <span className={`font-medium block ${isApprovalDocument ? 'text-yellow-300' : 'text-gray-400'}`}>
            {isApprovalDocument && '⏳ '}{label}
          </span>
          <span className={`text-xs block ${isApprovalDocument ? 'text-yellow-200' : 'text-gray-500'}`}>
            {isRequired || isApprovalDocument ? "⚠️ Documento importante não enviado" : "📝 Aguardando envio"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-3 py-1.5 rounded-full border font-bold ${
            isApprovalDocument 
              ? 'bg-yellow-500/30 text-yellow-300 border-yellow-500/50'
              : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
          }`}>
            {isApprovalDocument ? '⏳ PENDENTE' : '⏳ Pendente'}
          </span>
        </div>
      </div>
    );
  };

  // Sempre exibe as abas na ordem fixa: Informações | Documentos | Cônjuge | Notas
  const hasConjuge = !!(cliente?.conjuge_nome || cliente?.conjuge_email || cliente?.conjuge_cpf);
  const tabs = [
    { id: "info", label: "Informações", icon: FaUser },
    { 
      id: "docs", 
      label: "Documentos", 
      icon: FaFileAlt,
      hasApproval: !!cliente?.tela_aprovacao,
      approvalStatus: cliente?.tela_aprovacao ? "approved" : "pending"
    },
    {
      id: "conjuge",
      label: "Cônjuge",
      icon: FaHeart,
      disabled: !hasConjuge,
      highlight: hasConjuge // Para destaque visual
    },
    { id: "notes", label: "Notas", icon: FaStickyNote, count: notas.length },
  ];

  const currentStatus = statusMap[status] || statusMap.aguardando_aprovacao;

  return (
    <AnimatePresence>
      {/* ✅ TOAST COMPONENT */}
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={closeToast}
        duration={5000} // 5 segundos
      />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="bg-caixa-primary rounded-3xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden border border-white/20"
        >
          {/* Header */}
          <div className="bg-white p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-caixa-orange/20 rounded-2xl flex items-center justify-center shadow-lg">
                  <span className="text-2xl font-bold text-caixa-orange">
                    {cliente?.nome?.charAt(0)?.toUpperCase() || "?"}
                  </span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-caixa-gray-800">
                    {cliente?.nome || "Cliente"}
                  </h2>
                  <p className="text-caixa-gray-600 flex items-center gap-2">
                    <FaEnvelope className="w-4 h-4" />
                    {cliente?.email || "Email não informado"}
                  </p>
                  <p className="text-caixa-gray-600 flex items-center gap-2 mt-1">
                    <FaUser className="w-4 h-4" />
                    Usuário: {user?.first_name && user?.last_name
                      ? `${user.first_name} ${user.last_name}`.trim()
                      : user?.username || user?.email || "Desconhecido"}
                  </p>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="p-2 bg-caixa-gray-200 hover:bg-caixa-gray-300 rounded-xl transition-colors shadow-lg"
              >
                <FaTimes className="w-5 h-5 text-caixa-gray-700" />
              </motion.button>
            </div>

            {/* Status Badge */}
            <div className="mt-4 flex items-center gap-4">
              <div className={`${currentStatus.darkColor} text-white px-4 py-2 rounded-xl shadow-lg flex items-center gap-2 font-medium text-sm border border-white/20`}>
                <span className="text-base">{currentStatus.icon}</span>
                <span>{currentStatus.name}</span>
              </div>
              
              {/* Badge de Tela de Aprovação */}
              {cliente?.tela_aprovacao && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-2 rounded-xl shadow-lg flex items-center gap-2 font-bold text-sm border-2 border-green-400/50"
                >
                  <FaEye className="w-4 h-4" />
                  <span>TELA DE APROVAÇÃO</span>
                  <div className="w-2 h-2 bg-white rounded-full animate-ping"></div>
                </motion.div>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-caixa-secondary/50 border-b border-white/20">
            <div className="flex overflow-x-auto">
              {tabs.map((tab) => (
                <motion.button
                  key={tab.id}
                  whileHover={tab.disabled ? undefined : { scale: 1.02 }}
                  onClick={() => setActiveTab(tab.id)}
                  // Removido o disabled para permitir acesso sempre
                  className={`flex items-center gap-2 px-6 py-4 font-medium transition-all whitespace-nowrap relative
                    ${activeTab === tab.id ? "bg-caixa-orange text-white shadow-lg" : "text-caixa-extra-light hover:text-white hover:bg-white/10"}
                    ${tab.disabled ? "opacity-50" : ""}
                    ${tab.highlight && !tab.disabled ? "border-b-4 border-pink-400 bg-pink-500/10 text-pink-300" : ""}
                  `}
                  style={tab.id === "conjuge" && tab.highlight && !tab.disabled ? { zIndex: 2 } : {}}
                >
                  <tab.icon className={`w-4 h-4 ${tab.id === "conjuge" && tab.highlight && !tab.disabled ? "text-pink-400" : ""}`} />
                  <span>{tab.label}</span>
                  {/* Contador de notas */}
                  {tab.count !== undefined && (
                    <span className="bg-caixa-orange text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {tab.count}
                    </span>
                  )}
                  {/* Indicador de tela de aprovação */}
                  {tab.hasApproval !== undefined && (
                    <div className="flex items-center gap-1">
                      {tab.approvalStatus === "approved" ? (
                        <>
                          <div className="relative">
                            <FaEye className="w-3 h-3 text-green-400" />
                            <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-ping"></div>
                          </div>
                          <span className="bg-green-500/30 text-green-300 text-xs px-2 py-0.5 rounded-full border border-green-500/50 font-bold">
                            ✅
                          </span>
                        </>
                      ) : (
                        <span className="bg-yellow-500/30 text-yellow-300 text-xs px-2 py-0.5 rounded-full border border-yellow-500/50">
                          ⏳
                        </span>
                      )}
                    </div>
                  )}
                  {/* Destaque visual para aba do cônjuge */}
                  {tab.id === "conjuge" && tab.highlight && !tab.disabled && (
                    <span className="ml-2 px-2 py-0.5 rounded-full bg-pink-400/20 text-pink-300 text-xs font-bold border border-pink-400/40 animate-pulse">Novo</span>
                  )}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[60vh] bg-caixa-primary">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              {activeTab === "conjuge" && <ConjugeInfo cliente={cliente} />}
              {activeTab === "info" && (
                <div className="space-y-6">
                  {/* Status Change */}
                  <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <FaEdit className="w-5 h-5 text-caixa-orange" />
                      Alterar Status
                    </h3>
                    <div className="relative">
                      <select
                        value={status}
                        onChange={handleStatusChange}
                        disabled={loading}
                        className="appearance-none w-full bg-caixa-orange text-white border border-caixa-orange/50 rounded-xl px-4 py-3 pr-10 focus:bg-caixa-orange-dark focus:ring-2 focus:ring-caixa-orange/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {Object.entries(statusMap).map(([key, value]) => (
                          <option key={key} value={key} className="bg-caixa-orange text-white">
                            {value.icon} {value.name}
                          </option>
                        ))}
                      </select>
                      {loading ? (
                        <FaSpinner className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white animate-spin" />
                      ) : (
                        <MdKeyboardArrowDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white pointer-events-none" />
                      )}
                    </div>
                  </div>

                  {/* Personal Information */}
                  <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6">
                    <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                      <FaUser className="w-5 h-5 text-caixa-orange" />
                      Informações Pessoais
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <InfoCard
                        icon={FaUser}
                        label="Nome Completo"
                        value={cliente?.nome}
                        iconColor="text-caixa-orange"
                      />
                      <InfoCard
                        icon={FaEnvelope}
                        label="Email"
                        value={cliente?.email}
                        iconColor="text-blue-400"
                      />
                      <InfoCard
                        icon={FaPhone}
                        label="Telefone"
                        value={cliente?.telefone}
                        iconColor="text-green-400"
                      />
                      <InfoCard
                        icon={FaIdCard}
                        label="CPF"
                        value={cliente?.cpf}
                        iconColor="text-yellow-400"
                      />
                      <InfoCard
                        icon={FaCalendarAlt}
                        label="Data de Nascimento"
                        value={cliente?.data_nascimento
                          ? (() => {
                              const d = cliente.data_nascimento.split('-');
                              return d.length === 3 ? `${d[2]}/${d[1]}/${d[0]}` : cliente.data_nascimento;
                            })()
                          : null}
                        iconColor="text-purple-400"
                      />
                      <InfoCard
                        icon={FaHeart}
                        label="Estado Civil"
                        value={cliente?.estado_civil}
                        iconColor="text-pink-400"
                      />
                      <InfoCard
                        icon={FaMapMarkerAlt}
                        label="Naturalidade"
                        value={cliente?.naturalidade}
                        iconColor="text-red-400"
                      />
                      <InfoCard
                        icon={FaIdCard}
                        label="Número PIS"
                        value={cliente?.numero_pis}
                        iconColor="text-indigo-400"
                      />
                      <InfoCard
                        icon={FaUsers}
                        label="Possui Dependente"
                        value={cliente?.possui_dependente ? "Sim" : "Não"}
                        iconColor="text-caixa-orange"
                      />
                      
                      {/* ✅ NOVOS CAMPOS ADICIONADOS */}
                      <InfoCard
                        icon={FaUser}
                        label="Possui Fiador"
                        value={cliente?.possui_fiador ? "Sim" : "Não"}
                        iconColor="text-cyan-400"
                      />
                      <InfoCard
                        icon={FaFileAlt}
                        label="Possui Formulários Caixa"
                        value={cliente?.possui_formularios_caixa ? "Sim" : "Não"}
                        iconColor="text-orange-400"
                      />
                    </div>
                  </div>

                  {/* ✅ SEÇÃO: INFORMAÇÕES DO FIADOR */}
                  <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6">
                    <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                      <FaUser className="w-5 h-5 text-cyan-400" />
                      Informações do Fiador
                      {cliente?.possui_fiador ? (
                        <span className="bg-cyan-500/20 text-cyan-400 text-xs px-2 py-1 rounded-full border border-cyan-500/30">
                          ✅ Possui Fiador
                        </span>
                      ) : (
                        <span className="bg-gray-500/20 text-gray-400 text-xs px-2 py-1 rounded-full border border-gray-500/30">
                          ❌ Sem Fiador
                        </span>
                      )}
                    </h3>
                    
                    {cliente?.possui_fiador ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <InfoCard
                          icon={FaUser}
                          label="Nome do Fiador"
                          value={cliente?.fiador_nome}
                          iconColor="text-cyan-400"
                        />
                        <InfoCard
                          icon={FaIdCard}
                          label="CPF do Fiador"
                          value={cliente?.fiador_cpf}
                          iconColor="text-cyan-400"
                        />
                        <InfoCard
                          icon={FaPhone}
                          label="Telefone do Fiador"
                          value={cliente?.fiador_telefone}
                          iconColor="text-cyan-400"
                        />
                        <InfoCard
                          icon={FaEnvelope}
                          label="Email do Fiador"
                          value={cliente?.fiador_email}
                          iconColor="text-cyan-400"
                        />
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-400">
                        <FaUser className="w-16 h-16 mx-auto mb-4 opacity-50" />
                        <p className="text-lg font-medium">Nenhum fiador cadastrado</p>
                        <p>As informações do fiador aparecerão aqui quando cadastradas</p>
                      </div>
                    )}
                  </div>

                  {/* ✅ SEÇÃO: FORMULÁRIOS CAIXA */}
                  <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6">
                    <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                      <FaFileAlt className="w-5 h-5 text-orange-400" />
                      Formulários Caixa
                      {cliente?.possui_formularios_caixa ? (
                        <span className="bg-orange-500/20 text-orange-400 text-xs px-2 py-1 rounded-full border border-orange-500/30">
                          ✅ Possui Formulários
                        </span>
                      ) : (
                        <span className="bg-gray-500/20 text-gray-400 text-xs px-2 py-1 rounded-full border border-gray-500/30">
                          ❌ Sem Formulários
                        </span>
                      )}
                    </h3>
                    
                    {cliente?.possui_formularios_caixa ? (
                      <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4">
                        <p className="text-orange-400 mb-2">
                          ℹ️ Este cliente possui formulários Caixa específicos necessários para financiamento.
                        </p>
                        <p className="text-white text-sm">
                          Os formulários estão disponíveis na aba "Documentos" para visualização.
                        </p>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-400">
                        <FaFileAlt className="w-16 h-16 mx-auto mb-4 opacity-50" />
                        <p className="text-lg font-medium">Formulários Caixa não necessários</p>
                        <p>Este cliente não requer formulários específicos da Caixa</p>
                      </div>
                    )}
                  </div>

                  {/* Informações Profissionais */}
                  <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6">
                    <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                      <FaBriefcase className="w-5 h-5 text-caixa-orange" />
                      Informações Profissionais
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <InfoCard
                        icon={FaBriefcase}
                        label="Profissão"
                        value={cliente?.profissao}
                        iconColor="text-caixa-orange"
                      />
                      <InfoCard
                        icon={FaDollarSign}
                        label="Valor da Renda"
                        value={cliente?.valor_renda ? `R$ ${cliente.valor_renda}` : null}
                        iconColor="text-green-400"
                      />
                      <InfoCard
                        icon={MdWork}
                        label="Tipo de Renda"
                        value={cliente?.renda_tipo}
                        iconColor="text-teal-400"
                      />
                      {cliente?.renda_tipo !== "INFORMAL" && cliente?.renda_tipo !== "informal" && (
                        <InfoCard
                          icon={FaCalendarAlt}
                          label="Data de Admissão"
                          value={cliente?.data_admissao && !isNaN(new Date(cliente.data_admissao).getTime())
                            ? (() => {
                                const d = cliente.data_admissao.split('-');
                                return d.length === 3 ? `${d[2]}/${d[1]}/${d[0]}` : cliente.data_admissao;
                              })()
                            : null}
                          iconColor="text-cyan-400"
                        />
                      )}
                      <InfoCard
                        icon={FaIdCard}
                        label="Carteira há mais de 3 anos"
                        value={cliente?.possui_carteira_mais_tres_anos ? "Sim" : "Não"}
                        iconColor="text-amber-400"
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "docs" && (
                <div className="space-y-6">
                  <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6">
                    <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                      <FaFileAlt className="w-5 h-5 text-caixa-orange" />
                      Documentação
                    </h3>
                    
                    {/* ✅ SEÇÃO: DOCUMENTOS PRINCIPAIS */}
                    <div className="mb-8">
                      <h4 className="text-md font-semibold text-caixa-extra-light mb-4 flex items-center gap-2">
                        <FaIdCard className="w-4 h-4 text-caixa-orange" />
                        Documentos Principais
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <DocumentButton
                          path={cliente?.documentos_pessoais}
                          label="Documentos Pessoais"
                          icon={FaIdCard}
                          isRequired={true}
                          tipo="documentosPessoais"
                        />
                        <DocumentButton
                          path={cliente?.extrato_bancario}
                          label="Extrato Bancário"
                          icon={FaDollarSign}
                          isRequired={true}
                          tipo="extratoBancario"
                        />
                      </div>
                    </div>

                    {/* ✅ SEÇÃO: DOCUMENTOS FAMILIARES */}
                    <div className="mb-8">
                      <h4 className="text-md font-semibold text-caixa-extra-light mb-4 flex items-center gap-2">
                        <FaUsers className="w-4 h-4 text-caixa-orange" />
                        Documentos Familiares
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <DocumentButton
                          path={cliente?.documentos_dependente}
                          label="Documentos do Dependente"
                          icon={FaUsers}
                          tipo="documentosDependente"
                        />
                        <DocumentButton
                          path={cliente?.documentos_conjuge}
                          label="Documentos do Cônjuge"
                          icon={FaHeart}
                          tipo="documentosConjuge"
                        />
                      </div>
                    </div>

                    {/* ✅ SEÇÃO: DOCUMENTOS DO FIADOR */}
                    <div className="mb-8">
                      <h4 className="text-md font-semibold text-caixa-extra-light mb-4 flex items-center gap-2">
                        <FaUser className="w-4 h-4 text-cyan-400" />
                        Documentos do Fiador
                        {cliente?.possui_fiador && (
                          <span className="bg-cyan-500/20 text-cyan-400 text-xs px-2 py-1 rounded-full border border-cyan-500/30">
                            ✅ Possui Fiador
                          </span>
                        )}
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                        <DocumentButton
                          path={cliente?.fiador_documentos}
                          label={`Documentos do Fiador${cliente?.fiador_nome ? ` (${cliente.fiador_nome})` : ''}`}
                          icon={FaUser}
                          isRequired={cliente?.possui_fiador}
                          tipo="fiadorDocumentos"
                        />
                      </div>
                      
                      {/* ✅ INFORMAÇÕES DO FIADOR RESUMIDAS */}
                      {cliente?.possui_fiador && (
                        <div className="mt-4 bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-4">
                          <h5 className="text-sm font-semibold text-cyan-400 mb-2">Dados do Fiador:</h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                            <p className="text-white">
                              <span className="text-cyan-400">Nome:</span> {cliente?.fiador_nome || "Não informado"}
                            </p>
                            <p className="text-white">
                              <span className="text-cyan-400">CPF:</span> {cliente?.fiador_cpf || "Não informado"}
                            </p>
                            <p className="text-white">
                              <span className="text-cyan-400">Telefone:</span> {cliente?.fiador_telefone || "Não informado"}
                            </p>
                            <p className="text-white">
                              <span className="text-cyan-400">Email:</span> {cliente?.fiador_email || "Não informado"}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* ✅ SEÇÃO: FORMULÁRIOS CAIXA */}
                    <div className="mb-8">
                      <h4 className="text-md font-semibold text-caixa-extra-light mb-4 flex items-center gap-2">
                        <FaFileAlt className="w-4 h-4 text-orange-400" />
                        Formulários Caixa
                        {cliente?.possui_formularios_caixa && (
                          <span className="bg-orange-500/20 text-orange-400 text-xs px-2 py-1 rounded-full border border-orange-500/30">
                            ✅ Possui Formulários
                          </span>
                        )}
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                        <DocumentButton
                          path={cliente?.formularios_caixa}
                          label="Formulários Caixa"
                          icon={FaFileAlt}
                          isRequired={cliente?.possui_formularios_caixa}
                          tipo="formulariosCaixa"
                        />
                      </div>
                      
                      {cliente?.possui_formularios_caixa && (
                        <div className="mt-4 bg-orange-500/10 border border-orange-500/30 rounded-xl p-4">
                          <p className="text-sm text-orange-400">
                            ℹ️ Os formulários Caixa são documentos específicos necessários para este tipo de financiamento.
                          </p>
                        </div>
                      )}
                    </div>
                    
                    {/* ✅ SEÇÃO: TELA DE APROVAÇÃO - DESTACADA */}
                    <div className={`mb-8 ${cliente?.tela_aprovacao ? 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-2 border-green-500/40' : 'bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-2 border-yellow-500/30'} rounded-2xl p-6 shadow-xl`}>
                      <div className="flex items-center justify-between mb-4">
                        <h4 className={`text-lg font-bold ${cliente?.tela_aprovacao ? 'text-green-300' : 'text-yellow-300'} flex items-center gap-3`}>
                          <div className={`p-2 rounded-xl ${cliente?.tela_aprovacao ? 'bg-green-500/20' : 'bg-yellow-500/20'}`}>
                            <FaEye className={`w-5 h-5 ${cliente?.tela_aprovacao ? 'text-green-400' : 'text-yellow-400'}`} />
                          </div>
                          Tela de Aprovação
                        </h4>
                        <div className="flex items-center gap-2">
                          {cliente?.tela_aprovacao ? (
                            <>
                              <span className="bg-green-500/30 text-green-300 text-sm px-4 py-2 rounded-full border-2 border-green-500/50 font-bold shadow-lg animate-pulse">
                                ✅ APROVAÇÃO ENVIADA
                              </span>
                              <div className="w-3 h-3 bg-green-400 rounded-full animate-ping"></div>
                            </>
                          ) : (
                            <span className="bg-yellow-500/30 text-yellow-300 text-sm px-4 py-2 rounded-full border-2 border-yellow-500/50 font-bold">
                              ⏳ AGUARDANDO ENVIO
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {cliente?.tela_aprovacao ? (
                        <div className="space-y-4">
                          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
                            <div className="flex items-center gap-3 mb-2">
                              <FaCheck className="w-5 h-5 text-green-400" />
                              <span className="text-green-300 font-semibold">Documento Disponível</span>
                            </div>
                            <p className="text-green-200 text-sm mb-3">
                              A tela de aprovação foi enviada e está disponível para visualização. Clique no botão abaixo para abrir o documento.
                            </p>
                            <div className="grid grid-cols-1 gap-4">
                              <DocumentButton
                                path={cliente?.tela_aprovacao}
                                label="📋 Visualizar Tela de Aprovação"
                                icon={FaEye}
                                isRequired={false}
                                tipo="tela_aprovacao"
                              />
                            </div>
                          </div>
                          
                          {/* Informações adicionais do arquivo */}
                          <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                            <p className="text-xs text-gray-300 flex items-center gap-2">
                              <FaFileAlt className="w-3 h-3" />
                              Arquivo: {cliente.tela_aprovacao?.split('/').pop() || 'documento.pdf'}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
                            <div className="flex items-center gap-3 mb-2">
                              <FaEye className="w-5 h-5 text-yellow-400" />
                              <span className="text-yellow-300 font-semibold">Documento Pendente</span>
                            </div>
                            <p className="text-yellow-200 text-sm mb-3">
                              A tela de aprovação ainda não foi enviada. Este documento é importante para acompanhar o status da aprovação do cliente.
                            </p>
                          </div>
                          
                          <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                            <FaEye className="w-12 h-12 mx-auto mb-3 text-gray-400 opacity-50" />
                            <p className="text-gray-400 text-sm">
                              O documento aparecerá aqui quando for enviado
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* ✅ RESUMO GERAL DOS DOCUMENTOS - MELHORADO */}
                    <div className="bg-gradient-to-r from-caixa-primary to-caixa-secondary border-2 border-caixa-orange/30 rounded-2xl p-6 shadow-xl">
                      <h5 className="text-lg font-bold text-white mb-4 flex items-center gap-3">
                        <div className="p-2 bg-caixa-orange/20 rounded-xl">
                          <FaFileAlt className="w-5 h-5 text-caixa-orange" />
                        </div>
                        Status da Documentação
                      </h5>
                      
                      {/* Status da Tela de Aprovação em destaque */}
                      <div className={`mb-6 p-4 rounded-xl border-2 ${cliente?.tela_aprovacao ? 'bg-green-500/20 border-green-500/40' : 'bg-yellow-500/20 border-yellow-500/40'}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <FaEye className={`w-6 h-6 ${cliente?.tela_aprovacao ? 'text-green-400' : 'text-yellow-400'}`} />
                            <div>
                              <h6 className={`font-bold ${cliente?.tela_aprovacao ? 'text-green-300' : 'text-yellow-300'}`}>
                                Tela de Aprovação
                              </h6>
                              <p className={`text-xs ${cliente?.tela_aprovacao ? 'text-green-200' : 'text-yellow-200'}`}>
                                {cliente?.tela_aprovacao ? 'Documento enviado e disponível' : 'Aguardando envio do documento'}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className={`text-2xl ${cliente?.tela_aprovacao ? 'text-green-400' : 'text-yellow-400'}`}>
                              {cliente?.tela_aprovacao ? '✅' : '⏳'}
                            </span>
                            {cliente?.tela_aprovacao && (
                              <div className="w-2 h-2 bg-green-400 rounded-full animate-ping mt-1 ml-auto"></div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Grid dos outros documentos */}
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        <div className="text-center p-3 bg-white/5 rounded-xl border border-white/10">
                          <span className={`block text-2xl mb-2 ${cliente?.documentos_pessoais ? 'text-green-400' : 'text-yellow-400'}`}>
                            {cliente?.documentos_pessoais ? '✅' : '⏳'}
                          </span>
                          <span className="text-xs text-caixa-extra-light font-medium">Docs Pessoais</span>
                          <div className={`w-full h-1 rounded mt-2 ${cliente?.documentos_pessoais ? 'bg-green-400' : 'bg-yellow-400'}`}></div>
                        </div>
                        
                        <div className="text-center p-3 bg-white/5 rounded-xl border border-white/10">
                          <span className={`block text-2xl mb-2 ${cliente?.extrato_bancario ? 'text-green-400' : 'text-yellow-400'}`}>
                            {cliente?.extrato_bancario ? '✅' : '⏳'}
                          </span>
                          <span className="text-xs text-caixa-extra-light font-medium">Extrato</span>
                          <div className={`w-full h-1 rounded mt-2 ${cliente?.extrato_bancario ? 'bg-green-400' : 'bg-yellow-400'}`}></div>
                        </div>
                        
                        <div className="text-center p-3 bg-white/5 rounded-xl border border-white/10">
                          <span className={`block text-2xl mb-2 ${cliente?.documentos_dependente ? 'text-green-400' : 'text-gray-400'}`}>
                            {cliente?.documentos_dependente ? '✅' : '➖'}
                          </span>
                          <span className="text-xs text-caixa-extra-light font-medium">Dependente</span>
                          <div className={`w-full h-1 rounded mt-2 ${cliente?.documentos_dependente ? 'bg-green-400' : 'bg-gray-400'}`}></div>
                        </div>
                        
                        <div className="text-center p-3 bg-white/5 rounded-xl border border-white/10">
                          <span className={`block text-2xl mb-2 ${cliente?.documentos_conjuge ? 'text-green-400' : 'text-gray-400'}`}>
                            {cliente?.documentos_conjuge ? '✅' : '➖'}
                          </span>
                          <span className="text-xs text-caixa-extra-light font-medium">Cônjuge</span>
                          <div className={`w-full h-1 rounded mt-2 ${cliente?.documentos_conjuge ? 'bg-green-400' : 'bg-gray-400'}`}></div>
                        </div>
                        
                        <div className="text-center p-3 bg-white/5 rounded-xl border border-white/10">
                          <span className={`block text-2xl mb-2 ${cliente?.fiador_documentos ? 'text-green-400' : (cliente?.possui_fiador ? 'text-yellow-400' : 'text-gray-400')}`}>
                            {cliente?.fiador_documentos ? '✅' : (cliente?.possui_fiador ? '⏳' : '➖')}
                          </span>
                          <span className="text-xs text-caixa-extra-light font-medium">Fiador</span>
                          <div className={`w-full h-1 rounded mt-2 ${cliente?.fiador_documentos ? 'bg-green-400' : (cliente?.possui_fiador ? 'bg-yellow-400' : 'bg-gray-400')}`}></div>
                        </div>
                        
                        <div className="text-center p-3 bg-white/5 rounded-xl border border-white/10">
                          <span className={`block text-2xl mb-2 ${cliente?.formularios_caixa ? 'text-green-400' : (cliente?.possui_formularios_caixa ? 'text-yellow-400' : 'text-gray-400')}`}>
                            {cliente?.formularios_caixa ? '✅' : (cliente?.possui_formularios_caixa ? '⏳' : '➖')}
                          </span>
                          <span className="text-xs text-caixa-extra-light font-medium">Form. Caixa</span>
                          <div className={`w-full h-1 rounded mt-2 ${cliente?.formularios_caixa ? 'bg-green-400' : (cliente?.possui_formularios_caixa ? 'bg-yellow-400' : 'bg-gray-400')}`}></div>
                        </div>
                      </div>
                      
                      {/* Estatísticas dos documentos */}
                      <div className="mt-6 flex items-center justify-between text-sm">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                            <span className="text-green-300">Enviados</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                            <span className="text-yellow-300">Pendentes</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                            <span className="text-gray-300">Opcional</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-caixa-extra-light">
                            {[
                              cliente?.documentos_pessoais,
                              cliente?.extrato_bancario,
                              cliente?.documentos_dependente,
                              cliente?.documentos_conjuge,
                              cliente?.fiador_documentos,
                              cliente?.formularios_caixa,
                              cliente?.tela_aprovacao
                            ].filter(Boolean).length} de 7 documentos
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {/* ✅ MENSAGEM QUANDO NENHUM DOCUMENTO FOI ENVIADO */}
                    {!cliente?.documentos_pessoais && 
                     !cliente?.extrato_bancario && 
                     !cliente?.documentos_dependente && 
                     !cliente?.documentos_conjuge && 
                     !cliente?.fiador_documentos && 
                     !cliente?.formularios_caixa && (
                      <div className="text-center py-8 text-caixa-extra-light">
                        <MdAttachFile className="w-16 h-16 mx-auto mb-4 opacity-50" />
                        <p className="text-lg font-medium">Nenhum documento encontrado</p>
                        <p>Os documentos aparecerão aqui quando forem enviados</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === "notes" && (
                <div className="space-y-6">
                  {/* Add Note */}
                  <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <FaPlus className="w-5 h-5 text-caixa-orange" />
                      Adicionar Nova Nota
                    </h3>
                    <textarea
                      value={nota}
                      onChange={(e) => setNota(e.target.value)}
                      className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-caixa-extra-light/50 focus:border-caixa-orange focus:ring-2 focus:ring-caixa-orange/30 transition-all resize-none"
                      rows="4"
                      placeholder="Digite sua nota aqui..."
                    />
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleAddNota}
                      disabled={!nota.trim()}
                      className="mt-4 bg-gradient-to-r from-caixa-orange to-caixa-orange-light hover:from-caixa-orange-dark hover:to-caixa-orange disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2 shadow-lg"
                    >
                      <FaPlus className="w-4 h-4" />
                      Adicionar Nota
                    </motion.button>
                  </div>

                  {/* Notes List */}
                  <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6">
                    <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                      <FaStickyNote className="w-5 h-5 text-caixa-orange" />
                      Histórico de Notas
                      {notas.length > 0 && (
                        <span className="bg-caixa-orange text-white text-xs rounded-full px-2 py-1">
                          {notas.length}
                        </span>
                      )}
                    </h3>
                    <div className="space-y-4">
                      {notas.length === 0 ? (
                        <p className="text-caixa-extra-light text-center py-4">
                          Nenhuma nota encontrada. As notas aparecerão aqui quando forem adicionadas.
                        </p>
                      ) : (
                        notas.map((nota) => (
                          <motion.div
                            key={nota.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-4"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-caixa-orange text-lg">{nota.nova ? '🆕' : '📝'}</span>
                                <span className="text-white font-semibold">{nota.destinatario}</span>
                              </div>
                              <div className="text-xs text-right">
                                <p className="text-caixa-gray-400">{new Date(nota.data_criacao).toLocaleDateString('pt-BR')}</p>
                                <p className="text-caixa-gray-400">{nota.data_criacao}</p>
                              </div>
                            </div>
                            <p className="text-white break-words">{nota.texto}</p>
                            
                            {/* Ações da Nota */}
                            <div className="flex flex-wrap gap-2 mt-4">
                              <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => handleConcluirNota(nota.id)}
                                className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 text-white px-4 py-2 rounded-xl font-medium transition-all shadow-md"
                              >
                                <FaCheck className="w-4 h-4" />
                                Concluir Nota
                              </motion.button>
                              <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => handleDeletarNota(nota.id)}
                                className="flex items-center gap-2 bg-red-500 hover:bg-red-400 text-white px-4 py-2 rounded-xl font-medium transition-all shadow-md"
                              >
                                <FaTrash className="w-4 h-4" />
                                Deletar Nota
                              </motion.button>
                            </div>
                          </motion.div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </motion.div>
      </motion.div>

      {/* Visualizador de Páginas PDF */}
      <PDFPageViewer
        clienteId={selectedDocumentForPageView?.clienteId}
        tipo={selectedDocumentForPageView?.tipo}
        isOpen={!!selectedDocumentForPageView}
        onClose={() => setSelectedDocumentForPageView(null)}
        showToast={showToast}
      />
    </AnimatePresence>
  );
};

export default ModalCliente;