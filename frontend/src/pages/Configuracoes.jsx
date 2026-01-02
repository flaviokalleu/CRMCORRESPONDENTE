// src/pages/Configuracoes.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  User, 
  Mail, 
  Phone, 
  CreditCard, 
  MapPin, 
  Lock, 
  Camera, 
  Save, 
  Eye, 
  EyeOff, 
  Edit3,
  Shield,
  Settings,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import MainLayout from '../layouts/MainLayout';
import axios from 'axios';

const Configuracoes = () => {
  const { user } = useAuth();
  
  // Estados separados para evitar re-renders
  const [userInfo, setUserInfo] = useState({
    first_name: '',
    last_name: '',
    email: '',
    telefone: '',
    address: '',
    pix_account: '',
    photo: '',
    is_administrador: false,
    is_correspondente: false,
    is_corretor: false
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");
  const [errors, setErrors] = useState({});

  // Animações
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  // Função para buscar dados do usuário
  const fetchUserInfo = useCallback(async () => {
    if (!user) return;

    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/user/me`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('authToken')}`
          }
        }
      );
      
      const userData = response.data.user || response.data;
      setUserInfo(userData);
    } catch (error) {
      console.error("Erro ao buscar informações do usuário:", error);
      setMessage("Erro ao carregar informações do usuário.");
      setMessageType("error");
      setShowPopup(true);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchUserInfo();
  }, [fetchUserInfo]);

  // Função para atualizar campos
  const updateUserField = useCallback((field, value) => {
    setUserInfo(prev => {
      if (prev[field] === value) return prev;
      
      return {
        ...prev,
        [field]: value
      };
    });
    
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  }, [errors]);

  // Validação do formulário
  const validateForm = useCallback(() => {
    const newErrors = {};

    if (!userInfo.first_name?.trim()) {
      newErrors.first_name = "Nome é obrigatório";
    }

    if (!userInfo.last_name?.trim()) {
      newErrors.last_name = "Sobrenome é obrigatório";
    }

    if (!userInfo.email?.trim()) {
      newErrors.email = "Email é obrigatório";
    } else if (!/\S+@\S+\.\S+/.test(userInfo.email)) {
      newErrors.email = "Email inválido";
    }

    if (password && password.length < 6) {
      newErrors.password = "Senha deve ter pelo menos 6 caracteres";
    }

    if (password && password !== confirmPassword) {
      newErrors.confirmPassword = "Senhas não coincidem";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [userInfo.first_name, userInfo.last_name, userInfo.email, password, confirmPassword]);

  // Componente FormField otimizado
  const FormField = React.memo(({ 
    label, 
    value, 
    onChange, 
    type = "text", 
    icon: Icon, 
    placeholder, 
    error,
    disabled = false,
    showPasswordToggle = false,
    showPassword: showPasswordState,
    onTogglePassword
  }) => {
    const handleChange = useCallback((e) => {
      onChange(e.target.value);
    }, [onChange]);

    const handleTogglePassword = useCallback(() => {
      onTogglePassword?.();
    }, [onTogglePassword]);

    return (
      <motion.div 
        className="space-y-2"
        variants={itemVariants}
      >
        <label className="flex items-center gap-2 text-sm font-semibold text-white/90">
          <Icon className="h-4 w-4 text-caixa-light" />
          {label}
        </label>
        <div className="relative">
          <input
            type={showPasswordToggle ? (showPasswordState ? "text" : "password") : type}
            value={value || ""}
            onChange={handleChange}
            disabled={disabled}
            className={`w-full px-4 py-3 bg-white/5 border rounded-xl text-white placeholder-white/40 
              focus:outline-none focus:ring-2 focus:ring-caixa-light/50 focus:border-caixa-light/50 
              transition-all duration-300 backdrop-blur-sm
              ${error ? 'border-red-500/50 focus:ring-red-500/50' : 'border-white/10'}
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-white/20'}
            `}
            placeholder={placeholder}
          />
          {showPasswordToggle && (
            <button
              type="button"
              onClick={handleTogglePassword}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/40 hover:text-white transition-colors"
            >
              {showPasswordState ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          )}
        </div>
        {error && (
          <motion.p 
            className="text-red-400 text-sm flex items-center gap-1"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <AlertCircle className="h-4 w-4" />
            {error}
          </motion.p>
        )}
      </motion.div>
    );
  });

  // Handlers otimizados
  const handleFirstNameChange = useCallback((value) => {
    updateUserField('first_name', value);
  }, [updateUserField]);

  const handleLastNameChange = useCallback((value) => {
    updateUserField('last_name', value);
  }, [updateUserField]);

  const handleEmailChange = useCallback((value) => {
    updateUserField('email', value);
  }, [updateUserField]);

  const handleTelefoneChange = useCallback((value) => {
    updateUserField('telefone', value);
  }, [updateUserField]);

  const handlePixAccountChange = useCallback((value) => {
    updateUserField('pix_account', value);
  }, [updateUserField]);

  const handleAddressChange = useCallback((value) => {
    updateUserField('address', value);
  }, [updateUserField]);

  const handlePasswordChange = useCallback((value) => {
    setPassword(value);
    if (errors.password) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.password;
        return newErrors;
      });
    }
  }, [errors.password]);

  const handleConfirmPasswordChange = useCallback((value) => {
    setConfirmPassword(value);
    if (errors.confirmPassword) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.confirmPassword;
        return newErrors;
      });
    }
  }, [errors.confirmPassword]);

  const toggleShowPassword = useCallback(() => {
    setShowPassword(prev => !prev);
  }, []);

  const toggleShowConfirmPassword = useCallback(() => {
    setShowConfirmPassword(prev => !prev);
  }, []);

  const handleFileChange = useCallback((e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setPreviewImage(e.target.result);
      reader.readAsDataURL(file);
    }
  }, []);

  // URL da foto do usuário
  const userPhotoUrl = userInfo.photo 
    ? `${process.env.REACT_APP_API_URL}/uploads/imagem_usuario/${userInfo.photo}`
    : null;

  // Informações do papel do usuário
  const roleInfo = {
    name: userInfo.is_administrador ? 'Administrador' : 
          userInfo.is_corretor ? 'Corretor' : 
          userInfo.is_correspondente ? 'Correspondente' : 'Usuário',
    color: userInfo.is_administrador ? 'bg-red-500' : 
           userInfo.is_corretor ? 'bg-blue-500' : 
           userInfo.is_correspondente ? 'bg-purple-500' : 'bg-gray-500'
  };

  // Função para salvar
  const handleSave = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      const formData = new FormData();
      
      Object.keys(userInfo).forEach(key => {
        if (userInfo[key] !== null && userInfo[key] !== undefined) {
          formData.append(key, userInfo[key]);
        }
      });

      if (password) {
        formData.append('password', password);
      }

      if (selectedFile) {
        formData.append('photo', selectedFile);
      }

      const response = await axios.put(
        `${process.env.REACT_APP_API_URL}/user/${userInfo.id}`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${localStorage.getItem('authToken')}`
          }
        }
      );

      setMessage("Informações atualizadas com sucesso!");
      setMessageType("success");
      setShowPopup(true);
      setPassword("");
      setConfirmPassword("");
      setSelectedFile(null);
      setPreviewImage(null);

      // Atualizar os dados locais com a resposta
      if (response.data.user) {
        setUserInfo(response.data.user);
      }

    } catch (error) {
      console.error("Erro ao salvar:", error);
      setMessage("Erro ao salvar informações. Tente novamente.");
      setMessageType("error");
      setShowPopup(true);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="min-h-screen bg-gradient-to-br from-caixa-primary via-caixa-secondary to-black flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="w-16 h-16 border-4 border-caixa-light/30 border-t-caixa-light rounded-full mx-auto mb-4"
            />
            <h2 className="text-2xl font-bold text-white mb-2">Carregando Configurações</h2>
            <p className="text-caixa-extra-light">Aguarde...</p>
          </motion.div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="min-h-screen bg-gradient-to-br from-caixa-primary via-caixa-secondary to-black">
        {/* Efeitos de fundo */}
        <div className="absolute inset-0 bg-gradient-to-br from-caixa-primary/20 via-caixa-secondary/10 to-transparent"></div>
        <div className="absolute inset-0">
          <div className="absolute top-0 -left-4 w-72 h-72 bg-caixa-light rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse"></div>
          <div className="absolute top-0 -right-4 w-72 h-72 bg-caixa-orange rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse delay-1000"></div>
          <div className="absolute -bottom-8 left-20 w-72 h-72 bg-caixa-secondary rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse delay-2000"></div>
        </div>

        <div className="relative z-10 p-6 lg:p-8 max-w-4xl mx-auto">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-8"
          >
            {/* Header */}
            <motion.div 
              className="text-center"
              variants={itemVariants}
            >
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-caixa-light to-caixa-secondary rounded-xl flex items-center justify-center shadow-lg">
                  <Settings className="h-6 w-6 text-white" />
                </div>
                <h1 className="text-4xl font-bold text-white">
                  Configurações
                </h1>
              </div>
              <p className="text-caixa-extra-light text-lg">
                Gerencie suas informações pessoais e preferências
              </p>
            </motion.div>

            {/* Profile Card */}
            <motion.div 
              className="bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 p-8 shadow-2xl"
              variants={itemVariants}
            >
              <div className="flex flex-col items-center text-center space-y-6">
                {/* Avatar */}
                <div className="relative">
                  <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-caixa-light/50 shadow-2xl">
                    {previewImage || userPhotoUrl ? (
                      <img
                        src={previewImage || userPhotoUrl}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-caixa-light to-caixa-secondary flex items-center justify-center">
                        <User className="h-16 w-16 text-white" />
                      </div>
                    )}
                  </div>
                  
                  <motion.label
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="absolute bottom-2 right-2 w-10 h-10 bg-caixa-orange rounded-full flex items-center justify-center shadow-lg cursor-pointer border-2 border-white"
                  >
                    <Camera className="h-5 w-5 text-white" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </motion.label>
                </div>

                {/* User Info */}
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold text-white">
                    {userInfo.first_name} {userInfo.last_name}
                  </h3>
                  <div className="flex items-center gap-2 justify-center">
                    <Shield className="h-4 w-4 text-caixa-light" />
                    <span className={`px-3 py-1 rounded-full text-sm font-medium text-white ${roleInfo.color}`}>
                      {roleInfo.name}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Form */}
            <motion.div 
              className="bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 p-8 shadow-2xl"
              variants={itemVariants}
            >
              <div className="flex items-center gap-3 mb-8">
                <Edit3 className="h-6 w-6 text-caixa-light" />
                <h3 className="text-2xl font-bold text-white">Informações Pessoais</h3>
              </div>

              <motion.div 
                className="grid grid-cols-1 md:grid-cols-2 gap-6"
                variants={containerVariants}
              >
                <FormField
                  label="Nome"
                  value={userInfo.first_name}
                  onChange={handleFirstNameChange}
                  icon={User}
                  placeholder="Digite seu nome"
                  error={errors.first_name}
                />

                <FormField
                  label="Sobrenome"
                  value={userInfo.last_name}
                  onChange={handleLastNameChange}
                  icon={User}
                  placeholder="Digite seu sobrenome"
                  error={errors.last_name}
                />

                <FormField
                  label="Email"
                  value={userInfo.email}
                  onChange={handleEmailChange}
                  type="email"
                  icon={Mail}
                  placeholder="Digite seu email"
                  error={errors.email}
                />

                <FormField
                  label="Telefone"
                  value={userInfo.telefone}
                  onChange={handleTelefoneChange}
                  icon={Phone}
                  placeholder="Digite seu telefone"
                />

                <FormField
                  label="Conta PIX"
                  value={userInfo.pix_account}
                  onChange={handlePixAccountChange}
                  icon={CreditCard}
                  placeholder="Digite sua conta PIX"
                />

                <div className="md:col-span-2">
                  <FormField
                    label="Endereço"
                    value={userInfo.address}
                    onChange={handleAddressChange}
                    icon={MapPin}
                    placeholder="Digite seu endereço"
                  />
                </div>
              </motion.div>

              {/* Password Section */}
              <motion.div 
                className="mt-8 pt-8 border-t border-white/10"
                variants={itemVariants}
              >
                <div className="flex items-center gap-3 mb-6">
                  <Lock className="h-6 w-6 text-caixa-orange" />
                  <h4 className="text-xl font-bold text-white">Alterar Senha</h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    label="Nova Senha"
                    value={password}
                    onChange={handlePasswordChange}
                    icon={Lock}
                    placeholder="Digite sua nova senha"
                    error={errors.password}
                    showPasswordToggle={true}
                    showPassword={showPassword}
                    onTogglePassword={toggleShowPassword}
                  />

                  <FormField
                    label="Confirmar Senha"
                    value={confirmPassword}
                    onChange={handleConfirmPasswordChange}
                    icon={Lock}
                    placeholder="Confirme sua nova senha"
                    error={errors.confirmPassword}
                    showPasswordToggle={true}
                    showPassword={showConfirmPassword}
                    onTogglePassword={toggleShowConfirmPassword}
                  />
                </div>
              </motion.div>

              {/* Save Button */}
              <motion.div 
                className="mt-8 flex justify-end"
                variants={itemVariants}
              >
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSave}
                  disabled={saving}
                  className="px-8 py-4 bg-gradient-to-r from-caixa-orange to-caixa-orange-light rounded-xl font-semibold text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center gap-3"
                >
                  {saving ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                      />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="h-5 w-5" />
                      Salvar Alterações
                    </>
                  )}
                </motion.button>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>

        {/* Popup de Mensagem */}
        {showPopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => setShowPopup(false)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 max-w-md mx-4 text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                messageType === 'success' ? 'bg-green-500/20' : 'bg-red-500/20'
              }`}>
                {messageType === 'success' ? (
                  <CheckCircle className="h-8 w-8 text-green-400" />
                ) : (
                  <AlertCircle className="h-8 w-8 text-red-400" />
                )}
              </div>
              
              <h3 className="text-xl font-bold text-white mb-2">
                {messageType === 'success' ? 'Sucesso!' : 'Erro!'}
              </h3>
              
              <p className="text-white/80 mb-6">{message}</p>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowPopup(false)}
                className="px-6 py-3 bg-gradient-to-r from-caixa-light to-caixa-secondary rounded-xl font-semibold text-white"
              >
                Fechar
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </div>
    </MainLayout>
  );
};

export default Configuracoes;
