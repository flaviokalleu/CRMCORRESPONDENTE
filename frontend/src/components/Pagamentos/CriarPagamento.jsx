import React, { useState, useEffect, useCallback } from 'react';
import generateStableKey from 'utils/generateStableKey';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import MainLayout from '../../layouts/MainLayout';
import {
  CreditCard, Smartphone, User, Calendar, DollarSign, FileText,
  ArrowLeft, Loader2, CheckCircle, AlertCircle, ExternalLink, Copy,
  List, Mail, Globe, Banknote, Wallet, ArrowRight, Save, Shield, Zap
} from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// ─── Design tokens ────────────────────────────────────────────────────────────
const CARD = 'rgba(255,255,255,0.06)';
const BORDER = 'rgba(255,255,255,0.10)';
const INPUT_BG = 'rgba(255,255,255,0.05)';
const ACCENT_GRADIENT = 'linear-gradient(135deg, #F97316, #EA580C)';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [.22, 1, .36, 1] } },
};
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };

const inputClass = `w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/30 transition-all duration-200
  focus:outline-none focus:ring-2 focus:ring-[#F97316]/60 focus:border-[#F97316]/40`;
const inputStyle = { backgroundColor: INPUT_BG, border: `1px solid ${BORDER}` };
const labelClass = "flex items-center gap-2 text-[11px] font-semibold tracking-wide uppercase text-white/50 mb-1.5";
const selectClass = `${inputClass} cursor-pointer [&>option]:bg-white [&>option]:text-gray-800`;

// ─── Section wrapper ─────────────────────────────────────────────────────────
const FormSection = ({ icon, title, subtitle, children }) => (
  <motion.div variants={fadeUp}
    className="rounded-2xl p-4 sm:p-5 backdrop-blur-md space-y-4"
    style={{ backgroundColor: CARD, border: `1px solid ${BORDER}` }}>
    <div className="flex items-center gap-3 pb-3" style={{ borderBottom: `1px solid ${BORDER}` }}>
      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: ACCENT_GRADIENT }}>
        {icon}
      </div>
      <div>
        <h3 className="text-sm font-bold text-white">{title}</h3>
        {subtitle && <p className="text-[10px] text-white/40 mt-0.5">{subtitle}</p>}
      </div>
    </div>
    {children}
  </motion.div>
);

