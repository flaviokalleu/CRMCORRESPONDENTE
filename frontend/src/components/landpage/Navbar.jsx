import React, { useState, useEffect } from "react";
import { FaSearch, FaWhatsapp, FaSignInAlt } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showSubmenu, setShowSubmenu] = useState(true);
  const whatsappNumber = process.env.REACT_APP_WHATSAPP_NUMBER;

  const toggleMenu = () => setIsOpen((prev) => !prev);

  const handleScroll = () => setShowSubmenu(window.scrollY === 0);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const submenuLinks = [
    { href: "/", label: "Início" },
    { href: "/imoveis?categoria=novo", label: "Imóveis Novos" },
    { href: "/imoveis?categoria=usados", label: "Imóveis Usados" },
    {
      href: "/imoveis?localizacao=Valparaiso de Goiás - Goiás",
      label: "Valparaíso de Goiás",
    },
    {
      href: "/imoveis?localizacao=cidade-ocidental",
      label: "Cidade Ocidental",
    },
    { href: "/imoveis?localizacao=luziania", label: "Luziânia" },
    { href: "/imoveis?localizacao=Jardim Inga - Goias", label: "Jardim Ingá" },
    { href: "/imoveis?localizacao=brasilia", label: "Brasília" },
    { href: "/imoveis", label: "Todos os Imóveis" },
  ];

  return (
    <>
      {/* Barra de boas-vindas */}
      <div className="bg-gradient-to-r from-blue-800 via-blue-900 to-blue-950 text-white text-center py-2 fixed w-full z-30 top-0 shadow">
        <p className="text-sm font-semibold tracking-wide">
          Bem-vindo ao nosso site! Aproveite nossas ofertas especiais.
        </p>
      </div>

      {/* Navbar Desktop */}
      <nav className="hidden md:block bg-blue-950/95 fixed w-full z-20 top-8 border-b border-blue-900/40 shadow-lg backdrop-blur-md">
        <div className="max-w-screen-xl flex flex-wrap items-center justify-between mx-auto p-4">
          <a href="/" className="flex items-center space-x-3">
            <img src="/logo.png" className="h-12" alt="Logo" />
          </a>
          <div className="flex-grow mx-8">
            <form
              id="frmBusca"
              role="search"
              method="GET"
              action="/busca/"
              className="w-full"
            >
              <div className="relative">
                <input
                  type="text"
                  id="buscaTopo"
                  name="busca"
                  placeholder="O que você procura?"
                  className="w-full py-2 px-4 rounded-lg border border-blue-900/40 bg-blue-900/60 text-white placeholder:text-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-700"
                />
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-blue-400 hover:text-blue-200"
                >
                  <FaSearch />
                </button>
              </div>
            </form>
          </div>
          <div className="flex items-center space-x-6">
            <a
              href={`https://wa.me/${whatsappNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-gradient-to-r from-green-600 to-green-500 text-white px-4 py-2 rounded-lg font-semibold hover:from-green-700 hover:to-green-600 focus:outline-none focus:ring-2 focus:ring-green-400 flex items-center space-x-2 shadow"
            >
              <FaWhatsapp />
              <span>Dúvidas? WhatsApp</span>
            </a>
            <a
              href="/login"
              className="bg-gradient-to-r from-blue-700 to-blue-500 text-white px-4 py-2 rounded-lg font-semibold hover:from-blue-800 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600 flex items-center space-x-2 shadow"
            >
              <FaSignInAlt />
              <span>Corretores</span>
            </a>
          </div>
        </div>
        <AnimatePresence>
          {showSubmenu && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="border-t border-blue-900/40 bg-blue-950/95"
            >
              <div className="flex justify-center items-center w-full">
                <ul className="flex space-x-4 m-0 p-0">
                  {submenuLinks.map(({ href, label }) => (
                    <li key={href}>
                      <a
                        href={href}
                        className="block px-4 py-2 text-blue-100 hover:text-blue-400 font-semibold transition"
                      >
                        {label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Navbar Mobile */}
      <nav className="md:hidden bg-blue-950/95 fixed w-full z-20 top-8 border-b border-blue-900/40 shadow-lg">
        <div className="max-w-screen-xl flex flex-wrap items-center justify-between mx-auto p-4">
          <a href="/" className="flex items-center space-x-3">
            <img src="/logo.png" className="h-12" alt="Logo" />
          </a>
          <button
            onClick={toggleMenu}
            type="button"
            className="inline-flex items-center p-2 w-10 h-10 justify-center text-blue-200 rounded-lg hover:bg-blue-900/40 focus:outline-none focus:ring-2 focus:ring-blue-700"
            aria-controls="navbar-sticky"
            aria-expanded={isOpen}
          >
            <span className="sr-only">Abrir menu principal</span>
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 6h16M4 12h16M4 18h16"
              ></path>
            </svg>
          </button>
        </div>
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-blue-950/95 flex flex-col items-center p-4 border-t border-blue-900/40"
            >
              <form
                id="frmBusca"
                role="search"
                method="GET"
                action="/busca/"
                className="w-full p-4"
              >
                <div className="relative">
                  <input
                    type="text"
                    id="buscaTopo"
                    name="busca"
                    placeholder="O que você procura?"
                    className="w-full py-2 px-4 rounded-lg border border-blue-900/40 bg-blue-900/60 text-white placeholder:text-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-700"
                  />
                  <button
                    type="submit"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-blue-400 hover:text-blue-200"
                  >
                    <FaSearch />
                  </button>
                </div>
              </form>
              <a
                href={`https://wa.me/${whatsappNumber}`}
                target="_blank"
                rel="noopener noreferrer"
                className="my-4 bg-gradient-to-r from-green-600 to-green-500 text-white px-4 py-2 rounded-lg font-semibold hover:from-green-700 hover:to-green-600 focus:outline-none focus:ring-2 focus:ring-green-400 flex items-center space-x-2 shadow"
              >
                <FaWhatsapp />
                <span>Dúvidas? WhatsApp</span>
              </a>
              <a
                href="/login"
                className="bg-gradient-to-r from-blue-700 to-blue-500 text-white px-4 py-2 rounded-lg font-semibold hover:from-blue-800 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600 flex items-center space-x-2 shadow"
              >
                <FaSignInAlt />
                <span>Corretores</span>
              </a>
              {/* Submenu links for mobile */}
              <div className="mt-4 w-full">
                {submenuLinks.map(({ href, label }) => (
                  <a
                    key={href}
                    href={href}
                    className="block px-4 py-2 text-blue-100 hover:text-blue-400 font-semibold transition"
                  >
                    {label}
                  </a>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
      {/* Espaço para compensar a navbar fixa */}
      <div className="h-20 md:h-32"></div>
    </>
  );
};

export default Navbar;
