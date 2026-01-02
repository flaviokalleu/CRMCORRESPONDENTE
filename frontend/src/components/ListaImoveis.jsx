import React, { useState, useEffect } from "react";
import axios from "axios";
import ModalEditarImovel from "./ModalEditarImovel";
import { useAuth } from "../context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home, MapPin, Bed, Bath, DollarSign, Search, Filter, Eye, Edit,
  Trash2, Download, Building, AlertTriangle, Star, Tag, Calendar,
  Image, MoreVertical, RefreshCw, Grid, List, SortAsc, SortDesc
} from "lucide-react";

const ListaImoveis = () => {
  const { user } = useAuth();
  const [imoveis, setImoveis] = useState([]);
  const [imovelSelecionado, setImovelSelecionado] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("");
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' ou 'list'
  const [sortBy, setSortBy] = useState('newest'); // 'newest', 'oldest', 'price_asc', 'price_desc'
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchImoveis();
  }, []);

  const fetchImoveis = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/imoveis`,
        {
          timeout: 10000,
          headers: { 'Content-Type': 'application/json' },
        }
      );
      
      const data = Array.isArray(response.data) ? response.data : response.data?.imoveis || [];
      setImoveis(data);
    } catch (error) {
      console.error("Erro ao buscar imóveis:", error);
      let errorMessage = "Erro ao carregar imóveis.";
      
      if (error.code === 'ECONNABORTED') {
        errorMessage = "Timeout na requisição. Verifique sua conexão.";
      } else if (error.response?.status === 500) {
        errorMessage = "Erro interno do servidor.";
      } else if (!error.response) {
        errorMessage = "Não foi possível conectar ao servidor.";
      }
      
      setError(errorMessage);
      setImoveis([]);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (imovel) => {
    if (user?.role !== "corretor") {
      setImovelSelecionado(imovel);
      setIsModalOpen(true);
    }
  };

  const handleDelete = async (id) => {
    if (user?.role !== "corretor") {
      if (window.confirm("Tem certeza que deseja excluir este imóvel?")) {
        try {
          await axios.delete(`${process.env.REACT_APP_API_URL}/imoveis/${id}`);
          setImoveis(imoveis.filter((imovel) => imovel.id !== id));
        } catch (error) {
          console.error("Erro ao deletar imóvel:", error);
          setError("Erro ao excluir imóvel. Tente novamente.");
        }
      }
    }
  };

  const handleDownload = (id) => {
    window.location.href = `${process.env.REACT_APP_API_URL}/imoveis/${id}/download-imagens`;
  };

  // Função de ordenação
  const sortedImoveis = (imoveis) => {
    return [...imoveis].sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.created_at || b.createdAt) - new Date(a.created_at || a.createdAt);
        case 'oldest':
          return new Date(a.created_at || a.createdAt) - new Date(b.created_at || b.createdAt);
        case 'price_asc':
          return (a.valor_venda || 0) - (b.valor_venda || 0);
        case 'price_desc':
          return (b.valor_venda || 0) - (a.valor_venda || 0);
        case 'name':
          return (a.nome_imovel || '').localeCompare(b.nome_imovel || '');
        default:
          return 0;
      }
    });
  };

  // Filtrar e ordenar imóveis
  const filteredImoveis = sortedImoveis(
    imoveis.filter((imovel) => {
      if (!imovel) return false;
      
      try {
        const matchesSearch =
          (imovel.nome_imovel || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (imovel.descricao_imovel || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (imovel.endereco || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (imovel.localizacao || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (imovel.tags || '').toLowerCase().includes(searchTerm.toLowerCase());

        const matchesType = filterType === "" || imovel.tipo === filterType;

        return matchesSearch && matchesType;
      } catch (err) {
        console.warn('Erro ao filtrar imóvel:', err);
        return false;
      }
    })
  );

  const tiposUnicos = [...new Set(imoveis.map(i => i?.tipo).filter(Boolean))];

  // Componente de Card do Imóvel
  const ImovelCard = ({ imovel, index }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100"
    >
      {/* Imagem */}
      <div className="relative overflow-hidden">
        <img
          src={imovel.imagem_capa 
            ? `${process.env.REACT_APP_API_URL}/${imovel.imagem_capa}`
            : '/placeholder-image.jpg'
          }
          alt={imovel.nome_imovel || 'Imóvel'}
          className="w-full h-56 object-cover group-hover:scale-110 transition-transform duration-500"
          onError={(e) => {
            e.target.src = '/placeholder-image.jpg';
          }}
        />
        
        {/* Badges */}
        <div className="absolute top-4 left-4 flex flex-col gap-2">
          <span className="bg-caixa-primary text-white px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide">
            {imovel.tipo || "IMÓVEL"}
          </span>
          {imovel.exclusivo === "sim" && (
            <span className="bg-caixa-orange text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
              <Star className="w-3 h-3" />
              Exclusivo
            </span>
          )}
        </div>

        {/* Botão de ações */}
        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="bg-white/90 backdrop-blur rounded-lg p-1 flex gap-1">
            {user?.role !== "corretor" && (
              <>
                <button
                  onClick={() => handleEdit(imovel)}
                  className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                  title="Editar"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(imovel.id)}
                  className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                  title="Excluir"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
            <button
              onClick={() => handleDownload(imovel.id)}
              className="p-2 hover:bg-caixa-orange/10 text-caixa-orange rounded-lg transition-colors"
              title="Download"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="p-6">
        {/* Título e Localização */}
        <div className="mb-4">
          <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-caixa-primary transition-colors">
            {imovel.nome_imovel || 'Nome não informado'}
          </h3>
          <div className="flex items-center gap-2 text-gray-600">
            <MapPin className="w-4 h-4 text-caixa-orange" />
            <span className="text-sm">
              {imovel.endereco || imovel.localizacao || 'Localização não informada'}
            </span>
          </div>
        </div>

        {/* Características */}
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-1 text-gray-600">
            <Bed className="w-4 h-4 text-caixa-orange" />
            <span className="text-sm font-medium">{imovel.quartos || 0} quartos</span>
          </div>
          <div className="flex items-center gap-1 text-gray-600">
            <Bath className="w-4 h-4 text-caixa-orange" />
            <span className="text-sm font-medium">{imovel.banheiro || 0} banheiros</span>
          </div>
        </div>

        {/* Tags */}
        {imovel.tags && (
          <div className="flex flex-wrap gap-1 mb-4">
            {imovel.tags.split(',').slice(0, 3).map((tag, idx) => (
              <span key={idx} className="bg-gray-100 text-gray-700 px-2 py-1 rounded-lg text-xs">
                {tag.trim()}
              </span>
            ))}
            {imovel.tags.split(',').length > 3 && (
              <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-lg text-xs">
                +{imovel.tags.split(',').length - 3}
              </span>
            )}
          </div>
        )}

        {/* Preços */}
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-4 space-y-2">
          {imovel.valor_avaliacao && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Avaliação:</span>
              <span className="text-sm font-medium text-gray-800">
                {Number(imovel.valor_avaliacao).toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </span>
            </div>
          )}
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Venda:</span>
            <span className="text-lg font-bold text-caixa-primary">
              {Number(imovel.valor_venda || 0).toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );

  // Componente de Lista
  const ImovelListItem = ({ imovel, index }) => (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
      className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 p-6 border border-gray-100"
    >
      <div className="flex gap-6">
        {/* Imagem */}
        <div className="flex-shrink-0">
          <img
            src={imovel.imagem_capa 
              ? `${process.env.REACT_APP_API_URL}/${imovel.imagem_capa}`
              : '/placeholder-image.jpg'
            }
            alt={imovel.nome_imovel || 'Imóvel'}
            className="w-32 h-24 object-cover rounded-lg"
            onError={(e) => {
              e.target.src = '/placeholder-image.jpg';
            }}
          />
        </div>

        {/* Conteúdo */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 truncate">
                {imovel.nome_imovel || 'Nome não informado'}
              </h3>
              <div className="flex items-center gap-2 text-gray-600 mt-1">
                <MapPin className="w-4 h-4 text-caixa-orange" />
                <span className="text-sm">{imovel.endereco || imovel.localizacao}</span>
              </div>
            </div>
            
            <div className="text-right">
              <div className="text-lg font-bold text-caixa-primary">
                {Number(imovel.valor_venda || 0).toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </div>
              {imovel.valor_avaliacao && (
                <div className="text-sm text-gray-500">
                  Aval: {Number(imovel.valor_avaliacao).toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-6 text-sm text-gray-600 mb-3">
            <div className="flex items-center gap-1">
              <Bed className="w-4 h-4" />
              <span>{imovel.quartos || 0}</span>
            </div>
            <div className="flex items-center gap-1">
              <Bath className="w-4 h-4" />
              <span>{imovel.banheiro || 0}</span>
            </div>
            <span className="bg-gray-100 px-2 py-1 rounded text-xs">
              {imovel.tipo?.toUpperCase()}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {user?.role !== "corretor" && (
                <>
                  <button
                    onClick={() => handleEdit(imovel)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Editar"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(imovel.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Excluir"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              )}
              <button
                onClick={() => handleDownload(imovel.id)}
                className="p-2 text-caixa-orange hover:bg-caixa-orange/10 rounded-lg transition-colors"
                title="Download"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-caixa-primary via-caixa-secondary to-caixa-primary flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-16 h-16 bg-white/20 rounded-2xl mx-auto flex items-center justify-center mb-4">
            <Home className="w-8 h-8 text-white animate-pulse" />
          </div>
          <p className="text-white text-lg font-medium">Carregando imóveis...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-caixa-primary via-caixa-secondary to-caixa-primary">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        
        {/* Header Melhorado */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 border border-white/20">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-r from-caixa-orange to-caixa-orange-light rounded-2xl flex items-center justify-center shadow-lg">
                  <Building className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-extrabold text-white tracking-tight">
                    IMÓVEIS B2M
                  </h1>
                  <p className="text-white/80 text-lg">
                    {filteredImoveis.length} de {imoveis.length} imóveis encontrados
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={fetchImoveis}
                  className="p-3 bg-white/20 hover:bg-white/30 text-white rounded-xl transition-colors"
                  title="Atualizar"
                >
                  <RefreshCw className="w-5 h-5" />
                </button>
                
                <div className="flex bg-white/20 rounded-xl p-1">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-lg transition-colors ${
                      viewMode === 'grid' ? 'bg-white/30 text-white' : 'text-white/70'
                    }`}
                  >
                    <Grid className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-lg transition-colors ${
                      viewMode === 'list' ? 'bg-white/30 text-white' : 'text-white/70'
                    }`}
                  >
                    <List className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Barra de Busca e Filtros */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Busca */}
              <div className="md:col-span-2 relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/60 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Buscar por nome, localização, tags..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white/20 border border-white/30 rounded-xl pl-12 pr-4 py-3 text-white placeholder-white/60 focus:outline-none focus:border-caixa-orange focus:ring-2 focus:ring-caixa-orange/20 transition-all"
                />
              </div>

              {/* Filtro por Tipo */}
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="bg-white/20 border border-white/30 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-caixa-orange focus:ring-2 focus:ring-caixa-orange/20 transition-all"
              >
                <option value="" className="bg-caixa-primary text-white">
                  Todos os tipos
                </option>
                {tiposUnicos.map((tipo) => (
                  <option key={tipo} value={tipo} className="bg-caixa-primary text-white">
                    {tipo?.toUpperCase()}
                  </option>
                ))}
              </select>

              {/* Ordenação */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-white/20 border border-white/30 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-caixa-orange focus:ring-2 focus:ring-caixa-orange/20 transition-all"
              >
                <option value="newest" className="bg-caixa-primary text-white">Mais recentes</option>
                <option value="oldest" className="bg-caixa-primary text-white">Mais antigos</option>
                <option value="price_desc" className="bg-caixa-primary text-white">Maior preço</option>
                <option value="price_asc" className="bg-caixa-primary text-white">Menor preço</option>
                <option value="name" className="bg-caixa-primary text-white">Nome A-Z</option>
              </select>
            </div>
          </div>
        </motion.div>

        {/* Mensagem de erro */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6 p-4 bg-red-500/20 border border-red-500/30 text-red-100 rounded-xl flex items-center gap-3"
            >
              <AlertTriangle className="w-5 h-5" />
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Conteúdo Principal */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {filteredImoveis.length === 0 ? (
            <div className="bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 p-20 text-center">
              <div className="w-24 h-24 bg-white/20 rounded-full mx-auto flex items-center justify-center mb-6">
                <Home className="w-12 h-12 text-white" />
              </div>
              <h3 className="text-3xl font-bold text-white mb-4">
                {searchTerm || filterType
                  ? "Nenhum imóvel encontrado"
                  : "Nenhum imóvel cadastrado"}
              </h3>
              <p className="text-white/70 text-lg max-w-md mx-auto">
                {searchTerm || filterType
                  ? "Tente ajustar os filtros de busca para encontrar o que procura"
                  : "Cadastre o primeiro imóvel para começar a construir seu portfólio"}
              </p>
            </div>
          ) : (
            <div className={
              viewMode === 'grid' 
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                : "space-y-4"
            }>
              {filteredImoveis.map((imovel, index) => 
                viewMode === 'grid' ? (
                  <ImovelCard key={imovel.id} imovel={imovel} index={index} />
                ) : (
                  <ImovelListItem key={imovel.id} imovel={imovel} index={index} />
                )
              )}
            </div>
          )}
        </motion.div>
      </div>

      {/* Modal de Edição */}
      <AnimatePresence>
        {isModalOpen && (
          <ModalEditarImovel
            imovel={imovelSelecionado}
            isOpen={isModalOpen}
            onClose={() => {
              setIsModalOpen(false);
              setImovelSelecionado(null);
            }}
            onUpdate={(updatedImovel) => {
              setImoveis(imoveis.map(i => i.id === updatedImovel.id ? updatedImovel : i));
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default ListaImoveis;
