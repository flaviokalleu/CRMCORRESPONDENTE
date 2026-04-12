import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FaInstagram,
  FaFacebookF,
  FaLinkedinIn,
  FaWhatsapp,
} from 'react-icons/fa';
import { MapPin, Phone, Mail, Clock } from 'lucide-react';

const Footer = () => {
  const nomeSistema = process.env.REACT_APP_NOME_SISTEMA || 'CRM IMOB';
  const currentYear = new Date().getFullYear();

  const quickLinks = [
    { label: 'Início', href: '/' },
    { label: 'Imóveis', href: '/imoveis-publicos' },
    { label: 'Sobre Nós', href: '#servicos' },
    { label: 'Contato', href: '#contato' },
  ];

  const socialLinks = [
    { icon: FaInstagram, href: 'https://instagram.com/CRMIMOB', label: 'Instagram' },
    { icon: FaFacebookF, href: 'https://facebook.com/CRMIMOB', label: 'Facebook' },
    { icon: FaLinkedinIn, href: 'https://linkedin.com/company/CRMIMOB', label: 'LinkedIn' },
    { icon: FaWhatsapp, href: 'https://wa.me/556182511308', label: 'WhatsApp' },
  ];

  return (
    <footer className="bg-[#0B1426] pt-20 pb-8">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Main Footer Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="grid gap-12 border-b border-white/[0.08] pb-12 sm:grid-cols-2 lg:grid-cols-4"
        >
          {/* Brand Column */}
          <div className="sm:col-span-2 lg:col-span-1">
            <Link to="/" className="mb-6 flex items-center gap-3">
              <img src="/logo-crm-imob.svg" alt={nomeSistema} className="h-8 w-auto" />
              <span
                className="text-xl font-semibold text-white"
                style={{ fontFamily: "'Cormorant Garamond', serif" }}
              >
                {nomeSistema}
              </span>
            </Link>
            <p
              className="mb-6 text-sm leading-relaxed text-white/35"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              Há mais de 15 anos transformando a busca por imóveis em uma experiência
              confiável e transparente em Valparaíso de Goiás e região.
            </p>

            {/* Social */}
            <div className="flex gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-white/30 transition-all duration-300 hover:border-[#F97316]/40 hover:text-[#F97316] hover:shadow-md hover:shadow-[#F97316]/10"
                >
                  <social.icon className="text-sm" />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4
              className="mb-5 text-xs font-semibold uppercase tracking-[0.15em] text-white/50"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              Links rápidos
            </h4>
            <ul className="space-y-3">
              {quickLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.href}
                    className="text-sm text-white/35 transition-colors duration-300 hover:text-[#F97316]"
                    style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4
              className="mb-5 text-xs font-semibold uppercase tracking-[0.15em] text-white/50"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              Contato
            </h4>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#F97316]/60" />
                <p
                  className="text-sm text-white/35"
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                >
                  R. Vinte e Nove, 01<br />
                  Parque Esplanada III<br />
                  Valparaíso de Goiás — GO<br />
                  72876-354
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 flex-shrink-0 text-[#F97316]/60" />
                <a
                  href="tel:+5561986374261"
                  className="text-sm text-white/35 transition-colors hover:text-[#F97316]"
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                >
                  (61) 98637-4261
                </a>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 flex-shrink-0 text-[#F97316]/60" />
                <a
                  href="mailto:contato@crmimob.com.br"
                  className="text-sm text-white/35 transition-colors hover:text-[#F97316]"
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                >
                  contato@crmimob.com.br
                </a>
              </div>
            </div>
          </div>

          {/* Hours */}
          <div>
            <h4
              className="mb-5 text-xs font-semibold uppercase tracking-[0.15em] text-white/50"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              Horário
            </h4>
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-5">
              <div className="mb-4 flex items-center gap-2">
                <Clock className="h-4 w-4 text-[#F97316]/60" />
                <span
                  className="text-xs font-medium text-white/50"
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                >
                  Atendimento
                </span>
              </div>
              <div
                className="space-y-3 text-sm"
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                <div className="flex justify-between">
                  <span className="text-white/35">Seg — Sex</span>
                  <span className="font-medium text-white/50">8h às 18h</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/35">Sábado</span>
                  <span className="font-medium text-white/50">8h às 12h</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/35">Domingo</span>
                  <span className="font-medium text-red-400/60">Fechado</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Bottom Bar */}
        <div className="flex flex-col items-center justify-between gap-4 pt-8 md:flex-row">
          <p
            className="text-xs text-white/20"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            &copy; {currentYear} {nomeSistema}. Todos os direitos reservados.
          </p>
          <div
            className="flex gap-6 text-xs text-white/20"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            <a href="/privacidade" className="transition-colors duration-300 hover:text-white/40">
              Privacidade
            </a>
            <a href="/termos" className="transition-colors duration-300 hover:text-white/40">
              Termos de Uso
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
