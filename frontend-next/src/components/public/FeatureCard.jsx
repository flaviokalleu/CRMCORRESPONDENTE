"use client";

import { motion } from "framer-motion";

// Cartão de módulo em vidro escuro com brilho dourado no hover — combina com
// a estética de luxo da landing "Casa & Ouro".
export function FeatureCard({ icon: Icon, title, description, index = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.55, delay: index * 0.07, ease: [0.22, 1, 0.36, 1] }}
      className="group relative overflow-hidden rounded-3xl bg-white/[0.03] p-7 ring-gold transition-all duration-500 hover:-translate-y-1 hover:bg-white/[0.06]"
    >
      {/* halo dourado que acende no hover */}
      <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-caixa-orange/20 opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100" />

      <div className="relative mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-caixa-orange to-caixa-orange-dark text-white shadow-lg shadow-caixa-orange/25">
        <Icon className="h-6 w-6" strokeWidth={1.75} />
      </div>
      <h3 className="relative font-display text-xl font-medium text-white">{title}</h3>
      <p className="relative mt-2 text-sm leading-relaxed text-white/50">{description}</p>
    </motion.div>
  );
}
