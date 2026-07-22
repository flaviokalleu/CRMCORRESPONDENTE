import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, MapPin, Home, ChevronDown, Clock, Users, Award, ThumbsUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const stats = [
  { icon: Award, value: '500+', label: 'Negócios fechados' },
  { icon: Clock, value: '15', label: 'Anos de mercado' },
  { icon: ThumbsUp, value: '95%', label: 'Clientes satisfeitos' },
  { icon: Users, value: '48h', label: 'Primeira seleção' },
];

const HeroSection = () => {
  const navigate = useNavigate();
  const [searchData, setSearchData] = useState({ localizacao: '', tipo: '' });

  const handleSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchData.localizacao) params.set('localizacao', searchData.localizacao);
    if (searchData.tipo) params.set('tipo', searchData.tipo);
    navigate(`/imoveis-publicos?${params.toString()}`);
  };

  return (
    <section id="inicio" className="relative min-h-screen overflow-hidden">
      {/* ─── Background Video ─── */}
      <video
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        className="absolute inset-0 w-full h-full object-cover"
      >
        <source src="/hero-video.mp4" type="video/mp4" />
        <source src="/hero-video-2.mp4" type="video/mp4" />
      </video>

      {/* ─── Overlay Gradient ─── */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0B1426]/90 via-[#0B1426]/75 to-[#0B1426]/95" />

      {/* ─── Animated Decorative Elements ─── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Glowing orbs */}
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.15, 0.25, 0.15] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-20 -right-20 h-[500px] w-[500px] rounded-full bg-[#F97316]/20 blur-[120px]"
        />
        <motion.div
          animate={{ scale: [1.2, 1, 1.2], opacity: [0.1, 0.2, 0.1] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -bottom-32 -left-32 h-[400px] w-[400px] rounded-full bg-[#F97316]/10 blur-[100px]"
        />
        <motion.div
          animate={{ y: [0, -20, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-1/4 right-[15%] h-64 w-64 rounded-full bg-white/[0.02] blur-3xl"
        />

        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />

        {/* Decorative lines */}
        <div className="absolute left-[12%] top-0 h-full w-px bg-gradient-to-b from-transparent via-[#F97316]/10 to-transparent" />
        <div className="absolute right-[20%] top-0 h-full w-px bg-gradient-to-b from-transparent via-white/5 to-transparent" />

        {/* Floating particles */}
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            animate={{
              y: [0, -30, 0],
              x: [0, 10, 0],
              opacity: [0, 0.5, 0],
            }}
            transition={{
              duration: 4 + i * 1.5,
              repeat: Infinity,
              delay: i * 0.8,
              ease: 'easeInOut',
            }}
            className="absolute rounded-full bg-[#F97316]"
            style={{
              width: 3 + i,
              height: 3 + i,
              top: `${20 + i * 15}%`,
              left: `${10 + i * 18}%`,
            }}
          />
        ))}
      </div>

      {/* ─── Content ─── */}
      <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col justify-center px-6 pt-24 pb-16 lg:px-8">
        <div className="max-w-3xl">
          {/* Eyebrow */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-6 flex items-center gap-3"
          >
            <motion.div
              animate={{ width: ['2rem', '3rem', '2rem'] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="h-px bg-[#F97316]"
            />
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#F97316]">
              Imobiliária em Valparaíso de Goiás — GO
            </span>
          </motion.div>

          {/* Main Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.15 }}
            className="mb-6 text-4xl leading-[1.08] font-light text-white sm:text-5xl md:text-6xl lg:text-7xl"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            Encontre o imóvel
            <br />
            <motion.span
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="font-semibold italic text-[#F97316]"
            >
              perfeito para sua família
            </motion.span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mb-10 max-w-xl text-base leading-relaxed text-white/50 font-light sm:text-lg"
          >
            Casas, apartamentos e terrenos em Valparaíso de Goiás e região do Entorno de Brasília.
            Atendimento personalizado, curadoria inteligente e total segurança jurídica.
          </motion.p>

          {/* ─── Search Bar ─── */}
          <motion.form
            onSubmit={handleSearch}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.45 }}
            className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.07] p-3 backdrop-blur-md sm:flex-row sm:items-center"
          >
            <div className="flex flex-1 items-center gap-3 rounded-xl bg-white/[0.06] px-4 py-3 transition-colors focus-within:bg-white/10">
              <MapPin className="h-5 w-5 flex-shrink-0 text-[#F97316]" />
              <input
                type="text"
                placeholder="Bairro, cidade ou região..."
                value={searchData.localizacao}
                onChange={(e) => setSearchData({ ...searchData, localizacao: e.target.value })}
                className="w-full bg-transparent text-sm text-white placeholder-white/30 outline-none"
              />
            </div>

            <div className="relative flex items-center gap-3 rounded-xl bg-white/[0.06] px-4 py-3 sm:w-48 transition-colors focus-within:bg-white/10">
              <Home className="h-5 w-5 flex-shrink-0 text-[#F97316]" />
              <select
                value={searchData.tipo}
                onChange={(e) => setSearchData({ ...searchData, tipo: e.target.value })}
                className="w-full appearance-none bg-transparent text-sm text-white outline-none cursor-pointer"
              >
                <option value="" className="bg-[#0B1426]">Tipo de imóvel</option>
                <option value="casa" className="bg-[#0B1426]">Casa</option>
                <option value="apartamento" className="bg-[#0B1426]">Apartamento</option>
                <option value="terreno" className="bg-[#0B1426]">Terreno</option>
                <option value="comercial" className="bg-[#0B1426]">Comercial</option>
              </select>
              <ChevronDown className="pointer-events-none h-4 w-4 flex-shrink-0 text-white/40" />
            </div>

            <motion.button
              type="submit"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center justify-center gap-2 rounded-xl bg-[#F97316] px-6 py-3 text-sm font-semibold text-white transition-all duration-300 hover:bg-[#EA580C] hover:shadow-lg hover:shadow-[#F97316]/25"
            >
              <Search className="h-4 w-4" />
              <span>Buscar</span>
            </motion.button>
          </motion.form>

          {/* ─── Stats Row ─── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.7 }}
            className="mt-14 flex flex-wrap gap-8 border-t border-white/10 pt-8 sm:gap-10"
          >
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 + i * 0.1 }}
                className="group"
              >
                <div className="flex items-center gap-2 mb-1">
                  <stat.icon className="h-4 w-4 text-[#F97316]/60 group-hover:text-[#F97316] transition-colors" />
                  <span
                    className="text-2xl font-semibold text-white sm:text-3xl"
                    style={{ fontFamily: "'Cormorant Garamond', serif" }}
                  >
                    {stat.value}
                  </span>
                </div>
                <div className="text-[10px] font-medium uppercase tracking-widest text-white/25 group-hover:text-white/40 transition-colors">
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* ─── Scroll Indicator ─── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="flex flex-col items-center gap-2"
        >
          <span className="text-[10px] uppercase tracking-[0.2em] text-white/20">Scroll</span>
          <div className="h-8 w-px bg-gradient-to-b from-white/20 to-transparent" />
        </motion.div>
      </motion.div>
    </section>
  );
};

export default HeroSection;
