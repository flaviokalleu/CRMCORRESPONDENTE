import React from "react";
import { motion } from "framer-motion";

const PartnersSection = () => {
  const partners = [
    {
      id: 1,
      logo: "construsolida.jpg",
      name: "Construsolida",
    },
    {
      id: 2,
      logo: "construteto.jpg",
      name: "Construteto",
    },
    {
      id: 3,
      logo: "gois.png",
      name: "Góis",
    },
    {
      id: 4,
      logo: "global.png",
      name: "Global",
    },
    {
      id: 5,
      logo: "mabel.jpg",
      name: "Mabel",
    },
    {
      id: 6,
      logo: "bp.png",
      name: "BP",
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 50, opacity: 0, scale: 0.8 },
    visible: {
      y: 0,
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.6,
        ease: "easeOut",
      },
    },
  };

  return (
    <section className="py-20 relative">
      <div className="max-w-7xl mx-auto px-4">
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Nossos{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
              Parceiros
            </span>
          </h2>
          <p className="text-blue-200 text-lg max-w-2xl mx-auto">
            Trabalhamos com as melhores construtoras e desenvolvedoras do mercado
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8"
        >
          {partners.map((partner, index) => (
            <motion.div
              key={partner.id}
              variants={itemVariants}
              whileHover={{
                scale: 1.1,
                transition: { duration: 0.3 },
              }}
              className="group flex flex-col items-center"
            >
              <div className="relative w-24 h-24 md:w-28 md:h-28 mb-4">
                {/* Glow effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full opacity-0 group-hover:opacity-20 transition-opacity duration-300 blur-xl"></div>

                {/* Logo container */}
                <div className="relative w-full h-full bg-white/10 backdrop-blur-md border border-white/20 rounded-full overflow-hidden transition-all duration-300 group-hover:border-blue-400/50 group-hover:bg-white/20">
                  <img
                    src={`/${partner.logo}`}
                    alt={partner.name}
                    className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-300"
                    loading="lazy"
                  />
                </div>
              </div>

              <motion.span
                initial={{ opacity: 0.7 }}
                whileHover={{ opacity: 1 }}
                className="text-blue-200 font-medium text-center text-sm md:text-base group-hover:text-white transition-colors duration-300"
              >
                {partner.name}
              </motion.span>
            </motion.div>
          ))}
        </motion.div>

        {/* Background decoration */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>
      </div>
    </section>
  );
};

export default PartnersSection;
