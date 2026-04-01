import React, { useEffect, useState, useMemo } from "react";
import { useLocation } from "react-router-dom";
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
  Shield,
  Search,
  Filter,
  ArrowRightLeft,
  Send,
  RotateCcw,
  Key,
  Percent,
  User
} from "lucide-react";
import FormInquilino from "./FormInquilino";

/* ── Design Tokens ── */
const CARD = 'rgba(255,255,255,0.06)';
const CARD_HOVER = 'rgba(255,255,255,0.10)';
const BORDER = 'rgba(255,255,255,0.10)';
const INPUT_BG = 'rgba(255,255,255,0.05)';
const ACCENT_GRADIENT = 'linear-gradient(135deg, #F97316, #EA580C)';

const glassCard = {
  background: CARD,
  border: `1px solid ${BORDER}`,
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
};

const glassCardHover = {
  background: CARD_HOVER,
};

const inputStyle = `w-full rounded-xl px-4 py-3 text-white placeholder-white/40
  focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/40
  transition-all duration-300 [&>option]:bg-white [&>option]:text-gray-800`;

const ClienteAluguel = () => {
  const location = useLocation();
  const [clientes, setClientes] = useState([]);
  const [modalAberto, setModalAberto] = useState(!!(location.state?.abrirModal));
  const [modalPagamento, setModalPagamento] = useState(false);
  const [modalConfirmacao, setModalConfirmacao] = useState(false);
  const [modalCobrancaAvulsa, setModalCobrancaAvulsa] = useState(false);
  const [modalCobrancas, setModalCobrancas] = useState(false);
  const [modalEditar, setModalEditar] = useState(false);
  const [modalRepasses, setModalRepasses] = useState(false);
  const [repasses, setRepasses] = useState([]);
  const [loadingRepasses, setLoadingRepasses] = useState(false);
  const [clienteSelecionado, setClienteSelecionado] = useState(null);
  const [pagamentoParaDeletar, setPagamentoParaDeletar] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingAsaas, setLoadingAsaas] = useState(false);
  const [cobrancas, setCobrancas] = useState([]);
  const [cobrancaCriada, setCobrancaCriada] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('todos');
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

  /* ── Filtered clients ── */
  const clientesFiltrados = useMemo(() => {
    let resultado = clientes;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      resultado = resultado.filter(c =>
        c.nome?.toLowerCase().includes(term) ||
        c.cpf?.toLowerCase().includes(term) ||
        c.email?.toLowerCase().includes(term) ||
        c.telefone?.toLowerCase().includes(term)
      );
    }
    if (filterStatus === 'em_dia') {
      resultado = resultado.filter(c => !verificarAtraso(c));
    } else if (filterStatus === 'em_atraso') {
      resultado = resultado.filter(c => verificarAtraso(c));
    }
    return resultado;
  }, [clientes, searchTerm, filterStatus]);

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
    setModalEditar(false);
    setModalRepasses(false);
    setClienteSelecionado(null);
    setPagamentoParaDeletar(null);
    setCobrancaCriada(null);
    setRepasses([]);
  };

  const abrirModalRepasses = async (cliente) => {
    setClienteSelecionado(cliente);
    setModalRepasses(true);
    setLoadingRepasses(true);
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/repasses?cliente_aluguel_id=${cliente.id}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
      });
      const data = await res.json();
      setRepasses(Array.isArray(data.repasses) ? data.repasses : Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Erro ao carregar repasses:', e);
      setRepasses([]);
    } finally {
      setLoadingRepasses(false);
    }
  };

  const retentarRepasse = async (repasseId) => {
    setLoadingRepasses(true);
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/repasses/${repasseId}/transferir`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
      });
      const data = await res.json();
      if (res.ok) {
        setRepasses(prev => prev.map(r => r.id === repasseId ? { ...r, transfer_status: data.transfer_status || 'REALIZADO' } : r));
      } else {
        alert(data.error || 'Erro ao retentar repasse');
      }
    } catch (e) {
      alert('Erro ao retentar repasse');
    } finally {
      setLoadingRepasses(false);
    }
  };

  const abrirEditar = (cliente) => {
    setClienteSelecionado(cliente);
    setModalEditar(true);
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
    if (score >= 80) color = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    else if (score >= 60) color = 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    else if (score >= 40) color = 'bg-orange-500/20 text-orange-400 border-orange-500/30';
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${color}`}>
        <Shield className="w-3 h-3" />{score}
      </span>
    );
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'CONFIRMED':
      case 'RECEIVED':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
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
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
          <CheckCircle className="w-3 h-3" />
          Asaas Ativo
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-500/15 text-yellow-400 border border-yellow-500/25">
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
          <div className="w-20 h-20 rounded-full flex items-center justify-center mb-4" style={{ background: 'rgba(249,115,22,0.15)' }}>
            <FileText className="w-10 h-10 text-orange-400" />
          </div>
          <p className="text-white/50 text-center">Nenhum historico de pagamentos encontrado</p>
        </motion.div>
      );
    }

    return clienteSelecionado.historico_pagamentos.map((pag, i) => {
      const isPago = pag.status === "Pago";
      return (
        <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
          className="rounded-xl p-4 mb-3 group transition-all duration-200"
          style={{ ...glassCard }}
          onMouseEnter={e => e.currentTarget.style.background = CARD_HOVER}
          onMouseLeave={e => e.currentTarget.style.background = CARD}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                {isPago ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4 text-red-400" />}
                <span className={`font-medium ${isPago ? 'text-emerald-400' : 'text-red-400'}`}>{pag.status || "N/A"}</span>
                {pag.asaas_payment_id && (
                  <span className="text-xs text-white/50 bg-white/10 px-2 py-0.5 rounded-md">Asaas</span>
                )}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-white/50 text-sm"><Calendar className="w-3 h-3" /><span>{pag.data || "N/A"}</span></div>
                <div className="flex items-center gap-2 text-white font-semibold"><DollarSign className="w-3 h-3 text-orange-400" /><span>R$ {pag.valor || "N/A"}</span></div>
                {pag.forma_pagamento && (
                  <div className="flex items-center gap-2 text-white/50 text-sm"><CreditCard className="w-3 h-3" /><span>{pag.forma_pagamento}</span></div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className={`px-3 py-1 rounded-full text-xs font-medium border ${isPago ? 'bg-emerald-400/15 text-emerald-400 border-emerald-400/25' : 'bg-red-400/15 text-red-400 border-red-400/25'}`}>
                {isPago ? 'Pago' : 'Pendente'}
              </div>
              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                onClick={() => abrirModalConfirmacao(pag, i)}
                className="opacity-0 group-hover:opacity-100 bg-red-600/80 hover:bg-red-600 text-white p-2 rounded-lg transition-all duration-200" title="Deletar pagamento">
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
      <div className="min-h-screen bg-caixa-gradient flex items-center justify-center">
        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 border-4 border-orange-500/30 border-t-orange-500 rounded-full mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Carregando Clientes</h2>
          <p className="text-white/50">Aguarde...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-caixa-gradient">
      {/* Ambient glow orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-orange-500/[0.07] rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-48 w-[500px] h-[500px] bg-blue-600/[0.05] rounded-full blur-3xl" />
        <div className="absolute -bottom-32 left-1/4 w-96 h-96 bg-orange-600/[0.05] rounded-full blur-3xl" />
      </div>

      <div className="relative z-10">
        {/* ── Sticky Header ── */}
        <div className="sticky top-0 z-30">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
            className="backdrop-blur-xl border-b"
            style={{ background: 'rgba(11,20,38,0.85)', borderColor: BORDER }}>
            <div className="container mx-auto px-4 py-6">
              {/* Title row */}
              <div className="flex items-center gap-4 mb-5">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20"
                  style={{ background: ACCENT_GRADIENT }}>
                  <Home className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Clientes de Aluguel</h1>
                  <p className="text-white/40 text-sm">Gerencie os pagamentos dos seus clientes de aluguel</p>
                </div>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
                <div className="rounded-xl p-4" style={glassCard}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(249,115,22,0.15)' }}>
                      <Users className="w-5 h-5 text-orange-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white">{clientes.length}</p>
                      <p className="text-white/40 text-xs">Total de Clientes</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-xl p-4" style={glassCard}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.15)' }}>
                      <CheckCircle className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white">{clientes.filter(c => !verificarAtraso(c)).length}</p>
                      <p className="text-white/40 text-xs">Em Dia</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-xl p-4" style={glassCard}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.15)' }}>
                      <AlertTriangle className="w-5 h-5 text-red-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white">{clientes.filter(c => verificarAtraso(c)).length}</p>
                      <p className="text-white/40 text-xs">Em Atraso</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Search & filter bar */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                  <input
                    type="text"
                    placeholder="Buscar por nome, CPF, email ou telefone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-orange-500/40 transition-all"
                    style={{ background: INPUT_BG, border: `1px solid ${BORDER}` }}
                  />
                </div>
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="pl-10 pr-8 py-2.5 rounded-xl text-sm text-white appearance-none focus:outline-none focus:ring-2 focus:ring-orange-500/40 transition-all cursor-pointer [&>option]:bg-white [&>option]:text-gray-800"
                    style={{ background: INPUT_BG, border: `1px solid ${BORDER}` }}
                  >
                    <option value="todos">Todos</option>
                    <option value="em_dia">Em Dia</option>
                    <option value="em_atraso">Em Atraso</option>
                  </select>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* ── Main Content ── */}
        <div className="container mx-auto px-4 py-8">
          <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">

            {clientesFiltrados.length === 0 && (
              <motion.div variants={itemVariants} className="flex flex-col items-center justify-center py-20">
                <div className="w-20 h-20 rounded-full flex items-center justify-center mb-4" style={{ background: 'rgba(249,115,22,0.12)' }}>
                  <Users className="w-10 h-10 text-orange-400/60" />
                </div>
                <p className="text-white/40 text-center text-lg">Nenhum cliente encontrado</p>
                {searchTerm && <p className="text-white/25 text-sm mt-1">Tente ajustar sua busca</p>}
              </motion.div>
            )}

            {/* ── Cards Mobile ── */}
            <div className="block lg:hidden space-y-4">
              {clientesFiltrados.map((cliente, index) => {
                const emAtraso = verificarAtraso(cliente);
                return (
                  <motion.div key={cliente.id} variants={cardVariants} custom={index}
                    className="rounded-2xl p-5 transition-all duration-300"
                    style={{
                      ...glassCard,
                      ...(emAtraso ? { borderColor: 'rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.06)' } : {})
                    }}>
                    {emAtraso && (
                      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                        className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-4 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-400" />
                        <span className="text-red-400 text-sm font-medium">Pagamento em atraso!</span>
                      </motion.div>
                    )}

                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-white mb-1">{cliente.nome}</h3>
                        <div className="flex items-center gap-2 text-white/40 text-sm">
                          <Mail className="w-3 h-3" /><span>{cliente.email}</span>
                        </div>
                        <div className="mt-2 flex items-center gap-2 flex-wrap">
                          <AsaasBadge cliente={cliente} />
                          <ScoreBadge score={cliente.score_inquilino} />
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-orange-400 font-bold text-xl">
                          {Number(cliente.valor_aluguel).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </p>
                        <div className="flex items-center gap-1 text-white/40 text-sm justify-end">
                          <Calendar className="w-3 h-3" /><span>Dia {cliente.dia_vencimento}</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-orange-400/60" /><span className="text-white/80 text-sm">{cliente.telefone}</span></div>
                      <div className="flex items-center gap-2"><FileText className="w-4 h-4 text-orange-400/60" /><span className="text-white/80 text-sm">{cliente.cpf}</span></div>
                    </div>

                    {/* Action buttons */}
                    <div className="grid grid-cols-2 gap-2.5">
                      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                        className="text-white font-medium py-2.5 px-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 text-sm"
                        style={{ background: 'linear-gradient(135deg, #059669, #047857)' }}
                        onClick={() => abrirModalPagamento(cliente)}>
                        <Plus className="w-4 h-4" />Registrar
                      </motion.button>
                      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                        className="text-white font-medium py-2.5 px-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 text-sm"
                        style={{ background: ACCENT_GRADIENT }}
                        onClick={() => abrirHistorico(cliente)}>
                        <Eye className="w-4 h-4" />Historico
                      </motion.button>
                      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                        className="text-white font-medium py-2.5 px-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 text-sm bg-amber-600/80 hover:bg-amber-600"
                        onClick={() => abrirModalCobrancaAvulsa(cliente)}>
                        <DollarSign className="w-4 h-4" />Cobrar
                      </motion.button>
                      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                        className="text-white font-medium py-2.5 px-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 text-sm bg-purple-600/80 hover:bg-purple-600"
                        onClick={() => abrirModalCobrancas(cliente)}>
                        <Receipt className="w-4 h-4" />Cobrancas
                      </motion.button>
                    </div>

                    {/* Extra buttons */}
                    <div className="grid grid-cols-3 gap-2.5 mt-2.5">
                      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                        className="text-white/80 font-medium py-2 px-2 rounded-xl transition-all duration-200 flex items-center justify-center gap-1 text-xs"
                        style={glassCard}
                        onClick={() => gerarContrato(cliente)}>
                        <FileSignature className="w-3.5 h-3.5" />Contrato
                      </motion.button>
                      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                        className="text-white/80 font-medium py-2 px-2 rounded-xl transition-all duration-200 flex items-center justify-center gap-1 text-xs"
                        style={glassCard}
                        onClick={() => simularReajuste(cliente)}>
                        <TrendingUp className="w-3.5 h-3.5" />Reajuste
                      </motion.button>
                      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                        className="text-white/80 font-medium py-2 px-2 rounded-xl transition-all duration-200 flex items-center justify-center gap-1 text-xs"
                        style={glassCard}
                        onClick={() => recalcularScore(cliente)} disabled={loadingAsaas}>
                        <Brain className="w-3.5 h-3.5" />Score IA
                      </motion.button>
                    </div>

                    {/* Repasses + Edit buttons */}
                    <div className="grid grid-cols-2 gap-2.5 mt-2.5">
                      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                        className="text-white/80 font-medium py-2 px-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 text-sm"
                        style={{ background: 'rgba(6,182,212,0.15)', border: '1px solid rgba(6,182,212,0.25)' }}
                        onClick={() => abrirModalRepasses(cliente)}>
                        <ArrowRightLeft className="w-4 h-4 text-cyan-400" /><span className="text-cyan-300">Repasses</span>
                      </motion.button>
                      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                        className="text-white/80 font-medium py-2 px-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 text-sm"
                        style={glassCard}
                        onClick={() => abrirEditar(cliente)}>
                        <Edit className="w-4 h-4 text-orange-400" />Editar
                      </motion.button>
                    </div>

                    {/* Sync button */}
                    {!cliente.asaas_subscription_status && (
                      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                        onClick={() => sincronizarAsaas(cliente)} disabled={loadingAsaas}
                        className="mt-2.5 w-full bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/20 text-yellow-400 font-medium py-2 px-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 text-sm">
                        <RefreshCw className={`w-4 h-4 ${loadingAsaas ? 'animate-spin' : ''}`} />
                        Sincronizar Asaas
                      </motion.button>
                    )}
                  </motion.div>
                );
              })}
            </div>

            {/* ── Table Desktop ── */}
            <motion.div variants={itemVariants} className="hidden lg:block">
              <div className="rounded-2xl overflow-hidden shadow-2xl shadow-black/20" style={glassCard}>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: `1px solid ${BORDER}` }}>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-white/40 uppercase tracking-wider">Cliente</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-white/40 uppercase tracking-wider">Contato</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-white/40 uppercase tracking-wider">Valor</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-white/40 uppercase tracking-wider">Vencimento</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-white/40 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-white/40 uppercase tracking-wider">Asaas</th>
                        <th className="px-6 py-4 text-center text-xs font-semibold text-white/40 uppercase tracking-wider">Acoes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clientesFiltrados.map((cliente, index) => {
                        const emAtraso = verificarAtraso(cliente);
                        return (
                          <motion.tr key={cliente.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.05 }}
                            className="transition-all duration-200 group"
                            style={{
                              borderBottom: `1px solid rgba(255,255,255,0.05)`,
                              background: emAtraso ? 'rgba(239,68,68,0.04)' : 'transparent',
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = emAtraso ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.04)'}
                            onMouseLeave={e => e.currentTarget.style.background = emAtraso ? 'rgba(239,68,68,0.04)' : 'transparent'}>
                            <td className="px-6 py-4">
                              <div>
                                <div className="font-medium text-white flex items-center gap-2">
                                  {cliente.nome}
                                  {emAtraso && <AlertTriangle className="w-4 h-4 text-red-400" />}
                                  <ScoreBadge score={cliente.score_inquilino} />
                                </div>
                                <div className="text-sm text-white/40 flex items-center gap-1 mt-0.5"><FileText className="w-3 h-3" />{cliente.cpf}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div>
                                <div className="text-white/80 flex items-center gap-1 text-sm"><Mail className="w-3 h-3 text-orange-400/60" />{cliente.email}</div>
                                <div className="text-sm text-white/40 flex items-center gap-1 mt-0.5"><Phone className="w-3 h-3" />{cliente.telefone}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-orange-400 font-semibold flex items-center gap-1">
                                <DollarSign className="w-4 h-4" />
                                {Number(cliente.valor_aluguel).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="bg-orange-500/10 text-orange-300 px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1 w-fit border border-orange-500/20">
                                <Calendar className="w-3 h-3" />Dia {cliente.dia_vencimento}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              {emAtraso ? (
                                <span className="bg-red-500/15 text-red-400 px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1 w-fit border border-red-500/20">
                                  <Clock className="w-3 h-3" />Em Atraso
                                </span>
                              ) : (
                                <span className="bg-emerald-500/15 text-emerald-400 px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1 w-fit border border-emerald-500/20">
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
                                    className="bg-yellow-500/15 hover:bg-yellow-500/25 text-yellow-400 p-1.5 rounded-lg transition-all border border-yellow-500/20" title="Sincronizar Asaas">
                                    <RefreshCw className={`w-3.5 h-3.5 ${loadingAsaas ? 'animate-spin' : ''}`} />
                                  </motion.button>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-1.5 justify-center flex-wrap">
                                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                  className="text-white font-medium py-1.5 px-2.5 rounded-lg transition-all duration-200 flex items-center gap-1 text-xs"
                                  style={{ background: 'linear-gradient(135deg, #059669, #047857)' }}
                                  onClick={() => abrirModalPagamento(cliente)} title="Registrar Pagamento">
                                  <Plus className="w-3.5 h-3.5" />Pagar
                                </motion.button>
                                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                  className="text-white font-medium py-1.5 px-2.5 rounded-lg transition-all duration-200 flex items-center gap-1 text-xs"
                                  style={{ background: ACCENT_GRADIENT }}
                                  onClick={() => abrirHistorico(cliente)} title="Ver Historico">
                                  <Eye className="w-3.5 h-3.5" />Historico
                                </motion.button>
                                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                  className="bg-amber-600/80 hover:bg-amber-600 text-white font-medium py-1.5 px-2.5 rounded-lg transition-all duration-200 flex items-center gap-1 text-xs"
                                  onClick={() => abrirModalCobrancaAvulsa(cliente)} title="Gerar Cobranca Asaas">
                                  <DollarSign className="w-3.5 h-3.5" />Cobrar
                                </motion.button>
                                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                  className="bg-purple-600/80 hover:bg-purple-600 text-white font-medium py-1.5 px-2.5 rounded-lg transition-all duration-200 flex items-center gap-1 text-xs"
                                  onClick={() => abrirModalCobrancas(cliente)} title="Ver Cobrancas Asaas">
                                  <Receipt className="w-3.5 h-3.5" />Cobrancas
                                </motion.button>
                                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                  className="text-white/60 hover:text-white p-1.5 rounded-lg transition-all"
                                  style={{ background: CARD }}
                                  onClick={() => gerarContrato(cliente)} title="Gerar Contrato">
                                  <FileSignature className="w-3.5 h-3.5" />
                                </motion.button>
                                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                  className="text-white/60 hover:text-white p-1.5 rounded-lg transition-all"
                                  style={{ background: CARD }}
                                  onClick={() => simularReajuste(cliente)} title="Simular Reajuste">
                                  <TrendingUp className="w-3.5 h-3.5" />
                                </motion.button>
                                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                  className="text-white/60 hover:text-white p-1.5 rounded-lg transition-all"
                                  style={{ background: CARD }}
                                  onClick={() => recalcularScore(cliente)} disabled={loadingAsaas} title="Recalcular Score IA">
                                  <Brain className="w-3.5 h-3.5" />
                                </motion.button>
                                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                  className="text-cyan-400/80 hover:text-cyan-300 p-1.5 rounded-lg transition-all"
                                  style={{ background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.2)' }}
                                  onClick={() => abrirModalRepasses(cliente)} title="Repasses PIX">
                                  <ArrowRightLeft className="w-3.5 h-3.5" />
                                </motion.button>
                                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                  className="text-orange-400/80 hover:text-orange-300 p-1.5 rounded-lg transition-all"
                                  style={{ background: CARD }}
                                  onClick={() => abrirEditar(cliente)} title="Editar Inquilino">
                                  <Edit className="w-3.5 h-3.5" />
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

      {/* ════════════════════════════════════════════
          MODAL: Historico de Pagamentos
         ════════════════════════════════════════════ */}
      {modalAberto && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
            className="w-full max-w-lg max-h-[80vh] overflow-hidden rounded-2xl shadow-2xl shadow-black/40"
            style={{ ...glassCard, background: 'rgba(11,20,38,0.95)' }}>
            <div className="p-6" style={{ background: ACCENT_GRADIENT }}>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">Historico de Pagamentos</h2>
                  <p className="text-white/70 text-sm mt-1">{clienteSelecionado?.nome}</p>
                </div>
                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={fecharModais}
                  className="bg-white/20 hover:bg-white/30 text-white rounded-full p-2 transition-all duration-200">
                  <X className="w-5 h-5" />
                </motion.button>
              </div>
            </div>
            <div className="p-6 max-h-96 overflow-y-auto">{renderHistorico()}</div>
            <div className="p-4" style={{ borderTop: `1px solid ${BORDER}` }}>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={fecharModais}
                className="w-full text-white font-medium py-3 px-4 rounded-xl transition-all duration-200"
                style={{ background: ACCENT_GRADIENT }}>
                Fechar
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* ════════════════════════════════════════════
          MODAL: Registrar Pagamento
         ════════════════════════════════════════════ */}
      {modalPagamento && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
            className="w-full max-w-md overflow-hidden rounded-2xl shadow-2xl shadow-black/40"
            style={{ ...glassCard, background: 'rgba(11,20,38,0.95)' }}>
            <div className="p-6" style={{ background: 'linear-gradient(135deg, #059669, #047857)' }}>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">Registrar Pagamento</h2>
                  <p className="text-white/70 text-sm mt-1">{clienteSelecionado?.nome}</p>
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
                  <label className="block text-sm font-medium text-white/70 mb-2">Data do Pagamento</label>
                  <input type="date" value={formPagamento.data} onChange={(e) => setFormPagamento({...formPagamento, data: e.target.value})}
                    className={inputStyle}
                    style={{ background: INPUT_BG, border: `1px solid ${BORDER}` }} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">Valor</label>
                  <input type="number" value={formPagamento.valor} onChange={(e) => setFormPagamento({...formPagamento, valor: e.target.value})}
                    className={inputStyle}
                    style={{ background: INPUT_BG, border: `1px solid ${BORDER}` }}
                    placeholder="R$ 0,00" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">Forma de Pagamento</label>
                  <select value={formPagamento.forma_pagamento} onChange={(e) => setFormPagamento({...formPagamento, forma_pagamento: e.target.value})}
                    className={inputStyle}
                    style={{ background: INPUT_BG, border: `1px solid ${BORDER}` }}>
                    <option value="Dinheiro">Dinheiro</option>
                    <option value="PIX">PIX</option>
                    <option value="Cartão de Débito">Cartao de Debito</option>
                    <option value="Cartão de Crédito">Cartao de Credito</option>
                    <option value="Transferência">Transferencia</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">Status</label>
                  <select value={formPagamento.status} onChange={(e) => setFormPagamento({...formPagamento, status: e.target.value})}
                    className={inputStyle}
                    style={{ background: INPUT_BG, border: `1px solid ${BORDER}` }}>
                    <option value="Pago">Pago</option>
                    <option value="Pendente">Pendente</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="p-4 flex gap-3" style={{ borderTop: `1px solid ${BORDER}` }}>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={fecharModais}
                className="flex-1 text-white font-medium py-3 px-4 rounded-xl transition-all duration-200 hover:bg-white/10"
                style={{ background: CARD }}>Cancelar</motion.button>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={registrarPagamento} disabled={loading}
                className="flex-1 text-white font-medium py-3 px-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg, #059669, #047857)' }}>
                {loading ? (<><Loader2 className="w-4 h-4 animate-spin" />Salvando...</>) : (<><CheckCircle className="w-4 h-4" />Confirmar</>)}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* ════════════════════════════════════════════
          MODAL: Confirmar Exclusao
         ════════════════════════════════════════════ */}
      {modalConfirmacao && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
            className="w-full max-w-md overflow-hidden rounded-2xl shadow-2xl shadow-black/40"
            style={{ ...glassCard, background: 'rgba(11,20,38,0.95)' }}>
            <div className="p-6" style={{ background: 'linear-gradient(135deg, #DC2626, #B91C1C)' }}>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">Confirmar Exclusao</h2>
                  <p className="text-white/70 text-sm mt-1">Esta acao nao pode ser desfeita</p>
                </div>
                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={fecharModais}
                  className="bg-white/20 hover:bg-white/30 text-white rounded-full p-2 transition-all duration-200">
                  <X className="w-5 h-5" />
                </motion.button>
              </div>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-red-500/15 rounded-full flex items-center justify-center"><AlertTriangle className="w-6 h-6 text-red-400" /></div>
                <div>
                  <h3 className="text-white font-medium">Deletar Pagamento</h3>
                  <p className="text-white/40 text-sm">Tem certeza que deseja deletar este pagamento?</p>
                </div>
              </div>
              {pagamentoParaDeletar && (
                <div className="rounded-xl p-4 mb-4" style={glassCard}>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-white/50"><Calendar className="w-3 h-3" /><span>Data: {pagamentoParaDeletar.pagamento.data}</span></div>
                    <div className="flex items-center gap-2 text-white font-semibold"><DollarSign className="w-3 h-3 text-orange-400" /><span>Valor: R$ {pagamentoParaDeletar.pagamento.valor}</span></div>
                    <div className="flex items-center gap-2 text-white/50">
                      <span className={`w-3 h-3 rounded-full ${pagamentoParaDeletar.pagamento.status === "Pago" ? 'bg-emerald-400' : 'bg-red-400'}`}></span>
                      <span>Status: {pagamentoParaDeletar.pagamento.status}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="p-4 flex gap-3" style={{ borderTop: `1px solid ${BORDER}` }}>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={fecharModais}
                className="flex-1 text-white font-medium py-3 px-4 rounded-xl transition-all duration-200 hover:bg-white/10"
                style={{ background: CARD }}>Cancelar</motion.button>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={deletarPagamento} disabled={loading}
                className="flex-1 text-white font-medium py-3 px-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg, #DC2626, #B91C1C)' }}>
                {loading ? (<><Loader2 className="w-4 h-4 animate-spin" />Deletando...</>) : (<><Trash2 className="w-4 h-4" />Deletar</>)}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* ════════════════════════════════════════════
          MODAL: Cobranca Avulsa
         ════════════════════════════════════════════ */}
      {modalCobrancaAvulsa && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
            className="w-full max-w-md overflow-hidden rounded-2xl shadow-2xl shadow-black/40"
            style={{ ...glassCard, background: 'rgba(11,20,38,0.95)' }}>
            <div className="p-6" style={{ background: ACCENT_GRADIENT }}>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">Gerar Cobranca Asaas</h2>
                  <p className="text-white/70 text-sm mt-1">{clienteSelecionado?.nome}</p>
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
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex items-center gap-3">
                    <CheckCircle className="w-6 h-6 text-emerald-400" />
                    <div>
                      <p className="text-emerald-400 font-medium">Cobranca gerada com sucesso!</p>
                      <p className="text-emerald-400/60 text-sm">R$ {parseFloat(cobrancaCriada.valor).toFixed(2)}</p>
                    </div>
                  </div>
                  {cobrancaCriada.invoice_url && (
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-white/70">Link de Pagamento</label>
                      <div className="flex gap-2">
                        <input type="text" readOnly value={cobrancaCriada.invoice_url}
                          className="flex-1 rounded-xl px-4 py-3 text-white text-sm truncate"
                          style={{ background: INPUT_BG, border: `1px solid ${BORDER}` }} />
                        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                          onClick={() => copiarLink(cobrancaCriada.invoice_url)}
                          className="text-white px-4 py-3 rounded-xl flex items-center gap-1"
                          style={{ background: ACCENT_GRADIENT }}>
                          <Copy className="w-4 h-4" />
                        </motion.button>
                        <motion.a whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                          href={cobrancaCriada.invoice_url} target="_blank" rel="noopener noreferrer"
                          className="bg-emerald-600/80 hover:bg-emerald-600 text-white px-4 py-3 rounded-xl flex items-center gap-1">
                          <ExternalLink className="w-4 h-4" />
                        </motion.a>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-2">Valor</label>
                    <input type="number" value={formCobrancaAvulsa.valor}
                      onChange={(e) => setFormCobrancaAvulsa({...formCobrancaAvulsa, valor: e.target.value})}
                      className={inputStyle}
                      style={{ background: INPUT_BG, border: `1px solid ${BORDER}` }}
                      placeholder="R$ 0,00" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-2">Data de Vencimento</label>
                    <input type="date" value={formCobrancaAvulsa.data_vencimento}
                      onChange={(e) => setFormCobrancaAvulsa({...formCobrancaAvulsa, data_vencimento: e.target.value})}
                      className={inputStyle}
                      style={{ background: INPUT_BG, border: `1px solid ${BORDER}` }} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-2">Descricao (opcional)</label>
                    <input type="text" value={formCobrancaAvulsa.descricao}
                      onChange={(e) => setFormCobrancaAvulsa({...formCobrancaAvulsa, descricao: e.target.value})}
                      className={inputStyle}
                      style={{ background: INPUT_BG, border: `1px solid ${BORDER}` }}
                      placeholder="Ex: Aluguel + IPTU" />
                  </div>
                  <p className="text-white/30 text-xs">O inquilino podera escolher entre Boleto, PIX ou Cartao.</p>
                </div>
              )}
            </div>
            <div className="p-4 flex gap-3" style={{ borderTop: `1px solid ${BORDER}` }}>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={fecharModais}
                className="flex-1 text-white font-medium py-3 px-4 rounded-xl transition-all duration-200 hover:bg-white/10"
                style={{ background: CARD }}>
                {cobrancaCriada ? 'Fechar' : 'Cancelar'}
              </motion.button>
              {!cobrancaCriada && (
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={gerarCobrancaAvulsa} disabled={loadingAsaas}
                  className="flex-1 text-white font-medium py-3 px-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
                  style={{ background: ACCENT_GRADIENT }}>
                  {loadingAsaas ? (<><Loader2 className="w-4 h-4 animate-spin" />Gerando...</>) : (<><DollarSign className="w-4 h-4" />Gerar Cobranca</>)}
                </motion.button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* ════════════════════════════════════════════
          MODAL: Cobrancas Asaas
         ════════════════════════════════════════════ */}
      {modalCobrancas && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
            className="w-full max-w-2xl max-h-[80vh] overflow-hidden rounded-2xl shadow-2xl shadow-black/40"
            style={{ ...glassCard, background: 'rgba(11,20,38,0.95)' }}>
            <div className="p-6" style={{ background: 'linear-gradient(135deg, #9333EA, #7C3AED)' }}>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">Cobrancas Asaas</h2>
                  <p className="text-white/70 text-sm mt-1">{clienteSelecionado?.nome}</p>
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
                  <div className="w-20 h-20 bg-purple-500/15 rounded-full flex items-center justify-center mb-4">
                    <Receipt className="w-10 h-10 text-purple-400/60" />
                  </div>
                  <p className="text-white/40 text-center">Nenhuma cobranca encontrada</p>
                  <p className="text-white/25 text-center text-sm mt-1">Gere uma cobranca avulsa ou aguarde a sincronizacao automatica</p>
                </div>
              ) : (
                cobrancas.map((cobranca, i) => (
                  <motion.div key={cobranca.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                    className="rounded-xl p-4 mb-3 transition-all duration-200"
                    style={glassCard}
                    onMouseEnter={e => e.currentTarget.style.background = CARD_HOVER}
                    onMouseLeave={e => e.currentTarget.style.background = CARD}>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(cobranca.status)}`}>
                            {getStatusLabel(cobranca.status)}
                          </span>
                          <span className="text-xs text-white/40 bg-white/8 px-2 py-0.5 rounded-md">
                            {cobranca.tipo === 'avulso' ? 'Avulsa' : 'Recorrente'}
                          </span>
                          {cobranca.billing_type && cobranca.billing_type !== 'UNDEFINED' && (
                            <span className="text-xs text-white/40 bg-white/8 px-2 py-0.5 rounded-md">{cobranca.billing_type}</span>
                          )}
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-white font-semibold">
                            <DollarSign className="w-3 h-3 text-orange-400" />
                            <span>R$ {parseFloat(cobranca.valor).toFixed(2)}</span>
                          </div>
                          <div className="flex items-center gap-4 text-white/40 text-sm">
                            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />Vence: {cobranca.data_vencimento}</span>
                            {cobranca.data_pagamento && (
                              <span className="flex items-center gap-1 text-emerald-400"><CheckCircle className="w-3 h-3" />Pago: {cobranca.data_pagamento}</span>
                            )}
                          </div>
                          {cobranca.descricao && <p className="text-white/30 text-xs">{cobranca.descricao}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {cobranca.invoice_url && (
                          <>
                            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                              onClick={() => copiarLink(cobranca.invoice_url)}
                              className="text-white/60 hover:text-white p-2 rounded-lg transition-all"
                              style={{ background: CARD }}
                              title="Copiar link">
                              <Copy className="w-4 h-4" />
                            </motion.button>
                            <motion.a whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                              href={cobranca.invoice_url} target="_blank" rel="noopener noreferrer"
                              className="bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-400 p-2 rounded-lg transition-all border border-emerald-500/20"
                              title="Abrir link de pagamento">
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
            <div className="p-4" style={{ borderTop: `1px solid ${BORDER}` }}>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={fecharModais}
                className="w-full text-white font-medium py-3 px-4 rounded-xl transition-all duration-200"
                style={{ background: 'linear-gradient(135deg, #9333EA, #7C3AED)' }}>
                Fechar
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
      {/* ════════════════════════════════════════════
          MODAL: Repasses PIX
         ════════════════════════════════════════════ */}
      {modalRepasses && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
            className="w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-2xl shadow-2xl shadow-black/40 flex flex-col"
            style={{ ...glassCard, background: 'rgba(11,20,38,0.97)' }}>

            {/* Header */}
            <div className="p-6" style={{ background: 'linear-gradient(135deg, #0891B2, #0E7490)' }}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <ArrowRightLeft className="w-5 h-5 text-white" />
                    <h2 className="text-xl font-bold text-white">Repasses PIX</h2>
                  </div>
                  <p className="text-white/70 text-sm">{clienteSelecionado?.nome}</p>
                </div>
                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={fecharModais}
                  className="bg-white/20 hover:bg-white/30 text-white rounded-full p-2 transition-all duration-200">
                  <X className="w-5 h-5" />
                </motion.button>
              </div>

              {/* Proprietário info strip */}
              {clienteSelecionado?.proprietario_pix && (
                <div className="mt-4 rounded-xl p-3 flex flex-wrap gap-4" style={{ background: 'rgba(0,0,0,0.25)' }}>
                  {clienteSelecionado.proprietario_nome && (
                    <div className="flex items-center gap-1.5 text-sm text-white/80">
                      <User className="w-3.5 h-3.5 text-cyan-300" />
                      <span>{clienteSelecionado.proprietario_nome}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 text-sm text-white/80">
                    <Key className="w-3.5 h-3.5 text-cyan-300" />
                    <span>{clienteSelecionado.proprietario_pix}</span>
                  </div>
                  {clienteSelecionado.taxa_administracao != null && (
                    <div className="flex items-center gap-1.5 text-sm text-white/80">
                      <Percent className="w-3.5 h-3.5 text-cyan-300" />
                      <span>Taxa: {clienteSelecionado.taxa_administracao}%</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {loadingRepasses ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
                </div>
              ) : repasses.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-20 h-20 rounded-full flex items-center justify-center mb-4"
                    style={{ background: 'rgba(6,182,212,0.12)' }}>
                    <ArrowRightLeft className="w-10 h-10 text-cyan-400/40" />
                  </div>
                  <p className="text-white/40 text-center">Nenhum repasse registrado</p>
                  <p className="text-white/25 text-center text-sm mt-1">Os repasses aparecem automaticamente apos confirmação de pagamento no Asaas</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {repasses.map((r, i) => {
                    const statusColors = {
                      REALIZADO:   'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
                      PENDENTE:    'bg-yellow-500/15 text-yellow-400 border-yellow-500/25',
                      PROCESSANDO: 'bg-blue-500/15 text-blue-400 border-blue-500/25',
                      FALHOU:      'bg-red-500/15 text-red-400 border-red-500/25',
                      SEM_PIX:     'bg-gray-500/15 text-gray-400 border-gray-500/25',
                    };
                    const statusLabels = {
                      REALIZADO:   'Realizado',
                      PENDENTE:    'Pendente',
                      PROCESSANDO: 'Processando',
                      FALHOU:      'Falhou',
                      SEM_PIX:     'Sem PIX',
                    };
                    const statusColor = statusColors[r.transfer_status] || statusColors.PENDENTE;
                    const canRetry = r.transfer_status === 'FALHOU' || r.transfer_status === 'SEM_PIX';

                    return (
                      <motion.div key={r.id} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                        className="rounded-xl p-4" style={glassCard}>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div className="flex-1 space-y-2">
                            {/* Status + date */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${statusColor}`}>
                                {statusLabels[r.transfer_status] || r.transfer_status}
                              </span>
                              {r.created_at && (
                                <span className="text-xs text-white/40 flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {new Date(r.created_at).toLocaleDateString('pt-BR')}
                                </span>
                              )}
                            </div>
                            {/* Valores */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                              <div>
                                <p className="text-white/40 text-xs mb-0.5">Aluguel</p>
                                <p className="text-white font-semibold flex items-center gap-1">
                                  <DollarSign className="w-3 h-3 text-orange-400" />
                                  {Number(r.valor_aluguel).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </p>
                              </div>
                              <div>
                                <p className="text-white/40 text-xs mb-0.5">Repasse</p>
                                <p className="text-emerald-400 font-semibold flex items-center gap-1">
                                  <Send className="w-3 h-3" />
                                  {Number(r.valor_repasse).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </p>
                              </div>
                              {r.valor_taxa != null && (
                                <div>
                                  <p className="text-white/40 text-xs mb-0.5">Taxa admin</p>
                                  <p className="text-orange-400 font-semibold flex items-center gap-1">
                                    <Percent className="w-3 h-3" />
                                    {Number(r.valor_taxa).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                  </p>
                                </div>
                              )}
                              {r.comissao_corretor != null && Number(r.comissao_corretor) > 0 && (
                                <div>
                                  <p className="text-white/40 text-xs mb-0.5">Comissão corretor</p>
                                  <p className="text-blue-400 font-semibold flex items-center gap-1">
                                    <User className="w-3 h-3" />
                                    {Number(r.comissao_corretor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                  </p>
                                </div>
                              )}
                            </div>
                            {/* Error msg */}
                            {r.transfer_error && (
                              <p className="text-red-400/70 text-xs bg-red-500/10 rounded-lg px-3 py-1.5">
                                {r.transfer_error}
                              </p>
                            )}
                            {/* Transfer ID */}
                            {r.asaas_transfer_id && (
                              <p className="text-white/30 text-xs">ID Asaas: {r.asaas_transfer_id}</p>
                            )}
                          </div>
                          {/* Retry button */}
                          {canRetry && (
                            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                              onClick={() => retentarRepasse(r.id)}
                              disabled={loadingRepasses}
                              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-white transition-all"
                              style={{ background: 'linear-gradient(135deg, #0891B2, #0E7490)' }}>
                              {loadingRepasses
                                ? <Loader2 className="w-4 h-4 animate-spin" />
                                : <RotateCcw className="w-4 h-4" />}
                              Retentar
                            </motion.button>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4" style={{ borderTop: `1px solid ${BORDER}` }}>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={fecharModais}
                className="w-full text-white font-medium py-3 px-4 rounded-xl transition-all duration-200"
                style={{ background: 'linear-gradient(135deg, #0891B2, #0E7490)' }}>
                Fechar
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
      {/* ════════════════════════════════════════════
          MODAL: Editar Inquilino
         ════════════════════════════════════════════ */}
      {modalEditar && clienteSelecionado && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-start justify-center z-50 overflow-y-auto py-8 px-4">
          <div className="w-full max-w-3xl">
            <FormInquilino
              isEditing
              clienteId={clienteSelecionado.id}
              initialData={clienteSelecionado}
              onBack={() => setModalEditar(false)}
              onSuccess={async () => {
                setModalEditar(false);
                setClienteSelecionado(null);
                await carregarClientes();
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ClienteAluguel;
