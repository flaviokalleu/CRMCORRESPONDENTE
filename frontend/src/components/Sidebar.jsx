import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { HiMenu, HiChevronRight } from "react-icons/hi";
import {
  FaUserPlus,
  FaUserTie,
  FaUserShield,
  FaBuilding,
  FaListAlt,
  FaListUl,
  FaClipboardList,
  FaUsersCog,
  FaUserFriends,
  FaSignOutAlt,
  FaCog,
  FaQrcode,
  FaChartBar,
  FaTachometerAlt,
  FaBell,
  FaCreditCard, // ✅ NOVO ÍCONE PARA PAGAMENTOS
  FaMoneyBillWave // ✅ NOVO ÍCONE PARA BOLETOS
} from "react-icons/fa";
import { useAuth } from "../context/AuthContext";

const Sidebar = ({ open, handleDrawerClose, onToggleVisibility }) => {
  const { user, logout, hasRole } = useAuth();
  const navigate = useNavigate();

  const [timeRemaining, setTimeRemaining] = useState("Carregando...");
  const [addDropdownOpen, setAddDropdownOpen] = useState(false);
  const [listDropdownOpen, setListDropdownOpen] = useState(false);

  // Nome do sistema vindo do .env
  const nomeSistema = process.env.REACT_APP_NOME_SISTEMA || "CAIXA CRM";

  // Função para lidar com logout
  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // Memoiza a função para evitar warning do useEffect
  const calculateTimeRemaining = useCallback(() => {
    try {
      // Primeiro tenta pegar do AuthContext se disponível
      if (user?.tokenExpiry) {
        const expiryTime = new Date(user.tokenExpiry).getTime();
        const now = Date.now();
        const timeDiff = expiryTime - now;

        if (timeDiff <= 0) {
          return "Expirado";
        }

        const totalSeconds = Math.floor(timeDiff / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        if (hours > 0) {
          return `${hours}h ${minutes}m ${seconds}s`;
        } else if (minutes > 0) {
          return `${minutes}m ${seconds}s`;
        } else {
          return `${seconds}s`;
        }
      }

      // Fallback: tenta decodificar do token JWT usando a chave correta
      const token = localStorage.getItem("authToken"); // ✅ CORREÇÃO: usar 'authToken' em vez de 'token'
      if (!token) {
        return "Token não encontrado";
      }
      // Verifica se o token tem o formato JWT correto
      const tokenParts = token.split('.');
      if (tokenParts.length !== 3) {
        return "Token inválido";
      }
      try {
        // Decodifica o payload do JWT
        const base64Url = tokenParts[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        // Adiciona padding se necessário
        const paddedBase64 = base64 + '='.repeat((4 - base64.length % 4) % 4);
        const jsonPayload = decodeURIComponent(
          atob(paddedBase64)
            .split('')
            .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
        );
        const decoded = JSON.parse(jsonPayload);
        if (!decoded.exp) {
          return "Token sem expiração";
        }
        // exp está em segundos Unix, converte para milliseconds
        const expiryTime = decoded.exp * 1000;
        const now = Date.now();
        const timeDiff = expiryTime - now;
        if (timeDiff <= 0) {
          return "Expirado";
        }
        const totalSeconds = Math.floor(timeDiff / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        // Formata baseado no tempo restante
        if (hours > 0) {
          return `${hours}h ${minutes}m`;
        } else if (minutes > 0) {
          return `${minutes}m ${seconds}s`;
        } else {
          return `${seconds}s`;
        }
      } catch (decodeError) {
        console.error("Erro ao decodificar token:", decodeError);
        return "Token corrompido";
      }
    } catch (error) {
      console.error("Erro geral ao calcular tempo:", error);
      return "Erro no cálculo";
    }
  }, [user]);

  // Debug function melhorada
  const debugTokenInfo = () => {
    const token = localStorage.getItem("authToken"); // ✅ CORREÇÃO: usar 'authToken'
    
    console.group("🔍 Debug Token Info");
    console.log("Token exists:", !!token);
    console.log("User exists:", !!user);
    console.log("User tokenExpiry:", user?.tokenExpiry);
    
    if (user?.tokenExpiry) {
      const expiry = new Date(user.tokenExpiry);
      const now = new Date();
      console.log("Expiry from user context:", expiry.toLocaleString());
      console.log("Current time:", now.toLocaleString());
      console.log("Time difference (ms):", expiry.getTime() - now.getTime());
      console.log("Time difference (seconds):", Math.floor((expiry.getTime() - now.getTime()) / 1000));
    }
    
    if (token) {
      console.log("Token exists in localStorage:", true);
      console.log("Token key used: 'authToken'");
      console.log("Token length:", token.length);
      console.log("Token parts:", token.split('.').length);
      console.log("Token preview:", token.substring(0, 50) + "...");
      
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          // Decodificar header
          const header = JSON.parse(atob(parts[0].replace(/-/g, '+').replace(/_/g, '/')));
          
          // Decodificar payload
          const base64Url = parts[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const paddedBase64 = base64 + '='.repeat((4 - base64.length % 4) % 4);
          const payload = JSON.parse(atob(paddedBase64));
          
          console.log("Header:", header);
          console.log("Payload:", payload);
          
          if (payload.exp) {
            const expDate = new Date(payload.exp * 1000);
            const now = new Date();
            const timeLeft = payload.exp * 1000 - now.getTime();
            
            console.log("JWT expires at:", expDate.toLocaleString());
            console.log("Current time:", now.toLocaleString());
            console.log("Time left (ms):", timeLeft);
            console.log("Time left (seconds):", Math.floor(timeLeft / 1000));
            console.log("Is expired?", timeLeft <= 0);
          }
          
          if (payload.iat) {
            const issuedDate = new Date(payload.iat * 1000);
            console.log("JWT issued at:", issuedDate.toLocaleString());
          }
        }
      } catch (e) {
        console.error("Error parsing JWT token:", e);
      }
    } else {
      console.log("❌ No token found in localStorage");
      console.log("Available keys:", Object.keys(localStorage));
    }
    console.groupEnd();
  };

  useEffect(() => {
    // Calcula imediatamente quando o componente monta ou user muda
    const remaining = calculateTimeRemaining();
    setTimeRemaining(remaining);
    
    // Configura o intervalo para atualizar a cada segundo
    const interval = setInterval(() => {
      const newRemaining = calculateTimeRemaining();
      setTimeRemaining(newRemaining);
      
      // Se expirou, faz logout automático
      if (newRemaining === "Expirado") {
        console.log("Token expirado, fazendo logout...");
        clearInterval(interval);
        logout();
        navigate("/login");
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [user, logout, navigate, calculateTimeRemaining]);

  // Função para determinar o papel principal do usuário para exibição
  const getUserDisplayRole = () => {
    if (hasRole('administrador')) return 'Administrador';
    if (hasRole('correspondente')) return 'Correspondente';
    if (hasRole('corretor')) return 'Corretor';
    return 'Usuário';
  };

  const getUserPhotoDirectory = () => {
    // Prioridade: Administrador > Correspondente > Corretor > Default
    if (hasRole('administrador')) {
      return 'imagem_administrador';
    }
    if (hasRole('correspondente')) {
      return 'imagem_correspondente';
    }
    if (hasRole('corretor')) {
      return 'corretor';
    }
    return 'imagem_user';
  };

  // Função para gerar a URL da foto do usuário
  const getUserPhotoUrl = () => {
    if (!user?.photo) {
      return `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.first_name || 'default'}&backgroundColor=1B4F72`;
    }

    const photoDirectory = getUserPhotoDirectory();
    return `${process.env.REACT_APP_API_URL}/uploads/${photoDirectory}/${user.photo}`;
  };

  // Função de fallback para erro de carregamento da imagem
  const handleImageError = (e) => {
    e.target.onerror = null; // Previne loop infinito
    
    // Lista de diretórios para tentar como fallback
    const fallbackDirectories = ['imagem_user', 'corretor', 'correspondente'];
    const currentSrc = e.target.src;
    
    // Encontrar o próximo diretório para testar
    for (let i = 0; i < fallbackDirectories.length; i++) {
      const dir = fallbackDirectories[i];
      const testUrl = `${process.env.REACT_APP_API_URL}/uploads/${dir}/${user.photo}`;
      
      if (!currentSrc.includes(dir)) {
        e.target.src = testUrl;
        return;
      }
    }
    
    // Se todos falharam, usar avatar gerado
    e.target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.first_name || 'default'}&backgroundColor=1B4F72`;
  };

  // Configuração de itens do menu baseada nos papéis
  const getMenuItems = () => {
    const items = {
      addItems: [],
      listItems: [],
      extraItems: []
    };

    // Dashboard disponível para todos
    items.extraItems.push({
      to: "/dashboard",
      icon: <FaTachometerAlt size={18} />,
      label: "Dashboard",
    });

    // Itens para Corretor
    if (hasRole('corretor')) {
      items.addItems.push(
        {
          to: "/clientes/adicionar",
          icon: <FaUserPlus size={18} />,
          label: "Adicionar Cliente",
        }
        // ...não adicionar aluguel...
      );

      items.listItems.push(
        {
          to: "/clientes/lista",
          icon: <FaListUl size={18} />,
          label: "Lista Clientes",
        },
        {
          to: "/imoveis/lista",
          icon: <FaClipboardList size={18} />,
          label: "Lista Imóveis",
        }
        // ...não adicionar lista de aluguéis...
      );
    }

    // Itens para Correspondente - ACESSO LIMITADO
    if (hasRole('correspondente')) {
      items.addItems.push({
        to: "/clientes/adicionar",
        icon: <FaUserPlus size={18} />,
        label: "Adicionar Cliente",
      });

      items.listItems.push({
        to: "/clientes/lista",
        icon: <FaListUl size={18} />,
        label: "Lista Clientes",
      });
      // ...não adicionar laudos...
    }

    // Itens para Administrador e Correspondente
    if (hasRole('administrador') || hasRole('correspondente')) {
      // Adicionar todos os itens de adição
      const adminAddItems = [
        {
          to: "/clientes/adicionar",
          icon: <FaUserPlus size={18} />,
          label: "Adicionar Cliente",
        },
        {
          to: "/corretores/adicionar",
          icon: <FaUserTie size={18} />,
          label: "Adicionar Corretor",
        },
        {
          to: "/correspondentes/adicionar",
          icon: <FaUserShield size={18} />,
          label: "Adicionar Correspondente",
        },
        {
          to: "/imoveis/adicionar",
          icon: <FaBuilding size={18} />,
          label: "Adicionar Imóvel",
        },
        {
          to: "/pagamentos/criar",
          icon: <FaCreditCard size={18} />,
          label: "Criar Pagamento",
        }
      ];

      adminAddItems.forEach(item => {
        if (!items.addItems.some(existing => existing.to === item.to)) {
          items.addItems.push(item);
        }
      });

      // Adicionar todas as listas
      const adminListItems = [
        {
          to: "/proprietarios/lista",
          icon: <FaListAlt size={18} />,
          label: "Lista Proprietários",
        },
        {
          to: "/lembretes",
          icon: <FaBell size={18} />,
          label: "Lembretes",
        },
        {
          to: "/clientes/lista",
          icon: <FaListUl size={18} />,
          label: "Lista Clientes",
        },
        {
          to: "/imoveis/lista",
          icon: <FaClipboardList size={18} />,
          label: "Lista Imóveis",
        },
        {
          to: "/corretores/lista",
          icon: <FaUsersCog size={18} />,
          label: "Lista Corretores",
        },
        {
          to: "/correspondentes/lista",
          icon: <FaUserFriends size={18} />,
          label: "Lista Correspondentes",
        },
        {
          to: "/pagamentos/lista",
          icon: <FaMoneyBillWave size={18} />,
          label: "Lista de Pagamentos",
        }
      ];

      adminListItems.forEach(item => {
        if (!items.listItems.some(existing => existing.to === item.to)) {
          items.listItems.push(item);
        }
      });

      // Itens extras para administrador e correspondente
      const adminExtraItems = [
        {
          to: "/whatsapp-qr",
          icon: <FaQrcode size={18} />,
          label: "Escanear QR Code",
        },
        {
          to: "/relatorio",
          icon: <FaChartBar size={18} />,
          label: "Relatório",
        },
        {
          to: "/acessos",
          icon: <FaUsersCog size={18} />,
          label: "Acessos List",
        }
      ];

      adminExtraItems.forEach(item => {
        if (!items.extraItems.some(existing => existing.to === item.to)) {
          items.extraItems.push(item);
        }
      });
    }

    // Adicionar menu financeiro para administrador
    if (hasRole('administrador')) {
      items.extraItems.push({
        to: '/financeiro/dashboard',
        icon: <FaChartBar size={18} />,
        label: 'Financeiro',
      });
    }

    return items;
  };

  const menuItems = getMenuItems();

  // Animation variants
  const sidebarVariants = {
    open: {
      x: 0,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 20
      }
    },
    closed: {
      x: "-100%",
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 20
      }
    }
  };

  const dropdownVariants = {
    open: {
      height: "auto",
      opacity: 1,
      transition: {
        height: {
          duration: 0.3
        },
        opacity: {
          duration: 0.2,
          delay: 0.1
        }
      }
    },
    closed: {
      height: 0,
      opacity: 0,
      transition: {
        height: {
          duration: 0.3
        },
        opacity: {
          duration: 0.2
        }
      }
    }
  };

  // Elegant MenuItem component for consistent styling
  const MenuItem = ({ to, icon, label, onClick, isDropdown = false, openDropdown }) => (
    <motion.li 
      className="mb-1"
      whileHover={{ x: 4 }}
      transition={{ duration: 0.2 }}
    >
      {to ? (
        <Link
          to={to}
          className="flex items-center px-4 py-3 text-sm transition-all duration-300 rounded-xl hover:bg-caixa-primary/30 text-white hover:text-white font-medium group relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-caixa-primary/20 to-caixa-secondary/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"></div>
          <span className="text-white group-hover:text-white transition-colors duration-300 relative z-10">{icon}</span>
          <span className="ml-3 relative z-10">{label}</span>
        </Link>
      ) : (
        <button
          onClick={onClick}
          className="flex items-center justify-between w-full px-4 py-3 text-sm transition-all duration-300 rounded-xl hover:bg-caixa-primary/30 text-white hover:text-white font-medium group relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-caixa-primary/20 to-caixa-secondary/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"></div>
          <div className="flex items-center relative z-10">
            <span className="text-white group-hover:text-white transition-colors duration-300">{icon}</span>
            <span className="ml-3">{label}</span>
          </div>
          {isDropdown && (
            <motion.span 
              className="text-caixa-extra-light group-hover:text-caixa-light transition-colors duration-300 relative z-10"
              animate={{ rotate: openDropdown ? 90 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <HiChevronRight size={16} />
            </motion.span>
          )}
        </button>
      )}
    </motion.li>
  );

  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm lg:hidden z-40"
            onClick={handleDrawerClose}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.div
        variants={sidebarVariants}
        animate={open ? "open" : "closed"}
        className="fixed inset-0 top-0 left-0 lg:translate-x-0 bg-caixa-gradient text-white w-64 h-full z-50 overflow-y-auto shadow-2xl border-r border-caixa-light/20"
      >
        {/* Background Effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-10 left-10 w-32 h-32 bg-caixa-primary/10 rounded-full blur-2xl" />
          <div className="absolute bottom-20 right-5 w-24 h-24 bg-caixa-secondary/10 rounded-full blur-2xl" />
        </div>

        <div className="flex flex-col h-full relative z-10">
          {/* Mobile Header */}
          <div className="flex items-center justify-between p-4 bg-caixa-primary/50 backdrop-blur-md border-b border-caixa-light/20 lg:hidden">
            <div className="text-transparent bg-clip-text bg-gradient-to-r from-caixa-orange to-caixa-orange-light font-bold text-lg">
              {nomeSistema}
            </div>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleDrawerClose}
              className="text-caixa-orange hover:text-white transition-colors p-2 rounded-lg hover:bg-caixa-primary/30"
            >
              <HiMenu size={24} />
            </motion.button>
          </div>

          {/* Desktop Header with Hide Button */}
          <div className="hidden lg:flex items-center justify-between p-4 bg-caixa-primary/50 backdrop-blur-md border-b border-caixa-light/20">
            <div className="text-transparent bg-clip-text bg-gradient-to-r from-caixa-orange to-caixa-orange-light font-bold text-lg text-white">
              {nomeSistema}
            </div>
            {onToggleVisibility && (
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onToggleVisibility}
                className="text-caixa-white hover:text-white transition-colors p-2 rounded-lg hover:bg-caixa-primary/30"
                title="Esconder Sidebar"
              >
                <HiMenu size={20} />
              </motion.button>
            )}
          </div>

          {/* User Profile */}
          <div className="flex items-center p-6 bg-caixa-primary/30 backdrop-blur-md border-b border-caixa-light/20">
            <div className="relative">
              <motion.div 
                className="w-14 h-14 rounded-full border-2 border-caixa-orange/50 overflow-hidden shadow-lg bg-gradient-to-br from-caixa-primary to-caixa-secondary"
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.2 }}
              >
                <img
                  src={getUserPhotoUrl()}
                  alt="User"
                  className="w-full h-full object-cover"
                  onError={handleImageError}
                />
              </motion.div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-caixa-orange rounded-full border-2 border-caixa-primary shadow-lg"></div>
              
              {/* Debug info - Remove in production */}
              {process.env.NODE_ENV === 'development' && user?.photo && (
                <div className="absolute -top-8 left-0 bg-black/80 text-white text-xs px-2 py-1 rounded opacity-0 hover:opacity-100 transition-opacity whitespace-nowrap">
                  Dir: {getUserPhotoDirectory()}
                </div>
              )}
            </div>
            <div className="ml-4 flex-1 min-w-0">
              <div className="font-semibold text-white text-base truncate">
                {user?.first_name || "Usuário"} {user?.last_name || ""}
              </div>
              <div className="text-xs text-caixa-light truncate">
                {getUserDisplayRole()}
              </div>
              
              
                      <div className="flex flex-wrap gap-1 mt-2">
                      {hasRole('administrador') && (
                        <span className="px-2 py-0.5 bg-red-700/20 text-red-400 text-xs rounded-full border border-red-400/30">
                        Admin
                        </span>
                      )}
                      {hasRole('correspondente') && (
                        <span className="px-2 py-0.5 bg-white/20 text-white text-xs rounded-full border border-white/30">
                        Corresp
                        </span>
                      )}
                      {hasRole('corretor') && (
                        <span className="px-2 py-0.5 bg-white/20 text-white text-xs rounded-full border border-white/30">
                        Corretor
                        </span>
                      )}
                      </div>

                      
                          <div className="text-xs text-caixa-extra-light mt-2 flex items-center flex-wrap">
                          <span className="mr-2">Token:</span>
                          <span
                          className={`border px-2 py-0.5 rounded-lg text-xs font-mono cursor-pointer transition-all duration-300 hover:scale-105 ${
                          timeRemaining === "Expirado"
                            ? "bg-red-950/50 border-red-400/50 text-red-300 animate-pulse"
                            : timeRemaining.includes("Token") ||
                            timeRemaining.includes("Erro") ||
                            timeRemaining.includes("corrompido")
                            ? "bg-yellow-950/50 border-yellow-400/50 text-yellow-300"
                            : timeRemaining === "Não logado"
                            ? "bg-caixa-gray-800/50 border-caixa-gray-400/50 text-caixa-gray-400"
                            : "bg-caixa-primary/50 border-caixa-orange/50 text-white"
                          }`}
                          onClick={() =>
                          process.env.NODE_ENV === "development" && debugTokenInfo()
                          }
                          title={
                          process.env.NODE_ENV === "development"
                            ? "Clique para debug info"
                            : "Status do token"
                          }
                          >
                          {/* Mostra o tempo restante em branco, mas se estiver expirando (<30s), o número fica vermelho */}
                        {(() => {
                        if (
                          typeof timeRemaining === "string" &&
                          !["Expirado", "Não logado"].includes(timeRemaining) &&
                          !timeRemaining.includes("Token") &&
                          !timeRemaining.includes("Erro") &&
                          !timeRemaining.includes("corrompido")
                        ) {
                          // Extrai segundos restantes
                          const match = timeRemaining.match(/(\d+)s$/);
                          const seconds =
                          match && match[1] ? parseInt(match[1], 10) : null;
                          if (seconds !== null && seconds <= 30) {
                          // Se está expirando, deixa o número final vermelho
                          const parts = timeRemaining.split(" ");
                          return (
                            <>
                            {parts.slice(0, -1).join(" ")}{" "}
                            <span className="text-red-400 font-bold animate-pulse">
                              {parts[parts.length - 1]}
                            </span>
                            </>
                          );
                          }
                        }
                        // Caso normal, tudo branco
                        return timeRemaining;
                        })()}
                      </span>
                      </div>
                    </div>
                    </div>

                    {/* Navigation */}
          <nav className="mt-4 flex-1 px-3">
            <ul className="space-y-2">
              {/* Extra Items Section */}
              {menuItems.extraItems.map((item, index) => (
                <MenuItem
                  key={`extra-${item.to || item.label}-${index}`}
                  to={item.to}
                  icon={item.icon}
                  label={item.label}
                />
              ))}

              {/* Divider */}
              <li className="my-4">
                <div className="border-t border-caixa-light/20"></div>
              </li>

              {/* Add Section */}
              {menuItems.addItems.length > 0 && (
                <>
                  <MenuItem
                    icon={<FaUserPlus size={18} />}
                    label="Adicionar"
                    onClick={() => setAddDropdownOpen(!addDropdownOpen)}
                    isDropdown={true}
                    openDropdown={addDropdownOpen}
                  />

                  <AnimatePresence>
                    {addDropdownOpen && (
                      <motion.ul
                        variants={dropdownVariants}
                        initial="closed"
                        animate="open"
                        exit="closed"
                        className="ml-4 mt-1 border-l border-caixa-light/20 pl-3 overflow-hidden"
                      >
                        {menuItems.addItems.map((item, index) => (
                          <MenuItem
                            key={`add-${item.to || item.label}-${index}`}
                            to={item.to}
                            icon={item.icon}
                            label={item.label}
                          />
                        ))}
                      </motion.ul>
                    )}
                  </AnimatePresence>
                </>
              )}

              {/* List Section */}
              {menuItems.listItems.length > 0 && (
                <>
                  <MenuItem
                    icon={<FaListAlt size={18} />}
                    label="Listagens"
                    onClick={() => setListDropdownOpen(!listDropdownOpen)}
                    isDropdown={true}
                    openDropdown={listDropdownOpen}
                  />

                  <AnimatePresence>
                    {listDropdownOpen && (
                      <motion.ul
                        variants={dropdownVariants}
                        initial="closed"
                        animate="open"
                        exit="closed"
                        className="ml-4 mt-1 border-l border-caixa-light/20 pl-3 overflow-hidden"
                      >
                        {menuItems.listItems.map((item, index) => (
                          <MenuItem
                            key={`list-${item.to || item.label}-${index}`}
                            to={item.to}
                            icon={item.icon}
                            label={item.label}
                          />
                        ))}
                      </motion.ul>
                    )}
                  </AnimatePresence>
                </>
              )}

              {/* Divider */}
              <li className="my-4">
                <div className="border-t border-caixa-light/20"></div>
              </li>

              {/* Settings and Logout */}
              <MenuItem
                to="/configuracoes"
                icon={<FaCog size={18} />}
                label="Configurações"
              />

              <MenuItem
                icon={<FaSignOutAlt size={18} />}
                label="Sair"
                onClick={handleLogout}
              />
            </ul>
          </nav>

          {/* Footer */}
          <div className="p-4 mt-auto text-center text-xs text-caixa-extra-light/70 border-t border-caixa-light/20 bg-caixa-primary/30 backdrop-blur-md">
            <div className="text-transparent bg-clip-text bg-gradient-to-r from-caixa-orange to-caixa-orange-light font-semibold">
              &copy; {new Date().getFullYear()} {nomeSistema}
            </div>
            <div className="mt-1 text-caixa-light/50">
              Sistema de Gestão Imobiliária
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
};

export default Sidebar;