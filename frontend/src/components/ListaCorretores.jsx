// frontend/src/components/ListaCorretores.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, User, Phone, Mail, Edit, Eye, Users, Loader2,
  Grid3X3, List, Search, Badge, RotateCcw
} from "lucide-react";

const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:8000/api";

// Design tokens
const CARD = 'rgba(255,255,255,0.06)';
const BORDER = 'rgba(255,255,255,0.10)';
const INPUT_BG = 'rgba(255,255,255,0.05)';
const ACCENT_GRADIENT = 'linear-gradient(135deg, #F97316, #EA580C)';

const ListaCorretores = () => {
  const [corretores, setCorretores] = useState([]);
  const [filteredCorretores, setFilteredCorretores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCorretor, setSelectedCorretor] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('grid');

  useEffect(() => {
    fetchCorretores();
  }, []);

  useEffect(() => {
    filterCorretores();
  }, [corretores, searchTerm]);

  const fetchCorretores = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const response = await axios.get(`${apiUrl}/corretor?all=true`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      console.log('Corretores carregados:', response.data.data?.length || 0);
      setCorretores(response.data.data || []);
    } catch (error) {
      console.error('Erro ao carregar corretores:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const filterCorretores = () => {
    if (!searchTerm) {
      setFilteredCorretores(corretores);
      return;
    }
    const filtered = corretores.filter(corretor =>
      (corretor.first_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (corretor.last_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (corretor.username || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (corretor.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (corretor.telefone || '').includes(searchTerm)
    );
    setFilteredCorretores(filtered);
  };

  const handleView = (corretor) => {
    setSelectedCorretor(corretor);
    setModalType('view');
    setShowModal(true);
  };

  const handleEdit = (corretor) => {
    setSelectedCorretor(corretor);
    setModalType('edit');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedCorretor(null);
    setModalType('');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-caixa-gradient flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{ background: CARD, borderColor: BORDER }}
          className="backdrop-blur-xl rounded-2xl border p-8 shadow-2xl text-center"
        >
          <Loader2 className="w-12 h-12 text-orange-400 mx-auto mb-4 animate-spin" />
          <h3 className="text-xl font-semibold text-white mb-2">
            Carregando Corretores
          </h3>
          <p className="text-white/60">
            Buscando dados dos corretores...
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
          className="backdrop-blur-xl rounded-2xl border border-red-500/20 p-8 shadow-2xl text-center max-w-md w-full"
          style={{ background: 'rgba(239,68,68,0.08)' }}
        >
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
        >
          <div
            className="backdrop-blur-xl rounded-2xl border p-6 shadow-2xl"
            style={{ background: CARD, borderColor: BORDER }}
          >
            <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg"
                  style={{ background: ACCENT_GRADIENT }}
                >
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-white">
                    Corretores
                  </h1>
                  <p className="text-white/50 text-sm">
                    Gerencie a equipe de corretores do sistema
                  </p>
                </div>
              </div>
              <div
                className="flex items-center gap-2 px-4 py-2 rounded-xl border"
                style={{ background: CARD, borderColor: BORDER }}
              >
                <Users className="w-4 h-4 text-orange-400" />
                <span className="text-white/80 text-sm font-medium">
                  {filteredCorretores.length} de {corretores.length} corretores
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Controles */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="backdrop-blur-xl rounded-2xl border p-5 mb-8"
          style={{ background: CARD, borderColor: BORDER }}
        >
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
            {/* Busca */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar corretores..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-xl px-10 py-3 text-white placeholder-white/30 border focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/20 transition-all outline-none"
                style={{ background: INPUT_BG, borderColor: BORDER }}
              />
            </div>
            {/* View Mode Toggle */}
            <div
              className="flex items-center gap-1 rounded-xl p-1 border"
              style={{ background: INPUT_BG, borderColor: BORDER }}
            >
              <button
                onClick={() => setViewMode('grid')}
                className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 text-sm font-medium ${
                  viewMode === 'grid'
                    ? 'text-white shadow-lg'
                    : 'text-white/40 hover:text-white/70'
                }`}
                style={viewMode === 'grid' ? { background: ACCENT_GRADIENT } : {}}
              >
                <Grid3X3 className="w-4 h-4" />
                Cards
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 text-sm font-medium ${
                  viewMode === 'list'
                    ? 'text-white shadow-lg'
                    : 'text-white/40 hover:text-white/70'
                }`}
                style={viewMode === 'list' ? { background: ACCENT_GRADIENT } : {}}
              >
                <List className="w-4 h-4" />
                Lista
              </button>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={fetchCorretores}
              className="p-2.5 text-white rounded-xl border transition-colors hover:border-orange-500/30"
              style={{ background: INPUT_BG, borderColor: BORDER }}
              title="Recarregar"
            >
              <RotateCcw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </motion.button>
          </div>
          {searchTerm && (
            <div className="mt-4 flex items-center gap-2 text-white/50">
              <Badge className="w-4 h-4 text-orange-400" />
              <span>
                Filtrando por: <strong className="text-white/80">"{searchTerm}"</strong>
              </span>
              <button
                onClick={() => setSearchTerm('')}
                className="ml-2 text-orange-400 hover:text-orange-300 flex items-center gap-1 transition-colors"
              >
                <X className="w-4 h-4" />
                Limpar
              </button>
            </div>
          )}
        </motion.div>

        {/* Lista/Grid de Corretores */}
        <AnimatePresence>
          {viewMode === 'grid' ? (
            <motion.div
              key="grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            >
              {filteredCorretores.map((corretor, index) => (
                <CorretorCard
                  key={corretor.id}
                  corretor={corretor}
                  index={index}
                  onView={handleView}
                  onEdit={handleEdit}
                />
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="backdrop-blur-xl rounded-2xl border overflow-hidden"
              style={{ background: CARD, borderColor: BORDER }}
            >
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: `1px solid ${BORDER}` }}>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-white/50 uppercase tracking-wider">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-orange-400" />
                          Corretor
                        </div>
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-white/50 uppercase tracking-wider">
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-orange-400" />
                          Email
                        </div>
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-white/50 uppercase tracking-wider">
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-orange-400" />
                          Telefone
                        </div>
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-white/50 uppercase tracking-wider">
                        CRECI
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-semibold text-white/50 uppercase tracking-wider">
                        Acoes
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCorretores.map((corretor, index) => (
                      <motion.tr
                        key={corretor.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="hover:bg-white/[0.03] transition-colors"
                        style={{ borderBottom: `1px solid ${BORDER}` }}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {corretor.photo ? (
                              <img
                                src={`${apiUrl}/uploads/corretor/${corretor.photo}`}
                                alt={corretor.username}
                                className="w-10 h-10 rounded-full object-cover border-2 border-orange-500/30"
                              />
                            ) : (
                              <div
                                className="w-10 h-10 rounded-full flex items-center justify-center"
                                style={{ background: 'rgba(249,115,22,0.15)' }}
                              >
                                <User className="w-5 h-5 text-orange-400" />
                              </div>
                            )}
                            <div>
                              <div className="text-white font-medium text-sm">
                                {corretor.first_name} {corretor.last_name}
                              </div>
                              <div className="text-white/40 text-xs">@{corretor.username}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-white/60 text-sm">{corretor.email}</td>
                        <td className="px-6 py-4 text-white/60 text-sm">{corretor.telefone}</td>
                        <td className="px-6 py-4">
                          {corretor.creci ? (
                            <span
                              className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium text-orange-300"
                              style={{ background: 'rgba(249,115,22,0.12)', border: '1px solid rgba(249,115,22,0.20)' }}
                            >
                              {corretor.creci}
                            </span>
                          ) : (
                            <span className="text-white/30 text-sm">N/A</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => handleView(corretor)}
                              className="p-2 rounded-lg transition-colors text-blue-400 hover:text-blue-300"
                              style={{ background: 'rgba(59,130,246,0.10)', border: '1px solid rgba(59,130,246,0.15)' }}
                              title="Visualizar"
                            >
                              <Eye className="w-4 h-4" />
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => handleEdit(corretor)}
                              className="p-2 rounded-lg transition-colors text-orange-400 hover:text-orange-300"
                              style={{ background: 'rgba(249,115,22,0.10)', border: '1px solid rgba(249,115,22,0.15)' }}
                              title="Editar"
                            >
                              <Edit className="w-4 h-4" />
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

        {/* Empty State */}
        {filteredCorretores.length === 0 && !loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <div
              className="backdrop-blur-xl rounded-2xl border p-8 max-w-md mx-auto"
              style={{ background: CARD, borderColor: BORDER }}
            >
              <Users className="w-16 h-16 text-white/20 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">
                {searchTerm ? 'Nenhum resultado encontrado' : 'Nenhum corretor cadastrado'}
              </h3>
              <p className="text-white/50">
                {searchTerm
                  ? 'Tente alterar os termos de busca'
                  : 'Cadastre o primeiro corretor para comecar'
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
                className="backdrop-blur-xl border rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                style={{ background: 'rgba(11,20,38,0.95)', borderColor: BORDER }}
              >
                {modalType === 'view' && (
                  <ViewModal corretor={selectedCorretor} onClose={closeModal} />
                )}
                {modalType === 'edit' && (
                  <EditModal
                    corretor={selectedCorretor}
                    onClose={closeModal}
                    onUpdate={fetchCorretores}
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

// Card do Corretor
const CorretorCard = ({ corretor, index, onView, onEdit }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.1 }}
    className="backdrop-blur-xl rounded-2xl border p-6 hover:border-orange-500/30 transition-all duration-300 group"
    style={{ background: CARD, borderColor: BORDER }}
  >
    <div className="flex items-center gap-4 mb-4">
      {corretor.photo ? (
        <img
          src={`${apiUrl}/uploads/corretor/${corretor.photo}`}
          alt={corretor.username}
          className="w-16 h-16 rounded-full object-cover border-2 border-orange-500/30 shadow-lg"
        />
      ) : (
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center shadow-lg"
          style={{ background: 'linear-gradient(135deg, rgba(249,115,22,0.2), rgba(234,88,12,0.3))' }}
        >
          <User className="text-orange-400 w-8 h-8" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <h3 className="text-white font-semibold text-lg truncate">
          {corretor.first_name} {corretor.last_name}
        </h3>
        <p className="text-orange-400 font-medium text-sm">
          @{corretor.username}
        </p>
      </div>
    </div>
    <div className="space-y-3 mb-5">
      <div className="flex items-center gap-3">
        <Mail className="text-orange-400 w-4 h-4 flex-shrink-0" />
        <span className="text-white/60 text-sm flex-1 truncate">
          {corretor.email}
        </span>
      </div>
      {corretor.telefone && (
        <div className="flex items-center gap-3">
          <Phone className="text-green-400 w-4 h-4 flex-shrink-0" />
          <span className="text-white/60 text-sm">
            {corretor.telefone}
          </span>
        </div>
      )}
      {corretor.creci && (
        <div className="flex items-center gap-3">
          <Badge className="text-orange-400 w-4 h-4 flex-shrink-0" />
          <span
            className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-medium text-orange-300"
            style={{ background: 'rgba(249,115,22,0.12)', border: '1px solid rgba(249,115,22,0.20)' }}
          >
            CRECI: {corretor.creci}
          </span>
        </div>
      )}
    </div>
    <div className="flex gap-2">
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => onView(corretor)}
        className="flex-1 py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-2 text-sm font-medium text-white/60 hover:text-white border hover:border-white/20"
        style={{ background: INPUT_BG, borderColor: BORDER }}
      >
        <Eye className="w-4 h-4" />
        Ver
      </motion.button>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => onEdit(corretor)}
        className="flex-1 py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-2 text-sm font-medium text-white shadow-lg"
        style={{ background: ACCENT_GRADIENT }}
      >
        <Edit className="w-4 h-4" />
        Editar
      </motion.button>
    </div>
  </motion.div>
);

// Modal de Visualizacao
const ViewModal = ({ corretor, onClose }) => (
  <div className="p-6">
    <div className="flex items-center justify-between mb-6">
      <h3 className="text-2xl font-bold text-white flex items-center gap-2">
        <Eye className="text-orange-400 w-6 h-6" />
        Detalhes do Corretor
      </h3>
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={onClose}
        className="p-2 rounded-xl transition-colors text-white/60 hover:text-white border hover:border-white/20"
        style={{ background: INPUT_BG, borderColor: BORDER }}
      >
        <X className="w-5 h-5" />
      </motion.button>
    </div>
    <div className="text-center mb-6">
      {corretor.photo ? (
        <img
          src={`${apiUrl}/uploads/corretor/${corretor.photo}`}
          alt={corretor.username}
          className="w-24 h-24 rounded-full object-cover border-4 border-orange-500/30 mx-auto shadow-lg"
        />
      ) : (
        <div
          className="w-24 h-24 rounded-full flex items-center justify-center mx-auto shadow-lg"
          style={{ background: 'linear-gradient(135deg, rgba(249,115,22,0.2), rgba(234,88,12,0.3))' }}
        >
          <User className="text-orange-400 w-12 h-12" />
        </div>
      )}
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <InfoItem icon={User} label="Nome Completo" value={`${corretor.first_name} ${corretor.last_name}`} />
      <InfoItem icon={Badge} label="CRECI" value={corretor.creci} />
      <InfoItem icon={Mail} label="Email" value={corretor.email} />
      <InfoItem icon={Phone} label="Telefone" value={corretor.telefone} />
    </div>
  </div>
);

// InfoItem
const InfoItem = ({ icon: Icon, label, value, className = "" }) => (
  <div
    className={`backdrop-blur-sm rounded-xl border p-4 ${className}`}
    style={{ background: CARD, borderColor: BORDER }}
  >
    <div className="flex items-center gap-2 mb-2">
      <Icon className="text-orange-400 w-4 h-4" />
      <span className="text-white/40 text-xs font-medium uppercase tracking-wider">{label}</span>
    </div>
    <p className="text-white font-semibold break-words">
      {value || "Nao informado"}
    </p>
  </div>
);

// Modal de Edicao
const EditModal = ({ corretor, onClose, onUpdate }) => {
  const [formData, setFormData] = useState({
    username: corretor.username || '',
    email: corretor.email || '',
    first_name: corretor.first_name || '',
    last_name: corretor.last_name || '',
    telefone: corretor.telefone || '',
    creci: corretor.creci || '',
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
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      await axios.put(`${apiUrl}/corretor/${corretor.id}`, submitData, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
      });
      onUpdate();
      onClose();
    } catch (error) {
      setError(error.response?.data?.error || 'Erro ao atualizar corretor');
    } finally {
      setLoading(false);
    }
  };

  const inputClasses = "w-full p-3 rounded-xl text-white placeholder-white/30 border focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/20 transition-all outline-none";

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-bold text-white flex items-center gap-2">
          <Edit className="text-orange-400 w-6 h-6" />
          Editar Corretor
        </h3>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onClose}
          className="p-2 rounded-xl transition-colors text-white/60 hover:text-white border hover:border-white/20"
          style={{ background: INPUT_BG, borderColor: BORDER }}
        >
          <X className="w-5 h-5" />
        </motion.button>
      </div>
      {error && (
        <div className="mb-4 p-4 rounded-xl text-red-400 border" style={{ background: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.20)' }}>
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
            className={inputClasses}
            style={{ background: INPUT_BG, borderColor: BORDER }}
            required
          />
          <input
            type="text"
            placeholder="Sobrenome"
            value={formData.last_name}
            onChange={(e) => setFormData({...formData, last_name: e.target.value})}
            className={inputClasses}
            style={{ background: INPUT_BG, borderColor: BORDER }}
            required
          />
        </div>
        <input
          type="text"
          placeholder="Username"
          value={formData.username}
          onChange={(e) => setFormData({...formData, username: e.target.value})}
          className={inputClasses}
          style={{ background: INPUT_BG, borderColor: BORDER }}
          required
        />
        <input
          type="email"
          placeholder="Email"
          value={formData.email}
          onChange={(e) => setFormData({...formData, email: e.target.value})}
          className={inputClasses}
          style={{ background: INPUT_BG, borderColor: BORDER }}
          required
        />
        <input
          type="text"
          placeholder="Telefone"
          value={formData.telefone}
          onChange={(e) => setFormData({...formData, telefone: e.target.value})}
          className={inputClasses}
          style={{ background: INPUT_BG, borderColor: BORDER }}
          required
        />
        <input
          type="text"
          placeholder="CRECI"
          value={formData.creci}
          onChange={(e) => setFormData({...formData, creci: e.target.value})}
          className={inputClasses}
          style={{ background: INPUT_BG, borderColor: BORDER }}
        />
        <input
          type="password"
          placeholder="Nova senha (deixe vazio para manter atual)"
          value={formData.password}
          onChange={(e) => setFormData({...formData, password: e.target.value})}
          className={inputClasses}
          style={{ background: INPUT_BG, borderColor: BORDER }}
        />
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setPhoto(e.target.files[0])}
          className="w-full p-3 rounded-xl text-white/60 border transition-all file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-white file:font-medium file:cursor-pointer"
          style={{
            background: INPUT_BG,
            borderColor: BORDER,
            '--file-bg': ACCENT_GRADIENT
          }}
        />
        <style>{`
          input[type="file"]::file-selector-button {
            background: linear-gradient(135deg, #F97316, #EA580C);
          }
          input[type="file"]::file-selector-button:hover {
            background: linear-gradient(135deg, #EA580C, #C2410C);
          }
        `}</style>
        <div className="flex gap-3 pt-4">
          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClose}
            className="flex-1 py-3 rounded-xl font-medium transition-all text-white/60 hover:text-white border hover:border-white/20"
            style={{ background: INPUT_BG, borderColor: BORDER }}
          >
            Cancelar
          </motion.button>
          <motion.button
            type="submit"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            disabled={loading}
            className="flex-1 py-3 disabled:opacity-50 text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20"
            style={{ background: ACCENT_GRADIENT }}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Salvando...
              </>
            ) : (
              'Salvar'
            )}
          </motion.button>
        </div>
      </form>
    </div>
  );
};

export default ListaCorretores;
