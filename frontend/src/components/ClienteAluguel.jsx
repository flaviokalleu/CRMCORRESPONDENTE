import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Users,
  CreditCard,
  Calendar,
  Phone,
  Mail,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  Plus,
  X,
  AlertTriangle,
  Eye,
  Trash2,
  Edit,
  Home,
  Building,
  Loader2,
  RefreshCw,
  ExternalLink,
  Copy,
  Receipt,
  FileSignature,
  TrendingUp,
  Brain,
  Shield
} from "lucide-react";

const ClienteAluguel = () => {
  const [clientes, setClientes] = useState([]);
  const [modalAberto, setModalAberto] = useState(false);
  const [modalPagamento, setModalPagamento] = useState(false);
  const [modalConfirmacao, setModalConfirmacao] = useState(false);
  const [modalCobrancaAvulsa, setModalCobrancaAvulsa] = useState(false);
  const [modalCobrancas, setModalCobrancas] = useState(false);
  const [clienteSelecionado, setClienteSelecionado] = useState(null);
  const [pagamentoParaDeletar, setPagamentoParaDeletar] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingAsaas, setLoadingAsaas] = useState(false);
  const [cobrancas, setCobrancas] = useState([]);
  const [cobrancaCriada, setCobrancaCriada] = useState(null);
  const [formPagamento, setFormPagamento] = useState({
    data: new Date().toISOString().split('T')[0],
    valor: '',
    status: 'Pago',
    forma_pagamento: 'Dinheiro'
  });
  const [formCobrancaAvulsa, setFormCobrancaAvulsa] = useState({
    valor: '',
    data_vencimento: '',
    descricao: ''
  });

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  const cardVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.3 } }
  };

  useEffect(() => {
    carregarClientes();
  }, []);

  const carregarClientes = async () => {
    try {
      setLoading(true);
      const response = await fetch(process.env.REACT_APP_API_URL + "/clientealuguel");
      const data = await response.json();
      if (Array.isArray(data)) {
        setClientes(data);
      } else {
        console.error("Dados recebidos não são um array:", data);
        setClientes([]);
      }
    } catch (error) {
      console.error("Erro ao carregar clientes:", error);
      setClientes([]);
    } finally {
      setLoading(false);
    }
  };

  const verificarAtraso = (cliente) => {
    const hoje = new Date();
    const diaVencimento = parseInt(cliente.dia_vencimento);
    return hoje.getDate() > diaVencimento;
  };

  const abrirHistorico = (cliente) => {
    setClienteSelecionado(cliente);
    setModalAberto(true);
  };

  const abrirModalPagamento = (cliente) => {
    setClienteSelecionado(cliente);
    setFormPagamento({
      data: new Date().toISOString().split('T')[0],
      valor: cliente.valor_aluguel,
      status: 'Pago',
      forma_pagamento: 'Dinheiro'
    });
    setModalPagamento(true);
  };

  const abrirModalConfirmacao = (pagamento, index) => {
    setPagamentoParaDeletar({ pagamento, index, id: pagamento.id });
    setModalConfirmacao(true);
  };

  const abrirModalCobrancaAvulsa = (cliente) => {
    setClienteSelecionado(cliente);
    setFormCobrancaAvulsa({
      valor: cliente.valor_aluguel,
      data_vencimento: '',
      descricao: ''
    });
    setCobrancaCriada(null);
    setModalCobrancaAvulsa(true);
  };

  const abrirModalCobrancas = async (cliente) => {
    setClienteSelecionado(cliente);
    setModalCobrancas(true);
    await carregarCobrancas(cliente.id);
  };

  const carregarCobrancas = async (clienteId) => {
    try {
      setLoadingAsaas(true);
      const response = await fetch(`${process.env.REACT_APP_API_URL}/clientealuguel/${clienteId}/cobrancas`);
      const data = await response.json();
      setCobrancas(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Erro ao carregar cobrancas:", error);
      setCobrancas([]);
    } finally {
      setLoadingAsaas(false);
    }
  };

  const fecharModais = () => {
    setModalAberto(false);
    setModalPagamento(false);
    setModalConfirmacao(false);
    setModalCobrancaAvulsa(false);
    setModalCobrancas(false);
    setClienteSelecionado(null);
    setPagamentoParaDeletar(null);
    setCobrancaCriada(null);
  };

  const registrarPagamento = async () => {
    if (!clienteSelecionado) return;
    setLoading(true);
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/clientealuguel/${clienteSelecionado.id}/pagamento`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formPagamento),
        }
      );
      if (response.ok) {
        await carregarClientes();
        fecharModais();
      } else {
        console.error("Erro ao registrar pagamento");
      }
    } catch (error) {
      console.error("Erro ao registrar pagamento:", error);
    } finally {
      setLoading(false);
    }
  };

  const deletarPagamento = async () => {
    if (!clienteSelecionado || !pagamentoParaDeletar) return;
    setLoading(true);
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/clientealuguel/${clienteSelecionado.id}/pagamento/${pagamentoParaDeletar.id}`,
        { method: 'DELETE', headers: { 'Content-Type': 'application/json' } }
      );
      if (response.ok) {
        const clienteAtualizado = await response.json();
        setClienteSelecionado(clienteAtualizado);
        await carregarClientes();
        setModalConfirmacao(false);
        setPagamentoParaDeletar(null);
      } else {
        console.error("Erro ao deletar pagamento");
      }
    } catch (error) {
      console.error("Erro ao deletar pagamento:", error);
    } finally {
      setLoading(false);
    }
  };

  const gerarCobrancaAvulsa = async () => {
    if (!clienteSelecionado) return;
    setLoadingAsaas(true);
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/clientealuguel/${clienteSelecionado.id}/cobranca-avulsa`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formCobrancaAvulsa),
        }
      );
      if (response.ok) {
        const data = await response.json();
        setCobrancaCriada(data);
      } else {
        const err = await response.json();
        alert(err.error || 'Erro ao gerar cobranca');
      }
    } catch (error) {
      console.error("Erro ao gerar cobranca avulsa:", error);
      alert('Erro ao gerar cobranca avulsa');
    } finally {
      setLoadingAsaas(false);
    }
  };

  const sincronizarAsaas = async (cliente) => {
    setLoadingAsaas(true);
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/clientealuguel/${cliente.id}/sincronizar-asaas`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' } }
      );
      if (response.ok) {
        await carregarClientes();
      } else {
        const err = await response.json();
        alert(err.error || 'Erro ao sincronizar com Asaas');
      }
    } catch (error) {
      console.error("Erro ao sincronizar Asaas:", error);
      alert('Erro ao sincronizar com Asaas');
    } finally {
      setLoadingAsaas(false);
    }
  };

  const copiarLink = (url) => {
    navigator.clipboard.writeText(url);
    alert('Link copiado!');
  };

  const gerarContrato = async (cliente) => {
    setLoadingAsaas(true);
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/clientealuguel/${cliente.id}/contrato`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        alert('Contrato gerado! Baixando...');
        window.open(`${process.env.REACT_APP_API_URL}/clientealuguel/${cliente.id}/contrato`, '_blank');
      } else {
        alert('Erro ao gerar contrato');
      }
    } catch (e) { alert('Erro ao gerar contrato'); }
    finally { setLoadingAsaas(false); }
  };

  const simularReajuste = async (cliente) => {
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/clientealuguel/${cliente.id}/reajuste`);
      if (res.ok) {
        const data = await res.json();
        alert(`Simulacao de Reajuste (${data.indice_nome}):\n\nValor atual: R$ ${data.valor_atual.toFixed(2)}\nIndice: ${data.indice_percentual}%\nNovo valor: R$ ${data.valor_reajustado.toFixed(2)}\nDiferenca: +R$ ${data.diferenca.toFixed(2)}${data.dias_para_reajuste ? '\nReajuste em: ' + data.dias_para_reajuste + ' dias' : ''}`);
      }
    } catch (e) { alert('Erro ao simular reajuste'); }
  };

  const recalcularScore = async (cliente) => {
    setLoadingAsaas(true);
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/clientealuguel/${cliente.id}/score`, { method: 'POST' });
      if (res.ok) {
        await carregarClientes();
      }
    } catch (e) { console.error(e); }
    finally { setLoadingAsaas(false); }
  };

  // Score Badge
  const ScoreBadge = ({ score }) => {
    if (score == null) return null;
    let color = 'bg-red-500/20 text-red-400 border-red-500/30';
    if (score >= 80) color = 'bg-green-500/20 text-green-400 border-green-500/30';
    else if (score >= 60) color = 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    else if (score >= 40) color = 'bg-orange-500/20 text-orange-400 border-orange-500/30';
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border ${color}`}>
        <Shield className="w-3 h-3" />{score}
      </span>
    );
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'CONFIRMED':
      case 'RECEIVED':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'PENDING':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'OVERDUE':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'REFUNDED':
      case 'CANCELLED':
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      default:
        return 'bg-white/20 text-white border-white/30';
    }
  };

  const getStatusLabel = (status) => {
    const labels = {
      PENDING: 'Pendente',
      CONFIRMED: 'Confirmado',
      RECEIVED: 'Recebido',
      OVERDUE: 'Vencido',
      REFUNDED: 'Estornado',
      CANCELLED: 'Cancelado',
    };
    return labels[status] || status;
  };

  // Badge Asaas
  const AsaasBadge = ({ cliente }) => {
    if (cliente.asaas_subscription_status === 'ACTIVE') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
          <CheckCircle className="w-3 h-3" />
          Asaas Ativo
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
        <Clock className="w-3 h-3" />
        Asaas Pendente
      </span>
    );
  };

  const renderHistorico = () => {
    if (!clienteSelecionado?.historico_pagamentos ||
        !Array.isArray(clienteSelecionado.historico_pagamentos) ||
        clienteSelecionado.historico_pagamentos.length === 0) {
      return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-12">
          <div className="w-20 h-20 bg-caixa-light/20 rounded-full flex items-center justify-center mb-4">
            <FileText className="w-10 h-10 text-caixa-light" />
          </div>
          <p className="text-caixa-extra-light text-center">Nenhum historico de pagamentos encontrado</p>
        </motion.div>
      );
    }

    return clienteSelecionado.historico_pagamentos.map((pag, i) => {
      const isPago = pag.status === "Pago";
      return (
        <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
          className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 mb-3 hover:bg-white/10 transition-all duration-200 group">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                {isPago ? <CheckCircle className="w-4 h-4 text-green-400" /> : <XCircle className="w-4 h-4 text-red-400" />}
                <span className={`font-medium ${isPago ? 'text-green-400' : 'text-red-400'}`}>{pag.status || "N/A"}</span>
                {pag.asaas_payment_id && (
                  <span className="text-xs text-caixa-extra-light bg-white/10 px-2 py-0.5 rounded">Asaas</span>
                )}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-caixa-extra-light text-sm"><Calendar className="w-3 h-3" /><span>{pag.data || "N/A"}</span></div>
                <div className="flex items-center gap-2 text-white font-semibold"><DollarSign className="w-3 h-3" /><span>R$ {pag.valor || "N/A"}</span></div>
                {pag.forma_pagamento && (
                  <div className="flex items-center gap-2 text-caixa-extra-light text-sm"><CreditCard className="w-3 h-3" /><span>{pag.forma_pagamento}</span></div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className={`px-3 py-1 rounded-full text-xs font-medium ${isPago ? 'bg-green-400/20 text-green-400 border border-green-400/30' : 'bg-red-400/20 text-red-400 border border-red-400/30'}`}>
                {isPago ? 'Pago' : 'Pendente'}
              </div>
              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                onClick={() => abrirModalConfirmacao(pag, i)}
                className="opacity-0 group-hover:opacity-100 bg-red-600 hover:bg-red-700 text-white p-2 rounded-lg transition-all duration-200" title="Deletar pagamento">
                <Trash2 className="w-3 h-3" />
              </motion.button>
            </div>
          </div>
        </motion.div>
      );
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-caixa-primary via-caixa-secondary to-black flex items-center justify-center">
        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 border-4 border-caixa-light/30 border-t-caixa-light rounded-full mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Carregando Clientes</h2>
          <p className="text-caixa-extra-light">Aguarde...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-caixa-primary via-caixa-secondary to-black">
      <div className="absolute inset-0 bg-gradient-to-br from-caixa-primary/20 via-caixa-secondary/10 to-transparent"></div>
      <div className="absolute inset-0">
        <div className="absolute top-0 -left-4 w-72 h-72 bg-caixa-light rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse"></div>
        <div className="absolute top-0 -right-4 w-72 h-72 bg-caixa-orange rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse delay-1000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-caixa-secondary rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse delay-2000"></div>
      </div>

      <div className="relative z-10">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="bg-white/5 backdrop-blur-md border-b border-white/10">
          <div className="container mx-auto px-4 py-8">
            <div className="flex items-center gap-4 mb-2">
              <div className="w-12 h-12 bg-gradient-to-br from-caixa-light to-caixa-secondary rounded-xl flex items-center justify-center shadow-lg">
                <Home className="w-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold text-white">Clientes de Aluguel</h1>
                <p className="text-caixa-extra-light text-lg">Gerencie os pagamentos dos seus clientes de aluguel</p>
              </div>
            </div>

            {/* Estatisticas */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-caixa-light/20 rounded-lg flex items-center justify-center"><Users className="w-5 h-5 text-caixa-light" /></div>
                  <div><p className="text-2xl font-bold text-white">{clientes.length}</p><p className="text-caixa-extra-light text-sm">Total de Clientes</p></div>
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center"><CheckCircle className="w-5 h-5 text-green-400" /></div>
                  <div><p className="text-2xl font-bold text-white">{clientes.filter(c => !verificarAtraso(c)).length}</p><p className="text-caixa-extra-light text-sm">Em Dia</p></div>
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center"><AlertTriangle className="w-5 h-5 text-red-400" /></div>
                  <div><p className="text-2xl font-bold text-white">{clientes.filter(c => verificarAtraso(c)).length}</p><p className="text-caixa-extra-light text-sm">Em Atraso</p></div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="container mx-auto px-4 py-8">
          <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
            {/* Cards Mobile */}
            <div className="block lg:hidden space-y-4">
              {clientes.map((cliente, index) => {
                const emAtraso = verificarAtraso(cliente);
                return (
                  <motion.div key={cliente.id} variants={cardVariants} custom={index}
                    className={`backdrop-blur-md border rounded-2xl p-6 transition-all duration-300 ${emAtraso ? 'bg-red-500/10 border-red-500/30 hover:bg-red-500/20 shadow-red-500/10' : 'bg-white/10 border-white/20 hover:bg-white/15 shadow-xl'}`}>
                    {emAtraso && (
                      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                        className="bg-red-500/20 border border-red-500/30 rounded-xl p-3 mb-4 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-400" />
                        <span className="text-red-400 text-sm font-medium">Pagamento em atraso!</span>
                      </motion.div>
                    )}

                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-white mb-1">{cliente.nome}</h3>
                        <div className="flex items-center gap-2 text-caixa-extra-light text-sm">
                          <Mail className="w-3 h-3" /><span>{cliente.email}</span>
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <AsaasBadge cliente={cliente} />
                          <ScoreBadge score={cliente.score_inquilino} />
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-caixa-orange font-bold text-xl">
                          {Number(cliente.valor_aluguel).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </p>
                        <div className="flex items-center gap-1 text-caixa-extra-light text-sm">
                          <Calendar className="w-3 h-3" /><span>Dia {cliente.dia_vencimento}</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-caixa-light" /><span className="text-white text-sm">{cliente.telefone}</span></div>
                      <div className="flex items-center gap-2"><FileText className="w-4 h-4 text-caixa-light" /><span className="text-white text-sm">{cliente.cpf}</span></div>
                    </div>

                    {/* Botoes de Acao */}
                    <div className="grid grid-cols-2 gap-3">
                      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                        className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-medium py-3 px-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
                        onClick={() => abrirModalPagamento(cliente)}>
                        <Plus className="w-4 h-4" />Registrar Pagamento
                      </motion.button>
                      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                        className="bg-gradient-to-r from-caixa-light to-caixa-secondary hover:from-caixa-secondary hover:to-caixa-light text-white font-medium py-3 px-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
                        onClick={() => abrirHistorico(cliente)}>
                        <Eye className="w-4 h-4" />Ver Historico
                      </motion.button>
                      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                        className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-medium py-3 px-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
                        onClick={() => abrirModalCobrancaAvulsa(cliente)}>
                        <DollarSign className="w-4 h-4" />Gerar Cobranca
                      </motion.button>
                      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                        className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-medium py-3 px-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
                        onClick={() => abrirModalCobrancas(cliente)}>
                        <Receipt className="w-4 h-4" />Ver Cobrancas
                      </motion.button>
                    </div>

                    {/* Botoes extras: Contrato, Reajuste, Score */}
                    <div className="grid grid-cols-3 gap-3 mt-3">
                      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                        className="bg-white/10 hover:bg-white/20 border border-white/20 text-white font-medium py-2 px-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-1 text-sm"
                        onClick={() => gerarContrato(cliente)}>
                        <FileSignature className="w-4 h-4" />Contrato
                      </motion.button>
                      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                        className="bg-white/10 hover:bg-white/20 border border-white/20 text-white font-medium py-2 px-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-1 text-sm"
                        onClick={() => simularReajuste(cliente)}>
                        <TrendingUp className="w-4 h-4" />Reajuste
                      </motion.button>
                      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                        className="bg-white/10 hover:bg-white/20 border border-white/20 text-white font-medium py-2 px-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-1 text-sm"
                        onClick={() => recalcularScore(cliente)} disabled={loadingAsaas}>
                        <Brain className="w-4 h-4" />Score IA
                      </motion.button>
                    </div>

                    {/* Botao Sincronizar se Asaas pendente */}
                    {!cliente.asaas_subscription_status && (
                      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                        onClick={() => sincronizarAsaas(cliente)} disabled={loadingAsaas}
                        className="mt-3 w-full bg-yellow-600/20 hover:bg-yellow-600/30 border border-yellow-500/30 text-yellow-400 font-medium py-2 px-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2">
                        <RefreshCw className={`w-4 h-4 ${loadingAsaas ? 'animate-spin' : ''}`} />
                        Sincronizar Asaas
                      </motion.button>
                    )}
                  </motion.div>
                );
              })}
            </div>

            {/* Tabela Desktop */}
            <motion.div variants={itemVariants} className="hidden lg:block">
              <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-white/5 border-b border-white/10">
                        <th className="px-6 py-4 text-left text-sm font-semibold text-caixa-extra-light">Cliente</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-caixa-extra-light">Contato</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-caixa-extra-light">Valor</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-caixa-extra-light">Vencimento</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-caixa-extra-light">Status</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-caixa-extra-light">Asaas</th>
                        <th className="px-6 py-4 text-center text-sm font-semibold text-caixa-extra-light">Acoes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clientes.map((cliente, index) => {
                        const emAtraso = verificarAtraso(cliente);
                        return (
                          <motion.tr key={cliente.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.1 }}
                            className={`border-b border-white/5 transition-all duration-200 ${emAtraso ? 'bg-red-500/5 hover:bg-red-500/10' : 'hover:bg-white/5'}`}>
                            <td className="px-6 py-4">
                              <div>
                                <div className="font-medium text-white flex items-center gap-2">
                                  {cliente.nome}
                                  {emAtraso && <AlertTriangle className="w-4 h-4 text-red-400" />}
                                </div>
                                <div className="text-sm text-caixa-extra-light flex items-center gap-1"><FileText className="w-3 h-3" />{cliente.cpf}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div>
                                <div className="text-white flex items-center gap-1"><Mail className="w-3 h-3 text-caixa-light" />{cliente.email}</div>
                                <div className="text-sm text-caixa-extra-light flex items-center gap-1"><Phone className="w-3 h-3" />{cliente.telefone}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-caixa-orange font-semibold flex items-center gap-1">
                                <DollarSign className="w-4 h-4" />
                                {Number(cliente.valor_aluguel).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="bg-caixa-light/20 text-caixa-light px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 w-fit">
                                <Calendar className="w-3 h-3" />Dia {cliente.dia_vencimento}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              {emAtraso ? (
                                <span className="bg-red-500/20 text-red-400 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 w-fit">
                                  <Clock className="w-3 h-3" />Em Atraso
                                </span>
                              ) : (
                                <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 w-fit">
                                  <CheckCircle className="w-3 h-3" />Em Dia
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <AsaasBadge cliente={cliente} />
                                {!cliente.asaas_subscription_status && (
                                  <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                                    onClick={() => sincronizarAsaas(cliente)} disabled={loadingAsaas}
                                    className="bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-400 p-1.5 rounded-lg transition-all" title="Sincronizar Asaas">
                                    <RefreshCw className={`w-3.5 h-3.5 ${loadingAsaas ? 'animate-spin' : ''}`} />
                                  </motion.button>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2 justify-center flex-wrap">
                                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                  className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-medium py-2 px-3 rounded-xl transition-all duration-200 flex items-center gap-1 text-sm"
                                  onClick={() => abrirModalPagamento(cliente)} title="Registrar Pagamento">
                                  <Plus className="w-4 h-4" />Pagar
                                </motion.button>
                                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                  className="bg-gradient-to-r from-caixa-light to-caixa-secondary hover:from-caixa-secondary hover:to-caixa-light text-white font-medium py-2 px-3 rounded-xl transition-all duration-200 flex items-center gap-1 text-sm"
                                  onClick={() => abrirHistorico(cliente)} title="Ver Historico">
                                  <Eye className="w-4 h-4" />Historico
                                </motion.button>
                                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                  className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-medium py-2 px-3 rounded-xl transition-all duration-200 flex items-center gap-1 text-sm"
                                  onClick={() => abrirModalCobrancaAvulsa(cliente)} title="Gerar Cobranca Asaas">
                                  <DollarSign className="w-4 h-4" />Cobrar
                                </motion.button>
                                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                  className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-medium py-2 px-3 rounded-xl transition-all duration-200 flex items-center gap-1 text-sm"
                                  onClick={() => abrirModalCobrancas(cliente)} title="Ver Cobrancas Asaas">
                                  <Receipt className="w-4 h-4" />Cobrancas
                                </motion.button>
                              </div>
                            </td>
                          </motion.tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Modal de Historico */}
      {modalAberto && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
            className="bg-gradient-to-br from-caixa-primary/95 to-caixa-secondary/95 backdrop-blur-md border border-white/20 rounded-2xl w-full max-w-lg max-h-[80vh] overflow-hidden shadow-2xl">
            <div className="bg-gradient-to-r from-caixa-light to-caixa-secondary p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">Historico de Pagamentos</h2>
                  <p className="text-white/80 text-sm mt-1">{clienteSelecionado?.nome}</p>
                </div>
                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={fecharModais}
                  className="bg-white/20 hover:bg-white/30 text-white rounded-full p-2 transition-all duration-200">
                  <X className="w-5 h-5" />
                </motion.button>
              </div>
            </div>
            <div className="p-6 max-h-96 overflow-y-auto">{renderHistorico()}</div>
            <div className="border-t border-white/10 p-4">
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={fecharModais}
                className="w-full bg-gradient-to-r from-caixa-light to-caixa-secondary hover:from-caixa-secondary hover:to-caixa-light text-white font-medium py-3 px-4 rounded-xl transition-all duration-200">
                Fechar
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Modal de Pagamento Manual */}
      {modalPagamento && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
            className="bg-gradient-to-br from-caixa-primary/95 to-caixa-secondary/95 backdrop-blur-md border border-white/20 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="bg-gradient-to-r from-green-600 to-green-700 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">Registrar Pagamento</h2>
                  <p className="text-white/80 text-sm mt-1">{clienteSelecionado?.nome}</p>
                </div>
                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={fecharModais}
                  className="bg-white/20 hover:bg-white/30 text-white rounded-full p-2 transition-all duration-200">
                  <X className="w-5 h-5" />
                </motion.button>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Data do Pagamento</label>
                  <input type="date" value={formPagamento.data} onChange={(e) => setFormPagamento({...formPagamento, data: e.target.value})}
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-caixa-light/50 focus:border-caixa-light/50 transition-all duration-300" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Valor</label>
                  <input type="number" value={formPagamento.valor} onChange={(e) => setFormPagamento({...formPagamento, valor: e.target.value})}
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-caixa-light/50 focus:border-caixa-light/50 transition-all duration-300" placeholder="R$ 0,00" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Forma de Pagamento</label>
                  <select value={formPagamento.forma_pagamento} onChange={(e) => setFormPagamento({...formPagamento, forma_pagamento: e.target.value})}
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-caixa-light/50 focus:border-caixa-light/50 transition-all duration-300">
                    <option value="Dinheiro" className="bg-caixa-primary text-white">Dinheiro</option>
                    <option value="PIX" className="bg-caixa-primary text-white">PIX</option>
                    <option value="Cartão de Débito" className="bg-caixa-primary text-white">Cartao de Debito</option>
                    <option value="Cartão de Crédito" className="bg-caixa-primary text-white">Cartao de Credito</option>
                    <option value="Transferência" className="bg-caixa-primary text-white">Transferencia</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Status</label>
                  <select value={formPagamento.status} onChange={(e) => setFormPagamento({...formPagamento, status: e.target.value})}
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-caixa-light/50 focus:border-caixa-light/50 transition-all duration-300">
                    <option value="Pago" className="bg-caixa-primary text-white">Pago</option>
                    <option value="Pendente" className="bg-caixa-primary text-white">Pendente</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="border-t border-white/10 p-4 flex gap-3">
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={fecharModais}
                className="flex-1 bg-white/10 hover:bg-white/20 text-white font-medium py-3 px-4 rounded-xl transition-all duration-200">Cancelar</motion.button>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={registrarPagamento} disabled={loading}
                className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-medium py-3 px-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2">
                {loading ? (<><Loader2 className="w-4 h-4 animate-spin" />Salvando...</>) : (<><CheckCircle className="w-4 h-4" />Confirmar</>)}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Modal de Confirmacao de Exclusao */}
      {modalConfirmacao && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
            className="bg-gradient-to-br from-caixa-primary/95 to-caixa-secondary/95 backdrop-blur-md border border-white/20 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="bg-gradient-to-r from-red-600 to-red-700 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">Confirmar Exclusao</h2>
                  <p className="text-white/80 text-sm mt-1">Esta acao nao pode ser desfeita</p>
                </div>
                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={fecharModais}
                  className="bg-white/20 hover:bg-white/30 text-white rounded-full p-2 transition-all duration-200">
                  <X className="w-5 h-5" />
                </motion.button>
              </div>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center"><AlertTriangle className="w-6 h-6 text-red-400" /></div>
                <div>
                  <h3 className="text-white font-medium">Deletar Pagamento</h3>
                  <p className="text-caixa-extra-light text-sm">Tem certeza que deseja deletar este pagamento?</p>
                </div>
              </div>
              {pagamentoParaDeletar && (
                <div className="bg-white/5 rounded-xl p-4 mb-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-caixa-extra-light"><Calendar className="w-3 h-3" /><span>Data: {pagamentoParaDeletar.pagamento.data}</span></div>
                    <div className="flex items-center gap-2 text-white font-semibold"><DollarSign className="w-3 h-3" /><span>Valor: R$ {pagamentoParaDeletar.pagamento.valor}</span></div>
                    <div className="flex items-center gap-2 text-caixa-extra-light">
                      <span className={`w-3 h-3 rounded-full ${pagamentoParaDeletar.pagamento.status === "Pago" ? 'bg-green-400' : 'bg-red-400'}`}></span>
                      <span>Status: {pagamentoParaDeletar.pagamento.status}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="border-t border-white/10 p-4 flex gap-3">
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={fecharModais}
                className="flex-1 bg-white/10 hover:bg-white/20 text-white font-medium py-3 px-4 rounded-xl transition-all duration-200">Cancelar</motion.button>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={deletarPagamento} disabled={loading}
                className="flex-1 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-medium py-3 px-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2">
                {loading ? (<><Loader2 className="w-4 h-4 animate-spin" />Deletando...</>) : (<><Trash2 className="w-4 h-4" />Deletar</>)}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Modal de Cobranca Avulsa */}
      {modalCobrancaAvulsa && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
            className="bg-gradient-to-br from-caixa-primary/95 to-caixa-secondary/95 backdrop-blur-md border border-white/20 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">Gerar Cobranca Asaas</h2>
                  <p className="text-white/80 text-sm mt-1">{clienteSelecionado?.nome}</p>
                </div>
                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={fecharModais}
                  className="bg-white/20 hover:bg-white/30 text-white rounded-full p-2 transition-all duration-200">
                  <X className="w-5 h-5" />
                </motion.button>
              </div>
            </div>
            <div className="p-6">
              {cobrancaCriada ? (
                <div className="space-y-4">
                  <div className="bg-green-500/20 border border-green-500/30 rounded-xl p-4 flex items-center gap-3">
                    <CheckCircle className="w-6 h-6 text-green-400" />
                    <div>
                      <p className="text-green-400 font-medium">Cobranca gerada com sucesso!</p>
                      <p className="text-green-400/70 text-sm">R$ {parseFloat(cobrancaCriada.valor).toFixed(2)}</p>
                    </div>
                  </div>
                  {cobrancaCriada.invoice_url && (
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-white">Link de Pagamento</label>
                      <div className="flex gap-2">
                        <input type="text" readOnly value={cobrancaCriada.invoice_url}
                          className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white text-sm truncate" />
                        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                          onClick={() => copiarLink(cobrancaCriada.invoice_url)}
                          className="bg-caixa-light hover:bg-caixa-light/80 text-white px-4 py-3 rounded-xl flex items-center gap-1">
                          <Copy className="w-4 h-4" />
                        </motion.button>
                        <motion.a whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                          href={cobrancaCriada.invoice_url} target="_blank" rel="noopener noreferrer"
                          className="bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-xl flex items-center gap-1">
                          <ExternalLink className="w-4 h-4" />
                        </motion.a>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">Valor</label>
                    <input type="number" value={formCobrancaAvulsa.valor}
                      onChange={(e) => setFormCobrancaAvulsa({...formCobrancaAvulsa, valor: e.target.value})}
                      className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all duration-300"
                      placeholder="R$ 0,00" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">Data de Vencimento</label>
                    <input type="date" value={formCobrancaAvulsa.data_vencimento}
                      onChange={(e) => setFormCobrancaAvulsa({...formCobrancaAvulsa, data_vencimento: e.target.value})}
                      className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all duration-300" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">Descricao (opcional)</label>
                    <input type="text" value={formCobrancaAvulsa.descricao}
                      onChange={(e) => setFormCobrancaAvulsa({...formCobrancaAvulsa, descricao: e.target.value})}
                      className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all duration-300"
                      placeholder="Ex: Aluguel + IPTU" />
                  </div>
                  <p className="text-caixa-extra-light text-xs">O inquilino podera escolher entre Boleto, PIX ou Cartao.</p>
                </div>
              )}
            </div>
            <div className="border-t border-white/10 p-4 flex gap-3">
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={fecharModais}
                className="flex-1 bg-white/10 hover:bg-white/20 text-white font-medium py-3 px-4 rounded-xl transition-all duration-200">
                {cobrancaCriada ? 'Fechar' : 'Cancelar'}
              </motion.button>
              {!cobrancaCriada && (
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={gerarCobrancaAvulsa} disabled={loadingAsaas}
                  className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-medium py-3 px-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2">
                  {loadingAsaas ? (<><Loader2 className="w-4 h-4 animate-spin" />Gerando...</>) : (<><DollarSign className="w-4 h-4" />Gerar Cobranca</>)}
                </motion.button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Modal de Cobrancas Asaas */}
      {modalCobrancas && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
            className="bg-gradient-to-br from-caixa-primary/95 to-caixa-secondary/95 backdrop-blur-md border border-white/20 rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-2xl">
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">Cobrancas Asaas</h2>
                  <p className="text-white/80 text-sm mt-1">{clienteSelecionado?.nome}</p>
                </div>
                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={fecharModais}
                  className="bg-white/20 hover:bg-white/30 text-white rounded-full p-2 transition-all duration-200">
                  <X className="w-5 h-5" />
                </motion.button>
              </div>
            </div>
            <div className="p-6 max-h-[50vh] overflow-y-auto">
              {loadingAsaas ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
                </div>
              ) : cobrancas.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-20 h-20 bg-purple-500/20 rounded-full flex items-center justify-center mb-4">
                    <Receipt className="w-10 h-10 text-purple-400" />
                  </div>
                  <p className="text-caixa-extra-light text-center">Nenhuma cobranca encontrada</p>
                  <p className="text-caixa-extra-light text-center text-sm mt-1">Gere uma cobranca avulsa ou aguarde a sincronizacao automatica</p>
                </div>
              ) : (
                cobrancas.map((cobranca, i) => (
                  <motion.div key={cobranca.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                    className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 mb-3 hover:bg-white/10 transition-all duration-200">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(cobranca.status)}`}>
                            {getStatusLabel(cobranca.status)}
                          </span>
                          <span className="text-xs text-caixa-extra-light bg-white/10 px-2 py-0.5 rounded">
                            {cobranca.tipo === 'avulso' ? 'Avulsa' : 'Recorrente'}
                          </span>
                          {cobranca.billing_type && cobranca.billing_type !== 'UNDEFINED' && (
                            <span className="text-xs text-caixa-extra-light bg-white/10 px-2 py-0.5 rounded">{cobranca.billing_type}</span>
                          )}
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-white font-semibold">
                            <DollarSign className="w-3 h-3" />
                            <span>R$ {parseFloat(cobranca.valor).toFixed(2)}</span>
                          </div>
                          <div className="flex items-center gap-4 text-caixa-extra-light text-sm">
                            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />Vence: {cobranca.data_vencimento}</span>
                            {cobranca.data_pagamento && (
                              <span className="flex items-center gap-1 text-green-400"><CheckCircle className="w-3 h-3" />Pago: {cobranca.data_pagamento}</span>
                            )}
                          </div>
                          {cobranca.descricao && <p className="text-caixa-extra-light text-xs">{cobranca.descricao}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {cobranca.invoice_url && (
                          <>
                            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                              onClick={() => copiarLink(cobranca.invoice_url)}
                              className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-lg transition-all" title="Copiar link">
                              <Copy className="w-4 h-4" />
                            </motion.button>
                            <motion.a whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                              href={cobranca.invoice_url} target="_blank" rel="noopener noreferrer"
                              className="bg-green-600/20 hover:bg-green-600/30 text-green-400 p-2 rounded-lg transition-all" title="Abrir link de pagamento">
                              <ExternalLink className="w-4 h-4" />
                            </motion.a>
                          </>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
            <div className="border-t border-white/10 p-4">
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={fecharModais}
                className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-medium py-3 px-4 rounded-xl transition-all duration-200">
                Fechar
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

export default ClienteAluguel;
