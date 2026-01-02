import React, { useState } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import {
  FaUser,
  FaEnvelope,
  FaLock,
  FaPhone,
  FaMapMarkerAlt,
  FaCreditCard,
  FaCamera,
  FaUpload,
  FaCheckCircle,
  FaExclamationTriangle,
  FaEye,
  FaEyeSlash,
  FaSpinner,
  FaSave,
  FaTrash,
  FaIdCard
} from 'react-icons/fa';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Componente de Input
const InputField = ({
  label,
  name,
  type = 'text',
  icon: Icon,
  required = false,
  placeholder,
  value,
  onChange,
  error,
  showPassword,
  togglePassword,
  ...props
}) => {
  const inputType = type === 'password' && showPassword ? 'text' : type;

  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-sm font-medium text-caixa-primary mb-2">
        <Icon className="w-4 h-4 text-caixa-orange" />
        {label} {required && <span className="text-caixa-orange">*</span>}
      </label>
      <div className="relative">
        <input
          type={inputType}
          name={name}
          value={value}
          onChange={onChange}
          required={required}
          placeholder={placeholder}
          className={`w-full px-4 py-3 border-2 rounded-xl transition-all duration-200 ${
            error 
              ? 'border-caixa-orange bg-caixa-orange/5 focus:ring-2 focus:ring-caixa-orange focus:border-caixa-orange' 
              : 'border-caixa-primary/30 focus:ring-2 focus:ring-caixa-primary focus:border-caixa-primary'
          }`}
          {...props}
        />
        {type === 'password' && (
          <button
            type="button"
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
            onClick={togglePassword}
          >
            {showPassword ? (
              <FaEyeSlash className="h-4 w-4 text-caixa-primary/60 hover:text-caixa-primary" />
            ) : (
              <FaEye className="h-4 w-4 text-caixa-primary/60 hover:text-caixa-primary" />
            )}
          </button>
        )}
      </div>
      {error && (
        <p className="text-caixa-orange text-sm flex items-center gap-1">
          <FaExclamationTriangle className="h-3 w-3" />
          {error}
        </p>
      )}
    </div>
  );
};

