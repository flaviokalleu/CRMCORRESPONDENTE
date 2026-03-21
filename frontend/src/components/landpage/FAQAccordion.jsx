import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Minus, MessageCircle } from 'lucide-react';

const faqs = [
  {
    question: 'Como funciona o processo de compra ou aluguel?',
    answer:
      'Nosso processo é simples e transparente. Primeiro, você escolhe o imóvel ideal no nosso catálogo ou com a ajuda de um consultor. Em seguida, agendamos uma visita presencial. Após a escolha, nossa equipe cuida de toda a análise documental, negociação e elaboração do contrato. Acompanhamos cada etapa até a entrega das chaves, garantindo total segurança jurídica.',
  },
  {
    question: 'Quais documentos são necessários?',
    answer:
      'Para pessoa física: RG, CPF, comprovante de renda (últimos 3 meses), comprovante de residência e certidão de estado civil. Para pessoa jurídica: CNPJ, contrato social atualizado, balanço patrimonial dos últimos 3 anos e documentos dos sócios. Nossa equipe orienta todo o processo documental e pode solicitar documentos adicionais conforme a operação.',
  },
  {
    question: 'Vocês trabalham com financiamento e Minha Casa Minha Vida?',
    answer:
      'Sim! Trabalhamos com os principais bancos do país — Caixa Econômica, Banco do Brasil, Bradesco, Itaú e Santander. Facilitamos todo o processo de financiamento, incluindo o programa Minha Casa Minha Vida. Nossa equipe acompanha da simulação à aprovação do crédito, buscando sempre as melhores condições para o seu perfil.',
  },
  {
    question: 'Qual a área de atuação da CRM IMOB?',
    answer:
      'Atuamos principalmente em Valparaíso de Goiás, Cidade Ocidental, Luziânia, Novo Gama, Jardim Ingá e toda a região do Entorno de Brasília. Também possuímos opções selecionadas no Distrito Federal. Nosso conhecimento profundo da região nos permite oferecer as melhores oportunidades para cada perfil de cliente.',
  },
  {
    question: 'Como agendar uma visita ao imóvel?',
    answer:
      'Você pode agendar uma visita de diversas formas: pelo nosso site, pelo WhatsApp (61) 98637-4261, por telefone ou diretamente em nosso escritório. Oferecemos horários flexíveis, incluindo finais de semana, para sua comodidade. Todas as visitas são acompanhadas por um consultor especializado na região.',
  },
  {
    question: 'Existe taxa de administração?',
    answer:
      'Nossas taxas são transparentes e competitivas. Apresentamos todos os custos envolvidos antes da assinatura de qualquer contrato, sem surpresas ou cobranças ocultas. O valor varia conforme o tipo de serviço (venda, locação ou administração). Entre em contato para conhecer nossas condições especiais.',
  },
];

const FAQAccordion = () => {
  const [openIndex, setOpenIndex] = useState(null);

  const toggleFAQ = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="relative bg-[#FAF7F2] py-24 lg:py-32">
      {/* Subtle decorative */}
      <div className="absolute top-0 left-0 h-px w-full bg-gradient-to-r from-transparent via-[#0B1426]/5 to-transparent" />

      <div className="mx-auto max-w-3xl px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-16 text-center"
        >
          <div className="mb-4 flex items-center justify-center gap-3">
            <div className="h-px w-8 bg-[#F97316]" />
            <span
              className="text-xs font-semibold uppercase tracking-[0.2em] text-[#F97316]"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              Dúvidas Frequentes
            </span>
            <div className="h-px w-8 bg-[#F97316]" />
          </div>
          <h2
            className="text-4xl font-light text-[#0B1426] md:text-5xl"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            Perguntas <span className="italic font-medium">frequentes</span>
          </h2>
          <p
            className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-[#0B1426]/50"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            Reunimos as dúvidas mais comuns para facilitar sua jornada imobiliária.
          </p>
        </motion.div>

        {/* Accordion */}
        <div className="space-y-3">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                className={`overflow-hidden rounded-xl border transition-all duration-300 ${
                  isOpen
                    ? 'border-[#F97316]/30 bg-white shadow-md shadow-[#F97316]/5'
                    : 'border-[#0B1426]/[0.08] bg-white hover:border-[#F97316]/20 hover:shadow-sm'
                }`}
              >
                <button
                  onClick={() => toggleFAQ(index)}
                  className="flex w-full items-center justify-between px-6 py-5 text-left"
                  aria-expanded={isOpen}
                >
                  <h3
                    className={`pr-4 text-base font-semibold transition-colors duration-300 ${
                      isOpen ? 'text-[#F97316]' : 'text-[#0B1426]'
                    }`}
                    style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                  >
                    {faq.question}
                  </h3>
                  <div
                    className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full transition-all duration-300 ${
                      isOpen
                        ? 'bg-[#F97316] text-white shadow-md shadow-[#F97316]/30'
                        : 'bg-[#0B1426]/5 text-[#0B1426]/40'
                    }`}
                  >
                    {isOpen ? (
                      <Minus className="h-3.5 w-3.5" />
                    ) : (
                      <Plus className="h-3.5 w-3.5" />
                    )}
                  </div>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                    >
                      <div className="border-t border-[#0B1426]/5 px-6 py-5">
                        <p
                          className="text-sm leading-relaxed text-[#0B1426]/50"
                          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                        >
                          {faq.answer}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-12 text-center"
        >
          <p
            className="mb-4 text-sm text-[#0B1426]/40"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            Não encontrou sua resposta?
          </p>
          <a
            href="https://wa.me/5561994617584?text=Olá! Tenho uma dúvida sobre os serviços da CRM IMOB"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border-2 border-[#0B1426] px-7 py-3 text-sm font-semibold text-[#0B1426] transition-all duration-300 hover:bg-[#0B1426] hover:text-white hover:shadow-lg"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            <MessageCircle className="h-4 w-4" />
            Fale conosco
          </a>
        </motion.div>
      </div>
    </section>
  );
};

export default FAQAccordion;
