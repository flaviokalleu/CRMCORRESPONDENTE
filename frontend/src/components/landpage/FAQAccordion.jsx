import React, { useState } from "react";
import generateStableKey from 'utils/generateStableKey';
import { motion, AnimatePresence } from "framer-motion";
import { FaPlus, FaMinus } from "react-icons/fa";

const FAQAccordion = () => {
  const [openIndex, setOpenIndex] = useState(null);

  const faqs = [
    {
      question: "Como funciona o processo de aluguel?",
      answer: "Nosso processo é simples: você escolhe o imóvel, agenda uma visita, analisa a documentação e assina o contrato. Tudo com total transparência e segurança jurídica.",
    },
    {
      question: "Quais documentos são necessários?",
      answer: "Solicitamos RG, CPF, comprovante de renda, comprovante de residência e referências. Para empresas, CNPJ e balanço patrimonial dos últimos 3 anos.",
    },
    {
      question: "Vocês aceitam financiamento?",
      answer: "Sim! Trabalhamos com os principais bancos e facilitamos todo o processo de financiamento. Nossa equipe te acompanha desde a simulação até a aprovação.",
    },
    {
      question: "Existe taxa de administração?",
      answer: "Nossas taxas são transparentes e competitivas. Entre em contato para conhecer nossos valores e condições especiais para clientes.",
    },
    {
      question: "Como agendar uma visita?",
      answer: "Você pode agendar através do nosso site, WhatsApp ou telefone. Temos horários flexíveis, incluindo finais de semana, para sua comodidade.",
    },
    {
      question: "Vocês oferecem seguro do imóvel?",
      answer: "Sim, oferecemos seguros completos para inquilinos e proprietários, cobrindo danos, incêndio, roubo e responsabilidade civil.",
    },
  ];

  const toggleAccordion = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="py-20">
      <div className="max-w-4xl mx-auto px-4">
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Perguntas{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
              Frequentes
            </span>
          </h2>
          <p className="text-blue-200 text-lg">
            Tire suas dúvidas sobre nossos serviços
          </p>
        </motion.div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <motion.div
              key={generateStableKey(faq, index)}
              initial={{ y: 50, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl overflow-hidden hover:border-blue-400/50 transition-all duration-300"
            >
              <motion.button
                onClick={() => toggleAccordion(index)}
                className="w-full px-6 py-6 text-left flex justify-between items-center hover:bg-white/5 transition-colors duration-300"
              >
                <h3 className="text-lg font-semibold text-white pr-4">
                  {faq.question}
                </h3>
                <motion.div
                  animate={{ rotate: openIndex === index ? 45 : 0 }}
                  transition={{ duration: 0.3 }}
                  className="flex-shrink-0 w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white"
                >
                  {openIndex === index ? <FaMinus /> : <FaPlus />}
                </motion.div>
              </motion.button>

              <AnimatePresence>
                {openIndex === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 pb-6 pt-0">
                      <p className="text-blue-200 leading-relaxed">
                        {faq.answer}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          viewport={{ once: true }}
          className="text-center mt-12"
        >
          <p className="text-blue-200 mb-4">Não encontrou sua resposta?</p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-300 shadow-lg"
          >
            Fale Conosco
          </motion.button>
        </motion.div>
      </div>
    </section>
  );
};

export default FAQAccordion;
