import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import MainLayout from '../../layouts/MainLayout';
import {
  CreditCard,
  Smartphone,
  Eye,
  Copy,
  ExternalLink,
  Calendar,
  DollarSign,
  User,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Plus,
  Filter,
  Search,
  RefreshCw,
  Download,
  Mail,
  Edit,
  Trash2,
  MoreVertical,
  Save,
  X,
  FileText
} from 'lucide-react';
import { Link } from 'react-router-dom';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

const ListaPagamentos = () => {  const [pagamentos, setPagamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [filtro, setFiltro] = useState('todos');
  const [busca, setBusca] = useState('');
  const [paginaAtual, setPaginaAtual] = useState(1);
  const itensPorPagina = 10;
  
  // Estados para deletar
  const [deletandoId, setDeletandoId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [showActions, setShowActions] = useState(null);

  // ✅ NOVOS ESTADOS PARA EDITAR
  const [editando, setEditando] = useState(null);
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);
  const [formEdicao, setFormEdicao] = useState({
    titulo: '',
    descricao: '',
    valor: '',
    data_vencimento: '',
    observacoes: '',
    parcelas: 1
  });

  useEffect(() => {
    fetchPagamentos();
  }, []);

  // ✅ Limpar mensagens após 5 segundos
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const fetchPagamentos = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_URL}/pagamentos`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPagamentos(data.pagamentos || []);
      } else {
        setError('Erro ao carregar pagamentos');
      }
    } catch (error) {
      console.error('Erro ao buscar pagamentos:', error);
      setError('Erro de conexão');
    } finally {
      setLoading(false);
    }
  };

  // ✅ FUNÇÃO PARA ABRIR MODAL DE EDIÇÃO
  const abrirModalEdicao = (pagamento) => {
    setEditando(pagamento);
    setFormEdicao({
      titulo: pagamento.titulo || '',
      descricao: pagamento.descricao || '',
      valor: pagamento.valor_numerico ? (pagamento.valor_numerico * 100).toString() : '',
      data_vencimento: pagamento.data_vencimento ? 
        new Date(pagamento.data_vencimento).toISOString().split('T')[0] : '',
      observacoes: pagamento.observacoes || '',
      parcelas: pagamento.parcelas || 1
    });
  };

  // ✅ FUNÇÃO PARA CANCELAR EDIÇÃO
  const cancelarEdicao = () => {
    setEditando(null);
    setFormEdicao({
      titulo: '',
      descricao: '',
      valor: '',
      data_vencimento: '',
      observacoes: '',
      parcelas: 1
    });
  };

  // ✅ FUNÇÃO PARA FORMATAR VALOR NO INPUT
  const formatarValor = (value) => {
    if (!value) return '';
    
    const numero = value.toString().replace(/\D/g, '');
    if (!numero) return '';
    
    const valorEmCentavos = parseInt(numero, 10);
    const valorDecimal = valorEmCentavos / 100;
    
    return valorDecimal.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  // ✅ FUNÇÃO PARA CONVERTER VALOR PARA ENVIO
  const converterValorParaEnvio = (valorDigitado) => {
    if (!valorDigitado) return 0;
    
    const numero = valorDigitado.toString().replace(/\D/g, '');
    if (!numero) return 0;
    
    const valorEmCentavos = parseInt(numero, 10);
    const valorFinal = valorEmCentavos / 100;
    
    return valorFinal;
  };

  // ✅ FUNÇÃO PARA SALVAR EDIÇÃO
  const salvarEdicao = async () => {
    try {
      setSalvandoEdicao(true);
      const token = localStorage.getItem('authToken');
      const valorConvertido = converterValorParaEnvio(formEdicao.valor);
      
      const payload = {
        titulo: formEdicao.titulo,
        descricao: formEdicao.descricao,
        valor: valorConvertido,
        observacoes: formEdicao.observacoes,
        parcelas: formEdicao.parcelas
      };

      // Adicionar data de vencimento apenas para boleto
      if (editando.tipo === 'boleto' && formEdicao.data_vencimento) {
        payload.data_vencimento = formEdicao.data_vencimento;
      }

      const response = await fetch(`${API_URL}/pagamentos/${editando.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok) {
        // Atualizar lista local
        setPagamentos(prev => prev.map(p => 
          p.id === editando.id ? { ...p, ...data.pagamento } : p
        ));
        
        cancelarEdicao();
        alert('Pagamento atualizado com sucesso!');
      } else {
        throw new Error(data.error || 'Erro ao atualizar pagamento');
      }

    } catch (error) {
      console.error('Erro ao atualizar pagamento:', error);
      alert(`Erro ao atualizar: ${error.message}`);
    } finally {
      setSalvandoEdicao(false);
    }
  };

  // Função para deletar pagamento
  const handleDeletePagamento = async (id) => {
    try {
      setDeletandoId(id);
      const token = localStorage.getItem('authToken');
      
      const response = await fetch(`${API_URL}/pagamentos/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setPagamentos(prev => prev.filter(p => p.id !== id));
        setConfirmDelete(null);
        alert('Pagamento deletado com sucesso!');
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Erro ao deletar pagamento');
      }
    } catch (error) {
      console.error('Erro ao deletar pagamento:', error);
      alert(`Erro ao deletar: ${error.message}`);
    } finally {
      setDeletandoId(null);
      setConfirmDelete(null);
    }
  };

  const confirmarExclusao = (pagamento) => {
    setConfirmDelete(pagamento);
  };

  // Função para reenviar WhatsApp
  const reenviarWhatsApp = async (id) => {
    try {
      const token = localStorage.getItem('authToken');
      
      const response = await fetch(`${API_URL}/pagamentos/${id}/enviar-whatsapp`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (response.ok) {
        alert('WhatsApp enviado com sucesso!');
        fetchPagamentos();
      } else {
        throw new Error(data.error || 'Erro ao enviar WhatsApp');
      }
    } catch (error) {
      console.error('Erro ao enviar WhatsApp:', error);
      alert(`Erro: ${error.message}`);
    }
  };

  // Função para reenviar Email
  const reenviarEmail = async (id) => {
    try {
      const token = localStorage.getItem('authToken');
      
      const response = await fetch(`${API_URL}/pagamentos/${id}/enviar-email`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (response.ok) {
        alert('Email enviado com sucesso!');
        fetchPagamentos();
      } else {
        throw new Error(data.error || 'Erro ao enviar email');
      }
    } catch (error) {
      console.error('Erro ao enviar email:', error);
      alert(`Erro: ${error.message}`);
    }
  };

  // ✅ Botão para reenviar notificações
  const handleReenviarNotificacoes = async (pagamentoId) => {
    try {
      setLoading(true);
      
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_URL}/api/pagamentos/${pagamentoId}/reenviar-notificacoes`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          notificar_cliente: true,
          notificar_admins: true,
          notificar_criador: true
        })
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        setSuccess('Notificações reenviadas com sucesso!');
        // Mostrar detalhes dos resultados
        console.log('Resultados das notificações:', data.resultados);
      } else {
        setError(data.error || 'Erro ao reenviar notificações');
      }
    } catch (error) {
      console.error('Erro ao reenviar notificações:', error);
      setError('Erro de conexão ao reenviar notificações');
    } finally {
      setLoading(false);
    }
  };

  // Funções auxiliares (getStatusColor, getStatusIcon, getTipoIcon, etc.)
  const getStatusColor = (status) => {
    switch (status) {
      case 'aprovado':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'pendente':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'rejeitado':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'cancelado':
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      case 'expirado':
        return 'bg-caixa-orange-500/20 text-caixa-orange-400 border-caixa-orange-500/30';
      default:
        return 'bg-caixa-primary/20 text-caixa-light border-caixa-primary/30';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'aprovado':
        return <CheckCircle size={16} />;
      case 'pendente':
        return <Clock size={16} />;
      case 'rejeitado':
        return <XCircle size={16} />;
      case 'cancelado':
        return <XCircle size={16} />;
      case 'expirado':
        return <AlertCircle size={16} />;
      default:
        return <Clock size={16} />;
    }
  };

  const getTipoIcon = (tipo) => {
    switch (tipo) {
      case 'pix':
        return <Smartphone size={16} className="text-white" />;
      case 'boleto':
        return <CreditCard size={16} className="text-caixa-primary" />;
      case 'cartao':
        return <CreditCard size={16} className="text-purple-400" />;
      default:
        return <CreditCard size={16} className="text-caixa-light" />;
    }
  };

  const copiarLink = (link) => {
    navigator.clipboard.writeText(link);
    alert('Link copiado!');
  };

  const abrirPagamento = (link) => {
    window.open(link, '_blank');
  };

  const formatarData = (data) => {
    return new Date(data).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // --- Funções para comprovante ---
  const abrirComprovante = (url) => {
    if (url) window.open(url, '_blank');
    else alert('Comprovante não disponível.');
  };

  const enviarComprovante = async (pagamentoId) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_URL}/pagamentos/${pagamentoId}/enviar-comprovante`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      if (response.ok) {
        alert('Comprovante enviado ao cliente com sucesso!');
      } else {
        throw new Error(data.error || 'Erro ao enviar comprovante');
      }
    } catch (error) {
      alert(`Erro ao enviar comprovante: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const obterComprovante = async (pagamentoId) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_URL}/pagamentos/${pagamentoId}/obter-comprovante`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      if (response.ok && data.comprovante_url) {
        alert('Comprovante obtido com sucesso!');
        fetchPagamentos();
      } else {
        throw new Error(data.error || 'Erro ao obter comprovante');
      }
    } catch (error) {
      alert(`Erro ao obter comprovante: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Filtrar pagamentos
  const pagamentosFiltrados = pagamentos.filter(pagamento => {
    const passaFiltro = filtro === 'todos' || pagamento.status === filtro;
    const passaBusca = !busca || 
      pagamento.titulo.toLowerCase().includes(busca.toLowerCase()) ||
      pagamento.cliente?.nome.toLowerCase().includes(busca.toLowerCase()) ||
      pagamento.cliente?.cpf.includes(busca);
    
    return passaFiltro && passaBusca;
  });

  // Paginação
  const totalPaginas = Math.ceil(pagamentosFiltrados.length / itensPorPagina);
  const pagamentosExibidos = pagamentosFiltrados.slice(
    (paginaAtual - 1) * itensPorPagina,
    paginaAtual * itensPorPagina
  );

  if (loading) {
    return (
      <MainLayout>
        <div className="min-h-screen bg-caixa-gradient flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="animate-spin h-12 w-12 text-caixa-orange mx-auto mb-4" />
            <p className="text-white text-lg">Carregando pagamentos...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="min-h-screen bg-caixa-gradient p-4">
        <div className="max-w-7xl mx-auto">
          
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8"
          >
            <div>
              <h1 className="text-3xl font-bold text-white">Pagamentos</h1>
              <p className="text-caixa-extra-light">Gerencie boletos e PIX via Mercado Pago</p>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={fetchPagamentos}
                className="px-4 py-2 bg-caixa-primary/30 hover:bg-caixa-primary/50 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <RefreshCw size={16} />
                Atualizar
              </button>
              <Link
                to="/pagamentos/criar"
                className="px-6 py-2 bg-gradient-to-r from-caixa-orange to-caixa-red hover:from-caixa-red hover:to-caixa-orange text-white rounded-lg transition-all duration-300 flex items-center gap-2"
              >
                <Plus size={16} />
                Criar Pagamento
              </Link>
            </div>
          </motion.div>

          {/* Filtros */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="backdrop-blur-xl bg-white/10 rounded-xl p-6 border border-caixa-primary/30 mb-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Busca */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-caixa-light" size={16} />
                <input
                  type="text"
                  placeholder="Buscar por título, cliente ou CPF..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white/10 border border-caixa-primary/30 rounded-lg text-white placeholder-caixa-extra-light focus:ring-2 focus:ring-caixa-orange focus:border-caixa-orange"
                />
              </div>

              {/* Filtro por Status */}
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-caixa-light" size={16} />
                <select
                  value={filtro}
                  onChange={(e) => setFiltro(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white/10 border border-caixa-primary/30 rounded-lg text-white focus:ring-2 focus:ring-caixa-orange focus:border-caixa-orange appearance-none"
                >
                  <option value="todos" className="bg-caixa-primary">Todos os Status</option>
                  <option value="pendente" className="bg-caixa-primary">Pendente</option>
                  <option value="aprovado" className="bg-caixa-primary">Aprovado</option>
                  <option value="rejeitado" className="bg-caixa-primary">Rejeitado</option>
                  <option value="cancelado" className="bg-caixa-primary">Cancelado</option>
                  <option value="expirado" className="bg-caixa-primary">Expirado</option>
                </select>
              </div>

              {/* Estatísticas */}
              <div className="flex items-center justify-between bg-caixa-primary/20 rounded-lg p-3">
                <span className="text-caixa-light text-sm">Total:</span>
                <span className="text-white font-bold">{pagamentosFiltrados.length} pagamentos</span>
              </div>
            </div>
          </motion.div>

          {/* Lista de Pagamentos */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >            {error && (
              <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-4 text-center">
                <AlertCircle className="mx-auto mb-2 text-red-400" size={24} />
                <p className="text-red-400">{error}</p>
              </div>
            )}

            {success && (
              <div className="bg-green-500/20 border border-green-500/30 rounded-xl p-4 text-center">
                <CheckCircle className="mx-auto mb-2 text-green-400" size={24} />
                <p className="text-green-400">{success}</p>
              </div>
            )}

            {pagamentosExibidos.length === 0 ? (
              <div className="backdrop-blur-xl bg-white/10 rounded-xl p-12 border border-caixa-primary/30 text-center">
                <CreditCard className="mx-auto mb-4 text-caixa-primary/50" size={48} />
                <h3 className="text-xl font-semibold text-white mb-2">Nenhum pagamento encontrado</h3>
                <p className="text-caixa-extra-light mb-6">
                  {pagamentos.length === 0 
                    ? 'Comece criando seu primeiro pagamento.'
                    : 'Tente ajustar os filtros de busca.'
                  }
                </p>
                <Link
                  to="/pagamentos/criar"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-caixa-orange to-caixa-red hover:from-caixa-red hover:to-caixa-orange text-white rounded-lg transition-all duration-300"
                >
                  <Plus size={16} />
                  Criar Primeiro Pagamento
                </Link>
              </div>
            ) : (
              pagamentosExibidos.map((pagamento, index) => (
                <motion.div
                  key={pagamento.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="backdrop-blur-xl bg-white/10 rounded-xl p-6 border border-caixa-primary/30 hover:bg-white/15 transition-all duration-300"
                >
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
                    
                    {/* Info Principal */}
                    <div className="lg:col-span-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-caixa-primary/30 rounded-lg">
                          {getTipoIcon(pagamento.tipo)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-white truncate">{pagamento.titulo}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <User size={14} className="text-caixa-light" />
                            <span className="text-caixa-light text-sm truncate">
                              {pagamento.cliente?.nome || 'Cliente não encontrado'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-caixa-extra-light">
                              ID: #{pagamento.id}
                            </span>
                            <span className="text-xs text-caixa-extra-light uppercase font-mono">
                              {pagamento.tipo}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Valor e Parcelas */}
                    <div className="lg:col-span-2">
                      <div className="flex items-center gap-2">
                        <DollarSign size={16} className="text-caixa-orange" />
                        <div>
                          <span className="font-bold text-white">R$ {pagamento.valor}</span>
                          {pagamento.parcelas > 1 && (
                            <div className="text-xs text-caixa-extra-light">
                              {pagamento.parcelas}x de R$ {pagamento.valor_parcela}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Status e Envios */}
                    <div className="lg:col-span-2">
                      <div className="space-y-2">
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(pagamento.status)}`}>
                          {getStatusIcon(pagamento.status)}
                          {pagamento.status.charAt(0).toUpperCase() + pagamento.status.slice(1)}
                        </span>
                        
                        {/* Indicadores de Envio */}
                        <div className="flex gap-1">
                          {pagamento.whatsapp_enviado && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">
                              <Smartphone size={12} />
                              WhatsApp
                            </span>
                          )}
                          {pagamento.email_enviado && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs">
                              <Mail size={12} />
                              Email
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Data */}
                    <div className="lg:col-span-2">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-caixa-light" />
                        <span className="text-caixa-light text-sm">
                          {formatarData(pagamento.created_at)}
                        </span>
                      </div>
                      {pagamento.data_vencimento && (
                        <div className="text-xs text-caixa-extra-light mt-1">
                          Venc: {formatarData(pagamento.data_vencimento)}
                        </div>
                      )}
                    </div>

                    {/* Ações */}
                    <div className="lg:col-span-2">
                      <div className="flex items-center gap-2 justify-end">
                        {/* Ações básicas */}
                        {pagamento.link_pagamento && (
                          <>
                            <button
                              onClick={() => copiarLink(pagamento.link_pagamento)}
                              className="p-2 bg-caixa-primary/30 hover:bg-caixa-primary/50 text-caixa-light hover:text-white rounded-lg transition-colors"
                              title="Copiar Link"
                            >
                              <Copy size={16} />
                            </button>
                            <button
                              onClick={() => abrirPagamento(pagamento.link_pagamento)}
                              className="p-2 bg-caixa-orange/30 hover:bg-caixa-orange/50 text-caixa-orange hover:text-white rounded-lg transition-colors"
                              title="Abrir Pagamento"
                            >
                              <ExternalLink size={16} />
                            </button>
                          </>
                        )}

                        {/* ✅ BOTÃO EDITAR */}
                        <button
                          onClick={() => abrirModalEdicao(pagamento)}
                          className="p-2 bg-blue-500/30 hover:bg-blue-500/50 text-blue-400 hover:text-white rounded-lg transition-colors"
                          title="Editar Pagamento"
                        >
                          <Edit size={16} />
                        </button>

                        {/* BOTÃO DELETAR */}
                        <button
                          onClick={() => confirmarExclusao(pagamento)}
                          disabled={deletandoId === pagamento.id}
                          className="p-2 bg-red-500/30 hover:bg-red-500/50 text-red-400 hover:text-white rounded-lg transition-colors disabled:opacity-50"
                          title="Deletar Pagamento"
                        >
                          {deletandoId === pagamento.id ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <Trash2 size={16} />
                          )}
                        </button>

                        {/* MENU DE AÇÕES EXTRAS */}
                        <div className="relative">
                          <button
                            onClick={() => setShowActions(showActions === pagamento.id ? null : pagamento.id)}
                            className="p-2 bg-caixa-primary/30 hover:bg-caixa-primary/50 text-caixa-light hover:text-white rounded-lg transition-colors"
                            title="Mais Ações"
                          >
                            <MoreVertical size={16} />
                          </button>

                          {/* Dropdown de ações */}
                          {showActions === pagamento.id && (
                            <div className="absolute right-0 top-full mt-2 w-48 bg-caixa-primary/90 backdrop-blur-xl rounded-lg border border-caixa-primary/30 shadow-lg z-10">
                              <div className="p-2 space-y-1">
                                <button
                                  onClick={() => {
                                    reenviarWhatsApp(pagamento.id);
                                    setShowActions(null);
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-left text-white hover:bg-white/10 rounded-lg transition-colors"
                                >
                                  <Smartphone size={16} className="text-green-400" />
                                  Reenviar WhatsApp
                                </button>
                                <button
                                  onClick={() => {
                                    reenviarEmail(pagamento.id);
                                    setShowActions(null);
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-left text-white hover:bg-white/10 rounded-lg transition-colors"
                                >
                                  <Mail size={16} className="text-blue-400" />
                                  Reenviar Email
                                </button>
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(`${window.location.origin}/pagamentos/publico/${pagamento.id}`);
                                    alert('Link público copiado!');
                                    setShowActions(null);
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-left text-white hover:bg-white/10 rounded-lg transition-colors"
                                >
                                  <Copy size={16} className="text-caixa-orange" />
                                  Copiar Link Público
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Descrição */}
                  {pagamento.descricao && (
                    <div className="mt-4 pt-4 border-t border-caixa-primary/20">
                      <p className="text-caixa-light text-sm">{pagamento.descricao}</p>
                    </div>
                  )}                  {/* ✅ SEÇÃO DE COMPROVANTE */}
                  {pagamento.status === 'aprovado' && (
                    <div className="mt-4 pt-4 border-t border-caixa-primary/20">
                      <div className="flex items-center gap-2 mb-3">
                        <FileText size={16} className="text-caixa-orange" />
                        <h4 className="text-white font-semibold">Comprovante</h4>
                      </div>
                      
                      {pagamento.tem_comprovante ? (
                        <div className="flex gap-2 flex-wrap">
                          <button
                            onClick={() => abrirComprovante(pagamento.comprovante_url)}
                            className="px-3 py-2 bg-caixa-orange/30 hover:bg-caixa-orange/50 text-caixa-orange hover:text-white rounded-lg transition-colors flex items-center gap-2 text-sm"
                            title="Abrir comprovante oficial"
                          >
                            <ExternalLink size={14} />
                            Ver Comprovante
                          </button>
                          
                          {pagamento.cliente?.telefone && (
                            <button
                              onClick={() => enviarComprovante(pagamento.id)}
                              className="px-3 py-2 bg-green-500/30 hover:bg-green-500/50 text-green-400 hover:text-white rounded-lg transition-colors flex items-center gap-2 text-sm"
                              title="Enviar comprovante para cliente"
                              disabled={loading}
                            >
                              <Smartphone size={14} />
                              Enviar Cliente
                            </button>
                          )}
                        </div>
                      ) : pagamento.pode_obter_comprovante ? (
                        <div className="space-y-2">
                          <button
                            onClick={() => obterComprovante(pagamento.id)}
                            className="px-3 py-2 bg-blue-500/30 hover:bg-blue-500/50 text-blue-400 hover:text-white rounded-lg transition-colors flex items-center gap-2 text-sm"
                            title="Obter comprovante do Mercado Pago"
                            disabled={loading}
                          >
                            <Download size={14} />
                            Obter Comprovante
                          </button>
                          <p className="text-xs text-caixa-extra-light">Buscar comprovante oficial do MP</p>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <AlertCircle size={14} className="text-yellow-400" />
                          <span className="text-sm text-yellow-400">Comprovante não disponível</span>
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              ))
            )}
          </motion.div>

          {/* Paginação */}
          {totalPaginas > 1 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-center items-center gap-2 mt-8"
            >
              <button
                onClick={() => setPaginaAtual(Math.max(1, paginaAtual - 1))}
                disabled={paginaAtual === 1}
                className="px-4 py-2 bg-caixa-primary/30 hover:bg-caixa-primary/50 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              >
                Anterior
              </button>
              
              <span className="px-4 py-2 text-white">
                Página {paginaAtual} de {totalPaginas}
              </span>
              
              <button
                onClick={() => setPaginaAtual(Math.min(totalPaginas, paginaAtual + 1))}
                disabled={paginaAtual === totalPaginas}
                className="px-4 py-2 bg-caixa-primary/30 hover:bg-caixa-primary/50 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              >
                Próxima
              </button>
            </motion.div>
          )}
        </div>
      </div>

      {/* ✅ MODAL DE EDIÇÃO */}
      {editando && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-caixa-primary/90 backdrop-blur-xl rounded-xl p-6 border border-caixa-primary/30 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/30 rounded-lg">
                  <Edit className="text-blue-400" size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Editar Pagamento</h3>
                  <p className="text-caixa-light text-sm">ID: #{editando.id} - {editando.tipo?.toUpperCase()}</p>
                </div>
              </div>
              <button
                onClick={cancelarEdicao}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="text-caixa-light" size={20} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Título */}
              <div>
                <label className="flex items-center gap-2 text-white font-semibold mb-2">
                  <FileText size={16} />
                  Título *
                </label>
                <input
                  type="text"
                  value={formEdicao.titulo}
                  onChange={(e) => setFormEdicao(prev => ({ ...prev, titulo: e.target.value }))}
                  className="w-full px-4 py-3 bg-white/10 border border-caixa-primary/30 rounded-xl text-white placeholder-caixa-extra-light focus:ring-2 focus:ring-caixa-orange focus:border-caixa-orange"
                  placeholder="Ex: Serviço de Consultoria"
                />
              </div>

              {/* Descrição */}
              <div>
                <label className="text-white font-semibold mb-2 block">Descrição</label>
                <textarea
                  value={formEdicao.descricao}
                  onChange={(e) => setFormEdicao(prev => ({ ...prev, descricao: e.target.value }))}
                  className="w-full px-4 py-3 bg-white/10 border border-caixa-primary/30 rounded-xl text-white placeholder-caixa-extra-light focus:ring-2 focus:ring-caixa-orange focus:border-caixa-orange"
                  placeholder="Descrição do serviço ou produto"
                  rows="3"
                />
              </div>

              {/* Valor */}
              <div>
                <label className="flex items-center gap-2 text-white font-semibold mb-2">
                  <DollarSign size={16} />
                  Valor *
                </label>
                <input
                  type="text"
                  value={formatarValor(formEdicao.valor)}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "");
                    setFormEdicao(prev => ({ ...prev, valor: value }));
                  }}
                  className="w-full px-4 py-3 bg-white/10 border border-caixa-primary/30 rounded-xl text-white placeholder-caixa-extra-light focus:ring-2 focus:ring-caixa-orange focus:border-caixa-orange"
                  placeholder="0,00"
                />
              </div>

              {/* Número de Parcelas (apenas para boleto) */}
              {editando.tipo === 'boleto' && (
                <div>
                  <label className="flex items-center gap-2 text-white font-semibold mb-2">
                    <CreditCard size={16} />
                    Número de Parcelas
                  </label>
                  <select
                    value={formEdicao.parcelas}
                    onChange={(e) => setFormEdicao(prev => ({ ...prev, parcelas: parseInt(e.target.value) }))
                    }
                    className="w-full px-4 py-3 bg-white/10 border border-caixa-primary/30 rounded-xl text-white focus:ring-2 focus:ring-caixa-orange focus:border-caixa-orange"
                  >
                    <option value={1} className="bg-caixa-primary">À vista</option>
                    {[2,3,4,5,6,7,8,9,10,11,12].map(num => (
                      <option key={num} value={num} className="bg-caixa-primary">
                        {num}x de R$ {formEdicao.valor ? formatarValor(Math.floor(parseInt(formEdicao.valor) / num)) : '0,00'}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Data de Vencimento (apenas para boleto) */}
              {editando.tipo === 'boleto' && (
                <div>
                  <label className="flex items-center gap-2 text-white font-semibold mb-2">
                    <Calendar size={16} />
                    Data de Vencimento *
                  </label>
                  <input
                    type="date"
                    value={formEdicao.data_vencimento}
                    onChange={(e) => setFormEdicao(prev => ({ ...prev, data_vencimento: e.target.value }))}
                    className="w-full px-4 py-3 bg-white/10 border border-caixa-primary/30 rounded-xl text-white focus:ring-2 focus:ring-caixa-orange focus:border-caixa-orange"
                  />
                </div>
              )}

              {/* Observações */}
              <div>
                <label className="text-white font-semibold mb-2 block">Observações</label>
                <textarea
                  value={formEdicao.observacoes}
                  onChange={(e) => setFormEdicao(prev => ({ ...prev, observacoes: e.target.value }))}
                  className="w-full px-4 py-3 bg-white/10 border border-caixa-primary/30 rounded-xl text-white placeholder-caixa-extra-light focus:ring-2 focus:ring-caixa-orange focus:border-caixa-orange"
                  placeholder="Observações adicionais"
                  rows="3"
                />
              </div>
            </div>

            {/* Botões */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={cancelarEdicao}
                className="flex-1 py-3 px-4 bg-caixa-primary/50 hover:bg-caixa-primary/70 text-white rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={salvarEdicao}
                disabled={salvandoEdicao || !formEdicao.titulo}
                className="flex-1 py-3 px-4 bg-gradient-to-r from-caixa-orange to-caixa-red hover:from-caixa-red hover:to-caixa-orange text-white rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {salvandoEdicao ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    Salvar Alterações
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-caixa-primary/90 backdrop-blur-xl rounded-xl p-6 border border-caixa-primary/30 max-w-md w-full"
          >
            <div className="text-center">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="text-red-400" size={32} />
              </div>
              
              <h3 className="text-xl font-bold text-white mb-2">Confirmar Exclusão</h3>
              <p className="text-caixa-light mb-2">
                Tem certeza que deseja excluir o pagamento:
              </p>
              <p className="text-white font-semibold mb-6">
                "{confirmDelete.titulo}"?
              </p>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="flex-1 py-3 px-4 bg-caixa-primary/50 hover:bg-caixa-primary/70 text-white rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleDeletePagamento(confirmDelete.id)}
                  disabled={deletandoId === confirmDelete.id}
                  className="flex-1 py-3 px-4 bg-red-500/80 hover:bg-red-500 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {deletandoId === confirmDelete.id ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Excluindo...
                    </>
                  ) : (
                    <>
                      <Trash2 size={16} />
                      Excluir
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </MainLayout>
  );
};

export default ListaPagamentos;