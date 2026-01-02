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
  Loader2
} from "lucide-react";

const ClienteAluguel = () => {
  const [clientes, setClientes] = useState([]);
  const [modalAberto, setModalAberto] = useState(false);
  const [modalPagamento, setModalPagamento] = useState(false);
  const [modalConfirmacao, setModalConfirmacao] = useState(false);
  const [clienteSelecionado, setClienteSelecionado] = useState(null);
  const [pagamentoParaDeletar, setPagamentoParaDeletar] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formPagamento, setFormPagamento] = useState({
    data: new Date().toISOString().split('T')[0],
    valor: '',
    status: 'Pago',
    forma_pagamento: 'Dinheiro'
  });

  // Animações
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  const cardVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: {
        duration: 0.3
      }
    }
  };

  // Carrega clientes do backend
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

  // Verifica se o pagamento está em atraso
  const verificarAtraso = (cliente) => {
    const hoje = new Date();
    const diaVencimento = parseInt(cliente.dia_vencimento);
    
    if (hoje.getDate() > diaVencimento) {
      return true;
    }
    return false;
  };

  // Abre modal de histórico
  const abrirHistorico = (cliente) => {
    setClienteSelecionado(cliente);
    setModalAberto(true);
  };

  // Abre modal de pagamento
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

  // Abre modal de confirmação para deletar
  const abrirModalConfirmacao = (pagamento, index) => {
    setPagamentoParaDeletar({ pagamento, index, id: pagamento.id });
    setModalConfirmacao(true);
  };

  // Fecha modais
  const fecharModais = () => {
    setModalAberto(false);
    setModalPagamento(false);
    setModalConfirmacao(false);
    setClienteSelecionado(null);
    setPagamentoParaDeletar(null);
  };

  // Registra pagamento
  const registrarPagamento = async () => {
    if (!clienteSelecionado) return;
    
    setLoading(true);
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/clientealuguel/${clienteSelecionado.id}/pagamento`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
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

  // Deleta pagamento
  const deletarPagamento = async () => {
    if (!clienteSelecionado || !pagamentoParaDeletar) return;
    
    setLoading(true);
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/clientealuguel/${clienteSelecionado.id}/pagamento/${pagamentoParaDeletar.id}`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          }
        }
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

  // Renderiza histórico
  const renderHistorico = () => {
    if (!clienteSelecionado?.historico_pagamentos || 
        !Array.isArray(clienteSelecionado.historico_pagamentos) || 
        clienteSelecionado.historico_pagamentos.length === 0) {
      return (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-12"
        >
          <div className="w-20 h-20 bg-caixa-light/20 rounded-full flex items-center justify-center mb-4">
            <FileText className="w-10 h-10 text-caixa-light" />
          </div>
          <p className="text-caixa-extra-light text-center">Nenhum histórico de pagamentos encontrado</p>
        </motion.div>
      );
    }

    return clienteSelecionado.historico_pagamentos.map((pag, i) => {
      const isPago = pag.status === "Pago";
      
      return (
        <motion.div 
          key={i}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.1 }}
          className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 mb-3 hover:bg-white/10 transition-all duration-200 group"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                {isPago ? (
                  <CheckCircle className="w-4 h-4 text-green-400" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-400" />
                )}
                <span className={`font-medium ${isPago ? 'text-green-400' : 'text-red-400'}`}>
                  {pag.status || "N/A"}
                </span>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-caixa-extra-light text-sm">
                  <Calendar className="w-3 h-3" />
                  <span>{pag.data || "N/A"}</span>
                </div>
                <div className="flex items-center gap-2 text-white font-semibold">
                  <DollarSign className="w-3 h-3" />
                  <span>R$ {pag.valor || "N/A"}</span>
                </div>
                {pag.forma_pagamento && (
                  <div className="flex items-center gap-2 text-caixa-extra-light text-sm">
                    <CreditCard className="w-3 h-3" />
                    <span>{pag.forma_pagamento}</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                isPago 
                  ? 'bg-green-400/20 text-green-400 border border-green-400/30' 
                  : 'bg-red-400/20 text-red-400 border border-red-400/30'
              }`}>
                {isPago ? 'Pago' : 'Pendente'}
              </div>
              
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => abrirModalConfirmacao(pag, i)}
                className="opacity-0 group-hover:opacity-100 bg-red-600 hover:bg-red-700 text-white p-2 rounded-lg transition-all duration-200"
                title="Deletar pagamento"
              >
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
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 border-4 border-caixa-light/30 border-t-caixa-light rounded-full mx-auto mb-4"
          />
          <h2 className="text-2xl font-bold text-white mb-2">Carregando Clientes</h2>
          <p className="text-caixa-extra-light">Aguarde...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-caixa-primary via-caixa-secondary to-black">
      {/* Efeitos de fundo */}
      <div className="absolute inset-0 bg-gradient-to-br from-caixa-primary/20 via-caixa-secondary/10 to-transparent"></div>
      <div className="absolute inset-0">
        <div className="absolute top-0 -left-4 w-72 h-72 bg-caixa-light rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse"></div>
        <div className="absolute top-0 -right-4 w-72 h-72 bg-caixa-orange rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse delay-1000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-caixa-secondary rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse delay-2000"></div>
      </div>

      <div className="relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 backdrop-blur-md border-b border-white/10"
        >
          <div className="container mx-auto px-4 py-8">
            <div className="flex items-center gap-4 mb-2">
              <div className="w-12 h-12 bg-gradient-to-br from-caixa-light to-caixa-secondary rounded-xl flex items-center justify-center shadow-lg">
                <Home className="w-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold text-white">
                  Clientes de Aluguel
                </h1>
                <p className="text-caixa-extra-light text-lg">
                  Gerencie os pagamentos dos seus clientes de aluguel
                </p>
              </div>
            </div>
            
            {/* Estatísticas rápidas */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-caixa-light/20 rounded-lg flex items-center justify-center">
                    <Users className="w-5 h-5 text-caixa-light" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{clientes.length}</p>
                    <p className="text-caixa-extra-light text-sm">Total de Clientes</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">
                      {clientes.filter(c => !verificarAtraso(c)).length}
                    </p>
                    <p className="text-caixa-extra-light text-sm">Em Dia</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-red-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">
                      {clientes.filter(c => verificarAtraso(c)).length}
                    </p>
                    <p className="text-caixa-extra-light text-sm">Em Atraso</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="container mx-auto px-4 py-8">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-6"
          >
            {/* Cards para Mobile */}
            <div className="block lg:hidden space-y-4">
              {clientes.map((cliente, index) => {
                const emAtraso = verificarAtraso(cliente);
                
                return (
                  <motion.div 
                    key={cliente.id}
                    variants={cardVariants}
                    custom={index}
                    className={`backdrop-blur-md border rounded-2xl p-6 transition-all duration-300 ${
                      emAtraso 
                        ? 'bg-red-500/10 border-red-500/30 hover:bg-red-500/20 shadow-red-500/10' 
                        : 'bg-white/10 border-white/20 hover:bg-white/15 shadow-xl'
                    }`}
                  >
                    {/* Aviso de Atraso */}
                    {emAtraso && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-red-500/20 border border-red-500/30 rounded-xl p-3 mb-4 flex items-center gap-2"
                      >
                        <AlertTriangle className="w-4 h-4 text-red-400" />
                        <span className="text-red-400 text-sm font-medium">Pagamento em atraso!</span>
                      </motion.div>
                    )}

                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-white mb-1">{cliente.nome}</h3>
                        <div className="flex items-center gap-2 text-caixa-extra-light text-sm">
                          <Mail className="w-3 h-3" />
                          <span>{cliente.email}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-caixa-orange font-bold text-xl">
                          {Number(cliente.valor_aluguel).toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          })}
                        </p>
                        <div className="flex items-center gap-1 text-caixa-extra-light text-sm">
                          <Calendar className="w-3 h-3" />
                          <span>Dia {cliente.dia_vencimento}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2 mb-6">
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-caixa-light" />
                        <span className="text-white text-sm">{cliente.telefone}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-caixa-light" />
                        <span className="text-white text-sm">{cliente.cpf}</span>
                      </div>
                    </div>

                    {/* Botões de Ação */}
                    <div className="grid grid-cols-2 gap-3">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-medium py-3 px-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
                        onClick={() => abrirModalPagamento(cliente)}
                      >
                        <Plus className="w-4 h-4" />
                        Registrar Pagamento
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="bg-gradient-to-r from-caixa-light to-caixa-secondary hover:from-caixa-secondary hover:to-caixa-light text-white font-medium py-3 px-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
                        onClick={() => abrirHistorico(cliente)}
                      >
                        <Eye className="w-4 h-4" />
                        Ver Histórico
                      </motion.button>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Tabela para Desktop */}
            <motion.div 
              variants={itemVariants}
              className="hidden lg:block"
            >
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
                        <th className="px-6 py-4 text-center text-sm font-semibold text-caixa-extra-light">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clientes.map((cliente, index) => {
                        const emAtraso = verificarAtraso(cliente);
                        
                        return (
                          <motion.tr 
                            key={cliente.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className={`border-b border-white/5 transition-all duration-200 ${
                              emAtraso ? 'bg-red-500/5 hover:bg-red-500/10' : 'hover:bg-white/5'
                            }`}
                          >
                            <td className="px-6 py-4">
                              <div>
                                <div className="font-medium text-white flex items-center gap-2">
                                  {cliente.nome}
                                  {emAtraso && <AlertTriangle className="w-4 h-4 text-red-400" />}
                                </div>
                                <div className="text-sm text-caixa-extra-light flex items-center gap-1">
                                  <FileText className="w-3 h-3" />
                                  {cliente.cpf}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div>
                                <div className="text-white flex items-center gap-1">
                                  <Mail className="w-3 h-3 text-caixa-light" />
                                  {cliente.email}
                                </div>
                                <div className="text-sm text-caixa-extra-light flex items-center gap-1">
                                  <Phone className="w-3 h-3" />
                                  {cliente.telefone}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-caixa-orange font-semibold flex items-center gap-1">
                                <DollarSign className="w-4 h-4" />
                                {Number(cliente.valor_aluguel).toLocaleString("pt-BR", {
                                  style: "currency",
                                  currency: "BRL",
                                })}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="bg-caixa-light/20 text-caixa-light px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 w-fit">
                                <Calendar className="w-3 h-3" />
                                Dia {cliente.dia_vencimento}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              {emAtraso ? (
                                <span className="bg-red-500/20 text-red-400 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 w-fit">
                                  <Clock className="w-3 h-3" />
                                  Em Atraso
                                </span>
                              ) : (
                                <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 w-fit">
                                  <CheckCircle className="w-3 h-3" />
                                  Em Dia
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2 justify-center">
                                <motion.button
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-medium py-2 px-4 rounded-xl transition-all duration-200 flex items-center gap-1"
                                  onClick={() => abrirModalPagamento(cliente)}
                                  title="Registrar Pagamento"
                                >
                                  <Plus className="w-4 h-4" />
                                  Pagar
                                </motion.button>
                                <motion.button
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  className="bg-gradient-to-r from-caixa-light to-caixa-secondary hover:from-caixa-secondary hover:to-caixa-light text-white font-medium py-2 px-4 rounded-xl transition-all duration-200 flex items-center gap-1"
                                  onClick={() => abrirHistorico(cliente)}
                                  title="Ver Histórico"
                                >
                                  <Eye className="w-4 h-4" />
                                  Histórico
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

      {/* Modal de Histórico */}
      {modalAberto && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-gradient-to-br from-caixa-primary/95 to-caixa-secondary/95 backdrop-blur-md border border-white/20 rounded-2xl w-full max-w-lg max-h-[80vh] overflow-hidden shadow-2xl"
          >
            <div className="bg-gradient-to-r from-caixa-light to-caixa-secondary p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">Histórico de Pagamentos</h2>
                  <p className="text-white/80 text-sm mt-1">{clienteSelecionado?.nome}</p>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={fecharModais}
                  className="bg-white/20 hover:bg-white/30 text-white rounded-full p-2 transition-all duration-200"
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>
            </div>

            <div className="p-6 max-h-96 overflow-y-auto">
              {renderHistorico()}
            </div>

            <div className="border-t border-white/10 p-4">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={fecharModais}
                className="w-full bg-gradient-to-r from-caixa-light to-caixa-secondary hover:from-caixa-secondary hover:to-caixa-light text-white font-medium py-3 px-4 rounded-xl transition-all duration-200"
              >
                Fechar
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Modal de Pagamento */}
      {modalPagamento && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-gradient-to-br from-caixa-primary/95 to-caixa-secondary/95 backdrop-blur-md border border-white/20 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl"
          >
            <div className="bg-gradient-to-r from-green-600 to-green-700 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">Registrar Pagamento</h2>
                  <p className="text-white/80 text-sm mt-1">{clienteSelecionado?.nome}</p>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={fecharModais}
                  className="bg-white/20 hover:bg-white/30 text-white rounded-full p-2 transition-all duration-200"
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>
            </div>

            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Data do Pagamento</label>
                  <input
                    type="date"
                    value={formPagamento.data}
                    onChange={(e) => setFormPagamento({...formPagamento, data: e.target.value})}
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-caixa-light/50 focus:border-caixa-light/50 transition-all duration-300"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">Valor</label>
                  <input
                    type="number"
                    value={formPagamento.valor}
                    onChange={(e) => setFormPagamento({...formPagamento, valor: e.target.value})}
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-caixa-light/50 focus:border-caixa-light/50 transition-all duration-300"
                    placeholder="R$ 0,00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">Forma de Pagamento</label>
                  <select
                    value={formPagamento.forma_pagamento}
                    onChange={(e) => setFormPagamento({...formPagamento, forma_pagamento: e.target.value})}
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-caixa-light/50 focus:border-caixa-light/50 transition-all duration-300"
                  >
                    <option value="Dinheiro" className="bg-caixa-primary text-white">Dinheiro</option>
                    <option value="PIX" className="bg-caixa-primary text-white">PIX</option>
                    <option value="Cartão de Débito" className="bg-caixa-primary text-white">Cartão de Débito</option>
                    <option value="Cartão de Crédito" className="bg-caixa-primary text-white">Cartão de Crédito</option>
                    <option value="Transferência" className="bg-caixa-primary text-white">Transferência</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">Status</label>
                  <select
                    value={formPagamento.status}
                    onChange={(e) => setFormPagamento({...formPagamento, status: e.target.value})}
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-caixa-light/50 focus:border-caixa-light/50 transition-all duration-300"
                  >
                    <option value="Pago" className="bg-caixa-primary text-white">Pago</option>
                    <option value="Pendente" className="bg-caixa-primary text-white">Pendente</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="border-t border-white/10 p-4 flex gap-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={fecharModais}
                className="flex-1 bg-white/10 hover:bg-white/20 text-white font-medium py-3 px-4 rounded-xl transition-all duration-200"
              >
                Cancelar
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={registrarPagamento}
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-medium py-3 px-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Confirmar
                  </>
                )}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {modalConfirmacao && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-gradient-to-br from-caixa-primary/95 to-caixa-secondary/95 backdrop-blur-md border border-white/20 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl"
          >
            <div className="bg-gradient-to-r from-red-600 to-red-700 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">Confirmar Exclusão</h2>
                  <p className="text-white/80 text-sm mt-1">Esta ação não pode ser desfeita</p>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={fecharModais}
                  className="bg-white/20 hover:bg-white/30 text-white rounded-full p-2 transition-all duration-200"
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>
            </div>

            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-400" />
                </div>
                <div>
                  <h3 className="text-white font-medium">Deletar Pagamento</h3>
                  <p className="text-caixa-extra-light text-sm">Tem certeza que deseja deletar este pagamento?</p>
                </div>
              </div>

              {pagamentoParaDeletar && (
                <div className="bg-white/5 rounded-xl p-4 mb-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-caixa-extra-light">
                      <Calendar className="w-3 h-3" />
                      <span>Data: {pagamentoParaDeletar.pagamento.data}</span>
                    </div>
                    <div className="flex items-center gap-2 text-white font-semibold">
                      <DollarSign className="w-3 h-3" />
                      <span>Valor: R$ {pagamentoParaDeletar.pagamento.valor}</span>
                    </div>
                    <div className="flex items-center gap-2 text-caixa-extra-light">
                      <span className={`w-3 h-3 rounded-full ${
                        pagamentoParaDeletar.pagamento.status === "Pago" ? 'bg-green-400' : 'bg-red-400'
                      }`}></span>
                      <span>Status: {pagamentoParaDeletar.pagamento.status}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-white/10 p-4 flex gap-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={fecharModais}
                className="flex-1 bg-white/10 hover:bg-white/20 text-white font-medium py-3 px-4 rounded-xl transition-all duration-200"
              >
                Cancelar
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={deletarPagamento}
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-medium py-3 px-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Deletando...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Deletar
                  </>
                )}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

export default ClienteAluguel;
