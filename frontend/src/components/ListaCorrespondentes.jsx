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
      <div className="min-h-screen bg-caixa-primary flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-8 shadow-2xl text-center"
        >
          <Loader2 className="w-12 h-12 text-caixa-orange mx-auto mb-4 animate-spin" />
          <h3 className="text-xl font-semibold text-white mb-2">
            Carregando Correspondentes
          </h3>
          <p className="text-caixa-extra-light">
            Buscando dados dos correspondentes...
          </p>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-caixa-primary flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-red-500/10 backdrop-blur-sm rounded-2xl border border-red-500/20 p-8 shadow-2xl text-center max-w-md w-full"
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
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-medium transition-colors"
          >
            Tentar Novamente
          </motion.button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-caixa-primary py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-16 h-16 bg-gradient-to-r from-caixa-orange to-caixa-orange-light rounded-2xl flex items-center justify-center shadow-lg">
              <Building2 className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white">
              Correspondentes
            </h1>
          </div>
          <p className="text-caixa-extra-light text-lg mb-6">
            Gerencie a equipe de correspondentes bancários
          </p>
          
          {/* Stats */}
          <div className="flex flex-wrap justify-center gap-4 mb-6">
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-2 flex items-center gap-2">
              <Users className="w-5 h-5 text-caixa-orange" />
              <span className="text-white font-medium">
                {filteredCorrespondentes.length} de {correspondentes.length} correspondentes
              </span>
            </div>
            <div className="bg-green-500/20 border border-green-500/30 rounded-xl px-4 py-2 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <span className="text-green-300 font-medium">
                Sistema Ativo
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
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-caixa-extra-light w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar correspondentes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-10 py-3 text-white placeholder-caixa-extra-light focus:border-caixa-orange focus:ring-2 focus:ring-caixa-orange/30 transition-all"
              />
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-2 bg-white/5 rounded-xl p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
                  viewMode === 'grid'
                    ? 'bg-caixa-orange text-white'
                    : 'text-caixa-extra-light hover:text-white'
                }`}
              >
                <Grid3X3 className="w-4 h-4" />
                Cards
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
                  viewMode === 'list'
                    ? 'bg-caixa-orange text-white'
                    : 'text-caixa-extra-light hover:text-white'
                }`}
              >
                <List className="w-4 h-4" />
                Lista
              </button>
            </div>
          </div>

          {searchTerm && (
            <div className="mt-4 flex items-center gap-2 text-caixa-light">
              <Filter className="w-4 h-4 text-caixa-orange" />
              <span>
                Filtrando por: <strong>"{searchTerm}"</strong>
              </span>
              <button
                onClick={() => setSearchTerm('')}
                className="ml-2 text-caixa-orange hover:text-white flex items-center gap-1"
              >
                <X className="w-4 h-4" />
                Limpar
              </button>
            </div>
          )}
        </motion.div>

        {/* Lista/Grid de Correspondentes */}
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
              className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl overflow-hidden"
            >
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-white/5 border-b border-white/10">
                      <th className="px-6 py-4 text-left text-sm font-semibold text-caixa-light">
                        <div className="flex items-center gap-2">
                          <Camera className="w-4 h-4 text-caixa-orange" />
                          Foto
                        </div>
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-caixa-light">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-caixa-orange" />
                          Nome
                        </div>
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-caixa-light">
                        <div className="flex items-center gap-2">
                          <UserCheck className="w-4 h-4 text-caixa-orange" />
                          Username
                        </div>
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-caixa-light">
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-caixa-orange" />
                          Email
                        </div>
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-caixa-light">
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-caixa-orange" />
                          Telefone
                        </div>
                      </th>
                      <th className="px-6 py-4 text-center text-sm font-semibold text-caixa-light">
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
                        className="border-b border-white/10 hover:bg-white/5 transition-colors"
                      >
                        <td className="px-6 py-4">
                          {correspondente.photo ? (
                            <img
                              src={`${apiUrl}/uploads/imagem_correspondente/${correspondente.photo}`}
                              alt={correspondente.username}
                              className="w-12 h-12 rounded-full object-cover border-2 border-caixa-orange/50"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-caixa-orange/20 rounded-full flex items-center justify-center">
                              <User className="w-6 h-6 text-caixa-orange" />
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-white font-medium">
                            {correspondente.first_name} {correspondente.last_name}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-caixa-orange font-medium">
                            @{correspondente.username}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-caixa-light">{correspondente.email}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-caixa-light">{correspondente.telefone}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => handleView(correspondente)}
                              className="p-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-colors"
                              title="Visualizar"
                            >
                              <Eye className="w-4 h-4" />
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => handleEdit(correspondente)}
                              className="p-2 bg-caixa-orange/20 hover:bg-caixa-orange/30 text-caixa-orange rounded-lg transition-colors"
                              title="Editar"
                            >
                              <Edit className="w-4 h-4" />
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => handleDelete(correspondente)}
                              className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
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

        {/* Empty State */}
        {filteredCorrespondentes.length === 0 && !loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-8 max-w-md mx-auto">
              <Users className="w-16 h-16 text-caixa-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">
                {searchTerm ? 'Nenhum resultado encontrado' : 'Nenhum correspondente cadastrado'}
              </h3>
              <p className="text-caixa-extra-light">
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
                className="bg-caixa-primary border border-white/20 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
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
    className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6 hover:border-caixa-orange/50 hover:bg-white/15 transition-all duration-300 group"
  >
    {/* Header do Card */}
    <div className="flex items-center gap-4 mb-4">
      {correspondente.photo ? (
        <img
          src={`${apiUrl}/uploads/imagem_correspondente/${correspondente.photo}`}
          alt={correspondente.username}
          className="w-16 h-16 rounded-full object-cover border-3 border-caixa-orange/50 shadow-lg"
        />
      ) : (
        <div className="w-16 h-16 bg-gradient-to-br from-caixa-orange/30 to-caixa-orange/50 rounded-full flex items-center justify-center shadow-lg">
          <User className="text-caixa-orange w-8 h-8" />
        </div>
      )}
      <div className="flex-1">
        <h3 className="text-white font-semibold text-lg truncate">
          {correspondente.first_name} {correspondente.last_name}
        </h3>
        <p className="text-caixa-orange font-medium">
          @{correspondente.username}
        </p>
      </div>
    </div>

    {/* Informações */}
    <div className="space-y-3 mb-4">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-caixa-orange/20 rounded-lg flex items-center justify-center">
          <Mail className="text-caixa-orange w-4 h-4" />
        </div>
        <span className="text-caixa-light text-sm flex-1 truncate">
          {correspondente.email}
        </span>
      </div>

      {correspondente.telefone && (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
            <Phone className="text-green-400 w-4 h-4" />
          </div>
          <span className="text-caixa-light text-sm">
            {correspondente.telefone}
          </span>
        </div>
      )}

      {correspondente.address && (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
            <MapPin className="text-purple-400 w-4 h-4" />
          </div>
          <span className="text-caixa-light text-sm flex-1 truncate">
            {correspondente.address}
          </span>
        </div>
      )}

      {correspondente.pix_account && (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
            <CreditCard className="text-blue-400 w-4 h-4" />
          </div>
          <span className="text-caixa-light text-sm flex-1 truncate">
            {correspondente.pix_account}
          </span>
        </div>
      )}
    </div>

    {/* Status Badge */}
    <div className="mb-4">
      <div className="bg-green-500/20 border border-green-500/30 rounded-lg px-3 py-1 inline-flex items-center gap-2">
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
        className="flex-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm font-medium"
      >
        <Eye className="w-4 h-4" />
        Ver
      </motion.button>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => onEdit(correspondente)}
        className="flex-1 bg-caixa-orange/20 hover:bg-caixa-orange/30 text-caixa-orange py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm font-medium"
      >
        <Edit className="w-4 h-4" />
        Editar
      </motion.button>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => onDelete(correspondente)}
        className="bg-red-500/20 hover:bg-red-500/30 text-red-400 py-2 px-3 rounded-lg transition-colors flex items-center justify-center"
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
        <Eye className="text-caixa-orange w-6 h-6" />
        Detalhes do Correspondente
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
      {correspondente.photo ? (
        <img
          src={`${apiUrl}/uploads/imagem_correspondente/${correspondente.photo}`}
          alt={correspondente.username}
          className="w-24 h-24 rounded-full object-cover border-4 border-caixa-orange/50 mx-auto shadow-lg"
        />
      ) : (
        <div className="w-24 h-24 bg-gradient-to-br from-caixa-orange/30 to-caixa-orange/50 rounded-full flex items-center justify-center mx-auto shadow-lg">
          <User className="text-caixa-orange w-12 h-12" />
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
  <div className={`bg-white/5 border border-white/10 rounded-xl p-4 ${className}`}>
    <div className="flex items-center gap-2 mb-2">
      <Icon className="text-caixa-orange w-4 h-4" />
      <span className="text-caixa-extra-light text-sm font-medium">{label}</span>
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

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-bold text-white flex items-center gap-2">
          <Edit className="text-caixa-orange w-6 h-6" />
          Editar Correspondente
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
            className="w-full p-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-caixa-extra-light focus:border-caixa-orange focus:ring-2 focus:ring-caixa-orange/30 transition-all"
            required
          />
          <input
            type="text"
            placeholder="Sobrenome"
            value={formData.last_name}
            onChange={(e) => setFormData({...formData, last_name: e.target.value})}
            className="w-full p-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-caixa-extra-light focus:border-caixa-orange focus:ring-2 focus:ring-caixa-orange/30 transition-all"
            required
          />
        </div>
        
        <input
          type="text"
          placeholder="Username"
          value={formData.username}
          onChange={(e) => setFormData({...formData, username: e.target.value})}
          className="w-full p-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-caixa-extra-light focus:border-caixa-orange focus:ring-2 focus:ring-caixa-orange/30 transition-all"
          required
        />
        
        <input
          type="email"
          placeholder="Email"
          value={formData.email}
          onChange={(e) => setFormData({...formData, email: e.target.value})}
          className="w-full p-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-caixa-extra-light focus:border-caixa-orange focus:ring-2 focus:ring-caixa-orange/30 transition-all"
          required
        />
        
        <input
          type="text"
          placeholder="Telefone"
          value={formData.phone}
          onChange={(e) => setFormData({...formData, phone: e.target.value})}
          className="w-full p-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-caixa-extra-light focus:border-caixa-orange focus:ring-2 focus:ring-caixa-orange/30 transition-all"
          required
        />
        
        <input
          type="text"
          placeholder="Endereço"
          value={formData.address}
          onChange={(e) => setFormData({...formData, address: e.target.value})}
          className="w-full p-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-caixa-extra-light focus:border-caixa-orange focus:ring-2 focus:ring-caixa-orange/30 transition-all"
        />
        
        <input
          type="text"
          placeholder="PIX/Conta"
          value={formData.pix_account}
          onChange={(e) => setFormData({...formData, pix_account: e.target.value})}
          className="w-full p-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-caixa-extra-light focus:border-caixa-orange focus:ring-2 focus:ring-caixa-orange/30 transition-all"
        />
        
        <input
          type="password"
          placeholder="Nova senha (deixe vazio para manter atual)"
          value={formData.password}
          onChange={(e) => setFormData({...formData, password: e.target.value})}
          className="w-full p-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-caixa-extra-light focus:border-caixa-orange focus:ring-2 focus:ring-caixa-orange/30 transition-all"
        />
        
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setPhoto(e.target.files[0])}
          className="w-full p-3 bg-white/10 border border-white/20 rounded-xl text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-caixa-orange file:text-white file:font-medium hover:file:bg-caixa-orange-dark transition-all"
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
            className="flex-1 py-3 bg-gradient-to-r from-caixa-orange to-caixa-orange-light hover:from-caixa-orange-dark hover:to-caixa-orange disabled:opacity-50 text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2"
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
        className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors"
      >
        <X className="text-white w-5 h-5" />
      </motion.button>
    </div>
    
    <div className="text-center mb-6">
      <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
        <Trash2 className="text-red-400 w-8 h-8" />
      </div>
      <p className="text-caixa-light text-lg mb-2">
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
        className="flex-1 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium transition-colors"
      >
        Cancelar
      </motion.button>
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onConfirm}
        className="flex-1 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2"
      >
        <Trash2 className="w-4 h-4" />
        Deletar Correspondente
      </motion.button>
    </div>
  </div>
);

export default ListaCorrespondentes;
