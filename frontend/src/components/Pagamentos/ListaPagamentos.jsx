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

// Design tokens
const CARD = 'rgba(255,255,255,0.06)';
const BORDER = 'rgba(255,255,255,0.10)';
const INPUT_BG = 'rgba(255,255,255,0.05)';
const ACCENT_GRADIENT = 'linear-gradient(135deg, #F97316, #EA580C)';

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

  // Estados para editar
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

  // Limpar mensagens apos 5 segundos
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

  const converterValorParaEnvio = (valorDigitado) => {
    if (!valorDigitado) return 0;

    const numero = valorDigitado.toString().replace(/\D/g, '');
    if (!numero) return 0;

    const valorEmCentavos = parseInt(numero, 10);
    const valorFinal = valorEmCentavos / 100;

    return valorFinal;
  };

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

  // Funcao para deletar pagamento
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

  // Funcao para reenviar WhatsApp
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

  // Funcao para reenviar Email
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

  // Botao para reenviar notificacoes
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

  // Funcoes auxiliares
  const getStatusColor = (status) => {
    switch (status) {
      case 'aprovado':
      case 'pago':
        return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
      case 'pendente':
        return 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30';
      case 'rejeitado':
      case 'vencido':
        return 'bg-red-500/20 text-red-400 border border-red-500/30';
      case 'cancelado':
        return 'bg-gray-500/20 text-gray-400 border border-gray-500/30';
      case 'expirado':
        return 'bg-orange-500/20 text-orange-400 border border-orange-500/30';
      default:
        return 'bg-white/10 text-white/70 border border-white/20';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'aprovado':
      case 'pago':
        return <CheckCircle size={14} />;
      case 'pendente':
        return <Clock size={14} />;
      case 'rejeitado':
      case 'vencido':
        return <XCircle size={14} />;
      case 'cancelado':
        return <XCircle size={14} />;
      case 'expirado':
        return <AlertCircle size={14} />;
      default:
        return <Clock size={14} />;
    }
  };

  const getTipoIcon = (tipo) => {
    switch (tipo) {
      case 'pix':
        return <Smartphone size={16} className="text-emerald-400" />;
      case 'boleto':
        return <CreditCard size={16} className="text-orange-400" />;
      case 'cartao':
        return <CreditCard size={16} className="text-purple-400" />;
      default:
        return <CreditCard size={16} className="text-white/60" />;
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

  // --- Funcoes para comprovante ---
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

  // Paginacao
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
            <Loader2 className="animate-spin h-12 w-12 text-orange-500 mx-auto mb-4" />
            <p className="text-white/80 text-lg">Carregando pagamentos...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="min-h-screen bg-caixa-gradient p-4 md:p-6">
        <div className="max-w-7xl mx-auto">

          {/* Sticky Header */}
          <div className="sticky top-0 z-20 pb-4" style={{ backdropFilter: 'blur(16px)' }}>
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6"
            >
              <div>
                <h1 className="text-3xl font-bold text-white tracking-tight">Pagamentos</h1>
                <p className="text-white/50 text-sm mt-1">Gerencie boletos e PIX via Mercado Pago</p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={fetchPagamentos}
                  className="px-4 py-2.5 text-white/80 hover:text-white rounded-xl transition-all duration-200 flex items-center gap-2 text-sm font-medium hover:scale-105"
                  style={{ background: CARD, border: `1px solid ${BORDER}` }}
                >
                  <RefreshCw size={15} />
                  Atualizar
                </button>
                <Link
                  to="/pagamentos/criar"
                  className="px-5 py-2.5 text-white rounded-xl transition-all duration-300 flex items-center gap-2 text-sm font-semibold shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40 hover:scale-105"
                  style={{ background: ACCENT_GRADIENT }}
                >
                  <Plus size={15} />
                  Criar Pagamento
                </Link>
              </div>
            </motion.div>

            {/* Filters Card - Glassmorphism */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-2xl p-5 backdrop-blur-xl"
              style={{ background: CARD, border: `1px solid ${BORDER}` }}
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-white/40" size={16} />
                  <input
                    type="text"
                    placeholder="Buscar por título, cliente ou CPF..."
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all"
                    style={{ background: INPUT_BG, border: `1px solid ${BORDER}` }}
                  />
                </div>

                {/* Status Filter */}
                <div className="relative">
                  <Filter className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-white/40" size={16} />
                  <select
                    value={filtro}
                    onChange={(e) => setFiltro(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 appearance-none transition-all [&>option]:bg-white [&>option]:text-gray-800"
                    style={{ background: INPUT_BG, border: `1px solid ${BORDER}` }}
                  >
                    <option value="todos">Todos os Status</option>
                    <option value="pendente">Pendente</option>
                    <option value="aprovado">Aprovado</option>
                    <option value="rejeitado">Rejeitado</option>
                    <option value="cancelado">Cancelado</option>
                    <option value="expirado">Expirado</option>
                  </select>
                </div>

                {/* Stats */}
                <div
                  className="flex items-center justify-between rounded-xl px-4 py-2.5"
                  style={{ background: INPUT_BG, border: `1px solid ${BORDER}` }}
                >
                  <span className="text-white/50 text-sm">Total:</span>
                  <span className="text-white font-bold text-sm">{pagamentosFiltrados.length} pagamentos</span>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Payment List */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-3"
          >
            {error && (
              <div
                className="rounded-xl p-4 text-center flex items-center justify-center gap-3"
                style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)' }}
              >
                <AlertCircle className="text-red-400" size={20} />
                <p className="text-red-400 text-sm font-medium">{error}</p>
              </div>
            )}

            {success && (
              <div
                className="rounded-xl p-4 text-center flex items-center justify-center gap-3"
                style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)' }}
              >
                <CheckCircle className="text-emerald-400" size={20} />
                <p className="text-emerald-400 text-sm font-medium">{success}</p>
              </div>
            )}

            {pagamentosExibidos.length === 0 ? (
              <div
                className="rounded-2xl p-12 text-center backdrop-blur-xl"
                style={{ background: CARD, border: `1px solid ${BORDER}` }}
              >
                <div
                  className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-5"
                  style={{ background: 'rgba(255,255,255,0.05)' }}
                >
                  <CreditCard className="text-white/30" size={36} />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Nenhum pagamento encontrado</h3>
                <p className="text-white/40 mb-6 text-sm">
                  {pagamentos.length === 0
                    ? 'Comece criando seu primeiro pagamento.'
                    : 'Tente ajustar os filtros de busca.'
                  }
                </p>
                <Link
                  to="/pagamentos/criar"
                  className="inline-flex items-center gap-2 px-6 py-3 text-white rounded-xl transition-all duration-300 text-sm font-semibold shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40 hover:scale-105"
                  style={{ background: ACCENT_GRADIENT }}
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
                  transition={{ delay: index * 0.04 }}
                  className="rounded-2xl p-5 backdrop-blur-xl hover:scale-[1.005] transition-all duration-300 group"
                  style={{
                    background: CARD,
                    border: `1px solid ${BORDER}`,
                  }}
                >
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">

                    {/* Info Principal */}
                    <div className="lg:col-span-4">
                      <div className="flex items-start gap-3">
                        <div
                          className="p-2.5 rounded-xl flex-shrink-0"
                          style={{ background: 'rgba(255,255,255,0.08)', border: `1px solid ${BORDER}` }}
                        >
                          {getTipoIcon(pagamento.tipo)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-white truncate text-sm">{pagamento.titulo}</h3>
                          <div className="flex items-center gap-2 mt-1.5">
                            <User size={13} className="text-white/40" />
                            <span className="text-white/50 text-xs truncate">
                              {pagamento.cliente?.nome || 'Cliente não encontrado'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-white/30 text-xs">
                              ID: #{pagamento.id}
                            </span>
                            <span
                              className="text-xs uppercase font-mono px-1.5 py-0.5 rounded"
                              style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}
                            >
                              {pagamento.tipo}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Valor e Parcelas */}
                    <div className="lg:col-span-2">
                      <div className="flex items-center gap-2">
                        <DollarSign size={15} className="text-emerald-400" />
                        <div>
                          <span className="font-bold text-emerald-400 text-sm">R$ {pagamento.valor}</span>
                          {pagamento.parcelas > 1 && (
                            <div className="text-xs text-white/40 mt-0.5">
                              {pagamento.parcelas}x de R$ {pagamento.valor_parcela}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Status e Envios */}
                    <div className="lg:col-span-2">
                      <div className="space-y-2">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${getStatusColor(pagamento.status)}`}>
                          {getStatusIcon(pagamento.status)}
                          {pagamento.status.charAt(0).toUpperCase() + pagamento.status.slice(1)}
                        </span>

                        {/* Indicadores de Envio */}
                        <div className="flex gap-1.5">
                          {pagamento.whatsapp_enviado && (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs text-emerald-400"
                              style={{ background: 'rgba(16,185,129,0.12)' }}
                            >
                              <Smartphone size={11} />
                              WhatsApp
                            </span>
                          )}
                          {pagamento.email_enviado && (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs text-blue-400"
                              style={{ background: 'rgba(59,130,246,0.12)' }}
                            >
                              <Mail size={11} />
                              Email
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Data */}
                    <div className="lg:col-span-2">
                      <div className="flex items-center gap-2">
                        <Calendar size={13} className="text-white/40" />
                        <span className="text-white/50 text-xs">
                          {formatarData(pagamento.created_at)}
                        </span>
                      </div>
                      {pagamento.data_vencimento && (
                        <div className="text-xs text-white/30 mt-1 ml-5">
                          Venc: {formatarData(pagamento.data_vencimento)}
                        </div>
                      )}
                    </div>

                    {/* Acoes */}
                    <div className="lg:col-span-2">
                      <div className="flex items-center gap-1.5 justify-end">
                        {pagamento.link_pagamento && (
                          <>
                            <button
                              onClick={() => copiarLink(pagamento.link_pagamento)}
                              className="p-2 rounded-lg text-white/40 hover:text-white transition-all duration-200 hover:scale-110"
                              style={{ background: 'rgba(255,255,255,0.05)' }}
                              title="Copiar Link"
                            >
                              <Copy size={15} />
                            </button>
                            <button
                              onClick={() => abrirPagamento(pagamento.link_pagamento)}
                              className="p-2 rounded-lg text-orange-400 hover:text-orange-300 transition-all duration-200 hover:scale-110"
                              style={{ background: 'rgba(249,115,22,0.1)' }}
                              title="Abrir Pagamento"
                            >
                              <ExternalLink size={15} />
                            </button>
                          </>
                        )}

                        {/* Botao Editar */}
                        <button
                          onClick={() => abrirModalEdicao(pagamento)}
                          className="p-2 rounded-lg text-blue-400 hover:text-blue-300 transition-all duration-200 hover:scale-110"
                          style={{ background: 'rgba(59,130,246,0.1)' }}
                          title="Editar Pagamento"
                        >
                          <Edit size={15} />
                        </button>

                        {/* Botao Deletar */}
                        <button
                          onClick={() => confirmarExclusao(pagamento)}
                          disabled={deletandoId === pagamento.id}
                          className="p-2 rounded-lg text-red-400 hover:text-red-300 transition-all duration-200 hover:scale-110 disabled:opacity-50"
                          style={{ background: 'rgba(239,68,68,0.1)' }}
                          title="Deletar Pagamento"
                        >
                          {deletandoId === pagamento.id ? (
                            <Loader2 size={15} className="animate-spin" />
                          ) : (
                            <Trash2 size={15} />
                          )}
                        </button>

                        {/* Menu de Acoes Extras */}
                        <div className="relative">
                          <button
                            onClick={() => setShowActions(showActions === pagamento.id ? null : pagamento.id)}
                            className="p-2 rounded-lg text-white/40 hover:text-white transition-all duration-200 hover:scale-110"
                            style={{ background: 'rgba(255,255,255,0.05)' }}
                            title="Mais Ações"
                          >
                            <MoreVertical size={15} />
                          </button>

                          {/* Dropdown de acoes */}
                          {showActions === pagamento.id && (
                            <div
                              className="absolute right-0 top-full mt-2 w-52 rounded-xl shadow-2xl shadow-black/40 z-10 backdrop-blur-xl overflow-hidden"
                              style={{ background: 'rgba(15,23,42,0.95)', border: `1px solid ${BORDER}` }}
                            >
                              <div className="p-1.5 space-y-0.5">
                                <button
                                  onClick={() => {
                                    reenviarWhatsApp(pagamento.id);
                                    setShowActions(null);
                                  }}
                                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-white/80 hover:text-white hover:bg-white/5 rounded-lg transition-colors text-sm"
                                >
                                  <Smartphone size={15} className="text-emerald-400" />
                                  Reenviar WhatsApp
                                </button>
                                <button
                                  onClick={() => {
                                    reenviarEmail(pagamento.id);
                                    setShowActions(null);
                                  }}
                                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-white/80 hover:text-white hover:bg-white/5 rounded-lg transition-colors text-sm"
                                >
                                  <Mail size={15} className="text-blue-400" />
                                  Reenviar Email
                                </button>
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(`${window.location.origin}/pagamentos/publico/${pagamento.id}`);
                                    alert('Link público copiado!');
                                    setShowActions(null);
                                  }}
                                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-white/80 hover:text-white hover:bg-white/5 rounded-lg transition-colors text-sm"
                                >
                                  <Copy size={15} className="text-orange-400" />
                                  Copiar Link Público
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Descricao */}
                  {pagamento.descricao && (
                    <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${BORDER}` }}>
                      <p className="text-white/45 text-sm">{pagamento.descricao}</p>
                    </div>
                  )}

                  {/* Secao de Comprovante */}
                  {pagamento.status === 'aprovado' && (
                    <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${BORDER}` }}>
                      <div className="flex items-center gap-2 mb-3">
                        <FileText size={15} className="text-orange-400" />
                        <h4 className="text-white font-semibold text-sm">Comprovante</h4>
                      </div>

                      {pagamento.tem_comprovante ? (
                        <div className="flex gap-2 flex-wrap">
                          <button
                            onClick={() => abrirComprovante(pagamento.comprovante_url)}
                            className="px-3 py-2 rounded-lg text-orange-400 hover:text-orange-300 transition-all flex items-center gap-2 text-xs font-medium hover:scale-105"
                            style={{ background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.2)' }}
                            title="Abrir comprovante oficial"
                          >
                            <ExternalLink size={13} />
                            Ver Comprovante
                          </button>

                          {pagamento.cliente?.telefone && (
                            <button
                              onClick={() => enviarComprovante(pagamento.id)}
                              className="px-3 py-2 rounded-lg text-emerald-400 hover:text-emerald-300 transition-all flex items-center gap-2 text-xs font-medium hover:scale-105"
                              style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}
                              title="Enviar comprovante para cliente"
                              disabled={loading}
                            >
                              <Smartphone size={13} />
                              Enviar Cliente
                            </button>
                          )}
                        </div>
                      ) : pagamento.pode_obter_comprovante ? (
                        <div className="space-y-2">
                          <button
                            onClick={() => obterComprovante(pagamento.id)}
                            className="px-3 py-2 rounded-lg text-blue-400 hover:text-blue-300 transition-all flex items-center gap-2 text-xs font-medium hover:scale-105"
                            style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)' }}
                            title="Obter comprovante do Mercado Pago"
                            disabled={loading}
                          >
                            <Download size={13} />
                            Obter Comprovante
                          </button>
                          <p className="text-xs text-white/30">Buscar comprovante oficial do MP</p>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <AlertCircle size={13} className="text-yellow-400" />
                          <span className="text-xs text-yellow-400">Comprovante não disponível</span>
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              ))
            )}
          </motion.div>

          {/* Paginacao */}
          {totalPaginas > 1 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="flex justify-center items-center gap-2 mt-8"
            >
              <button
                onClick={() => setPaginaAtual(Math.max(1, paginaAtual - 1))}
                disabled={paginaAtual === 1}
                className="px-4 py-2.5 text-white/70 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed rounded-xl transition-all text-sm font-medium"
                style={{ background: CARD, border: `1px solid ${BORDER}` }}
              >
                Anterior
              </button>

              <span
                className="px-4 py-2.5 text-white/60 text-sm rounded-xl"
                style={{ background: CARD, border: `1px solid ${BORDER}` }}
              >
                Página <span className="text-white font-semibold">{paginaAtual}</span> de <span className="text-white font-semibold">{totalPaginas}</span>
              </span>

              <button
                onClick={() => setPaginaAtual(Math.min(totalPaginas, paginaAtual + 1))}
                disabled={paginaAtual === totalPaginas}
                className="px-4 py-2.5 text-white/70 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed rounded-xl transition-all text-sm font-medium"
                style={{ background: CARD, border: `1px solid ${BORDER}` }}
              >
                Próxima
              </button>
            </motion.div>
          )}
        </div>
      </div>

      {/* Modal de Edicao */}
      {editando && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto backdrop-blur-xl"
            style={{ background: 'rgba(15,23,42,0.95)', border: `1px solid ${BORDER}` }}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div
                  className="p-2.5 rounded-xl"
                  style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.25)' }}
                >
                  <Edit className="text-blue-400" size={18} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Editar Pagamento</h3>
                  <p className="text-white/40 text-xs">ID: #{editando.id} - {editando.tipo?.toUpperCase()}</p>
                </div>
              </div>
              <button
                onClick={cancelarEdicao}
                className="p-2 hover:bg-white/10 rounded-xl transition-colors text-white/40 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Titulo */}
              <div>
                <label className="flex items-center gap-2 text-white/80 font-medium mb-2 text-sm">
                  <FileText size={14} />
                  Título *
                </label>
                <input
                  type="text"
                  value={formEdicao.titulo}
                  onChange={(e) => setFormEdicao(prev => ({ ...prev, titulo: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl text-white placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all text-sm"
                  style={{ background: INPUT_BG, border: `1px solid ${BORDER}` }}
                  placeholder="Ex: Serviço de Consultoria"
                />
              </div>

              {/* Descricao */}
              <div>
                <label className="text-white/80 font-medium mb-2 block text-sm">Descrição</label>
                <textarea
                  value={formEdicao.descricao}
                  onChange={(e) => setFormEdicao(prev => ({ ...prev, descricao: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl text-white placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all text-sm resize-none"
                  style={{ background: INPUT_BG, border: `1px solid ${BORDER}` }}
                  placeholder="Descrição do serviço ou produto"
                  rows="3"
                />
              </div>

              {/* Valor */}
              <div>
                <label className="flex items-center gap-2 text-white/80 font-medium mb-2 text-sm">
                  <DollarSign size={14} />
                  Valor *
                </label>
                <input
                  type="text"
                  value={formatarValor(formEdicao.valor)}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "");
                    setFormEdicao(prev => ({ ...prev, valor: value }));
                  }}
                  className="w-full px-4 py-3 rounded-xl text-emerald-400 font-semibold placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all text-sm"
                  style={{ background: INPUT_BG, border: `1px solid ${BORDER}` }}
                  placeholder="0,00"
                />
              </div>

              {/* Numero de Parcelas (apenas para boleto) */}
              {editando.tipo === 'boleto' && (
                <div>
                  <label className="flex items-center gap-2 text-white/80 font-medium mb-2 text-sm">
                    <CreditCard size={14} />
                    Número de Parcelas
                  </label>
                  <select
                    value={formEdicao.parcelas}
                    onChange={(e) => setFormEdicao(prev => ({ ...prev, parcelas: parseInt(e.target.value) }))
                    }
                    className="w-full px-4 py-3 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all text-sm [&>option]:bg-white [&>option]:text-gray-800"
                    style={{ background: INPUT_BG, border: `1px solid ${BORDER}` }}
                  >
                    <option value={1}>À vista</option>
                    {[2,3,4,5,6,7,8,9,10,11,12].map(num => (
                      <option key={num} value={num}>
                        {num}x de R$ {formEdicao.valor ? formatarValor(Math.floor(parseInt(formEdicao.valor) / num)) : '0,00'}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Data de Vencimento (apenas para boleto) */}
              {editando.tipo === 'boleto' && (
                <div>
                  <label className="flex items-center gap-2 text-white/80 font-medium mb-2 text-sm">
                    <Calendar size={14} />
                    Data de Vencimento *
                  </label>
                  <input
                    type="date"
                    value={formEdicao.data_vencimento}
                    onChange={(e) => setFormEdicao(prev => ({ ...prev, data_vencimento: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all text-sm"
                    style={{ background: INPUT_BG, border: `1px solid ${BORDER}` }}
                  />
                </div>
              )}

              {/* Observacoes */}
              <div>
                <label className="text-white/80 font-medium mb-2 block text-sm">Observações</label>
                <textarea
                  value={formEdicao.observacoes}
                  onChange={(e) => setFormEdicao(prev => ({ ...prev, observacoes: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl text-white placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all text-sm resize-none"
                  style={{ background: INPUT_BG, border: `1px solid ${BORDER}` }}
                  placeholder="Observações adicionais"
                  rows="3"
                />
              </div>
            </div>

            {/* Botoes */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={cancelarEdicao}
                className="flex-1 py-3 px-4 text-white/70 hover:text-white rounded-xl transition-all text-sm font-medium"
                style={{ background: CARD, border: `1px solid ${BORDER}` }}
              >
                Cancelar
              </button>
              <button
                onClick={salvarEdicao}
                disabled={salvandoEdicao || !formEdicao.titulo}
                className="flex-1 py-3 px-4 text-white rounded-xl transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm font-semibold shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40"
                style={{ background: ACCENT_GRADIENT }}
              >
                {salvandoEdicao ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save size={15} />
                    Salvar Alterações
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Modal de Confirmacao de Exclusao */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="rounded-2xl p-6 max-w-md w-full backdrop-blur-xl"
            style={{ background: 'rgba(15,23,42,0.95)', border: `1px solid ${BORDER}` }}
          >
            <div className="text-center">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)' }}
              >
                <AlertCircle className="text-red-400" size={28} />
              </div>

              <h3 className="text-lg font-bold text-white mb-2">Confirmar Exclusão</h3>
              <p className="text-white/50 mb-2 text-sm">
                Tem certeza que deseja excluir o pagamento:
              </p>
              <p className="text-white font-semibold mb-6 text-sm">
                "{confirmDelete.titulo}"?
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="flex-1 py-3 px-4 text-white/70 hover:text-white rounded-xl transition-all text-sm font-medium"
                  style={{ background: CARD, border: `1px solid ${BORDER}` }}
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleDeletePagamento(confirmDelete.id)}
                  disabled={deletandoId === confirmDelete.id}
                  className="flex-1 py-3 px-4 bg-red-500/80 hover:bg-red-500 text-white rounded-xl transition-all disabled:opacity-40 flex items-center justify-center gap-2 text-sm font-semibold"
                  style={{ border: '1px solid rgba(239,68,68,0.4)' }}
                >
                  {deletandoId === confirmDelete.id ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      Excluindo...
                    </>
                  ) : (
                    <>
                      <Trash2 size={15} />
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
