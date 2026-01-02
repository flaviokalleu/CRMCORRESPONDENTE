// ATENÇÃO: Este é um exemplo de atualização visual, mantendo a paleta CAIXA e refinando a elegância geral. 
// Ajuste suas classes utilitárias do Tailwind para garantir que as cores estejam corretamente configuradas no seu tailwind.config.js.

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import {
  FaHome, FaMapMarkerAlt, FaPhone, FaWhatsapp, FaEnvelope, FaSearch, FaBed, FaBath, FaCar, FaRuler,
  FaArrowRight, FaHeart, FaUsers, FaAward, FaHandshake, FaBars, FaTimes, FaInstagram, FaFacebook, FaExternalLinkAlt,
  FaArrowDown, FaCrown, FaRocket
} from "react-icons/fa";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import generateStableKey from '../utils/generateStableKey';

// const API_URL = "/api/imoveis?limit=6";
const API_URL = `${process.env.REACT_APP_API_URL}/imoveis`;

// Troque todos os números para 61994617584 e redirecione o formulário para o WhatsApp
const WHATSAPP_NUMBER = "5561994617584";
const WHATSAPP_DISPLAY = "(61) 99461-7584";
const WHATSAPP_LINK = `https://wa.me/${WHATSAPP_NUMBER}`;

