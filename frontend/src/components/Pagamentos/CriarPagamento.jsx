import React, { useState, useEffect, useCallback } from 'react';
import generateStableKey from 'utils/generateStableKey';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import MainLayout from '../../layouts/MainLayout';
import {
  CreditCard,
  Smartphone,
  User,
  Calendar,
  DollarSign,
  FileText,
  ArrowLeft,
  Loader2,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Copy,
  List,
  Mail,
  Globe,
  Banknote,
  Wallet
} from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const CriarPagamento = ({ onBack }) => {
  const navigate = useNavigate();
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingClientes, setLoadingClientes] = useState(true);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);
  const [pagamentoCriado, setPagamentoCriado] = useState(null);
  
  const [formData, setFormData] = useState({
    cliente_id: '',
    tipo: 'universal', // ✅ NOVO TIPO UNIVERSAL
    titulo: '',
    descricao: '',
    valor: '',
    data_vencimento: '',
    observacoes: '',
    parcelas: 1,
    enviar_whatsapp: false,
    enviar_email: false
  });

  const [calculoJuros, setCalculoJuros] = useState(null);
  const [calculandoJuros, setCalculandoJuros] = useState(false);

  useEffect(() => {
    fetchClientes();
    // Data padrão para vencimento (7 dias)
    const dataVencimento = new Date();
    dataVencimento.setDate(dataVencimento.getDate() + 7);
    setFormData(prev => ({
      ...prev,
      data_vencimento: dataVencimento.toISOString().split('T')[0]
    }));
  }, []);

  // ✅ BUSCAR CONFIGURAÇÕES DO SISTEMA
  useEffect(() => {
    const fetchConfiguracoes = async () => {
      try {
        const token = localStorage.getItem('authToken');
        const response = await fetch(`${API_URL}/pagamentos/config`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const config = await response.json();
          console.log('⚙️ Configurações do sistema:', config);
          
          // setMaxParcelas(config.max_parcelas);
          // setEmpresaNome(config.empresa_nome);
        }
      } catch (error) {
        console.error('Erro ao buscar configurações:', error);
      }
    };

    fetchConfiguracoes();
  }, []);

  const fetchClientes = async () => {
    try {
      setLoadingClientes(true);
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_URL}/clientes`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setClientes(data.clientes || []);
      }
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
      setError('Erro ao carregar clientes');
    } finally {
      setLoadingClientes(false);
    }
  };

  // ✅ FUNÇÃO CORRIGIDA PARA FORMATAÇÃO DA RENDA
  const formatarValor = (value) => {
    if (!value) return '';
    
    // Remove tudo que não é número
    const numero = value.toString().replace(/\D/g, '');
    
    if (!numero) return '';
    
    // Converte para formato de centavos
    const valorEmCentavos = parseInt(numero, 10);
    
    // Converte para formato decimal
    const valorDecimal = valorEmCentavos / 100;
    
    // Formata para o padrão brasileiro
    return valorDecimal.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  // ✅ FUNÇÃO CORRIGIDA PARA CONVERTER VALOR PARA ENVIO
  const converterValorParaEnvio = (valorDigitado) => {
    if (!valorDigitado) return 0;
    
    console.log('💰 Convertendo valor:', {
      valorDigitado,
      tipo: typeof valorDigitado
    });
    
    const numero = valorDigitado.toString().replace(/\D/g, '');
    
    if (!numero) return 0;
    
    const valorEmCentavos = parseInt(numero, 10);
    const valorFinal = valorEmCentavos / 100;
    
    console.log('💰 Conversão:', {
      entrada: valorDigitado,
      numeroLimpo: numero,
      valorEmCentavos,
      valorFinal
    });
    
    return valorFinal;
  };

  // ✅ FUNÇÃO PARA CALCULAR JUROS EM TEMPO REAL
  const calcularJurosPreview = useCallback(async (valor, parcelas) => {
    if (!valor || !parcelas || parcelas <= 1) {
      setCalculoJuros(null);
      return;
    }

    setCalculandoJuros(true);
    try {
      const token = localStorage.getItem('authToken');
      const valorConvertido = converterValorParaEnvio(valor);
      
      const response = await fetch(`${API_URL}/pagamentos/calcular-juros`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          valor: valorConvertido,
          parcelas: parseInt(parcelas)
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        setCalculoJuros(data.calculo);
      } else {
        console.error('Erro ao calcular juros:', data.error);
        setCalculoJuros(null);
      }
    } catch (error) {
      console.error('Erro ao calcular juros:', error);
      setCalculoJuros(null);
    } finally {
      setCalculandoJuros(false);
    }
  }, []);

  // ✅ EFFECT PARA CALCULAR JUROS AUTOMATICAMENTE
  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.valor && formData.parcelas && formData.parcelas > 1) {
        calcularJurosPreview(formData.valor, formData.parcelas);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [formData.valor, formData.parcelas, calcularJurosPreview]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    setPagamentoCriado(null);

    try {
      const token = localStorage.getItem('authToken');
      
      // ✅ USAR NOVA ROTA UNIVERSAL
      const endpoint = formData.parcelas > 1 ? 
        '/pagamentos/boleto-parcelado' : 
        '/pagamentos/universal';
      
      const valorConvertido = converterValorParaEnvio(formData.valor);
      
      const payload = {
        cliente_id: parseInt(formData.cliente_id),
        titulo: formData.titulo,
        descricao: formData.descricao,
        valor: valorConvertido,
        data_vencimento: formData.data_vencimento,
        observacoes: formData.observacoes,
        parcelas: formData.parcelas,
        enviar_whatsapp: formData.enviar_whatsapp,
        enviar_email: formData.enviar_email
      };

      console.log('📤 Enviando pagamento universal:', payload);

      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok) {
        const tipoMensagem = formData.parcelas > 1 ? 
          `Pagamento parcelado criado (${formData.parcelas}x)` : 
          'Pagamento universal criado';
          
        setSuccess(`${tipoMensagem} com sucesso!`);
        setPagamentoCriado(data);
        
        // Reset form
        setFormData({
          cliente_id: '',
          tipo: 'universal',
          titulo: '',
          descricao: '',
          valor: '',
          data_vencimento: new Date().toISOString().split('T')[0],
          observacoes: '',
          parcelas: 1,
          enviar_whatsapp: false,
          enviar_email: false
        });
      } else {
        setError(data.error || 'Erro ao criar pagamento');
      }

    } catch (error) {
      console.error('Erro ao criar pagamento:', error);
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const copiarLink = (link) => {
    navigator.clipboard.writeText(link);
    alert('Link copiado para a área de transferência!');
  };

  const abrirPagamento = (link) => {
    window.open(link, '_blank');
  };

  const handleVoltar = () => {
    if (onBack) {
      onBack();
    } else {
      navigate('/pagamentos/lista');
    }
  };

  return (
    <MainLayout>
      <div className="min-h-screen bg-caixa-gradient p-4">
        <div className="max-w-4xl mx-auto">
          
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between mb-8"
          >
            <div className="flex items-center gap-4">
              <button
                onClick={handleVoltar}
                className="p-3 bg-white/10 rounded-xl text-white hover:bg-white/20 transition-colors"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-white">Criar Pagamento Universal</h1>
                <p className="text-caixa-extra-light">
                  Gere links que aceitam PIX, Cartão, Boleto e todos os métodos
                </p>
              </div>
            </div>
            
            <Link
              to="/pagamentos/lista"
              className="px-4 py-2 bg-caixa-primary/30 hover:bg-caixa-primary/50 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <List size={16} />
              Ver Lista
            </Link>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Formulário */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="backdrop-blur-xl bg-white/10 rounded-2xl p-8 border border-caixa-primary/30"
            >
              <form onSubmit={handleSubmit} className="space-y-6">
                
                {/* ✅ NOVO TIPO DE PAGAMENTO UNIVERSAL */}
                <div>
                  <label className="block text-white font-semibold mb-4">Tipo de Pagamento</label>
                  <div className="grid grid-cols-1 gap-4">
                    <div
                      className="p-6 rounded-xl border-2 border-caixa-orange bg-caixa-orange/20 text-white"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <Globe size={24} className="text-caixa-orange" />
                        <span className="font-bold text-lg">Pagamento Universal</span>
                      </div>
                      <p className="text-sm text-caixa-extra-light mb-4">
                        Link que aceita TODOS os tipos de pagamento
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center gap-1">
                          <Smartphone size={12} />
                          <span>PIX</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <CreditCard size={12} />
                          <span>Cartão</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Banknote size={12} />
                          <span>Boleto</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Wallet size={12} />
                          <span>Saldo MP</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Cliente */}
                <div>
                  <label className="flex items-center gap-2 text-white font-semibold mb-2">
                    <User size={16} />
                    Cliente *
                  </label>
                  <select
                    value={formData.cliente_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, cliente_id: e.target.value }))}
                    className="w-full px-4 py-3 bg-white/10 border border-caixa-primary/30 rounded-xl text-white focus:ring-2 focus:ring-caixa-orange focus:border-caixa-orange"
                    required
                    disabled={loadingClientes}
                  >
                    <option value="">
                      {loadingClientes ? 'Carregando clientes...' : 'Selecione um cliente'}
                    </option>
                    {clientes.map(cliente => (
                      <option key={cliente.id} value={cliente.id} className="bg-caixa-primary text-white">
                        {cliente.nome} - {cliente.cpf}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Título */}
                <div>
                  <label className="flex items-center gap-2 text-white font-semibold mb-2">
                    <FileText size={16} />
                    Título *
                  </label>
                  <input
                    type="text"
                    value={formData.titulo}
                    onChange={(e) => setFormData(prev => ({ ...prev, titulo: e.target.value }))}
                    className="w-full px-4 py-3 bg-white/10 border border-caixa-primary/30 rounded-xl text-white placeholder-caixa-extra-light focus:ring-2 focus:ring-caixa-orange focus:border-caixa-orange"
                    placeholder="Ex: Serviço de Consultoria"
                    required
                  />
                </div>

                {/* Descrição */}
                <div>
                  <label className="text-white font-semibold mb-2 block">Descrição</label>
                  <textarea
                    value={formData.descricao}
                    onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
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
                    value={formatarValor(formData.valor)}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, "");
                      setFormData(prev => ({ ...prev, valor: value }));
                    }}
                    className="w-full px-4 py-3 bg-white/10 border border-caixa-primary/30 rounded-xl text-white placeholder-caixa-extra-light focus:ring-2 focus:ring-caixa-orange focus:border-caixa-orange"
                    placeholder="0,00"
                    required
                  />
                  <small className="text-caixa-extra-light text-xs">
                    Digite apenas números. Ex: para R$ 200,00 digite "20000"
                  </small>
                </div>

                {/* ✅ NÚMERO DE PARCELAS COM PREVIEW DE JUROS */}
                <div>
                  <label className="flex items-center gap-2 text-white font-semibold mb-2">
                    <CreditCard size={16} />
                    Número de Parcelas
                  </label>
                  <select
                    value={formData.parcelas}
                    onChange={(e) => setFormData(prev => ({ ...prev, parcelas: parseInt(e.target.value) }))
                    }
                    className="w-full px-4 py-3 bg-white/10 border border-caixa-primary/30 rounded-xl text-white focus:ring-2 focus:ring-caixa-orange focus:border-caixa-orange"
                  >
                    <option value={1} className="bg-caixa-primary">À vista (aceita todos os métodos)</option>
                    {[2,3,4,5,6,7,8,9,10,11,12].map(num => (
                      <option key={num} value={num} className="bg-caixa-primary">
                        {num}x - Sistema de parcelas automático
                      </option>
                    ))}
                  </select>
                  
                  {/* ✅ PREVIEW DO CÁLCULO DE JUROS */}
                  {calculandoJuros && (
                    <div className="mt-3 p-3 bg-blue-500/20 rounded-lg">
                      <div className="flex items-center gap-2 text-blue-400">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm">Calculando juros...</span>
                      </div>
                    </div>
                  )}
                  
                  {calculoJuros && formData.parcelas > 1 && (
                    <div className="mt-3 p-4 bg-caixa-orange/20 rounded-lg border border-caixa-orange/30">
                      <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
                        <DollarSign className="w-4 h-4" />
                        Simulação de Parcelamento
                      </h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between text-caixa-extra-light">
                          <span>Valor original:</span>
                          <span className="text-white">R$ {calculoJuros.valor_original.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                        </div>
                        <div className="flex justify-between text-caixa-extra-light">
                          <span>Juros estimado ({calculoJuros.juros_percentual}%):</span>
                          <span className="text-orange-400">+ R$ {calculoJuros.juros_total.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                        </div>
                        <div className="flex justify-between font-semibold text-white border-t border-caixa-orange/30 pt-1">
                          <span>Total com juros:</span>
                          <span>R$ {calculoJuros.valor_com_juros.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                        </div>
                        <div className="flex justify-between font-semibold text-caixa-orange">
                          <span>{calculoJuros.parcelas}x de:</span>
                          <span>R$ {calculoJuros.valor_parcela.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                        </div>
                      </div>
                      <div className="mt-3 p-2 bg-blue-500/20 rounded text-xs text-blue-400">
                        ℹ️ Sistema enviará cada parcela automaticamente na data correta
                      </div>
                    </div>
                  )}
                </div>

                {/* Data de Vencimento */}
                <div>
                  <label className="flex items-center gap-2 text-white font-semibold mb-2">
                    <Calendar size={16} />
                    Data de Vencimento
                  </label>
                  <input
                    type="date"
                    value={formData.data_vencimento}
                    onChange={(e) => setFormData(prev => ({ ...prev, data_vencimento: e.target.value }))}
                    className="w-full px-4 py-3 bg-white/10 border border-caixa-primary/30 rounded-xl text-white focus:ring-2 focus:ring-caixa-orange focus:border-caixa-orange"
                  />
                  <small className="text-caixa-extra-light text-xs">
                    Para PIX e cartão é opcional. Boleto usará esta data.
                  </small>
                </div>

                {/* Observações */}
                <div>
                  <label className="text-white font-semibold mb-2 block">Observações</label>
                  <textarea
                    value={formData.observacoes}
                    onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
                    className="w-full px-4 py-3 bg-white/10 border border-caixa-primary/30 rounded-xl text-white placeholder-caixa-extra-light focus:ring-2 focus:ring-caixa-orange focus:border-caixa-orange"
                    placeholder="Observações adicionais"
                    rows="3"
                  />
                </div>

                {/* ✅ OPÇÕES DE ENVIO */}
                <div>
                  <label className="text-white font-semibold mb-4 block">Opções de Envio</label>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="enviar_whatsapp"
                        checked={formData.enviar_whatsapp}
                        onChange={(e) => setFormData(prev => ({ ...prev, enviar_whatsapp: e.target.checked }))}
                        className="w-4 h-4 text-caixa-orange bg-white/10 border-caixa-primary/30 rounded focus:ring-caixa-orange focus:ring-2"
                      />
                      <label htmlFor="enviar_whatsapp" className="text-white flex items-center gap-2 cursor-pointer">
                        <Smartphone size={16} className="text-green-400" />
                        Enviar por WhatsApp
                      </label>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="enviar_email"
                        checked={formData.enviar_email}
                        onChange={(e) => setFormData(prev => ({ ...prev, enviar_email: e.target.checked }))}
                        className="w-4 h-4 text-caixa-orange bg-white/10 border-caixa-primary/30 rounded focus:ring-caixa-orange focus:ring-2"
                      />
                      <label htmlFor="enviar_email" className="text-white flex items-center gap-2 cursor-pointer">
                        <Mail size={16} className="text-blue-400" />
                        Enviar por Email
                      </label>
                    </div>
                  </div>
                  <small className="text-caixa-extra-light text-xs mt-2 block">
                    O link universal será enviado automaticamente pelos canais selecionados
                  </small>
                </div>

                {/* Botão Submit */}
                <button
                  type="submit"
                  disabled={loading || loadingClientes}
                  className="w-full py-4 bg-gradient-to-r from-caixa-orange to-caixa-red hover:from-caixa-red hover:to-caixa-orange text-white font-bold rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      Criando Pagamento Universal...
                    </>
                  ) : (
                    <>
                      <Globe size={20} />
                      Criar Pagamento Universal
                      {formData.parcelas > 1 ? ` (${formData.parcelas}x)` : ''}
                    </>
                  )}
                </button>
              </form>
            </motion.div>

            {/* Resultado */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="backdrop-blur-xl bg-white/10 rounded-2xl p-8 border border-caixa-primary/30"
            >
              <h3 className="text-xl font-bold text-white mb-6">Resultado</h3>

              {/* ✅ MOSTRAR INFORMAÇÕES DO CÁLCULO DE JUROS */}
              {calculoJuros && formData.parcelas > 1 && !loading && !pagamentoCriado && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mb-6"
                >
                  <div className="bg-gradient-to-r from-caixa-orange/20 to-caixa-red/20 rounded-xl p-6 border border-caixa-orange/30">
                    <h4 className="text-white font-bold mb-4 flex items-center gap-2">
                      <DollarSign className="w-5 h-5" />
                      Simulação de Parcelamento
                    </h4>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="space-y-2">
                        <div className="text-caixa-extra-light">Valor Original</div>
                        <div className="text-white font-bold text-lg">
                          R$ {calculoJuros.valor_original.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="text-caixa-extra-light">Total c/ Juros</div>
                        <div className="text-caixa-orange font-bold text-lg">
                          R$ {calculoJuros.valor_com_juros.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="text-caixa-extra-light">Juros Total</div>
                        <div className="text-orange-400 font-semibold">
                          R$ {calculoJuros.juros_total.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="text-caixa-extra-light">Taxa</div>
                        <div className="text-orange-400 font-semibold">
                          {calculoJuros.juros_percentual}%
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-caixa-orange/30">
                      <div className="text-center">
                        <div className="text-caixa-extra-light text-sm">Valor de cada parcela</div>
                        <div className="text-white font-bold text-2xl">
                          {calculoJuros.parcelas}x de R$ {calculoJuros.valor_parcela.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-4 p-3 bg-blue-500/20 rounded-lg">
                      <div className="text-xs text-blue-400">
                        🤖 Sistema enviará automaticamente cada parcela na data correta
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Estados */}
              {loading && (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <Loader2 className="animate-spin h-12 w-12 text-caixa-orange mx-auto mb-4" />
                    <p className="text-white">Criando pagamento universal...</p>
                  </div>
                </div>
              )}

              {error && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-red-500/20 border border-red-500/30 rounded-xl p-4 mb-6"
                >
                  <div className="flex items-center gap-2 text-red-400">
                    <AlertCircle size={16} />
                    <span className="font-semibold">Erro</span>
                  </div>
                  <p className="text-white mt-2">{error}</p>
                </motion.div>
              )}

              {success && pagamentoCriado && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-4"
                >
                  {/* Success Message */}
                  <div className="bg-green-500/20 border border-green-500/30 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-green-400">
                      <CheckCircle size={16} />
                      <span className="font-semibold">Sucesso!</span>
                    </div>
                    <p className="text-white mt-2">{success}</p>
                  </div>

                  {/* ✅ INFORMAÇÕES DO PAGAMENTO UNIVERSAL */}
                  <div className="bg-caixa-primary/20 rounded-xl p-4 space-y-3">
                    <h4 className="font-semibold text-white flex items-center gap-2">
                      <Globe className="w-4 h-4" />
                      Pagamento Universal Criado
                    </h4>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-caixa-extra-light">ID:</span>
                        <span className="text-white font-mono">#{pagamentoCriado.pagamento_principal?.id || pagamentoCriado.pagamento?.id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-caixa-extra-light">Tipos aceitos:</span>
                        <span className="text-white">PIX, Cartão, Boleto, etc.</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-caixa-extra-light">Valor:</span>
                        <span className="text-white">R$ {pagamentoCriado.pagamento_principal?.valor || pagamentoCriado.pagamento?.valor}</span>
                      </div>
                      {formData.parcelas > 1 && (
                        <div className="flex justify-between">
                          <span className="text-caixa-extra-light">Parcelas:</span>
                          <span className="text-caixa-orange">{formData.parcelas}x de R$ {pagamentoCriado.calculo_juros?.valor_parcela.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ✅ LINK UNIVERSAL */}
                  {(pagamentoCriado.pagamento_principal?.link_pagamento || pagamentoCriado.pagamento?.link_pagamento) && (
                    <div className="bg-caixa-orange/20 rounded-xl p-4 space-y-3">
                      <h4 className="font-semibold text-white">🌐 Link Universal de Pagamento</h4>
                      <p className="text-xs text-caixa-extra-light">
                        O cliente poderá escolher qualquer forma de pagamento neste link
                      </p>
                      
                      <div className="flex gap-2">
                        <button
                          onClick={() => copiarLink(pagamentoCriado.pagamento_principal?.link_pagamento || pagamentoCriado.pagamento?.link_pagamento)}
                          className="flex-1 py-2 px-4 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                          <Copy size={16} />
                          Copiar Link
                        </button>
                        <button
                          onClick={() => abrirPagamento(pagamentoCriado.pagamento_principal?.link_pagamento || pagamentoCriado.pagamento?.link_pagamento)}
                          className="flex-1 py-2 px-4 bg-caixa-orange hover:bg-caixa-orange-dark text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                          <ExternalLink size={16} />
                          Abrir
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ✅ INFORMAÇÕES DE PARCELAS */}
                  {formData.parcelas > 1 && pagamentoCriado.proximas_parcelas && (
                    <div className="bg-blue-500/20 rounded-xl p-4 space-y-3">
                      <h4 className="font-semibold text-white flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Sistema de Parcelas Automático
                      </h4>
                      <p className="text-xs text-caixa-extra-light">
                        ✅ Primeira parcela enviada agora
                      </p>
                      <p className="text-xs text-caixa-extra-light">
                        🤖 Demais parcelas serão enviadas automaticamente nas datas:
                      </p>
                      <div className="space-y-1 text-xs">
                        {pagamentoCriado.proximas_parcelas.slice(0, 3).map((parcela, index) => (
                          <div key={generateStableKey(parcela, index)} className="flex justify-between text-caixa-extra-light">
                            <span>Parcela {parcela.parcela}:</span>
                            <span>{new Date(parcela.data_envio).toLocaleDateString('pt-BR')}</span>
                          </div>
                        ))}
                        {pagamentoCriado.proximas_parcelas.length > 3 && (
                          <div className="text-center text-caixa-extra-light">
                            ... e mais {pagamentoCriado.proximas_parcelas.length - 3} parcelas
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Estado inicial */}
              {!loading && !error && !success && (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-caixa-orange/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Globe className="text-caixa-orange" size={24} />
                    </div>
                    <p className="text-caixa-extra-light">
                      Preencha o formulário para criar um pagamento universal
                    </p>
                    <p className="text-xs text-caixa-extra-light mt-1">
                      Aceita PIX, Cartão, Boleto e todos os métodos
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default CriarPagamento;
