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

const CARD = 'rgba(255,255,255,0.06)';
const BORDER = 'rgba(255,255,255,0.10)';
const INPUT_BG = 'rgba(255,255,255,0.05)';
const ACCENT_GRADIENT = 'linear-gradient(135deg, #F97316, #EA580C)';

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
      className="group rounded-2xl overflow-hidden transition-all duration-300 backdrop-blur-md"
      style={{ background: CARD, border: `1px solid ${BORDER}` }}
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

        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Badges */}
        <div className="absolute top-4 left-4 flex flex-col gap-2">
          <span
            className="text-white px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide"
            style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}
          >
            {imovel.tipo || "IMÓVEL"}
          </span>
          {imovel.exclusivo === "sim" && (
            <span
              className="text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1"
              style={{ background: ACCENT_GRADIENT }}
            >
              <Star className="w-3 h-3" />
              Exclusivo
            </span>
          )}
        </div>

        {/* Preço sobreposto na imagem */}
        <div className="absolute bottom-4 left-4">
          <span className="text-white text-lg font-bold drop-shadow-lg">
            {Number(imovel.valor_venda || 0).toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}
          </span>
        </div>

        {/* Botão de ações */}
        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
          <div
            className="backdrop-blur-md rounded-lg p-1 flex gap-1"
            style={{ background: 'rgba(0,0,0,0.4)', border: `1px solid ${BORDER}` }}
          >
            {user?.role !== "corretor" && (
              <>
                <button
                  onClick={() => handleEdit(imovel)}
                  className="p-2 hover:bg-white/10 text-white rounded-lg transition-colors"
                  title="Editar"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(imovel.id)}
                  className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                  title="Excluir"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
            <button
              onClick={() => handleDownload(imovel.id)}
              className="p-2 hover:bg-orange-500/20 text-orange-400 rounded-lg transition-colors"
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
          <h3 className="text-lg font-bold text-white mb-2 group-hover:text-orange-400 transition-colors truncate">
            {imovel.nome_imovel || 'Nome não informado'}
          </h3>
          <div className="flex items-center gap-2 text-white/50">
            <MapPin className="w-4 h-4 text-orange-400 flex-shrink-0" />
            <span className="text-sm truncate">
              {imovel.endereco || imovel.localizacao || 'Localização não informada'}
            </span>
          </div>
        </div>

        {/* Características */}
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-1.5 text-white/50">
            <Bed className="w-4 h-4 text-orange-400" />
            <span className="text-sm font-medium">{imovel.quartos || 0}</span>
          </div>
          <div className="flex items-center gap-1.5 text-white/50">
            <Bath className="w-4 h-4 text-orange-400" />
            <span className="text-sm font-medium">{imovel.banheiro || 0}</span>
          </div>
        </div>

        {/* Tags */}
        {imovel.tags && (
          <div className="flex flex-wrap gap-1 mb-4">
            {imovel.tags.split(',').slice(0, 3).map((tag, idx) => (
              <span
                key={idx}
                className="text-white/60 px-2 py-1 rounded-lg text-xs"
                style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${BORDER}` }}
              >
                {tag.trim()}
              </span>
            ))}
            {imovel.tags.split(',').length > 3 && (
              <span
                className="text-white/40 px-2 py-1 rounded-lg text-xs"
                style={{ background: 'rgba(255,255,255,0.04)' }}
              >
                +{imovel.tags.split(',').length - 3}
              </span>
            )}
          </div>
        )}

        {/* Preços */}
        <div
          className="rounded-xl p-4 space-y-2"
          style={{ background: INPUT_BG, border: `1px solid ${BORDER}` }}
        >
          {imovel.valor_avaliacao && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-white/40">Avaliação:</span>
              <span className="text-sm font-medium text-white/70">
                {Number(imovel.valor_avaliacao).toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </span>
            </div>
          )}
          <div className="flex justify-between items-center">
            <span className="text-sm text-white/40">Venda:</span>
            <span className="text-lg font-bold text-orange-400">
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
      className="rounded-2xl backdrop-blur-md transition-all duration-300 p-6 hover:bg-white/[0.03]"
      style={{ background: CARD, border: `1px solid ${BORDER}` }}
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
            style={{ border: `1px solid ${BORDER}` }}
            onError={(e) => {
              e.target.src = '/placeholder-image.jpg';
            }}
          />
        </div>

        {/* Conteúdo */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h3 className="text-lg font-semibold text-white truncate">
                {imovel.nome_imovel || 'Nome não informado'}
              </h3>
              <div className="flex items-center gap-2 text-white/50 mt-1">
                <MapPin className="w-4 h-4 text-orange-400" />
                <span className="text-sm">{imovel.endereco || imovel.localizacao}</span>
              </div>
            </div>

            <div className="text-right">
              <div className="text-lg font-bold text-orange-400">
                {Number(imovel.valor_venda || 0).toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </div>
              {imovel.valor_avaliacao && (
                <div className="text-sm text-white/40">
                  Aval: {Number(imovel.valor_avaliacao).toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-6 text-sm text-white/50 mb-3">
            <div className="flex items-center gap-1">
              <Bed className="w-4 h-4 text-orange-400" />
              <span>{imovel.quartos || 0}</span>
            </div>
            <div className="flex items-center gap-1">
              <Bath className="w-4 h-4 text-orange-400" />
              <span>{imovel.banheiro || 0}</span>
            </div>
            <span
              className="px-2 py-1 rounded text-xs text-white/60 uppercase tracking-wide"
              style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${BORDER}` }}
            >
              {imovel.tipo?.toUpperCase()}
            </span>
            {imovel.exclusivo === "sim" && (
              <span
                className="px-2 py-1 rounded-full text-xs font-semibold text-orange-400 flex items-center gap-1"
                style={{ background: 'rgba(249,115,22,0.15)' }}
              >
                <Star className="w-3 h-3" />
                Exclusivo
              </span>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex gap-1">
              {user?.role !== "corretor" && (
                <>
                  <button
                    onClick={() => handleEdit(imovel)}
                    className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                    title="Editar"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(imovel.id)}
                    className="p-2 text-white/50 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    title="Excluir"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              )}
              <button
                onClick={() => handleDownload(imovel.id)}
                className="p-2 text-white/50 hover:text-orange-400 hover:bg-orange-500/10 rounded-lg transition-colors"
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
          <div
            className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center mb-4 backdrop-blur-md"
            style={{ background: CARD, border: `1px solid ${BORDER}` }}
          >
            <Home className="w-8 h-8 text-white animate-pulse" />
          </div>
          <p className="text-white text-lg font-medium">Carregando imóveis...</p>
          <p className="text-white/30 text-sm mt-1">Buscando dados do servidor...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-caixa-primary via-caixa-secondary to-caixa-primary">
      <div className="container mx-auto px-4 py-8 max-w-7xl">

        {/* Header Sticky com Glassmorphism */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          className="sticky top-0 z-30 mb-8 -mx-4 px-4 pt-2 pb-4"
        >
          <div
            className="backdrop-blur-md rounded-2xl p-6"
            style={{ background: CARD, border: `1px solid ${BORDER}` }}
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-4">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20"
                  style={{ background: ACCENT_GRADIENT }}
                >
                  <Building className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-extrabold text-white tracking-tight">
                    Imóveis
                  </h1>
                  <p className="text-white/50 text-sm">
                    {filteredImoveis.length} de {imoveis.length} imóveis encontrados
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={fetchImoveis}
                  className="p-2.5 text-white/50 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
                  title="Atualizar"
                >
                  <RefreshCw className="w-5 h-5" />
                </button>

                <div
                  className="flex rounded-xl p-1"
                  style={{ background: INPUT_BG, border: `1px solid ${BORDER}` }}
                >
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-lg transition-colors ${
                      viewMode === 'grid' ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/60'
                    }`}
                  >
                    <Grid className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-lg transition-colors ${
                      viewMode === 'list' ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/60'
                    }`}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Barra de Busca e Filtros */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {/* Busca */}
              <div className="md:col-span-2 relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/30 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Buscar por nome, localização, tags..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-xl pl-11 pr-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-orange-500/40 transition-all"
                  style={{ background: INPUT_BG, border: `1px solid ${BORDER}` }}
                />
              </div>

              {/* Filtro por Tipo */}
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500/40 transition-all [&>option]:bg-white [&>option]:text-gray-800"
                style={{ background: INPUT_BG, border: `1px solid ${BORDER}` }}
              >
                <option value="">Todos os tipos</option>
                {tiposUnicos.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {tipo?.toUpperCase()}
                  </option>
                ))}
              </select>

              {/* Ordenação */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500/40 transition-all [&>option]:bg-white [&>option]:text-gray-800"
                style={{ background: INPUT_BG, border: `1px solid ${BORDER}` }}
              >
                <option value="newest">Mais recentes</option>
                <option value="oldest">Mais antigos</option>
                <option value="price_desc">Maior preço</option>
                <option value="price_asc">Menor preço</option>
                <option value="name">Nome A-Z</option>
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
              className="mb-6 p-4 rounded-xl flex items-center gap-3 text-red-300"
              style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.20)' }}
            >
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
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
            <div
              className="backdrop-blur-md rounded-2xl p-20 text-center"
              style={{ background: CARD, border: `1px solid ${BORDER}` }}
            >
              <div
                className="w-24 h-24 rounded-full mx-auto flex items-center justify-center mb-6"
                style={{ background: 'rgba(255,255,255,0.06)' }}
              >
                <Home className="w-12 h-12 text-white/30" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">
                {searchTerm || filterType
                  ? "Nenhum imóvel encontrado"
                  : "Nenhum imóvel cadastrado"}
              </h3>
              <p className="text-white/40 text-sm max-w-md mx-auto">
                {searchTerm || filterType
                  ? "Tente ajustar os filtros de busca para encontrar o que procura"
                  : "Cadastre o primeiro imóvel para começar a construir seu portfólio"}
              </p>
            </div>
          ) : (
            <div className={
              viewMode === 'grid'
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
                : "space-y-3"
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
