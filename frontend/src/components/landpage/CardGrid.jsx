import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  MapPin,
  BedDouble,
  Bath,
  Car,
  Maximize2,
  ArrowRight,
  Home,
  Building2,
  Trees,
} from 'lucide-react';

const placeholderImages = {
  Casa: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=600&h=400&fit=crop',
  Apartamento: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600&h=400&fit=crop',
  Terreno: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600&h=400&fit=crop',
  default: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&h=400&fit=crop',
};

const typeIcons = {
  Casa: Home,
  Apartamento: Building2,
  Terreno: Trees,
};

function getPlaceholder(tipo) {
  return placeholderImages[tipo] || placeholderImages.default;
}

const CardGrid = ({ imoveis = [], loading = false }) => {
  return (
    <section id="imoveis" className="relative bg-[#0B1426] py-20 md:py-28 lg:py-32">
      {/* Decorative accents */}
      <div className="absolute top-0 left-0 h-px w-full bg-gradient-to-r from-transparent via-[#F97316]/20 to-transparent" />
      <div className="absolute top-20 right-[10%] h-72 w-72 rounded-full bg-[#F97316]/5 blur-3xl pointer-events-none" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mb-12 md:mb-16 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="mb-4 flex items-center gap-3">
              <div className="h-px w-8 bg-[#F97316]" />
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#F97316]"
                    style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Seleção Exclusiva
              </span>
            </div>
            <h2
              className="text-3xl sm:text-4xl md:text-5xl font-light text-white"
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
            >
              Imóveis em <span className="italic font-medium text-[#F97316]">destaque</span>
            </h2>
            <p className="mt-3 max-w-lg text-sm sm:text-base text-white/40"
               style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Imóveis selecionados com perfil de valorização e documentação verificada.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Link
              to="/imoveis-publicos"
              className="group inline-flex items-center gap-2 rounded-full border border-[#F97316] px-5 sm:px-6 py-3 text-sm font-semibold text-[#F97316] transition-all duration-300 hover:bg-[#F97316] hover:text-white"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              Ver catálogo completo
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </motion.div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="grid gap-5 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={`skel-${i}`} className="animate-pulse rounded-2xl border border-white/10 bg-white/5">
                <div className="h-56 rounded-t-2xl bg-white/5" />
                <div className="space-y-3 p-5 sm:p-6">
                  <div className="h-4 w-3/4 rounded bg-white/10" />
                  <div className="h-3 w-1/2 rounded bg-white/5" />
                  <div className="flex gap-3">
                    <div className="h-3 w-10 rounded bg-white/5" />
                    <div className="h-3 w-10 rounded bg-white/5" />
                    <div className="h-3 w-10 rounded bg-white/5" />
                  </div>
                  <div className="h-3 w-2/3 rounded bg-white/5" />
                </div>
              </div>
            ))}
          </div>
        ) : imoveis.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="rounded-2xl border border-white/10 bg-white/5 py-16 text-center"
          >
            <Home className="mx-auto mb-4 h-10 w-10 text-white/15" />
            <p className="text-white/40" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Nenhum imóvel disponível no momento.
            </p>
            <p className="mt-2 text-sm text-white/25" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Novos imóveis são adicionados frequentemente. Volte em breve!
            </p>
          </motion.div>
        ) : (
          <div className="grid gap-5 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {imoveis.map((imovel, index) => {
              const TypeIcon = typeIcons[imovel.tipo] || Home;

              return (
                <motion.article
                  key={imovel.id || `prop-${index}`}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.08 }}
                  className="group overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0f1c33] transition-all duration-500 hover:border-[#F97316]/30 hover:shadow-2xl hover:shadow-[#F97316]/5"
                >
                  {/* Image */}
                  <div className="relative h-56 overflow-hidden">
                    {imovel.imagem_capa ? (
                      <img
                        src={`${process.env.REACT_APP_API_URL}/${imovel.imagem_capa.replace(/\\/g, '/')}`}
                        alt={imovel.nome_imovel || 'Imóvel'}
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <img
                        src={getPlaceholder(imovel.tipo)}
                        alt={imovel.tipo || 'Imóvel'}
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                        loading="lazy"
                      />
                    )}

                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0B1426]/90 via-[#0B1426]/20 to-transparent" />

                    {/* Type badge */}
                    <span className="absolute top-4 left-4 inline-flex items-center gap-1.5 rounded-full bg-[#F97316] px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-white shadow-lg shadow-[#F97316]/25">
                      <TypeIcon className="h-3 w-3" />
                      {imovel.tipo || 'Imóvel'}
                    </span>

                    {/* Price on image */}
                    <div className="absolute bottom-4 left-4">
                      <span
                        className="text-2xl sm:text-[1.7rem] font-semibold text-white drop-shadow-lg"
                        style={{ fontFamily: "'Cormorant Garamond', serif" }}
                      >
                        {imovel.valor_venda
                          ? `R$ ${Number(imovel.valor_venda).toLocaleString('pt-BR')}`
                          : imovel.valor_aluguel
                          ? `R$ ${Number(imovel.valor_aluguel).toLocaleString('pt-BR')}`
                          : 'Sob consulta'}
                      </span>
                      {imovel.valor_aluguel && !imovel.valor_venda && (
                        <span className="text-sm text-white/50"> /mês</span>
                      )}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-5 sm:p-6">
                    <h3
                      className="mb-2 text-lg font-semibold text-white line-clamp-1"
                      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                    >
                      {imovel.nome_imovel || 'Imóvel exclusivo'}
                    </h3>

                    <p className="mb-4 flex items-center gap-2 text-sm text-white/40"
                       style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-[#F97316]" />
                      <span className="line-clamp-1">{imovel.localizacao || 'Região estratégica'}</span>
                    </p>

                    {/* Features */}
                    <div className="mb-5 flex flex-wrap items-center gap-4 border-t border-white/[0.08] pt-4 text-sm text-white/40">
                      {imovel.quartos > 0 && (
                        <span className="flex items-center gap-1.5">
                          <BedDouble className="h-4 w-4" /> {imovel.quartos}
                        </span>
                      )}
                      {imovel.banheiro > 0 && (
                        <span className="flex items-center gap-1.5">
                          <Bath className="h-4 w-4" /> {imovel.banheiro}
                        </span>
                      )}
                      {imovel.garagem > 0 && (
                        <span className="flex items-center gap-1.5">
                          <Car className="h-4 w-4" /> {imovel.garagem}
                        </span>
                      )}
                      {imovel.area && (
                        <span className="flex items-center gap-1.5">
                          <Maximize2 className="h-4 w-4" /> {imovel.area}m²
                        </span>
                      )}
                    </div>

                    <Link
                      to={imovel.id ? `/imovel/${imovel.id}` : '/imoveis-publicos'}
                      className="group/btn inline-flex items-center gap-2 text-sm font-medium text-[#F97316] transition-colors hover:text-[#FB923C]"
                      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                    >
                      Ver detalhes
                      <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                    </Link>
                  </div>
                </motion.article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

export default CardGrid;
