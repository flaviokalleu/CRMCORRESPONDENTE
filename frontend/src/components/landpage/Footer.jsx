import React from "react";
import generateStableKey from 'utils/generateStableKey';
import { motion } from "framer-motion";
import { 
  FaInstagram, 
  FaFacebookF, 
  FaLinkedinIn, 
  FaTwitter,
  FaWhatsapp,
  FaEnvelope,
  FaPhone,
  FaMapMarkerAlt,
  FaClock,
  FaHeart
} from "react-icons/fa";

const Footer = () => {
  const nomeSistema = process.env.REACT_APP_NOME_SISTEMA || "B2M";

  // SVG pattern como componente separado para evitar parsing errors
  const DotPattern = () => (
    <svg width="60" height="60" viewBox="0 0 60 60" className="absolute inset-0 w-full h-full opacity-5">
      <defs>
        <pattern id="dot-pattern" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
          <circle cx="30" cy="30" r="2" fill="white" fillOpacity="0.1" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#dot-pattern)" />
    </svg>
  );

  return (
    <footer className="bg-gradient-to-br from-gray-950 via-gray-900 to-black py-16 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10" />
        <DotPattern />
        
        {/* Floating elements */}
        <div className="absolute top-10 left-10 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl"></div>
        <div className="absolute bottom-20 right-20 w-48 h-48 bg-purple-500/5 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 relative z-10">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {/* Logo e Descrição */}
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="lg:col-span-2"
          >
            <div className="mb-6">
              {/* Logo */}
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center mr-3">
                  <span className="text-white font-bold text-xl">{nomeSistema[0]}</span>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white">{nomeSistema}</h3>
                  <p className="text-blue-300 text-sm">Imobiliária</p>
                </div>
              </div>
              
              <p className="text-blue-200 text-lg leading-relaxed max-w-md mb-6">
                Transformando sonhos em realidade há mais de{" "}
                <span className="text-blue-400 font-semibold">15 anos</span>. 
                Sua confiança é nossa maior conquista.
              </p>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                {[
                  { number: "500+", label: "Imóveis" },
                  { number: "1000+", label: "Clientes" },
                  { number: "15", label: "Anos" }
                ].map((stat, index) => (
                  <motion.div
                    key={generateStableKey(stat, index)}
                    initial={{ scale: 0 }}
                    whileInView={{ scale: 1 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    viewport={{ once: true }}
                    className="text-center"
                  >
                    <div className="text-white font-bold text-lg">{stat.number}</div>
                    <div className="text-blue-300 text-xs">{stat.label}</div>
                  </motion.div>
                ))}
              </div>
            </div>
            
            {/* Social Media */}
            <div className="flex space-x-3">
              {[
                { 
                  icon: FaInstagram, 
                  link: "https://instagram.com/B2M", 
                  color: "hover:bg-gradient-to-r hover:from-pink-500 hover:to-purple-500",
                  label: "Instagram"
                },
                { 
                  icon: FaFacebookF, 
                  link: "https://facebook.com/B2M", 
                  color: "hover:bg-blue-600",
                  label: "Facebook"
                },
                { 
                  icon: FaLinkedinIn, 
                  link: "https://linkedin.com/company/B2M", 
                  color: "hover:bg-blue-700",
                  label: "LinkedIn"
                },
                { 
                  icon: FaTwitter, 
                  link: "https://twitter.com/B2M", 
                  color: "hover:bg-blue-500",
                  label: "Twitter"
                },
                { 
                  icon: FaWhatsapp, 
                  link: "https://wa.me/5561999999999", 
                  color: "hover:bg-green-500",
                  label: "WhatsApp"
                }
              ].map((social, index) => (
                <motion.a
                  key={generateStableKey(social, index)}
                  href={social.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ scale: 1.1, y: -3 }}
                  whileTap={{ scale: 0.9 }}
                  aria-label={social.label}
                  className={`w-11 h-11 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl flex items-center justify-center text-gray-300 transition-all duration-300 ${social.color} hover:text-white hover:border-transparent`}
                >
                  <social.icon className="text-lg" />
                </motion.a>
              ))}
            </div>
          </motion.div>

          {/* Links Rápidos */}
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            viewport={{ once: true }}
          >
            <h3 className="text-xl font-bold text-white mb-6 flex items-center">
              <span className="w-2 h-6 bg-gradient-to-b from-blue-400 to-purple-400 rounded-full mr-3"></span>
              Links Rápidos
            </h3>
            <ul className="space-y-3">
              {[
                { text: "Início", link: "/" },
                { text: "Comprar", link: "/comprar" },
                { text: "Alugar", link: "/alugar" },
                { text: "Vender", link: "/vender" },
                { text: "Sobre Nós", link: "/sobre" },
                { text: "Blog", link: "/blog" },
                { text: "Contato", link: "/contato" }
              ].map((item, index) => (
                <li key={generateStableKey(item, index)}>
                  <motion.a
                    href={item.link}
                    whileHover={{ x: 8, color: "#60a5fa" }}
                    className="text-blue-200 hover:text-blue-400 transition-all duration-300 flex items-center group text-sm"
                  >
                    <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mr-3 group-hover:bg-white transition-colors duration-300 opacity-60 group-hover:opacity-100"></span>
                    {item.text}
                  </motion.a>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Contato */}
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
          >
            <h3 className="text-xl font-bold text-white mb-6 flex items-center">
              <span className="w-2 h-6 bg-gradient-to-b from-blue-400 to-purple-400 rounded-full mr-3"></span>
              Contato
            </h3>
            
            <div className="space-y-4">
              <motion.div 
                whileHover={{ x: 5 }}
                className="flex items-start text-blue-200 group cursor-pointer"
              >
                <FaMapMarkerAlt className="text-blue-400 mr-3 mt-1 flex-shrink-0 group-hover:text-white transition-colors" />
                <div className="text-sm">
                  <span className="block">Rua das Flores, 123</span>
                  <span className="text-blue-300">Centro, Brasília - DF</span>
                  <span className="block text-xs text-blue-400">CEP: 70000-000</span>
                </div>
              </motion.div>
              
              <motion.a
                href="tel:+5561999999999"
                whileHover={{ x: 5 }}
                className="flex items-center text-blue-200 group transition-colors hover:text-blue-400"
              >
                <FaPhone className="text-blue-400 mr-3 flex-shrink-0 group-hover:text-white transition-colors" />
                <div className="text-sm">
                  <span className="block">(61) 99999-9999</span>
                  <span className="text-xs text-blue-400">Clique para ligar</span>
                </div>
              </motion.a>
              
              <motion.a
                href="mailto:contato@B2M.com.br"
                whileHover={{ x: 5 }}
                className="flex items-center text-blue-200 group transition-colors hover:text-blue-400"
              >
                <FaEnvelope className="text-blue-400 mr-3 flex-shrink-0 group-hover:text-white transition-colors" />
                <div className="text-sm">
                  <span className="block">contato@B2M.com.br</span>
                  <span className="text-xs text-blue-400">Envie um email</span>
                </div>
              </motion.a>
            </div>

            {/* Horário de Funcionamento */}
            <div className="mt-6 p-4 bg-white/5 backdrop-blur-md rounded-xl border border-white/10">
              <h4 className="text-base font-semibold text-white mb-3 flex items-center">
                <FaClock className="text-blue-400 mr-2" />
                Horário de Atendimento
              </h4>
              <div className="text-blue-200 text-sm space-y-1">
                <div className="flex justify-between">
                  <span>Segunda - Sexta</span>
                  <span className="text-blue-400">8h às 18h</span>
                </div>
                <div className="flex justify-between">
                  <span>Sábado</span>
                  <span className="text-blue-400">8h às 12h</span>
                </div>
                <div className="flex justify-between">
                  <span>Domingo</span>
                  <span className="text-red-400">Fechado</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Newsletter */}
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          viewport={{ once: true }}
          className="border-t border-white/10 pt-8 mb-8"
        >
          <div className="text-center mb-6">
            <h3 className="text-2xl font-bold text-white mb-2">
              📧 Receba nossas novidades
            </h3>
            <p className="text-blue-200 max-w-md mx-auto">
              Fique por dentro dos melhores imóveis e ofertas exclusivas. 
              Sem spam, apenas oportunidades imperdíveis!
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row max-w-lg mx-auto gap-3">
            <input
              type="email"
              placeholder="Digite seu melhor email..."
              className="flex-1 px-6 py-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl text-white placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all duration-300"
            />
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              Inscrever-se
            </motion.button>
          </div>
          
          <p className="text-center text-xs text-blue-400 mt-3">
            Você pode cancelar a inscrição a qualquer momento.
          </p>
        </motion.div>

        {/* Copyright */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          viewport={{ once: true }}
          className="border-t border-white/10 pt-8"
        >
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="flex items-center text-blue-200 text-sm">
              <span>© 2024 {nomeSistema}. Feito com</span>
              <FaHeart className="text-red-400 mx-2 text-xs" />
              <span>em Brasília</span>
            </div>
            
            <div className="flex flex-wrap justify-center md:justify-end gap-x-6 gap-y-2 text-sm">
              <motion.a
                href="/privacidade"
                whileHover={{ y: -2 }}
                className="text-blue-200 hover:text-white transition-colors duration-300"
              >
                Política de Privacidade
              </motion.a>
              <motion.a
                href="/termos"
                whileHover={{ y: -2 }}
                className="text-blue-200 hover:text-white transition-colors duration-300"
              >
                Termos de Uso
              </motion.a>
              <motion.a
                href="/cookies"
                whileHover={{ y: -2 }}
                className="text-blue-200 hover:text-white transition-colors duration-300"
              >
                Cookies
              </motion.a>
              <motion.a
                href="/sitemap"
                whileHover={{ y: -2 }}
                className="text-blue-200 hover:text-white transition-colors duration-300"
              >
                Sitemap
              </motion.a>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Decorative elements */}
      <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600"></div>
    </footer>
  );
};

export default Footer;
