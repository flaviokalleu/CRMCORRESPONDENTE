// frontend/src/components/ListaCorretores.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, User, Phone, Mail, Edit, Eye, Users, Loader2,
  Grid3X3, List, Search, Badge, RotateCcw
} from "lucide-react";

const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:8000/api";

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
      <div className="min-h-screen bg-gradient-to-br from-primary-700 to-primary-400 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-8 shadow-2xl text-center"
        >
          <Loader2 className="w-12 h-12 text-primary-300 mx-auto mb-4 animate-spin" />
          <h3 className="text-xl font-semibold text-white mb-2">
            Carregando Corretores
          </h3>
          <p className="text-primary-100">
            Buscando dados dos corretores...
          </p>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-700 to-primary-400 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-red-500/10 backdrop-blur-sm rounded-2xl border border-red-500/20 p-8 shadow-2xl text-center max-w-md w-full"
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
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-medium transition-colors"
          >
            Tentar Novamente
          </motion.button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-700 to-primary-400 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-16 h-16 bg-gradient-to-r from-primary-600 to-primary-400 rounded-2xl flex items-center justify-center shadow-lg">
              <Users className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white">
              Corretores
            </h1>
          </div>
          <p className="text-primary-100 text-lg mb-6">
            Gerencie a equipe de corretores do sistema
          </p>
          <div className="flex flex-wrap justify-center gap-4 mb-6">
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-2 flex items-center gap-2">
              <Users className="w-5 h-5 text-primary-300" />
              <span className="text-white font-medium">
                {filteredCorretores.length} de {corretores.length} corretores
              </span>
            </div>
          </div>
        </motion.div>

        {/* Controles */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6 mb-8"
        >
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
            {/* Busca */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-primary-100 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar corretores..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-10 py-3 text-white placeholder-primary-100 focus:border-primary-400 focus:ring-2 focus:ring-primary-400/30 transition-all"
              />
            </div>
            {/* View Mode Toggle */}
            <div className="flex items-center gap-2 bg-white/5 rounded-xl p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
                  viewMode === 'grid'
                    ? 'bg-primary-400 text-white'
                    : 'text-primary-100 hover:text-white'
                }`}
              >
                <Grid3X3 className="w-4 h-4" />
                Cards
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
                  viewMode === 'list'
                    ? 'bg-primary-400 text-white'
                    : 'text-primary-100 hover:text-white'
                }`}
              >
                <List className="w-4 h-4" />
                Lista
              </button>
            </div>
            <button
              onClick={fetchCorretores}
              className="p-2 bg-primary-400 text-white rounded-lg hover:bg-primary-600 transition-colors"
              title="Recarregar"
            >
              <RotateCcw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          {searchTerm && (
            <div className="mt-4 flex items-center gap-2 text-primary-200">
              <Badge className="w-4 h-4 text-primary-400" />
              <span>
                Filtrando por: <strong>"{searchTerm}"</strong>
              </span>
              <button
                onClick={() => setSearchTerm('')}
                className="ml-2 text-primary-400 hover:text-white flex items-center gap-1"
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
              className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl overflow-hidden"
            >
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-white/5 border-b border-white/10">
                      <th className="px-6 py-4 text-left text-sm font-semibold text-primary-200">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-primary-400" />
                          Corretor
                        </div>
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-primary-200">
                        <Mail className="w-4 h-4 text-primary-400" /> Email
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-primary-200">
                        <Phone className="w-4 h-4 text-primary-400" /> Telefone
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-primary-200">
                        CRECI
                      </th>
                      <th className="px-6 py-4 text-center text-sm font-semibold text-primary-200">
                        Ações
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
                        className="border-b border-white/10 hover:bg-white/5 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {corretor.photo ? (
                              <img
                                src={`${apiUrl}/uploads/corretor/${corretor.photo}`}
                                alt={corretor.username}
                                className="w-10 h-10 rounded-full object-cover border-2 border-primary-400/50"
                              />
                            ) : (
                              <div className="w-10 h-10 bg-primary-400/20 rounded-full flex items-center justify-center">
                                <User className="w-6 h-6 text-primary-400" />
                              </div>
                            )}
                            <div>
                              <div className="text-white font-medium">
                                {corretor.first_name} {corretor.last_name}
                              </div>
                              <div className="text-primary-200 text-sm">@{corretor.username}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-primary-100">{corretor.email}</td>
                        <td className="px-6 py-4 text-primary-100">{corretor.telefone}</td>
                        <td className="px-6 py-4 text-primary-100">{corretor.creci || 'N/A'}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => handleView(corretor)}
                              className="p-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-colors"
                              title="Visualizar"
                            >
                              <Eye className="w-4 h-4" />
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => handleEdit(corretor)}
                              className="p-2 bg-primary-400/20 hover:bg-primary-400/30 text-primary-400 rounded-lg transition-colors"
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
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-8 max-w-md mx-auto">
              <Users className="w-16 h-16 text-primary-200 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">
                {searchTerm ? 'Nenhum resultado encontrado' : 'Nenhum corretor cadastrado'}
              </h3>
              <p className="text-primary-100">
                {searchTerm 
                  ? 'Tente alterar os termos de busca'
                  : 'Cadastre o primeiro corretor para começar'
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
                className="bg-primary-700 border border-white/20 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
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
    className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6 hover:border-primary-400/50 hover:bg-white/15 transition-all duration-300 group"
  >
    <div className="flex items-center gap-4 mb-4">
      {corretor.photo ? (
        <img
          src={`${apiUrl}/uploads/corretor/${corretor.photo}`}
          alt={corretor.username}
          className="w-16 h-16 rounded-full object-cover border-3 border-primary-400/50 shadow-lg"
        />
      ) : (
        <div className="w-16 h-16 bg-gradient-to-br from-primary-400/30 to-primary-400/50 rounded-full flex items-center justify-center shadow-lg">
          <User className="text-primary-400 w-8 h-8" />
        </div>
      )}
      <div className="flex-1">
        <h3 className="text-white font-semibold text-lg truncate">
          {corretor.first_name} {corretor.last_name}
        </h3>
        <p className="text-primary-400 font-medium">
          @{corretor.username}
        </p>
      </div>
    </div>
    <div className="space-y-3 mb-4">
      <div className="flex items-center gap-3">
        <Mail className="text-primary-400 w-4 h-4" />
        <span className="text-primary-100 text-sm flex-1 truncate">
          {corretor.email}
        </span>
      </div>
      {corretor.telefone && (
        <div className="flex items-center gap-3">
          <Phone className="text-green-400 w-4 h-4" />
          <span className="text-primary-100 text-sm">
            {corretor.telefone}
          </span>
        </div>
      )}
      {corretor.creci && (
        <div className="flex items-center gap-3">
          <Badge className="text-primary-400 w-4 h-4" />
          <span className="text-primary-100 text-sm">
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
        className="flex-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm font-medium"
      >
        <Eye className="w-4 h-4" />
        Ver
      </motion.button>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => onEdit(corretor)}
        className="flex-1 bg-primary-400/20 hover:bg-primary-400/30 text-primary-400 py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm font-medium"
      >
        <Edit className="w-4 h-4" />
        Editar
      </motion.button>
    </div>
  </motion.div>
);

// Modal de Visualização
const ViewModal = ({ corretor, onClose }) => (
  <div className="p-6">
    <div className="flex items-center justify-between mb-6">
      <h3 className="text-2xl font-bold text-white flex items-center gap-2">
        <Eye className="text-primary-400 w-6 h-6" />
        Detalhes do Corretor
      </h3>
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={onClose}
        className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors"
      >
        <X className="text-white w-5 h-5" />
      </motion.button>
    </div>
    <div className="text-center mb-6">
      {corretor.photo ? (
        <img
          src={`${apiUrl}/uploads/corretor/${corretor.photo}`}
          alt={corretor.username}
          className="w-24 h-24 rounded-full object-cover border-4 border-primary-400/50 mx-auto shadow-lg"
        />
      ) : (
        <div className="w-24 h-24 bg-gradient-to-br from-primary-400/30 to-primary-400/50 rounded-full flex items-center justify-center mx-auto shadow-lg">
          <User className="text-primary-400 w-12 h-12" />
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
  <div className={`bg-white/5 border border-white/10 rounded-xl p-4 ${className}`}>
    <div className="flex items-center gap-2 mb-2">
      <Icon className="text-primary-400 w-4 h-4" />
      <span className="text-primary-100 text-sm font-medium">{label}</span>
    </div>
    <p className="text-white font-semibold break-words">
      {value || "Não informado"}
    </p>
  </div>
);

// Modal de Edição
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

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-bold text-white flex items-center gap-2">
          <Edit className="text-primary-400 w-6 h-6" />
          Editar Corretor
        </h3>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onClose}
          className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors"
        >
          <X className="text-white w-5 h-5" />
        </motion.button>
      </div>
      {error && (
        <div className="mb-4 p-4 bg-red-500/20 border border-red-500/30 rounded-xl text-red-400">
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
            className="w-full p-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-primary-100 focus:border-primary-400 focus:ring-2 focus:ring-primary-400/30 transition-all"
            required
          />
          <input
            type="text"
            placeholder="Sobrenome"
            value={formData.last_name}
            onChange={(e) => setFormData({...formData, last_name: e.target.value})}
            className="w-full p-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-primary-100 focus:border-primary-400 focus:ring-2 focus:ring-primary-400/30 transition-all"
            required
          />
        </div>
        <input
          type="text"
          placeholder="Username"
          value={formData.username}
          onChange={(e) => setFormData({...formData, username: e.target.value})}
          className="w-full p-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-primary-100 focus:border-primary-400 focus:ring-2 focus:ring-primary-400/30 transition-all"
          required
        />
        <input
          type="email"
          placeholder="Email"
          value={formData.email}
          onChange={(e) => setFormData({...formData, email: e.target.value})}
          className="w-full p-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-primary-100 focus:border-primary-400 focus:ring-2 focus:ring-primary-400/30 transition-all"
          required
        />
        <input
          type="text"
          placeholder="Telefone"
          value={formData.telefone}
          onChange={(e) => setFormData({...formData, telefone: e.target.value})}
          className="w-full p-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-primary-100 focus:border-primary-400 focus:ring-2 focus:ring-primary-400/30 transition-all"
          required
        />
        <input
          type="text"
          placeholder="CRECI"
          value={formData.creci}
          onChange={(e) => setFormData({...formData, creci: e.target.value})}
          className="w-full p-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-primary-100 focus:border-primary-400 focus:ring-2 focus:ring-primary-400/30 transition-all"
        />
        <input
          type="password"
          placeholder="Nova senha (deixe vazio para manter atual)"
          value={formData.password}
          onChange={(e) => setFormData({...formData, password: e.target.value})}
          className="w-full p-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-primary-100 focus:border-primary-400 focus:ring-2 focus:ring-primary-400/30 transition-all"
        />
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setPhoto(e.target.files[0])}
          className="w-full p-3 bg-white/10 border border-white/20 rounded-xl text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary-400 file:text-white file:font-medium hover:file:bg-primary-600 transition-all"
        />
        <div className="flex gap-3 pt-4">
          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClose}
            className="flex-1 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium transition-colors"
          >
            Cancelar
          </motion.button>
          <motion.button
            type="submit"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            disabled={loading}
            className="flex-1 py-3 bg-gradient-to-r from-primary-400 to-primary-600 hover:from-primary-600 hover:to-primary-400 disabled:opacity-50 text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2"
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
