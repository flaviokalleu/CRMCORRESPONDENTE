import React, { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, CartesianGrid,
} from 'recharts';
import {
  DollarSign, TrendingUp, Percent, Users, Package,
  Truck, Loader2, AlertTriangle, CalendarDays,
} from 'lucide-react';

// Paleta de cores para graficos
const CHART_COLORS = [
  '#F97316', // laranja principal
  '#3B82F6', // azul info
  '#10B981', // verde
  '#F59E0B', // amarelo
  '#EF4444', // vermelho
  '#8B5CF6', // roxo
  '#EC4899', // rosa
  '#06B6D4', // ciano
];

// Tooltip customizado em portugues
const CustomTooltip = ({ active, payload, label, prefix = '', suffix = '' }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-xl px-4 py-3 shadow-2xl">
      {label && <p className="text-white/60 text-xs mb-1">{label}</p>}
      {payload.map((entry, i) => (
        <p key={i} className="text-white text-sm font-semibold">
          {prefix}{typeof entry.value === 'number'
            ? entry.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })
            : entry.value}{suffix}
        </p>
      ))}
    </div>
  );
};

// Tooltip para PieChart
const PieTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0];
  return (
    <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-xl px-4 py-3 shadow-2xl">
      <p className="text-white/60 text-xs mb-1">{name}</p>
      <p className="text-white text-sm font-semibold">
        R$ {Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
      </p>
    </div>
  );
};

// Legendas customizadas para PieChart
const CustomLegend = ({ payload }) => (
  <div className="flex flex-wrap justify-center gap-3 mt-3">
    {payload?.map((entry, i) => (
      <div key={i} className="flex items-center gap-1.5">
        <span
          className="inline-block w-2.5 h-2.5 rounded-full"
          style={{ backgroundColor: entry.color }}
        />
        <span className="text-white/70 text-xs">{entry.value}</span>
      </div>
    ))}
  </div>
);

const PERIODOS = [
  { key: 'hoje', label: 'Hoje', icon: CalendarDays },
  { key: 'semana', label: 'Esta Semana', icon: CalendarDays },
  { key: 'mes', label: 'Este Mes', icon: CalendarDays },
  { key: 'ano', label: 'Este Ano', icon: CalendarDays },
];

