import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

// ─── Design tokens (dark navy theme) ────────────────────────────────────────
export const CARD = 'rgba(255,255,255,0.08)';
export const BORDER = 'rgba(255,255,255,0.12)';
export const ACCENT_GRADIENT = 'linear-gradient(135deg, #F97316, #EA580C)';
export const PALETTE = ['#F97316', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#06b6d4', '#eab308', '#ef4444'];

export const TIP = {
  backgroundColor: 'rgba(11,20,38,0.95)',
  border: '1px solid rgba(255,255,255,0.15)',
  borderRadius: 14,
  color: '#ffffff',
  fontSize: 12,
  fontWeight: 600,
  padding: '10px 14px',
  boxShadow: '0 12px 40px rgba(0,0,0,.35)',
  backdropFilter: 'blur(12px)',
};

export const TICK = { fontSize: 10, fill: 'rgba(255,255,255,0.45)', fontWeight: 500 };

// ─── Motion ───────────────────────────────────────────────────────────────────
export const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [.22, 1, .36, 1] } },
};
export const stagger = { show: { transition: { staggerChildren: 0.05 } } };

// ─── Helpers ──────────────────────────────────────────────────────────────────
export const fmtNum = (n) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n?.toLocaleString('pt-BR') ?? '0';
};

export const fmtPct = (v) => (v === undefined || v === null ? '-' : `${Number(v).toFixed(0)}%`);

export const fmtR$ = (v) =>
  v?.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }) ?? 'R$ 0';

// ─── Custom tooltip ──────────────────────────────────────────────────────────
export const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={TIP}>
      <p className="text-[11px] mb-1.5 opacity-60">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
          <span className="opacity-70">{p.name}:</span>
          <span className="font-bold ml-auto">
            {typeof p.value === 'number' ? p.value.toLocaleString('pt-BR') : p.value}
          </span>
        </div>
      ))}
    </div>
  );
};

// ─── KPI Card (compact) ──────────────────────────────────────────────────────
export const KPICard = memo(({ title, value, sub, icon, accent = '#F97316', trend, index = 0 }) => (
  <motion.div
    variants={fadeUp}
    transition={{ delay: index * 0.03 }}
    className="rounded-xl px-3 py-2.5 cursor-default select-none relative overflow-hidden group backdrop-blur-md"
    style={{ backgroundColor: CARD, border: `1px solid ${BORDER}` }}
  >
    <div className="flex items-center gap-2.5">
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: `${accent}18`, color: accent }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-lg font-black tracking-tight leading-none text-white">{value}</p>
          {trend !== undefined && trend !== 0 && (
            <div
              className={`flex items-center gap-0.5 text-[9px] font-bold px-1 py-0.5 rounded ${
                trend > 0 ? 'text-emerald-400' : 'text-red-400'
              }`}
              style={{ backgroundColor: trend > 0 ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)' }}
            >
              {trend > 0 ? <ArrowUpRight className="w-2.5 h-2.5" /> : <ArrowDownRight className="w-2.5 h-2.5" />}
              {Math.abs(trend).toFixed(0)}%
            </div>
          )}
        </div>
        <p className="text-[10px] font-medium leading-tight mt-0.5 text-white/50">
          {title}
          {sub ? ` · ${sub}` : ''}
        </p>
      </div>
    </div>
  </motion.div>
));
KPICard.displayName = 'KPICard';

// ─── Mini stat (compact) ─────────────────────────────────────────────────────
export const MiniStat = memo(({ icon, label, value, accent = '#F97316' }) => (
  <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg" style={{ backgroundColor: `${accent}08` }}>
    <div
      className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
      style={{ backgroundColor: `${accent}15`, color: accent }}
    >
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-[9px] font-medium leading-none text-white/50">{label}</p>
      <p className="text-xs font-bold leading-tight mt-0.5 text-white">{value}</p>
    </div>
  </div>
));
MiniStat.displayName = 'MiniStat';

