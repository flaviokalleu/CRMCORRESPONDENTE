"use client";

import { motion } from "framer-motion";

export function FeatureCard({ icon: Icon, title, description, index = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
      className="group rounded-2xl border border-caixa-gray-200 bg-white p-6 hover:border-caixa-orange/40 hover:shadow-lg hover:shadow-caixa-orange/5 transition-all duration-300"
    >
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-caixa-primary/5 text-caixa-primary transition-colors group-hover:bg-caixa-orange group-hover:text-white">
        <Icon className="h-6 w-6" strokeWidth={1.75} />
      </div>
      <h3 className="text-base font-semibold text-caixa-gray-900">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-caixa-gray-500">{description}</p>
    </motion.div>
  );
}
