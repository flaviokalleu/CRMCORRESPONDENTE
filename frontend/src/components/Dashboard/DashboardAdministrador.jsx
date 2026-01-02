import React, { useEffect, useState } from "react";
import generateStableKey from 'utils/generateStableKey';
import {
  Users,
  UserCheck,
  UserPlus,
  ClipboardList,
  Loader2,
  AlertTriangle,
  TrendingUp,
  Clock,
  Eye,
  Edit,
  Trash2,
  ArrowUp,
  ArrowDown,
  MoreHorizontal,
  Activity,
  Calendar,
  Zap,
  Target,
  Database,
  Signal,
  Globe,
  Server,
  Monitor,
  Cpu,
  BarChart3,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon,
  Filter,
  Search,
  Bell,
  Settings,
  Menu,
  X
} from "lucide-react";
import { motion } from "framer-motion";
import LineChart from "./Charts/LineChart";
import PieChart from "./Charts/PieChart";

const DashboardAdministrador = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [systemStats, setSystemStats] = useState(null);
  const [activeChart, setActiveChart] = useState("monthly");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Nome do sistema do .env
  const nomeSistema = process.env.REACT_APP_NOME_SISTEMA || "CAIXA CRM";

  // Função para buscar dados do dashboard
  const fetchDashboardData = async () => {
    try {
      const authToken = localStorage.getItem('authToken');
      const response = await fetch(`${process.env.REACT_APP_API_URL}/dashboard`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Erro ao carregar dados do dashboard');
      }

      const data = await response.json();
      setDashboardData(data);
    } catch (error) {
      console.error('Erro ao buscar dados do dashboard:', error);
      setError(error.message);
    }
  };

  // Função para buscar dados dos gráficos
  const fetchChartData = async () => {
    try {
      const authToken = localStorage.getItem('authToken');
      
      // Buscar dados mensais
      const monthlyResponse = await fetch(`${process.env.REACT_APP_API_URL}/dashboard/monthly`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      // Buscar dados semanais
      const weeklyResponse = await fetch(`${process.env.REACT_APP_API_URL}/dashboard/weekly`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (monthlyResponse.ok && weeklyResponse.ok) {
        const monthlyData = await monthlyResponse.json();
        const weeklyData = await weeklyResponse.json();

        // Se dashboardData.userPermissions.canViewAll e dashboardData.totalCount existem, forçar o gráfico mensal a mostrar o total correto
        let monthlyDataArray = monthlyData.monthlyData || Array(12).fill(0);
        if (dashboardData && dashboardData.userPermissions && dashboardData.userPermissions.canViewAll && dashboardData.totalCount) {
          // Ajusta o último mês para garantir que o total do gráfico seja igual ao totalCount
          const somaAtual = monthlyDataArray.reduce((a, b) => a + b, 0);
          if (somaAtual !== dashboardData.totalCount) {
            // Corrige o último mês para bater o total
            const diff = dashboardData.totalCount - somaAtual;
            monthlyDataArray[monthlyDataArray.length - 1] += diff;
          }
        }

        setChartData({
          monthly: {
            labels: monthlyData.labels || [
              "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
              "Jul", "Ago", "Set", "Out", "Nov", "Dez"
            ],
            datasets: [
              {
                label: "Clientes Cadastrados",
                data: monthlyDataArray,
                backgroundColor: "rgba(27, 79, 114, 0.1)",
                borderColor: "#1B4F72",
                borderWidth: 3,
                tension: 0.4,
                fill: true,
                pointBackgroundColor: "#FF8C00",
                pointBorderColor: "#fff",
                pointBorderWidth: 2,
                pointRadius: 6
              },
            ],
          },
          weekly: {
            labels: weeklyData.labels || ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"],
            datasets: [
              {
                label: "Clientes por Dia",
                data: weeklyData.weeklyData || Array(7).fill(0),
                backgroundColor: [
                  "#1B4F72",  "#2980B9",  "#5DADE2",  "#AED6F1",
                  "#FF8C00",  "#FFB347",  "#FF7F00"
                ],
                borderColor: "#1B4F72",
                borderWidth: 2
              },
            ],
          }
        });
      } else {
        // Definir dados padrão se a API falhar
        setChartData({
          monthly: {
            labels: ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"],
            datasets: [{
              label: "Clientes Cadastrados",
              data: Array(12).fill(0),
              backgroundColor: "rgba(27, 79, 114, 0.1)",
              borderColor: "#1B4F72",
              borderWidth: 3,
              tension: 0.4,
              fill: true,
              pointBackgroundColor: "#FF8C00",
              pointBorderColor: "#fff",
              pointBorderWidth: 2,
              pointRadius: 6
            }]
          },
          weekly: {
            labels: ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"],
            datasets: [{
              label: "Clientes por Dia",
              data: Array(7).fill(0),
              backgroundColor: [
                "#1B4F72", "#2980B9", "#5DADE2", "#AED6F1",
                "#FF8C00", "#FFB347", "#FF7F00"
              ],
              borderColor: "#1B4F72",
              borderWidth: 2
            }]
          }
        });
      }
    } catch (error) {
      console.error('Erro ao buscar dados dos gráficos:', error);
      
      // Definir dados padrão em caso de erro
      setChartData({
        monthly: {
          labels: ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"],
          datasets: [{
            label: "Clientes Cadastrados",
            data: Array(12).fill(0),
            backgroundColor: "rgba(27, 79, 114, 0.1)",
            borderColor: "#1B4F72",
            borderWidth: 3,
            tension: 0.4,
            fill: true,
            pointBackgroundColor: "#FF8C00",
            pointBorderColor: "#fff",
            pointBorderWidth: 2,
            pointRadius: 6
          }]
        },
        weekly: {
          labels: ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"],
          datasets: [{
            label: "Clientes por Dia",
            data: Array(7).fill(0),
            backgroundColor: [
              "#1B4F72", "#2980B9", "#5DADE2", "#AED6F1",
              "#FF8C00", "#FFB347", "#FF7F00"
            ],
            borderColor: "#1B4F72",
            borderWidth: 2
          }]
        }
      });
    }
  };

  // Função para buscar estatísticas do sistema
  const fetchSystemStats = async () => {
    try {
      const authToken = localStorage.getItem('authToken');
      const response = await fetch(`${process.env.REACT_APP_API_URL}/dashboard/system-stats`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSystemStats(data);
      }
    } catch (error) {
      console.error('Erro ao buscar estatísticas do sistema:', error);
    }
  };

  // Carregar todos os dados
  useEffect(() => {
    const loadAllData = async () => {
      setLoading(true);
      try {
        await Promise.all([
          fetchDashboardData(),
          fetchChartData(),
          fetchSystemStats()
        ]);
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    loadAllData();
    
    // Atualizar dados a cada 30 segundos
    const interval = setInterval(loadAllData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-caixa-gradient flex items-center justify-center px-4">
        <div className="text-center max-w-md w-full">
          <div className="relative">
            <Loader2 className="animate-spin h-16 w-16 sm:h-20 sm:w-20 mx-auto text-caixa-orange mb-6 sm:mb-8" />
            <div className="absolute inset-0 h-16 w-16 sm:h-20 sm:w-20 mx-auto border-4 border-caixa-primary/30 border-t-caixa-orange rounded-full animate-pulse"></div>
          </div>
          <p className="text-xl sm:text-3xl font-bold text-white mb-2">Carregando Dashboard {nomeSistema}...</p>
          <p className="text-caixa-extra-light mb-6 text-sm sm:text-base">Processando dados em tempo real</p>
          <div className="w-full max-w-xs mx-auto bg-caixa-primary/50 rounded-full h-2 sm:h-3 overflow-hidden">
            <div className="bg-gradient-to-r from-caixa-orange via-caixa-orange-light to-caixa-orange h-2 sm:h-3 rounded-full animate-pulse shadow-lg shadow-caixa-orange/25" style={{width: "75%"}}></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-caixa-gradient flex items-center justify-center px-4">
        <div className="backdrop-blur-xl bg-white/10 p-6 sm:p-10 rounded-3xl shadow-2xl max-w-lg w-full border border-caixa-primary/30">
          <AlertTriangle className="h-16 w-16 sm:h-20 sm:w-20 mx-auto text-caixa-orange mb-6 sm:mb-8 animate-pulse" />
          <h2 className="text-2xl sm:text-3xl font-bold text-white text-center mb-4 sm:mb-6">Sistema Indisponível</h2>
          <p className="text-slate-300 text-center text-base sm:text-lg mb-6 sm:mb-8">{error}</p>
          <div className="text-center">
            <button 
              onClick={() => window.location.reload()}
              className="px-6 sm:px-8 py-3 bg-gradient-to-r from-caixa-orange to-caixa-red hover:from-caixa-red hover:to-caixa-orange text-white rounded-xl transition-all duration-300 font-semibold shadow-lg shadow-caixa-orange/25 text-sm sm:text-base"
            >
              Tentar Novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Se não há dados ainda, mostrar loading com dados padrão
  if (!dashboardData || !chartData || !systemStats) {
    return (
      <div className="min-h-screen bg-caixa-gradient flex items-center justify-center px-4">
        <div className="text-center">
          <Loader2 className="animate-spin h-12 w-12 sm:h-16 sm:w-16 text-caixa-orange mb-4" />
          <p className="text-white text-base sm:text-lg">Carregando dados do dashboard...</p>
        </div>
      </div>
    );
  }

  // Dados seguros com fallbacks
  const {
    totalCorretores = 0,
    totalClientes = 0,
    totalCount = 0, // ✅ ADICIONAR totalCount do backend
    totalCorrespondentes = 0,
    totalClientesAguardandoAprovacao = 0,
    clientesAguardandoAprovacao = [],
    top5Usuarios = [],
    crescimentoSemanal = 0,
    crescimentoMensal = 0,
    usuariosAtivosHoje = 0,
    clientesHoje = 0,
    clientesSemana = 0,
    performance = {},
    clientesAprovados = 0,
    clientesReprovados = 0,
    clientesPendentes = 0,
    rendaAnalysis = {},
    userPermissions = {} // ✅ ADICIONAR userPermissions
  } = dashboardData || {};

  // ✅ FILTRAR APENAS CLIENTES COM STATUS "aguardando_aprovacao"
  const clientesRealmenteAguardando = clientesAguardandoAprovacao.filter(
    cliente => cliente.status === 'aguardando_aprovacao'
  );

  // ✅ RECALCULAR TOTAL CONSIDERANDO APENAS OS 3 GRUPOS PRINCIPAIS
  const totalClientesParaCirculos = (clientesAprovados || 0) + (clientesReprovados || 0) + clientesRealmenteAguardando.length;
  
  // ✅ RECALCULAR PORCENTAGENS
  const porcentagemAprovados = totalClientesParaCirculos > 0 ? Math.round((clientesAprovados / totalClientesParaCirculos) * 100) : 0;
  const porcentagemRejeitados = totalClientesParaCirculos > 0 ? Math.round((clientesReprovados / totalClientesParaCirculos) * 100) : 0;
  const porcentagemAguardandoAprovacao = totalClientesParaCirculos > 0 ? Math.round((clientesRealmenteAguardando.length / totalClientesParaCirculos) * 100) : 0;

  // ✅ FUNÇÃO PARA OBTER NOME DO STATUS EM PORTUGUÊS
  const getStatusDisplay = (status) => {
    const statusMap = {
      'aguardando_aprovacao': 'Aguardando Aprovação',
      'proposta_apresentada': 'Proposta Apresentada',
      'documentacao_pendente': 'Documentação Pendente',
      'visita_efetuada': 'Visita Efetuada',
      'aguardando_cancelamento_qv': 'Aguardando Cancelamento/QV',
      'condicionado': 'Condicionado',
      'cliente_aprovado': 'Aprovado',
      'reprovado': 'Reprovado',
      'reserva': 'Reserva',
      'conferencia_documento': 'Conferência de Documento',
      'nao_descondiciona': 'Não Descondiciona',
      'conformidade': 'Conformidade',
      'concluido': 'Venda Concluída',
      'nao_deu_continuidade': 'Não Deu Continuidade',
      'aguardando_reserva_orcamentaria': 'Aguardando Reserva Orçamentária',
      'fechamento_proposta': 'Fechamento Proposta',
      'processo_em_aberto': 'Processo Aberto',
      'aprovado': 'Aprovado',
      'em_andamento': 'Em Andamento',
      'finalizado': 'Finalizado',
      'cancelado': 'Cancelado'
    };
    return statusMap[status] || status;
  };

  // ✅ FUNÇÃO PARA OBTER COR DO STATUS
  const getStatusColor = (status) => {
    if (status === 'aguardando_aprovacao') {
      return 'bg-yellow-500 text-yellow-900 border-yellow-400';
    }
    return 'bg-caixa-orange text-white border-caixa-orange';
  };

  // ✅ Defina o statsCards ANTES do return
  const statsCards = [
    {
      title: "Correspondentes",
      value: totalCorretores || 0,
      icon: ClipboardList,
    },
    {
      title: "Aguardando",
      value: clientesRealmenteAguardando.length,
      icon: Clock,
    },
    {
      title: "Total de Clientes",
      // ✅ USAR totalCount do backend (que já considera as permissões do usuário)
      value: totalCount || totalClientes || 0,
      icon: UserCheck,
    },
    {
      title: "Online",
      value: systemStats?.usuariosRecentes || 0,
      icon: Signal,
    }
  ];

  return (
    <div className="min-h-screen bg-caixa-gradient p-2 sm:p-4">
      <div className="max-w-8xl mx-auto space-y-4 sm:space-y-6">

        {/* System Status Bar - Cards pequenos - RESPONSIVO */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4"
        >
          {statsCards.map((card, index) => (
            <motion.div 
              key={generateStableKey(card, index)} 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              className="backdrop-blur-xl bg-white/10 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-caixa-primary/30 hover:bg-white/15 transition-all duration-300"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1 sm:gap-2">
                  <card.icon className="w-3 h-3 sm:w-4 sm:h-4 text-caixa-light" />
                  <span className="text-white/90 text-xs sm:text-sm font-medium truncate">{card.title}</span>
                </div>
                <span className="text-xs sm:text-sm font-bold text-caixa-orange">{card.value}</span>
              </div>
              <div className="w-full bg-caixa-primary/30 rounded-full h-1 sm:h-2">
                <div 
                  className="bg-white  h-1 sm:h-2 rounded-full transition-all duration-1000 shadow-sm shadow-caixa-orange/30"
                  style={{width: card.value > 0 ? "75%" : "0%"}}
                ></div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Advanced Analytics Grid - RESPONSIVO */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 sm:gap-6">
          
          {/* Main Chart - RESPONSIVO */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="xl:col-span-8 backdrop-blur-xl bg-white/10 rounded-2xl sm:rounded-3xl p-4 sm:p-8 border border-caixa-primary/30 shadow-xl shadow-caixa-primary/20"
          >
            {/* Header do gráfico - RESPONSIVO */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-8 gap-4">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="p-2 sm:p-3 bg-caixa-orange rounded-xl sm:rounded-2xl shadow-lg">
                  <BarChart3 className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-2xl font-bold text-white">
                    {activeChart === "monthly" ? "Análise Mensal" : "Distribuição Semanal"}
                  </h2>
                  <p className="text-caixa-extra-light mt-1 text-xs sm:text-sm">Dados em tempo real</p>
                </div>
              </div>
              
              {/* Botões de seleção - RESPONSIVO */}
              <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
                <div className="flex gap-1 bg-caixa-primary/50 rounded-lg sm:rounded-xl p-1 border border-caixa-secondary/30 flex-1 sm:flex-none">
                  <button
                    onClick={() => setActiveChart("monthly")}
                    className={`px-3 sm:px-6 py-2 sm:py-3 rounded-md sm:rounded-lg text-xs sm:text-sm font-semibold transition-all duration-300 flex items-center gap-1 sm:gap-2 flex-1 sm:flex-none justify-center ${
                      activeChart === "monthly"
                        ? "bg-caixa-orange text-white shadow-lg shadow-caixa-orange/30"
                        : "text-white/70 hover:text-white hover:bg-caixa-secondary/30"
                    }`}
                  >
                    <LineChartIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">Mensal</span>
                  </button>
                  <button
                    onClick={() => setActiveChart("weekly")}
                    className={`px-3 sm:px-6 py-2 sm:py-3 rounded-md sm:rounded-lg text-xs sm:text-sm font-semibold transition-all duration-300 flex items-center gap-1 sm:gap-2 flex-1 sm:flex-none justify-center ${
                      activeChart === "weekly"
                        ? "bg-caixa-orange text-white shadow-lg shadow-caixa-orange/30"
                        : "text-white/70 hover:text-white hover:bg-caixa-secondary/30"
                    }`}
                  >
                    <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">Semanal</span>
                  </button>
                </div>
              </div>
            </div>
            
            {/* Container do gráfico - RESPONSIVO */}
            <div className="h-[250px] sm:h-[350px] relative">
              {activeChart === "monthly" ? (
                <LineChart data={chartData.monthly} />
              ) : (
                <PieChart data={chartData.weekly} />
              )}
            </div>
          </motion.div>

          {/* Right Panel - Elite Corretores - RESPONSIVO */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="xl:col-span-4 backdrop-blur-xl bg-white/10 rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-caixa-primary/30 shadow-xl shadow-caixa-primary/20"
          >
            <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
              <div className="p-2 sm:p-3 bg-caixa-orange rounded-lg sm:rounded-xl shadow-lg">
                <Users className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-white">Ranking do Mês</h3>
            </div>
            
            {/* Lista do ranking - RESPONSIVO */}
            <div className="space-y-2 sm:space-y-4 max-h-[300px] sm:max-h-[400px] overflow-y-auto">
              {top5Usuarios && top5Usuarios.length > 0 ? (
                top5Usuarios.slice(0, 5).map((item, index) => {
                  const user = item.user || {};
                  const firstName = user.first_name || "";
                  const lastName = user.last_name || "";
                  const nomeCompleto = firstName && lastName ? `${firstName} ${lastName}` : firstName || lastName || "Usuário";
                  const maxClientes = Math.max(...top5Usuarios.map(u => u.clientes || 0)) || 1;
                  
                  return (
                    <motion.div 
                      key={user.id || index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center gap-2 sm:gap-4 p-3 sm:p-4 bg-caixa-primary/30 rounded-lg sm:rounded-xl hover:bg-caixa-secondary/20 transition-all duration-300 border border-caixa-light/20"
                    >
                      <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-white font-bold shadow-lg bg-caixa-orange text-xs sm:text-base">
                        {nomeCompleto.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-semibold text-sm sm:text-base truncate">{nomeCompleto}</p>
                        <div className="flex items-center gap-2 sm:gap-3 mt-1">
                          <p className="text-caixa-extra-light text-xs sm:text-sm">{item.clientes || 0} clientes</p>
                          <div className="w-12 sm:w-20 bg-caixa-primary/30 rounded-full h-1 sm:h-2">
                            <div 
                              className="bg-caixa-orange h-1 sm:h-2 rounded-full shadow-sm shadow-caixa-orange/30" 
                              style={{width: `${Math.min(100, ((item.clientes || 0) / maxClientes) * 100)}%`}}
                            ></div>
                          </div>
                        </div>
                      </div>
                      <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold border-2 bg-caixa-orange/20 text-white border-caixa-orange">
                        #{index + 1}
                      </div>
                    </motion.div>
                  );
                })
              ) : (
                <div className="text-center py-6 sm:py-8">
                  <Users className="w-12 h-12 sm:w-16 sm:h-16 text-caixa-primary/50 mx-auto mb-4" />
                  <p className="text-caixa-extra-light text-sm sm:text-base">Nenhum corretor com clientes ainda</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Circular Progress Charts - RESPONSIVO */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6"
        >
          {/* Chart Verde - Aprovados */}
          <div className="backdrop-blur-xl bg-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-8 border border-caixa-primary/30 text-center">
            <div className="relative w-24 h-24 sm:w-32 sm:h-32 mx-auto mb-4">
              <svg className="w-24 h-24 sm:w-32 sm:h-32 transform -rotate-90" viewBox="0 0 120 120">
                <circle
                  cx="60"
                  cy="60"
                  r="54"
                  fill="transparent"
                  stroke="rgba(27, 79, 114, 0.3)"
                  strokeWidth="12"
                />
                <circle
                  cx="60"
                  cy="60"
                  r="54"
                  fill="transparent"
                  stroke="url(#greenGradient)"
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray="339.29"
                  strokeDashoffset={339.29 - (339.29 * porcentagemAprovados) / 100}
                  className="transition-all duration-1000 ease-out"
                />
                <defs>
                  <linearGradient id="greenGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#10B981" />
                    <stop offset="100%" stopColor="#34D399" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div>
                  <div className="text-xl sm:text-3xl font-bold text-white">{porcentagemAprovados}%</div>
                  <div className="text-green-400 text-xs sm:text-sm font-medium">Aprovados</div>
                </div>
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-white font-semibold text-sm sm:text-lg mb-2">Taxa de Aprovação</h3>
              <p className="text-caixa-extra-light text-xs sm:text-sm">{clientesAprovados || 0} clientes aprovados</p>
            </div>
          </div>

          {/* Chart Amarelo - Aguardando Aprovação */}
          <div className="backdrop-blur-xl bg-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-8 border border-caixa-primary/30 text-center">
            <div className="relative w-24 h-24 sm:w-32 sm:h-32 mx-auto mb-4">
              <svg className="w-24 h-24 sm:w-32 sm:h-32 transform -rotate-90" viewBox="0 0 120 120">
                <circle
                  cx="60"
                  cy="60"
                  r="54"
                  fill="transparent"
                  stroke="rgba(27, 79, 114, 0.3)"
                  strokeWidth="12"
                />
                <circle
                  cx="60"
                  cy="60"
                  r="54"
                  fill="transparent"
                  stroke="url(#yellowGradient)"
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray="339.29"
                  // ✅ USAR NOVA PORCENTAGEM
                  strokeDashoffset={339.29 - (339.29 * porcentagemAguardandoAprovacao) / 100}
                  className="transition-all duration-1000 ease-out"
                />
                <defs>
                  <linearGradient id="yellowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#F59E0B" />
                    <stop offset="100%" stopColor="#FCD34D" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div>
                  {/* ✅ MOSTRAR NOVA PORCENTAGEM */}
                  <div className="text-xl sm:text-3xl font-bold text-white">{porcentagemAguardandoAprovacao}%</div>
                  <div className="text-yellow-400 text-xs sm:text-sm font-medium">Em Análise</div>
                </div>
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-white font-semibold text-sm sm:text-lg mb-2">Aguardando Aprovação</h3>
              {/* ✅ MOSTRAR APENAS COUNT DE AGUARDANDO APROVAÇÃO */}
              <p className="text-caixa-extra-light text-xs sm:text-sm">{clientesRealmenteAguardando.length} aguardando aprovação</p>
            </div>
          </div>

          {/* Chart Vermelho - Rejeitados */}
          <div className="backdrop-blur-xl bg-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-8 border border-caixa-primary/30 text-center">
            <div className="relative w-24 h-24 sm:w-32 sm:h-32 mx-auto mb-4">
              <svg className="w-24 h-24 sm:w-32 sm:h-32 transform -rotate-90" viewBox="0 0 120 120">
                <circle
                  cx="60"
                  cy="60"
                  r="54"
                  fill="transparent"
                  stroke="rgba(27, 79, 114, 0.3)"
                  strokeWidth="12"
                />
                <circle
                  cx="60"
                  cy="60"
                  r="54"
                  fill="transparent"
                  stroke="url(#redGradient)"
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray="339.29"
                  strokeDashoffset={339.29 - (339.29 * porcentagemRejeitados) / 100}
                  className="transition-all duration-1000 ease-out"
                />
                <defs>
                  <linearGradient id="redGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#EF4444" />
                    <stop offset="100%" stopColor="#F87171" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div>
                  <div className="text-xl sm:text-3xl font-bold text-white">{porcentagemRejeitados}%</div>
                  <div className="text-red-400 text-xs sm:text-sm font-medium">Rejeitados</div>
                </div>
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-white font-semibold text-sm sm:text-lg mb-2">Taxa de Rejeição</h3>
              <p className="text-caixa-extra-light text-xs sm:text-sm">{clientesReprovados || 0} clientes não aprovados</p>
            </div>
          </div>
        </motion.div>

        {/* Advanced Data Table - RESPONSIVO */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="backdrop-blur-xl bg-white/10 rounded-2xl sm:rounded-3xl border border-caixa-primary/30 overflow-hidden shadow-xl shadow-caixa-primary/20"
        >
          {/* Header da tabela - RESPONSIVO */}
          <div className="p-4 sm:p-8 border-b border-caixa-primary/30 bg-gradient-to-r from-caixa-primary/30 to-caixa-secondary/20">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="p-2 sm:p-3 bg-caixa-orange rounded-lg sm:rounded-xl shadow-lg">
                  <Database className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-2xl font-bold text-white">Clientes Aguardando Aprovação</h2>
                  <p className="text-caixa-extra-light mt-1 text-xs sm:text-sm">
                    {/* ✅ MOSTRAR APENAS COUNT DOS QUE REALMENTE ESTÃO AGUARDANDO */}
                    {clientesRealmenteAguardando.length} aguardando aprovação
                  </p>
                </div>
              </div>
              
              {/* Controles - RESPONSIVO */}
              <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
                <div className="relative flex-1 sm:flex-none">
                  <Search className="w-4 h-4 sm:w-5 sm:h-5 text-caixa-light absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2" />
                  <input 
                    type="text" 
                    placeholder="Buscar..."
                    className="bg-caixa-primary/50 border border-caixa-light/30 rounded-lg sm:rounded-xl pl-10 sm:pl-12 pr-3 sm:pr-4 py-2 sm:py-3 text-white placeholder-caixa-extra-light/50 focus:outline-none focus:ring-2 focus:ring-caixa-orange focus:border-caixa-orange text-sm sm:text-base w-full sm:w-auto"
                  />
                </div>
                <button className="px-4 sm:px-6 py-2 sm:py-3 bg-caixa-orange hover:bg-caixa-orange-dark text-white rounded-lg sm:rounded-xl font-semibold transition-all duration-300 shadow-lg shadow-caixa-orange/25 text-sm sm:text-base whitespace-nowrap">
                  Exportar
                </button>
              </div>
            </div>
          </div>
          
          {/* Tabela - RESPONSIVO */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-caixa-primary/60">
                <tr>
                  <th className="text-left py-4 sm:py-6 px-4 sm:px-8 text-caixa-extra-light font-bold text-xs sm:text-sm">CLIENTE</th>
                  <th className="text-left py-4 sm:py-6 px-4 sm:px-8 text-caixa-extra-light font-bold text-xs sm:text-sm">STATUS</th>
                  <th className="text-left py-4 sm:py-6 px-4 sm:px-8 text-caixa-extra-light font-bold text-xs sm:text-sm">DATA</th>
                </tr>
              </thead>
              <tbody>
                {/* ✅ USAR APENAS CLIENTES QUE REALMENTE ESTÃO AGUARDANDO */}
                {clientesRealmenteAguardando && clientesRealmenteAguardando.length > 0 ? (
                  clientesRealmenteAguardando.slice(0, 8).map((cliente, index) => (
                    <tr key={cliente.id} className="border-b border-caixa-primary/20 hover:bg-caixa-primary/20 transition-colors">
                      <td className="py-4 sm:py-6 px-4 sm:px-8">
                        <div className="flex items-center gap-2 sm:gap-4">
                          <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-full bg-caixa-orange flex items-center justify-center text-white font-bold relative shadow-lg text-xs sm:text-base">
                            {cliente.nome?.charAt(0) || 'C'}
                            <div className="absolute -top-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 bg-yellow-400 rounded-full border-2 border-caixa-primary animate-pulse"></div>
                          </div>
                          <div className="min-w-0">
                            <span className="text-white font-semibold text-sm sm:text-base truncate block">{cliente.nome || 'Cliente'}</span>
                            <p className="text-caixa-extra-light text-xs">ID: {cliente.id || '000'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 sm:py-6 px-4 sm:px-8">
                        {/* ✅ MOSTRAR STATUS CORRETO COM COR ADEQUADA */}
                        <span className={`inline-block px-3 sm:px-5 py-1 sm:py-2 rounded-full text-xs sm:text-sm font-bold shadow-lg border-2 transition-all duration-200 hover:scale-105 cursor-pointer ${getStatusColor(cliente.status)}`}>
                          {getStatusDisplay(cliente.status)}
                        </span>
                      </td>
                      <td className="py-4 sm:py-6 px-4 sm:px-8 text-white/70 text-xs sm:text-sm">
                        {cliente.created_at ? new Date(cliente.created_at).toLocaleDateString('pt-BR') : '-'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3" className="py-12 sm:py-16 text-center">
                      <ClipboardList className="w-12 h-12 sm:w-16 sm:h-16 text-caixa-primary/50 mx-auto mb-4" />
                      <p className="text-caixa-extra-light text-sm sm:text-lg">Nenhum cliente aguardando aprovação</p>
                      <p className="text-caixa-extra-light/50 text-xs sm:text-sm mt-2">Todos os clientes foram processados</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default DashboardAdministrador;