// Componente de Card de Imóvel Modernizado
const PropertyCard = ({ property, index }) => (
  <motion.div
    initial={{ y: 60, opacity: 0 }}
    whileInView={{ y: 0, opacity: 1 }}
    viewport={{ once: true }}
    transition={{ duration: 0.6, delay: index * 0.1 }}
    whileHover={{ y: -10, scale: 1.02 }}
    className="group relative bg-white rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500"
  >
    {/* Imagem */}
    <div className="relative h-64 overflow-hidden">
      {property.imagem_capa ? (
        <img 
          src={`/${property.imagem_capa}`} 
          alt={property.nome_imovel} 
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-caixa-primary/20 to-caixa-secondary/30 flex items-center justify-center">
          <FaHome className="text-caixa-primary w-20 h-20 opacity-40" />
        </div>
      )}
      
      {/* Overlay com gradiente */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      {/* Badge */}
      <div className="absolute top-4 left-4">
        <span className="bg-caixa-orange text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg backdrop-blur-sm">
          {property.tags || "Exclusivo"}
        </span>
      </div>
      
      {/* Botão de favorito */}
      <button className="absolute top-4 right-4 w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-all">
        <FaHeart className="w-4 h-4" />
      </button>
    </div>

    {/* Conteúdo */}
    <div className="p-6">
      <h3 className="font-bold text-xl text-gray-900 mb-2 group-hover:text-caixa-primary transition-colors">
        {property.nome_imovel || property.title}
      </h3>
      
      <div className="flex items-center text-gray-500 text-sm mb-4">
        <FaMapMarkerAlt className="mr-2 text-caixa-orange w-4 h-4" />
        {property.localizacao || property.location}
      </div>
      
      {/* Características */}
      <div className="flex items-center gap-4 text-gray-400 text-sm mb-6">
        <span className="flex items-center gap-1">
          <FaBed className="w-4 h-4" />{property.quartos || property.beds}
        </span>
        <span className="flex items-center gap-1">
          <FaBath className="w-4 h-4" />{property.banheiro || property.baths}
        </span>
        <span className="flex items-center gap-1">
          <FaCar className="w-4 h-4" />{property.vagas || property.cars}
        </span>
        <span className="flex items-center gap-1">
          <FaRuler className="w-4 h-4" />{property.area || property.metragem || "--"}
        </span>
      </div>
      
      {/* Preço */}
      <div className="flex items-center justify-between">
        <div className="font-bold text-2xl text-caixa-primary">
          {property.valor_venda ? `R$ ${Number(property.valor_venda).toLocaleString()}` : property.price}
        </div>
        {/* ✅ BOTÃO ATUALIZADO PARA REDIRECIONAR PARA DETALHES */}
        <Link 
          to={`/imovel/${property.id}`} 
          className="bg-caixa-primary text-white px-6 py-2 rounded-full font-semibold hover:bg-caixa-secondary transition-all flex items-center gap-2 group/btn"
        >
          Ver <FaArrowRight className="w-3 h-3 group-hover/btn:translate-x-1 transition-transform" />
        </Link>
      </div>
    </div>
  </motion.div>
);

// Componente de Parceiras
const PartnersSection = () => {
  const partners = [
    { name: "Construsolida", logo: "/construsolida.jpg" },
    { name: "Construteto", logo: "/construteto.jpg" },
    { name: "Global", logo: "/global.png" },
    { name: "Góis", logo: "/gois.png" },
    { name: "Mabel", logo: "/mabel.jpg" }
  ];

  return (
    <section className="py-20 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4">
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Nossos <span className="text-caixa-orange">Parceiros</span>
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Trabalhamos com as melhores construtoras e desenvolvedoras do mercado
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 items-center">
          {partners.map((partner, index) => (
            <motion.div
              key={generateStableKey('partner', partner, index)}
              initial={{ y: 30, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.05, y: -5 }}
              className="group"
            >
              <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100">
                <img 
                  src={partner.logo} 
                  alt={partner.name}
                  className="w-full h-20 object-contain grayscale group-hover:grayscale-0 transition-all duration-300"
                />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

// Componente Principal
const LandingPage = () => {
  const [loading, setLoading] = useState(true);
  const [imoveis, setImoveis] = useState([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, 1], ['0%', '50%']);
  
  useEffect(() => {
    fetch(API_URL)
      .then(res => {
        if (!res.ok) throw new Error('Erro ao buscar imóveis');
        return res.json();
      })
      .then(data => setImoveis(Array.isArray(data) ? data : (data.data || [])))
      .catch((err) => {
        setImoveis([]);
        // Opcional: exiba um alerta ou mensagem de erro amigável
        console.error('Erro ao buscar imóveis:', err);
      })
      .finally(() => setLoading(false));
  }, []);

  const nomeSistema = process.env.REACT_APP_NOME_SISTEMA || "B2M";

  // Função para redirecionar o formulário para o WhatsApp
  function handleFormSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const nome = form[0].value;
    const email = form[1].value;
    const whatsapp = form[2].value;
    const interesse = form[3].value;
    const mensagem = form[4].value;

    const text = encodeURIComponent(
      `Olá! Gostaria de atendimento:\n\nNome: ${nome}\nEmail: ${email}\nWhatsApp: ${whatsapp}\nInteresse: ${interesse}\nMensagem: ${mensagem}`
    );
    window.open(`${WHATSAPP_LINK}?text=${text}`, "_blank");
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-caixa-primary to-caixa-secondary flex items-center justify-center z-50">
        <motion.div 
          initial={{ opacity: 0, scale: 0.5 }} 
          animate={{ opacity: 1, scale: 1 }} 
          className="text-center"
        >
          <div className="w-20 h-20 border-4 border-caixa-orange border-t-transparent rounded-full mx-auto animate-spin mb-6" />
          <h2 className="text-2xl font-bold text-white mb-2">{nomeSistema}</h2>
          <p className="text-caixa-extra-light">Carregando experiência premium...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{nomeSistema} - Imóveis Premium em Valparaíso de Goiás</title>
        <meta name="description" content="Encontre o imóvel perfeito em Valparaíso de Goiás e região! 15 anos de experiência, 500+ imóveis vendidos, atendimento premium." />
      </Helmet>

      {/* NAVBAR FLUTUANTE */}
      <motion.nav 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        // Troque o fundo para azul escuro padrão do sistema
        className="fixed top-0 left-0 right-0 z-50 bg-caixa-primary/95 backdrop-blur-lg border-b border-caixa-primary shadow-lg"
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 py-4">
          <Link to="/" className="flex items-center gap-3">
            <img src="/logo.png" alt={nomeSistema} className="h-10 w-auto" />
            <span className="font-bold text-white text-xl hidden sm:block">{nomeSistema}</span>
          </Link>
          
          <div className="hidden md:flex items-center gap-8">
            {["Início", "Imóveis", "Parceiros", "Sobre", "Contato"].map((item, i) => (
              <a key={i} href={`#${item.toLowerCase()}`} className="text-white hover:text-caixa-orange font-medium transition-colors relative group">
                {item}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-caixa-orange group-hover:w-full transition-all duration-300" />
              </a>
            ))}
            <Link 
              to="/imoveis-publicos" 
              className="bg-caixa-orange text-white px-6 py-2 rounded-full font-semibold hover:bg-caixa-secondary transition-all flex items-center gap-2 shadow-lg hover:shadow-xl"
            >
              <FaSearch className="w-4 h-4" /> Ver Imóveis
            </Link>
          </div>
          
          <button 
            className="md:hidden text-white p-2" 
            onClick={() => setMobileMenuOpen(v => !v)}
          >
            {mobileMenuOpen ? <FaTimes size={24} /> : <FaBars size={24} />}
          </button>
        </div>

        {/* Menu Mobile */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }} 
              animate={{ height: "auto", opacity: 1 }} 
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden bg-caixa-primary border-t border-caixa-primary shadow-lg"
            >
              <div className="flex flex-col px-4 py-4 gap-3">
                {["Início", "Imóveis", "Parceiros", "Sobre", "Contato"].map((item, i) => (
                  <a key={i} href={`#${item.toLowerCase()}`} className="py-2 text-white hover:text-caixa-orange font-medium transition-colors">
                    {item}
                  </a>
                ))}
                <Link to="/imoveis-publicos" className="flex items-center gap-2 bg-caixa-orange text-white px-4 py-3 rounded-full font-semibold mt-2 self-start">
                  <FaSearch className="w-4 h-4" /> Ver Imóveis
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>

      {/* HERO SECTION */}
      <section id="início" ref={heroRef} className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background com Parallax */}
        <motion.div 
          style={{ y }}
          className="absolute inset-0 bg-gradient-to-br from-caixa-primary via-caixa-secondary to-caixa-light"
        />
        
        {/* Elementos decorativos */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-72 h-72 bg-caixa-orange/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-pulse delay-1000" />
        </div>

        <div className="relative z-10 text-center px-4 max-w-6xl mx-auto">
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="mb-6"
          >
            <span className="inline-flex items-center bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-6 py-2 text-white text-sm font-medium">
              <FaCrown className="mr-2 text-caixa-orange" />
              Imobiliária Premium • 15 Anos de Excelência
            </span>
          </motion.div>

          <motion.h1 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 1, delay: 0.4 }}
            className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight"
          >
            Encontre seu
            <span
              className="block text-white font-extrabold"
              style={{ textTransform: "uppercase" }}
            >
              Lar dos Sonhos
            </span>
          </motion.h1>

          <motion.p 
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 1, delay: 0.6 }}
            className="text-xl md:text-2xl text-caixa-extra-light mb-10 max-w-3xl mx-auto leading-relaxed"
          >
            Imóveis exclusivos, atendimento premium e as melhores oportunidades em 
            <span className="text-white font-semibold"> Valparaíso de Goiás</span> e região.
          </motion.p>

          <motion.div 
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 1, delay: 0.8 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <a 
              href="#imoveis" 
              className="bg-caixa-orange hover:bg-orange-600 text-white px-8 py-4 rounded-full font-bold text-lg flex items-center gap-3 shadow-2xl hover:shadow-orange-500/25 transition-all group"
            >
              <FaRocket className="group-hover:rotate-12 transition-transform" />
              Explorar Imóveis
              <FaArrowRight className="group-hover:translate-x-1 transition-transform" />
            </a>
            <a 
              href={`${WHATSAPP_LINK}?text=Olá! Gostaria de falar sobre imóveis.`}
              target="_blank" 
              rel="noopener noreferrer" 
              className="border-2 border-white text-white hover:bg-white hover:text-caixa-primary px-8 py-4 rounded-full font-bold text-lg flex items-center gap-3 backdrop-blur-sm transition-all group"
            >
              <FaWhatsapp className="group-hover:scale-110 transition-transform" />
              Falar com Especialista
            </a>
          </motion.div>

          {/* Scroll Indicator */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2 }}
            className="absolute bottom-10 left-1/2 transform -translate-x-1/2"
          >
            <motion.div 
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="flex flex-col items-center text-white/70"
            >
              <span className="text-sm mb-2">Explore</span>
              <FaArrowDown className="w-4 h-4" />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* IMÓVEIS EM DESTAQUE */}
      <section id="imoveis" className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Imóveis em <span className="text-caixa-orange">Destaque</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Descobra as melhores oportunidades selecionadas especialmente para você
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
            {imoveis.length === 0 ? (
              <div className="col-span-full text-center py-20">
                <FaHome className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">Nenhum imóvel encontrado.</p>
              </div>
            ) : (
              imoveis.map((property, index) => (
                <PropertyCard key={property.id} property={property} index={index} />
              ))
            )}
          </div>

          <motion.div
            initial={{ y: 30, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <Link 
              to="/imoveis-publicos" 
              className="inline-flex items-center gap-3 bg-caixa-primary text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-caixa-secondary transition-all shadow-lg hover:shadow-xl group"
            >
              Ver Todos os Imóveis
              <FaExternalLinkAlt className="group-hover:scale-110 transition-transform" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* PARCEIROS */}
      <PartnersSection />

      {/* SOBRE NÓS */}
      <section id="sobre" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Por que escolher a <span className="text-caixa-orange">{nomeSistema}</span>?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              15 anos de experiência, equipe especializada, atendimento humanizado e tecnologia de ponta
            </p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { icon: FaHome, number: "500+", label: "Imóveis Vendidos", color: "text-caixa-orange" },
              { icon: FaUsers, number: "1000+", label: "Clientes Satisfeitos", color: "text-emerald-500" },
              { icon: FaHandshake, number: "50+", label: "Parceiros Ativos", color: "text-blue-500" },
              { icon: FaAward, number: "15", label: "Anos de Experiência", color: "text-purple-500" }
            ].map((stat, index) => (
              <motion.div
                key={index}
                initial={{ y: 50, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -5 }}
                className="text-center group"
              >
                <div className="bg-gray-50 rounded-2xl p-8 group-hover:bg-white group-hover:shadow-lg transition-all">
                  <stat.icon className={`w-12 h-12 ${stat.color} mx-auto mb-4 group-hover:scale-110 transition-transform`} />
                  <div className="font-bold text-3xl text-gray-900 mb-2">{stat.number}</div>
                  <div className="text-gray-600 font-medium">{stat.label}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CONTATO */}
      <section id="contato" className="py-24 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4">
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            className="bg-white rounded-3xl shadow-2xl overflow-hidden"
          >
            <div className="grid md:grid-cols-2">
              {/* Informações de Contato */}
              <div className="bg-caixa-primary p-8 md:p-12 text-white">
                <h3 className="text-3xl font-bold mb-6">Vamos Conversar?</h3>
                <p className="text-caixa-extra-light mb-8">
                  Nossa equipe está pronta para te ajudar a encontrar o imóvel perfeito.
                </p>
                
                <div className="space-y-4">
                  <a href={`tel:+${WHATSAPP_NUMBER}`} className="flex items-center gap-4 hover:text-caixa-orange transition-colors group">
                    <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center group-hover:bg-caixa-orange transition-colors">
                      <FaPhone className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-semibold">{WHATSAPP_DISPLAY}</div>
                      <div className="text-sm text-caixa-extra-light">Clique para ligar</div>
                    </div>
                  </a>
                  
                  <a href="mailto:contato@B2M.com.br" className="flex items-center gap-4 hover:text-caixa-orange transition-colors group">
                    <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center group-hover:bg-caixa-orange transition-colors">
                      <FaEnvelope className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-semibold">contato@B2M.com.br</div>
                      <div className="text-sm text-caixa-extra-light">Envie um email</div>
                    </div>
                  </a>
                  
                  <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 hover:text-caixa-orange transition-colors group">
                    <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center group-hover:bg-green-500 transition-colors">
                      <FaWhatsapp className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-semibold">WhatsApp Premium</div>
                      <div className="text-sm text-caixa-extra-light">Atendimento 24h</div>
                    </div>
                  </a>
                  
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center">
                      <FaMapMarkerAlt className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-semibold">Valparaíso de Goiás - GO</div>
                      <div className="text-sm text-caixa-extra-light">Atendimento presencial</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Formulário */}
              <div className="p-8 md:p-12">
                <form className="space-y-6" onSubmit={handleFormSubmit}>
                  <div className="grid md:grid-cols-2 gap-4">
                    <input 
                      type="text" 
                      required 
                      placeholder="Nome Completo" 
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-caixa-primary focus:border-caixa-primary transition-all" 
                    />
                    <input 
                      type="email" 
                      required 
                      placeholder="Email" 
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-caixa-primary focus:border-caixa-primary transition-all" 
                    />
                  </div>
                  <input 
                    type="tel" 
                    required 
                    placeholder="WhatsApp" 
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-caixa-primary focus:border-caixa-primary transition-all" 
                  />
                  <select className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-caixa-primary focus:border-caixa-primary transition-all">
                    <option value="">Tipo de Interesse</option>
                    <option value="compra">Compra de Imóvel</option>
                    <option value="venda">Venda de Imóvel</option>
                    <option value="locacao">Locação</option>
                    <option value="consultoria">Consultoria</option>
                    <option value="outros">Outros</option>
                  </select>
                  <textarea 
                    rows={4} 
                    placeholder="Conte-nos sobre seu imóvel ideal..." 
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-caixa-primary focus:border-caixa-primary transition-all resize-none"
                  />
                  <button 
                    type="submit" 
                    className="w-full bg-caixa-primary text-white py-4 rounded-xl font-bold text-lg hover:bg-caixa-secondary transition-all flex items-center justify-center gap-3 shadow-lg hover:shadow-xl group"
                  >
                    Enviar Mensagem 
                    <FaArrowRight className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </form>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      
        <footer className="bg-caixa-primary text-white py-16">
          <div className="max-w-7xl mx-auto px-4">
            <div className="grid md:grid-cols-4 gap-8 mb-8">
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <img src="/logo.png" alt={nomeSistema} className="h-12 w-auto" />
              <div>
            <h3 className="font-bold text-xl">{nomeSistema}</h3>
            <p className="text-caixa-extra-light">Imobiliária Premium</p>
              </div>
            </div>
            <p className="text-caixa-extra-light mb-6 max-w-md">
              Transformando sonhos em realidade há mais de 15 anos. 
              Sua confiança é nossa maior conquista.
            </p>
            <div className="flex gap-4">
              {[
            { icon: FaInstagram, href: "http://instagram.com/b2m_imoveis" },
            { icon: FaFacebook, href: "https://www.facebook.com/profile.php?id=61569968460913" },
            { icon: FaWhatsapp, href: "https://wa.me/5561994617584" }
              ].map((social, index) => (
            <a 
              key={index}
              href={social.href} 
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-caixa-orange transition-colors"
            >
              <social.icon className="w-5 h-5" />
            </a>
              ))}
            </div>
          </div>
          
          <div>
            <h4 className="font-bold mb-4">Links Rápidos</h4>
            <ul className="space-y-2 text-caixa-extra-light">
              {["Início", "Imóveis", "Sobre", "Contato"].map((link, index) => (
            <li key={index}>
              <a href={`#${link.toLowerCase()}`} className="hover:text-white transition-colors">
                {link}
              </a>
            </li>
              ))}
            </ul>
          </div>
          
          <div>
            <h4 className="font-bold mb-4">Contato</h4>
            <div className="space-y-2 text-caixa-extra-light text-sm">
              <div>(61) 99461-7584</div>
              <div>contato@B2M.com.br</div>
              <div>Valparaíso de Goiás - GO</div>
            </div>
          </div>
            </div>
            
            <div className="border-t border-white/10 pt-8 text-center text-caixa-extra-light text-sm">
          © {new Date().getFullYear()} {nomeSistema}. Todos os direitos reservados.
            </div>
          </div>
        </footer>

      
      <motion.a 
        href={WHATSAPP_LINK} 
        target="_blank" 
        rel="noopener noreferrer"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className="fixed bottom-6 right-6 z-50 w-16 h-16 bg-green-500 rounded-full flex items-center justify-center text-white shadow-2xl hover:shadow-green-500/50 transition-all"
      >
        <FaWhatsapp className="w-8 h-8" />
      </motion.a>
    </>
  );
};

export default LandingPage;
