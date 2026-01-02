import React, { useState, useEffect } from 'react';
import generateStableKey from 'utils/generateStableKey';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FaPlus, 
  FaEdit, 
  FaTrash, 
  FaEye, 
  FaDownload, 
  FaSearch, 
  FaFilter,
  FaHome,
  FaBuilding,
  FaCalendarAlt,
  FaExclamationTriangle,
  FaCheckCircle,
  FaClock,
  FaFileAlt,
  FaMapMarkerAlt,
  FaDollarSign,
  FaBell,
  FaTimes
} from 'react-icons/fa';
import { HiOutlineDocumentText } from 'react-icons/hi';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import ModalLaudo from './ModalLaudo';

const Laudos = () => {
  const { user } = useAuth();
  const [laudos, setLaudos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [laudoSelecionado, setLaudoSelecionado] = useState(null);
  const [modoEdicao, setModoEdicao] = useState(false);
  
  // Estados para filtros e paginação
  const [filtros, setFiltros] = useState({
    search: '',
    parceiro: '',
    tipo_imovel: 'todos',
    status: 'todos'
  });
  const [paginacao, setPaginacao] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10
  });

  // Estados para estatísticas
  const [estatisticas, setEstatisticas] = useState({
    totalLaudos: 0,
    laudosVencidos: 0,
    laudosVencendo: 0,
    laudosVigentes: 0
  });

  // ✅ NOVO: Estados para alertas
  const [alertasVencimento, setAlertasVencimento] = useState([]);
  const [showAlertas, setShowAlertas] = useState(true);

  // Carregar laudos
  const carregarLaudos = async (page = 1) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: filtros.limit || '10',
        search: filtros.search,
        parceiro: filtros.parceiro,
        tipo_imovel: filtros.tipo_imovel === 'todos' ? '' : filtros.tipo_imovel,
        status: filtros.status === 'todos' ? '' : filtros.status
      });

      const response = await fetch(`${process.env.REACT_APP_API_URL}/laudos?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setLaudos(data.data);
        setPaginacao(data.pagination);
        
        // ✅ NOVO: Processar alertas de vencimento
        processarAlertasVencimento(data.data);
      } else {
        throw new Error(data.message || 'Erro ao carregar laudos');
      }
    } catch (error) {
      console.error('Erro ao carregar laudos:', error);
      toast.error(`Erro ao carregar laudos: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ✅ NOVO: Função para processar alertas de vencimento
  const processarAlertasVencimento = (laudosData) => {
    const hoje = new Date();
    const alertas = [];

    laudosData.forEach(laudo => {
      const vencimento = new Date(laudo.vencimento);
      const diasParaVencimento = Math.ceil((vencimento - hoje) / (1000 * 60 * 60 * 24));
      
      // Alertas para laudos que vencem em até 30 dias (mas não vencidos)
      if (diasParaVencimento > 0 && diasParaVencimento <= 30) {
        alertas.push({
          id: laudo.id,
          parceiro: laudo.parceiro,
          vencimento: laudo.vencimento,
          diasParaVencimento,
          valor_solicitado: laudo.valor_solicitado,
          urgencia: diasParaVencimento <= 7 ? 'alta' : diasParaVencimento <= 15 ? 'media' : 'baixa'
        });
      }
    });

    // Ordenar por urgência e dias para vencimento
    alertas.sort((a, b) => {
      if (a.urgencia !== b.urgencia) {
        const ordem = { 'alta': 0, 'media': 1, 'baixa': 2 };
        return ordem[a.urgencia] - ordem[b.urgencia];
      }
      return a.diasParaVencimento - b.diasParaVencimento;
    });

    setAlertasVencimento(alertas);
    
    // Mostrar notificação se houver alertas críticos (7 dias ou menos)
    const alertasCriticos = alertas.filter(a => a.urgencia === 'alta');
    if (alertasCriticos.length > 0) {
      toast.warning(`⚠️ ${alertasCriticos.length} laudo(s) vencem em 7 dias ou menos!`, {
        position: "top-right",
        autoClose: 5000,
      });
    }
  };

  // Carregar estatísticas
  const carregarEstatisticas = async () => {
    try {
      const token = localStorage.getItem('authToken');
      
      const response = await fetch(`${process.env.REACT_APP_API_URL}/laudos/relatorios/estatisticas`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setEstatisticas(data.data.resumo);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  // Efeitos
  useEffect(() => {
    carregarLaudos();
    carregarEstatisticas();
  }, [filtros]);

  // Funções de ação
  const handleNovoLaudo = () => {
    setLaudoSelecionado(null);
    setModoEdicao(false);
    setModalOpen(true);
  };

  const handleEditarLaudo = (laudo) => {
    setLaudoSelecionado(laudo);
    setModoEdicao(true);
    setModalOpen(true);
  };

  const handleVisualizarLaudo = (laudo) => {
    setLaudoSelecionado(laudo);
    setModoEdicao(false);
    toast.info('Funcionalidade de visualização em desenvolvimento');
  };

  const handleExcluirLaudo = async (laudoId) => {
    if (!window.confirm('Tem certeza que deseja excluir este laudo?')) {
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      
      const response = await fetch(`${process.env.REACT_APP_API_URL}/laudos/${laudoId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        toast.success('Laudo excluído com sucesso!');
        carregarLaudos(paginacao.currentPage);
        carregarEstatisticas();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao excluir laudo');
      }
    } catch (error) {
      console.error('Erro ao excluir laudo:', error);
      toast.error(`Erro ao excluir laudo: ${error.message}`);
    }
  };

  const handleDownloadArquivo = async (laudoId, categoria, filename) => {
    try {
      const token = localStorage.getItem('authToken');
      
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/laudos/${laudoId}/arquivo/${categoria}/${filename}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        throw new Error('Erro ao baixar arquivo');
      }
    } catch (error) {
      console.error('Erro ao baixar arquivo:', error);
      toast.error('Erro ao baixar arquivo');
    }
  };

  // ✅ NOVO: Função para editar laudo diretamente do alerta
  const handleEditarLaudoAlerta = (laudoId) => {
    const laudo = laudos.find(l => l.id === laudoId);
    if (laudo) {
      handleEditarLaudo(laudo);
    }
  };

  // Função para obter cor do status
  const getStatusColor = (status) => {
    switch (status) {
      case 'vencido': return 'bg-red-50 text-red-700 border-red-200';
      case 'vencendo': return 'bg-caixa-orange/10 text-caixa-orange-dark border-caixa-orange/30';
      case 'vigente': return 'bg-green-50 text-green-700 border-green-200';
      default: return 'bg-caixa-gray-100 text-caixa-gray-700 border-caixa-gray-300';
    }
  };

  // Função para obter ícone do status
  const getStatusIcon = (status) => {
    switch (status) {
      case 'vencido': return <FaExclamationTriangle className="w-4 h-4" />;
      case 'vencendo': return <FaClock className="w-4 h-4" />;
      case 'vigente': return <FaCheckCircle className="w-4 h-4" />;
      default: return <FaFileAlt className="w-4 h-4" />;
    }
  };

  // ✅ NOVO: Componente de Alerta de Vencimento
  const AlertaVencimento = ({ alerta }) => {
    const getUrgenciaColor = (urgencia) => {
      switch (urgencia) {
        case 'alta': return 'bg-red-500';
        case 'media': return 'bg-yellow-500';
        case 'baixa': return 'bg-sky-500'; // ✅ Mudança: azul mais claro e vibrante
        default: return 'bg-gray-500';
      }
    };

    const getUrgenciaText = (urgencia) => {
      switch (urgencia) {
        case 'alta': return 'URGENTE';
        case 'media': return 'ATENÇÃO';
        case 'baixa': return 'AVISO';
        default: return 'AVISO';
      }
    };

    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="bg-white rounded-xl shadow-lg border-l-4 border-l-caixa-orange p-4 hover:shadow-xl transition-all duration-200"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <div className={`w-3 h-3 rounded-full ${getUrgenciaColor(alerta.urgencia)} mt-2 flex-shrink-0`}></div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs font-bold px-2 py-1 rounded-full text-white ${getUrgenciaColor(alerta.urgencia)}`}>
                  {getUrgenciaText(alerta.urgencia)}
                </span>
                <span className="text-sm font-semibold text-caixa-primary truncate">
                  {alerta.parceiro}
                </span>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                <div className="flex items-center gap-1">
                  <FaCalendarAlt className="w-3 h-3 text-caixa-orange" />
                  <span>{new Date(alerta.vencimento).toLocaleDateString('pt-BR')}</span>
                </div>
                <div className="flex items-center gap-1">
                  <FaClock className="w-3 h-3 text-caixa-orange" />
                  <span className="font-medium">
                    {alerta.diasParaVencimento === 1 ? '1 dia' : `${alerta.diasParaVencimento} dias`}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1 text-sm">
                <FaDollarSign className="w-3 h-3 text-caixa-orange" />
                <span className="font-medium text-caixa-primary">
                  R$ {parseFloat(alerta.valor_solicitado).toLocaleString('pt-BR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </span>
              </div>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleEditarLaudoAlerta(alerta.id)}
            className="ml-2 p-2 bg-caixa-orange text-white rounded-lg hover:bg-caixa-orange/80 transition-colors flex-shrink-0"
            title="Editar laudo"
          >
            <FaEdit className="w-3 h-3" />
          </motion.button>
        </div>
      </motion.div>
    );
  };

  // Card de estatísticas
  const StatCard = ({ title, value, icon, bgColor }) => (
    <motion.div
      whileHover={{ scale: 1.02, y: -4 }}
      transition={{ duration: 0.2 }}
      className={`${bgColor} rounded-2xl p-6 shadow-xl border border-white/20 relative overflow-hidden`}
    >
      <div className="flex items-center justify-between relative z-10">
        <div>
          <p className="text-sm font-medium text-white/80 mb-2">{title}</p>
          <p className="text-3xl font-bold text-white">{value}</p>
        </div>
        <div className="p-4 bg-white/20 rounded-xl">
          <div className="text-white">{icon}</div>
        </div>
      </div>
    </motion.div>
  );

  // Card de laudo
  const LaudoCard = ({ laudo }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -8, boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)" }}
      transition={{ duration: 0.3 }}
      className="bg-white rounded-2xl shadow-lg border border-caixa-primary/20 p-6 hover:border-caixa-orange transition-all duration-300 relative overflow-hidden"
    >
      {/* Barra sólida no topo */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-caixa-orange"></div>
      
      {/* ✅ NOVO: Indicador de alerta para laudos próximos do vencimento */}
      {laudo.diasParaVencimento > 0 && laudo.diasParaVencimento <= 30 && (
        <div className="absolute top-3 right-3">
          <div className={`w-3 h-3 rounded-full ${
            laudo.diasParaVencimento <= 7 ? 'bg-red-500' :
            laudo.diasParaVencimento <= 15 ? 'bg-yellow-500' : 'bg-sky-500' // ✅ Mudança: azul mais claro
          } animate-pulse`}></div>
        </div>
      )}
      
      {/* Header do card */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-caixa-primary rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg">
            {laudo.parceiro?.charAt(0)?.toUpperCase() || 'L'}
          </div>
          <div>
            <h3 className="font-bold text-caixa-primary text-lg mb-1">{laudo.parceiro}</h3>
            <div className="flex items-center gap-2 text-sm text-caixa-primary">
              {laudo.tipo_imovel === 'casa' ? 
                <FaHome className="w-4 h-4 text-caixa-orange" /> : 
                <FaBuilding className="w-4 h-4 text-caixa-orange" />
              }
              <span className="capitalize font-medium">{laudo.tipo_imovel}</span>
            </div>
          </div>
        </div>
        {/* Badge de status */}
        <div className={`px-4 py-2 rounded-xl text-xs font-semibold border-2 flex items-center gap-2 ${
          laudo.status === 'vencido'
            ? 'bg-white text-caixa-orange border-caixa-orange'
            : laudo.status === 'vencendo'
            ? 'bg-caixa-orange/10 text-caixa-orange border-caixa-orange'
            : 'bg-caixa-primary/10 text-caixa-primary border-caixa-primary'
        }`}>
          {getStatusIcon(laudo.status)}
          <span className="capitalize">{laudo.status}</span>
        </div>
      </div>
      {/* Informações principais */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="bg-caixa-orange/10 rounded-xl p-4 border border-caixa-orange/30">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-caixa-orange rounded-lg">
              <FaDollarSign className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-xs font-medium text-caixa-orange mb-1">SOLICITADO</p>
              <p className="font-bold text-caixa-orange text-lg">
                R$ {parseFloat(laudo.valor_solicitado).toLocaleString('pt-BR', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </p>
            </div>
          </div>
        </div>
        {laudo.valor_liberado && (
          <div className="bg-caixa-primary/10 rounded-xl p-4 border border-caixa-primary/30">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-caixa-primary rounded-lg">
                <FaDollarSign className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-xs font-medium text-caixa-primary mb-1">LIBERADO</p>
                <p className="font-bold text-caixa-primary text-lg">
                  R$ {parseFloat(laudo.valor_liberado).toLocaleString('pt-BR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
      {/* Vencimento */}
      <div className="bg-caixa-primary/5 rounded-xl p-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-caixa-orange rounded-lg">
            <FaCalendarAlt className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-xs font-medium text-caixa-primary mb-1">VENCIMENTO</p>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-caixa-primary">
                {new Date(laudo.vencimento).toLocaleDateString('pt-BR')}
              </span>
              {laudo.diasParaVencimento !== undefined && (
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  laudo.diasParaVencimento <= 0
                    ? 'bg-caixa-orange text-white'
                    : laudo.diasParaVencimento <= 30
                    ? 'bg-caixa-orange/20 text-caixa-orange'
                    : 'bg-caixa-primary/20 text-caixa-primary'
                }`}>
                  {laudo.diasParaVencimento > 0 ? `${laudo.diasParaVencimento} dias` : 'Vencido'}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* Endereço */}
      <div className="mb-6">
        <div className="flex items-start gap-3">
          <FaMapMarkerAlt className="w-4 h-4 mt-1 text-caixa-orange flex-shrink-0" />
          <div>
            <p className="text-xs font-medium text-caixa-primary mb-1">ENDEREÇO</p>
            <p className="text-sm text-caixa-primary leading-relaxed">{laudo.endereco}</p>
          </div>
        </div>
      </div>
      {/* Arquivos */}
      {laudo.arquivos && Object.keys(laudo.arquivos).length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <FaFileAlt className="w-4 h-4 text-caixa-orange" />
            <p className="text-xs font-semibold text-caixa-primary uppercase tracking-wider">Arquivos Anexados</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(laudo.arquivos).map(([categoria, arquivos]) => (
              <div key={categoria} className="flex flex-wrap gap-2">
                {arquivos.map((arquivo, index) => (
                  <motion.button
                    key={generateStableKey(arquivo, index)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleDownloadArquivo(laudo.id, categoria, arquivo.filename)}
                    className="text-xs bg-caixa-orange text-white px-3 py-2 rounded-lg hover:shadow-lg transition-all duration-200 flex items-center gap-2 font-medium"
                  >
                    <FaDownload className="w-3 h-3" />
                    {arquivo.originalname || arquivo.filename}
                  </motion.button>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Footer com ações */}
      <div className="flex items-center justify-between pt-6 border-t border-caixa-primary/10">
        <div className="text-xs text-caixa-primary">
          <span className="font-medium">Criado por:</span> {laudo.user?.first_name} {laudo.user?.last_name}
        </div>
        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => handleVisualizarLaudo(laudo)}
            className="p-3 bg-caixa-primary/10 hover:bg-caixa-primary/20 text-caixa-primary rounded-xl transition-all duration-200 border border-caixa-primary/20 hover:border-caixa-primary"
            title="Visualizar"
          >
            <FaEye className="w-4 h-4" />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => handleEditarLaudo(laudo)}
            className="p-3 bg-caixa-orange/10 hover:bg-caixa-orange/20 text-caixa-orange rounded-xl transition-all duration-200 border border-caixa-orange/20 hover:border-caixa-orange"
            title="Editar"
          >
            <FaEdit className="w-4 h-4" />
          </motion.button>
          {(user?.role === 'Administrador' || laudo.user_id === user?.id) && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => handleExcluirLaudo(laudo.id)}
              className="p-3 bg-white hover:bg-caixa-orange/10 text-caixa-orange rounded-xl transition-all duration-200 border border-caixa-orange/30 hover:border-caixa-orange"
              title="Excluir"
            >
              <FaTrash className="w-4 h-4" />
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen w-full bg-caixa-primary flex flex-col py-8 px-2 md:px-8">
      <div className="max-w-7xl w-full mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row items-start md:items-center justify-between mb-10 gap-4"
        >
          <div>
            <h1 className="text-4xl font-extrabold text-white mb-2 drop-shadow">
              Gestão de Laudos
            </h1>
            <p className="text-white text-lg font-medium">Gerencie laudos de avaliação imobiliária com eficiência</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.05, boxShadow: "0 10px 30px rgba(255, 140, 0, 0.3)" }}
            whileTap={{ scale: 0.95 }}
            onClick={handleNovoLaudo}
            className="bg-caixa-orange text-white px-8 py-4 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 flex items-center gap-3 font-semibold text-lg border border-caixa-orange/30"
          >
            <FaPlus className="w-5 h-5" />
            Novo Laudo
          </motion.button>
        </motion.div>

        {/* ✅ NOVO: Painel de Alertas de Vencimento */}
        {alertasVencimento.length > 0 && showAlertas && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-xl border border-caixa-orange/30 mb-10 overflow-hidden"
          >
            <div className="bg-caixa-orange/10 px-6 py-4 border-b border-caixa-orange/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-caixa-orange rounded-lg">
                    <FaBell className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-caixa-primary">
                      Alertas de Vencimento
                    </h2>
                    <p className="text-sm text-caixa-primary/70">
                      {alertasVencimento.length} laudo(s) vencem nos próximos 30 dias
                    </p>
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowAlertas(false)}
                  className="p-2 text-caixa-primary/60 hover:text-caixa-primary hover:bg-caixa-primary/10 rounded-lg transition-colors"
                  title="Fechar alertas"
                >
                  <FaTimes className="w-4 h-4" />
                </motion.button>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                <AnimatePresence>
                  {alertasVencimento.map((alerta, index) => (
                    <motion.div
                      key={alerta.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <AlertaVencimento alerta={alerta} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}

        {/* Cards de estatísticas */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10"
        >
          <StatCard
            title="Total de Laudos"
            value={estatisticas.totalLaudos}
            icon={<HiOutlineDocumentText className="w-7 h-7" />}
            bgColor="bg-caixa-primary"
          />
          <StatCard
            title="Laudos Vencidos"
            value={estatisticas.laudosVencidos}
            icon={<FaExclamationTriangle className="w-7 h-7" />}
            bgColor="bg-caixa-orange"
          />
          <StatCard
            title="Vencendo em 30 dias"
            value={estatisticas.laudosVencendo}
            icon={<FaClock className="w-7 h-7" />}
            bgColor="bg-caixa-orange"
          />
          <StatCard
            title="Laudos Vigentes"
            value={estatisticas.laudosVigentes}
            icon={<FaCheckCircle className="w-7 h-7" />}
            bgColor="bg-caixa-primary"
          />
        </motion.div>

        {/* Filtros */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl shadow-xl p-8 mb-10 border border-caixa-primary/20"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-caixa-orange rounded-lg">
              <FaFilter className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-caixa-primary">Filtros de Pesquisa</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <label className="block text-sm font-semibold text-caixa-primary mb-3">
                Buscar
              </label>
              <div className="relative">
                <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-caixa-primary w-4 h-4" />
                <input
                  type="text"
                  placeholder="Buscar por parceiro, endereço..."
                  value={filtros.search}
                  onChange={(e) => setFiltros({ ...filtros, search: e.target.value })}
                  className="w-full pl-12 pr-4 py-3 border-2 border-caixa-primary rounded-xl focus:ring-2 focus:ring-caixa-primary focus:border-caixa-primary transition-all duration-200 bg-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-caixa-primary mb-3">
                Parceiro
              </label>
              <input
                type="text"
                placeholder="Filtrar por parceiro"
                value={filtros.parceiro}
                onChange={(e) => setFiltros({ ...filtros, parceiro: e.target.value })}
                className="w-full px-4 py-3 border-2 border-caixa-primary rounded-xl focus:ring-2 focus:ring-caixa-primary focus:border-caixa-primary transition-all duration-200 bg-white"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-caixa-primary mb-3">
                Tipo de Imóvel
              </label>
              <select
                value={filtros.tipo_imovel}
                onChange={(e) => setFiltros({ ...filtros, tipo_imovel: e.target.value })}
                className="w-full px-4 py-3 border-2 border-caixa-primary rounded-xl focus:ring-2 focus:ring-caixa-primary focus:border-caixa-primary transition-all duration-200 bg-white"
              >
                <option value="todos">Todos os tipos</option>
                <option value="casa">Casa</option>
                <option value="apartamento">Apartamento</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-caixa-primary mb-3">
                Status
              </label>
              <select
                value={filtros.status}
                onChange={(e) => setFiltros({ ...filtros, status: e.target.value })}
                className="w-full px-4 py-3 border-2 border-caixa-primary rounded-xl focus:ring-2 focus:ring-caixa-primary focus:border-caixa-primary transition-all duration-200 bg-white"
              >
                <option value="todos">Todos os status</option>
                <option value="vigentes">Vigentes</option>
                <option value="vencendo">Vencendo</option>
                <option value="vencidos">Vencidos</option>
              </select>
            </div>
          </div>
        </motion.div>

        {/* Lista de laudos */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="relative">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-caixa-orange/30"></div>
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-caixa-orange border-t-transparent absolute inset-0"></div>
            </div>
          </div>
        ) : laudos.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-20"
          >
            <div className="bg-white rounded-2xl shadow-xl p-12 border border-caixa-primary/20">
              <div className="w-24 h-24 bg-caixa-orange rounded-full flex items-center justify-center mx-auto mb-6">
                <HiOutlineDocumentText className="w-12 h-12 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-caixa-primary mb-3">Nenhum laudo encontrado</h3>
              <p className="text-caixa-primary text-lg mb-8">Clique em "Novo Laudo" para criar seu primeiro laudo.</p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleNovoLaudo}
                className="bg-caixa-orange text-white px-8 py-3 rounded-xl font-semibold transition-all duration-200"
              >
                Criar Primeiro Laudo
              </motion.button>
            </div>
          </motion.div>
        ) : (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8 mb-10"
            >
              <AnimatePresence>
                {laudos.map((laudo, index) => (
                  <motion.div
                    key={laudo.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <LaudoCard laudo={laudo} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
            {/* Botão para mostrar alertas novamente se foram fechados */}
            {alertasVencimento.length > 0 && !showAlertas && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-center mb-10"
              >
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowAlertas(true)}
                  className="bg-caixa-orange text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center gap-2 shadow-lg"
                >
                  <FaBell className="w-4 h-4" />
                  Mostrar Alertas ({alertasVencimento.length})
                </motion.button>
              </motion.div>
            )}
            {/* Paginação */}
            {paginacao.totalPages > 1 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-center gap-4 bg-white rounded-2xl shadow-lg p-6 border border-caixa-primary/20"
              >
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => carregarLaudos(paginacao.currentPage - 1)}
                  disabled={paginacao.currentPage === 1}
                  className="px-6 py-3 border-2 border-caixa-primary text-caixa-primary rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-caixa-primary hover:text-white transition-all duration-200 font-semibold"
                >
                  Anterior
                </motion.button>
                <div className="flex items-center gap-2">
                  <span className="px-4 py-2 bg-caixa-orange text-white rounded-xl font-semibold">
                    {paginacao.currentPage}
                  </span>
                  <span className="text-caixa-primary font-medium">de {paginacao.totalPages}</span>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => carregarLaudos(paginacao.currentPage + 1)}
                  disabled={paginacao.currentPage === paginacao.totalPages}
                  className="px-6 py-3 border-2 border-caixa-primary text-caixa-primary rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-caixa-primary hover:text-white transition-all duration-200 font-semibold"
                >
                  Próxima
                </motion.button>
              </motion.div>
            )}
          </>
        )}
      </div>
      {/* Modal de laudo */}
      <AnimatePresence>
        {modalOpen && (
          <ModalLaudo
            isOpen={modalOpen}
            onClose={() => setModalOpen(false)}
            laudo={laudoSelecionado}
            modoEdicao={modoEdicao}
            onSalvar={() => {
              carregarLaudos(paginacao.currentPage);
              carregarEstatisticas();
              setModalOpen(false);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Laudos;