import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';

const PieChart = ({ data }) => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    if (!data || !data.datasets || !data.datasets[0] || !data.datasets[0].data) {
      return;
    }

    const ctx = chartRef.current.getContext('2d');

    // Destruir gráfico anterior se existir
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    // Configurar dados do gráfico com validação
    const chartData = {
      labels: data.labels || [],
      datasets: [{
        label: data.datasets[0].label || 'Dados',
        data: data.datasets[0].data || [],
        backgroundColor: data.datasets[0].backgroundColor || [
          "#1B4F72", "#2980B9", "#5DADE2", "#AED6F1",
          "#FF8C00", "#FFB347", "#FF7F00"
        ],
        borderColor: data.datasets[0].borderColor || "#1B4F72",
        borderWidth: data.datasets[0].borderWidth || 2,
        hoverOffset: 10
      }]
    };

    chartInstance.current = new Chart(ctx, {
      type: 'doughnut',
      data: chartData,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: '#ffffff',
              font: {
                size: 12,
                weight: 'bold'
              },
              padding: 20,
              usePointStyle: true,
              pointStyle: 'circle'
            }
          },
          tooltip: {
            enabled: true,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleColor: '#ffffff',
            bodyColor: '#ffffff',
            borderColor: '#FF8C00',
            borderWidth: 1,
            cornerRadius: 8,
            displayColors: true,
            callbacks: {
              label: function(context) {
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = total > 0 ? ((context.parsed * 100) / total).toFixed(1) : 0;
                return `${context.label}: ${context.parsed} (${percentage}%)`;
              }
            }
          }
        },
        cutout: '60%',
        animation: {
          animateRotate: true,
          animateScale: true,
          duration: 1000,
          easing: 'easeInOutQuart'
        },
        elements: {
          arc: {
            borderRadius: 8,
            hoverBorderWidth: 3
          }
        }
      }
    });

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [data]);

  // Se não há dados, mostrar placeholder
  if (!data || !data.datasets || !data.datasets[0] || !data.datasets[0].data || data.datasets[0].data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-32 h-32 rounded-full border-4 border-caixa-primary/30 border-dashed mx-auto mb-4 flex items-center justify-center">
            <div className="text-caixa-primary/50 text-4xl">📊</div>
          </div>
          <p className="text-caixa-extra-light text-lg">Sem dados para exibir</p>
          <p className="text-caixa-primary/70 text-sm mt-2">Cadastre alguns clientes para ver os gráficos</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <canvas ref={chartRef} />
      
      {/* Centro do donut com informação adicional */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="text-center">
          <div className="text-2xl font-bold text-white">
            {data.datasets[0].data.reduce((a, b) => a + b, 0)}
          </div>
          <div className="text-caixa-extra-light text-sm">Total</div>
        </div>
      </div>
    </div>
  );
};

export default PieChart;
