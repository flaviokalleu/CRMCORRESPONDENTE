import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Check,
  X,
  Star,
  Users,
  Building2,
  Home,
  MessageCircle,
  Brain,
  BarChart3,
  CreditCard,
  Globe,
  Headphones,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Shield,
  Zap,
} from 'lucide-react';

// ─── Dados dos Planos ───────────────────────────────────────────────

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    description: 'Para quem quer conhecer o sistema sem compromisso.',
    priceMonthly: 0,
    priceYearly: 0,
    limits: {
      clientes: '50',
      usuarios: '2',
      imoveis: '20',
      alugueis: '10',
    },
    features: {
      whatsapp: false,
      pagamentos: false,
      ia: false,
      relatorios: false,
      multiusuarios: false,
      api: false,
      suportePrioritario: false,
      dominioCustomizado: false,
    },
    cta: 'Começar Grátis',
    ctaLink: '/registro',
    badge: null,
    highlighted: false,
    icon: Shield,
  },
  {
    id: 'basic',
    name: 'Basic',
    description: 'Para imobiliárias e corretores em crescimento.',
    priceMonthly: 97,
    priceYearly: 970,
    limits: {
      clientes: '500',
      usuarios: '10',
      imoveis: '100',
      alugueis: '50',
    },
    features: {
      whatsapp: false,
      pagamentos: true,
      ia: false,
      relatorios: true,
      multiusuarios: true,
      api: false,
      suportePrioritario: false,
      dominioCustomizado: false,
    },
    cta: 'Começar Trial de 14 dias',
    ctaLink: '/registro?plano=basic',
    badge: 'Mais Popular',
    highlighted: true,
    icon: Zap,
  },
  {
    id: 'professional',
    name: 'Professional',
    description: 'Para operações completas com todos os recursos.',
    priceMonthly: 197,
    priceYearly: 1970,
    limits: {
      clientes: 'Ilimitado',
      usuarios: 'Ilimitado',
      imoveis: 'Ilimitado',
      alugueis: 'Ilimitado',
    },
    features: {
      whatsapp: true,
      pagamentos: true,
      ia: true,
      relatorios: true,
      multiusuarios: true,
      api: true,
      suportePrioritario: true,
      dominioCustomizado: true,
    },
    cta: 'Começar Trial de 14 dias',
    ctaLink: '/registro?plano=professional',
    badge: null,
    highlighted: false,
    icon: Sparkles,
  },
];

const FEATURE_LABELS = {
  whatsapp: { label: 'Integração WhatsApp', icon: MessageCircle },
  pagamentos: { label: 'Gestão de Pagamentos', icon: CreditCard },
  ia: { label: 'Análise com IA', icon: Brain },
  relatorios: { label: 'Relatórios Avançados', icon: BarChart3 },
  multiusuarios: { label: 'Multi-usuários', icon: Users },
  api: { label: 'Acesso à API', icon: Globe },
  suportePrioritario: { label: 'Suporte Prioritário', icon: Headphones },
  dominioCustomizado: { label: 'Domínio Customizado', icon: Globe },
};

const LIMIT_LABELS = {
  clientes: { label: 'Clientes', icon: Users },
  usuarios: { label: 'Usuários', icon: Users },
  imoveis: { label: 'Imóveis', icon: Building2 },
  alugueis: { label: 'Aluguéis', icon: Home },
};

// ─── Tabela de Comparação ───────────────────────────────────────────

