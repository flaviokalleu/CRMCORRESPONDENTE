// frontend/src/components/ListaCorrespondentes.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, User, Phone, Mail, CreditCard,
  Edit, Trash2, Eye, UserCheck, Search,
  Loader2, MapPin, Users, CheckCircle,
  AlertTriangle, Grid3X3, List, Filter,
  Building2, Camera
} from "lucide-react";

const apiUrl = process.env.REACT_APP_API_URL;

// Design tokens
const CARD = 'rgba(255,255,255,0.06)';
const BORDER = 'rgba(255,255,255,0.10)';
const INPUT_BG = 'rgba(255,255,255,0.05)';
const ACCENT_GRADIENT = 'linear-gradient(135deg, #F97316, #EA580C)';

const glassCard = {
  background: CARD,
  border: `1px solid ${BORDER}`,
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
};

const glassInput = {
  background: INPUT_BG,
  border: `1px solid ${BORDER}`,
};

const ListaCorrespondentes = () => {
  const [correspondentes, setCorrespondentes] = useState([]);
  const [filteredCorrespondentes, setFilteredCorrespondentes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCorrespondente, setSelectedCorrespondente] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' ou 'list'

  useEffect(() => {
    fetchCorrespondentes();
  }, []);

  useEffect(() => {
    filterCorrespondentes();
  }, [correspondentes, searchTerm]);

  const fetchCorrespondentes = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${apiUrl}/correspondente/lista`);
      setCorrespondentes(response.data);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const filterCorrespondentes = () => {
    if (!searchTerm) {
      setFilteredCorrespondentes(correspondentes);
      return;
    }

    const filtered = correspondentes.filter(correspondente =>
      correspondente.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      correspondente.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      correspondente.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      correspondente.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      correspondente.telefone?.includes(searchTerm)
    );
    setFilteredCorrespondentes(filtered);
  };

  const handleView = (correspondente) => {
    setSelectedCorrespondente(correspondente);
    setModalType('view');
    setShowModal(true);
  };

  const handleEdit = (correspondente) => {
    setSelectedCorrespondente(correspondente);
    setModalType('edit');
    setShowModal(true);
  };

  const handleDelete = (correspondente) => {
    setSelectedCorrespondente(correspondente);
    setModalType('delete');
    setShowModal(true);
  };

  const confirmDelete = async () => {
    try {
      await axios.delete(`${apiUrl}/correspondente/${selectedCorrespondente.id}`);
      setCorrespondentes(correspondentes.filter(c => c.id !== selectedCorrespondente.id));
      setShowModal(false);
      setSelectedCorrespondente(null);
    } catch (error) {
      console.error('Erro ao deletar correspondente:', error);
      alert('Erro ao deletar correspondente');
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedCorrespondente(null);
    setModalType('');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-caixa-gradient flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          style={glassCard}
          className="rounded-2xl p-8 shadow-2xl text-center"
        >
          <Loader2 className="w-12 h-12 text-orange-500 mx-auto mb-4 animate-spin" />
          <h3 className="text-xl font-semibold text-white mb-2">
            Carregando Correspondentes
          </h3>
          <p className="text-white/50">
            Buscando dados dos correspondentes...
          </p>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-caixa-gradient flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{ ...glassCard, borderColor: 'rgba(239,68,68,0.2)' }}
          className="rounded-2xl p-8 shadow-2xl text-center max-w-md w-full"
        >
          <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">
            Erro ao Carregar
          </h3>
          <p className="text-red-400 mb-4">
            {error}
          </p>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => window.location.reload()}
            className="text-white px-6 py-3 rounded-xl font-medium transition-colors"
            style={{ background: ACCENT_GRADIENT }}
          >
            Tentar Novamente
          </motion.button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-caixa-gradient py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Sticky Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="sticky top-0 z-30 pb-4"
          style={{ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
        >
          <div className="text-center mb-6">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg"
                style={{ background: ACCENT_GRADIENT }}
              >
                <Building2 className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-white">
                Correspondentes
              </h1>
            </div>
            <p className="text-white/50 text-lg mb-6">
              Gerencie a equipe de correspondentes bancários
            </p>

            {/* Stats */}
            <div className="flex flex-wrap justify-center gap-4 mb-4">
              <div
                style={glassCard}
                className="rounded-xl px-4 py-2 flex items-center gap-2"
              >
                <Users className="w-5 h-5 text-orange-500" />
                <span className="text-white font-medium">
                  {filteredCorrespondentes.length} de {correspondentes.length} correspondentes
                </span>
              </div>
              <div
                className="rounded-xl px-4 py-2 flex items-center gap-2"
                style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.2)' }}
              >
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span className="text-green-300 font-medium">
                  Sistema Ativo
                </span>
              </div>
            </div>
          </div>

          {/* Controles */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={glassCard}
            className="rounded-2xl p-6"
          >
            <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
              {/* Busca */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Buscar correspondentes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={glassInput}
                  className="w-full rounded-xl px-10 py-3 text-white placeholder-white/40 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/30 transition-all outline-none"
                />
              </div>

              {/* View Mode Toggle */}
              <div className="flex items-center gap-2 rounded-xl p-1" style={{ background: INPUT_BG }}>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
                    viewMode === 'grid'
                      ? 'text-white shadow-lg'
                      : 'text-white/40 hover:text-white'
                  }`}
                  style={viewMode === 'grid' ? { background: ACCENT_GRADIENT } : {}}
                >
                  <Grid3X3 className="w-4 h-4" />
                  Cards
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
                    viewMode === 'list'
                      ? 'text-white shadow-lg'
                      : 'text-white/40 hover:text-white'
                  }`}
                  style={viewMode === 'list' ? { background: ACCENT_GRADIENT } : {}}
                >
                  <List className="w-4 h-4" />
                  Lista
                </button>
              </div>
            </div>

            {searchTerm && (
              <div className="mt-4 flex items-center gap-2 text-white/60">
                <Filter className="w-4 h-4 text-orange-500" />
                <span>
                  Filtrando por: <strong className="text-white">"{searchTerm}"</strong>
                </span>
                <button
                  onClick={() => setSearchTerm('')}
                  className="ml-2 text-orange-500 hover:text-white flex items-center gap-1 transition-colors"
                >
                  <X className="w-4 h-4" />
                  Limpar
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>

        {/* Lista/Grid de Correspondentes */}
        <div className="mt-6">
          <AnimatePresence>
            {viewMode === 'grid' ? (
              // Grid View
              <motion.div
                key="grid"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
              >
                {filteredCorrespondentes.map((correspondente, index) => (
                  <CorrespondenteCard
                    key={correspondente.id}
                    correspondente={correspondente}
                    index={index}
                    onView={handleView}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </motion.div>
            ) : (
              // List View
              <motion.div
                key="list"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={glassCard}
                className="rounded-2xl overflow-hidden"
              >
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr style={{ background: INPUT_BG, borderBottom: `1px solid ${BORDER}` }}>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-white/70">
                          <div className="flex items-center gap-2">
                            <Camera className="w-4 h-4 text-orange-500" />
                            Foto
                          </div>
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-white/70">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-orange-500" />
                            Nome
                          </div>
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-white/70">
                          <div className="flex items-center gap-2">
                            <UserCheck className="w-4 h-4 text-orange-500" />
                            Username
                          </div>
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-white/70">
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-orange-500" />
                            Email
                          </div>
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-white/70">
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-orange-500" />
                            Telefone
                          </div>
                        </th>
                        <th className="px-6 py-4 text-center text-sm font-semibold text-white/70">
                          Ações
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCorrespondentes.map((correspondente, index) => (
                        <motion.tr
                          key={correspondente.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="hover:bg-white/[0.04] transition-colors"
                          style={{ borderBottom: `1px solid ${BORDER}` }}
                        >
                          <td className="px-6 py-4">
                            {correspondente.photo ? (
                              <img
                                src={`${apiUrl}/uploads/imagem_correspondente/${correspondente.photo}`}
                                alt={correspondente.username}
                                className="w-12 h-12 rounded-full object-cover border-2 border-orange-500/50"
                              />
                            ) : (
                              <div className="w-12 h-12 bg-orange-500/20 rounded-full flex items-center justify-center">
                                <User className="w-6 h-6 text-orange-500" />
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-white font-medium">
                              {correspondente.first_name} {correspondente.last_name}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-orange-500 font-medium">
                              @{correspondente.username}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-white/60">{correspondente.email}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-white/60">{correspondente.telefone}</span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-center gap-2">
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => handleView(correspondente)}
                                className="p-2 bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 rounded-lg transition-colors"
                                title="Visualizar"
                              >
                                <Eye className="w-4 h-4" />
                              </motion.button>
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => handleEdit(correspondente)}
                                className="p-2 bg-orange-500/15 hover:bg-orange-500/25 text-orange-500 rounded-lg transition-colors"
                                title="Editar"
                              >
                                <Edit className="w-4 h-4" />
                              </motion.button>
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => handleDelete(correspondente)}
                                className="p-2 bg-red-500/15 hover:bg-red-500/25 text-red-400 rounded-lg transition-colors"
                                title="Deletar"
                              >
                                <Trash2 className="w-4 h-4" />
                              </motion.button>
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Empty State */}
        {filteredCorrespondentes.length === 0 && !loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <div style={glassCard} className="rounded-2xl p-8 max-w-md mx-auto">
              <Users className="w-16 h-16 text-white/30 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">
                {searchTerm ? 'Nenhum resultado encontrado' : 'Nenhum correspondente cadastrado'}
              </h3>
              <p className="text-white/50">
                {searchTerm
                  ? 'Tente alterar os termos de busca'
                  : 'Cadastre o primeiro correspondente para começar'
                }
              </p>
            </div>
          </motion.div>
        )}

        {/* Modal */}
        <AnimatePresence>
          {showModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              onClick={(e) => e.target === e.currentTarget && closeModal()}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                style={{
                  background: 'rgba(11,20,38,0.95)',
                  border: `1px solid ${BORDER}`,
                  backdropFilter: 'blur(24px)',
                  WebkitBackdropFilter: 'blur(24px)',
                }}
              >
                {modalType === 'view' && (
                  <ViewModal correspondente={selectedCorrespondente} onClose={closeModal} />
                )}
                {modalType === 'edit' && (
                  <EditModal
                    correspondente={selectedCorrespondente}
                    onClose={closeModal}
                    onUpdate={fetchCorrespondentes}
                  />
                )}
                {modalType === 'delete' && (
                  <DeleteModal
                    correspondente={selectedCorrespondente}
                    onClose={closeModal}
                    onConfirm={confirmDelete}
                  />
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// Componente Card do Correspondente
const CorrespondenteCard = ({ correspondente, index, onView, onEdit, onDelete }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.1 }}
    style={glassCard}
    className="rounded-2xl p-6 hover:border-orange-500/40 hover:bg-white/[0.08] transition-all duration-300 group"
  >
    {/* Header do Card */}
    <div className="flex items-center gap-4 mb-4">
      {correspondente.photo ? (
        <img
          src={`${apiUrl}/uploads/imagem_correspondente/${correspondente.photo}`}
          alt={correspondente.username}
          className="w-16 h-16 rounded-full object-cover border-2 border-orange-500/50 shadow-lg"
        />
      ) : (
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center shadow-lg"
          style={{ background: 'linear-gradient(135deg, rgba(249,115,22,0.25), rgba(234,88,12,0.4))' }}
        >
          <User className="text-orange-500 w-8 h-8" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <h3 className="text-white font-semibold text-lg truncate">
          {correspondente.first_name} {correspondente.last_name}
        </h3>
        <p className="text-orange-500 font-medium">
          @{correspondente.username}
        </p>
      </div>
    </div>

    {/* Informações */}
    <div className="space-y-3 mb-4">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-orange-500/15 rounded-lg flex items-center justify-center">
          <Mail className="text-orange-500 w-4 h-4" />
        </div>
        <span className="text-white/60 text-sm flex-1 truncate">
          {correspondente.email}
        </span>
      </div>

      {correspondente.telefone && (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-green-500/15 rounded-lg flex items-center justify-center">
            <Phone className="text-green-400 w-4 h-4" />
          </div>
          <span className="text-white/60 text-sm">
            {correspondente.telefone}
          </span>
        </div>
      )}

      {correspondente.address && (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-purple-500/15 rounded-lg flex items-center justify-center">
            <MapPin className="text-purple-400 w-4 h-4" />
          </div>
          <span className="text-white/60 text-sm flex-1 truncate">
            {correspondente.address}
          </span>
        </div>
      )}

      {correspondente.pix_account && (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-500/15 rounded-lg flex items-center justify-center">
            <CreditCard className="text-blue-400 w-4 h-4" />
          </div>
          <span className="text-white/60 text-sm flex-1 truncate">
            {correspondente.pix_account}
          </span>
        </div>
      )}
    </div>

    {/* Status Badge */}
    <div className="mb-4">
      <div
        className="rounded-lg px-3 py-1 inline-flex items-center gap-2"
        style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.2)' }}
      >
        <CheckCircle className="text-green-400 w-4 h-4" />
        <span className="text-green-300 text-xs font-medium">Ativo</span>
      </div>
    </div>

    {/* Ações */}
    <div className="flex gap-2">
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => onView(correspondente)}
        className="flex-1 bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm font-medium"
      >
        <Eye className="w-4 h-4" />
        Ver
      </motion.button>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => onEdit(correspondente)}
        className="flex-1 bg-orange-500/15 hover:bg-orange-500/25 text-orange-500 py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm font-medium"
      >
        <Edit className="w-4 h-4" />
        Editar
      </motion.button>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => onDelete(correspondente)}
        className="bg-red-500/15 hover:bg-red-500/25 text-red-400 py-2 px-3 rounded-lg transition-colors flex items-center justify-center"
      >
        <Trash2 className="w-4 h-4" />
      </motion.button>
    </div>
  </motion.div>
);

// Componente Modal de Visualização
const ViewModal = ({ correspondente, onClose }) => (
  <div className="p-6">
    <div className="flex items-center justify-between mb-6">
      <h3 className="text-2xl font-bold text-white flex items-center gap-2">
        <Eye className="text-orange-500 w-6 h-6" />
        Detalhes do Correspondente
      </h3>
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={onClose}
        className="p-2 bg-white/[0.06] hover:bg-white/[0.12] rounded-xl transition-colors"
      >
        <X className="text-white w-5 h-5" />
      </motion.button>
    </div>

    <div className="text-center mb-6">
      {correspondente.photo ? (
        <img
          src={`${apiUrl}/uploads/imagem_correspondente/${correspondente.photo}`}
          alt={correspondente.username}
          className="w-24 h-24 rounded-full object-cover border-4 border-orange-500/50 mx-auto shadow-lg"
        />
      ) : (
        <div
          className="w-24 h-24 rounded-full flex items-center justify-center mx-auto shadow-lg"
          style={{ background: 'linear-gradient(135deg, rgba(249,115,22,0.25), rgba(234,88,12,0.4))' }}
        >
          <User className="text-orange-500 w-12 h-12" />
        </div>
      )}
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <InfoItem
        icon={User}
        label="Nome Completo"
        value={`${correspondente.first_name} ${correspondente.last_name}`}
      />
      <InfoItem
        icon={UserCheck}
        label="Username"
        value={`@${correspondente.username}`}
      />
      <InfoItem
        icon={Mail}
        label="Email"
        value={correspondente.email}
      />
      <InfoItem
        icon={Phone}
        label="Telefone"
        value={correspondente.telefone}
      />
      {correspondente.address && (
        <InfoItem
          icon={MapPin}
          label="Endereço"
          value={correspondente.address}
          className="md:col-span-2"
        />
      )}
      {correspondente.pix_account && (
        <InfoItem
          icon={CreditCard}
          label="Conta PIX"
          value={correspondente.pix_account}
          className="md:col-span-2"
        />
      )}
    </div>
  </div>
);

// Componente InfoItem
const InfoItem = ({ icon: Icon, label, value, className = "" }) => (
  <div
    className={`rounded-xl p-4 ${className}`}
    style={{ background: INPUT_BG, border: `1px solid ${BORDER}` }}
  >
    <div className="flex items-center gap-2 mb-2">
      <Icon className="text-orange-500 w-4 h-4" />
      <span className="text-white/40 text-sm font-medium">{label}</span>
    </div>
    <p className="text-white font-semibold break-words">
      {value || "Não informado"}
    </p>
  </div>
);

// Componente Modal de Edição
const EditModal = ({ correspondente, onClose, onUpdate }) => {
  const [formData, setFormData] = useState({
    username: correspondente.username || '',
    email: correspondente.email || '',
    first_name: correspondente.first_name || '',
    last_name: correspondente.last_name || '',
    phone: correspondente.telefone || '',
    address: correspondente.address || '',
    pix_account: correspondente.pix_account || '',
    password: ''
  });
  const [photo, setPhoto] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const submitData = new FormData();

    Object.keys(formData).forEach(key => {
      if (formData[key] && (key !== 'password' || formData[key].trim())) {
        submitData.append(key, formData[key]);
      }
    });

    if (photo) {
      submitData.append('photo', photo);
    }

    try {
      await axios.put(`${apiUrl}/correspondente/${correspondente.id}`, submitData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      onUpdate();
      onClose();
    } catch (error) {
      setError(error.response?.data?.error || 'Erro ao atualizar correspondente');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full p-3 rounded-xl text-white placeholder-white/40 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/30 transition-all outline-none";

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-bold text-white flex items-center gap-2">
          <Edit className="text-orange-500 w-6 h-6" />
          Editar Correspondente
        </h3>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onClose}
          className="p-2 bg-white/[0.06] hover:bg-white/[0.12] rounded-xl transition-colors"
        >
          <X className="text-white w-5 h-5" />
        </motion.button>
      </div>

      {error && (
        <div
          className="mb-4 p-4 rounded-xl text-red-400"
          style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Nome"
            value={formData.first_name}
            onChange={(e) => setFormData({...formData, first_name: e.target.value})}
            style={glassInput}
            className={inputClass}
            required
          />
          <input
            type="text"
            placeholder="Sobrenome"
            value={formData.last_name}
            onChange={(e) => setFormData({...formData, last_name: e.target.value})}
            style={glassInput}
            className={inputClass}
            required
          />
        </div>

        <input
          type="text"
          placeholder="Username"
          value={formData.username}
          onChange={(e) => setFormData({...formData, username: e.target.value})}
          style={glassInput}
          className={inputClass}
          required
        />

        <input
          type="email"
          placeholder="Email"
          value={formData.email}
          onChange={(e) => setFormData({...formData, email: e.target.value})}
          style={glassInput}
          className={inputClass}
          required
        />

        <input
          type="text"
          placeholder="Telefone"
          value={formData.phone}
          onChange={(e) => setFormData({...formData, phone: e.target.value})}
          style={glassInput}
          className={inputClass}
          required
        />

        <input
          type="text"
          placeholder="Endereço"
          value={formData.address}
          onChange={(e) => setFormData({...formData, address: e.target.value})}
          style={glassInput}
          className={inputClass}
        />

        <input
          type="text"
          placeholder="PIX/Conta"
          value={formData.pix_account}
          onChange={(e) => setFormData({...formData, pix_account: e.target.value})}
          style={glassInput}
          className={inputClass}
        />

        <input
          type="password"
          placeholder="Nova senha (deixe vazio para manter atual)"
          value={formData.password}
          onChange={(e) => setFormData({...formData, password: e.target.value})}
          style={glassInput}
          className={inputClass}
        />

        <input
          type="file"
          accept="image/*"
          onChange={(e) => setPhoto(e.target.files[0])}
          className="w-full p-3 rounded-xl text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-orange-500 file:text-white file:font-medium file:cursor-pointer hover:file:bg-orange-600 transition-all"
          style={{ ...glassInput, colorScheme: 'dark' }}
        />

        <div className="flex gap-3 pt-4">
          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClose}
            className="flex-1 py-3 bg-white/[0.06] hover:bg-white/[0.12] text-white rounded-xl font-medium transition-colors"
            style={{ border: `1px solid ${BORDER}` }}
          >
            Cancelar
          </motion.button>
          <motion.button
            type="submit"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            disabled={loading}
            className="flex-1 py-3 text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            style={{ background: ACCENT_GRADIENT }}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Salvando...
              </>
            ) : (
              'Salvar Alterações'
            )}
          </motion.button>
        </div>
      </form>
    </div>
  );
};

// Componente Modal de Exclusão
const DeleteModal = ({ correspondente, onClose, onConfirm }) => (
  <div className="p-6">
    <div className="flex items-center justify-between mb-6">
      <h3 className="text-2xl font-bold text-white flex items-center gap-2">
        <AlertTriangle className="text-red-400 w-6 h-6" />
        Confirmar Exclusão
      </h3>
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={onClose}
        className="p-2 bg-white/[0.06] hover:bg-white/[0.12] rounded-xl transition-colors"
      >
        <X className="text-white w-5 h-5" />
      </motion.button>
    </div>

    <div className="text-center mb-6">
      <div className="w-20 h-20 bg-red-500/15 rounded-full flex items-center justify-center mx-auto mb-4">
        <Trash2 className="text-red-400 w-8 h-8" />
      </div>
      <p className="text-white/60 text-lg mb-2">
        Tem certeza que deseja deletar o correspondente
      </p>
      <p className="text-white text-xl font-semibold mb-2">
        {correspondente.first_name} {correspondente.last_name}
      </p>
      <p className="text-red-400 text-sm flex items-center justify-center gap-2">
        <AlertTriangle className="w-4 h-4" />
        Esta ação não pode ser desfeita
      </p>
    </div>

    <div className="flex gap-3">
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onClose}
        className="flex-1 py-3 bg-white/[0.06] hover:bg-white/[0.12] text-white rounded-xl font-medium transition-colors"
        style={{ border: `1px solid ${BORDER}` }}
      >
        Cancelar
      </motion.button>
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onConfirm}
        className="flex-1 py-3 text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2"
        style={{ background: 'linear-gradient(135deg, #EF4444, #DC2626)' }}
      >
        <Trash2 className="w-4 h-4" />
        Deletar Correspondente
      </motion.button>
    </div>
  </div>
);

export default ListaCorrespondentes;
