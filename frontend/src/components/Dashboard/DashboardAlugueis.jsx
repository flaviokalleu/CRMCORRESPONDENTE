import React, { useEffect, useState, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { Line, Doughnut, Bar } from "react-chartjs-2";
import Chart from "chart.js/auto";
import {
  Home, DollarSign, TrendingUp, TrendingDown, Users, AlertTriangle,
  Building, CheckCircle, Clock, PieChart as PieIcon, BarChart3,
  RefreshCw, Loader2
} from "lucide-react";

const DashboardAlugueis = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef(null);

  const fetchDashboard = useCallback(async () => {
    try {
      const authToken = localStorage.getItem('authToken');
      const response = await fetch(`${process.env.REACT_APP_API_URL}/dashboard/alugueis`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        const result = await response.json();
        setData(result);
      }
    } catch (error) {
      console.error("Erro ao carregar dashboard:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
    intervalRef.current = setInterval(fetchDashboard, 30000);
    return () => clearInterval(intervalRef.current);
  }, [fetchDashboard]);

  if (loading || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-caixa-primary via-caixa-secondary to-black flex items-center justify-center">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
          <Loader2 className="w-12 h-12 text-caixa-light animate-spin mx-auto mb-4" />
          <p className="text-white text-lg">Carregando dashboard...</p>
        </motion.div>
      </div>
    );
  }

  const { resumo, receita_mensal, ranking_inadimplentes, distribuicao_pagamentos } = data;

  // Grafico de Receita Mensal (Linha)
  const lineData = {
    labels: receita_mensal.map(m => m.mes_label),
    datasets: [
      {
        label: "Recebido",
        data: receita_mensal.map(m => m.recebido),
        borderColor: "#22c55e",
        backgroundColor: "rgba(34, 197, 94, 0.1)",
        fill: true,
        tension: 0.4,
        pointRadius: 4,
      },
      {
        label: "Previsto",
        data: receita_mensal.map(m => m.previsto),
        borderColor: "#F97316",
        backgroundColor: "rgba(249, 115, 22, 0.1)",
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        borderDash: [5, 5],
      },
    ],
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: "#fff" } },
      tooltip: { mode: "index", intersect: false },
    },
    scales: {
      x: { ticks: { color: "#9ca3af" }, grid: { color: "rgba(255,255,255,0.05)" } },
      y: {
        ticks: {
          color: "#9ca3af",
          callback: (v) => `R$ ${(v / 1000).toFixed(0)}k`,
        },
        grid: { color: "rgba(255,255,255,0.05)" },
      },
    },
  };

  // Grafico de Distribuicao (Doughnut)
  const doughnutData = {
    labels: ["PIX", "Boleto", "Cartao", "Outros"],
    datasets: [{
      data: [
        distribuicao_pagamentos.PIX || 0,
        distribuicao_pagamentos.BOLETO || 0,
        distribuicao_pagamentos.CREDIT_CARD || 0,
        distribuicao_pagamentos.UNDEFINED || 0,
      ],
      backgroundColor: ["#22c55e", "#3b82f6", "#F97316", "#8b5cf6"],
      borderWidth: 0,
    }],
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "bottom", labels: { color: "#fff", padding: 15 } },
    },
    cutout: "65%",
  };

  // Grafico de Inadimplentes (Bar)
  const barData = {
    labels: ranking_inadimplentes.slice(0, 5).map(i => i.nome.split(' ')[0]),
    datasets: [{
      label: "Valor Devido (R$)",
      data: ranking_inadimplentes.slice(0, 5).map(i => i.valor_devido),
      backgroundColor: "rgba(239, 68, 68, 0.7)",
      borderColor: "#ef4444",
      borderWidth: 1,
      borderRadius: 6,
    }],
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { ticks: { color: "#9ca3af" }, grid: { display: false } },
      y: {
        ticks: { color: "#9ca3af", callback: (v) => `R$ ${v}` },
        grid: { color: "rgba(255,255,255,0.05)" },
      },
    },
  };

  const formatCurrency = (v) => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const cards = [
    { title: "Receita do Mes", value: formatCurrency(resumo.receita_total_mes), icon: DollarSign, color: "from-green-500 to-green-600", textColor: "text-green-400" },
    { title: "Inadimplencia", value: formatCurrency(resumo.inadimplencia_mes), icon: TrendingDown, color: "from-red-500 to-red-600", textColor: "text-red-400", subtitle: `${resumo.taxa_inadimplencia}%` },
    { title: "Taxa de Ocupacao", value: `${resumo.taxa_ocupacao}%`, icon: Building, color: "from-blue-500 to-blue-600", textColor: "text-blue-400", subtitle: `${resumo.imoveis_alugados}/${resumo.total_imoveis}` },
    { title: "Inquilinos em Dia", value: `${resumo.inquilinos_em_dia}/${resumo.total_inquilinos}`, icon: CheckCircle, color: "from-purple-500 to-purple-600", textColor: "text-purple-400" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-caixa-primary via-caixa-secondary to-black p-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-caixa-light to-caixa-secondary rounded-xl flex items-center justify-center">
              <Home className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Dashboard de Alugueis</h1>
              <p className="text-caixa-extra-light">Visao financeira em tempo real</p>
            </div>
          </div>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={fetchDashboard} className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-all">
            <RefreshCw className="w-4 h-4" /> Atualizar
          </motion.button>
        </div>
      </motion.div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {cards.map((card, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 hover:bg-white/15 transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 bg-gradient-to-br ${card.color} rounded-xl flex items-center justify-center`}>
                <card.icon className="w-6 h-6 text-white" />
              </div>
              {card.subtitle && <span className="text-sm text-caixa-extra-light">{card.subtitle}</span>}
            </div>
            <p className={`text-2xl font-bold ${card.textColor}`}>{card.value}</p>
            <p className="text-caixa-extra-light text-sm mt-1">{card.title}</p>
          </motion.div>
        ))}
      </div>

      {/* Graficos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Receita Mensal */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="lg:col-span-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-green-400" />
            <h3 className="text-lg font-semibold text-white">Receita Mensal</h3>
          </div>
          <div style={{ height: 300 }}>
            <Line data={lineData} options={lineOptions} />
          </div>
        </motion.div>

        {/* Distribuicao */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <PieIcon className="w-5 h-5 text-blue-400" />
            <h3 className="text-lg font-semibold text-white">Formas de Pagamento</h3>
          </div>
          <div style={{ height: 300 }}>
            <Doughnut data={doughnutData} options={doughnutOptions} />
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Grafico Inadimplentes */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
          className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-red-400" />
            <h3 className="text-lg font-semibold text-white">Top Inadimplentes</h3>
          </div>
          {ranking_inadimplentes.length > 0 ? (
            <div style={{ height: 250 }}>
              <Bar data={barData} options={barOptions} />
            </div>
          ) : (
            <div className="flex items-center justify-center h-48 text-green-400">
              <CheckCircle className="w-6 h-6 mr-2" /> Nenhum inadimplente!
            </div>
          )}
        </motion.div>

        {/* Tabela Inadimplentes */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
          className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-yellow-400" />
            <h3 className="text-lg font-semibold text-white">Ranking de Inadimplencia</h3>
          </div>
          {ranking_inadimplentes.length > 0 ? (
            <div className="space-y-3">
              {ranking_inadimplentes.slice(0, 5).map((item, i) => (
                <div key={item.id} className="flex items-center justify-between bg-white/5 rounded-xl p-3 hover:bg-white/10 transition-all">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-caixa-extra-light w-6">{i + 1}</span>
                    <div>
                      <p className="text-white font-medium text-sm">{item.nome}</p>
                      <p className="text-red-400 text-xs">{item.dias_atraso} dias de atraso</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-red-400 font-bold">{formatCurrency(item.valor_devido)}</p>
                    {item.score_inquilino != null && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        item.score_inquilino >= 80 ? 'bg-green-500/20 text-green-400' :
                        item.score_inquilino >= 60 ? 'bg-yellow-500/20 text-yellow-400' :
                        item.score_inquilino >= 40 ? 'bg-orange-500/20 text-orange-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        Score: {item.score_inquilino}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-48 text-green-400">
              <CheckCircle className="w-6 h-6 mr-2" /> Todos os inquilinos em dia!
            </div>
          )}
        </motion.div>
      </div>

      {/* Previsao */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}
        className="mt-6 bg-gradient-to-r from-caixa-light/20 to-caixa-secondary/20 backdrop-blur-md border border-caixa-light/30 rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-caixa-light" />
            <div>
              <p className="text-caixa-extra-light text-sm">Previsao de Receita - Proximo Mes</p>
              <p className="text-3xl font-bold text-white">{formatCurrency(data.previsao_proximo_mes)}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-caixa-extra-light text-sm">Baseado em {resumo.total_inquilinos} contratos ativos</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default DashboardAlugueis;
