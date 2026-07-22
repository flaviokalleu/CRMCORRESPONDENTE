import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Cliente = () => {
    const [clientes, setClientes] = useState([]);
    const [status, setStatus] = useState('');
    const [corretor, setCorretor] = useState('');
    const [dataInicio, setDataInicio] = useState('');
    const [dataFim, setDataFim] = useState('');

    useEffect(() => {
        const fetchClientes = async () => {
            try {
                const response = await axios.get('/api/clientes', {
                    params: {
                        status,
                        corretor,
                        dataInicio,
                        dataFim
                    }
                }); // Substitua pela URL real da API
                setClientes(response.data);
            } catch (error) {
                console.error('Error fetching clientes:', error);
            }
        };

        fetchClientes();
    }, [status, corretor, dataInicio, dataFim]);

    return (
        <div className='p-6 bg-gray-900 min-h-screen text-white flex flex-col items-center'>
            <h1 className='text-4xl font-bold mb-8'>Clientes</h1>
            <div className='bg-gray-800 p-6 rounded-lg shadow-lg w-full'>
                {/* Filtros */}
                <div className='mb-6'>
                    <div className='flex flex-wrap gap-4'>
                        <div className='flex flex-col'>
                            <label htmlFor='status' className='text-sm font-medium text-gray-400 mb-2'>Status:</label>
                            <select
                                id='status'
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                                className='p-2 bg-gray-700 border border-gray-600 rounded'
                            >
                                <option value=''>Todos</option>
                                <option value='ativo'>Ativo</option>
                                <option value='inativo'>Inativo</option>
                            </select>
                        </div>
                        <div className='flex flex-col'>
                            <label htmlFor='corretor' className='text-sm font-medium text-gray-400 mb-2'>Corretor:</label>
                            <input
                                id='corretor'
                                type='text'
                                value={corretor}
                                onChange={(e) => setCorretor(e.target.value)}
                                className='p-2 bg-gray-700 border border-gray-600 rounded'
                                placeholder='Nome do corretor'
                            />
                        </div>
                        <div className='flex flex-col'>
                            <label htmlFor='dataInicio' className='text-sm font-medium text-gray-400 mb-2'>Data Início:</label>
                            <input
                                id='dataInicio'
                                type='date'
                                value={dataInicio}
                                onChange={(e) => setDataInicio(e.target.value)}
                                className='p-2 bg-gray-700 border border-gray-600 rounded'
                            />
                        </div>
                        <div className='flex flex-col'>
                            <label htmlFor='dataFim' className='text-sm font-medium text-gray-400 mb-2'>Data Fim:</label>
                            <input
                                id='dataFim'
                                type='date'
                                value={dataFim}
                                onChange={(e) => setDataFim(e.target.value)}
                                className='p-2 bg-gray-700 border border-gray-600 rounded'
                            />
                        </div>
                    </div>
                </div>
                {/* Tabela */}
                <div className='bg-gray-800 p-6 rounded-lg shadow-lg'>
                    <table className='min-w-full divide-y divide-gray-700'>
                        <thead>
                            <tr>
                                <th className='px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider'>
                                    Nome
                                </th>
                                <th className='px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider'>
                                    E-mail
                                </th>
                                <th className='px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider'>
                                    Telefone
                                </th>
                            </tr>
                        </thead>
                        <tbody className='bg-gray-800 divide-y divide-gray-700'>
                            {clientes.length > 0 ? (
                                clientes.map(cliente => (
                                    <tr key={cliente.id}>
                                        <td className='px-6 py-4 whitespace-nowrap text-center text-sm font-medium text-gray-300'>
                                            {cliente.name}
                                        </td>
                                        <td className='px-6 py-4 whitespace-nowrap text-center text-sm text-gray-400'>
                                            {cliente.email}
                                        </td>
                                        <td className='px-6 py-4 whitespace-nowrap text-center text-sm text-gray-400'>
                                            {cliente.phone}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan='3' className='px-6 py-4 text-center text-sm text-gray-500'>
                                        Nenhum cliente encontrado
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Cliente;
