import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, Eye, EyeOff, Loader2, ShieldCheck, Building2, TrendingUp } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';

const LoginPage = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError('');
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
        password: formData.password,
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
    <div className="min-h-screen flex bg-white">
      {/* Painel institucional — visível a partir de lg */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[40%] flex-col justify-between bg-caixa-primary px-12 py-12 text-white">
        <Link to="/" className="flex items-center gap-2.5">
          <img src="/logo-crm-imob.svg" alt="CRM IMOB" className="h-8 w-auto brightness-0 invert" />
          <span className="text-base font-semibold tracking-tight">CRM IMOB</span>
        </Link>

        <div className="space-y-8 max-w-md">
          <h1 className="text-3xl font-semibold leading-tight tracking-tight">
            Gestão imobiliária completa, em um só lugar.
          </h1>
          <p className="text-white/60 text-sm leading-relaxed">
            Clientes, imóveis, aluguéis e pagamentos organizados com o padrão de
            confiabilidade que sua operação exige.
          </p>

          <div className="space-y-4 pt-2">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-white/10">
                <Building2 className="h-4 w-4 text-caixa-orange" strokeWidth={1.8} />
              </div>
              <div>
                <p className="text-sm font-medium">Cadastro unificado</p>
                <p className="text-xs text-white/50">Clientes, imóveis e aluguéis num só fluxo.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-white/10">
                <TrendingUp className="h-4 w-4 text-caixa-orange" strokeWidth={1.8} />
              </div>
              <div>
                <p className="text-sm font-medium">Indicadores em tempo real</p>
                <p className="text-xs text-white/50">Acompanhe o funil de vendas e a carteira de locação.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-white/10">
                <ShieldCheck className="h-4 w-4 text-caixa-orange" strokeWidth={1.8} />
              </div>
              <div>
                <p className="text-sm font-medium">Acesso seguro</p>
                <p className="text-xs text-white/50">Sessões protegidas e controle por perfil de usuário.</p>
              </div>
            </div>
          </div>
        </div>

        <p className="text-xs text-white/30">
          &copy; {new Date().getFullYear()} CRM IMOB. Todos os direitos reservados.
        </p>
      </div>

      {/* Formulário */}
      <div className="flex flex-1 items-center justify-center px-6 py-12 sm:px-10">
        <div className="w-full max-w-sm">
          {/* Logo — só em telas menores que lg */}
          <div className="mb-10 flex items-center gap-2.5 lg:hidden">
            <img src="/logo-crm-imob.svg" alt="CRM IMOB" className="h-8 w-auto" />
            <span className="text-base font-semibold tracking-tight text-caixa-primary">CRM IMOB</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-semibold tracking-tight text-caixa-gray-900">Entrar na conta</h2>
            <p className="mt-1.5 text-sm text-caixa-gray-500">
              Informe suas credenciais para acessar o painel.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-caixa-gray-400" strokeWidth={1.8} />
                <Input
                  id="email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  autoComplete="email"
                  placeholder="voce@empresa.com"
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-caixa-gray-400" strokeWidth={1.8} />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="pl-9 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-caixa-gray-400 hover:text-caixa-gray-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
                {error}
              </div>
            )}

            <Button type="submit" variant="accent" size="lg" disabled={isLoading} className="w-full">
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                'Entrar'
              )}
            </Button>
          </form>

          <div className="mt-8 text-center">
            <Link to="/" className="text-sm text-caixa-gray-500 hover:text-caixa-primary transition-colors">
              Voltar ao site
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
