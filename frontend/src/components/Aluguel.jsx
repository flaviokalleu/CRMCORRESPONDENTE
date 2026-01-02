import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaHome,
  FaBed,
  FaBath,
  FaDollarSign,
  FaDownload,
  FaEdit,
  FaTrashAlt,
  FaCheckCircle,
  FaTimesCircle,
  FaSearch,
  FaFilter,
  FaEye,
  FaBuilding,
  FaMapMarkerAlt,
  FaCalendarAlt,
  FaExclamationTriangle,
  FaSpinner
} from "react-icons/fa";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api/";

const AlugueisPage = () => {
  const [alugueis, setAlugueis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState(""); // '', 'disponivel', 'alugado'
  const [actionLoading, setActionLoading] = useState({});

  useEffect(() => {
    const fetchAlugueis = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_URL}/alugueis`);
        if (!response.ok) {
          throw new Error("Erro ao buscar aluguéis");
        }
        const data = await response.json();
        setAlugueis(data);
        setError(null);
      } catch (err) {
        setError(err.message);
        setAlugueis([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAlugueis();
  }, []);

  const handleDownloadAll = async (aluguelId) => {
    setActionLoading(prev => ({ ...prev, [`download_${aluguelId}`]: true }));
    try {
      const response = await fetch(`${API_URL}/alugueis/${aluguelId}/download`);
      if (!response.ok) {
        throw new Error("Erro ao baixar o arquivo ZIP");
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `fotos_imovel_${aluguelId}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Erro ao baixar o arquivo ZIP:", error);
      setError("Erro ao baixar as imagens. Tente novamente.");
    } finally {
      setActionLoading(prev => ({ ...prev, [`download_${aluguelId}`]: false }));
    }
  };

  const handleToggleRentStatus = async (aluguelId, currentStatus) => {
    setActionLoading(prev => ({ ...prev, [`status_${aluguelId}`]: true }));
    try {
      const response = await fetch(`${API_URL}/alugueis/${aluguelId}/alugado`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ alugado: !currentStatus }),
      });
      if (!response.ok) {
        throw new Error("Erro ao atualizar o status do imóvel");
      }
      setAlugueis((prevAlugueis) =>
        prevAlugueis.map((aluguel) =>
          aluguel.id === aluguelId
            ? { ...aluguel, alugado: !currentStatus }
            : aluguel
        )
      );
    } catch (error) {
      console.error("Erro ao atualizar o status do imóvel:", error);
      setError("Erro ao atualizar status. Tente novamente.");
    } finally {
      setActionLoading(prev => ({ ...prev, [`status_${aluguelId}`]: false }));
    }
  };

  const handleDelete = async (aluguelId) => {
    const aluguel = alugueis.find(a => a.id === aluguelId);
    const confirmed = window.confirm(
      `Tem certeza que deseja deletar o imóvel "${aluguel?.nome_imovel}"?\n\nEsta ação não pode ser desfeita.`
    );
    
    if (confirmed) {
      setActionLoading(prev => ({ ...prev, [`delete_${aluguelId}`]: true }));
      try {
        const response = await fetch(`${API_URL}/alugueis/${aluguelId}`, {
          method: "DELETE",
        });
        if (!response.ok) {
          throw new Error("Erro ao deletar o imóvel");
        }
        setAlugueis((prevAlugueis) =>
          prevAlugueis.filter((aluguel) => aluguel.id !== aluguelId)
        );
      } catch (error) {
        console.error("Erro ao deletar o imóvel:", error);
        setError("Erro ao deletar imóvel. Tente novamente.");
      } finally {
        setActionLoading(prev => ({ ...prev, [`delete_${aluguelId}`]: false }));
      }
    }
  };

  // Filtrar aluguéis
  const filteredAlugueis = alugueis.filter((aluguel) => {
    const matchesSearch = 
      (aluguel.nome_imovel || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (aluguel.descricao || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = 
      filterStatus === '' || 
      (filterStatus === 'disponivel' && !aluguel.alugado) ||
      (filterStatus === 'alugado' && aluguel.alugado);
    
    return matchesSearch && matchesStatus;
  });

  const alugueisDisponiveis = alugueis.filter(a => !a.alugado).length;
  const alugueisOcupados = alugueis.filter(a => a.alugado).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-caixa-primary flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-caixa-orange to-caixa-orange-light rounded-full mx-auto flex items-center justify-center mb-4 animate-pulse">
            <FaHome className="w-8 h-8 text-white" />
          </div>
          <p className="text-white text-lg">Carregando imóveis para aluguel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-caixa-primary relative">
      {/* Efeitos de Background */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-caixa-orange/30 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-caixa-orange-light/30 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-caixa-orange/20 rounded-full blur-3xl"></div>
      </div>

      {/* Container principal */}
      <div className="relative z-10 container mx-auto px-4 py-6 md:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-gradient-to-r from-caixa-orange to-caixa-orange-light rounded-xl flex items-center justify-center">
              <FaBuilding className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
                ALUGUÉIS CAIXA
              </h1>
              <p className="text-white text-base">
                {alugueisDisponiveis} disponíveis • {alugueisOcupados} ocupados • {alugueis.length} total
              </p>
            </div>
          </div>

          {/* Filtros e Busca */}
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Busca */}
              <div className="relative md:col-span-2">
                <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/60 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Buscar imóveis para aluguel..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white/20 border border-white/30 rounded-xl pl-12 pr-4 py-3 text-white placeholder-white/60 focus:outline-none focus:border-caixa-orange focus:ring-2 focus:ring-caixa-orange/20 transition-all"
                />
              </div>

              {/* Filtro por Status */}
              <div className="relative">
                <FaFilter className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/60 w-4 h-4" />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full bg-white/20 border border-white/30 rounded-xl pl-12 pr-4 py-3 text-white focus:outline-none focus:border-caixa-orange focus:ring-2 focus:ring-caixa-orange/20 transition-all appearance-none"
                >
                  <option value="" className="bg-caixa-primary text-white">Todos os status</option>
                  <option value="disponivel" className="bg-caixa-primary text-white">Disponível</option>
                  <option value="alugado" className="bg-caixa-primary text-white">Alugado</option>
                </select>
              </div>

              {/* Estatísticas */}
              <div className="flex items-center gap-4 text-white">
                <div className="flex items-center gap-2">
                  <FaEye className="w-4 h-4 text-caixa-orange" />
                  <span className="text-sm font-semibold">Exibindo: {filteredAlugueis.length}</span>
                </div>
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
              className="mb-6 p-4 bg-red-500/20 border border-red-500/30 text-red-400 rounded-xl flex items-center gap-3"
            >
              <FaExclamationTriangle className="w-5 h-5" />
              {error}
              <button 
                onClick={() => setError(null)}
                className="ml-auto text-red-400 hover:text-red-300"
              >
                ×
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Grid de Aluguéis */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          {filteredAlugueis.length === 0 ? (
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-16 text-center">
              <div className="w-20 h-20 bg-gradient-to-r from-caixa-orange to-caixa-orange-light rounded-full mx-auto flex items-center justify-center mb-6">
                <FaHome className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">
                {searchTerm || filterStatus ? "Nenhum imóvel encontrado" : "Nenhum imóvel para aluguel"}
              </h3>
              <p className="text-white/70">
                {searchTerm || filterStatus 
                  ? "Tente ajustar os filtros de busca"
                  : "Cadastre o primeiro imóvel para aluguel"
                }
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredAlugueis.map((aluguel, index) => (
                <motion.div
                  key={aluguel.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 flex flex-col overflow-hidden group relative"
                >
                  {/* Status Badge */}
                  <div className="absolute top-3 left-3 z-10">
                    {aluguel.alugado ? (
                      <span className="bg-red-500/90 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                        <FaTimesCircle className="w-3 h-3" />
                        ALUGADO
                      </span>
                    ) : (
                      <span className="bg-green-500/90 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                        <FaCheckCircle className="w-3 h-3" />
                        DISPONÍVEL
                      </span>
                    )}
                  </div>

                  {/* Imagem */}
                  <div className="relative">
                    {aluguel.foto_capa ? (
                      <img
                        src={`${API_URL}/uploads/alugueis/capa/${aluguel.foto_capa}`}
                        alt={aluguel.nome_imovel}
                        className={`w-full h-48 object-cover group-hover:brightness-110 transition-all duration-300 ${
                          aluguel.alugado ? 'brightness-75' : ''
                        }`}
                        onError={(e) => {
                          e.target.src = '/placeholder-image.jpg';
                        }}
                      />
                    ) : (
                      <div className="w-full h-48 bg-gradient-to-br from-caixa-orange/20 to-caixa-orange-light/20 flex items-center justify-center">
                        <FaHome className="w-12 h-12 text-white/40" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 flex flex-col p-5">
                    {/* Título */}
                    <h2 className="text-lg font-bold text-white mb-2 line-clamp-2">
                      {aluguel.nome_imovel || 'Nome não informado'}
                    </h2>

                    {/* Descrição */}
                    <p className="text-white/70 text-sm mb-4 line-clamp-3">
                      {aluguel.descricao || 'Descrição não disponível'}
                    </p>

                    {/* Características */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      <div className="bg-caixa-orange/20 text-white px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1">
                        <FaBed className="w-3 h-3" />
                        {aluguel.quartos || 0} Quartos
                      </div>
                      <div className="bg-caixa-orange/20 text-white px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1">
                        <FaBath className="w-3 h-3" />
                        {aluguel.banheiro || 0} Banheiros
                      </div>
                      {aluguel.dia_vencimento && (
                        <div className="bg-caixa-orange/20 text-white px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1">
                          <FaCalendarAlt className="w-3 h-3" />
                          Vence dia {aluguel.dia_vencimento}
                        </div>
                      )}
                    </div>

                    {/* Valor */}
                    <div className="bg-white/5 rounded-xl p-3 mb-4">
                      <div className="flex items-center justify-center gap-2">
                        <FaDollarSign className="w-4 h-4 text-caixa-orange" />
                        <span className="text-caixa-orange font-bold text-lg">
                          {Number(aluguel.valor_aluguel || 0).toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          })}
                        </span>
                        <span className="text-white/60 text-sm">/mês</span>
                      </div>
                    </div>

                    {/* Botões de Ação */}
                    <div className="flex flex-col gap-2 mt-auto">
                      {/* Primeira linha de botões */}
                      <div className="flex gap-2">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleDownloadAll(aluguel.id)}
                          disabled={actionLoading[`download_${aluguel.id}`]}
                          className="flex-1 flex items-center justify-center gap-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 px-3 py-2 rounded-lg transition-all border border-blue-500/20 disabled:opacity-50"
                          title="Baixar todas as imagens"
                        >
                          {actionLoading[`download_${aluguel.id}`] ? (
                            <FaSpinner className="w-4 h-4 animate-spin" />
                          ) : (
                            <FaDownload className="w-4 h-4" />
                          )}
                          <span className="text-xs">Download</span>
                        </motion.button>

                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleDelete(aluguel.id)}
                          disabled={actionLoading[`delete_${aluguel.id}`]}
                          className="flex items-center justify-center gap-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 px-3 py-2 rounded-lg transition-all border border-red-500/20 disabled:opacity-50"
                          title="Deletar imóvel"
                        >
                          {actionLoading[`delete_${aluguel.id}`] ? (
                            <FaSpinner className="w-4 h-4 animate-spin" />
                          ) : (
                            <FaTrashAlt className="w-4 h-4" />
                          )}
                        </motion.button>
                      </div>

                      {/* Segunda linha - Botão de status */}
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleToggleRentStatus(aluguel.id, aluguel.alugado)}
                        disabled={actionLoading[`status_${aluguel.id}`]}
                        className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold transition-all border disabled:opacity-50 ${
                          aluguel.alugado
                            ? "bg-green-500/20 hover:bg-green-500/30 text-green-400 border-green-500/20"
                            : "bg-red-500/20 hover:bg-red-500/30 text-red-400 border-red-500/20"
                        }`}
                        title={aluguel.alugado ? "Marcar como disponível" : "Marcar como alugado"}
                      >
                        {actionLoading[`status_${aluguel.id}`] ? (
                          <>
                            <FaSpinner className="w-4 h-4 animate-spin" />
                            <span className="text-sm">Atualizando...</span>
                          </>
                        ) : (
                          <>
                            {aluguel.alugado ? (
                              <FaCheckCircle className="w-4 h-4" />
                            ) : (
                              <FaTimesCircle className="w-4 h-4" />
                            )}
                            <span className="text-sm">
                              {aluguel.alugado ? "Marcar Disponível" : "Marcar Alugado"}
                            </span>
                          </>
                        )}
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default AlugueisPage;
