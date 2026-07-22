import React from 'react';
import { motion } from 'framer-motion';
import { UserCheck, Compass, Shield, HeartHandshake } from 'lucide-react';

const steps = [
  {
    icon: UserCheck,
    title: 'Diagnóstico de Perfil',
    description:
      'Mapeamos seu momento financeiro, estilo de vida e objetivos para buscar apenas opções aderentes ao seu perfil.',
    number: '01',
  },
  {
    icon: Compass,
    title: 'Consultoria Inteligente',
    description:
      'Selecionamos imóveis com liquidez, potencial de valorização e documentação pronta para avançar com segurança.',
    number: '02',
  },
  {
    icon: Shield,
    title: 'Negociação Segura',
    description:
      'Conduzimos proposta, diligência e fechamento com estratégia para reduzir riscos e acelerar resultados.',
    number: '03',
  },
  {
    icon: HeartHandshake,
    title: 'Acompanhamento Total',
    description:
      'Da assinatura à entrega das chaves, garantimos uma experiência tranquila, completa e sem surpresas.',
    number: '04',
  },
];

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.12, ease: 'easeOut' },
  }),
};

const Icones = () => {
  return (
    <section id="servicos" className="relative overflow-hidden bg-[#FAF7F2] py-20 md:py-28 lg:py-32">
      {/* Decorative blurs */}
      <div className="absolute top-0 right-0 h-64 w-64 rounded-full bg-[#F97316]/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 h-48 w-48 rounded-full bg-[#0B1426]/5 blur-3xl pointer-events-none" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto max-w-2xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="mb-4 flex items-center justify-center gap-3">
              <div className="h-px w-8 bg-[#F97316]" />
              <span
                className="text-xs font-semibold uppercase tracking-[0.2em] text-[#F97316]"
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                Como funciona
              </span>
              <div className="h-px w-8 bg-[#F97316]" />
            </div>
            <h2
              className="text-3xl sm:text-4xl md:text-5xl font-light text-[#0B1426]"
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
            >
              Uma jornada pensada <span className="italic font-medium">para você</span>
            </h2>
            <p
              className="mt-4 text-sm sm:text-base leading-relaxed text-[#0B1426]/50"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              Do primeiro contato à entrega das chaves, cada etapa foi desenhada para oferecer
              segurança, eficiência e tranquilidade.
            </p>
          </motion.div>
        </div>

        {/* Steps Grid */}
        <div className="mt-12 md:mt-16 grid gap-5 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => (
            <motion.div
              key={step.number}
              custom={index}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={cardVariants}
              className="group relative"
            >
              <div className="relative h-full rounded-2xl border border-[#0B1426]/[0.08] bg-white p-6 sm:p-8 transition-all duration-500 hover:border-[#F97316]/30 hover:shadow-xl hover:shadow-[#F97316]/5">
                {/* Step Number Watermark */}
                <span
                  className="absolute top-4 sm:top-6 right-4 sm:right-6 text-5xl sm:text-6xl font-bold text-[#0B1426]/[0.04] select-none pointer-events-none"
                  style={{ fontFamily: "'Cormorant Garamond', serif" }}
                >
                  {step.number}
                </span>

                {/* Icon */}
                <div className="mb-5 sm:mb-6 flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-xl bg-[#0B1426] transition-colors duration-500 group-hover:bg-[#F97316]">
                  <step.icon className="h-5 w-5 sm:h-6 sm:w-6 text-white" strokeWidth={1.5} />
                </div>

                <h3
                  className="mb-2 sm:mb-3 text-base sm:text-lg font-semibold text-[#0B1426]"
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                >
                  {step.title}
                </h3>
                <p
                  className="text-sm leading-relaxed text-[#0B1426]/50"
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                >
                  {step.description}
                </p>

                {/* Bottom accent line */}
                <div className="mt-5 sm:mt-6 h-px w-8 bg-[#F97316]/30 transition-all duration-500 group-hover:w-full group-hover:bg-[#F97316]/50" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Icones;
