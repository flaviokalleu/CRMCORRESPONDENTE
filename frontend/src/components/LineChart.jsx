// components/LineChart.js
import React from 'react';
import { Line } from 'react-chartjs-2';

const LineChart = ({ data, options }) => {
    return (
        <div className='bg-gray-800 p-6 rounded-lg shadow-lg'>
            <h2 className='text-xl font-semibold mb-4'>Gráfico de Clientes Cadastrados</h2>
            <Line data={data} options={options} />
        </div>
    );
};

export default LineChart;
