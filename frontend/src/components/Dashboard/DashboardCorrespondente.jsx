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
  CheckCircle,
  XCircle,
  Mail,
  Phone
} from "lucide-react";
import { motion } from "framer-motion";
import LineChart from "./Charts/LineChart";
import PieChart from "./Charts/PieChart";

const DashboardCorrespondente = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [systemStats, setSystemStats] = useState(null);
  const [activeChart, setActiveChart] = useState("monthly");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

  // Nome do sistema do .env
  const nomeSistema = process.env.REACT_APP_NOME_SISTEMA || "CAIXA CRM";

  // Função para buscar TODOS os clientes (para correspondente)
  const fetchDashboardData = async () => {
    try {
      const authToken = localStorage.getItem('authToken');
      const headers = {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      };

      // ✅ BUSCAR DADOS DO DASHBOARD (incluindo ranking)
      const dashboardResponse = await fetch(`${API_URL}/dashboard`, { headers });
      if (!dashboardResponse.ok) {
        throw new Error(`Erro ao buscar dados do dashboard: ${dashboardResponse.status}`);
      }
      const dashboardData = await dashboardResponse.json();

      // ✅ BUSCAR TODOS OS CLIENTES
      const clientesResponse = await fetch(`${API_URL}/clientes`, { headers });
      if (!clientesResponse.ok) {
        throw new Error(`Erro ao buscar clientes: ${clientesResponse.status}`);
      }
      const clientesData = await clientesResponse.json();
      const todosClientes = clientesData.clientes || [];

      console.log('📊 Dashboard data:', dashboardData);
      console.log('📊 Todos os clientes:', todosClientes);

      // Processar métricas de TODOS os clientes
      const totalClientes = todosClientes.length;
      const clientesAprovados = todosClientes.filter(c => c.status === 'aprovado').length;
      const clientesReprovados = todosClientes.filter(c => c.status === 'reprovado').length;
      const clientesPendentes = todosClientes.filter(c => c.status === 'pendente' || c.status === 'aguardando_aprovacao').length;
      const clientesAguardandoAprovacao = todosClientes.filter(c => c.status === 'aguardando_aprovacao' || c.status === 'pendente');

      // Calcular métricas temporais
      const hoje = new Date();
      const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      const inicioSemana = new Date(hoje);
      inicioSemana.setDate(hoje.getDate() - hoje.getDay());

      const clientesEsteMes = todosClientes.filter(c => 
        new Date(c.created_at) >= inicioMes
      ).length;

      const clientesHoje = todosClientes.filter(c => 
        new Date(c.created_at).toDateString() === hoje.toDateString()
      ).length;

      const clientesSemana = todosClientes.filter(c => 
        new Date(c.created_at) >= inicioSemana
      ).length;

      // Calcular crescimento semanal
      const semanaPassada = new Date(inicioSemana);
      semanaPassada.setDate(semanaPassada.getDate() - 7);
      const clientesSemanaPassada = todosClientes.filter(c => {
        const dataCliente = new Date(c.created_at);
        return dataCliente >= semanaPassada && dataCliente < inicioSemana;
      }).length;

      const crescimentoSemanal = clientesSemanaPassada > 0 
        ? Math.round(((clientesSemana - clientesSemanaPassada) / clientesSemanaPassada) * 100)
        : clientesSemana > 0 ? 100 : 0;

      // Calcular crescimento mensal
      const mesPassado = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
      const fimMesPassado = new Date(hoje.getFullYear(), hoje.getMonth(), 0);
      const clientesMesPassado = todosClientes.filter(c => {
        const dataCliente = new Date(c.created_at);
        return dataCliente >= mesPassado && dataCliente <= fimMesPassado;
      }).length;

      const crescimentoMensal = clientesMesPassado > 0 
        ? Math.round(((clientesEsteMes - clientesMesPassado) / clientesMesPassado) * 100)
        : clientesEsteMes > 0 ? 100 : 0;

      // Calcular performance geral
      const taxaAprovacao = totalClientes > 0 
        ? Math.round((clientesAprovados / totalClientes) * 100) 
        : 0;

      const eficienciaMedia = totalClientes > 0 
        ? Math.round(((clientesAprovados + clientesPendentes) / totalClientes) * 10) / 10
        : 0;

      // Dados mensais para gráfico (TODOS os clientes)
      const mesesLabels = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
      const dadosMensais = Array(12).fill(0);
      
      todosClientes.forEach(cliente => {
        const mes = new Date(cliente.created_at).getMonth();
        dadosMensais[mes]++;
      });

      // Dados semanais para gráfico (TODOS os clientes)
      const diasSemana = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
      const dadosSemanais = Array(7).fill(0);
      
      todosClientes.forEach(cliente => {
        const diaSemana = new Date(cliente.created_at).getDay();
        dadosSemanais[diaSemana]++;
      });

      // Estruturar dados do dashboard
      setDashboardData({
        totalCorretores: dashboardData.totalCorretores || 0,
        totalClientes: totalClientes,
        totalCorrespondentes: dashboardData.totalCorrespondentes || 0,
        totalClientesAguardandoAprovacao: clientesPendentes,
        clientesAguardandoAprovacao: clientesAguardandoAprovacao,
        todosOsClientes: todosClientes, // ✅ TODOS os clientes
        top5Usuarios: dashboardData.top5Usuarios || [], // ✅ USAR RANKING DA API
        crescimentoSemanal: crescimentoSemanal,
        crescimentoMensal: crescimentoMensal,
        usuariosAtivosHoje: dashboardData.usuariosAtivosHoje || 0,
        clientesHoje: clientesHoje,
        clientesSemana: clientesSemana,
        clientesEsteMes: clientesEsteMes,
        performance: {
          eficienciaMedia: eficienciaMedia,
          taxaAprovacao: taxaAprovacao,
          totalUsuarios: dashboardData.performance?.totalUsuarios || 0
        },
        clientesAprovados: clientesAprovados,
        clientesReprovados: clientesReprovados,
        clientesPendentes: clientesPendentes,
        rendaAnalysis: dashboardData.rendaAnalysis || {
          rendaMedia: 0,
          rendaMaxima: 0,
          rendaMinima: 0,
          clientesComRenda: 0
        }
      });

      // Estruturar dados dos gráficos (TODOS os clientes)
      setChartData({
        monthly: {
          labels: mesesLabels,
          datasets: [
            {
              label: "Todos os Clientes Cadastrados",
              data: dadosMensais,
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
          labels: diasSemana,
          datasets: [
            {
              label: "Todos os Clientes por Dia",
              data: dadosSemanais,
              backgroundColor: [
                "#1B4F72",  // caixa-primary
                "#2980B9",  // caixa-secondary
                "#5DADE2",  // caixa-light
                "#AED6F1",  // caixa-extra-light
                "#FF8C00",  // caixa-orange
                "#FFB347",  // caixa-orange-light
                "#FF7F00"   // caixa-orange-dark
              ],
              borderColor: "#1B4F72",
              borderWidth: 2,
              borderRadius: 8
            },
          ],
        }
      });

      // Estatísticas do sistema
      setSystemStats({
        usuariosRecentes: dashboardData.usuariosAtivosHoje || 0,
        totalUsuarios: dashboardData.performance?.totalUsuarios || 0,
        sistemaOnline: true
      });

      setError(null);
      console.log('✅ Dashboard do correspondente carregado:', {
        totalClientes: totalClientes,
        aprovados: clientesAprovados,
        pendentes: clientesPendentes,
        taxaAprovacao: taxaAprovacao,
        top5Usuarios: dashboardData.top5Usuarios || []
      });

    } catch (error) {
      console.error('❌ Erro ao buscar dados do dashboard:', error);
      setError(`Erro ao carregar dados: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Carregar todos os dados
  useEffect(() => {
    fetchDashboardData();
    
    // Atualizar dados a cada 30 segundos
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-caixa-gradient flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <Loader2 className="animate-spin h-20 w-20 mx-auto text-caixa-orange mb-8" />
            <div className="absolute inset-0 h-20 w-20 mx-auto border-4 border-caixa-primary/30 border-t-caixa-orange rounded-full animate-pulse"></div>
            <div className="absolute inset-2 h-16 w-16 mx-auto border-2 border-caixa-secondary/20 border-t-caixa-light rounded-full animate-spin" style={{animationDirection: 'reverse', animationDuration: '3s'}}></div>
          </div>
          <p className="text-3xl font-bold text-white mb-2">Carregando Dashboard {nomeSistema}...</p>
          <p className="text-caixa-extra-light mb-6">Processando dados em tempo real</p>
          <div className="w-80 mx-auto bg-caixa-primary/50 rounded-full h-3 overflow-hidden">
            <div className="bg-gradient-to-r from-caixa-orange via-caixa-orange-light to-caixa-orange h-3 rounded-full animate-pulse shadow-lg shadow-caixa-orange/25" style={{width: "75%"}}></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-caixa-gradient flex items-center justify-center">
        <div className="backdrop-blur-xl bg-white/10 p-10 rounded-3xl shadow-2xl max-w-lg w-full border border-caixa-primary/30">
          <AlertTriangle className="h-20 w-20 mx-auto text-caixa-orange mb-8 animate-pulse" />
          <h2 className="text-3xl font-bold text-white text-center mb-6">Sistema Indisponível</h2>
          <p className="text-slate-300 text-center text-lg mb-8">{error}</p>
          <div className="text-center">
            <button 
              onClick={() => window.location.reload()}
              className="px-8 py-3 bg-gradient-to-r from-caixa-orange to-caixa-red hover:from-caixa-red hover:to-caixa-orange text-white rounded-xl transition-all duration-300 font-semibold shadow-lg shadow-caixa-orange/25"
            >
              Tentar Novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Se não há dados ainda, mostrar loading
  if (!dashboardData || !chartData || !systemStats) {
    return (
      <div className="min-h-screen bg-caixa-gradient flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin h-16 w-16 text-caixa-orange mb-4" />
          <p className="text-white text-lg">Carregando dados do dashboard...</p>
        </div>
      </div>
    );
  }

  // Dados seguros com fallbacks
  const {
    totalCorretores = 0,
    totalClientes = 0,
    totalCorrespondentes = 0,
    totalClientesAguardandoAprovacao = 0,
    clientesAguardandoAprovacao = [],
    todosOsClientes = [], // ✅ TODOS os clientes
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
    rendaAnalysis = {}
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

  const statsCards = [
    {
      title: "Correspondentes",
      value: totalCorretores || 0,
      icon: ClipboardList,
      change: "+0%",
      isPositive: true,
      color: "bg-gradient-to-r from-caixa-primary to-caixa-secondary",
      metric: `Eficiência: ${performance?.eficienciaMedia || 0}%`,
      borderColor: "border-caixa-primary/30",
      textColor: "text-caixa-light"
    },
    {
      title: "Aguardando",
      // ✅ MOSTRAR APENAS O COUNT DOS QUE REALMENTE ESTÃO AGUARDANDO
      value: clientesRealmenteAguardando.length,
      icon: Clock,
      change: clientesHoje > 0 ? `+${clientesHoje}` : "0",
      isPositive: false,
      color: "bg-gradient-to-r from-caixa-secondary to-caixa-light",
      metric: `Hoje: ${clientesHoje || 0}`,
      borderColor: "border-caixa-secondary/30",
      textColor: "text-caixa-extra-light"
    },
    {
      title: "Total de Clientes", 
      value: totalClientes || 0,
      icon: UserCheck,
      change: crescimentoSemanal > 0 ? `+${crescimentoSemanal}%` : `${crescimentoSemanal || 0}%`,
      isPositive: (crescimentoSemanal || 0) >= 0,
      color: "bg-caixa-gradient",
      metric: `Aprovação: ${performance?.taxaAprovacao || 0}%`,
      borderColor: "border-caixa-primary/30",
      textColor: "text-caixa-secondary"
    },
    {
      title: "Online",
      value: systemStats?.usuariosRecentes || 0,
      icon: Signal,
      change: "+5%",
      isPositive: true,
      color: "bg-gradient-to-r from-caixa-light to-caixa-extra-light",
      metric: `Ativos: ${usuariosAtivosHoje || 0}`,
      borderColor: "border-caixa-light/30",
      textColor: "text-caixa-extra-light"
    }
  ];

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
    const statusColors = {
      'aguardando_aprovacao': 'bg-yellow-600/20 text-yellow-400',
      'proposta_apresentada': 'bg-blue-600/20 text-blue-400',
      'documentacao_pendente': 'bg-orange-600/20 text-orange-400',
      'visita_efetuada': 'bg-purple-600/20 text-purple-400',
      'aguardando_cancelamento_qv': 'bg-gray-600/20 text-gray-400',
      'aguardando_reserva_orcamentaria': 'bg-indigo-600/20 text-indigo-400',
      'condicionado': 'bg-amber-600/20 text-amber-400',
      'fechamento_proposta': 'bg-teal-600/20 text-teal-400',
      'conformidade': 'bg-cyan-600/20 text-cyan-400',
      'cliente_aprovado': 'bg-green-600/20 text-green-400',
      'concluido': 'bg-emerald-600/20 text-emerald-400',
      'reprovado': 'bg-red-600/20 text-red-400',
      'nao_deu_continuidade': 'bg-slate-600/20 text-slate-400',
      'processo_em_aberto': 'bg-stone-600/20 text-stone-400',
      'aprovado': 'bg-green-600/20 text-green-400',
      'em_andamento': 'bg-blue-600/20 text-blue-400',
      'finalizado': 'bg-emerald-600/20 text-emerald-400',
      'cancelado': 'bg-red-600/20 text-red-400'
    };
    
    return statusColors[status] || 'bg-gray-600/20 text-gray-400';
  };

  // ✅ FUNÇÃO PARA OBTER ÍCONE DO STATUS
  const getStatusIcon = (status) => {
    if (['aprovado', 'cliente_aprovado', 'concluido', 'finalizado'].includes(status)) {
      return CheckCircle;
    } else if (['reprovado', 'nao_deu_continuidade', 'cancelado'].includes(status)) {
      return XCircle;
    } else {
      return Clock;
    }
  };

  return (
    <div className="min-h-screen bg-caixa-gradient p-4">
      <div className="max-w-8xl mx-auto space-y-6">

        {/* System Status Bar - Cards pequenos */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-4 gap-4"
        >
          {statsCards.map((card, index) => (
            <div key={generateStableKey(card, index)} className="backdrop-blur-xl bg-white/10 rounded-xl p-4 border border-caixa-primary/30 hover:bg-white/15 transition-all duration-300">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <card.icon className="w-4 h-4 text-caixa-light" />
                  <span className="text-white/90 text-sm font-medium">{card.title}</span>
                </div>
                <span className="text-sm font-bold text-caixa-orange">{card.value}</span>
              </div>
              <div className="w-full bg-caixa-primary/30 rounded-full h-2">
                <div 
                  className="bg-caixa-orange h-2 rounded-full transition-all duration-1000 shadow-sm shadow-caixa-orange/30"
                  style={{width: card.value > 0 ? "75%" : "0%"}}
                ></div>
              </div>
            </div>
          ))}
        </motion.div>

        {/* Advanced Analytics Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Main Chart - Larger */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-8 backdrop-blur-xl bg-white/10 rounded-3xl p-8 border border-caixa-primary/30 shadow-xl shadow-caixa-primary/20"
          >
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-caixa-orange rounded-2xl shadow-lg">
                  <BarChart3 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    {activeChart === "monthly" ? "Análise Mensal - Todos os Clientes" : "Distribuição Semanal - Todos os Clientes"}
                  </h2>
                  <p className="text-caixa-extra-light mt-1">Dados de todos os clientes em tempo real</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex gap-1 bg-caixa-primary/50 rounded-xl p-1 border border-caixa-secondary/30">
                  <button
                    onClick={() => setActiveChart("monthly")}
                    className={`px-6 py-3 rounded-lg text-sm font-semibold transition-all duration-300 flex items-center gap-2 ${
                      activeChart === "monthly"
                        ? "bg-caixa-orange text-white shadow-lg shadow-caixa-orange/30"
                        : "text-white/70 hover:text-white hover:bg-caixa-secondary/30"
                    }`}
                  >
                    <LineChartIcon className="w-4 h-4" />
                    Mensal
                  </button>
                  <button
                    onClick={() => setActiveChart("weekly")}
                    className={`px-6 py-3 rounded-lg text-sm font-semibold transition-all duration-300 flex items-center gap-2 ${
                      activeChart === "weekly"
                        ? "bg-caixa-orange text-white shadow-lg shadow-caixa-orange/30"
                        : "text-white/70 hover:text-white hover:bg-caixa-secondary/30"
                    }`}
                  >
                    <BarChart3 className="w-4 h-4" />
                    Semanal
                  </button>
                </div>
                
              </div>
            </div>
            
            <div className="h-[350px] relative">
              {activeChart === "monthly" ? (
                <LineChart data={chartData.monthly} />
              ) : (
                <PieChart data={chartData.weekly} />
              )}
              <div className="absolute top-4 right-4 bg-caixa-primary/80 backdrop-blur-sm rounded-xl p-3 border border-caixa-light/30">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-caixa-orange rounded-full animate-pulse"></div>
                  <span className="text-caixa-extra-light text-sm font-semibold">Todos os Clientes</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right Panel - Elite Corretores */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-4 backdrop-blur-xl bg-white/10 rounded-3xl p-6 border border-caixa-primary/30 shadow-xl shadow-caixa-primary/20"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-caixa-orange rounded-xl shadow-lg">
                <Users className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white">Ranking do Mês</h3>
            </div>
            <div className="space-y-4">
              {top5Usuarios && top5Usuarios.length > 0 ? (
                top5Usuarios.slice(0, 5).map((item, index) => {
                  const user = item.user || {};
                  const firstName = user.first_name || "";
                  const lastName = user.last_name || "";
                  const nomeCompleto = firstName && lastName ? `${firstName} ${lastName}` : firstName || lastName || "Usuário";
                  const maxClientes = Math.max(...top5Usuarios.map(u => u.clientes || 0)) || 1;
                  
                  // ✅ Determinar tipo de usuário para exibição
                  let tipoUsuario = "Usuário";
                  if (user.is_administrador) tipoUsuario = "Admin";
                  else if (user.is_correspondente) tipoUsuario = "Correspondente";
                  else if (user.is_corretor) tipoUsuario = "Corretor";
                  
                  return (
                    <div key={`${user.id}-${index}`} className="flex items-center justify-between p-4 bg-caixa-primary/10 rounded-xl border border-caixa-primary/20 hover:bg-caixa-primary/20 transition-colors">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="flex-shrink-0 w-12 h-12 bg-caixa-orange rounded-full flex items-center justify-center">
                          <span className="text-white font-bold text-lg">
                            {firstName.charAt(0)}{lastName.charAt(0)}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-white font-semibold truncate">{nomeCompleto}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-caixa-extra-light text-sm">{tipoUsuario}</span>
                            <span className="text-caixa-primary">•</span>
                            <span className="text-white font-medium">{item.clientes} clientes</span> {/* ✅ Mudou de text-caixa-secondary para text-white */}
                          </div>
                          {/* Barra de progresso */}
                          <div className="w-full bg-caixa-primary/20 rounded-full h-2 mt-2">
                            <div 
                              className="bg-gradient-to-r from-caixa-orange to-caixa-secondary h-2 rounded-full transition-all duration-500"
                              style={{ 
                                width: `${Math.min((item.clientes / maxClientes) * 100, 100)}%` 
                              }}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 bg-caixa-orange/20 text-white border-caixa-orange">
                        #{index + 1}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8">
                  <Users className="w-16 h-16 text-caixa-primary/50 mx-auto mb-4" />
                  <p className="text-caixa-extra-light">Nenhum usuário com clientes ainda</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Circular Progress Charts */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {/* Chart Verde - Aprovados */}
          <div className="backdrop-blur-xl bg-white/10 rounded-2xl p-8 border border-caixa-primary/30 text-center">
            <div className="relative w-32 h-32 mx-auto mb-4">
              <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
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
                  <div className="text-3xl font-bold text-white">{porcentagemAprovados}%</div>
                  <div className="text-green-400 text-sm font-medium">Aprovados</div>
                </div>
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-white font-semibold text-lg mb-2">Taxa de Aprovação</h3>
              <p className="text-caixa-extra-light text-sm">{clientesAprovados || 0} clientes aprovados</p>
            </div>
          </div>

          {/* Chart Amarelo - Aguardando Aprovação */}
          <div className="backdrop-blur-xl bg-white/10 rounded-2xl p-8 border border-caixa-primary/30 text-center">
            <div className="relative w-32 h-32 mx-auto mb-4">
              <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
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
                  <div className="text-3xl font-bold text-white">{porcentagemAguardandoAprovacao}%</div>
                  <div className="text-yellow-400 text-sm font-medium">Em Análise</div>
                </div>
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-white font-semibold text-lg mb-2">Aguardando Aprovação</h3>
              {/* ✅ MOSTRAR APENAS COUNT DE AGUARDANDO APROVAÇÃO */}
              <p className="text-caixa-extra-light text-sm">{clientesRealmenteAguardando.length} aguardando aprovação</p>
            </div>
          </div>

          {/* Chart Vermelho - Rejeitados */}
          <div className="backdrop-blur-xl bg-white/10 rounded-2xl p-8 border border-caixa-primary/30 text-center">
            <div className="relative w-32 h-32 mx-auto mb-4">
              <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
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
                  <div className="text-3xl font-bold text-white">{porcentagemRejeitados}%</div>
                  <div className="text-red-400 text-sm font-medium">Rejeitados</div>
                </div>
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-white font-semibold text-lg mb-2">Taxa de Rejeição</h3>
              <p className="text-caixa-extra-light text-sm">{clientesReprovados || 0} clientes não aprovados</p>
            </div>
          </div>
        </motion.div>

        {/* ✅ TABELA: Todos os Clientes com Status Melhorado */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="backdrop-blur-xl bg-white/10 rounded-3xl border border-caixa-primary/30 overflow-hidden shadow-xl shadow-caixa-primary/20"
        >
          <div className="p-8 border-b border-caixa-primary/30 bg-gradient-to-r from-caixa-primary/30 to-caixa-secondary/20">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-caixa-orange rounded-xl shadow-lg">
                  <Database className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Todos os Clientes</h2>
                  <p className="text-caixa-extra-light mt-1">{todosOsClientes.length} clientes cadastrados no sistema</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="w-5 h-5 text-caixa-light absolute left-4 top-1/2 transform -translate-y-1/2" />
                  <input 
                    type="text" 
                    placeholder="Buscar cliente..."
                    className="bg-caixa-primary/50 border border-caixa-light/30 rounded-xl pl-12 pr-4 py-3 text-white placeholder-caixa-extra-light/50 focus:outline-none focus:ring-2 focus:ring-caixa-orange focus:border-caixa-orange"
                  />
                </div>
                <button className="px-6 py-3 bg-caixa-orange hover:bg-caixa-orange-dark text-white rounded-xl font-semibold transition-all duration-300 shadow-lg shadow-caixa-orange/25">
                  Exportar
                </button>
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-caixa-primary/60">
                <tr>
                  <th className="text-left py-6 px-8 text-caixa-extra-light font-bold">CLIENTE</th>
                  <th className="text-left py-6 px-8 text-caixa-extra-light font-bold">CONTATO</th>
                  <th className="text-left py-6 px-8 text-caixa-extra-light font-bold">STATUS</th>
                  <th className="text-left py-6 px-8 text-caixa-extra-light font-bold">DATA</th>
                </tr>
              </thead>
              <tbody>
                {todosOsClientes && todosOsClientes.length > 0 ? (
                  todosOsClientes.slice(0, 10).map((cliente, index) => {
                    const StatusIcon = getStatusIcon(cliente.status);
                    
                    return (
                      <tr key={cliente.id} className="border-b border-caixa-primary/20 hover:bg-caixa-primary/20 transition-colors">
                        <td className="py-6 px-8">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-caixa-orange flex items-center justify-center text-white font-bold shadow-lg">
                              {cliente.nome?.charAt(0) || 'C'}
                            </div>
                            <div>
                              <span className="text-white font-semibold">{cliente.nome || 'Cliente'}</span>
                              <p className="text-caixa-extra-light text-sm">ID: {cliente.id || '000'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-6 px-8">
                          <div className="text-white">
                            <div className="flex items-center gap-2 mb-1">
                              <Mail className="w-4 h-4 text-caixa-light" />
                              <span className="text-sm">{cliente.email || 'N/A'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Phone className="w-4 h-4 text-caixa-light" />
                              <span className="text-sm">{cliente.telefone || 'N/A'}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-6 px-8">
                          {/* ✅ STATUS MELHORADO COM CORES CORRETAS */}
                          <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${getStatusColor(cliente.status)}`}>
                            <StatusIcon className="w-4 h-4" />
                            <span className="text-sm font-medium">{getStatusDisplay(cliente.status)}</span>
                          </div>
                        </td>
                        <td className="py-6 px-8">
                          <div className="text-white flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-caixa-light" />
                            <span className="text-sm">
                              {cliente.created_at ? new Date(cliente.created_at).toLocaleDateString('pt-BR') : '-'}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="4" className="py-16 text-center">
                      <ClipboardList className="w-16 h-16 text-caixa-primary/50 mx-auto mb-4" />
                      <p className="text-caixa-extra-light text-lg">Nenhum cliente cadastrado</p>
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

export default DashboardCorrespondente;