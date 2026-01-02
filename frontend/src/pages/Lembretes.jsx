import React, { useState, useEffect } from "react";
import AddLembreteModal from "../components/AddLembreteModal";
import MainLayout from "../layouts/MainLayout";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaEdit,
  FaTrashAlt,
  FaCheck,
  FaPlus,
  FaClock,
  FaCalendarAlt,
  FaFileAlt,
  FaTasks,
  FaCheckCircle,
  FaFilter,
  FaSearch,
  FaBell,
  FaExclamationTriangle
} from "react-icons/fa";

const Lembretes = () => {
  const [lembretes, setLembretes] = useState([]);
  const [concluidos, setConcluidos] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentLembrete, setCurrentLembrete] = useState(null);
  const [error, setError] = useState(null);
  const [showConcluidos, setShowConcluidos] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const API_URL = process.env.REACT_APP_API_URL;

  useEffect(() => {
    const fetchLembretes = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${API_URL}/lembretes`);
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }
        const data = await response.json();
        if (Array.isArray(data)) {
          setLembretes(data.filter((lembrete) => !lembrete.concluido));
          setConcluidos(data.filter((lembrete) => lembrete.concluido));
        } else {
          setLembretes([]);
          setConcluidos([]);
        }
      } catch (error) {
        setLembretes([]);
        setConcluidos([]);
        setError("Erro ao carregar lembretes");
      } finally {
        setLoading(false);
      }
    };

    fetchLembretes();
  }, [API_URL]);

  const formatDate = (dateString) => {
    const options = { 
      year: "numeric", 
      month: "long", 
      day: "numeric",
      weekday: "long"
    };
    return new Date(dateString).toLocaleDateString("pt-BR", options);
  };

  const formatDateShort = (dateString) => {
    return new Date(dateString).toLocaleDateString("pt-BR");
  };

  const isOverdue = (dateString) => {
    const today = new Date();
    const lembreteDate = new Date(dateString);
    return lembreteDate < today;
  };

  const isToday = (dateString) => {
    const today = new Date();
    const lembreteDate = new Date(dateString);
    return today.toDateString() === lembreteDate.toDateString();
  };

  const handleEdit = (lembrete) => {
    setCurrentLembrete(lembrete);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Você realmente deseja excluir este lembrete?")) {
      try {
        const response = await fetch(`${API_URL}/lembretes/${id}`, {
          method: "DELETE",
        });
        if (!response.ok) {
          throw new Error("Erro ao excluir lembrete");
        }
        setLembretes(lembretes.filter((lembrete) => lembrete.id !== id));
        setConcluidos(concluidos.filter((lembrete) => lembrete.id !== id));
      } catch (error) {
        setError("Erro ao excluir lembrete. Tente novamente.");
      }
    }
  };

  const handleConcluir = async (id) => {
    const lembreteConcluido = lembretes.find((l) => l.id === id);
    if (lembreteConcluido) {
      try {
        await fetch(`${API_URL}/lembretes/${id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: "concluido" }),
        });

        setConcluidos((prev) => [
          ...prev,
          { ...lembreteConcluido, concluido: true },
        ]);
        setLembretes(lembretes.filter((l) => l.id !== id));
      } catch (error) {
        setError("Erro ao concluir lembrete. Tente novamente.");
      }
    }
  };

  const handleAddOrUpdateLembrete = (lembrete) => {
    if (lembrete.concluido) {
      setConcluidos((prev) => {
        const exists = prev.find((l) => l.id === lembrete.id);
        if (exists) {
          return prev.map((l) => (l.id === lembrete.id ? lembrete : l));
        }
        return [...prev, lembrete];
      });
      setLembretes((prev) => prev.filter((l) => l.id !== lembrete.id));
    } else {
      setLembretes((prev) => {
        const exists = prev.find((l) => l.id === lembrete.id);
        if (exists) {
          return prev.map((l) => (l.id === lembrete.id ? lembrete : l));
        }
        return [...prev, lembrete];
      });
      setConcluidos((prev) => prev.filter((l) => l.id !== lembrete.id));
    }
    setIsModalOpen(false);
    setCurrentLembrete(null);
  };

  // Filtrar lembretes pelo termo de busca
  const filteredLembretes = (showConcluidos ? concluidos : lembretes).filter(
    (lembrete) =>
      lembrete.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lembrete.descricao.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <MainLayout>
        <div className="min-h-screen bg-caixa-primary flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-r from-caixa-orange to-caixa-orange-light rounded-full mx-auto flex items-center justify-center mb-4 animate-pulse">
              <FaClock className="w-8 h-8 text-white" />
            </div>
            <p className="text-white text-lg">Carregando lembretes...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="min-h-screen w-full bg-caixa-primary relative">
        {/* Efeitos de Background */}
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute top-0 left-0 w-96 h-96 bg-caixa-orange/30 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-caixa-orange-light/30 rounded-full blur-3xl"></div>
        </div>

        {/* Container principal */}
        <div className="relative z-10 container mx-auto px-4 py-6 md:px-6 lg:px-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-r from-white to-caixa-light rounded-xl flex items-center justify-center">
                  <FaBell className="w-6 h-6 text-caixa-orange" />
                </div>
                <div>
                  <h1 className="text-3xl md:text-4xl font-extrabold text-caixa-orange tracking-tight">
                    LEMBRETES CRM
                  </h1>
                  <p className="text-caixa-orange text-base">
                    {lembretes.length} ativos • {concluidos.length} concluídos
                  </p>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setCurrentLembrete(null);
                  setIsModalOpen(true);
                }}
                className="bg-gradient-to-r from-white to-caixa-light text-caixa-orange rounded-xl py-3 px-6 font-bold shadow-xl hover:shadow-2xl transition-all duration-300 flex items-center gap-3"
              >
                <FaPlus className="w-5 h-5" />
                Novo Lembrete
              </motion.button>
            </div>

            {/* Filtros e Busca */}
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20">
              <div className="flex flex-col md:flex-row gap-4">
                {/* Busca */}
                <div className="flex-1 relative">
                  <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-caixa-orange/60 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Buscar lembretes..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-white/20 border border-white/30 rounded-xl pl-12 pr-4 py-3 text-caixa-orange placeholder-caixa-orange/60 focus:outline-none focus:border-white focus:ring-2 focus:ring-white/20 transition-all"
                  />
                </div>

                {/* Toggle de Status */}
                <div className="flex bg-white/20 rounded-xl p-1 gap-1">
                  <button
                    onClick={() => setShowConcluidos(false)}
                    className={`px-4 py-2 rounded-lg font-semibold transition-all duration-300 flex items-center gap-2 ${
                      !showConcluidos
                        ? "bg-white text-caixa-orange shadow-lg"
                        : "text-caixa-orange/70 hover:text-caixa-orange"
                    }`}
                  >
                    <FaTasks className="w-4 h-4" />
                    Ativos ({lembretes.length})
                  </button>
                  <button
                    onClick={() => setShowConcluidos(true)}
                    className={`px-4 py-2 rounded-lg font-semibold transition-all duration-300 flex items-center gap-2 ${
                      showConcluidos
                        ? "bg-white text-caixa-orange shadow-lg"
                        : "text-caixa-orange/70 hover:text-caixa-orange"
                    }`}
                  >
                    <FaCheckCircle className="w-4 h-4" />
                    Concluídos ({concluidos.length})
                  </button>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Mensagem de erro */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-6 p-4 bg-red-100 border border-red-300 text-red-700 rounded-xl flex items-center gap-3"
              >
                <FaExclamationTriangle className="w-5 h-5" />
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Lista de Lembretes */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 overflow-hidden shadow-2xl"
          >
            {filteredLembretes.length === 0 ? (
              <div className="p-16 text-center">
                <div className="w-20 h-20 bg-gradient-to-r from-caixa-orange to-caixa-orange-light rounded-full mx-auto flex items-center justify-center mb-6">
                  {showConcluidos ? (
                    <FaCheckCircle className="w-10 h-10 text-white" />
                  ) : (
                    <FaBell className="w-10 h-10 text-white" />
                  )}
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">
                  {showConcluidos ? "Nenhum lembrete concluído" : "Nenhum lembrete ativo"}
                </h3>
                <p className="text-white/70">
                  {showConcluidos 
                    ? "Quando você concluir lembretes, eles aparecerão aqui"
                    : "Crie seu primeiro lembrete clicando no botão acima"
                  }
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gradient-to-r from-white/80 to-caixa-light/80 backdrop-blur-xl">
                      <th className="px-6 py-4 text-left">
                        <div className="flex items-center gap-2 text-caixa-orange font-bold text-sm uppercase tracking-wider">
                          <FaFileAlt className="w-4 h-4" />
                          Título
                        </div>
                      </th>
                      <th className="px-6 py-4 text-left">
                        <div className="flex items-center gap-2 text-caixa-orange font-bold text-sm uppercase tracking-wider">
                          <FaFileAlt className="w-4 h-4" />
                          Descrição
                        </div>
                      </th>
                      <th className="px-6 py-4 text-left">
                        <div className="flex items-center gap-2 text-caixa-orange font-bold text-sm uppercase tracking-wider">
                          <FaCalendarAlt className="w-4 h-4" />
                          Data
                        </div>
                      </th>
                      <th className="px-6 py-4 text-left">
                        <div className="flex items-center gap-2 text-caixa-orange font-bold text-sm uppercase tracking-wider">
                          <FaClock className="w-4 h-4" />
                          Status
                        </div>
                      </th>
                      <th className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2 text-caixa-orange font-bold text-sm uppercase tracking-wider">
                          Ações
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLembretes.map((lembrete, index) => (
                      <motion.tr
                        key={lembrete.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={`border-b border-white/10 hover:bg-white/5 transition-all duration-300 ${
                          index % 2 === 0 ? 'bg-white/5' : 'bg-transparent'
                        }`}
                      >
                        <td className="px-6 py-4">
                          <div className="font-bold text-caixa-orange text-lg">
                            {lembrete.titulo}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-caixa-orange/80 max-w-md">
                            {lembrete.descricao.length > 100
                              ? `${lembrete.descricao.substring(0, 100)}...`
                              : lembrete.descricao}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-caixa-orange">
                            <div className="font-semibold">
                              {formatDateShort(lembrete.data)}
                            </div>
                            <div className="text-sm text-caixa-orange/60">
                              {formatDate(lembrete.data).split(',')[0]}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {!showConcluidos && (
                            <div className="flex items-center gap-2">
                              {isOverdue(lembrete.data) ? (
                                <span className="bg-red-500/20 text-red-400 px-3 py-1 rounded-full text-xs font-semibold border border-red-500/30 flex items-center gap-1">
                                  <FaExclamationTriangle className="w-3 h-3" />
                                  Atrasado
                                </span>
                              ) : isToday(lembrete.data) ? (
                                <span className="bg-white/20 text-white px-3 py-1 rounded-full text-xs font-semibold border border-white/30 flex items-center gap-1">
                                  <FaClock className="w-3 h-3" />
                                  Hoje
                                </span>
                              ) : (
                                <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-xs font-semibold border border-green-500/30 flex items-center gap-1">
                                  <FaCalendarAlt className="w-3 h-3" />
                                  Agendado
                                </span>
                              )}
                            </div>
                          )}
                          {showConcluidos && (
                            <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-xs font-semibold border border-green-500/30 flex items-center gap-1">
                              <FaCheckCircle className="w-3 h-3" />
                              Concluído
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-2">
                            {!showConcluidos && (
                              <>
                                <motion.button
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                  onClick={() => handleEdit(lembrete)}
                                  className="w-8 h-8 bg-blue-500/20 hover:bg-blue-500/30 rounded-lg flex items-center justify-center transition-colors"
                                  title="Editar"
                                >
                                  <FaEdit className="w-4 h-4 text-blue-400" />
                                </motion.button>
                                <motion.button
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                  onClick={() => handleDelete(lembrete.id)}
                                  className="w-8 h-8 bg-red-500/20 hover:bg-red-500/30 rounded-lg flex items-center justify-center transition-colors"
                                  title="Excluir"
                                >
                                  <FaTrashAlt className="w-4 h-4 text-red-400" />
                                </motion.button>
                                <motion.button
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                  onClick={() => handleConcluir(lembrete.id)}
                                  className="w-8 h-8 bg-green-500/20 hover:bg-green-500/30 rounded-lg flex items-center justify-center transition-colors"
                                  title="Concluir"
                                >
                                  <FaCheck className="w-4 h-4 text-green-400" />
                                </motion.button>
                              </>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        </div>

        <AddLembreteModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setCurrentLembrete(null);
          }}
          onAddLembrete={handleAddOrUpdateLembrete}
          currentLembrete={currentLembrete}
        />
      </div>
    </MainLayout>
  );
};

export default Lembretes;
