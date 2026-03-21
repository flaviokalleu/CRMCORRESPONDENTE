import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Home, Percent, ShieldCheck } from 'lucide-react';

const benefits = [
  { icon: Home, text: 'Entrada facilitada e parcelas que cabem no bolso' },
  { icon: Percent, text: 'Taxas de juros reduzidas pelo programa federal' },
  { icon: ShieldCheck, text: 'Documentação verificada e segurança jurídica total' },
];

const CTASection = () => {
  return (
    <section className="relative overflow-hidden bg-[#FAF7F2] py-20 md:py-28 lg:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-[#0B1426] p-6 sm:p-8 md:p-12 lg:p-16">
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 h-64 w-64 rounded-full bg-[#F97316]/10 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 h-48 w-48 rounded-full bg-[#1a3a5c]/40 blur-3xl pointer-events-none" />
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#F97316]/30 to-transparent" />

          <div className="relative z-10 grid items-center gap-10 md:gap-12 lg:grid-cols-2">
            {/* Left side - Content */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="mb-4 flex items-center gap-3">
                <div className="h-px w-8 bg-[#F97316]" />
                <span
                  className="text-xs font-semibold uppercase tracking-[0.2em] text-[#F97316]"
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                >
                  Minha Casa Minha Vida
                </span>
              </div>

              <h2
                className="mb-5 sm:mb-6 text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-light text-white leading-tight"
                style={{ fontFamily: "'Cormorant Garamond', serif" }}
              >
                Pare de pagar aluguel.
                <br />
                <span className="italic font-medium text-[#F97316]">Invista no seu futuro.</span>
              </h2>

              <p
                className="mb-6 sm:mb-8 max-w-md text-sm sm:text-base leading-relaxed text-white/50"
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                Você sabia que a parcela do financiamento pode ser menor que o valor do seu aluguel?
                Com o programa Minha Casa Minha Vida, conquistar seu imóvel nunca foi tão acessível.
              </p>

              <div className="mb-6 sm:mb-8 space-y-3 sm:space-y-4">
                {benefits.map((item) => (
                  <motion.div
                    key={item.text}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4 }}
                    className="flex items-center gap-3"
                  >
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[#F97316]/15">
                      <item.icon className="h-4 w-4 text-[#F97316]" />
                    </div>
                    <span
                      className="text-sm text-white/60"
                      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                    >
                      {item.text}
                    </span>
                  </motion.div>
                ))}
              </div>

              <a
                href="https://wa.me/5561994617584?text=Olá! Gostaria de saber mais sobre o Minha Casa Minha Vida"
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-2 rounded-full bg-[#F97316] px-6 sm:px-7 py-3 sm:py-3.5 text-sm font-semibold text-white transition-all duration-300 hover:bg-[#EA580C] hover:shadow-lg hover:shadow-[#F97316]/20"
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                Simule seu financiamento
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </a>
            </motion.div>

            {/* Right side - Comparison card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="flex items-center justify-center"
            >
              <div className="relative w-full max-w-sm">
                {/* Main comparison card */}
                <div className="rounded-2xl border border-white/10 bg-white/5 p-6 sm:p-8 backdrop-blur-sm">
                  <div className="mb-6 text-center">
                    <p
                      className="text-xs sm:text-sm font-medium uppercase tracking-widest text-[#F97316]"
                      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                    >
                      Comparativo Mensal
                    </p>
                  </div>

                  <div className="flex items-center gap-4 sm:gap-6">
                    {/* Aluguel */}
                    <div className="flex-1 rounded-xl border border-red-500/20 bg-red-500/5 p-4 sm:p-5 text-center">
                      <p
                        className="mb-1 text-[10px] sm:text-xs uppercase tracking-wider text-white/40"
                        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                      >
                        Aluguel
                      </p>
                      <p
                        className="text-xl sm:text-2xl font-bold text-red-400"
                        style={{ fontFamily: "'Cormorant Garamond', serif" }}
                      >
                        R$ 1.200
                      </p>
                      <p
                        className="mt-1 text-[10px] sm:text-xs text-white/30"
                        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                      >
                        sem retorno
                      </p>
                    </div>

                    {/* VS divider */}
                    <div className="flex h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0 items-center justify-center rounded-full border border-white/10 text-[10px] sm:text-xs font-bold text-white/40">
                      vs
                    </div>

                    {/* Financiamento */}
                    <div className="flex-1 rounded-xl border border-[#F97316]/30 bg-[#F97316]/10 p-4 sm:p-5 text-center">
                      <p
                        className="mb-1 text-[10px] sm:text-xs uppercase tracking-wider text-white/40"
                        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                      >
                        Financiamento
                      </p>
                      <p
                        className="text-xl sm:text-2xl font-bold text-[#F97316]"
                        style={{ fontFamily: "'Cormorant Garamond', serif" }}
                      >
                        R$ 600
                      </p>
                      <p
                        className="mt-1 text-[10px] sm:text-xs text-[#F97316]/60"
                        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                      >
                        patrimônio seu
                      </p>
                    </div>
                  </div>

                  {/* Savings highlight */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.5 }}
                    className="mt-6 rounded-xl bg-[#F97316]/10 px-4 py-3 text-center"
                  >
                    <p
                      className="text-xs sm:text-sm text-[#F97316]"
                      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                    >
                      Economize <span className="font-bold">R$ 600/mês</span> e construa patrimônio
                    </p>
                  </motion.div>
                </div>

                {/* Decorative floating elements */}
                <div className="absolute -top-4 -right-4 h-20 w-20 sm:h-24 sm:w-24 rounded-full border border-[#F97316]/20 pointer-events-none" />
                <div className="absolute -bottom-3 -left-3 h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-[#F97316]/10 blur-xl pointer-events-none" />
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
