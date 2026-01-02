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
  Award,
  Star,
  CheckCircle,
  XCircle,
  Mail,
  Phone,
  RefreshCw
} from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "../../context/AuthContext";
import LineChart from "./Charts/LineChart";
import PieChart from "./Charts/PieChart";

const DashboardCorretor = () => {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [activeChart, setActiveChart] = useState("monthly");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

  // Nome do sistema do .env
  const nomeSistema = process.env.REACT_APP_NOME_SISTEMA || "CAIXA CRM";

  // Função para buscar dados APENAS do corretor logado
  const fetchDashboardData = async () => {
    try {
      setRefreshing(true);
      const authToken = localStorage.getItem('authToken');
      
      const headers = {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      };

      // Buscar APENAS clientes do corretor logado
      const clientesResponse = await fetch(`${API_URL}/clientes?created_by=${user.id}`, { headers });
      if (!clientesResponse.ok) {
        throw new Error(`Erro ao buscar clientes: ${clientesResponse.status}`);
      }
      const clientesData = await clientesResponse.json();
      const meusClientes = clientesData.clientes || [];

      console.log('🔍 Clientes do corretor:', meusClientes);

      // Processar dados dos MEUS clientes
      const totalMeusClientes = meusClientes.length;
      const clientesAprovados = meusClientes.filter(c => c.status === 'aprovado').length;
      const clientesReprovados = meusClientes.filter(c => c.status === 'reprovado').length;
      const clientesAguardando = meusClientes.filter(c => c.status === 'aguardando_aprovacao' || c.status === 'pendente');
      const clientesPendentes = meusClientes.filter(c => c.status === 'pendente').length;

      // Calcular métricas temporais APENAS dos meus clientes
      const hoje = new Date();
      const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      const inicioSemana = new Date(hoje);
      inicioSemana.setDate(hoje.getDate() - hoje.getDay());

      const clientesEsteMes = meusClientes.filter(c => 
        new Date(c.created_at) >= inicioMes
      ).length;

      const clientesHoje = meusClientes.filter(c => 
        new Date(c.created_at).toDateString() === hoje.toDateString()
      ).length;

      const clientesSemana = meusClientes.filter(c => 
        new Date(c.created_at) >= inicioSemana
      ).length;

      // Calcular crescimento semanal (comparar com semana anterior)
      const semanaPassada = new Date(inicioSemana);
      semanaPassada.setDate(semanaPassada.getDate() - 7);
      const clientesSemanaPassada = meusClientes.filter(c => {
        const dataCliente = new Date(c.created_at);
        return dataCliente >= semanaPassada && dataCliente < inicioSemana;
      }).length;

      const crescimentoSemanal = clientesSemanaPassada > 0 
        ? Math.round(((clientesSemana - clientesSemanaPassada) / clientesSemanaPassada) * 100)
        : clientesSemana > 0 ? 100 : 0;

      // Calcular crescimento mensal (comparar com mês anterior)
      const mesPassado = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
      const fimMesPassado = new Date(hoje.getFullYear(), hoje.getMonth(), 0);
      const clientesMesPassado = meusClientes.filter(c => {
        const dataCliente = new Date(c.created_at);
        return dataCliente >= mesPassado && dataCliente <= fimMesPassado;
      }).length;

      const crescimentoMensal = clientesMesPassado > 0 
        ? Math.round(((clientesEsteMes - clientesMesPassado) / clientesMesPassado) * 100)
        : clientesEsteMes > 0 ? 100 : 0;

      // Calcular performance do corretor
      const taxaAprovacao = totalMeusClientes > 0 
        ? Math.round((clientesAprovados / totalMeusClientes) * 100) 
        : 0;

      const taxaRejeicao = totalMeusClientes > 0 
        ? Math.round((clientesReprovados / totalMeusClientes) * 100) 
        : 0;

      const eficienciaMedia = totalMeusClientes > 0 
        ? Math.round(((clientesAprovados + clientesPendentes) / totalMeusClientes) * 10) / 10
        : 0;

      // Análise de renda dos MEUS clientes
      const clientesComRenda = meusClientes.filter(c => c.valor_renda && c.valor_renda > 0);
      const rendas = clientesComRenda.map(c => parseFloat(c.valor_renda));
      const rendaMedia = rendas.length > 0 ? (rendas.reduce((a, b) => a + b, 0) / rendas.length).toFixed(2) : '0.00';
      const rendaMaxima = rendas.length > 0 ? Math.max(...rendas).toFixed(2) : '0.00';
      const rendaMinima = rendas.length > 0 ? Math.min(...rendas).toFixed(2) : '0.00';

      // Dados mensais para gráfico (APENAS meus clientes)
      const mesesLabels = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
      const dadosMensais = Array(12).fill(0);
      
      meusClientes.forEach(cliente => {
        const mes = new Date(cliente.created_at).getMonth();
        dadosMensais[mes]++;
      });

      // Dados semanais para gráfico (APENAS meus clientes)
      const diasSemana = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
      const dadosSemanais = Array(7).fill(0);
      
      meusClientes.forEach(cliente => {
        const diaSemana = new Date(cliente.created_at).getDay();
        dadosSemanais[diaSemana]++;
      });

      // Estruturar dados do dashboard DO CORRETOR
      setDashboardData({
        totalClientes: totalMeusClientes,
        clientesEsteMes: clientesEsteMes,
        clientesAguardandoAprovacao: clientesAguardando,
        totalClientesAguardandoAprovacao: clientesAguardando.length,
        clientesAprovados: clientesAprovados,
        clientesReprovados: clientesReprovados,
        clientesPendentes: clientesPendentes,
        clientesHoje: clientesHoje,
        clientesSemana: clientesSemana,
        crescimentoSemanal: crescimentoSemanal,
        crescimentoMensal: crescimentoMensal,
        usuariosAtivosHoje: 1, // Sempre 1 para o corretor
        performance: {
          eficienciaMedia: eficienciaMedia,
          taxaAprovacao: taxaAprovacao,
          taxaRejeicao: taxaRejeicao,
          totalUsuarios: 1
        },
        rendaAnalysis: {
          rendaMedia: rendaMedia,
          rendaMaxima: rendaMaxima,
          rendaMinima: rendaMinima,
          clientesComRenda: clientesComRenda.length
        },
        meusClientesAprovados: meusClientes.filter(c => c.status === 'aprovado'),
        // ✅ NOVO: Todos os meus clientes para visualização
        todosOsMeusClientes: meusClientes
      });

      // Estruturar dados dos gráficos DO CORRETOR
      setChartData({
        monthly: {
          labels: mesesLabels,
          datasets: [
            {
              label: "Meus Clientes Cadastrados",
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
              label: "Meus Clientes por Dia",
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

      setError(null);
      console.log('✅ Dados do corretor carregados:', {
        totalClientes: totalMeusClientes,
        aprovados: clientesAprovados,
        aguardando: clientesAguardando.length,
        taxaAprovacao: taxaAprovacao
      });

    } catch (error) {
      console.error('❌ Erro ao buscar dados do corretor:', error);
      setError(`Erro ao carregar seus dados: ${error.message}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Carregar dados ao montar o componente
  useEffect(() => {
    if (user?.id) {
      fetchDashboardData();
    }
  }, [user?.id]);

  // Função para refresh manual
  const handleRefresh = () => {
    fetchDashboardData();
  };

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
          <p className="text-caixa-extra-light mb-6">Processando suas métricas pessoais</p>
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
          <h2 className="text-3xl font-bold text-white text-center mb-6">Erro ao Carregar</h2>
          <p className="text-slate-300 text-center text-lg mb-8">{error}</p>
          <div className="text-center space-y-4">
            <button 
              onClick={handleRefresh}
              className="px-8 py-3 bg-gradient-to-r from-caixa-orange to-caixa-red hover:from-caixa-red hover:to-caixa-orange text-white rounded-xl transition-all duration-300 font-semibold shadow-lg shadow-caixa-orange/25 w-full"
            >
              Tentar Novamente
            </button>
            <button 
              onClick={() => window.location.reload()}
              className="px-8 py-3 bg-caixa-primary/50 hover:bg-caixa-primary/70 text-white rounded-xl transition-all duration-300 font-semibold w-full"
            >
              Recarregar Página
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return null;
  }

  const {
    totalClientes,
    clientesEsteMes,
    clientesAguardandoAprovacao,
    totalClientesAguardandoAprovacao,
    clientesAprovados,
    clientesReprovados,
    clientesPendentes,
    clientesHoje,
    clientesSemana,
    crescimentoSemanal,
    crescimentoMensal,
    performance,
    rendaAnalysis,
    meusClientesAprovados,
    todosOsMeusClientes = [] // <-- fallback para array vazio
  } = dashboardData;

  // Calcular métricas derivadas
  const metaMensal = 50; // Meta fixa ou pode vir da API
  const taxaAprovacao = performance.taxaAprovacao || 0;
  const performanceScore = Math.round((taxaAprovacao + performance.eficienciaMedia * 10) / 2);

  const statsCards = [
    {
      title: "Meus Clientes",
      value: totalClientes,
      icon: Users,
      change: `${crescimentoSemanal >= 0 ? '+' : ''}${crescimentoSemanal}%`,
      isPositive: crescimentoSemanal >= 0,
      color: "bg-gradient-to-r from-caixa-primary to-caixa-secondary",
      metric: `Este mês: ${clientesEsteMes}`,
      borderColor: "border-caixa-primary/30",
      textColor: "text-caixa-light"
    },
    {
      title: "Total Cadastros",
      value: totalClientes,
      icon: ClipboardList,
      change: totalClientes > 0 ? "Clientes ativos" : "Nenhum cliente",
      isPositive: totalClientes > 0,
      color: "bg-gradient-to-r from-caixa-secondary to-caixa-light",
      metric: `Hoje: ${clientesHoje}`,
      borderColor: "border-caixa-secondary/30",
      textColor: "text-caixa-extra-light"
    },
    {
      title: "Minha Meta", 
      value: `${Math.round((clientesEsteMes / metaMensal) * 100)}%`,
      icon: Target,
      change: `${clientesEsteMes}/${metaMensal}`,
      isPositive: (clientesEsteMes / metaMensal) >= 0.8,
      color: "bg-caixa-gradient",
      metric: `Faltam: ${Math.max(0, metaMensal - clientesEsteMes)}`,
      borderColor: "border-caixa-primary/30",
      textColor: "text-caixa-secondary"
    },
    {
      title: "Minha Performance",
      value: `${performanceScore}%`,
      icon: Award,
      change: `${taxaAprovacao}% aprovação`,
      isPositive: taxaAprovacao >= 70,
      color: "bg-gradient-to-r from-caixa-light to-caixa-extra-light",
      metric: `Eficiência: ${performance.eficienciaMedia}`,
      borderColor: "border-caixa-light/30",
      textColor: "text-caixa-extra-light"
    }
  ];

  return (
    <div className="min-h-screen bg-caixa-gradient p-4">
      <div className="max-w-8xl mx-auto space-y-6">

        {/* Header do Corretor */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="backdrop-blur-xl bg-white/10 rounded-3xl p-6 border border-caixa-primary/30"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-caixa-orange to-caixa-orange-light rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-lg">
                {user?.first_name?.charAt(0) || 'C'}
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">
                  Meu Dashboard - {user?.first_name || 'Corretor'}
                </h1>
                <p className="text-caixa-extra-light">Acompanhe suas métricas e performance pessoal</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="p-2 bg-caixa-primary/20 hover:bg-caixa-primary/30 rounded-lg border border-caixa-primary/30 transition-colors disabled:opacity-50"
                title="Atualizar meus dados"
              >
                <RefreshCw className={`w-5 h-5 text-caixa-light ${refreshing ? 'animate-spin' : ''}`} />
              </button>
              <div className="px-4 py-2 bg-caixa-orange/20 rounded-xl border border-caixa-orange/30">
                <span className="text-caixa-orange font-semibold">Minha Taxa: {taxaAprovacao}%</span>
              </div>
              <div className="px-4 py-2 bg-caixa-primary/20 rounded-xl border border-caixa-primary/30">
                <span className="text-caixa-light font-semibold">{totalClientes} meus clientes</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Status Cards */}
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
                  style={{width: index === 2 ? `${(clientesEsteMes / metaMensal) * 100}%` : "75%"}}
                ></div>
              </div>
              <p className="text-xs text-caixa-extra-light mt-1">{card.metric}</p>
            </div>
          ))}
        </motion.div>

        {/* Analytics Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Main Chart */}
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
                    {activeChart === "monthly" ? "Minha Performance Mensal" : "Minha Atividade Semanal"}
                  </h2>
                  <p className="text-caixa-extra-light mt-1">Seus dados pessoais de clientes</p>
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
              {chartData && (
                activeChart === "monthly" ? (
                  <LineChart data={chartData.monthly} />
                ) : (
                  <PieChart data={chartData.weekly} />
                )
              )}
              <div className="absolute top-4 right-4 bg-caixa-primary/80 backdrop-blur-sm rounded-xl p-3 border border-caixa-light/30">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-caixa-orange rounded-full animate-pulse"></div>
                  <span className="text-caixa-extra-light text-sm font-semibold">Meus Dados</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Painel de Meus Clientes Aprovados */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-4 backdrop-blur-xl bg-white/10 rounded-3xl p-6 border border-caixa-primary/30 shadow-xl shadow-caixa-primary/20"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-caixa-success rounded-xl shadow-lg">
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Meus Clientes Aprovados</h3>
                <p className="text-caixa-extra-light text-sm">{clientesAprovados} clientes que aprovei</p>
              </div>
            </div>
            
            <div className="space-y-4 max-h-80 overflow-y-auto">
              {meusClientesAprovados && meusClientesAprovados.length > 0 ? (
                meusClientesAprovados.slice(0, 8).map((cliente, index) => (
                  <div 
                    key={cliente.id} 
                    className="flex items-center gap-4 p-4 rounded-xl transition-all duration-300 border bg-caixa-success/10 border-caixa-success/20 hover:bg-caixa-success/20"
                  >
                    <div className="w-12 h-12 rounded-full bg-caixa-success flex items-center justify-center text-white font-bold shadow-lg">
                      {cliente.nome?.charAt(0) || 'C'}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-white">
                        {cliente.nome || 'Cliente'}
                      </p>
                      <div className="flex items-center gap-3 mt-1">
                        <p className="text-caixa-extra-light text-sm flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(cliente.created_at).toLocaleDateString('pt-BR')}
                        </p>
                        <span className="text-caixa-success text-sm font-medium">
                          R$ {cliente.valor_renda ? parseFloat(cliente.valor_renda).toLocaleString('pt-BR', {minimumFractionDigits: 2}) : '0,00'}
                        </span>
                      </div>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-caixa-success/20 flex items-center justify-center border-2 border-caixa-success">
                      <CheckCircle className="w-4 h-4 text-caixa-success" />
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <CheckCircle className="w-16 h-16 text-caixa-primary/50 mx-auto mb-4" />
                  <p className="text-caixa-extra-light">Nenhum cliente aprovado ainda</p>
                  <p className="text-caixa-extra-light text-xs mt-2">Continue trabalhando para aprovar seus primeiros clientes!</p>
                </div>
              )}
              
              {meusClientesAprovados && meusClientesAprovados.length > 8 && (
                <div className="text-center pt-4 border-t border-caixa-primary/20">
                  <button className="text-caixa-orange hover:text-white text-sm font-medium flex items-center gap-2 mx-auto">
                    <Eye className="w-4 h-4" />
                    Ver todos os {clientesAprovados} clientes
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Minha Performance Metrics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {/* Minha Taxa de Aprovação */}
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
                  strokeDashoffset={339.29 - (339.29 * taxaAprovacao) / 100}
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
                  <div className="text-3xl font-bold text-white">{taxaAprovacao}%</div>
                  <div className="text-green-400 text-sm font-medium">Aprovados</div>
                </div>
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-white font-semibold text-lg mb-2">Minha Taxa de Aprovação</h3>
              <p className="text-caixa-extra-light text-sm">{clientesAprovados} de {totalClientes} meus clientes</p>
            </div>
          </div>

          {/* Meu Performance Score */}
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
                  stroke="url(#blueGradient)"
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray="339.29"
                  strokeDashoffset={339.29 - (339.29 * performanceScore) / 100}
                  className="transition-all duration-1000 ease-out"
                />
                <defs>
                  <linearGradient id="blueGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#1B4F72" />
                    <stop offset="100%" stopColor="#5DADE2" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div>
                  <div className="text-3xl font-bold text-white">{performanceScore}%</div>
                  <div className="text-caixa-light text-sm font-medium">Performance</div>
                </div>
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-white font-semibold text-lg mb-2">Meu Performance Score</h3>
              <p className="text-caixa-extra-light text-sm">Minha Eficiência: {performance.eficienciaMedia}</p>
            </div>
          </div>

          {/* Meu Progresso da Meta */}
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
                  stroke="url(#orangeGradient)"
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray="339.29"
                  strokeDashoffset={339.29 - (339.29 * (clientesEsteMes / metaMensal)) / 1}
                  className="transition-all duration-1000 ease-out"
                />
                <defs>
                  <linearGradient id="orangeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#FF8C00" />
                    <stop offset="100%" stopColor="#FFB347" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div>
                  <div className="text-3xl font-bold text-white">{Math.round((clientesEsteMes / metaMensal) * 100)}%</div>
                  <div className="text-caixa-orange text-sm font-medium">da Meta</div>
                </div>
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-white font-semibold text-lg mb-2">Minha Meta Mensal</h3>
              <p className="text-caixa-extra-light text-sm">{clientesEsteMes} de {metaMensal} clientes</p>
            </div>
          </div>
        </motion.div>

        {/* ✅ NOVA SEÇÃO: Meus Clientes Cadastrados (apenas visualização) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="backdrop-blur-xl bg-white/10 rounded-3xl border border-caixa-primary/30 overflow-hidden shadow-xl shadow-caixa-primary/20"
        >
          <div className="p-8 border-b border-caixa-primary/30 bg-gradient-to-r from-caixa-primary/30 to-caixa-secondary/20">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-caixa-orange rounded-xl shadow-lg">
                  <ClipboardList className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Meus Clientes Cadastrados</h2>
                  <p className="text-caixa-extra-light mt-1">{clientesAguardandoAprovacao?.length || 0} aguardando aprovação</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="w-5 h-5 text-caixa-light absolute left-4 top-1/2 transform -translate-y-1/2" />
                  <input 
                    type="text" 
                    placeholder="Buscar meu cliente..."
                    className="bg-caixa-primary/50 border border-caixa-light/30 rounded-xl pl-12 pr-4 py-3 text-white placeholder-caixa-extra-light/50 focus:outline-none focus:ring-2 focus:ring-caixa-orange focus:border-caixa-orange"
                  />
                </div>
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-caixa-primary/60">
                <tr>
                  <th className="text-left py-6 px-8 text-caixa-extra-light font-bold">MEU CLIENTE</th>
                  <th className="text-left py-6 px-8 text-caixa-extra-light font-bold">CONTATO</th>
                  <th className="text-left py-6 px-8 text-caixa-extra-light font-bold">STATUS</th>
                  <th className="text-left py-6 px-8 text-caixa-extra-light font-bold">DATA CADASTRO</th>
                </tr>
              </thead>
              <tbody>
                {clientesAguardandoAprovacao && clientesAguardandoAprovacao.length > 0 ? clientesAguardandoAprovacao.map((cliente, index) => (
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
                      <div className="flex items-center gap-2">
                        {cliente.status === 'aprovado' ? (
                          <div className="flex items-center gap-2 px-3 py-1 bg-green-600/20 rounded-full">
                            <CheckCircle className="w-4 h-4 text-green-400" />
                            <span className="text-green-400 text-sm font-medium">Aprovado</span>
                          </div>
                        ) : cliente.status === 'reprovado' ? (
                          <div className="flex items-center gap-2 px-3 py-1 bg-red-600/20 rounded-full">
                            <XCircle className="w-4 h-4 text-red-400" />
                            <span className="text-red-400 text-sm font-medium">Reprovado</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 px-3 py-1 bg-yellow-600/20 rounded-full">
                            <Clock className="w-4 h-4 text-yellow-400" />
                            <span className="text-yellow-400 text-sm font-medium">Pendente</span>
                          </div>
                        )}
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
                )) : (
                  <tr>
                    <td colSpan="4" className="py-16 text-center">
                      <ClipboardList className="w-16 h-16 text-caixa-primary/50 mx-auto mb-4" />
                      <p className="text-caixa-extra-light text-lg">Nenhum cliente aguardando aprovação!</p>
                      <p className="text-caixa-extra-light text-sm mt-2">Todos os seus clientes já foram processados.</p>
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

export default DashboardCorretor;