// Componente principal
const AddCorretor = () => {
  // Estados do formulário
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    creci: '',
    address: '',
    pix_account: '',
    telefone: '',
    password: '',
    confirmPassword: ''
  });

  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [errors, setErrors] = useState({});

  // Manipular mudanças nos inputs
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Limpar erro do campo
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  // Manipular upload de foto
  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    
    if (!file) return;

    // Validar tipo
    if (!file.type.startsWith('image/')) {
      setMessage({
        type: 'error',
        text: 'Por favor, selecione apenas arquivos de imagem'
      });
      return;
    }

    // Validar tamanho (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setMessage({
        type: 'error',
        text: 'Imagem muito grande. Máximo: 5MB'
      });
      return;
    }

    setPhoto(file);
    
    // Criar preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPhotoPreview(e.target.result);
    };
    reader.readAsDataURL(file);
    
    // Limpar erro de foto
    if (errors.photo) {
      setErrors(prev => ({
        ...prev,
        photo: ''
      }));
    }
    
    setMessage({ type: '', text: '' });
  };

  // Validar formulário
  const validateForm = () => {
    const newErrors = {};

    // Validar campos obrigatórios
    if (!formData.username || formData.username.length < 3) {
      newErrors.username = 'Username deve ter pelo menos 3 caracteres';
    }

    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email inválido';
    }

    if (!formData.first_name || formData.first_name.length < 2) {
      newErrors.first_name = 'Nome deve ter pelo menos 2 caracteres';
    }

    if (!formData.last_name || formData.last_name.length < 2) {
      newErrors.last_name = 'Sobrenome deve ter pelo menos 2 caracteres';
    }

    if (!formData.telefone || formData.telefone.length < 10) {
      newErrors.telefone = 'Telefone deve ter pelo menos 10 dígitos';
    }

    if (!formData.password || formData.password.length < 6) {
      newErrors.password = 'Senha deve ter pelo menos 6 caracteres';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Senhas não conferem';
    }

    if (!photo) {
      newErrors.photo = 'Foto é obrigatória';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submeter formulário
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      setMessage({
        type: 'error',
        text: 'Por favor, corrija os erros no formulário'
      });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      // Criar FormData
      const submitData = new FormData();
      
      // Adicionar campos obrigatórios
      submitData.append('username', formData.username.trim());
      submitData.append('email', formData.email.trim());
      submitData.append('first_name', formData.first_name.trim());
      submitData.append('last_name', formData.last_name.trim());
      submitData.append('telefone', formData.telefone.trim());
      submitData.append('password', formData.password);
      
      // Adicionar campos opcionais se preenchidos
      if (formData.creci?.trim()) {
        submitData.append('creci', formData.creci.trim());
      }
      if (formData.address?.trim()) {
        submitData.append('address', formData.address.trim());
      }
      if (formData.pix_account?.trim()) {
        submitData.append('pix_account', formData.pix_account.trim());
      }
      
      // Adicionar foto
      submitData.append('photo', photo);

      console.log('📤 Enviando dados para:', `${API_URL}/corretor`);

      // Fazer requisição
      const response = await axios.post(`${API_URL}/corretor`, submitData);

      console.log('[FRONTEND] Resposta recebida:', response.data);

      setMessage({
        type: 'success',
        text: 'Corretor criado com sucesso!'
      });

      // Resetar formulário
      setFormData({
        username: '',
        email: '',
        first_name: '',
        last_name: '',
        creci: '',
        address: '',
        pix_account: '',
        telefone: '',
        password: '',
        confirmPassword: ''
      });
      setPhoto(null);
      setPhotoPreview(null);
      setErrors({});

    } catch (error) {
      console.error('❌ Erro:', error);

      let errorMessage = 'Erro ao criar corretor';

      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.errors) {
        errorMessage = error.response.data.errors[0];
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = 'Timeout - tente novamente';
      } else if (error.message) {
        errorMessage = error.message;
      }

      setMessage({
        type: 'error',
        text: errorMessage
      });
    } finally {
      setLoading(false);
    }
  };

  // Resetar formulário
  const resetForm = () => {
    setFormData({
      username: '',
      email: '',
      first_name: '',
      last_name: '',
      creci: '',
      address: '',
      pix_account: '',
      telefone: '',
      password: '',
      confirmPassword: ''
    });
    setPhoto(null);
    setPhotoPreview(null);
    setErrors({});
    setMessage({ type: '', text: '' });
  };

  return (
    <div className="min-h-screen w-full bg-caixa-primary flex flex-col">
      {/* Container principal com largura máxima expandida */}
      <div className="flex-1 w-full px-4 py-6 md:px-6 lg:px-8 xl:px-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-2 flex items-center gap-3 tracking-tight">
            <FaUser className="w-6 h-6 md:w-8 md:h-8 text-caixa-orange" />
            Adicionar Corretor
          </h2>
          <p className="text-white text-base md:text-lg font-medium">
            Preencha os dados para cadastrar um novo corretor no sistema
          </p>
        </motion.div>

        {/* Formulário expandido */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-xl p-4 md:p-6 lg:p-8 border border-caixa-primary/20 w-full"
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Upload de Foto */}
            <div className="flex flex-col items-center space-y-4 pb-6 border-b border-caixa-primary/20">
              <div className="relative">
                {photoPreview ? (
                  <div className="relative">
                    <img
                      src={photoPreview}
                      alt="Preview"
                      className="w-32 h-32 rounded-full object-cover border-4 border-caixa-primary shadow-lg"
                    />
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      type="button"
                      onClick={() => {
                        setPhoto(null);
                        setPhotoPreview(null);
                      }}
                      className="absolute -top-2 -right-2 bg-caixa-orange hover:bg-caixa-orange/90 text-white rounded-full p-2 transition-colors shadow-lg"
                    >
                      <FaTrash className="h-3 w-3" />
                    </motion.button>
                  </div>
                ) : (
                  <div className="w-32 h-32 rounded-full bg-caixa-primary/10 border-2 border-dashed border-caixa-primary/30 flex items-center justify-center">
                    <FaCamera className="h-8 w-8 text-caixa-primary/60" />
                  </div>
                )}
              </div>
              
              <div className="flex flex-col items-center space-y-2">
                <motion.label 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="cursor-pointer bg-caixa-orange hover:bg-caixa-orange/90 text-white px-6 py-3 rounded-xl transition-all duration-200 flex items-center gap-2 font-medium shadow-lg"
                >
                  <FaUpload className="h-4 w-4" />
                  Escolher Foto
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                </motion.label>
                <p className="text-xs text-caixa-primary/70">
                  PNG, JPG, GIF até 5MB
                </p>
                {errors.photo && (
                  <p className="text-caixa-orange text-sm flex items-center gap-1">
                    <FaExclamationTriangle className="h-3 w-3" />
                    {errors.photo}
                  </p>
                )}
              </div>
            </div>

            {/* Campos do Formulário */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
              <InputField
                label="Username"
                name="username"
                icon={FaUser}
                required
                placeholder="Digite o username"
                value={formData.username}
                onChange={handleInputChange}
                error={errors.username}
              />
              
              <InputField
                label="E-mail"
                name="email"
                type="email"
                icon={FaEnvelope}
                required
                placeholder="Digite o e-mail"
                value={formData.email}
                onChange={handleInputChange}
                error={errors.email}
              />
              
              <InputField
                label="Nome"
                name="first_name"
                icon={FaUser}
                required
                placeholder="Primeiro nome"
                value={formData.first_name}
                onChange={handleInputChange}
                error={errors.first_name}
              />
              
              <InputField
                label="Sobrenome"
                name="last_name"
                icon={FaUser}
                required
                placeholder="Sobrenome"
                value={formData.last_name}
                onChange={handleInputChange}
                error={errors.last_name}
              />
              
              <InputField
                label="CRECI"
                name="creci"
                icon={FaIdCard}
                placeholder="Número do CRECI"
                value={formData.creci}
                onChange={handleInputChange}
                error={errors.creci}
              />
              
              <InputField
                label="Telefone"
                name="telefone"
                icon={FaPhone}
                required
                placeholder="(00) 00000-0000"
                value={formData.telefone}
                onChange={handleInputChange}
                error={errors.telefone}
              />
            </div>

            {/* Campos de linha completa */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <div>
                <InputField
                  label="Endereço"
                  name="address"
                  icon={FaMapMarkerAlt}
                  placeholder="Endereço completo"
                  value={formData.address}
                  onChange={handleInputChange}
                  error={errors.address}
                />
              </div>
              
              <div>
                <InputField
                  label="PIX/Conta"
                  name="pix_account"
                  icon={FaCreditCard}
                  placeholder="Chave PIX ou dados da conta"
                  value={formData.pix_account}
                  onChange={handleInputChange}
                  error={errors.pix_account}
                />
              </div>
            </div>

            {/* Senhas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <InputField
                label="Senha"
                name="password"
                type="password"
                icon={FaLock}
                required
                placeholder="Digite a senha"
                value={formData.password}
                onChange={handleInputChange}
                error={errors.password}
                showPassword={showPassword}
                togglePassword={() => setShowPassword(!showPassword)}
              />
              
              <InputField
                label="Confirmar Senha"
                name="confirmPassword"
                type="password"
                icon={FaLock}
                required
                placeholder="Confirme a senha"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                error={errors.confirmPassword}
                showPassword={showConfirmPassword}
                togglePassword={() => setShowConfirmPassword(!showConfirmPassword)}
              />
            </div>

            {/* Botões */}
            <div className="pt-6 border-t border-caixa-primary/20 flex flex-col md:flex-row gap-4">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={resetForm}
                className="flex-1 py-3 px-6 rounded-xl font-semibold text-caixa-primary bg-caixa-primary/10 hover:bg-caixa-primary/20 transition-all duration-200 border-2 border-caixa-primary/30 flex items-center justify-center gap-2"
              >
                <FaTrash className="w-4 h-4" />
                Limpar
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading}
                className={`flex-1 py-3 px-6 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2 shadow-xl ${
                  loading
                    ? 'bg-caixa-primary/60 cursor-not-allowed text-white'
                    : 'bg-caixa-orange hover:bg-caixa-orange/90 text-white hover:shadow-2xl'
                }`}
              >
                {loading ? (
                  <>
                    <FaSpinner className="w-5 h-5 animate-spin" />
                    Criando...
                  </>
                ) : (
                  <>
                    <FaSave className="h-5 w-5" />
                    Criar Corretor
                  </>
                )}
              </motion.button>
            </div>
          </form>

          {/* Mensagens */}
          {message.text && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mt-6 p-4 rounded-xl border-2 flex items-center gap-3 ${
                message.type === 'success'
                  ? 'bg-caixa-primary/10 border-caixa-primary/30 text-caixa-primary'
                  : 'bg-caixa-orange/10 border-caixa-orange/30 text-caixa-orange'
              }`}
            >
              {message.type === 'success' ? (
                <FaCheckCircle className="h-5 w-5 flex-shrink-0" />
              ) : (
                <FaExclamationTriangle className="h-5 w-5 flex-shrink-0" />
              )}
              <span className="font-medium">{message.text}</span>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default AddCorretor;