const formatCurrency = (value) => {
  if (value == null || value === '' || isNaN(value)) return '--';
  return `R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
};

const DashboardFinanceiro = ({ resumo, loading, error }) => {
  const [periodo, setPeriodo] = useState('mes');

  // ----- Estado de carregamento -----
  if (loading) {
    return (
      <div className="min-h-screen bg-caixa-gradient flex items-center justify-center p-4">
        <div className="backdrop-blur-xl bg-white/10 rounded-2xl p-10 border border-white/10 flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-caixa-orange animate-spin" />
          <p className="text-white text-lg font-semibold">Carregando dados financeiros...</p>
          <p className="text-white/60 text-sm">Aguarde um momento</p>
        </div>
      </div>
    );
  }

  // ----- Estado de erro -----
  if (error) {
    return (
      <div className="min-h-screen bg-caixa-gradient flex items-center justify-center p-4">
        <div className="backdrop-blur-xl bg-white/10 rounded-2xl p-10 border border-white/10 flex flex-col items-center gap-4 max-w-md text-center">
          <AlertTriangle className="w-12 h-12 text-caixa-error" />
          <p className="text-white text-lg font-semibold">Ops! Algo deu errado</p>
          <p className="text-white/60 text-sm">
            Nao foi possivel carregar o painel financeiro. Tente novamente em alguns instantes.
          </p>
        </div>
      </div>
    );
  }

  // ----- Valores dos cards -----
  const receita = resumo?.totalReceitas;
  const lucro = resumo?.lucro;
  const ultimoPercentual =
    resumo?.percentualMensal?.length
      ? resumo.percentualMensal[resumo.percentualMensal.length - 1].valor
      : null;

  return (
    <div className="min-h-screen bg-caixa-gradient p-4">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* ===== Cabecalho ===== */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">
              Painel Financeiro
            </h1>
            <p className="text-white/60 text-sm mt-1">
              Acompanhe receitas, margens e desempenho da equipe
            </p>
          </div>

          {/* Filtros de periodo */}
          <div className="flex flex-wrap gap-2">
            {PERIODOS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setPeriodo(key)}
                className={`rounded-xl px-6 py-3 font-semibold text-sm transition-all duration-200 ${
                  periodo === key
                    ? 'bg-caixa-orange text-white shadow-lg shadow-caixa-orange/30'
                    : 'backdrop-blur-xl bg-white/10 text-white/70 border border-white/10 hover:bg-white/20 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* ===== Cards de estatisticas ===== */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

          {/* Receita */}
          <div className="backdrop-blur-xl bg-white/10 rounded-2xl p-6 border border-white/10">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-caixa-orange/20 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-caixa-orange" />
              </div>
              <span className="text-white/60 text-sm font-medium">Receita Total</span>
            </div>
            <div className="text-3xl font-bold text-white mb-4">
              {formatCurrency(receita)}
            </div>
            {resumo?.receitaMensal && (
              <ResponsiveContainer width="100%" height={64}>
                <BarChart data={resumo.receitaMensal}>
                  <Tooltip content={<CustomTooltip prefix="R$ " />} />
                  <Bar dataKey="valor" fill="#F97316" radius={[4, 4, 0, 0]} opacity={0.85} />
                  <XAxis dataKey="mes" hide />
                  <YAxis hide />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Margem Bruta */}
          <div className="backdrop-blur-xl bg-white/10 rounded-2xl p-6 border border-white/10">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
              </div>
              <span className="text-white/60 text-sm font-medium">Margem Bruta</span>
            </div>
            <div className="text-3xl font-bold text-white mb-4">
              {formatCurrency(lucro)}
            </div>
            {resumo?.margemMensal && (
              <ResponsiveContainer width="100%" height={64}>
                <BarChart data={resumo.margemMensal}>
                  <Tooltip content={<CustomTooltip prefix="R$ " />} />
                  <Bar dataKey="valor" fill="#10B981" radius={[4, 4, 0, 0]} opacity={0.85} />
                  <XAxis dataKey="mes" hide />
                  <YAxis hide />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Margem Percentual */}
          <div className="backdrop-blur-xl bg-white/10 rounded-2xl p-6 border border-white/10">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                <Percent className="w-5 h-5 text-amber-400" />
              </div>
              <span className="text-white/60 text-sm font-medium">Margem Percentual</span>
            </div>
            <div className="text-3xl font-bold text-white mb-4">
              {ultimoPercentual != null ? `${ultimoPercentual.toFixed(2)}%` : '--'}
            </div>
            {resumo?.percentualMensal && (
              <ResponsiveContainer width="100%" height={64}>
                <LineChart data={resumo.percentualMensal}>
                  <Tooltip content={<CustomTooltip suffix="%" />} />
                  <Line
                    type="monotone"
                    dataKey="valor"
                    stroke="#F59E0B"
                    strokeWidth={2}
                    dot={false}
                  />
                  <XAxis dataKey="mes" hide />
                  <YAxis hide />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* ===== Graficos em duas colunas ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Receita por Linha de Produto */}
          <div className="backdrop-blur-xl bg-white/10 rounded-2xl p-6 border border-white/10">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-lg bg-caixa-orange/20 flex items-center justify-center">
                <Package className="w-4 h-4 text-caixa-orange" />
              </div>
              <h3 className="text-white font-bold text-base">Receita por Linha de Produto</h3>
            </div>
            {resumo?.receitaPorLinha ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={resumo.receitaPorLinha}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    innerRadius={45}
                    paddingAngle={3}
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                    labelLine={{ stroke: 'rgba(255,255,255,0.3)' }}
                  >
                    {resumo.receitaPorLinha.map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                  <Legend content={<CustomLegend />} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[260px] flex items-center justify-center">
                <p className="text-white/40 text-sm">Sem dados disponiveis</p>
              </div>
            )}
          </div>

          {/* Margem Bruta por Fornecedor */}
          <div className="backdrop-blur-xl bg-white/10 rounded-2xl p-6 border border-white/10">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Truck className="w-4 h-4 text-blue-400" />
              </div>
              <h3 className="text-white font-bold text-base">Margem Bruta por Fornecedor</h3>
            </div>
            {resumo?.margemPorFornecedor ? (
              <div className="space-y-3">
                {resumo.margemPorFornecedor.map((item, idx) => {
                  const maxVal = resumo.margemPorFornecedor[0]?.value || 1;
                  const pct = (item.value / maxVal) * 100;
                  return (
                    <div key={item.name} className="group">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-white/80 text-sm truncate max-w-[60%]">
                          {item.name}
                        </span>
                        <span className="text-white font-semibold text-sm">
                          R$ {(item.value / 1000).toFixed(1)} mil
                        </span>
                      </div>
                      <div className="h-2.5 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: CHART_COLORS[idx % CHART_COLORS.length],
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center">
                <p className="text-white/40 text-sm">Sem dados disponiveis</p>
              </div>
            )}
          </div>
        </div>

        {/* ===== Tabela: Analise por equipe de vendas ===== */}
        <div className="backdrop-blur-xl bg-white/10 rounded-2xl p-6 border border-white/10">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <Users className="w-4 h-4 text-purple-400" />
            </div>
            <h3 className="text-white font-bold text-base">Analise por Equipe de Vendas</h3>
          </div>

          {resumo?.equipeVendas ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="py-3 px-4 text-left text-white/60 font-medium text-xs uppercase tracking-wider">
                      Equipe
                    </th>
                    <th className="py-3 px-4 text-right text-white/60 font-medium text-xs uppercase tracking-wider">
                      Receita
                    </th>
                    <th className="py-3 px-4 text-right text-white/60 font-medium text-xs uppercase tracking-wider">
                      Margem Bruta
                    </th>
                    <th className="py-3 px-4 text-right text-white/60 font-medium text-xs uppercase tracking-wider">
                      Percentual
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {resumo.equipeVendas.map((item, idx) => (
                    <tr
                      key={item.nome}
                      className="border-b border-white/5 hover:bg-white/5 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                            style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] + '33' }}
                          >
                            {idx + 1}
                          </div>
                          <span className="text-white font-medium">{item.nome}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right text-white font-mono">
                        {formatCurrency(item.receita)}
                      </td>
                      <td className="py-3 px-4 text-right text-emerald-400 font-mono">
                        {formatCurrency(item.margem)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center gap-3 justify-end">
                          <div className="w-20 h-2 bg-white/10 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full bg-caixa-orange transition-all duration-500"
                              style={{ width: `${Math.min(item.percentual, 100)}%` }}
                            />
                          </div>
                          <span className="text-caixa-orange font-bold text-sm min-w-[60px] text-right">
                            {Number(item.percentual).toFixed(2)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="h-[200px] flex items-center justify-center">
              <p className="text-white/40 text-sm">Sem dados da equipe disponiveis</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default DashboardFinanceiro;
