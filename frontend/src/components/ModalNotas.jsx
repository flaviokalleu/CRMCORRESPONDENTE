import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaTimes,
  FaStickyNote,
  FaUser,
  FaCalendarAlt,
  FaCheck,
  FaClock,
  FaFilter,
} from "react-icons/fa";

const ModalNotas = ({ notas = [], isOpen, onClose, clienteNome = "Cliente" }) => {
  const [sortBy, setSortBy] = useState("newest");

  // ✅ ORDENAR NOTAS
  const sortedNotas = [...notas].sort((a, b) => {
    switch (sortBy) {
      case "oldest":
        return new Date(a.data_criacao) - new Date(b.data_criacao);
      case "completed":
        return (b.concluida ? 1 : 0) - (a.concluida ? 1 : 0);
      case "pending":
        return (a.concluida ? 1 : 0) - (b.concluida ? 1 : 0);
      case "newest":
      default:
        return new Date(b.data_criacao) - new Date(a.data_criacao);
    }
  });

  // ✅ FUNÇÃO PARA EXTRAIR NOME DO USUÁRIO
  const getUserName = (nota) => {
    // Prioridade: nome completo > username > email > ID
    if (nota.User) {
      const firstName = nota.User.first_name || "";
      const lastName = nota.User.last_name || "";
      const fullName = `${firstName} ${lastName}`.trim();

      if (fullName) return fullName;
      if (nota.User.username) return nota.User.username;
      if (nota.User.email) return nota.User.email;
    }

    // Fallbacks alternativos
    if (nota.criador_nome) return nota.criador_nome;
    if (nota.criado_por_nome) return nota.criado_por_nome;
    if (nota.criado_por_id) return `Usuário #${nota.criado_por_id}`;

    return "Sistema";
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[85vh] overflow-hidden"
        >
          {/* ✅ HEADER SLIM */}
          <div className="bg-gray-50 border-b p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-caixa-orange/10 rounded-lg flex items-center justify-center">
                  <FaStickyNote className="w-4 h-4 text-caixa-orange" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">
                    Notas - {clienteNome}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {sortedNotas.length} nota
                    {sortedNotas.length !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <FaTimes className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            {/* ✅ FILTRO COMPACT */}
            <div className="flex items-center gap-3 mt-3 pt-3 border-t">
              <FaFilter className="w-4 h-4 text-gray-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="text-sm bg-white border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-caixa-orange/20 focus:border-caixa-orange transition-all"
              >
                <option value="newest">Mais recentes</option>
                <option value="oldest">Mais antigas</option>
                <option value="completed">Concluídas</option>
                <option value="pending">Pendentes</option>
              </select>
            </div>
          </div>

          {/* ✅ LISTA SLIM */}
          <div className="overflow-y-auto max-h-[60vh]">
            {sortedNotas.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <FaStickyNote className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Nenhuma nota encontrada</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {sortedNotas.map((nota, index) => (
                  <motion.div
                    key={nota.id || index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.02 }}
                    className="p-4 hover:bg-gray-50 transition-colors"
                  >
                    {/* ✅ STATUS + CONTEÚDO */}
                    <div className="flex gap-3">
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                          nota.concluida
                            ? "bg-green-100 text-green-600"
                            : "bg-orange-100 text-orange-600"
                        }`}
                      >
                        {nota.concluida ? (
                          <FaCheck className="w-3 h-3" />
                        ) : (
                          <FaClock className="w-3 h-3" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-gray-800 leading-relaxed mb-2">
                          {nota.texto || "Sem conteúdo"}
                        </p>

                        {/* ✅ METADADOS INLINE */}
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <div className="flex items-center gap-1">
                            <FaUser className="w-3 h-3" />
                            <span>{getUserName(nota)}</span>
                          </div>

                          <div className="flex items-center gap-1">
                            <FaCalendarAlt className="w-3 h-3" />
                            <span>
                              {nota.data_criacao
                                ? (() => {
                                    const d = nota.data_criacao.split('-');
                                    return d.length === 3 ? `${d[2]}/${d[1]}/${d[0]}` : nota.data_criacao;
                                  })()
                                : "Data desconhecida"}
                            </span>
                          </div>

                          <div
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              nota.concluida
                                ? "bg-green-100 text-green-700"
                                : "bg-orange-100 text-orange-700"
                            }`}
                          >
                            {nota.concluida ? "Concluída" : "Pendente"}
                          </div>
                        </div>

                        {/* ✅ DATA DE CONCLUSÃO (SE APLICÁVEL) */}
                        {nota.concluida && nota.data_conclusao && (
                          <div className="mt-2 text-xs text-green-600">
                            ✓ Concluída em {(() => {
                              const d = nota.data_conclusao.split('-');
                              return d.length === 3 ? `${d[2]}/${d[1]}/${d[0]}` : nota.data_conclusao;
                            })()}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* ✅ FOOTER SLIM */}
          <div className="bg-gray-50 border-t p-4">
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-500">
                Total: {sortedNotas.length} nota
                {sortedNotas.length !== 1 ? "s" : ""}
              </div>

              <button
                onClick={onClose}
                className="bg-caixa-orange hover:bg-caixa-orange-dark text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ModalNotas;
