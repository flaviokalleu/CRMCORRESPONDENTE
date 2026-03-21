import React from 'react';
import { motion } from 'framer-motion';
import { Star, Quote, MapPin, Phone, Navigation } from 'lucide-react';

const testimonials = [
  {
    name: 'Marcos Oliveira',
    role: 'Comprador',
    text: 'Atendimento excepcional do início ao fim. A equipe encontrou exatamente o que eu procurava em Valparaíso. Super recomendo!',
    rating: 5,
  },
  {
    name: 'Fernanda Costa',
    role: 'Investidora',
    text: 'Profissionais sérios e comprometidos. A curadoria dos imóveis é impecável. Já fechei três negócios com eles no Entorno.',
    rating: 5,
  },
  {
    name: 'Ricardo Santos',
    role: 'Proprietário',
    text: 'Vendi meu imóvel em tempo recorde por um valor justo. Toda a documentação foi cuidada com maestria.',
    rating: 5,
  },
];

const TestimonialTabs = () => {
  return (
    <section id="depoimentos" className="relative overflow-hidden bg-[#0B1426] py-24 lg:py-32">
      {/* Decorative elements */}
      <div className="absolute top-0 left-0 h-px w-full bg-gradient-to-r from-transparent via-[#F97316]/20 to-transparent" />
      <div className="absolute bottom-0 left-[20%] h-64 w-64 rounded-full bg-[#F97316]/5 blur-3xl" />
      <div className="absolute top-1/3 right-[10%] h-48 w-48 rounded-full bg-[#F97316]/3 blur-3xl" />

      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mx-auto mb-16 max-w-2xl text-center"
        >
          <div className="mb-4 flex items-center justify-center gap-3">
            <div className="h-px w-8 bg-[#F97316]" />
            <span
              className="text-xs font-semibold uppercase tracking-[0.2em] text-[#F97316]"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              Depoimentos
            </span>
            <div className="h-px w-8 bg-[#F97316]" />
          </div>
          <h2
            className="text-4xl font-light text-white md:text-5xl"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            O que dizem nossos{' '}
            <span className="italic font-medium text-[#F97316]">clientes</span>
          </h2>
        </motion.div>

        {/* Testimonial Cards */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((item, index) => (
            <motion.div
              key={item.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.15 }}
              className="group relative rounded-2xl border border-white/[0.08] bg-[#0f1c33] p-8 transition-all duration-500 hover:border-[#F97316]/20 hover:shadow-lg hover:shadow-[#F97316]/5"
            >
              {/* Quote icon */}
              <Quote className="mb-6 h-8 w-8 text-[#F97316]/30 transition-colors duration-300 group-hover:text-[#F97316]/50" />

              {/* Rating */}
              <div className="mb-4 flex gap-1">
                {[...Array(item.rating)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-[#F97316] text-[#F97316]" />
                ))}
              </div>

              {/* Text */}
              <p
                className="mb-8 text-sm leading-relaxed text-white/50"
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                "{item.text}"
              </p>

              {/* Author */}
              <div className="flex items-center gap-3 border-t border-white/[0.08] pt-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F97316]/15 text-sm font-semibold text-[#F97316]">
                  {item.name.charAt(0)}
                </div>
                <div>
                  <p
                    className="text-sm font-semibold text-white"
                    style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                  >
                    {item.name}
                  </p>
                  <p className="text-xs text-white/30">{item.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Office / Map Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          id="contato"
          className="mt-20 grid gap-0 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0f1c33] lg:grid-cols-2"
        >
          {/* Map */}
          <div className="h-64 lg:h-auto lg:min-h-[320px]">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d958.440074111288!2d-47.983056630472845!3d-16.077923910388613!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x935985df7f7889f7%3A0x3c8b378471608011!2sParnass%C3%A1%20Imobili%C3%A1ria!5e0!3m2!1spt-BR!2sbr!4v1725482063750!5m2!1spt-BR!2sbr"
              width="100%"
              height="100%"
              style={{ border: 0, minHeight: '256px' }}
              allowFullScreen=""
              loading="lazy"
              title="Localização CRM IMOB"
              referrerPolicy="no-referrer-when-downgrade"
              className="grayscale transition-all duration-500 hover:grayscale-0"
            />
          </div>

          {/* Contact Info */}
          <div className="flex flex-col justify-center p-8 lg:p-12">
            <h3
              className="mb-2 text-2xl font-light text-white md:text-3xl"
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
            >
              Venha nos <span className="italic font-medium text-[#F97316]">visitar</span>
            </h3>
            <p
              className="mb-8 text-sm text-white/40"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              Estamos prontos para recebê-lo com um café e uma conversa sobre o seu futuro.
            </p>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#F97316]" />
                <div>
                  <p
                    className="text-sm text-white/70"
                    style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                  >
                    R. Vinte e Nove, 01 — Parque Esplanada III
                  </p>
                  <p className="text-xs text-white/30">
                    Valparaíso de Goiás — GO, 72876-354
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 flex-shrink-0 text-[#F97316]" />
                <a
                  href="tel:+5561986374261"
                  className="text-sm text-white/70 transition-colors hover:text-[#F97316]"
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                >
                  (61) 98637-4261
                </a>
              </div>
            </div>

            <a
              href="https://www.google.com/maps/dir//Parnass%C3%A1+Imobili%C3%A1ria,+Valpara%C3%ADso+de+Goi%C3%A1s"
              target="_blank"
              rel="noopener noreferrer"
              className="group mt-8 inline-flex items-center gap-2 text-sm font-medium text-[#F97316] transition-colors hover:text-[#FB923C]"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              <Navigation className="h-4 w-4" />
              Obter direções
              <span className="transition-transform duration-300 group-hover:translate-x-1">
                &rarr;
              </span>
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default TestimonialTabs;