// ─── Efficiency ring ─────────────────────────────────────────────────────────
export const EffRing = memo(({ title, value, pct, accent = '#F97316', index = 0 }) => {
  const r = 16;
  const c = 2 * Math.PI * r;
  const dash = (Math.min(100, Math.max(0, pct)) / 100) * c;
  return (
    <motion.div
      variants={fadeUp}
      transition={{ delay: index * 0.04 }}
      className="rounded-xl px-2.5 py-2 flex items-center gap-2 cursor-default backdrop-blur-md"
      style={{ backgroundColor: CARD, border: `1px solid ${BORDER}` }}
    >
      <svg width={40} height={40} viewBox="0 0 40 40" className="flex-shrink-0">
        <circle cx={20} cy={20} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={3.5} />
        <motion.circle
          cx={20}
          cy={20}
          r={r}
          fill="none"
          stroke={accent}
          strokeWidth={3.5}
          strokeLinecap="round"
          transform="rotate(-90 20 20)"
          initial={{ strokeDasharray: `0 ${c}` }}
          animate={{ strokeDasharray: `${dash} ${c}` }}
          transition={{ duration: 1, ease: [.22, 1, .36, 1], delay: index * 0.06 }}
        />
      </svg>
      <div>
        <p className="text-xs font-bold leading-none text-white">{value}</p>
        <p className="text-[9px] font-medium mt-0.5 text-white/50">{title}</p>
      </div>
    </motion.div>
  );
});
EffRing.displayName = 'EffRing';

// ─── Chart card ──────────────────────────────────────────────────────────────
export const ChartCard = memo(({ title, sub, children, className: cls = '', index = 0, icon, extra }) => (
  <motion.div
    variants={fadeUp}
    transition={{ delay: index * 0.05 }}
    className={`rounded-xl overflow-hidden backdrop-blur-md ${cls}`}
    style={{ backgroundColor: CARD, border: `1px solid ${BORDER}` }}
  >
    <div className="flex items-center justify-between px-4 pt-3 pb-0.5">
      <div className="flex items-center gap-2">
        {icon && (
          <div
            className="w-6 h-6 rounded-md flex items-center justify-center"
            style={{ background: ACCENT_GRADIENT }}
          >
            <span className="text-white">{icon}</span>
          </div>
        )}
        <div>
          <p className="text-xs font-bold text-white">{title}</p>
          {sub && <p className="text-[9px] text-white/50">{sub}</p>}
        </div>
      </div>
      {extra}
    </div>
    <div className="px-3 pb-3 pt-1">{children}</div>
  </motion.div>
));
ChartCard.displayName = 'ChartCard';

// ─── Section heading ─────────────────────────────────────────────────────────
export const SectionHeader = memo(({ icon, title, subtitle, extra }) => (
  <motion.div variants={fadeUp} className="flex items-center justify-between pt-1">
    <div className="flex items-center gap-2.5">
      <div
        className="w-7 h-7 rounded-lg flex items-center justify-center"
        style={{ background: ACCENT_GRADIENT }}
      >
        <span className="text-white">{icon}</span>
      </div>
      <div>
        <h2 className="text-[13px] font-bold text-white">{title}</h2>
        {subtitle && <p className="text-[10px] text-white/50">{subtitle}</p>}
      </div>
    </div>
    {extra}
  </motion.div>
));
SectionHeader.displayName = 'SectionHeader';

