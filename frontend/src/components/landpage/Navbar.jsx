import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  const navLinks = [
    { label: 'Início', href: '#inicio' },
    { label: 'Imóveis', href: '#imoveis' },
    { label: 'Sobre', href: '#sobre' },
    { label: 'Como Funciona', href: '#como-funciona' },
    { label: 'Contato', href: '#contato' },
  ];

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'bg-[#0B1426]/95 shadow-lg shadow-black/10 backdrop-blur-xl'
          : 'bg-transparent'
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
        {/* Logo */}
        <Link to="/" className="group flex items-center gap-3">
          <img
            src="/logo-crm-imob.svg"
            alt="CRM IMOB"
            className="h-9 w-auto transition-transform duration-300 group-hover:scale-105"
          />
          <span
            className="text-xl font-semibold tracking-wide text-white"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            CRM IMOB
          </span>
        </Link>

        {/* Desktop Links - Center */}
        <div className="hidden items-center gap-1 lg:flex">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="relative rounded-lg px-4 py-2 text-sm font-medium text-white/60 transition-all duration-300 hover:text-white"
            >
              <span className="relative z-10">{link.label}</span>
              <span className="absolute inset-x-2 -bottom-0.5 h-px origin-left scale-x-0 bg-[#F97316] transition-transform duration-300 hover:scale-x-0 group-hover:scale-x-100" />
            </a>
          ))}
        </div>

        {/* Desktop CTA - Right */}
        <div className="hidden items-center gap-5 lg:flex">
          <Link
            to="/login"
            className="text-sm font-medium text-white/60 transition-colors duration-300 hover:text-white"
          >
            Entrar
          </Link>
          <Link
            to="/imoveis-publicos"
            className="rounded-full bg-[#F97316] px-6 py-2.5 text-sm font-semibold text-white transition-all duration-300 hover:bg-[#EA580C] hover:shadow-lg hover:shadow-[#F97316]/25 active:scale-[0.97]"
          >
            Ver Imóveis
          </Link>
        </div>

        {/* Mobile Toggle */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-white transition-colors hover:bg-white/10 lg:hidden"
          aria-label="Abrir menu"
        >
          <AnimatePresence mode="wait">
            {mobileOpen ? (
              <motion.div
                key="close"
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <X size={22} />
              </motion.div>
            ) : (
              <motion.div
                key="menu"
                initial={{ rotate: 90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: -90, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Menu size={22} />
              </motion.div>
            )}
          </AnimatePresence>
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="fixed inset-0 top-[72px] bg-black/50 backdrop-blur-sm lg:hidden"
              onClick={() => setMobileOpen(false)}
            />

            {/* Menu panel */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="absolute left-0 right-0 top-full border-t border-white/[0.06] bg-[#0B1426]/98 backdrop-blur-2xl lg:hidden"
            >
              <div className="flex flex-col gap-1 px-6 py-6">
                {navLinks.map((link, index) => (
                  <motion.a
                    key={link.label}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className="rounded-xl px-4 py-3.5 text-base font-medium text-white/70 transition-colors hover:bg-white/[0.05] hover:text-white"
                  >
                    {link.label}
                  </motion.a>
                ))}

                <div className="mt-4 flex flex-col gap-3 border-t border-white/[0.06] pt-5">
                  <Link
                    to="/login"
                    onClick={() => setMobileOpen(false)}
                    className="rounded-xl px-4 py-3.5 text-center text-base font-medium text-white/70 transition-colors hover:bg-white/[0.05] hover:text-white"
                  >
                    Entrar
                  </Link>
                  <Link
                    to="/imoveis-publicos"
                    onClick={() => setMobileOpen(false)}
                    className="rounded-full bg-[#F97316] px-6 py-3.5 text-center text-sm font-semibold text-white transition-all hover:bg-[#EA580C]"
                  >
                    Ver Imóveis
                  </Link>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.nav>
  );
};

export default Navbar;
