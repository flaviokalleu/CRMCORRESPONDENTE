// components/LineChart.js
import React, { useEffect, useRef, useState } from 'react';
import Chart from 'chart.js/auto';
import { motion } from 'framer-motion';
import { TrendingUp, BarChart3, Activity, Zap } from 'lucide-react';

const LineChart = ({ data, style, showComparison = false }) => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    average: 0,
    peak: 0,
    trend: 0
  });

  useEffect(() => {
    if (!data || !data.datasets || !data.datasets[0] || !data.datasets[0].data) {
      setIsLoading(false);
      return;
    }

    const ctx = chartRef.current.getContext('2d');

    // Calcular estatísticas dos dados
    const dataPoints = data.datasets[0].data || [];
    const total = dataPoints.reduce((a, b) => a + b, 0);
    const average = dataPoints.length > 0 ? Math.round(total / dataPoints.length) : 0;
    const peak = Math.max(...dataPoints);
    const trend = dataPoints.length > 1 ? 
      Math.round(((dataPoints[dataPoints.length - 1] - dataPoints[0]) / dataPoints[0]) * 100) || 0 : 0;

    setStats({ total, average, peak, trend });

    // Destruir gráfico anterior se existir
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    // Criar gradiente para o fundo da área
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(255, 140, 0, 0.3)');
    gradient.addColorStop(0.5, 'rgba(27, 79, 114, 0.2)');
    gradient.addColorStop(1, 'rgba(27, 79, 114, 0.05)');

    // Gradiente para a linha
    const lineGradient = ctx.createLinearGradient(0, 0, 0, 400);
    lineGradient.addColorStop(0, '#FF8C00');
    lineGradient.addColorStop(0.3, '#FFB347');
    lineGradient.addColorStop(0.7, '#1B4F72');
    lineGradient.addColorStop(1, '#2980B9');

    // Configurar dados do gráfico com design aprimorado
    const chartData = {
      labels: data.labels || [],
      datasets: data.datasets.map((dataset, index) => ({
        label: dataset.label || 'Dados',
        data: dataset.data || [],
        backgroundColor: index === 0 ? gradient : dataset.backgroundColor,
        borderColor: index === 0 ? lineGradient : dataset.borderColor,
        borderWidth: 4,
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#FF8C00',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 3,
        pointRadius: 8,
        pointHoverRadius: 12,
        pointHoverBackgroundColor: '#FF8C00',
        pointHoverBorderColor: '#ffffff',
        pointHoverBorderWidth: 4,
        pointHitRadius: 15,
        // Adicionar sombra aos pontos
        pointShadowColor: 'rgba(255, 140, 0, 0.3)',
        pointShadowBlur: 10
      }))
    };

    chartInstance.current = new Chart(ctx, {
      type: 'line',
      data: chartData,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          intersect: false,
          mode: 'index'
        },
        layout: {
          padding: {
            top: 20,
            bottom: 20,
            left: 10,
            right: 10
          }
        },
        plugins: {
          legend: {
            display: false // Vamos criar nossa própria legenda customizada
          },
          tooltip: {
            enabled: true,
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            titleColor: '#FF8C00',
            bodyColor: '#ffffff',
            borderColor: '#FF8C00',
            borderWidth: 2,
            cornerRadius: 12,
            displayColors: false,
            titleFont: {
              size: 14,
              weight: 'bold'
            },
            bodyFont: {
              size: 13,
              weight: '500'
            },
            padding: 12,
            caretSize: 8,
            callbacks: {
              title: function(context) {
                return `📊 ${context[0].label}`;
              },
              label: function(context) {
                const value = context.parsed.y;
                const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                return [`${context.dataset.label}: ${value} clientes`, `Representa: ${percentage}% do total`];
              },
              afterLabel: function(context) {
                const currentIndex = context.dataIndex;
                const previousValue = currentIndex > 0 ? context.dataset.data[currentIndex - 1] : 0;
                const currentValue = context.parsed.y;
                const change = currentValue - previousValue;
                
                if (currentIndex > 0) {
                  const changeText = change > 0 ? `+${change}` : `${change}`;
                  const icon = change > 0 ? '📈' : change < 0 ? '📉' : '➡️';
                  return `${icon} Mudança: ${changeText}`;
                }
                return '';
              }
            }
          }
        },
        scales: {
          x: {
            grid: {
              display: true,
              color: 'rgba(255, 255, 255, 0.08)',
              lineWidth: 1,
              drawBorder: false
            },
            ticks: {
              color: 'rgba(255, 255, 255, 0.8)',
              font: {
                size: 12,
                weight: '600'
              },
              padding: 10
            },
            border: {
              display: false
            }
          },
          y: {
            beginAtZero: true,
            grid: {
              display: true,
              color: 'rgba(255, 255, 255, 0.08)',
              lineWidth: 1,
              drawBorder: false
            },
            ticks: {
              color: 'rgba(255, 255, 255, 0.8)',
              font: {
                size: 12,
                weight: '600'
              },
              padding: 15,
              callback: function(value) {
                return Number.isInteger(value) ? value : '';
              }
            },
            border: {
              display: false
            }
          }
        },
        animation: {
          duration: 1500,
          easing: 'easeInOutCubic',
          delay: (context) => {
            return context.type === 'data' && context.mode === 'default' 
              ? context.dataIndex * 100 
              : 0;
          }
        },
        elements: {
          point: {
            hoverRadius: 12,
            hitRadius: 15
          },
          line: {
            borderJoinStyle: 'round',
            borderCapStyle: 'round'
          }
        }
      }
    });

    // Adicionar animação de entrada
    setTimeout(() => {
      setIsLoading(false);
    }, 800);

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [data]);

  // Se não há dados, mostrar placeholder elegante
  if (!data || !data.datasets || !data.datasets[0] || !data.datasets[0].data || data.datasets[0].data.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex items-center justify-center h-full"
      >
        <div className="text-center">
          {/* Container com gradiente animado */}
          <motion.div 
            className="relative w-40 h-40 rounded-3xl mx-auto mb-6 overflow-hidden"
            animate={{ 
              background: [
                'linear-gradient(45deg, rgba(27, 79, 114, 0.1), rgba(255, 140, 0, 0.1))',
                'linear-gradient(45deg, rgba(255, 140, 0, 0.1), rgba(27, 79, 114, 0.1))',
                'linear-gradient(45deg, rgba(27, 79, 114, 0.1), rgba(255, 140, 0, 0.1))'
              ]
            }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            {/* Borda animada */}
            <div className="absolute inset-0 rounded-3xl border-2 border-dashed border-caixa-primary/30"></div>
            
            {/* Ícone central */}
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                className="text-caixa-orange/60"
              >
                <BarChart3 size={48} />
              </motion.div>
            </div>

            {/* Partículas flutuantes */}
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 bg-caixa-orange/30 rounded-full"
                style={{
                  left: `${20 + (i * 12)}%`,
                  top: `${30 + (i % 2) * 40}%`
                }}
                animate={{ 
                  y: [-10, 10, -10],
                  opacity: [0.3, 0.8, 0.3]
                }}
                transition={{ 
                  duration: 2 + (i * 0.3), 
                  repeat: Infinity,
                  delay: i * 0.2
                }}
              />
            ))}
          </motion.div>

          {/* Textos com animação */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <h3 className="text-white text-xl font-bold mb-2">📊 Aguardando Dados</h3>
            <p className="text-caixa-extra-light text-base mb-4">
              Cadastre alguns clientes para visualizar os gráficos
            </p>
            
            {/* Botão de ação sugestivo */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-caixa-orange/20 to-caixa-primary/20 
                       rounded-xl border border-caixa-orange/30 text-caixa-light cursor-pointer 
                       hover:from-caixa-orange/30 hover:to-caixa-primary/30 transition-all duration-300"
            >
              <Activity size={16} />
              <span className="text-sm font-medium">Começar a cadastrar</span>
            </motion.div>
          </motion.div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative w-full h-full"
    >
      {/* Header com estatísticas em tempo real */}
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2 }}
        className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between mb-4"
      >
        {/* Legenda customizada */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-caixa-orange/20 to-transparent rounded-lg border border-caixa-orange/30">
            <div className="w-3 h-3 rounded-full bg-gradient-to-r from-caixa-orange to-caixa-secondary"></div>
            <span className="text-white text-sm font-medium">{data.datasets[0]?.label || 'Clientes'}</span>
          </div>
        </div>

        {/* Mini estatísticas */}
        <div className="flex items-center gap-4">
          {/* Total */}
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="flex items-center gap-1 px-2 py-1 bg-caixa-primary/30 rounded-lg"
          >
            <BarChart3 size={14} className="text-caixa-orange" />
            <span className="text-white text-xs font-bold">{stats.total}</span>
          </motion.div>

          {/* Média */}
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="flex items-center gap-1 px-2 py-1 bg-caixa-secondary/30 rounded-lg"
          >
            <Activity size={14} className="text-caixa-light" />
            <span className="text-white text-xs font-bold">~{stats.average}</span>
          </motion.div>

          {/* Tendência */}
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-green-500/20 to-transparent rounded-lg"
          >
            <TrendingUp size={14} className="text-green-400" />
            <span className="text-white text-xs font-bold">
              {stats.trend > 0 ? '+' : ''}{stats.trend}%
            </span>
          </motion.div>
        </div>
      </motion.div>

      {/* Loading overlay */}
      {isLoading && (
        <motion.div
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          className="absolute inset-0 z-20 flex items-center justify-center bg-gradient-to-br from-caixa-primary/20 to-transparent rounded-2xl"
        >
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="text-caixa-orange"
            >
              <Zap size={24} />
            </motion.div>
            <span className="text-white font-medium">Carregando gráfico...</span>
          </div>
        </motion.div>
      )}

      {/* Canvas do gráfico */}
      <div className="relative mt-16 h-full">
        <canvas ref={chartRef} />
      </div>

      {/* Indicador de pico */}
      {stats.peak > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.5, type: "spring" }}
          className="absolute bottom-4 right-4 flex items-center gap-2 px-3 py-2 
                   bg-gradient-to-r from-caixa-orange/20 to-red-500/20 rounded-xl 
                   border border-caixa-orange/30 backdrop-blur-sm"
        >
          <div className="w-2 h-2 bg-caixa-orange rounded-full animate-pulse"></div>
          <span className="text-white text-xs font-bold">Pico: {stats.peak}</span>
        </motion.div>
      )}
    </motion.div>
  );
};

export default LineChart;
