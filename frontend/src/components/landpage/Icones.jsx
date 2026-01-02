import React from "react";
import generateStableKey from 'utils/generateStableKey';
import { motion } from "framer-motion";
import { 
  FaHome, 
  FaBuilding, 
  FaKey, 
  FaLock, 
  FaHandshake, 
  FaStar,
  FaCheckCircle,
  FaUserTie,
  FaAward,
  FaChartLine
} from "react-icons/fa";

const Icones = () => {
  const nomeSistema = process.env.REACT_APP_NOME_SISTEMA || "Parnassá";

  const features = [
    {
      icon: FaHome,
      title: "Casas de Luxo",
      description: "Encontre a casa dos seus sonhos com acabamento premium e localizações privilegiadas.",
      color: "from-blue-500 to-cyan-500",
      bgPattern: "bg-blue-500/10"
    },
    {
      icon: FaBuilding,
      title: "Apartamentos Modernos",
      description: "Descubra apartamentos com design contemporâneo e infraestrutura completa.",
      color: "from-purple-500 to-pink-500",
      bgPattern: "bg-purple-500/10"
    },
    {
      icon: FaKey,
      title: "Facilidade no Aluguel",
      description: "Processo simplificado e flexível para encontrar seu novo lar.",
      color: "from-green-500 to-emerald-500",
      bgPattern: "bg-green-500/10"
    },
    {
      icon: FaLock,
      title: "Segurança Garantida",
      description: "Todas as transações são seguras e documentadas legalmente.",
      color: "from-red-500 to-orange-500",
      bgPattern: "bg-red-500/10"
    },
    {
      icon: FaUserTie,
      title: "Atendimento Premium",
      description: "Equipe especializada para te acompanhar em todo o processo.",
      color: "from-indigo-500 to-blue-500",
      bgPattern: "bg-indigo-500/10"
    },
    {
      icon: FaAward,
      title: "Qualidade Certificada",
      description: "Apenas os melhores imóveis com qualidade comprovada.",
      color: "from-yellow-500 to-orange-500",
      bgPattern: "bg-yellow-500/10"
    }
  ];

  // Stats data array
  const statsData = [
    { icon: FaChartLine, number: "500+", label: "Imóveis Vendidos" },
    { icon: FaHandshake, number: "1000+", label: "Clientes Satisfeitos" },
    { icon: FaAward, number: "15", label: "Anos de Experiência" }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { 
      y: 60, 
      opacity: 0,
      scale: 0.8
    },
    visible: {
      y: 0,
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.7,
        ease: "easeOut"
      }
    }
  };

  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-blue-500/5 to-purple-500/5 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 relative z-10">
        {/* Header Section */}
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-20"
        >
          <motion.div
            initial={{ scale: 0 }}
            whileInView={{ scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
            className="inline-flex items-center bg-gradient-to-r from-blue-500/20 to-purple-500/20 backdrop-blur-md border border-white/20 rounded-full px-6 py-2 mb-6"
          >
            <FaCheckCircle className="text-green-400 mr-2" />
            <span className="text-blue-200 text-sm font-medium">Por que somos a melhor escolha</span>
          </motion.div>

          <h2 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
            Por que escolher a{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">
              {nomeSistema}
            </span>
            ?
          </h2>
          
          <motion.p
            initial={{ y: 20, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            viewport={{ once: true }}
            className="text-blue-200 text-xl max-w-3xl mx-auto leading-relaxed"
          >
            Oferecemos mais do que imóveis, oferecemos{" "}
            <span className="text-blue-400 font-semibold">sonhos realizados</span>{" "}
            com excelência e confiança. Descubra por que milhares de famílias confiam em nós.
          </motion.p>

          {/* Stats */}
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            viewport={{ once: true }}
            className="flex flex-wrap justify-center gap-8 mt-12"
          >
            {statsData.map((stat, index) => (
              <motion.div
                key={generateStableKey(stat, index)}
                initial={{ scale: 0, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="flex items-center space-x-3 group"
              >
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500/20 to-purple-500/20 backdrop-blur-md border border-white/20 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <stat.icon className="text-blue-400 group-hover:text-blue-300 transition-colors duration-300" />
                </div>
                <div className="text-left">
                  <div className="text-2xl font-bold text-white group-hover:text-blue-300 transition-colors duration-300">
                    {stat.number}
                  </div>
                  <div className="text-blue-300 text-sm group-hover:text-blue-200 transition-colors duration-300">
                    {stat.label}
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {features.map((feature, index) => (
            <motion.div
              key={generateStableKey(feature, index)}
              variants={itemVariants}
              whileHover={{ 
                y: -10,
                scale: 1.02,
                transition: { duration: 0.3 }
              }}
              className="group relative"
            >
              {/* Background Pattern */}
              <div className={`absolute inset-0 ${feature.bgPattern} rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl`}></div>
              
              {/* Main Card */}
              <div className="relative bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md border border-white/20 rounded-3xl p-8 h-full transition-all duration-500 hover:border-white/40 hover:shadow-2xl hover:shadow-blue-500/20 overflow-hidden">
                
                {/* Card Background Pattern */}
                <div className="absolute top-0 right-0 w-32 h-32 opacity-5">
                  <div className={`w-full h-full bg-gradient-to-br ${feature.color} rounded-full blur-2xl`}></div>
                </div>

                <div className="relative z-10 flex flex-col items-center text-center space-y-6">
                  {/* Icon Container */}
                  <motion.div
                    whileHover={{ 
                      scale: 1.1,
                      rotate: [0, -5, 5, 0],
                      transition: { duration: 0.6 }
                    }}
                    className="relative"
                  >
                    <div className={`w-24 h-24 bg-gradient-to-br ${feature.color} rounded-3xl flex items-center justify-center shadow-lg transform transition-all duration-500 group-hover:shadow-2xl`}>
                      <feature.icon className="text-4xl text-white drop-shadow-lg" />
                    </div>
                    
                    {/* Glow Effect */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} rounded-3xl opacity-0 group-hover:opacity-30 transition-opacity duration-500 blur-xl -z-10`}></div>
                    
                    {/* Pulse Ring */}
                    <div className="absolute inset-0 rounded-3xl border-2 border-white/20 group-hover:border-white/40 transition-colors duration-500"></div>
                  </motion.div>
                  
                  {/* Content */}
                  <div className="space-y-4">
                    <h3 className="text-2xl font-bold text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-blue-300 group-hover:to-purple-300 transition-all duration-500">
                      {feature.title}
                    </h3>
                    
                    <p className="text-blue-200 leading-relaxed text-base group-hover:text-blue-100 transition-colors duration-500">
                      {feature.description}
                    </p>
                  </div>

                  {/* Learn More Button */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  >
                    <button className="text-blue-400 hover:text-blue-300 text-sm font-medium flex items-center space-x-2 transition-colors duration-300">
                      <span>Saiba mais</span>
                      <motion.span
                        animate={{ x: [0, 5, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        →
                      </motion.span>
                    </button>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Call to Action */}
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          viewport={{ once: true }}
          className="text-center mt-20"
        >
          <div className="bg-gradient-to-r from-white/10 to-white/5 backdrop-blur-md border border-white/20 rounded-3xl p-8 max-w-2xl mx-auto">
            <h3 className="text-2xl font-bold text-white mb-4">
              Pronto para encontrar seu imóvel ideal?
            </h3>
            <p className="text-blue-200 mb-6">
              Nossa equipe está pronta para te ajudar a realizar o sonho da casa própria.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-300 shadow-lg"
              >
                Ver Imóveis
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-transparent border-2 border-blue-400 text-blue-400 hover:bg-blue-400 hover:text-white px-8 py-3 rounded-xl font-semibold transition-all duration-300"
              >
                Falar com Consultor
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Icones;
