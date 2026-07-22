import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, Eye, EyeOff, LogIn, Loader2 } from 'lucide-react';

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

    if (error) {
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (!formData.email?.trim() || !formData.password) {
        setError('Email e senha são obrigatórios');
        return;
      }

      const result = await login({
        email: formData.email.trim(),
        password: formData.password
      });

      if (result.success) {
        navigate('/dashboard', { replace: true });
      } else {
        setError(result.error || 'Erro ao fazer login');
      }
    } catch (err) {
      console.error('Erro no formulário de login:', err);
      setError('Erro inesperado. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-caixa-gradient flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Login Card */}
        <div className="backdrop-blur-xl bg-white/10 rounded-2xl p-8 border border-white/10 shadow-2xl">
          {/* Logo */}
          <div className="text-center mb-8">
            <img
              src="/logo-crm-imob.svg"
              alt="CRM IMOB"
              className="h-20 mx-auto mb-4"
            />
            <h1 className="text-2xl font-bold text-white">
              CRM IMOB
            </h1>
            <p className="text-white/60 text-sm mt-1">
              Sistema de Gestão Imobiliária
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-sm font-medium text-white">
                <Mail className="w-4 h-4" />
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                autoComplete="email"
                placeholder="Digite seu email"
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-caixa-orange transition-colors"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-sm font-medium text-white">
                <Lock className="w-4 h-4" />
                Senha
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  autoComplete="current-password"
                  placeholder="Digite sua senha"
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-caixa-orange transition-colors pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-500/20 border border-red-500/30 text-red-300 rounded-xl p-3 text-sm">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-caixa-orange hover:bg-caixa-orange-dark text-white rounded-xl py-3 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Entrando...
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  Entrar
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 pt-6 border-t border-white/10 text-center">
            <Link
              to="/"
              className="text-white/60 hover:text-white text-sm transition-colors"
            >
              Voltar ao site
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
