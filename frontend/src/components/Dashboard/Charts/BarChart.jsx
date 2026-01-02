// components/BarChart.js
import React from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend
);

const BarChart = ({ data, style }) => {
  // Configuração moderna dos dados para gráfico de barras
  const chartData = {
    labels: data.labels,
    datasets: [
      {
        label: data.datasets[0].label || "Volume",
        data: data.datasets[0].data,
        backgroundColor: (context) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, context.chart.height);
          gradient.addColorStop(0, "rgba(59, 130, 246, 0.8)");
          gradient.addColorStop(0.5, "rgba(99, 102, 241, 0.7)");
          gradient.addColorStop(1, "rgba(139, 92, 246, 0.6)");
          return gradient;
        },
        borderColor: (context) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, context.chart.height);
          gradient.addColorStop(0, "rgba(59, 130, 246, 1)");
          gradient.addColorStop(0.5, "rgba(99, 102, 241, 1)");
          gradient.addColorStop(1, "rgba(139, 92, 246, 1)");
          return gradient;
        },
        borderWidth: 2,
        borderRadius: 8,
        hoverBackgroundColor: (context) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, context.chart.height);
          gradient.addColorStop(0, "rgba(59, 130, 246, 1)");
          gradient.addColorStop(0.5, "rgba(99, 102, 241, 0.9)");
          gradient.addColorStop(1, "rgba(139, 92, 246, 0.8)");
          return gradient;
        },
        hoverBorderColor: "rgba(255, 255, 255, 0.8)",
        barThickness: 'flex',
        maxBarThickness: 50,
      }
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
        align: "end",
        labels: {
          color: "#E2E8F0",
          font: {
            family: "'Inter', 'Segoe UI', sans-serif",
            size: typeof window !== 'undefined' && window.innerWidth < 768 ? 11 : 13,
            weight: "500"
          },
          usePointStyle: true,
          pointStyle: "rectRounded",
          padding: typeof window !== 'undefined' && window.innerWidth < 768 ? 15 : 20,
          boxWidth: typeof window !== 'undefined' && window.innerWidth < 768 ? 8 : 12,
          boxHeight: typeof window !== 'undefined' && window.innerWidth < 768 ? 8 : 12
        }
      },
      tooltip: {
        backgroundColor: "rgba(15, 23, 42, 0.95)",
        titleColor: "#F1F5F9",
        bodyColor: "#E2E8F0",
        borderColor: "rgba(59, 130, 246, 0.5)",
        borderWidth: 1,
        cornerRadius: 12,
        padding: 16,
        displayColors: true,
        titleFont: {
          family: "'Inter', 'Segoe UI', sans-serif",
          size: 14,
          weight: "600"
        },
        bodyFont: {
          family: "'Inter', 'Segoe UI', sans-serif",
          size: 13,
          weight: "400"
        },
        callbacks: {
          title: function(context) {
            return context[0].label;
          },
          label: function(context) {
            const value = context.parsed.y;
            return `${context.dataset.label}: ${value.toLocaleString()}`;
          }
        },
        animation: {
          duration: 300
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: false, // Ocultar grid para um visual mais limpo em barras
        },
        border: {
          display: false
        },
        ticks: {
          color: "#94A3B8",
          font: {
            size: typeof window !== 'undefined' && window.innerWidth < 768 ? 10 : 12,
            family: "'Inter', 'Segoe UI', sans-serif",
            weight: "400"
          },
          maxRotation: typeof window !== 'undefined' && window.innerWidth < 768 ? 45 : 0,
          padding: 8
        }
      },
      y: {
        grid: {
          display: true,
          color: "rgba(148, 163, 184, 0.1)",
          lineWidth: 1,
          drawBorder: false
        },
        border: {
          display: false
        },
        ticks: {
          color: "#94A3B8",
          font: {
            size: typeof window !== 'undefined' && window.innerWidth < 768 ? 10 : 12,
            family: "'Inter', 'Segoe UI', sans-serif",
            weight: "400"
          },
          padding: 8,
          callback: function(value) {
            return value >= 1000 ?
              (value / 1000).toFixed(1) + 'k' :
              value.toLocaleString();
          }
        },
        beginAtZero: true
      }
    },
    interaction: {
      intersect: false,
      mode: "index"
    },
    animation: {
      duration: 1500,
      easing: "easeInOutCubic",
      delay: (context) => {
        return context.type === 'data' && context.mode === 'default' ?
          context.dataIndex * 100 : 0;
      }
    },
    hover: {
      animationDuration: 200
    }
  };

  return (
    <div className="relative w-full h-full">
      <Bar data={chartData} options={options} style={style} />

      {/* Efeito de fundo sutil */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-800/10 via-slate-900/5 to-transparent rounded-xl pointer-events-none"></div>
    </div>
  );
};

export default BarChart;
