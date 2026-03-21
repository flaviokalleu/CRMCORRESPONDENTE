import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FaSearch, FaFilter, FaHome, FaMapMarkerAlt, FaBed, FaBath, FaCar, 
  FaRuler, FaHeart, FaArrowRight, FaThLarge, FaList, FaSortAmountDown,
  FaChevronDown, FaTimes, FaArrowLeft, FaWhatsapp, FaPhone, FaEnvelope 
} from "react-icons/fa";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import axios from "axios";

const PublicImoveisPage = () => {
  const [imoveis, setImoveis] = useState([]);
  const [filteredImoveis, setFilteredImoveis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // grid ou list
  const [sortBy, setSortBy] = useState('recent');
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;

  const [filters, setFilters] = useState({
    search: "",
    tipo: "",
    valorMin: "",
    valorMax: "",
    localizacao: "",
    quartos: "",
    banheiros: "",
    vagas: "",
    area_min: "",
    area_max: ""
  });

  const location = useLocation();
  const navigate = useNavigate();
  const nomeSistema = process.env.REACT_APP_NOME_SISTEMA || "CRMIMOB";

  // Buscar imóveis da API
  useEffect(() => {
    const fetchImoveis = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`${process.env.REACT_APP_API_URL}/imoveis`);
        setImoveis(Array.isArray(response.data) ? response.data : (response.data.data || []));
      } catch (err) {
        setError("Erro ao carregar imóveis");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchImoveis();
  }, []);

  // Aplicar filtros
  useEffect(() => {
    let filtered = [...imoveis];

    // Filtro por busca textual
    if (filters.search) {
      filtered = filtered.filter(imovel => 
        (imovel.nome_imovel || '').toLowerCase().includes(filters.search.toLowerCase()) ||
        (imovel.localizacao || '').toLowerCase().includes(filters.search.toLowerCase())
      );
    }

    // Filtro por tipo
    if (filters.tipo) {
      filtered = filtered.filter(imovel => imovel.tipo === filters.tipo);
    }

    // Filtro por localização
    if (filters.localizacao) {
      filtered = filtered.filter(imovel => 
        (imovel.localizacao || '').toLowerCase().includes(filters.localizacao.toLowerCase())
      );
    }

    // Filtro por valor
    if (filters.valorMin) {
      filtered = filtered.filter(imovel => Number(imovel.valor_venda || 0) >= Number(filters.valorMin));
    }
    if (filters.valorMax) {
      filtered = filtered.filter(imovel => Number(imovel.valor_venda || 0) <= Number(filters.valorMax));
    }

    // Filtro por quartos
    if (filters.quartos) {
      filtered = filtered.filter(imovel => Number(imovel.quartos || 0) >= Number(filters.quartos));
    }

    // Filtro por banheiros
    if (filters.banheiros) {
      filtered = filtered.filter(imovel => Number(imovel.banheiro || 0) >= Number(filters.banheiros));
    }

    // Filtro por vagas
    if (filters.vagas) {
      filtered = filtered.filter(imovel => Number(imovel.vagas || 0) >= Number(filters.vagas));
    }

    // Ordenação
    switch (sortBy) {
      case 'price_asc':
        filtered.sort((a, b) => Number(a.valor_venda || 0) - Number(b.valor_venda || 0));
        break;
      case 'price_desc':
        filtered.sort((a, b) => Number(b.valor_venda || 0) - Number(a.valor_venda || 0));
        break;
      case 'area_desc':
        filtered.sort((a, b) => Number(b.area || 0) - Number(a.area || 0));
        break;
      default:
        // Manter ordem original (mais recentes)
        break;
    }

    setFilteredImoveis(filtered);
    setCurrentPage(1);
  }, [imoveis, filters, sortBy]);

  // Paginação
  const totalPages = Math.ceil(filteredImoveis.length / itemsPerPage);
  const paginatedImoveis = filteredImoveis.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleFilterChange = (name, value) => {
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const clearFilters = () => {
    setFilters({
      search: "",
      tipo: "",
      valorMin: "",
      valorMax: "",
      localizacao: "",
      quartos: "",
      banheiros: "",
      vagas: "",
      area_min: "",
      area_max: ""
    });
  };

  const PropertyCard = ({ property }) => (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      whileHover={{ y: -5 }}
      className={`bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group ${
        viewMode === 'list' ? 'flex flex-row h-48' : 'flex flex-col'
      }`}
    >
      {/* Imagem */}
      <div className={`relative ${viewMode === 'list' ? 'w-80 h-full' : 'w-full h-48'}`}>
        {property.imagem_capa ? (
          <img 
            src={`/${property.imagem_capa}`} 
            alt={property.nome_imovel}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-caixa-primary/20 to-caixa-secondary/30 flex items-center justify-center">
            <FaHome className="text-caixa-primary w-16 h-16 opacity-40" />
          </div>
        )}
        
        <div className="absolute top-3 left-3">
          <span className="bg-caixa-orange text-white px-3 py-1 rounded-full text-xs font-bold shadow">
            {property.tipo || "Exclusivo"}
          </span>
        </div>
        
        <button className="absolute top-3 right-3 w-8 h-8 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center text-gray-600 hover:text-red-500 hover:bg-white transition-all">
          <FaHeart className="w-3 h-3" />
        </button>
      </div>

      {/* Conteúdo */}
      <div className={`p-4 flex-1 ${viewMode === 'list' ? 'flex flex-col justify-between' : ''}`}>
        <div>
          <h3 className="font-bold text-lg text-gray-900 mb-1 group-hover:text-caixa-primary transition-colors line-clamp-1">
            {property.nome_imovel}
          </h3>
          
          <div className="flex items-center text-gray-500 text-sm mb-3">
            <FaMapMarkerAlt className="mr-2 text-caixa-orange w-3 h-3" />
            <span className="line-clamp-1">{property.localizacao}</span>
          </div>

          {/* Características */}
          <div className="flex items-center gap-4 text-gray-400 text-sm mb-4">
            {property.quartos && (
              <span className="flex items-center gap-1">
                <FaBed className="w-3 h-3" />{property.quartos}
              </span>
            )}
            {property.banheiros && (
              <span className="flex items-center gap-1">
                <FaBath className="w-3 h-3" />{property.banheiro}
              </span>
            )}
            {property.vagas && (
              <span className="flex items-center gap-1">
                <FaCar className="w-3 h-3" />{property.vagas}
              </span>
            )}
            {property.area && (
              <span className="flex items-center gap-1">
                <FaRuler className="w-3 h-3" />{property.area}m²
              </span>
            )}
          </div>
        </div>

        {/* Preço e ação */}
        <div className="flex items-center justify-between">
          <div className="font-bold text-xl text-caixa-primary">
            {property.valor_venda ? `R$ ${Number(property.valor_venda).toLocaleString()}` : "Consultar"}
          </div>
          {/* ✅ BOTÃO ATUALIZADO PARA REDIRECIONAR PARA DETALHES */}
          <Link 
            to={`/imovel/${property.id}`}
            className="bg-caixa-primary text-white px-4 py-2 rounded-lg font-semibold hover:bg-caixa-secondary transition-all flex items-center gap-2 text-sm group/btn"
          >
            Ver <FaArrowRight className="w-3 h-3 group-hover/btn:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </motion.div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <div className="w-16 h-16 border-4 border-caixa-orange border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Carregando imóveis...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Imóveis - {nomeSistema}</title>
        <meta name="description" content="Explore nossa seleção completa de imóveis em Valparaíso de Goiás e região." />
      </Helmet>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <Link to="/" className="flex items-center gap-2 text-caixa-primary hover:text-caixa-secondary transition-colors">
                  <FaArrowLeft className="w-4 h-4" />
                  <span className="font-medium">Voltar</span>
                </Link>
                <div className="h-6 w-px bg-gray-300" />
                <h1 className="text-2xl font-bold text-gray-900">Nossos Imóveis</h1>
              </div>
              
              <div className="flex items-center gap-3">
                {/* View Toggle */}
                <div className="flex bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white shadow text-caixa-primary' : 'text-gray-500'}`}
                  >
                    <FaThLarge className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow text-caixa-primary' : 'text-gray-500'}`}
                  >
                    <FaList className="w-4 h-4" />
                  </button>
                </div>

                {/* Sort */}
                <select 
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-caixa-primary focus:border-caixa-primary"
                >
                  <option value="recent">Mais Recentes</option>
                  <option value="price_asc">Menor Preço</option>
                  <option value="price_desc">Maior Preço</option>
                  <option value="area_desc">Maior Área</option>
                </select>

                {/* Filtros Mobile */}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="md:hidden bg-caixa-primary text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2"
                >
                  <FaFilter className="w-4 h-4" />
                  Filtros
                </button>
              </div>
            </div>

            {/* Barra de busca */}
            <div className="relative mb-6">
              <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar por nome ou localização..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-caixa-primary focus:border-caixa-primary"
              />
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex gap-8">
            {/* Sidebar Filtros - Desktop */}
            <div className="hidden md:block w-80 flex-shrink-0">
              <div className="bg-white rounded-2xl shadow-lg p-6 sticky top-8">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-gray-900">Filtros</h3>
                  <button 
                    onClick={clearFilters}
                    className="text-caixa-orange hover:text-caixa-primary text-sm font-medium"
                  >
                    Limpar
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Tipo */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tipo</label>
                    <select
                      value={filters.tipo}
                      onChange={(e) => handleFilterChange('tipo', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-caixa-primary focus:border-caixa-primary"
                    >
                      <option value="">Todos os tipos</option>
                      <option value="apartamento">Apartamento</option>
                      <option value="casa">Casa</option>
                      <option value="terreno">Terreno</option>
                      <option value="comercial">Comercial</option>
                    </select>
                  </div>

                  {/* Localização */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Localização</label>
                    <input
                      type="text"
                      placeholder="Digite a localização..."
                      value={filters.localizacao}
                      onChange={(e) => handleFilterChange('localizacao', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-caixa-primary focus:border-caixa-primary"
                    />
                  </div>

                  {/* Faixa de Preço */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Faixa de Preço</label>
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="number"
                        placeholder="Valor mín"
                        value={filters.valorMin}
                        onChange={(e) => handleFilterChange('valorMin', e.target.value)}
                        className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-caixa-primary focus:border-caixa-primary"
                      />
                      <input
                        type="number"
                        placeholder="Valor máx"
                        value={filters.valorMax}
                        onChange={(e) => handleFilterChange('valorMax', e.target.value)}
                        className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-caixa-primary focus:border-caixa-primary"
                      />
                    </div>
                  </div>

                  {/* Quartos */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Quartos (mínimo)</label>
                    <select
                      value={filters.quartos}
                      onChange={(e) => handleFilterChange('quartos', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-caixa-primary focus:border-caixa-primary"
                    >
                      <option value="">Qualquer</option>
                      <option value="1">1+</option>
                      <option value="2">2+</option>
                      <option value="3">3+</option>
                      <option value="4">4+</option>
                    </select>
                  </div>

                  {/* Banheiros */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Banheiros (mínimo)</label>
                    <select
                      value={filters.banheiros}
                      onChange={(e) => handleFilterChange('banheiros', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-caixa-primary focus:border-caixa-primary"
                    >
                      <option value="">Qualquer</option>
                      <option value="1">1+</option>
                      <option value="2">2+</option>
                      <option value="3">3+</option>
                    </select>
                  </div>

                  {/* Vagas */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Vagas (mínimo)</label>
                    <select
                      value={filters.vagas}
                      onChange={(e) => handleFilterChange('vagas', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-caixa-primary focus:border-caixa-primary"
                    >
                      <option value="">Qualquer</option>
                      <option value="1">1+</option>
                      <option value="2">2+</option>
                      <option value="3">3+</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Conteúdo Principal */}
            <div className="flex-1">
              {/* Resultados */}
              <div className="mb-6">
                <p className="text-gray-600">
                  {filteredImoveis.length} imóvel{filteredImoveis.length !== 1 ? 'eis' : ''} encontrado{filteredImoveis.length !== 1 ? 's' : ''}
                </p>
              </div>

              {/* Grid/Lista de Imóveis */}
              {error ? (
                <div className="text-center py-12">
                  <p className="text-red-500 mb-4">{error}</p>
                  <button 
                    onClick={() => window.location.reload()}
                    className="bg-caixa-primary text-white px-6 py-2 rounded-lg hover:bg-caixa-secondary transition-all"
                  >
                    Tentar Novamente
                  </button>
                </div>
              ) : filteredImoveis.length === 0 ? (
                <div className="text-center py-12">
                  <FaHome className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-gray-700 mb-2">Nenhum imóvel encontrado</h3>
                  <p className="text-gray-500 mb-4">Tente ajustar os filtros ou fazer uma nova busca.</p>
                  <button 
                    onClick={clearFilters}
                    className="bg-caixa-primary text-white px-6 py-3 rounded-lg hover:bg-caixa-secondary transition-all"
                  >
                    Limpar Filtros
                  </button>
                </div>
              ) : (
                <>
                  <motion.div 
                    layout
                    className={`grid gap-6 ${
                      viewMode === 'grid' 
                        ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' 
                        : 'grid-cols-1'
                    }`}
                  >
                    <AnimatePresence>
                      {paginatedImoveis.map((property) => (
                        <PropertyCard key={property.id} property={property} />
                      ))}
                    </AnimatePresence>
                  </motion.div>

                  {/* Paginação */}
                  {totalPages > 1 && (
                    <div className="flex justify-center mt-12">
                      <div className="flex gap-2">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`px-4 py-2 rounded-lg font-medium transition-all ${
                              currentPage === page
                                ? 'bg-caixa-primary text-white'
                                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                            }`}
                          >
                            {page}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Filtros Mobile Modal */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50 md:hidden"
              onClick={() => setShowFilters(false)}
            >
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                className="absolute right-0 top-0 bottom-0 w-80 bg-white p-6 overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold">Filtros</h3>
                  <button 
                    onClick={() => setShowFilters(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <FaTimes className="w-5 h-5" />
                  </button>
                </div>
                
                {/* Mesmos filtros do desktop aqui */}
                <div className="space-y-6">
                  {/* Tipo */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tipo</label>
                    <select
                      value={filters.tipo}
                      onChange={(e) => handleFilterChange('tipo', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-caixa-primary focus:border-caixa-primary"
                    >
                      <option value="">Todos os tipos</option>
                      <option value="apartamento">Apartamento</option>
                      <option value="casa">Casa</option>
                      <option value="terreno">Terreno</option>
                      <option value="comercial">Comercial</option>
                    </select>
                  </div>

                  {/* Faixa de Preço */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Faixa de Preço</label>
                    <div className="space-y-3">
                      <input
                        type="number"
                        placeholder="Valor mínimo"
                        value={filters.valorMin}
                        onChange={(e) => handleFilterChange('valorMin', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-caixa-primary focus:border-caixa-primary"
                      />
                      <input
                        type="number"
                        placeholder="Valor máximo"
                        value={filters.valorMax}
                        onChange={(e) => handleFilterChange('valorMax', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-caixa-primary focus:border-caixa-primary"
                      />
                    </div>
                  </div>

                  {/* Outros filtros... */}
                </div>

                <div className="mt-8 flex gap-3">
                  <button 
                    onClick={clearFilters}
                    className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-semibold"
                  >
                    Limpar
                  </button>
                  <button 
                    onClick={() => setShowFilters(false)}
                    className="flex-1 bg-caixa-primary text-white py-3 rounded-lg font-semibold"
                  >
                    Aplicar
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* WhatsApp Floating Button */}
        <Link
          to="https://wa.me/5561999999999"
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-green-500 rounded-full flex items-center justify-center text-white shadow-2xl hover:shadow-green-500/25 transition-all duration-300 hover:scale-110"
        >
          <FaWhatsapp className="w-7 h-7" />
        </Link>
      </div>
    </>
  );
};

export default PublicImoveisPage;