const COMPARISON_ROWS = [
  { section: 'Limites' },
  { key: 'clientes', label: 'Clientes', values: ['50', '500', 'Ilimitado'] },
  { key: 'usuarios', label: 'Usuários', values: ['2', '10', 'Ilimitado'] },
  { key: 'imoveis', label: 'Imóveis', values: ['20', '100', 'Ilimitado'] },
  { key: 'alugueis', label: 'Aluguéis', values: ['10', '50', 'Ilimitado'] },
  { section: 'Funcionalidades' },
  { key: 'dashboard', label: 'Dashboard', values: [true, true, true] },
  { key: 'cadastro', label: 'Cadastro de Clientes', values: [true, true, true] },
  { key: 'kanban', label: 'Kanban de Clientes', values: [true, true, true] },
  { key: 'imoveis_gestao', label: 'Gestão de Imóveis', values: [true, true, true] },
  { key: 'pagamentos', label: 'Gestão de Pagamentos', values: [false, true, true] },
  { key: 'relatorios', label: 'Relatórios Avançados', values: [false, true, true] },
  { key: 'multiusuarios', label: 'Multi-usuários com Permissões', values: [false, true, true] },
  { key: 'whatsapp', label: 'Integração WhatsApp', values: [false, false, true] },
  { key: 'ia', label: 'Análise com IA (Gemini)', values: [false, false, true] },
  { key: 'api', label: 'Acesso à API', values: [false, false, true] },
  { key: 'suporte_prioritario', label: 'Suporte Prioritário', values: [false, false, true] },
  { key: 'dominio', label: 'Domínio Customizado', values: [false, false, true] },
];

// ─── FAQ ────────────────────────────────────────────────────────────

const FAQ_ITEMS = [
  {
    question: 'Posso mudar de plano depois?',
    answer:
      'Sim! Você pode fazer upgrade ou downgrade do seu plano a qualquer momento. Ao fazer upgrade, o valor é ajustado proporcionalmente ao período restante. Ao fazer downgrade, o crédito restante é aplicado ao novo plano.',
  },
  {
    question: 'Como funciona o trial de 14 dias?',
    answer:
      'Ao se cadastrar nos planos Basic ou Professional, você tem acesso completo a todas as funcionalidades do plano escolhido por 14 dias, sem necessidade de cartão de crédito. Ao final do período, você pode escolher continuar ou voltar para o plano Free.',
  },
  {
    question: 'Quais formas de pagamento são aceitas?',
    answer:
      'Aceitamos cartão de crédito, boleto bancário e PIX. Para planos anuais, oferecemos parcelamento em até 12x no cartão de crédito.',
  },
  {
    question: 'Meus dados estão seguros?',
    answer:
      'Sim. Utilizamos criptografia SSL/TLS em todas as comunicações, backups automáticos diários e armazenamento em servidores seguros. Seus dados são protegidos de acordo com a LGPD (Lei Geral de Proteção de Dados).',
  },
  {
    question: 'Preciso instalar algo no computador?',
    answer:
      'Não. O CRM IMOB é 100% online e funciona diretamente no navegador. Basta acessar pelo computador, tablet ou celular. Não é necessário instalar nenhum software.',
  },
  {
    question: 'Posso cancelar a qualquer momento?',
    answer:
      'Sim, você pode cancelar sua assinatura a qualquer momento sem multa ou taxa de cancelamento. Após o cancelamento, você continua tendo acesso até o final do período já pago.',
  },
  {
    question: 'Como funciona a integração com WhatsApp?',
    answer:
      'A integração com WhatsApp está disponível no plano Professional. Ela permite enviar mensagens automáticas, notificações de pagamento e acompanhar conversas diretamente pelo CRM, usando o WhatsApp Web integrado ao sistema.',
  },
  {
    question: 'O que acontece se eu atingir o limite de clientes?',
    answer:
      'Ao atingir o limite do seu plano, você receberá uma notificação para fazer upgrade. Seus dados existentes continuam acessíveis normalmente, mas não será possível cadastrar novos clientes até liberar espaço ou fazer upgrade.',
  },
];

// ─── Componentes Auxiliares ─────────────────────────────────────────

