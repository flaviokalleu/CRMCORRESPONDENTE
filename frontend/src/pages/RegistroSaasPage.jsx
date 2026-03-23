import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import {
  Building2,
  User,
  CreditCard,
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  Eye,
  EyeOff,
  AlertCircle,
  Globe,
  CheckCircle2,
  XCircle,
  Sparkles,
  Shield,
  Zap,
  Crown,
} from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL;

// ─── Helpers ───────────────────────────────────────────────
const slugify = (text) =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

const maskCNPJ = (value) => {
  const digits = value.replace(/\D/g, '').slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
};

const maskTelefone = (value) => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 10) {
    return digits
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  }
  return digits
    .replace(/^(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2');
};

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

// ─── Step Indicator ────────────────────────────────────────
const StepIndicator = ({ currentStep, steps }) => (
  <div className="flex items-center justify-center mb-10">
    {steps.map((step, index) => {
      const stepNum = index + 1;
      const isActive = stepNum === currentStep;
      const isCompleted = stepNum < currentStep;

      return (
        <React.Fragment key={stepNum}>
          <div className="flex flex-col items-center">
            <motion.div
              className={`w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all duration-300 ${
                isCompleted
                  ? 'bg-caixa-orange border-caixa-orange text-white'
                  : isActive
                  ? 'bg-caixa-orange/20 border-caixa-orange text-caixa-orange'
                  : 'bg-white/5 border-white/20 text-white/40'
              }`}
              animate={isActive ? { scale: [1, 1.08, 1] } : {}}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              {isCompleted ? <Check className="w-5 h-5" /> : stepNum}
            </motion.div>
            <span
              className={`mt-2 text-xs font-medium hidden sm:block ${
                isActive || isCompleted ? 'text-white' : 'text-white/40'
              }`}
            >
              {step.label}
            </span>
          </div>
          {index < steps.length - 1 && (
            <div
              className={`w-16 sm:w-24 h-0.5 mx-2 mt-[-1rem] sm:mt-0 transition-colors duration-300 ${
                isCompleted ? 'bg-caixa-orange' : 'bg-white/10'
              }`}
            />
          )}
        </React.Fragment>
      );
    })}
  </div>
);

// ─── Input Component ───────────────────────────────────────
const FormInput = ({
  label,
  name,
  type = 'text',
  value,
  onChange,
  placeholder,
  error,
  icon: Icon,
  disabled,
  suffix,
  onBlur,
  autoComplete,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';

  return (
    <div>
      <label className="block text-sm font-medium text-white/70 mb-1.5">
        {label}
      </label>
      <div className="relative">
        {Icon && (
          <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-white/30" />
        )}
        <input
          name={name}
          type={isPassword && showPassword ? 'text' : type}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete={autoComplete}
          className={`w-full ${Icon ? 'pl-10' : 'pl-4'} ${
            isPassword || suffix ? 'pr-10' : 'pr-4'
          } py-3 bg-white/5 border rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-caixa-orange/50 focus:border-caixa-orange transition-all duration-200 ${
            error
              ? 'border-red-500/50'
              : 'border-white/10 hover:border-white/20'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition"
          >
            {showPassword ? (
              <EyeOff className="w-4.5 h-4.5" />
            ) : (
              <Eye className="w-4.5 h-4.5" />
            )}
          </button>
        )}
        {suffix && !isPassword && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {suffix}
          </div>
        )}
      </div>
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-1.5 text-xs text-red-400 flex items-center gap-1"
        >
          <AlertCircle className="w-3.5 h-3.5" /> {error}
        </motion.p>
      )}
    </div>
  );
};

// ─── Plan Card ─────────────────────────────────────────────
const PlanCard = ({ plan, isSelected, onSelect }) => {
  const iconMap = {
    free: Sparkles,
    basic: Shield,
    basico: Shield,
    professional: Crown,
    profissional: Crown,
    pro: Crown,
  };

  const PlanIcon =
    iconMap[(plan.slug || plan.name || '').toLowerCase()] || Zap;

  const price = parseFloat(plan.price || plan.preco || 0);
  const isFree = price === 0;

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -4 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onSelect(plan)}
      className={`relative cursor-pointer rounded-2xl p-6 border-2 transition-all duration-300 ${
        isSelected
          ? 'border-caixa-orange bg-caixa-orange/10 shadow-lg shadow-caixa-orange/10'
          : 'border-white/10 bg-white/5 hover:border-white/20'
      }`}
    >
      {plan.popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-caixa-orange text-white text-xs font-bold px-3 py-1 rounded-full">
            Mais Popular
          </span>
        </div>
      )}

      <div className="text-center">
        <div
          className={`w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center ${
            isSelected ? 'bg-caixa-orange/20' : 'bg-white/10'
          }`}
        >
          <PlanIcon
            className={`w-6 h-6 ${
              isSelected ? 'text-caixa-orange' : 'text-white/60'
            }`}
          />
        </div>

        <h3 className="text-lg font-bold text-white">
          {plan.name || plan.nome}
        </h3>

        <div className="mt-3 mb-4">
          {isFree ? (
            <span className="text-3xl font-bold text-white">Grátis</span>
          ) : (
            <div>
              <span className="text-sm text-white/50">R$</span>
              <span className="text-3xl font-bold text-white mx-1">
                {price.toFixed(0)}
              </span>
              <span className="text-sm text-white/50">/mês</span>
            </div>
          )}
        </div>

        <ul className="space-y-2 text-left">
          {(plan.features || plan.recursos || []).map((feature, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-white/70">
              <CheckCircle2 className="w-4 h-4 text-caixa-orange shrink-0 mt-0.5" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      {isSelected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute top-3 right-3 w-6 h-6 bg-caixa-orange rounded-full flex items-center justify-center"
        >
          <Check className="w-4 h-4 text-white" />
        </motion.div>
      )}
    </motion.div>
  );
};

// ─── Default Plans (fallback) ──────────────────────────────
const defaultPlans = [
  {
    id: 'free',
    slug: 'free',
    name: 'Free',
    price: 0,
    popular: false,
    features: [
      'Até 50 clientes',
      '1 usuário',
      'Gestão básica de imóveis',
      'Suporte por email',
    ],
  },
  {
    id: 'basic',
    slug: 'basic',
    name: 'Basic',
    price: 97,
    popular: true,
    features: [
      'Até 500 clientes',
      '5 usuários',
      'Integração WhatsApp',
      'Dashboard completo',
      'Pagamentos online',
      'Suporte prioritário',
    ],
  },
  {
    id: 'professional',
    slug: 'professional',
    name: 'Professional',
    price: 197,
    popular: false,
    features: [
      'Clientes ilimitados',
      'Usuários ilimitados',
      'Integração WhatsApp',
      'Dashboard avançado',
      'Pagamentos online',
      'API de integração',
      'Suporte dedicado 24/7',
    ],
  },
];

// ─── Main Component ────────────────────────────────────────
const RegistroSaasPage = () => {
  const navigate = useNavigate();
  const { } = useAuth(); // imported but tokens saved directly

  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');
  const [plans, setPlans] = useState([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [slugStatus, setSlugStatus] = useState(null); // null | 'checking' | 'available' | 'taken'
  const [errors, setErrors] = useState({});

  // Form state
  const [empresa, setEmpresa] = useState({
    nome: '',
    slug: '',
    cnpj: '',
    email: '',
    telefone: '',
  });

  const [admin, setAdmin] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    confirm_password: '',
    telefone: '',
  });

  const [selectedPlan, setSelectedPlan] = useState(null);

  const steps = [
    { label: 'Empresa', icon: Building2 },
    { label: 'Administrador', icon: User },
    { label: 'Plano', icon: CreditCard },
  ];

  // ─── Fetch plans ──────────────────────────────────────
  useEffect(() => {
    const fetchPlans = async () => {
      setPlansLoading(true);
      try {
        const res = await axios.get(`${API_URL}/tenant/plans`);
        const data = res.data?.plans || res.data;
        if (Array.isArray(data) && data.length > 0) {
          setPlans(data);
        } else {
          setPlans(defaultPlans);
        }
      } catch {
        setPlans(defaultPlans);
      } finally {
        setPlansLoading(false);
      }
    };
    fetchPlans();
  }, []);

  // ─── Auto-generate slug ───────────────────────────────
  useEffect(() => {
    const slug = slugify(empresa.nome);
    setEmpresa((prev) => ({ ...prev, slug }));
    setSlugStatus(null);
  }, [empresa.nome]);

  // ─── Check slug availability ──────────────────────────
  const checkSlug = useCallback(async () => {
    const { slug } = empresa;
    if (!slug || slug.length < 3) {
      setSlugStatus(null);
      return;
    }
    setSlugStatus('checking');
    try {
      const res = await axios.get(`${API_URL}/tenant/check-slug/${slug}`);
      setSlugStatus(res.data?.available ? 'available' : 'taken');
    } catch {
      setSlugStatus(null);
    }
  }, [empresa]);

  // ─── Handlers ─────────────────────────────────────────
  const handleEmpresaChange = (e) => {
    const { name, value } = e.target;
    let masked = value;
    if (name === 'cnpj') masked = maskCNPJ(value);
    if (name === 'telefone') masked = maskTelefone(value);
    setEmpresa((prev) => ({ ...prev, [name]: masked }));
    if (errors[`empresa_${name}`]) {
      setErrors((prev) => ({ ...prev, [`empresa_${name}`]: '' }));
    }
  };

  const handleAdminChange = (e) => {
    const { name, value } = e.target;
    let masked = value;
    if (name === 'telefone') masked = maskTelefone(value);
    setAdmin((prev) => ({ ...prev, [name]: masked }));
    if (errors[`admin_${name}`]) {
      setErrors((prev) => ({ ...prev, [`admin_${name}`]: '' }));
    }
  };

  // ─── Validation ───────────────────────────────────────
  const validateStep1 = () => {
    const newErrors = {};
    if (!empresa.nome.trim()) newErrors.empresa_nome = 'Nome da empresa é obrigatório';
    if (!empresa.slug || empresa.slug.length < 3)
      newErrors.empresa_slug = 'Slug deve ter pelo menos 3 caracteres';
    if (slugStatus === 'taken')
      newErrors.empresa_slug = 'Este slug já está em uso';
    if (!empresa.cnpj || empresa.cnpj.replace(/\D/g, '').length < 14)
      newErrors.empresa_cnpj = 'CNPJ inválido';
    if (!empresa.email.trim() || !isValidEmail(empresa.email))
      newErrors.empresa_email = 'Email válido é obrigatório';
    if (!empresa.telefone || empresa.telefone.replace(/\D/g, '').length < 10)
      newErrors.empresa_telefone = 'Telefone inválido';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors = {};
    if (!admin.first_name.trim())
      newErrors.admin_first_name = 'Nome é obrigatório';
    if (!admin.last_name.trim())
      newErrors.admin_last_name = 'Sobrenome é obrigatório';
    if (!admin.email.trim() || !isValidEmail(admin.email))
      newErrors.admin_email = 'Email válido é obrigatório';
    if (!admin.password || admin.password.length < 6)
      newErrors.admin_password = 'Senha deve ter pelo menos 6 caracteres';
    if (admin.password !== admin.confirm_password)
      newErrors.admin_confirm_password = 'As senhas não coincidem';
    if (!admin.telefone || admin.telefone.replace(/\D/g, '').length < 10)
      newErrors.admin_telefone = 'Telefone inválido';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep3 = () => {
    const newErrors = {};
    if (!selectedPlan) newErrors.plan = 'Selecione um plano';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ─── Navigation ───────────────────────────────────────
  const handleNext = () => {
    let valid = false;
    if (currentStep === 1) valid = validateStep1();
    if (currentStep === 2) valid = validateStep2();
    if (valid) {
      setCurrentStep((prev) => prev + 1);
      setApiError('');
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => prev - 1);
    setApiError('');
  };

  // ─── Submit ───────────────────────────────────────────
  const handleSubmit = async () => {
    if (!validateStep3()) return;

    setIsSubmitting(true);
    setApiError('');

    try {
      const payload = {
        empresa: {
          nome: empresa.nome.trim(),
          slug: empresa.slug,
          cnpj: empresa.cnpj,
          email: empresa.email.trim(),
          telefone: empresa.telefone,
        },
        admin: {
          first_name: admin.first_name.trim(),
          last_name: admin.last_name.trim(),
          email: admin.email.trim(),
          password: admin.password,
          telefone: admin.telefone,
        },
        plan_id: selectedPlan.id || selectedPlan.slug,
      };

      const res = await axios.post(`${API_URL}/tenant/register`, payload);

      const { token, refreshToken, authToken } = res.data;
      const finalToken = authToken || token;

      if (finalToken) {
        localStorage.setItem('authToken', finalToken);
      }
      if (refreshToken) {
        localStorage.setItem('refreshToken', refreshToken);
      }

      navigate('/dashboard', { replace: true });
    } catch (err) {
      const message =
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Erro ao realizar cadastro. Tente novamente.';
      setApiError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Slug Status Icon ────────────────────────────────
  const SlugSuffix = () => {
    if (slugStatus === 'checking')
      return <Loader2 className="w-4 h-4 text-white/40 animate-spin" />;
    if (slugStatus === 'available')
      return <CheckCircle2 className="w-4 h-4 text-green-400" />;
    if (slugStatus === 'taken')
      return <XCircle className="w-4 h-4 text-red-400" />;
    return null;
  };

  // ─── Step Animation Variants ──────────────────────────
  const stepVariants = {
    enter: { opacity: 0, x: 40 },
    center: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -40 },
  };

  // ─── Render Steps ─────────────────────────────────────
  const renderStep1 = () => (
    <motion.div
      key="step1"
      variants={stepVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ duration: 0.3 }}
      className="space-y-5"
    >
      <div className="text-center mb-6">
        <Building2 className="w-10 h-10 text-caixa-orange mx-auto mb-2" />
        <h2 className="text-xl font-bold text-white">Dados da Empresa</h2>
        <p className="text-white/50 text-sm mt-1">
          Informe os dados da sua imobiliária
        </p>
      </div>

      <FormInput
        label="Nome da Empresa"
        name="nome"
        value={empresa.nome}
        onChange={handleEmpresaChange}
        placeholder="Minha Imobiliária"
        error={errors.empresa_nome}
        icon={Building2}
      />

      <div>
        <FormInput
          label="Slug (subdomínio)"
          name="slug"
          value={empresa.slug}
          onChange={(e) => {
            setEmpresa((prev) => ({ ...prev, slug: slugify(e.target.value) }));
            setSlugStatus(null);
          }}
          onBlur={checkSlug}
          placeholder="minha-imobiliaria"
          error={errors.empresa_slug}
          icon={Globe}
          suffix={<SlugSuffix />}
        />
        {empresa.slug && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-1.5 text-xs text-white/40 flex items-center gap-1"
          >
            <Globe className="w-3 h-3" />
            <span>
              <span className="text-caixa-orange font-medium">
                {empresa.slug}
              </span>
              .crmimob.com.br
            </span>
          </motion.p>
        )}
      </div>

      <FormInput
        label="CNPJ"
        name="cnpj"
        value={empresa.cnpj}
        onChange={handleEmpresaChange}
        placeholder="XX.XXX.XXX/XXXX-XX"
        error={errors.empresa_cnpj}
      />

      <FormInput
        label="Email da Empresa"
        name="email"
        type="email"
        value={empresa.email}
        onChange={handleEmpresaChange}
        placeholder="contato@empresa.com.br"
        error={errors.empresa_email}
      />

      <FormInput
        label="Telefone"
        name="telefone"
        value={empresa.telefone}
        onChange={handleEmpresaChange}
        placeholder="(61) 99999-9999"
        error={errors.empresa_telefone}
      />
    </motion.div>
  );

  const renderStep2 = () => (
    <motion.div
      key="step2"
      variants={stepVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ duration: 0.3 }}
      className="space-y-5"
    >
      <div className="text-center mb-6">
        <User className="w-10 h-10 text-caixa-orange mx-auto mb-2" />
        <h2 className="text-xl font-bold text-white">
          Dados do Administrador
        </h2>
        <p className="text-white/50 text-sm mt-1">
          Crie a conta do administrador principal
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormInput
          label="Nome"
          name="first_name"
          value={admin.first_name}
          onChange={handleAdminChange}
          placeholder="João"
          error={errors.admin_first_name}
        />
        <FormInput
          label="Sobrenome"
          name="last_name"
          value={admin.last_name}
          onChange={handleAdminChange}
          placeholder="Silva"
          error={errors.admin_last_name}
        />
      </div>

      <FormInput
        label="Email"
        name="email"
        type="email"
        value={admin.email}
        onChange={handleAdminChange}
        placeholder="admin@empresa.com.br"
        error={errors.admin_email}
        autoComplete="email"
      />

      <FormInput
        label="Senha"
        name="password"
        type="password"
        value={admin.password}
        onChange={handleAdminChange}
        placeholder="Mínimo 6 caracteres"
        error={errors.admin_password}
        autoComplete="new-password"
      />

      <FormInput
        label="Confirmar Senha"
        name="confirm_password"
        type="password"
        value={admin.confirm_password}
        onChange={handleAdminChange}
        placeholder="Repita a senha"
        error={errors.admin_confirm_password}
        autoComplete="new-password"
      />

      <FormInput
        label="Telefone"
        name="telefone"
        value={admin.telefone}
        onChange={handleAdminChange}
        placeholder="(61) 99999-9999"
        error={errors.admin_telefone}
      />
    </motion.div>
  );

  const renderStep3 = () => (
    <motion.div
      key="step3"
      variants={stepVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="text-center mb-6">
        <CreditCard className="w-10 h-10 text-caixa-orange mx-auto mb-2" />
        <h2 className="text-xl font-bold text-white">Escolha seu Plano</h2>
        <p className="text-white/50 text-sm mt-1">
          Selecione o plano ideal para sua imobiliária
        </p>
      </div>

      {plansLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-caixa-orange animate-spin" />
          <span className="ml-3 text-white/50">Carregando planos...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((plan) => (
            <PlanCard
              key={plan.id || plan.slug}
              plan={plan}
              isSelected={
                selectedPlan &&
                (selectedPlan.id || selectedPlan.slug) ===
                  (plan.id || plan.slug)
              }
              onSelect={setSelectedPlan}
            />
          ))}
        </div>
      )}

      {errors.plan && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center text-sm text-red-400 flex items-center justify-center gap-1"
        >
          <AlertCircle className="w-4 h-4" /> {errors.plan}
        </motion.p>
      )}
    </motion.div>
  );

  // ─── Main Render ──────────────────────────────────────
  return (
    <div className="min-h-screen bg-caixa-gradient flex items-center justify-center p-4 py-8 font-['Plus_Jakarta_Sans']">
      <div className="w-full max-w-3xl">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <img
            src="/logo-crm-imob.svg"
            alt="CRM IMOB"
            className="h-16 mx-auto mb-3"
          />
          <h1 className="text-2xl font-bold text-white">
            Crie sua conta no{' '}
            <span className="text-caixa-orange">CRM IMOB</span>
          </h1>
          <p className="text-white/50 text-sm mt-1">
            Configure sua imobiliária em poucos minutos
          </p>
        </motion.div>

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="backdrop-blur-xl bg-white/[0.06] rounded-2xl p-6 sm:p-8 border border-white/10 shadow-2xl"
        >
          {/* Step Indicator */}
          <StepIndicator currentStep={currentStep} steps={steps} />

          {/* API Error */}
          <AnimatePresence>
            {apiError && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-3"
              >
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <p className="text-sm text-red-300">{apiError}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Step Content */}
          <AnimatePresence mode="wait">
            {currentStep === 1 && renderStep1()}
            {currentStep === 2 && renderStep2()}
            {currentStep === 3 && renderStep3()}
          </AnimatePresence>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-white/10">
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={handleBack}
                className="flex items-center gap-2 px-5 py-2.5 text-white/60 hover:text-white transition-colors rounded-xl hover:bg-white/5"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar
              </button>
            ) : (
              <Link
                to="/login"
                className="text-sm text-white/50 hover:text-white transition-colors"
              >
                Já tem conta? <span className="text-caixa-orange">Entrar</span>
              </Link>
            )}

            {currentStep < 3 ? (
              <button
                type="button"
                onClick={handleNext}
                className="flex items-center gap-2 px-6 py-2.5 bg-caixa-orange hover:bg-caixa-orange/90 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-caixa-orange/20 hover:shadow-caixa-orange/30"
              >
                Próximo
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-6 py-2.5 bg-caixa-orange hover:bg-caixa-orange/90 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-caixa-orange/20 hover:shadow-caixa-orange/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Criando conta...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Criar Conta
                  </>
                )}
              </button>
            )}
          </div>
        </motion.div>

        {/* Footer */}
        <p className="text-center text-white/30 text-xs mt-6">
          Ao criar sua conta, você concorda com nossos{' '}
          <a href="/termos" className="text-white/50 hover:text-white underline">
            Termos de Uso
          </a>{' '}
          e{' '}
          <a
            href="/privacidade"
            className="text-white/50 hover:text-white underline"
          >
            Política de Privacidade
          </a>
        </p>
      </div>
    </div>
  );
};

export default RegistroSaasPage;
