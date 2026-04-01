import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home,
  Bed,
  Bath,
  DollarSign,
  Download,
  Trash2,
  CheckCircle,
  XCircle,
  Search,
  Filter,
  Eye,
  Building2,
  Calendar,
  AlertTriangle,
  Loader2,
  FileText,
} from "lucide-react";
import ContratoTab from "./ContratoTab";

const API_URL = (process.env.REACT_APP_API_URL || "http://localhost:5000/api/").replace(/\/+$/, "");

const CARD = "rgba(255,255,255,0.06)";
const BORDER = "rgba(255,255,255,0.10)";
const INPUT_BG = "rgba(255,255,255,0.05)";
const ACCENT_GRADIENT = "linear-gradient(135deg, #F97316, #EA580C)";

const AlugueisPage = () => {
  const [alugueis, setAlugueis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState(""); // '', 'disponivel', 'alugado'
  const [actionLoading, setActionLoading] = useState({});
  const [activeTab, setActiveTab] = useState("imoveis");

  useEffect(() => {
    // Evita que o Fast Refresh preserve a aba "Contrato" e esconda a lista.
    setActiveTab("imoveis");
  }, []);

  useEffect(() => {
    const fetchAlugueis = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_URL}/alugueis`, {
          cache: "no-store",
        });
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
      const response = await fetch(`${API_URL}/alugueis/${aluguelId}/download`, {
        cache: "no-store",
      });
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
      <div className="min-h-screen bg-caixa-gradient flex items-center justify-center">
        <div className="text-center">
          <div
            className="w-16 h-16 rounded-full mx-auto flex items-center justify-center mb-4 animate-pulse"
            style={{ background: ACCENT_GRADIENT }}
          >
            <Home className="w-8 h-8 text-white" />
          </div>
          <p className="text-white/80 text-lg font-medium">Carregando imóveis para aluguel...</p>
          <Loader2 className="w-6 h-6 text-orange-400 animate-spin mx-auto mt-3" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-caixa-gradient relative">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-orange-500/10 rounded-full blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] bg-orange-600/8 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-orange-500/5 rounded-full blur-[100px]" />
      </div>

      {/* Main Container */}
      <div className="relative z-10 container mx-auto px-4 py-6 md:px-6 lg:px-8">
        {/* Sticky Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="sticky top-0 z-20 mb-8 -mx-4 px-4 md:-mx-6 md:px-6 lg:-mx-8 lg:px-8 pt-2 pb-4"
          style={{
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
          }}
        >
          <div className="flex items-center gap-4 mb-6">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20"
              style={{ background: ACCENT_GRADIENT }}
            >
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
                ALUGUÉIS CAIXA
              </h1>
              <p className="text-white/60 text-base">
                <span className="text-green-400 font-semibold">{alugueisDisponiveis}</span> disponíveis
                {" "}&bull;{" "}
                <span className="text-red-400 font-semibold">{alugueisOcupados}</span> ocupados
                {" "}&bull;{" "}
                <span className="text-white/80 font-semibold">{alugueis.length}</span> total
              </p>
            </div>
          </div>

          <div className="mb-5 flex flex-wrap gap-2">
            <button
              onClick={() => setActiveTab("imoveis")}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all border ${
                activeTab === "imoveis"
                  ? "text-white bg-orange-500/20 border-orange-400/40"
                  : "text-white/70 bg-white/5 border-white/10 hover:bg-white/10"
              }`}
            >
              <span className="inline-flex items-center gap-2">
                <Home className="w-4 h-4" />
                Imóveis
              </span>
            </button>
            <button
              onClick={() => setActiveTab("contratos")}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all border ${
                activeTab === "contratos"
                  ? "text-white bg-orange-500/20 border-orange-400/40"
                  : "text-white/70 bg-white/5 border-white/10 hover:bg-white/10"
              }`}
            >
              <span className="inline-flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Contrato
              </span>
            </button>
          </div>

          {/* Search & Filters Bar */}
          {activeTab === "imoveis" && (
            <div
              className="rounded-2xl p-5 backdrop-blur-xl"
              style={{
                background: CARD,
                border: `1px solid ${BORDER}`,
              }}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Search */}
                <div className="relative md:col-span-2">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Buscar imóveis para aluguel..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full rounded-xl pl-12 pr-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-orange-500/40 transition-all"
                    style={{
                      background: INPUT_BG,
                      border: `1px solid ${BORDER}`,
                    }}
                  />
                </div>

                {/* Status Filter */}
                <div className="relative">
                  <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 w-4 h-4 z-10" />
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full rounded-xl pl-12 pr-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-orange-500/40 transition-all appearance-none [&>option]:bg-white [&>option]:text-gray-800"
                    style={{
                      background: INPUT_BG,
                      border: `1px solid ${BORDER}`,
                    }}
                  >
                    <option value="">Todos os status</option>
                    <option value="disponivel">Disponível</option>
                    <option value="alugado">Alugado</option>
                  </select>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-3 text-white/70">
                  <Eye className="w-4 h-4 text-orange-400" />
                  <span className="text-sm font-semibold">
                    Exibindo: <span className="text-white">{filteredAlugueis.length}</span>
                  </span>
                </div>
              </div>
            </div>
          )}
        </motion.div>

        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6 p-4 rounded-xl flex items-center gap-3"
              style={{
                background: "rgba(239,68,68,0.12)",
                border: "1px solid rgba(239,68,68,0.25)",
              }}
            >
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <span className="text-red-300 text-sm">{error}</span>
              <button
                onClick={() => setError(null)}
                className="ml-auto text-red-400 hover:text-red-300 transition-colors"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {activeTab === "contratos" && <ContratoTab />}

        {/* Property Cards Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mb-8 ${activeTab === "imoveis" ? "" : "hidden"}`}
        >
          {filteredAlugueis.length === 0 ? (
            <div
              className="rounded-2xl p-16 text-center backdrop-blur-xl"
              style={{
                background: CARD,
                border: `1px solid ${BORDER}`,
              }}
            >
              <div
                className="w-20 h-20 rounded-full mx-auto flex items-center justify-center mb-6 shadow-lg shadow-orange-500/20"
                style={{ background: ACCENT_GRADIENT }}
              >
                <Home className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">
                {searchTerm || filterStatus ? "Nenhum imóvel encontrado" : "Nenhum imóvel para aluguel"}
              </h3>
              <p className="text-white/50">
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
                  transition={{ delay: index * 0.05 }}
                  className="group relative flex flex-col overflow-hidden rounded-2xl backdrop-blur-xl hover:scale-[1.02] transition-all duration-300"
                  style={{
                    background: CARD,
                    border: `1px solid ${BORDER}`,
                    boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
                  }}
                >
                  {/* Status Badge */}
                  <div className="absolute top-3 left-3 z-10">
                    {aluguel.alugado ? (
                      <span className="bg-red-500/90 backdrop-blur-sm text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-lg">
                        <XCircle className="w-3 h-3" />
                        ALUGADO
                      </span>
                    ) : (
                      <span className="bg-green-500/90 backdrop-blur-sm text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-lg">
                        <CheckCircle className="w-3 h-3" />
                        DISPONÍVEL
                      </span>
                    )}
                  </div>

                  {/* Image */}
                  <div className="relative overflow-hidden">
                    {aluguel.foto_capa ? (
                      <img
                        src={`${API_URL}/uploads/${aluguel.foto_capa}`}
                        alt={aluguel.nome_imovel}
                        className={`w-full h-48 object-cover group-hover:scale-105 transition-transform duration-500 ${
                          aluguel.alugado ? 'brightness-75 grayscale-[20%]' : ''
                        }`}
                        onError={(e) => {
                          e.target.src = '/placeholder-image.jpg';
                        }}
                      />
                    ) : (
                      <div
                        className="w-full h-48 flex items-center justify-center"
                        style={{
                          background: "linear-gradient(135deg, rgba(249,115,22,0.15), rgba(234,88,12,0.08))",
                        }}
                      >
                        <Home className="w-12 h-12 text-white/20" />
                      </div>
                    )}
                    {/* Image overlay gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                  </div>

                  <div className="flex-1 flex flex-col p-5">
                    {/* Title */}
                    <h2 className="text-lg font-bold text-white mb-2 line-clamp-2">
                      {aluguel.nome_imovel || 'Nome não informado'}
                    </h2>

                    {/* Description */}
                    <p className="text-white/50 text-sm mb-4 line-clamp-3">
                      {aluguel.descricao || 'Descrição não disponível'}
                    </p>

                    {/* Features */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      <div
                        className="text-white/90 px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5"
                        style={{
                          background: "rgba(249,115,22,0.15)",
                          border: "1px solid rgba(249,115,22,0.20)",
                        }}
                      >
                        <Bed className="w-3 h-3 text-orange-400" />
                        {aluguel.quartos || 0} Quartos
                      </div>
                      <div
                        className="text-white/90 px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5"
                        style={{
                          background: "rgba(249,115,22,0.15)",
                          border: "1px solid rgba(249,115,22,0.20)",
                        }}
                      >
                        <Bath className="w-3 h-3 text-orange-400" />
                        {aluguel.banheiro || 0} Banheiros
                      </div>
                      {aluguel.dia_vencimento && (
                        <div
                          className="text-white/90 px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5"
                          style={{
                            background: "rgba(249,115,22,0.15)",
                            border: "1px solid rgba(249,115,22,0.20)",
                          }}
                        >
                          <Calendar className="w-3 h-3 text-orange-400" />
                          Vence dia {aluguel.dia_vencimento}
                        </div>
                      )}
                    </div>

                    {/* Price */}
                    <div
                      className="rounded-xl p-3 mb-4"
                      style={{
                        background: INPUT_BG,
                        border: `1px solid ${BORDER}`,
                      }}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <DollarSign className="w-4 h-4 text-orange-400" />
                        <span
                          className="font-bold text-lg bg-clip-text text-transparent"
                          style={{ backgroundImage: ACCENT_GRADIENT }}
                        >
                          {Number(aluguel.valor_aluguel || 0).toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          })}
                        </span>
                        <span className="text-white/40 text-sm">/mês</span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-2 mt-auto">
                      {/* First row */}
                      <div className="flex gap-2">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleDownloadAll(aluguel.id)}
                          disabled={actionLoading[`download_${aluguel.id}`]}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg transition-all disabled:opacity-50 text-blue-400 hover:text-blue-300"
                          style={{
                            background: "rgba(59,130,246,0.10)",
                            border: "1px solid rgba(59,130,246,0.20)",
                          }}
                          title="Baixar todas as imagens"
                        >
                          {actionLoading[`download_${aluguel.id}`] ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Download className="w-4 h-4" />
                          )}
                          <span className="text-xs font-medium">Download</span>
                        </motion.button>

                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleDelete(aluguel.id)}
                          disabled={actionLoading[`delete_${aluguel.id}`]}
                          className="flex items-center justify-center gap-1 px-3 py-2 rounded-lg transition-all disabled:opacity-50 text-red-400 hover:text-red-300"
                          style={{
                            background: "rgba(239,68,68,0.10)",
                            border: "1px solid rgba(239,68,68,0.20)",
                          }}
                          title="Deletar imóvel"
                        >
                          {actionLoading[`delete_${aluguel.id}`] ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </motion.button>
                      </div>

                      {/* Second row - Status toggle */}
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleToggleRentStatus(aluguel.id, aluguel.alugado)}
                        disabled={actionLoading[`status_${aluguel.id}`]}
                        className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold transition-all disabled:opacity-50 ${
                          aluguel.alugado
                            ? "text-green-400 hover:text-green-300"
                            : "text-red-400 hover:text-red-300"
                        }`}
                        style={{
                          background: aluguel.alugado
                            ? "rgba(34,197,94,0.10)"
                            : "rgba(239,68,68,0.10)",
                          border: `1px solid ${
                            aluguel.alugado
                              ? "rgba(34,197,94,0.20)"
                              : "rgba(239,68,68,0.20)"
                          }`,
                        }}
                        title={aluguel.alugado ? "Marcar como disponível" : "Marcar como alugado"}
                      >
                        {actionLoading[`status_${aluguel.id}`] ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span className="text-sm">Atualizando...</span>
                          </>
                        ) : (
                          <>
                            {aluguel.alugado ? (
                              <CheckCircle className="w-4 h-4" />
                            ) : (
                              <XCircle className="w-4 h-4" />
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
