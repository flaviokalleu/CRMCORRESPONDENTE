import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { 
  FaBed, 
  FaBath, 
  FaWhatsapp, 
  FaArrowLeft, 
  FaMapMarkerAlt,
  FaCar,
  FaRuler,
  FaShare,
  FaHeart,
  FaEye,
  FaHome,
  FaExpand,
  FaFilter
} from "react-icons/fa";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import Slider from "react-slick";

// ✅ MODAL MELHORADO COM ANIMAÇÕES SOFISTICADAS
const Modal = ({
  isOpen,
  onClose,
  currentImage,
  setCurrentImage,
  imageList,
}) => {
  if (!isOpen) return null;

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const nextImage = () => {
    setCurrentImage((prev) => (prev < imageList.length - 1 ? prev + 1 : 0));
  };

  const prevImage = () => {
    setCurrentImage((prev) => (prev > 0 ? prev - 1 : imageList.length - 1));
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 bg-black/95 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={handleOverlayClick}
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0, rotateY: 90 }}
            animate={{ scale: 1, opacity: 1, rotateY: 0 }}
            exit={{ scale: 0.5, opacity: 0, rotateY: -90 }}
            transition={{ 
              type: "spring", 
              damping: 25, 
              stiffness: 300,
              duration: 0.6
            }}
            className="relative max-w-7xl max-h-[90vh] w-full mx-4"
          >
            <motion.img
              key={`modal-image-${currentImage}`}
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
              src={imageList[currentImage]}
              alt="Imagem ampliada"
              className="w-full h-full object-contain rounded-2xl shadow-2xl"
            />
            
            {/* Controles Melhorados */}
            <motion.button
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              className="absolute top-4 right-4 w-14 h-14 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-all shadow-lg"
              onClick={onClose}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </motion.button>
            
            {/* Navegação Aprimorada */}
            {imageList.length > 1 && (
              <>
                <motion.button
                  whileHover={{ scale: 1.1, x: -5 }}
                  whileTap={{ scale: 0.9 }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-14 h-14 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-all shadow-lg"
                  onClick={prevImage}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.1, x: 5 }}
                  whileTap={{ scale: 0.9 }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-14 h-14 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-all shadow-lg"
                  onClick={nextImage}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </motion.button>
                
                {/* Indicadores Animados */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-3"
                >
                  {imageList.map((_, index) => (
                    <motion.button
                      key={`indicator-${index}`}
                      whileHover={{ scale: 1.3 }}
                      whileTap={{ scale: 0.8 }}
                      className={`w-3 h-3 rounded-full transition-all ${
                        index === currentImage ? 'bg-white shadow-lg' : 'bg-white/40'
                      }`}
                      onClick={() => setCurrentImage(index)}
                    />
                  ))}
                </motion.div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ✅ COMPONENTE DE CARD APRIMORADO
const ImovelCard = ({ imovel, index, delay = 0 }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true }}
      transition={{ 
        duration: 0.6, 
        delay: delay,
        type: "spring",
        stiffness: 100
      }}
      whileHover={{ 
        y: -15, 
        rotateX: 5,
        transition: { duration: 0.3 }
      }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className="group perspective-1000"
    >
      <Link to={`/imovel/${imovel.id}`} className="block">
        <div className="bg-white rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-500 overflow-hidden transform-gpu">
          <div className="relative h-56 overflow-hidden">
            <motion.img
              src={`${process.env.REACT_APP_API_URL}/${imovel.imagem_capa}`}
              alt={imovel.nome_imovel}
              className="w-full h-full object-cover"
              animate={{
                scale: isHovered ? 1.1 : 1,
                filter: isHovered ? "brightness(1.1)" : "brightness(1)"
              }}
              transition={{ duration: 0.5 }}
            />
            
            {/* Overlay Gradient */}
            <motion.div 
              className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"
              animate={{ opacity: isHovered ? 1 : 0 }}
              transition={{ duration: 0.3 }}
            />
            
            {/* Badge Flutuante */}
            <motion.div 
              className="absolute top-4 left-4"
              animate={{ 
                scale: isHovered ? 1.1 : 1,
                rotate: isHovered ? -5 : 0
              }}
              transition={{ duration: 0.3 }}
            >
              <span className="bg-blue-500/90 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm font-semibold shadow-lg">
                {imovel.tipo}
              </span>
            </motion.div>
            
            {/* Botão Ver Mais */}
            <motion.div
              className="absolute bottom-4 right-4"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ 
                opacity: isHovered ? 1 : 0,
                scale: isHovered ? 1 : 0,
                rotate: isHovered ? 0 : 180
              }}
              transition={{ duration: 0.3 }}
            >
              <div className="w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center text-blue-600 shadow-lg">
                <FaEye className="w-4 h-4" />
              </div>
            </motion.div>
          </div>
          
          <div className="p-6">
            <motion.h3 
              className="font-bold text-lg text-gray-900 mb-3 group-hover:text-blue-600 transition-colors line-clamp-2"
              animate={{ x: isHovered ? 5 : 0 }}
              transition={{ duration: 0.3 }}
            >
              {imovel.nome_imovel}
            </motion.h3>
            
            <motion.div 
              className="flex items-center text-gray-500 text-sm mb-4"
              animate={{ x: isHovered ? 5 : 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <FaMapMarkerAlt className="w-3 h-3 mr-2 text-red-500" />
              <span className="line-clamp-1">{imovel.localizacao}</span>
            </motion.div>
            
            {/* Características Rápidas */}
            <motion.div 
              className="flex gap-4 mb-4"
              animate={{ x: isHovered ? 5 : 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
            >
              {imovel.quartos && (
                <div className="flex items-center gap-1 text-gray-600 text-sm">
                  <FaBed className="w-3 h-3" />
                  <span>{imovel.quartos}</span>
                </div>
              )}
              {imovel.banheiro && (
                <div className="flex items-center gap-1 text-gray-600 text-sm">
                  <FaBath className="w-3 h-3" />
                  <span>{imovel.banheiro}</span>
                </div>
              )}
              {imovel.area && (
                <div className="flex items-center gap-1 text-gray-600 text-sm">
                  <FaRuler className="w-3 h-3" />
                  <span>{imovel.area}m²</span>
                </div>
              )}
            </motion.div>
            
            <motion.div 
              className="text-2xl font-bold text-blue-600"
              animate={{ 
                scale: isHovered ? 1.05 : 1,
                x: isHovered ? 5 : 0
              }}
              transition={{ duration: 0.3, delay: 0.3 }}
            >
              {new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              }).format(imovel.valor_venda)}
            </motion.div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

// ✅ COMPONENTE PRINCIPAL SUPER APRIMORADO
const ImovelDetail = () => {
  const { id } = useParams();
  const [imovel, setImovel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [imageList, setImageList] = useState([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [imoveisSemelhantes, setImoveisSemelhantes] = useState([]);
  const [todosImoveis, setTodosImoveis] = useState([]);
  const [isFavorited, setIsFavorited] = useState(false);
  const [showAllSimilar, setShowAllSimilar] = useState(false);

  // Scroll parallax effect
  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 300], [0, -50]);
  const y2 = useTransform(scrollY, [0, 300], [0, -100]);

  useEffect(() => {
    const fetchImovel = async () => {
      try {
        const response = await fetch(
          `${process.env.REACT_APP_API_URL}/imoveis/${id}`
        );

        if (!response.ok) {
          throw new Error("Imóvel não encontrado.");
        }

        const data = await response.json();
        setImovel(data.data);

        const imagesString = data.data.imagens;
        const images =
          typeof imagesString === "string"
            ? JSON.parse(imagesString.replace(/&quot;/g, '"'))
            : Array.isArray(imagesString)
            ? imagesString
            : [];

        setImageList(
          images.map(
            (img) =>
              `${process.env.REACT_APP_API_URL}/${img.replace(/\\/g, "/")}`
          )
        );

        // Fetch de imóveis semelhantes
        try {
          const responseSemelhantes = await fetch(
            `${process.env.REACT_APP_API_URL}/imoveis/${id}/semelhantes`
          );

          if (responseSemelhantes.ok) {
            const semelhantesData = await responseSemelhantes.json();
            setImoveisSemelhantes(semelhantesData);
          }
        } catch (semelhantesError) {
          console.error('Erro ao buscar imóveis semelhantes:', semelhantesError);
        }

        // Fetch de todos os imóveis para a seção expandida
        try {
          const responseTodos = await fetch(
            `${process.env.REACT_APP_API_URL}/imoveis`
          );

          if (responseTodos.ok) {
            const todosData = await responseTodos.json();
            // Filtrar o imóvel atual e limitar a 12 itens
            const filteredImoveis = todosData.data?.filter(item => item.id !== parseInt(id)).slice(0, 12) || [];
            setTodosImoveis(filteredImoveis);
          }
        } catch (todosError) {
          console.error('Erro ao buscar todos os imóveis:', todosError);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchImovel();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <motion.div 
            className="w-20 h-20 border-3 border-gray-200 border-t-blue-600 rounded-full mx-auto mb-6"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
          <motion.div 
            className="space-y-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h3 className="text-2xl font-bold text-gray-900">Carregando imóvel</h3>
            <p className="text-gray-500">Aguarde um momento...</p>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md mx-auto"
        >
          <motion.div 
            className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6"
            animate={{ 
              scale: [1, 1.1, 1],
              rotate: [0, -5, 5, 0]
            }}
            transition={{ 
              duration: 2, 
              repeat: Infinity, 
              repeatType: "reverse" 
            }}
          >
            <FaHome className="w-10 h-10 text-red-500" />
          </motion.div>
          <h3 className="text-2xl font-bold text-gray-900 mb-4">Oops!</h3>
          <p className="text-gray-600 mb-8">{error}</p>
          <Link 
            to="/imoveis-publicos" 
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-8 py-3 rounded-full font-semibold hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl"
          >
            <FaArrowLeft className="w-4 h-4" />
            Voltar aos Imóveis
          </Link>
        </motion.div>
      </div>
    );
  }

  const {
    nome_imovel = "Nome não disponível",
    valor_venda = 0,
    imagem_capa,
    descricao_imovel = "Descrição não disponível.",
    quartos = "N/A",
    banheiro = "N/A",
    localizacao = "Localização não informada",
    vagas = "N/A",
    area = "N/A",
    tipo = "Casa",
  } = imovel || {};

  const imageUrl = imagem_capa
    ? `${process.env.REACT_APP_API_URL}/${imagem_capa}`
    : "https://via.placeholder.com/800x600";

  const whatsappMessage = `Olá! Estou interessado no imóvel "${nome_imovel}" no valor de ${new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor_venda)}. Veja mais em: ${window.location.href}`;
  
  const whatsappLink = `https://api.whatsapp.com/send/?phone=5561994617584&text=${encodeURIComponent(whatsappMessage)}`;

  const shareData = {
    title: nome_imovel,
    text: `Confira este imóvel incrível: ${nome_imovel}`,
    url: window.location.href,
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log('Erro ao compartilhar:', err);
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copiado para a área de transferência!');
    }
  };

  const sliderSettings = {
    dots: false,
    infinite: true,
    speed: 500,
    slidesToShow: Math.min(imageList.length, 4),
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 3000,
    pauseOnHover: true,
    responsive: [
      {
        breakpoint: 1024,
        settings: {
          slidesToShow: Math.min(imageList.length, 3),
        }
      },
      {
        breakpoint: 768,
        settings: {
          slidesToShow: Math.min(imageList.length, 2),
        }
      },
      {
        breakpoint: 480,
        settings: {
          slidesToShow: 1,
        }
      }
    ]
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 relative overflow-hidden">
      {/* ✅ HEADER APRIMORADO COM EFEITOS */}
      <motion.header 
        className="bg-white/80 backdrop-blur-lg border-b border-gray-100 sticky top-0 z-40"
        style={{ y: y1 }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <motion.div
              whileHover={{ x: -5 }}
              transition={{ duration: 0.2 }}
            >
              <Link 
                to="/imoveis-publicos" 
                className="inline-flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors group"
              >
                <motion.div
                  whileHover={{ x: -3 }}
                  transition={{ duration: 0.2 }}
                >
                  <FaArrowLeft className="w-4 h-4" />
                </motion.div>
                <span className="font-medium">Voltar</span>
              </Link>
            </motion.div>
            
            <div className="flex items-center gap-4">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsFavorited(!isFavorited)}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                  isFavorited 
                    ? 'bg-red-50 text-red-500' 
                    : 'bg-gray-50 text-gray-400 hover:bg-red-50 hover:text-red-500'
                }`}
              >
                <motion.div
                  animate={{ 
                    scale: isFavorited ? [1, 1.3, 1] : 1,
                    rotate: isFavorited ? [0, -10, 10, 0] : 0
                  }}
                  transition={{ duration: 0.5 }}
                >
                  <FaHeart className="w-4 h-4" />
                </motion.div>
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.1, rotate: 5 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleShare}
                className="w-10 h-10 rounded-full bg-gray-50 text-gray-400 hover:bg-blue-50 hover:text-blue-500 flex items-center justify-center transition-all"
              >
                <FaShare className="w-4 h-4" />
              </motion.button>
            </div>
          </div>
        </div>
      </motion.header>

      {/* ✅ HERO SECTION COM PARALLAX */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-8"
          style={{ y: y2 }}
        >
          
          {/* ✅ GALERIA APRIMORADA */}
          <div className="lg:col-span-2 space-y-6">
            {/* Imagem Principal com Efeitos */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8 }}
              className="relative group"
            >
              <div className="relative h-96 lg:h-[500px] rounded-3xl overflow-hidden shadow-2xl">
                <motion.img
                  src={imageList[currentImageIndex] || imageUrl}
                  alt={nome_imovel}
                  className="w-full h-full object-cover cursor-pointer"
                  whileHover={{ scale: 1.05 }}
                  transition={{ duration: 0.5 }}
                  onClick={() => setIsModalOpen(true)}
                />
                
                {/* Overlay Gradiente Dinâmico */}
                <motion.div 
                  className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent"
                  initial={{ opacity: 0 }}
                  whileHover={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                />
                
                {/* Badge Animado */}
                <motion.div 
                  className="absolute top-6 left-6"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                  whileHover={{ scale: 1.1, rotate: -3 }}
                >
                  <span className="bg-white/90 backdrop-blur-sm text-gray-900 px-4 py-2 rounded-full text-sm font-semibold shadow-lg">
                    {tipo}
                  </span>
                </motion.div>
                
                {/* Botão Expandir Melhorado */}
                <motion.button
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 }}
                  whileHover={{ scale: 1.2, rotate: 15 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setIsModalOpen(true)}
                  className="absolute top-6 right-6 w-12 h-12 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center text-gray-700 hover:bg-white transition-all shadow-lg"
                >
                  <FaExpand className="w-5 h-5" />
                </motion.button>

                {/* Contador de Imagens */}
                {imageList.length > 1 && (
                  <motion.div 
                    className="absolute bottom-6 right-6"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 }}
                  >
                    <span className="bg-black/50 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm font-medium">
                      {currentImageIndex + 1} / {imageList.length}
                    </span>
                  </motion.div>
                )}
              </div>
            </motion.div>

            {/* Galeria Thumbnails Melhorada */}
            {imageList.length > 1 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <Slider {...sliderSettings}>
                  {imageList.map((img, index) => (
                    <div key={index} className="px-2">
                      <motion.div
                        whileHover={{ scale: 1.05, y: -5 }}
                        className={`relative h-24 rounded-xl overflow-hidden cursor-pointer transition-all ${
                          index === currentImageIndex 
                            ? 'ring-3 ring-blue-500 ring-offset-2 shadow-lg' 
                            : 'hover:opacity-80 hover:shadow-md'
                        }`}
                        onClick={() => setCurrentImageIndex(index)}
                      >
                        <img
                          src={img}
                          alt={`Imagem ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        {index === currentImageIndex && (
                          <motion.div
                            layoutId="activeImageIndicator"
                            className="absolute inset-0 bg-blue-500/20"
                          />
                        )}
                      </motion.div>
                    </div>
                  ))}
                </Slider>
              </motion.div>
            )}
          </div>

          {/* ✅ SIDEBAR INFORMAÇÕES APRIMORADA */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="lg:col-span-1"
          >
            <motion.div 
              className="bg-white rounded-3xl shadow-xl p-8 sticky top-24"
              whileHover={{ boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)" }}
              transition={{ duration: 0.3 }}
            >
              
              {/* Título e Preço com Animações */}
              <div className="mb-8">
                <motion.h1 
                  className="text-3xl font-bold text-gray-900 mb-4 leading-tight"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  {nome_imovel}
                </motion.h1>
                
                <motion.div 
                  className="text-4xl font-bold text-blue-600 mb-4"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
                  whileHover={{ scale: 1.05 }}
                >
                  {new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  }).format(valor_venda)}
                </motion.div>
                
                <motion.div 
                  className="flex items-center text-gray-500"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 }}
                >
                  <FaMapMarkerAlt className="w-5 h-5 mr-2 text-red-500" />
                  <span className="text-lg">{localizacao}</span>
                </motion.div>
              </div>

              {/* Características com Animações Staggered */}
              <div className="grid grid-cols-2 gap-4 mb-8">
                {[
                  { icon: FaBed, label: "Quartos", value: quartos, color: "blue" },
                  { icon: FaBath, label: "Banheiros", value: banheiro, color: "green" },
                  { icon: FaCar, label: "Vagas", value: vagas, color: "purple" },
                  { icon: FaRuler, label: "Área", value: area ? `${area}m²` : "N/A", color: "orange" },
                ].map((item, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20, scale: 0.8 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ 
                      duration: 0.4, 
                      delay: 0.7 + index * 0.1,
                      type: "spring",
                      stiffness: 150
                    }}
                    whileHover={{ 
                      scale: 1.05, 
                      y: -5,
                      boxShadow: "0 10px 25px -10px rgba(0, 0, 0, 0.2)"
                    }}
                    className="bg-gray-50 rounded-2xl p-4 text-center hover:bg-gray-100 transition-all cursor-pointer"
                  >
                    <motion.div
                      whileHover={{ rotate: 10, scale: 1.2 }}
                      transition={{ duration: 0.2 }}
                    >
                      <item.icon className={`w-6 h-6 text-${item.color}-600 mx-auto mb-2`} />
                    </motion.div>
                    <div className="font-bold text-xl text-gray-900">{item.value}</div>
                    <div className="text-sm text-gray-500">{item.label}</div>
                  </motion.div>
                ))}
              </div>

              {/* Descrição */}
              <motion.div 
                className="mb-8"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.1 }}
              >
                <h3 className="text-xl font-bold text-gray-900 mb-4">Sobre o imóvel</h3>
                <p className="text-gray-600 leading-relaxed">{descricao_imovel}</p>
              </motion.div>

              {/* CTA Melhorado */}
              <motion.a
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 1.2 }}
                whileHover={{ 
                  scale: 1.02, 
                  y: -2,
                  boxShadow: "0 20px 40px -10px rgba(34, 197, 94, 0.4)"
                }}
                whileTap={{ scale: 0.98 }}
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white text-center px-8 py-4 rounded-2xl font-bold text-lg transition-all shadow-xl overflow-hidden relative"
              >
                <motion.div
                  className="absolute inset-0 bg-white/20"
                  initial={{ x: "-100%" }}
                  whileHover={{ x: "100%" }}
                  transition={{ duration: 0.5 }}
                />
                <div className="relative flex items-center justify-center gap-3">
                  <motion.div
                    animate={{ rotate: [0, 5, -5, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <FaWhatsapp className="w-6 h-6" />
                  </motion.div>
                  <span>Tenho Interesse</span>
                </div>
                <div className="relative text-sm opacity-90 mt-1">
                  Fale conosco no WhatsApp
                </div>
              </motion.a>
            </motion.div>
          </motion.div>
        </motion.div>
      </section>

      {/* ✅ SEÇÃO IMÓVEIS SEMELHANTES APRIMORADA */}
      {imoveisSemelhantes.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <div className="text-center mb-12">
              <motion.h2 
                className="text-4xl font-bold text-gray-900 mb-4"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
              >
                Imóveis Semelhantes
              </motion.h2>
              <motion.p 
                className="text-xl text-gray-600"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                Outras opções que podem interessar você
              </motion.p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {imoveisSemelhantes.slice(0, 4).map((imovel, index) => (
                <ImovelCard 
                  key={imovel.id} 
                  imovel={imovel} 
                  index={index} 
                  delay={index * 0.1}
                />
              ))}
            </div>
          </motion.div>
        </section>
      )}

      {/* ✅ NOVA SEÇÃO: MAIS IMÓVEIS */}
      {todosImoveis.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 bg-gradient-to-br from-gray-50 to-white rounded-3xl mx-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <div className="text-center mb-12">
              <motion.h2 
                className="text-4xl font-bold text-gray-900 mb-4"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
              >
                Explore Mais Imóveis
              </motion.h2>
              <motion.p 
                className="text-xl text-gray-600 mb-8"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                Descubra outras oportunidades incríveis
              </motion.p>

              <motion.button
                onClick={() => setShowAllSimilar(!showAllSimilar)}
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-full font-semibold hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.4 }}
              >
                <FaFilter className="w-4 h-4" />
                {showAllSimilar ? 'Ver Menos' : 'Ver Todos'}
              </motion.button>
            </div>

            <AnimatePresence mode="wait">
              <motion.div 
                key={showAllSimilar ? 'all' : 'limited'}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.5 }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
              >
                {todosImoveis.slice(0, showAllSimilar ? todosImoveis.length : 8).map((imovel, index) => (
                  <ImovelCard 
                    key={imovel.id} 
                    imovel={imovel} 
                    index={index} 
                    delay={index * 0.05}
                  />
                ))}
              </motion.div>
            </AnimatePresence>

            {!showAllSimilar && todosImoveis.length > 8 && (
              <motion.div 
                className="text-center mt-8"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.5 }}
              >
                <p className="text-gray-500">
                  E mais {todosImoveis.length - 8} imóveis disponíveis
                </p>
              </motion.div>
            )}
          </motion.div>
        </section>
      )}

      {/* Modal Aprimorado */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        currentImage={imageList[currentImageIndex]}
        setCurrentImage={setCurrentImageIndex}
        imageList={imageList}
      />
    </div>
  );
};

export default ImovelDetail;