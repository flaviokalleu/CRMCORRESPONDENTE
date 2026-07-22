import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button, Paper, TextField, MenuItem, Select, InputLabel, FormControl } from '@mui/material';
import Navbar from '../components/Navbar';
import { Link } from 'react-router-dom';

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
                <div className='mb-8'>
                    <FormControl className='mr-4'>
                        <InputLabel>Tipo</InputLabel>
                        <Select
                            value={tipo}
                            onChange={(e) => setTipo(e.target.value)}
                        >
                            <MenuItem value='Todos os tipos'>Todos os tipos</MenuItem>
                            {/* Adicione outras opções de tipo aqui */}
                        </Select>
                    </FormControl>
                    <FormControl className='mr-4'>
                        <InputLabel>Responsável</InputLabel>
                        <Select
                            value={responsavel}
                            onChange={(e) => setResponsavel(e.target.value)}
                        >
                            <MenuItem value='Todos os responsáveis'>Todos os responsáveis</MenuItem>
                            {/* Adicione outras opções de responsáveis aqui */}
                        </Select>
                    </FormControl>
                    <FormControl className='mr-4'>
                        <InputLabel>Proprietário</InputLabel>
                        <Select
                            value={proprietario}
                            onChange={(e) => setProprietario(e.target.value)}
                        >
                            <MenuItem value='Todos os proprietários'>Todos os proprietários</MenuItem>
                            {/* Adicione outras opções de proprietários aqui */}
                        </Select>
                    </FormControl>
                    <FormControl className='mr-4'>
                        <InputLabel>Progresso</InputLabel>
                        <Select
                            value={progresso}
                            onChange={(e) => setProgresso(e.target.value)}
                        >
                            <MenuItem value='Todos os progressos'>Todos os progressos</MenuItem>
                            {/* Adicione outras opções de progresso aqui */}
                        </Select>
                    </FormControl>
                    <FormControl className='mr-4'>
                        <InputLabel>Opções Selecionadas</InputLabel>
                        <Select
                            value={opcoes}
                            onChange={(e) => setOpcoes(e.target.value)}
                        >
                            <MenuItem value='Todas as opções'>Todas as opções</MenuItem>
                            {/* Adicione outras opções aqui */}
                        </Select>
                    </FormControl>
                    <TextField
                        label="Data de Início"
                        type="date"
                        value={dataInicio}
                        onChange={(e) => setDataInicio(e.target.value)}
                        InputLabelProps={{
                            shrink: true,
                        }}
                        className='mr-4'
                    />
                    <TextField
                        label="Data de Fim"
                        type="date"
                        value={dataFim}
                        onChange={(e) => setDataFim(e.target.value)}
                        InputLabelProps={{
                            shrink: true,
                        }}
                        className='mr-4'
                    />
                    <Button
                        variant='contained'
                        color='primary'
                        className='mr-4'
                        component={Link}
                        to='/processos/adicionar'
                    >
                        Adicionar Processo
                    </Button>
                    <Button
                        variant='contained'
                        color='secondary'
                    >
                        Baixar Ficha
                    </Button>
                </div>
                <TableContainer component={Paper} className='bg-gray-800'>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Cliente</TableCell>
                                <TableCell>Tipo</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Notas</TableCell>
                                <TableCell>Corretor Responsável</TableCell>
                                <TableCell>Proprietário</TableCell>
                                <TableCell>Data de Início</TableCell>
                                <TableCell>Data de Finalização</TableCell>
                                <TableCell>Ações</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {processos.map((processo) => (
                                <TableRow key={processo.id}>
                                    <TableCell>{processo.cliente}</TableCell>
                                    <TableCell>{processo.tipo}</TableCell>
                                    <TableCell>{processo.status}</TableCell>
                                    <TableCell>{processo.notas}</TableCell>
                                    <TableCell>{processo.corretorResponsavel}</TableCell>
                                    <TableCell>{processo.proprietario}</TableCell>
                                    <TableCell>{new Date(processo.dataInicio).toLocaleDateString()}</TableCell>
                                    <TableCell>{new Date(processo.dataFinalizacao).toLocaleDateString()}</TableCell>
                                    <TableCell>
                                        <Button
                                            variant='contained'
                                            color='primary'
                                            className='mr-2'
                                            component={Link}
                                            to={`/processos/editar/${processo.id}`}
                                        >
                                            Editar
                                        </Button>
                                        <Button
                                            variant='contained'
                                            color='secondary'
                                            // Adicione uma função para excluir se necessário
                                        >
                                            Excluir
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </div>
        </div>
    );
};

export default ListaProcessos;
