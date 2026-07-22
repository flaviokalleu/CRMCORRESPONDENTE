import React from 'react';
import { motion } from 'framer-motion';

const partners = [
  { id: 1, name: 'Caixa Econômica' },
  { id: 2, name: 'Banco do Brasil' },
  { id: 3, name: 'Bradesco' },
  { id: 4, name: 'Itaú' },
  { id: 5, name: 'Santander' },
];

const PartnersSection = () => {
  return (
    <section className="relative bg-[#FAF7F2] py-16 lg:py-20">
      <div className="absolute top-0 left-0 h-px w-full bg-gradient-to-r from-transparent via-[#0B1426]/5 to-transparent" />
      <div className="absolute bottom-0 left-0 h-px w-full bg-gradient-to-r from-transparent via-[#0B1426]/5 to-transparent" />

      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <p
            className="mb-10 text-xs font-semibold uppercase tracking-[0.2em] text-[#0B1426]/30"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            Parceiros & Instituições Financeiras
          </p>

          <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
            {partners.map((partner, index) => (
              <motion.div
                key={partner.id}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.08 }}
                className="group flex h-16 items-center justify-center px-4 transition-all duration-300"
              >
                <span
                  className="text-base font-medium text-[#0B1426]/20 transition-all duration-300 group-hover:text-[#0B1426]/60 group-hover:scale-105"
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                >
                  {partner.name}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default PartnersSection;
