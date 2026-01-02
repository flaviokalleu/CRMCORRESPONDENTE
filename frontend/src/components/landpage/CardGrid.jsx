import React, { useEffect, useState } from "react";
import generateStableKey from 'utils/generateStableKey';
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { 
  FaBed, 
  FaBath, 
  FaMapMarkerAlt, 
  FaHeart, 
  FaEye,
  FaCar,
  FaRuler,
  FaBuilding
} from "react-icons/fa";
import axios from "axios";

const CardGrid = () => {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const response = await axios.get(
          `${process.env.REACT_APP_API_URL}/imoveis`
        );
        setProperties(response.data);
      } catch (error) {
        console.error("Erro ao buscar imóveis:", error);
        setError("Erro ao carregar propriedades");
      } finally {
        setLoading(false);
      }
    };

    fetchProperties();
  }, []);

  const displayedProperties = properties.slice(0, 6);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const cardVariants = {
    hidden: { y: 50, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.6,
        ease: "easeOut",
      },
    },
  };

  // Loading Component
  const LoadingCard = () => (
    <div className="bg-white/10 backdrop-blur-md rounded-2xl overflow-hidden animate-pulse">
      <div className="bg-white/20 h-56"></div>
      <div className="p-6 space-y-3">
        <div className="bg-white/20 h-4 rounded w-3/4"></div>
        <div className="bg-white/20 h-3 rounded w-1/2"></div>
        <div className="bg-white/20 h-3 rounded w-2/3"></div>
        <div className="flex space-x-4">
          <div className="bg-white/20 h-3 rounded w-1/4"></div>
          <div className="bg-white/20 h-3 rounded w-1/4"></div>
        </div>
        <div className="bg-white/20 h-8 rounded"></div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Propriedades em{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                Destaque
              </span>
            </h2>
            <p className="text-blue-200 text-lg max-w-2xl mx-auto">
              Carregando nossa seleção exclusiva dos melhores imóveis
            </p>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[...Array(6)].map((_, index) => (
              <LoadingCard key={generateStableKey(index)} />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="text-red-400 mb-4">
            <FaBuilding className="text-6xl mx-auto mb-4 opacity-50" />
            <h3 className="text-2xl font-bold mb-2">Ops! Algo deu errado</h3>
            <p>{error}</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => window.location.reload()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
          >
            Tentar novamente
          </motion.button>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 relative">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 relative z-10">
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Propriedades em{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
              Destaque
            </span>
          </h2>
          <p className="text-blue-200 text-lg max-w-2xl mx-auto">
            Descubra nossa seleção exclusiva dos melhores imóveis disponíveis
          </p>
        </motion.div>

        {displayedProperties.length === 0 ? (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center py-16"
          >
            <FaBuilding className="text-6xl text-gray-500 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-white mb-2">Nenhum imóvel encontrado</h3>
            <p className="text-blue-200">Em breve teremos novos imóveis disponíveis</p>
          </motion.div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {displayedProperties.map((property, index) => (
              <motion.div
                key={property.id}
                variants={cardVariants}
                whileHover={{ y: -10 }}
                className="group relative"
              >
                <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md border border-white/20 rounded-2xl overflow-hidden transition-all duration-300 hover:border-blue-400/50 hover:shadow-2xl hover:shadow-blue-500/20">
                  {/* Image Container */}
                  <div className="relative overflow-hidden h-56">
                    <img
                      src={
                        property.imagem_capa
                          ? `${process.env.REACT_APP_API_URL}/${property.imagem_capa.replace(/\\/g, "/")}`
                          : "https://via.placeholder.com/500x300/1e293b/60a5fa?text=Imóvel"
                      }
                      alt={property.nome_imovel}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      loading="lazy"
                    />
                    
                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center">
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-red-500/80 transition-colors"
                        >
                          <FaHeart />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-blue-500/80 transition-colors"
                        >
                          <FaEye />
                        </motion.button>
                      </div>
                    </div>

                    {/* Property Type Badge */}
                    <div className="absolute top-4 left-4">
                      <span className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg">
                        {property.tipo?.toUpperCase() || "IMÓVEL"}
                      </span>
                    </div>

                    {/* Status Badge */}
                    <div className="absolute top-4 right-4">
                      <span className="bg-green-500 text-white px-2 py-1 rounded-full text-xs font-semibold shadow-lg">
                        Disponível
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-white mb-2 group-hover:text-blue-300 transition-colors line-clamp-1">
                      {property.nome_imovel}
                    </h3>
                    
                    <div className="flex items-center text-blue-200 text-sm mb-3">
                      <FaMapMarkerAlt className="mr-2 flex-shrink-0" />
                      <span className="line-clamp-1">{property.localizacao}</span>
                    </div>

                    <p className="text-blue-200/80 text-sm mb-4 line-clamp-2 leading-relaxed">
                      {property.descricao_imovel?.substring(0, 120) || "Excelente oportunidade de investimento"}...
                    </p>

                    {/* Features */}
                    <div className="flex items-center justify-between mb-4 text-blue-200 text-sm">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center">
                          <FaBed className="mr-1" />
                          <span>{property.quartos || 0}</span>
                        </div>
                        <div className="flex items-center">
                          <FaBath className="mr-1" />
                          <span>{property.banheiro || 0}</span>
                        </div>
                        <div className="flex items-center">
                          <FaCar className="mr-1" />
                          <span>{property.garagem || 0}</span>
                        </div>
                      </div>
                      
                      {property.area && (
                        <div className="flex items-center text-xs">
                          <FaRuler className="mr-1" />
                          <span>{property.area}m²</span>
                        </div>
                      )}
                    </div>

                    {/* Price */}
                    <div className="mb-6">
                      <span className="text-2xl font-bold text-white">
                        {property.valor_aluguel 
                          ? Number(property.valor_aluguel).toLocaleString("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            })
                          : "Consultar"
                        }
                      </span>
                      {property.valor_aluguel && (
                        <span className="text-blue-200 text-sm ml-1">/mês</span>
                      )}
                    </div>

                    {/* CTA Button */}
                    <Link to={`/imoveis/${property.id}`} className="block">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-4 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl"
                      >
                        Ver Detalhes
                      </motion.button>
                    </Link>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* View All Button */}
        {displayedProperties.length > 0 && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            viewport={{ once: true }}
            className="text-center mt-12"
          >
            <Link to="/imoveis">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-transparent border-2 border-blue-400 text-blue-400 hover:bg-blue-400 hover:text-white px-8 py-3 rounded-xl font-semibold transition-all duration-300 group"
              >
                <span className="flex items-center">
                  Ver Todos os Imóveis
                  <motion.span
                    className="ml-2"
                    animate={{ x: [0, 5, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    →
                  </motion.span>
                </span>
              </motion.button>
            </Link>
          </motion.div>
        )}
      </div>
    </section>
  );
};

export default CardGrid;
