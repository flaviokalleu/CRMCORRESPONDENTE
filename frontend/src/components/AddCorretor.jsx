import React, { useState } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Mail, Lock, Phone, MapPin, CreditCard, Camera,
  Upload, CheckCircle, AlertCircle, Eye, EyeOff, Loader2,
  Save, Trash2, IdCard, Shield, ArrowRight, UserPlus, Wallet
} from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

// --- Design tokens ------------------------------------------------------------
const CARD = 'rgba(255,255,255,0.06)';
const BORDER = 'rgba(255,255,255,0.10)';
const INPUT_BG = 'rgba(255,255,255,0.05)';
const ACCENT_GRADIENT = 'linear-gradient(135deg, #F97316, #EA580C)';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [.22, 1, .36, 1] } },
};
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };

const inputClass = `w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/30 transition-all duration-200
  focus:outline-none focus:ring-2 focus:ring-[#F97316]/60 focus:border-[#F97316]/40`;
const inputStyle = { backgroundColor: INPUT_BG, border: `1px solid ${BORDER}` };
const labelClass = "flex items-center gap-2 text-[11px] font-semibold tracking-wide uppercase text-white/50 mb-1.5";

// --- Section wrapper ---------------------------------------------------------
const FormSection = ({ icon, title, subtitle, children }) => (
  <motion.div variants={fadeUp}
    className="rounded-2xl p-4 sm:p-5 backdrop-blur-md space-y-4"
    style={{ backgroundColor: CARD, border: `1px solid ${BORDER}` }}>
    <div className="flex items-center gap-3 pb-3" style={{ borderBottom: `1px solid ${BORDER}` }}>
      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: ACCENT_GRADIENT }}>
        {icon}
      </div>
      <div>
        <h3 className="text-sm font-bold text-white">{title}</h3>
        {subtitle && <p className="text-[10px] text-white/40 mt-0.5">{subtitle}</p>}
      </div>
    </div>
    {children}
  </motion.div>
);

// --- Input field -------------------------------------------------------------
const InputField = ({ label, name, type = 'text', icon: Icon, required, placeholder, value, onChange, error, showPassword, togglePassword, ...props }) => {
  const inputType = type === 'password' && showPassword ? 'text' : type;
  return (
    <div className="space-y-1.5">
      <label className={labelClass}>
        <Icon className="w-3 h-3" />
        {label} {required && <span className="text-[#F97316]">*</span>}
      </label>
      <div className="relative">
        <input type={inputType} name={name} value={value} onChange={onChange} required={required}
          placeholder={placeholder}
          className={`${inputClass} ${error ? 'ring-2 ring-red-500/40 border-red-500/30' : ''}`}
          style={inputStyle} {...props} />
        {type === 'password' && (
          <button type="button" className="absolute inset-y-0 right-0 pr-3 flex items-center" onClick={togglePassword}>
            {showPassword
              ? <EyeOff className="h-4 w-4 text-white/30 hover:text-white/60 transition-colors" />
              : <Eye className="h-4 w-4 text-white/30 hover:text-white/60 transition-colors" />}
          </button>
        )}
      </div>
      {error && (
        <p className="text-red-400 text-[10px] flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />{error}
        </p>
      )}
    </div>
  );
};

