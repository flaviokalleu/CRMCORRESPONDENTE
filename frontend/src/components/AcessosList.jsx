// src/components/AcessosList.jsx
import React, { useEffect, useState } from "react";
import generateStableKey from 'utils/generateStableKey';
import {
  Search,
  Users,
  Globe,
  Smartphone,
  Monitor,
  Tablet,
  Calendar,
  Filter,
  Database,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Activity,
  Eye,
  Clock,
  MapPin,
  Shield,
  User,
  RefreshCw,
  Settings,
  Layers,
  Wifi,
  WifiOff,
  Loader2
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
      let paramsObj = {
        page: pagination.currentPage,
        limit: pagination.itemsPerPage,
        ...filters,
      };

      if (filters.period) {
        const { startDate, endDate } = getDateRangeFromPeriod(filters.period);
        paramsObj.startDate = startDate;
        paramsObj.endDate = endDate;
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
        return <Smartphone className="w-4 h-4 text-caixa-orange" />;
      case 'tablet':
        return <Tablet className="w-4 h-4 text-caixa-orange" />;
      default:
        return <Monitor className="w-4 h-4 text-caixa-orange" />;
    }
  };

  const getUserName = (acesso) => {
    if (acesso.user && (acesso.user.first_name || acesso.user.last_name)) {
      return `${acesso.user.first_name || ''} ${acesso.user.last_name || ''}`.trim();
    }
    return acesso.user_id ? `Usuário #${acesso.user_id}` : 'Anônimo';
  };

  const getUserRole = (acesso) => {
    return acesso.user_id ? 'Usuário' : 'Visitante';
  };

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

  // Filtro local para role e search
  const filteredAcessos = acessos.filter(acesso => {
    let match = true;
    if (filters.role) {
      if (!acesso.user || acesso.user.role !== filters.role) {
        match = false;
      }
    }
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

  const statsData = [
    { label: 'Total de Acessos', value: stats?.totalAcessos || 0, icon: Eye, accent: false },
    { label: 'Corretores', value: stats?.acessosPorRole?.corretor || 0, icon: Users, accent: false },
    { label: 'Correspondentes', value: stats?.acessosPorRole?.correspondente || 0, icon: Shield, accent: true },
    { label: 'Visitantes', value: stats?.acessosPorRole?.anonimo || 0, icon: Globe, accent: false }
  ];

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

  const tableHeaders = [
    { label: 'Usuário', icon: User },
    { label: 'Localização', icon: MapPin },
    { label: 'Dispositivo', icon: Monitor },
    { label: 'Página Visitada', icon: Globe },
    { label: 'Data e Hora', icon: Clock },
    { label: 'Ações', icon: Settings }
  ];

  // --- Loading State ---
  if (loading && acessos.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 backdrop-blur-xl bg-white/10 rounded-2xl border border-white/10 mx-auto flex items-center justify-center mb-6">
            <Loader2 className="w-8 h-8 text-caixa-orange animate-spin" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Carregando Acessos</h2>
          <p className="text-white/60">Buscando dados de monitoramento...</p>
        </div>
      </div>
    );
  }

  // --- Error State ---
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 backdrop-blur-xl bg-white/10 rounded-2xl border border-white/10 mx-auto flex items-center justify-center mb-6">
            <WifiOff className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Erro de Conexão</h2>
          <p className="text-white/60 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-caixa-orange hover:bg-caixa-orange-dark text-white px-6 py-3 rounded-xl font-semibold transition-colors flex items-center gap-2 mx-auto"
          >
            <RefreshCw className="w-5 h-5" />
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  // --- Main Render ---
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Activity className="w-7 h-7 text-caixa-orange" />
            Monitor de Acessos
          </h1>
          <p className="text-white/60 mt-1">
            Olá, <span className="text-caixa-orange font-medium">{userFirstName || 'Administrador'}</span> — acompanhe os acessos ao sistema em tempo real.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm">
            <Wifi className="w-4 h-4 text-green-400" />
            <span className="text-green-400 font-medium">Online</span>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="bg-caixa-orange hover:bg-caixa-orange-dark text-white px-4 py-2.5 rounded-xl font-semibold transition-colors flex items-center gap-2 text-sm"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Atualizando...' : 'Atualizar'}
          </button>
          <button
            onClick={() => setViewMode(viewMode === 'grid' ? 'table' : 'grid')}
            className="backdrop-blur-xl bg-white/10 border border-white/10 text-white px-4 py-2.5 rounded-xl font-semibold transition-colors hover:bg-white/20 flex items-center gap-2 text-sm"
          >
            {viewMode === 'grid' ? <Monitor className="w-4 h-4" /> : <Layers className="w-4 h-4" />}
            {viewMode === 'grid' ? 'Tabela' : 'Grade'}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsData.map((stat, index) => (
          <div
            key={generateStableKey(stat, index)}
            className="backdrop-blur-xl bg-white/10 rounded-2xl p-6 border border-white/10 transition-all hover:bg-white/[0.15]"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-white/60 text-sm font-medium">{stat.label}</span>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.accent ? 'bg-caixa-orange/20' : 'bg-white/10'}`}>
                <stat.icon className={`w-5 h-5 ${stat.accent ? 'text-caixa-orange' : 'text-white/80'}`} />
              </div>
            </div>
            <p className="text-3xl font-bold text-white">{stat.value.toLocaleString('pt-BR')}</p>
          </div>
        ))}
      </div>

      {/* Filters Card */}
      <div className="backdrop-blur-xl bg-white/10 rounded-2xl p-6 border border-white/10">
        <div className="flex items-center gap-3 mb-5">
          <Filter className="w-5 h-5 text-caixa-orange" />
          <h2 className="text-white font-semibold">Filtros</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {filterConfig.map((filter, index) => (
            <div key={generateStableKey(filter, index)}>
              <label className="block text-white/60 text-xs font-medium uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <filter.icon className="w-3.5 h-3.5" />
                {filter.label}
              </label>
              {filter.type === 'input' ? (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                  <input
                    type="text"
                    placeholder={filter.placeholder}
                    className="w-full bg-caixa-primary/50 border border-white/20 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-caixa-orange/60 focus:ring-1 focus:ring-caixa-orange/30 transition-all text-sm"
                    value={filters.search || ""}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                  />
                </div>
              ) : (
                <select
                  className="w-full bg-caixa-primary/50 border border-white/20 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-caixa-orange/60 focus:ring-1 focus:ring-caixa-orange/30 transition-all text-sm"
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
                    <option key={option.value} value={option.value} className="bg-caixa-primary text-white">
                      {option.label}
                    </option>
                  ))}
                </select>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Data Table */}
      <div className="backdrop-blur-xl bg-white/10 rounded-2xl border border-white/10 overflow-hidden">
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Database className="w-5 h-5 text-caixa-orange" />
            <div>
              <h2 className="text-white font-semibold">Registros de Acesso</h2>
              <p className="text-white/60 text-xs mt-0.5">
                {filteredAcessos.length} de {pagination.totalItems} registros
              </p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-caixa-primary/60">
                {tableHeaders.map((header, index) => (
                  <th key={generateStableKey(header, index)} className="px-6 py-3 text-left">
                    <div className="flex items-center gap-2">
                      <header.icon className="w-3.5 h-3.5 text-white/60" />
                      <span className="text-white/60 font-medium text-xs uppercase tracking-wider">{header.label}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredAcessos.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-16 text-center">
                    <Users className="w-10 h-10 text-white/20 mx-auto mb-3" />
                    <p className="text-white font-semibold mb-1">Nenhum Registro Encontrado</p>
                    <p className="text-white/60 text-sm">Sem dados para o filtro selecionado.</p>
                  </td>
                </tr>
              ) : (
                filteredAcessos.map((acesso, index) => (
                  <tr
                    key={acesso.id}
                    className="border-b border-white/10 hover:bg-white/5 transition-colors"
                  >
                    {/* Usuário */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-caixa-orange/20 rounded-xl flex items-center justify-center text-caixa-orange font-bold text-sm">
                          {getUserName(acesso).charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-white font-medium text-sm">{getUserName(acesso)}</div>
                          <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-medium mt-0.5 ${
                            acesso.user_id
                              ? 'bg-caixa-orange/15 text-caixa-orange border border-caixa-orange/30'
                              : 'bg-white/10 text-white/50 border border-white/10'
                          }`}>
                            {getUserRole(acesso)}
                          </span>
                        </div>
                      </div>
                    </td>
                    {/* Localização */}
                    <td className="px-6 py-4">
                      <div className="text-white text-sm font-medium">{acesso.ip}</div>
                      <div className="text-white/60 text-xs mt-0.5">
                        {acesso.geoCity && acesso.geoCountry
                          ? `${acesso.geoCity}, ${acesso.geoCountry}`
                          : 'Localização indisponível'
                        }
                      </div>
                    </td>
                    {/* Dispositivo */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {getDeviceIcon(acesso.deviceType)}
                        <span className="text-white text-sm">{acesso.deviceType || 'Desconhecido'}</span>
                      </div>
                    </td>
                    {/* Página */}
                    <td className="px-6 py-4">
                      <span className="text-white/80 bg-white/5 px-2.5 py-1 rounded-lg text-xs font-medium border border-white/10">
                        {acesso.page || 'N/D'}
                      </span>
                    </td>
                    {/* Data e Hora */}
                    <td className="px-6 py-4">
                      <div className="text-white text-sm font-medium">
                        {acesso.timestamp
                          ? new Date(acesso.timestamp).toLocaleDateString('pt-BR')
                          : ''}
                      </div>
                      <div className="text-white/60 text-xs mt-0.5">
                        {acesso.timestamp
                          ? new Date(acesso.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                          : ''}
                      </div>
                    </td>
                    {/* Ações */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button className="w-8 h-8 bg-white/10 hover:bg-caixa-orange/20 rounded-lg flex items-center justify-center transition-colors" title="Visualizar">
                          <Eye className="w-4 h-4 text-white/70 hover:text-caixa-orange" />
                        </button>
                        <button className="w-8 h-8 bg-white/10 hover:bg-red-500/20 rounded-lg flex items-center justify-center transition-colors" title="Remover">
                          <Trash2 className="w-4 h-4 text-white/70 hover:text-red-400" />
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

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <p className="text-white/60 text-sm">
            Exibindo <span className="text-white font-medium">{((pagination.currentPage - 1) * pagination.itemsPerPage) + 1}</span> até{' '}
            <span className="text-white font-medium">{Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)}</span> de{' '}
            <span className="text-white font-medium">{pagination.totalItems}</span> registros
          </p>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(pagination.currentPage - 1)}
              disabled={pagination.currentPage <= 1}
              className="bg-caixa-orange hover:bg-caixa-orange-dark disabled:opacity-40 disabled:cursor-not-allowed text-white p-2.5 rounded-xl transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="backdrop-blur-xl bg-white/10 border border-white/10 text-white px-4 py-2 rounded-xl text-sm font-medium">
              {pagination.currentPage} / {pagination.totalPages}
            </div>

            <button
              onClick={() => handlePageChange(pagination.currentPage + 1)}
              disabled={pagination.currentPage >= pagination.totalPages}
              className="bg-caixa-orange hover:bg-caixa-orange-dark disabled:opacity-40 disabled:cursor-not-allowed text-white p-2.5 rounded-xl transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AcessosList;