function PricingToggle({ isYearly, onToggle }) {
  return (
    <div className="flex items-center justify-center gap-4">
      <span
        className={`text-sm font-medium transition-colors ${
          !isYearly ? 'text-white' : 'text-gray-400'
        }`}
      >
        Mensal
      </span>
      <button
        onClick={onToggle}
        className="relative w-16 h-8 rounded-full bg-caixa-secondary border border-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-caixa-orange focus:ring-offset-2 focus:ring-offset-caixa-primary"
        aria-label="Alternar entre plano mensal e anual"
      >
        <motion.div
          className="absolute top-1 w-6 h-6 rounded-full bg-caixa-orange"
          animate={{ left: isYearly ? '2.125rem' : '0.25rem' }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      </button>
      <span
        className={`text-sm font-medium transition-colors ${
          isYearly ? 'text-white' : 'text-gray-400'
        }`}
      >
        Anual
      </span>
      {isYearly && (
        <motion.span
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="ml-1 px-2.5 py-0.5 text-xs font-bold rounded-full bg-green-500/20 text-green-400 border border-green-500/30"
        >
          ~17% OFF
        </motion.span>
      )}
    </div>
  );
}

function PlanCard({ plan, isYearly, index }) {
  const price = isYearly ? plan.priceYearly : plan.priceMonthly;
  const period = isYearly ? '/ano' : '/mês';
  const Icon = plan.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.15 }}
      whileHover={{ y: -8, transition: { duration: 0.25 } }}
      className={`relative flex flex-col rounded-2xl border p-8 ${
        plan.highlighted
          ? 'border-caixa-orange bg-gradient-to-b from-caixa-secondary to-caixa-primary shadow-lg shadow-orange-500/10 scale-[1.02] lg:scale-105'
          : 'border-gray-700/50 bg-caixa-secondary/50 hover:border-gray-600'
      }`}
    >
      {plan.badge && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center gap-1 px-4 py-1 text-xs font-bold rounded-full bg-caixa-orange text-white shadow-lg">
            <Star className="w-3 h-3" />
            {plan.badge}
          </span>
        </div>
      )}

      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div
            className={`p-2 rounded-lg ${
              plan.highlighted
                ? 'bg-caixa-orange/20 text-caixa-orange'
                : 'bg-gray-700/50 text-gray-400'
            }`}
          >
            <Icon className="w-5 h-5" />
          </div>
          <h3 className="text-xl font-bold text-white">{plan.name}</h3>
        </div>
        <p className="text-sm text-gray-400">{plan.description}</p>
      </div>

      <div className="mb-6">
        <div className="flex items-baseline gap-1">
          <span className="text-sm text-gray-400">R$</span>
          <AnimatePresence mode="wait">
            <motion.span
              key={price}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="text-4xl font-extrabold text-white"
            >
              {price.toLocaleString('pt-BR')}
            </motion.span>
          </AnimatePresence>
          {price > 0 && (
            <span className="text-sm text-gray-400">{period}</span>
          )}
        </div>
        {isYearly && plan.priceMonthly > 0 && (
          <p className="mt-1 text-xs text-gray-500 line-through">
            R$ {(plan.priceMonthly * 12).toLocaleString('pt-BR')}/ano
          </p>
        )}
      </div>

      <div className="mb-6 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
          Limites
        </p>
        {Object.entries(plan.limits).map(([key, value]) => {
          const { label, icon: LimitIcon } = LIMIT_LABELS[key];
          return (
            <div key={key} className="flex items-center gap-2 text-sm text-gray-300">
              <LimitIcon className="w-4 h-4 text-gray-500 flex-shrink-0" />
              <span>
                <span className="font-semibold text-white">{value}</span> {label}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mb-8 space-y-2.5 flex-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
          Funcionalidades
        </p>
        {Object.entries(plan.features).map(([key, enabled]) => {
          const { label } = FEATURE_LABELS[key];
          return (
            <div key={key} className="flex items-center gap-2 text-sm">
              {enabled ? (
                <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
              ) : (
                <X className="w-4 h-4 text-gray-600 flex-shrink-0" />
              )}
              <span className={enabled ? 'text-gray-300' : 'text-gray-600'}>
                {label}
              </span>
            </div>
          );
        })}
      </div>

      <Link
        to={plan.ctaLink}
        className={`block w-full text-center py-3 px-6 rounded-xl font-semibold text-sm transition-all duration-200 ${
          plan.highlighted
            ? 'bg-caixa-orange text-white hover:bg-orange-600 shadow-lg shadow-orange-500/25'
            : 'bg-white/10 text-white hover:bg-white/20 border border-gray-600'
        }`}
      >
        {plan.cta}
      </Link>
    </motion.div>
  );
}

function ComparisonTable() {
  const planNames = ['Free', 'Basic', 'Professional'];

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-100px' }}
      transition={{ duration: 0.6 }}
      className="overflow-x-auto"
    >
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-gray-700">
            <th className="py-4 px-4 text-left text-gray-400 font-medium w-1/3">
              Funcionalidade
            </th>
            {planNames.map((name) => (
              <th
                key={name}
                className="py-4 px-4 text-center text-white font-semibold"
              >
                {name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {COMPARISON_ROWS.map((row, i) => {
            if (row.section) {
              return (
                <tr key={`section-${i}`}>
                  <td
                    colSpan={4}
                    className="pt-6 pb-2 px-4 text-xs font-bold uppercase tracking-wider text-caixa-orange"
                  >
                    {row.section}
                  </td>
                </tr>
              );
            }
            return (
              <tr
                key={row.key}
                className="border-b border-gray-800 hover:bg-white/[0.02] transition-colors"
              >
                <td className="py-3 px-4 text-gray-300">{row.label}</td>
                {row.values.map((val, j) => (
                  <td key={j} className="py-3 px-4 text-center">
                    {typeof val === 'boolean' ? (
                      val ? (
                        <Check className="w-4 h-4 text-green-400 mx-auto" />
                      ) : (
                        <X className="w-4 h-4 text-gray-600 mx-auto" />
                      )
                    ) : (
                      <span className="text-white font-medium">{val}</span>
                    )}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </motion.div>
  );
}

function FAQItem({ item, isOpen, onToggle }) {
  return (
    <div className="border-b border-gray-800">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between py-5 px-1 text-left group focus:outline-none"
        aria-expanded={isOpen}
      >
        <span className="text-white font-medium group-hover:text-caixa-orange transition-colors pr-4">
          {item.question}
        </span>
        {isOpen ? (
          <ChevronUp className="w-5 h-5 text-caixa-orange flex-shrink-0" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-500 flex-shrink-0" />
        )}
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <p className="pb-5 px-1 text-gray-400 text-sm leading-relaxed">
              {item.answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Componente Principal ───────────────────────────────────────────

export default function PrecosPage() {
  const [isYearly, setIsYearly] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-caixa-primary via-caixa-secondary to-caixa-primary font-['Plus_Jakarta_Sans']">
      {/* Voltar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Link>
      </div>

      {/* Header */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-12 text-center">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-4xl sm:text-5xl font-extrabold text-white mb-4"
        >
          Escolha seu Plano
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-lg text-gray-400 max-w-2xl mx-auto mb-10"
        >
          O CRM completo para corretores e imobiliárias. Gerencie clientes,
          imóveis, aluguéis e pagamentos em um só lugar.
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <PricingToggle
            isYearly={isYearly}
            onToggle={() => setIsYearly(!isYearly)}
          />
        </motion.div>
      </section>

      {/* Plan Cards */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-4 items-start">
          {PLANS.map((plan, i) => (
            <PlanCard key={plan.id} plan={plan} isYearly={isYearly} index={i} />
          ))}
        </div>
      </section>

      {/* Comparison Table */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-2xl sm:text-3xl font-bold text-white text-center mb-10"
        >
          Comparação Detalhada
        </motion.h2>
        <div className="rounded-2xl border border-gray-700/50 bg-caixa-secondary/30 p-4 sm:p-6">
          <ComparisonTable />
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-2xl sm:text-3xl font-bold text-white text-center mb-10"
        >
          Perguntas Frequentes
        </motion.h2>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="rounded-2xl border border-gray-700/50 bg-caixa-secondary/30 p-6 sm:p-8"
        >
          {FAQ_ITEMS.map((item, i) => (
            <FAQItem
              key={i}
              item={item}
              isOpen={openFaq === i}
              onToggle={() => toggleFaq(i)}
            />
          ))}
        </motion.div>
      </section>

      {/* CTA Final */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="rounded-2xl border border-caixa-orange/30 bg-gradient-to-r from-caixa-orange/10 to-transparent p-10 sm:p-14"
        >
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
            Pronto para transformar sua gestão imobiliária?
          </h2>
          <p className="text-gray-400 mb-8 max-w-xl mx-auto">
            Comece gratuitamente e faça upgrade quando quiser. Sem compromisso,
            sem cartão de crédito.
          </p>
          <Link
            to="/registro"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-caixa-orange text-white font-semibold hover:bg-orange-600 transition-colors shadow-lg shadow-orange-500/25"
          >
            Começar Agora
          </Link>
        </motion.div>
      </section>
    </div>
  );
}
