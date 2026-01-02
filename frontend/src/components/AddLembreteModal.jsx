import React, { useState, useEffect } from "react";
import { format, toZonedTime } from "date-fns-tz";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaTimes,
  FaFileAlt,
  FaCalendarAlt,
  FaClock,
  FaSave,
  FaEdit,
  FaPlus,
  FaBell
} from "react-icons/fa";

const AddLembreteModal = ({
  isOpen,
  onClose,
  onAddLembrete,
  currentLembrete,
}) => {
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [dataHora, setDataHora] = useState("");
  const [loading, setLoading] = useState(false);
  const API_URL = process.env.REACT_APP_API_URL;

  useEffect(() => {
    if (currentLembrete) {
      setTitulo(currentLembrete.titulo);
      setDescricao(currentLembrete.descricao);
      const localDate = toZonedTime(currentLembrete.data, "America/Sao_Paulo");
      setDataHora(format(localDate, "yyyy-MM-dd'T'HH:mm"));
    } else {
      setTitulo("");
      setDescricao("");
      setDataHora("");
    }
  }, [currentLembrete]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const dataHoraUTC = toZonedTime(dataHora, "America/Sao_Paulo");
      const lembreteData = {
        titulo,
        descricao,
        data: dataHoraUTC.toISOString(),
      };

      if (currentLembrete) {
        const response = await fetch(
          `${API_URL}/lembretes/${currentLembrete.id}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(lembreteData),
          }
        );
        const updatedLembrete = await response.json();
        onAddLembrete(updatedLembrete);
      } else {
        const response = await fetch(`${API_URL}/lembretes`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(lembreteData),
        });
        const newLembrete = await response.json();
        onAddLembrete(newLembrete);
      }
      onClose();
    } catch (error) {
      console.error("Erro ao salvar lembrete:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-lg mx-auto"
          >
            <div className="bg-caixa-primary border border-caixa-orange/30 rounded-3xl shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-caixa-orange to-caixa-orange-light px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                      {currentLembrete ? (
                        <FaEdit className="w-5 h-5 text-white" />
                      ) : (
                        <FaPlus className="w-5 h-5 text-white" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">
                        {currentLembrete ? "Editar Lembrete" : "Novo Lembrete"}
                      </h3>
                      <p className="text-white/80 text-sm">
                        {currentLembrete ? "Atualize as informações" : "Preencha os dados do lembrete"}
                      </p>
                    </div>
                  </div>
                  
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    type="button"
                    className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center transition-colors"
                    onClick={onClose}
                  >
                    <FaTimes className="w-4 h-4 text-white" />
                  </motion.button>
                </div>
              </div>

              {/* Body */}
              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {/* Título */}
                <div>
                  <label
                    htmlFor="titulo"
                    className="flex items-center gap-2 text-sm font-medium text-white mb-3"
                  >
                    <FaBell className="w-4 h-4 text-caixa-orange" />
                    Título do Lembrete *
                  </label>
                  <input
                    type="text"
                    id="titulo"
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value.toUpperCase())}
                    className="w-full px-4 py-3 bg-white/10 border-2 border-white/20 rounded-xl text-white placeholder-white/60 focus:outline-none focus:border-caixa-orange focus:ring-2 focus:ring-caixa-orange/20 transition-all backdrop-blur-xl"
                    placeholder="DIGITE O TÍTULO DO LEMBRETE"
                    required
                  />
                </div>

                {/* Descrição */}
                <div>
                  <label
                    htmlFor="descricao"
                    className="flex items-center gap-2 text-sm font-medium text-white mb-3"
                  >
                    <FaFileAlt className="w-4 h-4 text-caixa-orange" />
                    Descrição *
                  </label>
                  <textarea
                    id="descricao"
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value.toUpperCase())}
                    rows={4}
                    className="w-full px-4 py-3 bg-white/10 border-2 border-white/20 rounded-xl text-white placeholder-white/60 focus:outline-none focus:border-caixa-orange focus:ring-2 focus:ring-caixa-orange/20 transition-all backdrop-blur-xl resize-none"
                    placeholder="DESCREVA OS DETALHES DO LEMBRETE..."
                    required
                  />
                </div>

                {/* Data e Hora */}
                <div>
                  <label
                    htmlFor="dataHora"
                    className="flex items-center gap-2 text-sm font-medium text-white mb-3"
                  >
                    <FaCalendarAlt className="w-4 h-4 text-caixa-orange" />
                    Data e Hora *
                  </label>
                  <div className="relative">
                    <input
                      type="datetime-local"
                      id="dataHora"
                      value={dataHora}
                      onChange={(e) => setDataHora(e.target.value)}
                      className="w-full px-4 py-3 bg-white/10 border-2 border-white/20 rounded-xl text-white focus:outline-none focus:border-caixa-orange focus:ring-2 focus:ring-caixa-orange/20 transition-all backdrop-blur-xl"
                      required
                    />
                    <FaClock className="absolute right-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/60 pointer-events-none" />
                  </div>
                  <small className="text-white/70 text-xs mt-1 block">
                    Selecione quando você deseja ser lembrado
                  </small>
                </div>

                {/* Botões */}
                <div className="flex gap-3 pt-4 border-t border-white/20">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={onClose}
                    className="flex-1 px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl border border-white/20 transition-all duration-200"
                  >
                    Cancelar
                  </motion.button>
                  
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={loading}
                    className={`flex-1 px-6 py-3 bg-gradient-to-r from-caixa-orange to-caixa-orange-light text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2 ${
                      loading ? "opacity-60 cursor-not-allowed" : ""
                    }`}
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <FaSave className="w-4 h-4" />
                        {currentLembrete ? "Atualizar" : "Adicionar"}
                      </>
                    )}
                  </motion.button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default AddLembreteModal;