// ─── Agent/User ranking card ─────────────────────────────────────────────────
export const RankingCard = memo(({ title, icon, items, formatValue, accent = '#F97316', index = 0 }) => {
  const medals = ['#f59e0b', '#94a3b8', '#b45309'];
  return (
    <motion.div
      variants={fadeUp}
      transition={{ delay: index * 0.05 }}
      className="rounded-2xl p-4 backdrop-blur-md"
      style={{ backgroundColor: CARD, border: `1px solid ${BORDER}` }}
    >
      <div className="flex items-center gap-2 mb-3">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${accent}15`, color: accent }}
        >
          {icon}
        </div>
        <p className="text-xs font-bold text-white">{title}</p>
      </div>
      <div className="space-y-2">
        {items.slice(0, 5).map((item, i) => (
          <div key={item.id || i} className="flex items-center gap-2">
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black text-white flex-shrink-0"
              style={{ backgroundColor: medals[i] || '#6b7280' }}
            >
              {i + 1}
            </div>
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
              style={{ background: `linear-gradient(135deg, ${accent}, ${accent}aa)` }}
            >
              {item.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <p className="flex-1 text-xs truncate text-white/70">{item.name}</p>
            <span
              className="text-[11px] font-bold px-2 py-0.5 rounded-md flex-shrink-0"
              style={{ backgroundColor: `${accent}15`, color: accent }}
            >
              {formatValue ? formatValue(item.value) : item.value}
            </span>
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-xs text-center py-3 text-white/40">Sem dados</p>
        )}
      </div>
    </motion.div>
  );
});
RankingCard.displayName = 'RankingCard';

// ─── Loading state ───────────────────────────────────────────────────────────
export const DashboardLoading = ({ title = 'Dashboard' }) => (
  <div className="h-full flex items-center justify-center bg-caixa-gradient min-h-screen">
    <div className="flex flex-col items-center gap-3">
      <div
        className="w-10 h-10 border-3 border-t-transparent rounded-full animate-spin"
        style={{ borderColor: '#F97316', borderTopColor: 'transparent' }}
      />
      <p className="text-xs font-medium text-white/50">Carregando {title}...</p>
    </div>
  </div>
);

// ─── Error state ─────────────────────────────────────────────────────────────
export const DashboardError = ({ error, onRetry }) => (
  <div className="h-full flex items-center justify-center bg-caixa-gradient min-h-screen">
    <div className="text-center">
      <div className="w-12 h-12 mx-auto mb-4 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(239,68,68,0.15)' }}>
        <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      </div>
      <p className="text-sm mb-4 text-white/70">{error || 'Erro ao carregar'}</p>
      <button
        onClick={onRetry}
        className="px-5 py-2.5 rounded-2xl text-sm font-bold text-white"
        style={{ background: ACCENT_GRADIENT }}
      >
        Tentar novamente
      </button>
    </div>
  </div>
);

// ─── Status display helpers ──────────────────────────────────────────────────
export const STATUS_MAP = {
  aguardando_aprovacao: 'Aguardando Aprovação',
  proposta_apresentada: 'Proposta Apresentada',
  documentacao_pendente: 'Documentação Pendente',
  visita_efetuada: 'Visita Efetuada',
  aguardando_cancelamento_qv: 'Aguardando Cancelamento/QV',
  condicionado: 'Condicionado',
  cliente_aprovado: 'Aprovado',
  reprovado: 'Reprovado',
  reserva: 'Reserva',
  conferencia_documento: 'Conferência de Documento',
  nao_descondiciona: 'Não Descondiciona',
  conformidade: 'Conformidade',
  concluido: 'Venda Concluída',
  nao_deu_continuidade: 'Não Deu Continuidade',
  aguardando_reserva_orcamentaria: 'Aguardando Reserva Orçamentária',
  fechamento_proposta: 'Fechamento Proposta',
  processo_em_aberto: 'Processo Aberto',
  aprovado: 'Aprovado',
  em_andamento: 'Em Andamento',
  finalizado: 'Finalizado',
  cancelado: 'Cancelado',
};

export const getStatusDisplay = (status) => STATUS_MAP[status] || status;

export const STATUS_COLORS = {
  aguardando_aprovacao: { bg: 'rgba(234,179,8,0.12)', color: '#eab308' },
  aprovado: { bg: 'rgba(16,185,129,0.12)', color: '#10b981' },
  cliente_aprovado: { bg: 'rgba(16,185,129,0.12)', color: '#10b981' },
  reprovado: { bg: 'rgba(239,68,68,0.12)', color: '#ef4444' },
  concluido: { bg: 'rgba(16,185,129,0.12)', color: '#10b981' },
  cancelado: { bg: 'rgba(107,114,128,0.12)', color: '#6b7280' },
};

export const getStatusColors = (status) =>
  STATUS_COLORS[status] || { bg: 'rgba(249,115,22,0.12)', color: '#F97316' };
