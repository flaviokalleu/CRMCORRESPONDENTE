// src/components/AcessosList.jsx
import React, { useEffect, useState } from "react";
import generateStableKey from 'utils/generateStableKey';
import axios from "axios";
import { 
  Search, 
  Users, 
  Globe, 
  Smartphone, 
  Monitor, 
  Tablet, 
  Calendar,
  Filter,
  BarChart3,
  Download,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Activity,
  Eye,
  Clock,
  MapPin,
  Wifi,
  TrendingUp,
  Shield,
  Zap,
  User,
  RefreshCw,
  Settings,
  Bell,
  Star,
  Target,
  Layers,
  Database,
  Server,
  Cpu,
  Network,
  HardDrive,
  Gauge
} from "lucide-react";

const AcessosList = () => {
  const [acessos, setAcessos] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userFirstName, setUserFirstName] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    role: '',
    country: '',
    period: '7d',
    startDate: '',
    endDate: ''
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 20
  });
  const [showStats, setShowStats] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'table'

  useEffect(() => {
    fetchAcessos();
    fetchStats();
    fetchUserData();
  }, [pagination.currentPage, filters]);

  const fetchAcessos = async () => {
    setLoading(true);
    try {
      // Adapte os filtros para enviar startDate/endDate conforme o período
      let paramsObj = {
        page: pagination.currentPage,
        limit: pagination.itemsPerPage,
        ...filters,
      };

      if (filters.period) {
        const { startDate, endDate } = getDateRangeFromPeriod(filters.period);
        paramsObj.startDate = startDate;
        paramsObj.endDate = endDate;
        // Não envie o campo 'period' para o backend se ele não for usado lá
        delete paramsObj.period;
      }

      const params = new URLSearchParams(paramsObj);

      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/acessos?${params}`
      );
      const data = await response.json();
      
      setAcessos(data.acessos || []);
      setPagination(data.pagination || pagination);
    } catch (err) {
      setError("Erro ao buscar acessos.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/acessos/stats?period=${filters.period}`
      );
      const data = await response.json();
      setStats(data);
    } catch (err) {
      console.error("Erro ao buscar estatísticas:", err);
    }
  };

  const fetchUserData = async () => {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/user/me`
      );
      const data = await response.json();
      setUserFirstName(data.first_name);
    } catch (err) {
      console.error("Erro ao buscar dados do usuário:", err);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchAcessos(), fetchStats()]);
    setRefreshing(false);
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, currentPage: newPage }));
  };

  const getDeviceIcon = (deviceType) => {
    switch (deviceType?.toLowerCase()) {
      case 'mobile':
        return <Smartphone className="w-5 h-5 text-caixa-success" />;
      case 'tablet':
        return <Tablet className="w-5 h-5 text-caixa-secondary" />;
      default:
        return <Monitor className="w-5 h-5 text-caixa-light" />;
    }
  };

  // Função para pegar nome do usuário (se existir)
  const getUserName = (acesso) => {
    if (acesso.user && (acesso.user.first_name || acesso.user.last_name)) {
      return `${acesso.user.first_name || ''} ${acesso.user.last_name || ''}`.trim();
    }
    return acesso.user_id ? `Usuário #${acesso.user_id}` : 'Anônimo';
  };

  const getUserRole = (acesso) => {
    return acesso.user_id ? 'Usuário' : 'Visitante';
  };

  const getRoleColor = (acesso) => {
    return acesso.user_id 
      ? 'bg-caixa-secondary/20 text-caixa-light border border-caixa-secondary/40' 
      : 'bg-caixa-gray-400/20 text-caixa-gray-200 border border-caixa-gray-400/40';
  };

  const getGradientColors = () => {
    const colors = [
      'from-caixa-primary to-caixa-secondary',
      'from-caixa-secondary to-caixa-light', 
      'from-caixa-orange to-caixa-orange-light',
      'from-caixa-success to-caixa-info',
      'from-caixa-info to-caixa-secondary',
      'from-caixa-primary to-caixa-light'
    ];
    return colors;
  };

  // Remova o filtro local:
  // const filteredAcessos = acessos; // Não filtra localmente, usa o que vem da API

  // Novo filtro local para role e search (corrigido para incluir anônimos)
  const filteredAcessos = acessos.filter(acesso => {
    let match = true;
    // Filtra por role apenas se houver filtro e acesso.user
    if (filters.role) {
      if (!acesso.user || acesso.user.role !== filters.role) {
        match = false;
      }
    }
    // Filtra por search apenas se houver acesso.user
    if (filters.search) {
      if (acesso.user) {
        const searchLower = filters.search.toLowerCase();
        const nome = `${acesso.user.first_name || ''} ${acesso.user.last_name || ''}`.toLowerCase();
        const email = acesso.user.email?.toLowerCase() || '';
        if (!nome.includes(searchLower) && !email.includes(searchLower)) {
          match = false;
        }
      } else {
        match = false;
      }
    }
    return match;
  });

  // Definir dados das estatísticas
  const statsData = [
    { label: 'Total Acessos', value: stats?.totalAcessos || 0, icon: Eye, color: 'from-caixa-primary to-caixa-secondary' },
    { label: 'Corretores', value: stats?.acessosPorRole?.corretor || 0, icon: Users, color: 'from-caixa-success to-caixa-info' },
    { label: 'Correspondentes', value: stats?.acessosPorRole?.correspondente || 0, icon: Shield, color: 'from-caixa-orange to-caixa-orange-light' },
    { label: 'Visitantes', value: stats?.acessosPorRole?.anonimo || 0, icon: Globe, color: 'from-caixa-secondary to-caixa-light' }
  ];

  // Definir dados dos filtros
  const filterConfig = [
    { 
      label: 'Buscar Usuário', 
      icon: Search, 
      type: 'input', 
      key: 'search',
      placeholder: 'Digite o nome do usuário...'
    },
    { 
      label: 'Tipo de Usuário', 
      icon: Users, 
      type: 'select', 
      key: 'role', 
      options: [
        { value: '', label: 'Todos os Usuários' },
        { value: 'corretor', label: 'Corretores' },
        { value: 'correspondente', label: 'Correspondentes' },
        { value: 'administrador', label: 'Administradores' }
      ]
    },
    { 
      label: 'Período', 
      icon: Calendar, 
      type: 'select', 
      key: 'period', 
      options: [
        { value: '24h', label: 'Últimas 24 horas' },
        { value: '7d', label: 'Últimos 7 dias' },
        { value: '30d', label: 'Últimos 30 dias' },
        { value: '90d', label: 'Últimos 90 dias' }
      ]
    },
    { 
      label: 'Itens por Página', 
      icon: Database, 
      type: 'select', 
      key: 'itemsPerPage', 
      options: [
        { value: '10', label: '10 registros' },
        { value: '20', label: '20 registros' },
        { value: '50', label: '50 registros' },
        { value: '100', label: '100 registros' }
      ]
    }
  ];

  // Headers da tabela
  const tableHeaders = [
    { label: 'Usuário', icon: User },
    { label: 'Localização', icon: MapPin },
    { label: 'Dispositivo', icon: Monitor },
    { label: 'Página Visitada', icon: Globe },
    { label: 'Data & Hora', icon: Clock },
    { label: 'Ações', icon: Settings }
  ];

  // Função para converter período em datas
  const getDateRangeFromPeriod = (period) => {
    const now = new Date();
    let startDate = new Date(now);
    switch (period) {
      case '24h':
        startDate.setDate(now.getDate() - 1);
        break;
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      default:
        startDate = null;
    }
    return {
      startDate: startDate ? startDate.toISOString().slice(0, 10) : '',
      endDate: now.toISOString().slice(0, 10),
    };
  };

  // Nome do sistema do .env
  const nomeSistema = process.env.REACT_APP_NOME_SISTEMA || "CAIXA CRM";

  if (loading && acessos.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-caixa-gray-900 via-caixa-primary to-caixa-gray-800 relative overflow-hidden">
        {/* Efeitos de Background Animados */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-72 h-72 bg-caixa-secondary/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute top-1/2 right-0 w-96 h-96 bg-caixa-orange/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-caixa-light/20 rounded-full blur-3xl animate-pulse delay-2000"></div>
        </div>
        
        <div className="flex items-center justify-center min-h-screen relative z-10">
          <div className="text-center max-w-md">
            <div className="relative mb-8">
              <div className="w-24 h-24 bg-gradient-to-r from-caixa-primary via-caixa-secondary to-caixa-light rounded-full mx-auto flex items-center justify-center shadow-2xl animate-spin">
                <Server className="w-12 h-12 text-white" />
              </div>
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-caixa-success rounded-full animate-ping flex items-center justify-center">
                <div className="w-3 h-3 bg-white rounded-full"></div>
              </div>
            </div>
            <h2 className="text-4xl font-black text-white mb-4 bg-gradient-to-r from-caixa-secondary to-caixa-light bg-clip-text text-transparent">
              {nomeSistema}
            </h2>
            <p className="text-caixa-gray-300 text-lg mb-8">Carregando dados de monitoramento...</p>
            <div className="flex justify-center items-center space-x-4">
              <div className="flex space-x-2">
                <div className="w-3 h-3 bg-caixa-primary rounded-full animate-bounce"></div>
                <div className="w-3 h-3 bg-caixa-secondary rounded-full animate-bounce delay-100"></div>
                <div className="w-3 h-3 bg-caixa-orange rounded-full animate-bounce delay-200"></div>
              </div>
              <span className="text-caixa-gray-400 font-mono">Loading...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-caixa-gray-900 via-caixa-error/50 to-caixa-gray-900 flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-96 h-96 bg-caixa-error/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-caixa-error/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        </div>
        
        <div className="text-center max-w-md relative z-10">
          <div className="w-24 h-24 bg-gradient-to-r from-caixa-error to-caixa-warning rounded-full mx-auto flex items-center justify-center shadow-2xl mb-8">
            <Shield className="w-12 h-12 text-white animate-pulse" />
          </div>
          <h2 className="text-4xl font-black text-white mb-4">SISTEMA OFFLINE</h2>
          <p className="text-caixa-error text-lg mb-8">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-gradient-to-r from-caixa-error to-caixa-warning hover:from-caixa-error/80 hover:to-caixa-warning/80 text-white px-8 py-4 rounded-2xl font-bold text-lg shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all duration-300 flex items-center gap-3 mx-auto"
          >
            <RefreshCw className="w-6 h-6" />
            Reconectar Sistema
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-caixa-primary relative">
      {/* Efeitos de Background em azul */}
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-caixa-primary/40 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-caixa-light/30 rounded-full blur-3xl"></div>
      </div>

      {/* Header Principal */}
      <header className="relative z-10 bg-caixa-primary/90 border-b border-caixa-orange/40">
        <div className="container mx-auto px-6 py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            {/* Logo e Título */}
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-gradient-to-br from-caixa-orange to-caixa-orange-light rounded-2xl flex items-center justify-center shadow-2xl">
                <Activity className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl lg:text-4xl font-black text-caixa-orange mb-1">
                  {nomeSistema} <span className="text-white">MONITOR</span>
                </h1>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-caixa-orange rounded-full flex items-center justify-center">
                      <User className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-white">Admin: <span className="text-white font-bold">{userFirstName || 'Sistema'}</span></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-caixa-orange animate-pulse rounded-full"></div>
                    <span className="text-caixa-orange font-bold">ONLINE</span>
                  </div>
                </div>
              </div>
            </div>
            {/* Controles do Header */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="bg-gradient-to-r from-caixa-orange to-caixa-orange-light hover:from-caixa-orange-dark hover:to-caixa-orange text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center gap-2"
              >
                <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Sync...' : 'Refresh'}
              </button>
              <button
                onClick={() => setViewMode(viewMode === 'grid' ? 'table' : 'grid')}
                className="bg-caixa-orange-light text-caixa-primary px-6 py-3 rounded-xl font-bold shadow-lg transform hover:scale-105 transition-all duration-300 flex items-center gap-2"
              >
                {viewMode === 'grid' ? <Monitor className="w-5 h-5" /> : <Layers className="w-5 h-5" />}
                {viewMode === 'grid' ? 'Table' : 'Grid'}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 container mx-auto px-6 py-8">
        {/* Painel de Filtros */}
        <section className="mb-8">
          <div className="bg-caixa-primary/80 border border-caixa-orange/30 rounded-3xl p-8 shadow-2xl">
            <header className="flex items-center gap-4 mb-6">
              <div className="w-10 h-10 bg-gradient-to-r from-caixa-orange to-caixa-orange-light rounded-xl flex items-center justify-center">
                <Filter className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-bold text-caixa-orange">FILTROS DE CONTROLE</h2>
            </header>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {filterConfig.map((filter, index) => (
                <div key={generateStableKey(filter, index)} className="group">
                  <label className="block text-white text-sm font-bold uppercase tracking-wider mb-3 flex items-center gap-2">
                    <filter.icon className="w-4 h-4 text-caixa-orange" />
                    {filter.label}
                  </label>
                  {filter.type === 'input' ? (
                    <div className="relative">
                      <filter.icon className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white" />
                      <input
                        type="text"
                        placeholder={filter.placeholder}
                        className="w-full bg-caixa-primary/60 border-2 border-caixa-orange/30 rounded-xl pl-12 pr-4 py-3 text-caixa-orange placeholder-caixa-orange-light focus:outline-none focus:border-caixa-orange focus:ring-2 focus:ring-caixa-orange/20 transition-all group-hover:border-caixa-orange/50"
                        value={filters.search || ""}
                        onChange={(e) => handleFilterChange('search', e.target.value)}
                      />
                    </div>
                  ) : (
                    <select
                      className="w-full bg-caixa-primary/60 border-2 border-caixa-orange/30 rounded-xl px-4 py-3 text-caixa-orange focus:outline-none focus:border-caixa-orange focus:ring-2 focus:ring-caixa-orange/20 transition-all group-hover:border-caixa-orange/50"
                      value={filter.key === 'itemsPerPage' ? pagination.itemsPerPage : filters[filter.key]}
                      onChange={(e) => {
                        if (filter.key === 'itemsPerPage') {
                          setPagination(prev => ({ 
                            ...prev, 
                            itemsPerPage: parseInt(e.target.value),
                            currentPage: 1
                          }));
                        } else {
                          handleFilterChange(filter.key, e.target.value);
                        }
                      }}
                    >
                      {filter.options.map(option => (
                        <option key={option.value} value={option.value} className="bg-caixa-primary text-caixa-orange">
                          {option.label}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Visualização de Dados - Sempre em Lista */}
        <section>
          <div className="bg-caixa-primary/80 border border-caixa-orange/30 rounded-3xl overflow-hidden shadow-2xl">
            <header className="bg-gradient-to-r from-caixa-orange/80 via-caixa-orange-light/80 to-caixa-orange/80 px-8 py-6 border-b border-caixa-orange/30">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gradient-to-r from-caixa-orange to-caixa-orange-light rounded-xl flex items-center justify-center">
                  <Database className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">REGISTROS DE ACESSO</h2>
                  <p className="text-white text-sm">
                    {filteredAcessos.length} de {pagination.totalItems} registros
                  </p>
                </div>
              </div>
            </header>
            {/* Sempre renderiza a tabela/lista */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-caixa-orange/80 via-caixa-orange-light/80 to-caixa-orange/80">
                    {tableHeaders.map((header, index) => (
                      <th key={generateStableKey(header, index)} className="px-6 py-4 text-left">
                        <div className="flex items-center gap-2">
                          <header.icon className="w-4 h-4 text-white" />
                          <span className="text-white font-bold text-sm uppercase tracking-wider">{header.label}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredAcessos.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-16 text-center">
                        <div className="w-16 h-16 bg-gradient-to-r from-caixa-gray-500 to-caixa-gray-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                          <Users className="w-8 h-8 text-white" />
                        </div>
                        <p className="text-xl font-bold text-white mb-2">Nenhum Registro</p>
                        <p className="text-caixa-gray-400">Sem dados para exibir</p>
                      </td>
                    </tr>
                  ) : (
                    filteredAcessos.map((acesso, index) => (
                      <tr key={acesso.id} className={`border-b border-caixa-orange/20 hover:bg-caixa-orange/10 transition-all duration-300 group ${
                        index % 2 === 0 ? 'bg-caixa-primary/10' : 'bg-caixa-primary/20'
                      }`}>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-r from-caixa-orange to-caixa-orange-light rounded-xl flex items-center justify-center text-white font-bold shadow-lg">
                              {getUserName(acesso).charAt(0)}
                            </div>
                            <div>
                              <div className="font-bold text-white">{getUserName(acesso)}</div>
                              <span className="inline-block px-2 py-1 rounded-lg text-xs mt-1 bg-caixa-orange/20 text-white border border-caixa-orange/40">
                                {getUserRole(acesso)}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-white">
                            <div className="font-bold mb-1">{acesso.ip}</div>
                            <div className="text-sm">
                              {acesso.geoCity && acesso.geoCountry 
                                ? `${acesso.geoCity}, ${acesso.geoCountry}`
                                : 'Localização não disponível'
                              }
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {getDeviceIcon(acesso.deviceType)}
                            <span className="text-white font-medium">{acesso.deviceType || 'Unknown'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-white bg-caixa-orange/10 px-3 py-1 rounded-lg text-sm font-medium border border-caixa-orange/20">
                            {acesso.page || 'N/A'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-white">
                            <div className="font-bold">
                              {acesso.timestamp
                                ? new Date(acesso.timestamp).toLocaleDateString('pt-BR')
                                : ''}
                            </div>
                            <div className="text-sm">
                              {acesso.timestamp
                                ? new Date(acesso.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                                : ''}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button className="w-8 h-8 bg-caixa-orange/20 hover:bg-caixa-orange/30 rounded-lg flex items-center justify-center transition-colors">
                              <Eye className="w-4 h-4 text-white" />
                            </button>
                            <button className="w-8 h-8 bg-caixa-orange/20 hover:bg-caixa-orange/30 rounded-lg flex items-center justify-center transition-colors">
                              <Trash2 className="w-4 h-4 text-white" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Paginação */}
        {pagination.totalPages > 1 && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-8">
            <div className="text-white text-base">
              Exibindo <span className="font-bold">{((pagination.currentPage - 1) * pagination.itemsPerPage) + 1}</span> até{' '}
              <span className="font-bold">{Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)}</span> de{' '}
              <span className="font-bold">{pagination.totalItems}</span> registros
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => handlePageChange(pagination.currentPage - 1)}
                disabled={pagination.currentPage <= 1}
                className="bg-gradient-to-r from-caixa-orange to-caixa-orange-light hover:from-caixa-orange-dark hover:to-caixa-orange disabled:opacity-50 disabled:cursor-not-allowed text-white p-3 rounded-xl transition-all duration-300 border border-caixa-orange/20 hover:border-caixa-orange/40 shadow-lg hover:shadow-xl hover:scale-105"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              
              <div className="bg-gradient-to-r from-caixa-orange to-caixa-orange-light text-white px-6 py-3 rounded-xl border border-caixa-orange/20 font-bold shadow-lg">
                {pagination.currentPage} / {pagination.totalPages}
              </div>
              
              <button
                onClick={() => handlePageChange(pagination.currentPage + 1)}
                disabled={pagination.currentPage >= pagination.totalPages}
                className="bg-gradient-to-r from-caixa-orange to-caixa-orange-light hover:from-caixa-orange-dark hover:to-caixa-orange disabled:opacity-50 disabled:cursor-not-allowed text-white p-3 rounded-xl transition-all duration-300 border border-caixa-orange/20 hover:border-caixa-orange/40 shadow-lg hover:shadow-xl hover:scale-105"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};


export default AcessosList;
