import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, LogIn, Loader2, Building2 } from 'lucide-react';

const LoginPage = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Limpar erro quando usuário começa a digitar
    if (error) {
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Validação básica
      if (!formData.email?.trim() || !formData.password) {
        setError('Email e senha são obrigatórios');
        return;
      }

      console.log('📝 Dados do formulário:', {
        email: formData.email,
        passwordLength: formData.password.length
      });

      // Tentar fazer login
      const result = await login({
        email: formData.email.trim(),
        password: formData.password
      });

      if (result.success) {
        console.log('✅ Login bem-sucedido, redirecionando...');
        navigate('/dashboard', { replace: true });
      } else {
        setError(result.error || 'Erro ao fazer login');
      }
    } catch (error) {
      console.error('❌ Erro no formulário de login:', error);
      setError('Erro inesperado. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-caixa-primary via-caixa-secondary to-black flex items-center justify-center p-4">
      {/* Efeitos de fundo usando cores CAIXA */}
      <div className="absolute inset-0 bg-gradient-to-br from-caixa-primary/20 via-caixa-secondary/10 to-transparent"></div>
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 -left-4 w-96 h-96 bg-caixa-light rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse" />
        <div className="absolute top-0 -right-4 w-96 h-96 bg-caixa-orange rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse delay-1000" />
        <div className="absolute -bottom-8 left-20 w-96 h-96 bg-caixa-secondary rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse delay-2000" />
      </div>

      <motion.div
        className="relative z-10 w-full max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 p-8 shadow-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <motion.div
              className="w-24 h-24 bg-gradient-to-br from-caixa-light to-caixa-secondary rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl"
              whileHover={{ scale: 1.05, rotate: 5 }}
              transition={{ duration: 0.3 }}
            >
              <Building2 className="w-12 h-12 text-white" />
            </motion.div>
            
            <motion.h1 
              className="text-4xl font-bold text-white mb-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              Bem-vindo
            </motion.h1>
            
            <motion.p 
              className="text-caixa-extra-light text-lg"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              Sistema de B2M
            </motion.p>
            
            <motion.div 
              className="w-16 h-1 bg-gradient-to-r from-caixa-orange to-caixa-orange-light rounded-full mx-auto mt-4"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.4, duration: 0.6 }}
            />
          </div>

          {/* Form */}
          <motion.form 
            onSubmit={handleSubmit} 
            className="space-y-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            {/* Email Field */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-white/90">
                <Mail className="w-4 h-4 text-caixa-light" />
                Email
              </label>
              <motion.input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                autoComplete="email"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 
                  focus:outline-none focus:ring-2 focus:ring-caixa-light/50 focus:border-caixa-light/50 
                  transition-all duration-300 backdrop-blur-sm hover:border-white/20"
                placeholder="Digite seu email"
                whileFocus={{ scale: 1.02 }}
                transition={{ duration: 0.2 }}
              />
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-white/90">
                <Lock className="w-4 h-4 text-caixa-light" />
                Senha
              </label>
              <div className="relative">
                <motion.input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  autoComplete="current-password"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 
                    focus:outline-none focus:ring-2 focus:ring-caixa-light/50 focus:border-caixa-light/50 
                    transition-all duration-300 backdrop-blur-sm pr-12 hover:border-white/20"
                  placeholder="Digite sua senha"
                  whileFocus={{ scale: 1.02 }}
                  transition={{ duration: 0.2 }}
                />
                <motion.button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </motion.button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <motion.div
                className="bg-red-500/20 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl backdrop-blur-sm"
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
                  {error}
                </div>
              </motion.div>
            )}

            {/* Submit Button */}
            <motion.button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-caixa-orange to-caixa-orange-light 
                hover:from-caixa-orange-dark hover:to-caixa-orange 
                text-white py-4 px-6 rounded-xl font-semibold text-lg
                transition-all duration-300 shadow-lg hover:shadow-xl
                disabled:opacity-50 disabled:cursor-not-allowed 
                flex items-center justify-center gap-3"
              whileHover={!isLoading ? { scale: 1.02, y: -2 } : {}}
              whileTap={!isLoading ? { scale: 0.98 } : {}}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              {isLoading ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <Loader2 className="w-6 h-6" />
                  </motion.div>
                  Entrando...
                </>
              ) : (
                <>
                  <LogIn className="w-6 h-6" />
                  Entrar no Sistema
                </>
              )}
            </motion.button>
          </motion.form>

          {/* Footer */}
          <motion.div 
            className="text-center mt-8 pt-6 border-t border-white/10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
          >
            <p className="text-caixa-extra-light text-sm">
              Sistema de Gestão Empresarial
            </p>
            <div className="flex items-center justify-center gap-2 mt-2">
              <div className="w-2 h-2 bg-caixa-light rounded-full animate-pulse" />
              <span className="text-xs text-white/60">Conexão Segura</span>
              <div className="w-2 h-2 bg-caixa-light rounded-full animate-pulse delay-500" />
            </div>
          </motion.div>
        </div>

        {/* Versão do Sistema */}
        <motion.div 
          className="text-center mt-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          <p className="text-caixa-extra-light text-xs">
            v2.0.0 • © 2024 B2M
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default LoginPage;