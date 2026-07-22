import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Navbar from '../components/Navbar';
import { Link } from 'react-router-dom';

const selectClass = 'mr-4 px-3 py-2 rounded-md bg-gray-800 border border-gray-600 text-white';
const inputClass = 'mr-4 px-3 py-2 rounded-md bg-gray-800 border border-gray-600 text-white';
const btnPrimary = 'mr-4 px-4 py-2 rounded-md font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors';
const btnSecondary = 'mr-2 px-4 py-2 rounded-md font-medium text-white bg-gray-600 hover:bg-gray-700 transition-colors';

const ListaProcessos = () => {
    const [processos, setProcessos] = useState([]);
    const [tipo, setTipo] = useState('Todos os tipos');
    const [responsavel, setResponsavel] = useState('Todos os responsáveis');
    const [proprietario, setProprietario] = useState('Todos os proprietários');
    const [progresso, setProgresso] = useState('Todos os progressos');
    const [opcoes, setOpcoes] = useState('Todas as opções');
    const [dataInicio, setDataInicio] = useState('');
    const [dataFim, setDataFim] = useState('');

    useEffect(() => {
        const fetchProcessos = async () => {
            try {
                const response = await axios.get('/api/processos', {
                    params: {
                        tipo,
                        responsavel,
                        proprietario,
                        progresso,
                        opcoes,
                        dataInicio,
                        dataFim
                    }
                });
                setProcessos(response.data);
            } catch (error) {
                console.error('Erro ao buscar processos:', error);
            }
        };

        fetchProcessos();
    }, [tipo, responsavel, proprietario, progresso, opcoes, dataInicio, dataFim]);

    return (
        <div className='bg-gray-900 min-h-screen'>
            <Navbar />
            <div className='p-8 text-white'>
                <h1 className='text-3xl font-bold mb-8'>Lista de Processos</h1>
                <div className='mb-8 flex flex-wrap items-center'>
                    <div className="mr-4">
                        <label className="block text-xs mb-1">Tipo</label>
                        <select className={selectClass} value={tipo} onChange={(e) => setTipo(e.target.value)}>
                            <option value='Todos os tipos'>Todos os tipos</option>
                        </select>
                    </div>
                    <div className="mr-4">
                        <label className="block text-xs mb-1">Responsável</label>
                        <select className={selectClass} value={responsavel} onChange={(e) => setResponsavel(e.target.value)}>
                            <option value='Todos os responsáveis'>Todos os responsáveis</option>
                        </select>
                    </div>
                    <div className="mr-4">
                        <label className="block text-xs mb-1">Proprietário</label>
                        <select className={selectClass} value={proprietario} onChange={(e) => setProprietario(e.target.value)}>
                            <option value='Todos os proprietários'>Todos os proprietários</option>
                        </select>
                    </div>
                    <div className="mr-4">
                        <label className="block text-xs mb-1">Progresso</label>
                        <select className={selectClass} value={progresso} onChange={(e) => setProgresso(e.target.value)}>
                            <option value='Todos os progressos'>Todos os progressos</option>
                        </select>
                    </div>
                    <div className="mr-4">
                        <label className="block text-xs mb-1">Opções Selecionadas</label>
                        <select className={selectClass} value={opcoes} onChange={(e) => setOpcoes(e.target.value)}>
                            <option value='Todas as opções'>Todas as opções</option>
                        </select>
                    </div>
                    <div className="mr-4">
                        <label className="block text-xs mb-1">Data de Início</label>
                        <input type="date" className={inputClass} value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
                    </div>
                    <div className="mr-4">
                        <label className="block text-xs mb-1">Data de Fim</label>
                        <input type="date" className={inputClass} value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
                    </div>
                    <Link to='/processos/adicionar' className={btnPrimary}>Adicionar Processo</Link>
                    <button className={btnSecondary}>Baixar Ficha</button>
                </div>
                <div className="overflow-x-auto bg-gray-800 rounded-md">
                    <table className="min-w-full text-left">
                        <thead>
                            <tr className="border-b border-gray-700">
                                <th className="p-3">Cliente</th>
                                <th className="p-3">Tipo</th>
                                <th className="p-3">Status</th>
                                <th className="p-3">Notas</th>
                                <th className="p-3">Corretor Responsável</th>
                                <th className="p-3">Proprietário</th>
                                <th className="p-3">Data de Início</th>
                                <th className="p-3">Data de Finalização</th>
                                <th className="p-3">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {processos.map((processo) => (
                                <tr key={processo.id} className="border-b border-gray-700">
                                    <td className="p-3">{processo.cliente}</td>
                                    <td className="p-3">{processo.tipo}</td>
                                    <td className="p-3">{processo.status}</td>
                                    <td className="p-3">{processo.notas}</td>
                                    <td className="p-3">{processo.corretorResponsavel}</td>
                                    <td className="p-3">{processo.proprietario}</td>
                                    <td className="p-3">{new Date(processo.dataInicio).toLocaleDateString()}</td>
                                    <td className="p-3">{new Date(processo.dataFinalizacao).toLocaleDateString()}</td>
                                    <td className="p-3">
                                        <Link to={`/processos/editar/${processo.id}`} className={btnPrimary}>Editar</Link>
                                        <button className={btnSecondary}>Excluir</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ListaProcessos;