// --- Main component ----------------------------------------------------------
const AddCorretor = () => {
  const [formData, setFormData] = useState({
    username: '', email: '', first_name: '', last_name: '',
    creci: '', address: '', pix_account: '', telefone: '',
    password: '', confirmPassword: ''
  });
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [errors, setErrors] = useState({});

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Por favor, selecione apenas arquivos de imagem' }); return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Imagem muito grande. Máximo: 5MB' }); return;
    }
    setPhoto(file);
    const reader = new FileReader();
    reader.onload = (e) => setPhotoPreview(e.target.result);
    reader.readAsDataURL(file);
    if (errors.photo) setErrors(prev => ({ ...prev, photo: '' }));
    setMessage({ type: '', text: '' });
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.username || formData.username.length < 3) newErrors.username = 'Username deve ter pelo menos 3 caracteres';
    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Email inválido';
    if (!formData.first_name || formData.first_name.length < 2) newErrors.first_name = 'Nome deve ter pelo menos 2 caracteres';
    if (!formData.last_name || formData.last_name.length < 2) newErrors.last_name = 'Sobrenome deve ter pelo menos 2 caracteres';
    if (!formData.telefone || formData.telefone.length < 10) newErrors.telefone = 'Telefone deve ter pelo menos 10 dígitos';
    if (!formData.password || formData.password.length < 6) newErrors.password = 'Senha deve ter pelo menos 6 caracteres';
    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Senhas não conferem';
    if (!photo) newErrors.photo = 'Foto é obrigatória';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) { setMessage({ type: 'error', text: 'Por favor, corrija os erros no formulário' }); return; }
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      const submitData = new FormData();
      submitData.append('username', formData.username.trim());
      submitData.append('email', formData.email.trim());
      submitData.append('first_name', formData.first_name.trim());
      submitData.append('last_name', formData.last_name.trim());
      submitData.append('telefone', formData.telefone.trim());
      submitData.append('password', formData.password);
      if (formData.creci?.trim()) submitData.append('creci', formData.creci.trim());
      if (formData.address?.trim()) submitData.append('address', formData.address.trim());
      if (formData.pix_account?.trim()) submitData.append('pix_account', formData.pix_account.trim());
      submitData.append('photo', photo);
      await axios.post(`${API_URL}/corretor`, submitData);
      setMessage({ type: 'success', text: 'Corretor criado com sucesso!' });
      setFormData({ username: '', email: '', first_name: '', last_name: '', creci: '', address: '', pix_account: '', telefone: '', password: '', confirmPassword: '' });
      setPhoto(null); setPhotoPreview(null); setErrors({});
    } catch (error) {
      let errorMessage = 'Erro ao criar corretor';
      if (error.response?.data?.message) errorMessage = error.response.data.message;
      else if (error.response?.data?.errors) errorMessage = error.response.data.errors[0];
      else if (error.code === 'ECONNABORTED') errorMessage = 'Timeout - tente novamente';
      else if (error.message) errorMessage = error.message;
      setMessage({ type: 'error', text: errorMessage });
    } finally { setLoading(false); }
  };

  const resetForm = () => {
    setFormData({ username: '', email: '', first_name: '', last_name: '', creci: '', address: '', pix_account: '', telefone: '', password: '', confirmPassword: '' });
    setPhoto(null); setPhotoPreview(null); setErrors({}); setMessage({ type: '', text: '' });
  };

  return (
    <div className="min-h-screen w-full bg-caixa-gradient">
      <div className="w-full max-w-5xl mx-auto px-4 py-6 sm:px-6">

        {/* -- Header -- */}
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: ACCENT_GRADIENT }}>
            <UserPlus className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Adicionar Corretor</h1>
            <p className="text-[11px] text-white/40">Preencha os dados para cadastrar um novo corretor</p>
          </div>
        </motion.div>

        <form onSubmit={handleSubmit}>
          <motion.div className="space-y-4" initial="hidden" animate="show" variants={stagger}>

            {/* --- FOTO --- */}
            <FormSection icon={<Camera className="w-4 h-4 text-white" />} title="Foto do Corretor"
              subtitle="Imagem de perfil para identificação">
              <div className="flex flex-col sm:flex-row items-center gap-5">
                <div className="relative">
                  {photoPreview ? (
                    <div className="relative">
                      <img src={photoPreview} alt="Preview"
                        className="w-24 h-24 rounded-xl object-cover shadow-lg"
                        style={{ border: `2px solid rgba(249,115,22,0.4)` }} />
                      <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                        type="button" onClick={() => { setPhoto(null); setPhotoPreview(null); }}
                        className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center shadow-lg"
                        style={{ background: ACCENT_GRADIENT }}>
                        <Trash2 className="h-3 w-3 text-white" />
                      </motion.button>
                    </div>
                  ) : (
                    <div className="w-24 h-24 rounded-xl flex items-center justify-center"
                      style={{ border: `2px dashed rgba(255,255,255,0.15)`, backgroundColor: 'rgba(255,255,255,0.03)' }}>
                      <Camera className="h-8 w-8 text-white/20" />
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-center sm:items-start gap-2">
                  <motion.label whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    className="cursor-pointer px-5 py-2.5 rounded-xl text-white text-xs font-bold flex items-center gap-2 shadow-lg"
                    style={{ background: ACCENT_GRADIENT }}>
                    <Upload className="h-3.5 w-3.5" /> Escolher Foto
                    <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                  </motion.label>
                  <p className="text-[10px] text-white/30">PNG, JPG, GIF até 5MB</p>
                  {errors.photo && (
                    <p className="text-red-400 text-[10px] flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />{errors.photo}
                    </p>
                  )}
                </div>
              </div>
            </FormSection>

            {/* --- DADOS PESSOAIS --- */}
            <FormSection icon={<User className="w-4 h-4 text-white" />} title="Dados Pessoais"
              subtitle="Informações de identificação do corretor">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <InputField label="Username" name="username" icon={User} required
                  placeholder="Digite o username" value={formData.username}
                  onChange={handleInputChange} error={errors.username} />
                <InputField label="E-mail" name="email" type="email" icon={Mail} required
                  placeholder="email@exemplo.com" value={formData.email}
                  onChange={handleInputChange} error={errors.email} />
                <InputField label="Nome" name="first_name" icon={User} required
                  placeholder="Primeiro nome" value={formData.first_name}
                  onChange={handleInputChange} error={errors.first_name} />
                <InputField label="Sobrenome" name="last_name" icon={User} required
                  placeholder="Sobrenome" value={formData.last_name}
                  onChange={handleInputChange} error={errors.last_name} />
                <InputField label="Telefone" name="telefone" icon={Phone} required
                  placeholder="(00) 00000-0000" value={formData.telefone}
                  onChange={handleInputChange} error={errors.telefone} />
                <InputField label="CRECI" name="creci" icon={IdCard}
                  placeholder="Número do CRECI" value={formData.creci}
                  onChange={handleInputChange} error={errors.creci} />
              </div>
            </FormSection>

            {/* --- ENDEREÇO & PIX --- */}
            <FormSection icon={<MapPin className="w-4 h-4 text-white" />} title="Endereço & Pagamento"
              subtitle="Localização e dados bancários">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <InputField label="Endereço" name="address" icon={MapPin}
                  placeholder="Endereço completo" value={formData.address}
                  onChange={handleInputChange} error={errors.address} />
                <InputField label="PIX / Conta" name="pix_account" icon={Wallet}
                  placeholder="Chave PIX ou dados da conta" value={formData.pix_account}
                  onChange={handleInputChange} error={errors.pix_account} />
              </div>
            </FormSection>

            {/* --- SEGURANÇA --- */}
            <FormSection icon={<Shield className="w-4 h-4 text-white" />} title="Segurança"
              subtitle="Defina a senha de acesso do corretor">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <InputField label="Senha" name="password" type="password" icon={Lock} required
                  placeholder="Mínimo 6 caracteres" value={formData.password}
                  onChange={handleInputChange} error={errors.password}
                  showPassword={showPassword} togglePassword={() => setShowPassword(!showPassword)} />
                <InputField label="Confirmar Senha" name="confirmPassword" type="password" icon={Lock} required
                  placeholder="Confirme a senha" value={formData.confirmPassword}
                  onChange={handleInputChange} error={errors.confirmPassword}
                  showPassword={showConfirmPassword} togglePassword={() => setShowConfirmPassword(!showConfirmPassword)} />
              </div>
            </FormSection>

            {/* --- BOTÕES --- */}
            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-3">
              <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                type="button" onClick={resetForm}
                className="flex-1 py-3.5 rounded-xl text-sm font-semibold text-white/60 flex items-center justify-center gap-2
                  hover:text-white/80 transition-all duration-200"
                style={{ backgroundColor: CARD, border: `1px solid ${BORDER}` }}>
                <Trash2 className="w-4 h-4" /> Limpar
              </motion.button>
              <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                type="submit" disabled={loading}
                className={`flex-[2] py-3.5 rounded-xl text-sm text-white font-bold flex items-center justify-center gap-2
                  shadow-lg shadow-[#F97316]/20 transition-all duration-200 ${loading ? 'opacity-60 cursor-not-allowed' : 'hover:shadow-xl hover:shadow-[#F97316]/30'}`}
                style={{ background: ACCENT_GRADIENT }}>
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />Criando...</>
                ) : (
                  <><Save className="w-4 h-4" />Criar Corretor<ArrowRight className="w-3.5 h-3.5 ml-1" /></>
                )}
              </motion.button>
            </motion.div>

            {/* --- STATUS --- */}
            <AnimatePresence>
              {message.text && (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="flex items-center gap-3 p-4 rounded-xl backdrop-blur-md"
                  style={{
                    backgroundColor: message.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                    border: `1px solid ${message.type === 'success' ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`,
                  }}>
                  {message.type === 'success'
                    ? <CheckCircle className="w-5 h-5 flex-shrink-0" style={{ color: '#10b981' }} />
                    : <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: '#ef4444' }} />}
                  <span className="text-sm font-medium" style={{
                    color: message.type === 'success' ? '#10b981' : '#ef4444'
                  }}>{message.text}</span>
                </motion.div>
              )}
            </AnimatePresence>

          </motion.div>
        </form>
      </div>
    </div>
  );
};

export default AddCorretor;
