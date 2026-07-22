// components/BarChart.js
import React from 'react';
import { Bar } from 'react-chartjs-2';

const BarChart = ({ data, options }) => {
    return (
        <div className='bg-gray-800 p-6 rounded-lg shadow-lg'>
            <h2 className='text-xl font-semibold mb-4'>Gráfico de Clientes por Mês</h2>
            <Bar data={data} options={options} />
        </div>
    );
};

export default BarChart;
