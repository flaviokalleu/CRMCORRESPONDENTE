// src/config.js

import axios from "axios";
import { useEffect, useState } from "react";

export const API_URL =
  process.env.REACT_APP_API_URL || "http://localhost:5000/api/";

// Hook para buscar dados mensais de clientes
export const useFetchMonthlyClients = () => {
  const [barChartData, setBarChartData] = useState({
    labels: [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ],
    datasets: [
      {
        label: "Clientes Cadastrados",
        data: Array(12).fill(0),
        backgroundColor: (context) => {
          const chart = context.chart;
          const { ctx, data } = chart;
          const gradient = ctx.createLinearGradient(0, 0, 0, chart.height);
          gradient.addColorStop(0, "#1E3A8A"); // Azul escuro
          gradient.addColorStop(1, "#10B981"); // Verde
          return gradient;
        },
        borderColor: "#fff",
        borderWidth: 1,
        borderRadius: 6,
        hoverBackgroundColor: "#10B981",
        hoverBorderColor: "#fff",
        hoverBorderWidth: 2,
      },
    ],
  });

  useEffect(() => {
    const fetchMonthlyClients = async () => {
      try {
        const response = await axios.get(`${API_URL}/dashboard/monthly`);
        const { monthlyData } = response.data;
        setBarChartData((prevData) => ({
          ...prevData,
          datasets: [
            {
              ...prevData.datasets[0],
              data: monthlyData,
            },
          ],
        }));
      } catch (error) {
        console.error("Erro ao buscar dados mensais de clientes", error);
      }
    };

    fetchMonthlyClients();
  }, []);

  return barChartData;
};

// Hook para buscar dados semanais de clientes
export const useFetchWeeklyClients = () => {
  const [lineChartData, setLineChartData] = useState({
    labels: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    datasets: [
      {
        label: "Clientes Cadastrados",
        data: Array(7).fill(0),
        fill: true,
        borderColor: "rgba(16, 185, 129, 1)", // Verde
        backgroundColor: "rgba(16, 185, 129, 0.2)",
        tension: 0.4,
        pointRadius: 8,
        pointBorderColor: "rgba(16, 185, 129, 1)",
        pointBackgroundColor: "#fff",
        pointHoverRadius: 10,
        pointHoverBackgroundColor: "#fff",
        pointHoverBorderColor: "rgba(16, 185, 129, 1)",
        borderWidth: 2,
        hoverBorderWidth: 3,
      },
    ],
  });

  useEffect(() => {
    const fetchWeeklyClients = async () => {
      try {
        const response = await axios.get(`${API_URL}/dashboard/weekly`);
        const { weeklyData } = response.data;
        setLineChartData((prevData) => ({
          ...prevData,
          datasets: [
            {
              ...prevData.datasets[0],
              data: weeklyData,
            },
          ],
        }));
      } catch (error) {
        console.error("Erro ao buscar dados semanais de clientes", error);
      }
    };

    fetchWeeklyClients();
  }, []);

  return lineChartData;
};

// Opções do gráfico de linha
export const LINE_CHART_OPTIONS = {
  plugins: {
    legend: {
      display: false,
    },
    tooltip: {
      callbacks: {
        label: (context) => `${context.label}: ${context.raw}`,
      },
      backgroundColor: "rgba(0, 0, 0, 0.8)",
      titleColor: "#fff",
      bodyColor: "#fff",
      borderColor: "#fff",
      borderWidth: 1,
    },
    datalabels: {
      color: "#10B981",
      font: { weight: "bold" },
      display: true,
      formatter: (value) => value,
      anchor: "end",
      align: "top",
    },
  },
  scales: {
    x: {
      grid: { color: "#2d2d2d" },
      ticks: { color: "#E4E4E7" },
    },
    y: {
      grid: { color: "#2d2d2d" },
      ticks: { color: "#E4E4E7" },
      beginAtZero: true,
    },
  },
  elements: {
    line: {
      borderWidth: 3,
      borderColor: "linear-gradient(to right, #1E3A8A, #10B981)", // Degradê da linha
      tension: 0.4,
    },
    point: {
      radius: 8,
      borderWidth: 3,
      borderColor: "rgba(16, 185, 129, 1)",
      backgroundColor: "#fff",
    },
  },
};

// Opções do gráfico de barras
export const BAR_CHART_OPTIONS = {
  plugins: {
    legend: {
      display: false,
    },
    tooltip: {
      callbacks: {
        label: (context) => `${context.label}: ${context.raw}`,
      },
      backgroundColor: "rgba(0, 0, 0, 0.8)",
      titleColor: "#fff",
      bodyColor: "#fff",
      bodyFont: { size: 14 },
    },
    datalabels: {
      color: "#fff",
      font: { weight: "bold" },
      display: true,
      formatter: (value) => value,
      anchor: "end",
      align: "top",
    },
  },
  scales: {
    x: {
      grid: { color: "#2d2d2d" },
      ticks: { color: "#E4E4E7" },
    },
    y: {
      grid: { color: "#2d2d2d" },
      ticks: { color: "#E4E4E7" },
      beginAtZero: true,
    },
  },
};