const CriarPagamento = ({ onBack }) => {
  const navigate = useNavigate();
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingClientes, setLoadingClientes] = useState(true);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);
  const [pagamentoCriado, setPagamentoCriado] = useState(null);

  const [formData, setFormData] = useState({
    cliente_id: '', tipo: 'universal', titulo: '', descricao: '',
    valor: '', data_vencimento: '', observacoes: '', parcelas: 1,
    enviar_whatsapp: false, enviar_email: false
  });

  const [calculoJuros, setCalculoJuros] = useState(null);
  const [calculandoJuros, setCalculandoJuros] = useState(false);

  useEffect(() => {
    fetchClientes();
    const d = new Date(); d.setDate(d.getDate() + 7);
    setFormData(prev => ({ ...prev, data_vencimento: d.toISOString().split('T')[0] }));
  }, []);

  useEffect(() => {
    const fetchConfiguracoes = async () => {
      try {
        const token = localStorage.getItem('authToken');
        await fetch(`${API_URL}/pagamentos/config`, { headers: { 'Authorization': `Bearer ${token}` } });
      } catch (e) { /* silent */ }
    };
    fetchConfiguracoes();
  }, []);

  const fetchClientes = async () => {
    try {
      setLoadingClientes(true);
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_URL}/clientes`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      if (response.ok) { const data = await response.json(); setClientes(data.clientes || []); }
    } catch (e) { setError('Erro ao carregar clientes'); }
    finally { setLoadingClientes(false); }
  };

  const formatarValor = (value) => {
    if (!value) return '';
    const numero = value.toString().replace(/\D/g, '');
    if (!numero) return '';
    return (parseInt(numero, 10) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const converterValorParaEnvio = (valorDigitado) => {
    if (!valorDigitado) return 0;
    const numero = valorDigitado.toString().replace(/\D/g, '');
    if (!numero) return 0;
    return parseInt(numero, 10) / 100;
  };

  const calcularJurosPreview = useCallback(async (valor, parcelas) => {
    if (!valor || !parcelas || parcelas <= 1) { setCalculoJuros(null); return; }
    setCalculandoJuros(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_URL}/pagamentos/calcular-juros`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ valor: converterValorParaEnvio(valor), parcelas: parseInt(parcelas) })
      });
      const data = await response.json();
      if (response.ok) setCalculoJuros(data.calculo);
      else setCalculoJuros(null);
    } catch (e) { setCalculoJuros(null); }
    finally { setCalculandoJuros(false); }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.valor && formData.parcelas > 1) calcularJurosPreview(formData.valor, formData.parcelas);
    }, 500);
    return () => clearTimeout(timer);
  }, [formData.valor, formData.parcelas, calcularJurosPreview]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError(null); setSuccess(null); setPagamentoCriado(null);
    try {
      const token = localStorage.getItem('authToken');
      const endpoint = formData.parcelas > 1 ? '/pagamentos/boleto-parcelado' : '/pagamentos/universal';
      const payload = {
        cliente_id: parseInt(formData.cliente_id), titulo: formData.titulo,
        descricao: formData.descricao, valor: converterValorParaEnvio(formData.valor),
        data_vencimento: formData.data_vencimento, observacoes: formData.observacoes,
        parcelas: formData.parcelas, enviar_whatsapp: formData.enviar_whatsapp,
        enviar_email: formData.enviar_email
      };
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (response.ok) {
        setSuccess(`${formData.parcelas > 1 ? `Pagamento parcelado (${formData.parcelas}x)` : 'Pagamento universal'} criado com sucesso!`);
        setPagamentoCriado(data);
        setFormData({ cliente_id: '', tipo: 'universal', titulo: '', descricao: '', valor: '',
          data_vencimento: new Date().toISOString().split('T')[0], observacoes: '', parcelas: 1,
          enviar_whatsapp: false, enviar_email: false });
      } else { setError(data.error || 'Erro ao criar pagamento'); }
    } catch (e) { setError('Erro de conexão. Tente novamente.'); }
    finally { setLoading(false); }
  };

  const copiarLink = (link) => { navigator.clipboard.writeText(link); alert('Link copiado!'); };
  const abrirPagamento = (link) => window.open(link, '_blank');
  const handleVoltar = () => onBack ? onBack() : navigate('/pagamentos/lista');

  return (
    <MainLayout>
      <div className="min-h-screen bg-caixa-gradient">
        <div className="max-w-6xl mx-auto px-4 py-6 sm:px-6">

          {/* ── Header ── */}
          <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}
            className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={handleVoltar}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-white/60 hover:text-white transition-colors"
                style={{ backgroundColor: CARD, border: `1px solid ${BORDER}` }}>
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: ACCENT_GRADIENT }}>
                <Globe className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">Criar Pagamento Universal</h1>
                <p className="text-[11px] text-white/40">PIX, Cartão, Boleto - todos os métodos em um link</p>
              </div>
            </div>
            <Link to="/pagamentos/lista"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold text-white/60 hover:text-white transition-colors"
              style={{ backgroundColor: CARD, border: `1px solid ${BORDER}` }}>
              <List className="w-3.5 h-3.5" /> Ver Lista
            </Link>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

            {/* ── Formulário (3 cols) ── */}
            <div className="lg:col-span-3">
              <form onSubmit={handleSubmit}>
                <motion.div className="space-y-4" initial="hidden" animate="show" variants={stagger}>

                  {/* ═══ TIPO ═══ */}
                  <FormSection icon={<Globe className="w-4 h-4 text-white" />} title="Tipo de Pagamento"
                    subtitle="Link universal que aceita todos os métodos">
                    <div className="rounded-xl p-4" style={{ backgroundColor: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)' }}>
                      <div className="flex items-center gap-3 mb-2">
                        <Globe className="w-5 h-5" style={{ color: '#F97316' }} />
                        <span className="text-sm font-bold text-white">Pagamento Universal</span>
                      </div>
                      <p className="text-[10px] text-white/40 mb-3">O cliente escolhe como pagar</p>
                      <div className="grid grid-cols-4 gap-2">
                        {[
                          { icon: Smartphone, label: 'PIX' },
                          { icon: CreditCard, label: 'Cartão' },
                          { icon: Banknote, label: 'Boleto' },
                          { icon: Wallet, label: 'Saldo MP' },
                        ].map(({ icon: I, label }) => (
                          <div key={label} className="flex items-center gap-1.5 text-[10px] text-white/50">
                            <I className="w-3 h-3" />{label}
                          </div>
                        ))}
                      </div>
                    </div>
                  </FormSection>

                  {/* ═══ CLIENTE & TÍTULO ═══ */}
                  <FormSection icon={<User className="w-4 h-4 text-white" />} title="Dados do Pagamento"
                    subtitle="Cliente, título e descrição">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="sm:col-span-2">
                        <label className={labelClass}><User className="w-3 h-3" />Cliente *</label>
                        <select value={formData.cliente_id}
                          onChange={(e) => setFormData(prev => ({ ...prev, cliente_id: e.target.value }))}
                          className={selectClass} style={inputStyle} required disabled={loadingClientes}>
                          <option value="">{loadingClientes ? 'Carregando...' : 'Selecione um cliente'}</option>
                          {clientes.map(c => (
                            <option key={c.id} value={c.id}>{c.nome} - {c.cpf}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className={labelClass}><FileText className="w-3 h-3" />Título *</label>
                        <input type="text" value={formData.titulo}
                          onChange={(e) => setFormData(prev => ({ ...prev, titulo: e.target.value }))}
                          className={inputClass} style={inputStyle} placeholder="Ex: Consultoria Imobiliária" required />
                      </div>
                      <div>
                        <label className={labelClass}><DollarSign className="w-3 h-3" />Valor *</label>
                        <input type="text" value={formatarValor(formData.valor)}
                          onChange={(e) => setFormData(prev => ({ ...prev, valor: e.target.value.replace(/\D/g, '') }))}
                          className={inputClass} style={inputStyle} placeholder="0,00" required />
                        <p className="text-[9px] text-white/25 mt-1">Digite apenas números</p>
                      </div>
                    </div>
                    <div>
                      <label className={labelClass}><FileText className="w-3 h-3" />Descrição</label>
                      <textarea value={formData.descricao}
                        onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                        className={`${inputClass} resize-y min-h-[60px]`} style={inputStyle}
                        placeholder="Descrição do serviço ou produto" rows="2" />
                    </div>
                  </FormSection>

                  {/* ═══ PARCELAS & VENCIMENTO ═══ */}
                  <FormSection icon={<CreditCard className="w-4 h-4 text-white" />} title="Parcelamento & Vencimento"
                    subtitle="Defina parcelas e data de vencimento">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className={labelClass}><CreditCard className="w-3 h-3" />Parcelas</label>
                        <select value={formData.parcelas}
                          onChange={(e) => setFormData(prev => ({ ...prev, parcelas: parseInt(e.target.value) }))}
                          className={selectClass} style={inputStyle}>
                          <option value={1}>À vista</option>
                          {[2,3,4,5,6,7,8,9,10,11,12].map(n => (
                            <option key={n} value={n}>{n}x - Parcelas automáticas</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className={labelClass}><Calendar className="w-3 h-3" />Vencimento</label>
                        <input type="date" value={formData.data_vencimento}
                          onChange={(e) => setFormData(prev => ({ ...prev, data_vencimento: e.target.value }))}
                          className={inputClass} style={inputStyle} />
                        <p className="text-[9px] text-white/25 mt-1">Opcional para PIX e cartão</p>
                      </div>
                    </div>

                    {/* Preview juros */}
                    {calculandoJuros && (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ backgroundColor: 'rgba(59,130,246,0.1)' }}>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
                        <span className="text-[11px] text-blue-400">Calculando juros...</span>
                      </div>
                    )}

                    {calculoJuros && formData.parcelas > 1 && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="rounded-xl p-4 space-y-2" style={{ backgroundColor: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)' }}>
                        <p className="text-[11px] font-bold text-white flex items-center gap-1.5">
                          <DollarSign className="w-3.5 h-3.5" style={{ color: '#F97316' }} />Simulação
                        </p>
                        <div className="space-y-1 text-[11px]">
                          <div className="flex justify-between"><span className="text-white/50">Original:</span><span className="text-white">R$ {calculoJuros.valor_original.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span></div>
                          <div className="flex justify-between"><span className="text-white/50">Juros ({calculoJuros.juros_percentual}%):</span><span style={{ color: '#F97316' }}>+ R$ {calculoJuros.juros_total.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span></div>
                          <div className="flex justify-between font-bold pt-1" style={{ borderTop: '1px solid rgba(249,115,22,0.2)' }}><span className="text-white">Total:</span><span className="text-white">R$ {calculoJuros.valor_com_juros.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span></div>
                          <div className="flex justify-between font-bold" style={{ color: '#F97316' }}><span>{calculoJuros.parcelas}x de:</span><span>R$ {calculoJuros.valor_parcela.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span></div>
                        </div>
                        <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-md mt-1" style={{ backgroundColor: 'rgba(59,130,246,0.1)' }}>
                          <Zap className="w-3 h-3 text-blue-400" />
                          <span className="text-[9px] text-blue-400">Parcelas enviadas automaticamente</span>
                        </div>
                      </motion.div>
                    )}
                  </FormSection>

                  {/* ═══ OBSERVAÇÕES & ENVIO ═══ */}
                  <FormSection icon={<Mail className="w-4 h-4 text-white" />} title="Observações & Envio"
                    subtitle="Notas adicionais e canais de notificação">
                    <div>
                      <label className={labelClass}><FileText className="w-3 h-3" />Observações</label>
                      <textarea value={formData.observacoes}
                        onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
                        className={`${inputClass} resize-y min-h-[60px]`} style={inputStyle}
                        placeholder="Observações adicionais" rows="2" />
                    </div>
                    <div className="space-y-2.5">
                      <p className={labelClass}><Shield className="w-3 h-3" />Opções de envio</p>
                      {[
                        { id: 'enviar_whatsapp', label: 'Enviar por WhatsApp', icon: Smartphone, color: '#22c55e', field: 'enviar_whatsapp' },
                        { id: 'enviar_email', label: 'Enviar por Email', icon: Mail, color: '#3b82f6', field: 'enviar_email' },
                      ].map(opt => (
                        <label key={opt.id} className="flex items-center gap-3 cursor-pointer group">
                          <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-all ${formData[opt.field] ? '' : ''}`}
                            style={formData[opt.field] ? { background: ACCENT_GRADIENT } : { backgroundColor: INPUT_BG, border: `1px solid ${BORDER}` }}>
                            {formData[opt.field] && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                          </div>
                          <input type="checkbox" checked={formData[opt.field]}
                            onChange={(e) => setFormData(prev => ({ ...prev, [opt.field]: e.target.checked }))} className="hidden" />
                          <opt.icon className="w-3.5 h-3.5" style={{ color: opt.color }} />
                          <span className="text-xs text-white/60 group-hover:text-white/80 transition-colors">{opt.label}</span>
                        </label>
                      ))}
                      <p className="text-[9px] text-white/25">O link será enviado pelos canais selecionados</p>
                    </div>
                  </FormSection>

                  {/* ═══ BOTÃO ═══ */}
                  <motion.div variants={fadeUp}>
                    <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                      type="submit" disabled={loading || loadingClientes}
                      className={`w-full py-4 rounded-xl text-sm text-white font-bold flex items-center justify-center gap-2
                        shadow-lg shadow-[#F97316]/20 transition-all duration-200 ${loading ? 'opacity-60 cursor-not-allowed' : 'hover:shadow-xl hover:shadow-[#F97316]/30'}`}
                      style={{ background: ACCENT_GRADIENT }}>
                      {loading ? (
                        <><Loader2 className="w-4 h-4 animate-spin" />Criando...</>
                      ) : (
                        <><Globe className="w-4 h-4" />Criar Pagamento{formData.parcelas > 1 ? ` (${formData.parcelas}x)` : ''}<ArrowRight className="w-3.5 h-3.5 ml-1" /></>
                      )}
                    </motion.button>
                  </motion.div>

                </motion.div>
              </form>
            </div>

            {/* ── Resultado (2 cols) ── */}
            <div className="lg:col-span-2">
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                className="rounded-2xl p-4 sm:p-5 backdrop-blur-md sticky top-6"
                style={{ backgroundColor: CARD, border: `1px solid ${BORDER}` }}>
                <div className="flex items-center gap-2 pb-3 mb-4" style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: ACCENT_GRADIENT }}>
                    <CheckCircle className="w-3.5 h-3.5 text-white" />
                  </div>
                  <p className="text-sm font-bold text-white">Resultado</p>
                </div>

                {/* Simulação juros grande */}
                {calculoJuros && formData.parcelas > 1 && !loading && !pagamentoCriado && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-4 space-y-3">
                    <div className="rounded-xl p-4" style={{ backgroundColor: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)' }}>
                      <p className="text-xs font-bold text-white mb-3 flex items-center gap-1.5">
                        <DollarSign className="w-3.5 h-3.5" style={{ color: '#F97316' }} />Simulação de Parcelamento
                      </p>
                      <div className="grid grid-cols-2 gap-3 text-[11px]">
                        <div><p className="text-white/40">Original</p><p className="text-white font-bold text-base">R$ {calculoJuros.valor_original.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p></div>
                        <div><p className="text-white/40">Total c/ Juros</p><p className="font-bold text-base" style={{ color: '#F97316' }}>R$ {calculoJuros.valor_com_juros.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p></div>
                        <div><p className="text-white/40">Juros</p><p className="font-semibold" style={{ color: '#F97316' }}>R$ {calculoJuros.juros_total.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p></div>
                        <div><p className="text-white/40">Taxa</p><p className="font-semibold" style={{ color: '#F97316' }}>{calculoJuros.juros_percentual}%</p></div>
                      </div>
                      <div className="mt-3 pt-3 text-center" style={{ borderTop: '1px solid rgba(249,115,22,0.2)' }}>
                        <p className="text-[10px] text-white/40">Valor de cada parcela</p>
                        <p className="text-lg font-bold text-white">{calculoJuros.parcelas}x de R$ {calculoJuros.valor_parcela.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Loading */}
                {loading && (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <Loader2 className="animate-spin w-8 h-8 mx-auto mb-3" style={{ color: '#F97316' }} />
                      <p className="text-xs text-white/50">Criando pagamento...</p>
                    </div>
                  </div>
                )}

                {/* Erro */}
                {error && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="flex items-center gap-3 p-3 rounded-xl mb-4"
                    style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}>
                    <AlertCircle className="w-4 h-4 flex-shrink-0" style={{ color: '#ef4444' }} />
                    <span className="text-xs text-red-400">{error}</span>
                  </motion.div>
                )}

                {/* Sucesso */}
                {success && pagamentoCriado && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                    <div className="flex items-center gap-2 p-3 rounded-xl"
                      style={{ backgroundColor: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)' }}>
                      <CheckCircle className="w-4 h-4" style={{ color: '#10b981' }} />
                      <span className="text-xs font-medium" style={{ color: '#10b981' }}>{success}</span>
                    </div>

                    <div className="rounded-xl p-3 space-y-2" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: `1px solid ${BORDER}` }}>
                      <p className="text-[11px] font-bold text-white flex items-center gap-1.5"><Globe className="w-3 h-3" style={{ color: '#F97316' }} />Detalhes</p>
                      <div className="space-y-1.5 text-[11px]">
                        <div className="flex justify-between"><span className="text-white/40">ID:</span><span className="text-white font-mono">#{pagamentoCriado.pagamento_principal?.id || pagamentoCriado.pagamento?.id}</span></div>
                        <div className="flex justify-between"><span className="text-white/40">Métodos:</span><span className="text-white">PIX, Cartão, Boleto</span></div>
                        <div className="flex justify-between"><span className="text-white/40">Valor:</span><span className="text-white">R$ {pagamentoCriado.pagamento_principal?.valor || pagamentoCriado.pagamento?.valor}</span></div>
                      </div>
                    </div>

                    {(pagamentoCriado.pagamento_principal?.link_pagamento || pagamentoCriado.pagamento?.link_pagamento) && (
                      <div className="rounded-xl p-3 space-y-2" style={{ backgroundColor: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)' }}>
                        <p className="text-[11px] font-bold text-white">Link de Pagamento</p>
                        <div className="flex gap-2">
                          <button onClick={() => copiarLink(pagamentoCriado.pagamento_principal?.link_pagamento || pagamentoCriado.pagamento?.link_pagamento)}
                            className="flex-1 py-2 rounded-lg text-[11px] font-semibold text-white/70 flex items-center justify-center gap-1.5 hover:text-white transition-colors"
                            style={{ backgroundColor: INPUT_BG, border: `1px solid ${BORDER}` }}>
                            <Copy className="w-3 h-3" /> Copiar
                          </button>
                          <button onClick={() => abrirPagamento(pagamentoCriado.pagamento_principal?.link_pagamento || pagamentoCriado.pagamento?.link_pagamento)}
                            className="flex-1 py-2 rounded-lg text-[11px] font-bold text-white flex items-center justify-center gap-1.5"
                            style={{ background: ACCENT_GRADIENT }}>
                            <ExternalLink className="w-3 h-3" /> Abrir
                          </button>
                        </div>
                      </div>
                    )}

                    {formData.parcelas > 1 && pagamentoCriado.proximas_parcelas && (
                      <div className="rounded-xl p-3 space-y-2" style={{ backgroundColor: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)' }}>
                        <p className="text-[11px] font-bold text-white flex items-center gap-1.5"><Calendar className="w-3 h-3 text-blue-400" />Parcelas Automáticas</p>
                        <div className="space-y-1 text-[10px]">
                          {pagamentoCriado.proximas_parcelas.slice(0, 3).map((p, i) => (
                            <div key={generateStableKey(p, i)} className="flex justify-between text-white/50">
                              <span>Parcela {p.parcela}:</span>
                              <span>{new Date(p.data_envio).toLocaleDateString('pt-BR')}</span>
                            </div>
                          ))}
                          {pagamentoCriado.proximas_parcelas.length > 3 && (
                            <p className="text-center text-white/30">+ {pagamentoCriado.proximas_parcelas.length - 3} parcelas</p>
                          )}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Estado inicial */}
                {!loading && !error && !success && !calculoJuros && (
                  <div className="flex items-center justify-center py-10">
                    <div className="text-center">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3"
                        style={{ backgroundColor: 'rgba(249,115,22,0.1)' }}>
                        <Globe className="w-5 h-5" style={{ color: '#F97316' }} />
                      </div>
                      <p className="text-xs text-white/40">Preencha o formulário</p>
                      <p className="text-[10px] text-white/25 mt-1">O resultado aparecerá aqui</p>
                    </div>
                  </div>
                )}
              </motion.div>
            </div>

          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default CriarPagamento;
