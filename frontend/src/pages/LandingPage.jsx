import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import Navbar from '../components/landpage/Navbar';
import HeroSection from '../components/landpage/HeroSection';
import Icones from '../components/landpage/Icones';
import CardGrid from '../components/landpage/CardGrid';
import CTASection from '../components/landpage/CTASection';
import TestimonialTabs from '../components/landpage/TestimonialTabs';
import FAQAccordion from '../components/landpage/FAQAccordion';
import PartnersSection from '../components/landpage/PartnersSection';
import Footer from '../components/landpage/Footer';
import { motion } from 'framer-motion';
import { MessageCircle } from 'lucide-react';

const WHATSAPP_NUMBER = '556182511308';
const WHATSAPP_LINK = `https://wa.me/${WHATSAPP_NUMBER}`;

const EXEMPLO_IMOVEIS = [
  {
    id: 'ex1',
    nome_imovel: 'Casa 3 Quartos - Jardim Céu Azul',
    tipo: 'Casa',
    localizacao: 'Jardim Céu Azul, Valparaíso de Goiás',
    valor_venda: 285000,
    quartos: 3,
    banheiro: 2,
    garagem: 2,
    area: 120,
    imagem_capa: null,
  },
  {
    id: 'ex2',
    nome_imovel: 'Apartamento 2 Quartos - Parque Esplanada',
    tipo: 'Apartamento',
    localizacao: 'Parque Esplanada III, Valparaíso de Goiás',
    valor_venda: 189900,
    quartos: 2,
    banheiro: 1,
    garagem: 1,
    area: 58,
    imagem_capa: null,
  },
  {
    id: 'ex3',
    nome_imovel: 'Casa Condomínio Green Park',
    tipo: 'Casa',
    localizacao: 'Green Park, Valparaíso de Goiás',
    valor_venda: 420000,
    quartos: 3,
    banheiro: 3,
    garagem: 2,
    area: 150,
    imagem_capa: null,
  },
  {
    id: 'ex4',
    nome_imovel: 'Terreno 300m² - Cidade Jardins',
    tipo: 'Terreno',
    localizacao: 'Cidade Jardins, Valparaíso de Goiás',
    valor_venda: 95000,
    quartos: 0,
    banheiro: 0,
    garagem: 0,
    area: 300,
    imagem_capa: null,
  },
  {
    id: 'ex5',
    nome_imovel: 'Apartamento Garden - Res. das Flores',
    tipo: 'Apartamento',
    localizacao: 'Residencial das Flores, Valparaíso de Goiás',
    valor_venda: 230000,
    quartos: 2,
    banheiro: 2,
    garagem: 1,
    area: 72,
    imagem_capa: null,
  },
  {
    id: 'ex6',
    nome_imovel: 'Casa Alto Padrão - Brisas do Vale',
    tipo: 'Casa',
    localizacao: 'Brisas do Vale, Valparaíso de Goiás',
    valor_venda: 650000,
    quartos: 4,
    banheiro: 3,
    garagem: 3,
    area: 220,
    imagem_capa: null,
  },
];

const LandingPage = () => {
  const nomeSistema = process.env.REACT_APP_NOME_SISTEMA || 'CRM IMOB';
  const [imoveis, setImoveis] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${process.env.REACT_APP_API_URL}/imoveis?limit=6`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error('Falha ao carregar imóveis');
        return res.json();
      })
      .then((data) => {
        const list = Array.isArray(data) ? data : data.data || [];
        const result = list.slice(0, 6);
        setImoveis(result.length > 0 ? result : EXEMPLO_IMOVEIS);
      })
      .catch((error) => {
        if (error.name !== 'AbortError') {
          console.error('Erro de carregamento:', error.message);
          setImoveis(EXEMPLO_IMOVEIS);
        }
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  return (
    <>
      <Helmet>
        <title>{nomeSistema} — Imóveis em Valparaíso de Goiás</title>
        <meta
          name="description"
          content="CRM IMOB — Encontre o imóvel dos seus sonhos em Valparaíso de Goiás. Casas, apartamentos e terrenos com atendimento personalizado e segurança jurídica."
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400;1,500;1,600&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </Helmet>

      <div
        className="min-h-screen bg-[#FAF7F2]"
        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
      >
        <Navbar />
        <HeroSection />
        <Icones />
        <CardGrid imoveis={imoveis} loading={loading} />
        <CTASection />
        <TestimonialTabs />
        <PartnersSection />
        <FAQAccordion />
        <Footer />

        {/* WhatsApp Floating Button */}
        <motion.a
          href={WHATSAPP_LINK}
          target="_blank"
          rel="noopener noreferrer"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 1.2, type: 'spring', stiffness: 180 }}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg shadow-green-500/30 transition-shadow hover:shadow-xl hover:shadow-green-500/40"
          aria-label="Contato via WhatsApp"
        >
          <MessageCircle className="h-6 w-6" />
        </motion.a>
      </div>
    </>
  );
};

export default LandingPage;
