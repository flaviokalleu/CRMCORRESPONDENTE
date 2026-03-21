const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { User, Cliente } = require('../models');
const { Op, fn, col, literal } = require('sequelize');

// Cache simples em memória (5 minutos)
let dashboardCache = {};
const CACHE_TTL = 5 * 60 * 1000;

function getCachedData(key) {
  const entry = dashboardCache[key];
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) return entry.data;
  return null;
}

function setCachedData(key, data) {
  dashboardCache[key] = { data, timestamp: Date.now() };
}

// Limpar cache quando dados mudam
function invalidateCache() {
  dashboardCache = {};
}

// Middleware de autenticação
router.use(authMiddleware);

// Dashboard principal com métricas avançadas
router.get('/', async (req, res) => {
    try {
        const cacheKey = `dashboard_${req.user.email}_${req.user.role}`;
        const cached = getCachedData(cacheKey);
        if (cached) return res.json(cached);

        const userRole = req.user.role;
        const user = await User.findOne({ where: { email: req.user.email } });

        // Corrigir condição baseada no modelo Cliente - usar user_id
        // Para ADMINISTRADOR e CORRESPONDENTE: ver todos os clientes
        // Para CORRETOR: ver apenas seus clientes
        let whereCondition = {};
        if (user && user.is_corretor && !user.is_administrador && !user.is_correspondente) {
            whereCondition.user_id = user.id; // ✅ CORRIGIDO: user_id
        }

        // Contadores básicos
        const totalCorretores = userRole === 'corretor'
            ? 1
            : await User.count({ where: { is_corretor: true } });

        // Corrigir: totalClientes deve contar TODOS os clientes para admin/correspondente, e só filtrar para corretor
        let totalClientes;
        if (user && user.is_corretor && !user.is_administrador && !user.is_correspondente) {
            totalClientes = await Cliente.count({ where: { user_id: user.id } }); // ✅ CORRIGIDO: user_id
        } else {
            totalClientes = await Cliente.count();
        }
        
        // ✅ DEBUG: Log para verificar inconsistências
        console.log(`🔍 DEBUG Dashboard - Usuário: ${user.email}, Role: ${userRole}`);
        console.log(`🔍 DEBUG Dashboard - Total no dashboard: ${totalClientes}`);
        
        // ✅ COMPARAR COM COUNT DA LISTA DE CLIENTES (mesmo filtro que na rota de listagem)
        let totalClientesLista;
        const whereClauseComparacao = {};
        if (userRole === 'corretor' && user && user.is_corretor) {
            whereClauseComparacao.user_id = user.id; // ✅ USAR user_id como na lista
        }
        totalClientesLista = await Cliente.count({ where: whereClauseComparacao });
        console.log(`🔍 DEBUG Dashboard - Total na lista (mesmo filtro): ${totalClientesLista}`);
        
        const totalCorrespondentes = await User.count({ where: { is_correspondente: true } });

        // Análise de status mais detalhada
        const statusCounts = await Cliente.findAll({
            attributes: [
                'status',
                [fn('COUNT', col('status')), 'count']
            ],
            where: whereCondition,
            group: ['status'],
            raw: true
        });

        // Processar contagens de status
        let clientesAprovados = 0;
        let clientesReprovados = 0;
        let clientesPendentes = 0;

        statusCounts.forEach(item => {
            const status = (item.status || '').toLowerCase();
            const count = parseInt(item.count) || 0;

            if (status.includes('aprovado')) {
                clientesAprovados += count;
            } else if (status.includes('reprovado') || status.includes('rejeitado')) {
                clientesReprovados += count;
            } else {
                clientesPendentes += count;
            }
        });

        // Clientes aguardando aprovação (detalhados)

        const clientesAguardandoAprovacao = await Cliente.findAll({
            where: {
                ...whereCondition,
                [Op.or]: [
                    { status: { [Op.iLike]: '%aguardando%' } },
                    { status: { [Op.iLike]: '%pendente%' } },
                    { status: { [Op.iLike]: '%análise%' } },
                    { status: { [Op.iLike]: '%em análise%' } },
                    { status: 'aguardando_aprovação' }
                ]
            },
            attributes: ['id', 'nome', 'status', 'created_at', 'updated_at'],
            order: [['created_at', 'DESC']]
        });

        const totalClientesAguardandoAprovacao = clientesAguardandoAprovacao.length;

        // Clientes cadastrados este mês
        const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const clientesEsteMes = await Cliente.count({
            where: {
                ...whereCondition,
                created_at: {
                    [Op.gte]: inicioMes,
                },
            },
        });

        // Clientes cadastrados no mês anterior
        const inicioMesAnterior = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1);
        const fimMesAnterior = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        
        const clientesMesAnterior = await Cliente.count({
            where: {
                ...whereCondition,
                created_at: {
                    [Op.gte]: inicioMesAnterior,
                    [Op.lt]: fimMesAnterior,
                },
            },
        });

        // Cálculo de crescimento mensal real
        const crescimentoMensal = clientesMesAnterior > 0 
            ? Math.round(((clientesEsteMes - clientesMesAnterior) / clientesMesAnterior) * 100)
            : clientesEsteMes > 0 ? 100 : 0;

        // Usuários que fizeram login hoje (baseado em updated_at)
        const inicioHoje = new Date();
        inicioHoje.setHours(0, 0, 0, 0);
        
        const usuariosAtivosHoje = await User.count({
            where: {
                updated_at: {
                    [Op.gte]: inicioHoje
                }
            }
        });

        // Clientes cadastrados hoje
        const clientesHoje = await Cliente.count({
            where: {
                ...whereCondition,
                created_at: {
                    [Op.gte]: inicioHoje
                }
            }
        });

        // Clientes desta semana
        const inicioSemana = new Date();
        inicioSemana.setDate(inicioSemana.getDate() - inicioSemana.getDay());
        inicioSemana.setHours(0, 0, 0, 0);

        const clientesSemana = await Cliente.count({
            where: {
                ...whereCondition,
                created_at: {
                    [Op.gte]: inicioSemana
                }
            }
        });

        // Clientes semana anterior para crescimento semanal
        const inicioSemanaAnterior = new Date(inicioSemana);
        inicioSemanaAnterior.setDate(inicioSemanaAnterior.getDate() - 7);

        const clientesSemanaAnterior = await Cliente.count({
            where: {
                ...whereCondition,
                created_at: {
                    [Op.gte]: inicioSemanaAnterior,
                    [Op.lt]: inicioSemana
                }
            }
        });

        const crescimentoSemanal = clientesSemanaAnterior > 0 
            ? Math.round(((clientesSemana - clientesSemanaAnterior) / clientesSemanaAnterior) * 100)
            : clientesSemana > 0 ? 100 : 0;

        // ✅ Top 5 usuários do MÊS ATUAL - RESETADO A CADA MÊS
        let top5Usuarios = [];
        try {
            // Tentar buscar top usuarios apenas se não for corretor individual
            if (userRole !== 'corretor') {
                console.log('🔍 DEBUG Backend - Buscando top5Usuarios para userRole:', userRole);
                
                // ✅ BUSCAR APENAS CLIENTES DO MÊS ATUAL
                const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
                const fimMes = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59);
                
                console.log('🔍 DEBUG Backend - Período:', { inicioMes, fimMes });
                
                const clientesComUsuario = await Cliente.findAll({
                    attributes: [
                        'user_id', // ✅ Corrigido: user_id em vez de userId
                        [fn('COUNT', col('Cliente.id')), 'clientes']
                    ],
                    where: {
                        user_id: { [Op.not]: null }, // ✅ Corrigido: user_id
                        created_at: {
                            [Op.between]: [inicioMes, fimMes] // ✅ APENAS DO MÊS ATUAL
                        }
                    },
                    group: ['Cliente.user_id'], // ✅ Corrigido: user_id
                    order: [[fn('COUNT', col('Cliente.id')), 'DESC']],
                    limit: 5,
                    raw: true
                });

                console.log('🔍 DEBUG Backend - clientesComUsuario:', clientesComUsuario);

                // Buscar dados dos usuários separadamente
                for (const item of clientesComUsuario) {
                    const usuario = await User.findByPk(item.user_id, { // ✅ Corrigido: user_id
                        attributes: ['id', 'first_name', 'last_name', 'email']
                    });
                    
                    if (usuario) {
                        top5Usuarios.push({
                            user: usuario,
                            clientes: parseInt(item.clientes)
                        });
                    }
                }
                
                console.log('🔍 DEBUG Backend - top5Usuarios final:', top5Usuarios);
            } else {
                console.log('🔍 DEBUG Backend - Usuário é corretor, não buscando top5Usuarios');
            }
        } catch (error) {
            console.log('Erro ao buscar top usuarios, continuando sem eles:', error.message);
            // Se der erro, continuar com array vazio
            top5Usuarios = [];
        }

        // Métricas de performance reais
        const totalUsuarios = await User.count();
        const eficienciaMedia = totalUsuarios > 0 ? Math.round((totalClientes / totalUsuarios) * 100) / 100 : 0;
        const taxaAprovacao = totalClientes > 0 ? Math.round((clientesAprovados / totalClientes) * 100) : 0;
        const taxaRejeicao = totalClientes > 0 ? Math.round((clientesReprovados / totalClientes) * 100) : 0;

        // Análise de renda - Usando apenas clientes com valor_renda não nulo
        let rendaAnalysis = {
            rendaMedia: 0,
            rendaMaxima: 0,
            rendaMinima: 0,
            clientesComRenda: 0
        };

        try {
            const rendaData = await Cliente.findAll({
                attributes: [
                    [fn('AVG', literal('CAST("valor_renda" AS NUMERIC)')), 'rendaMedia'],
                    [fn('MAX', literal('CAST("valor_renda" AS NUMERIC)')), 'rendaMaxima'],
                    [fn('MIN', literal('CAST("valor_renda" AS NUMERIC)')), 'rendaMinima'],
                    [fn('COUNT', col('valor_renda')), 'clientesComRenda']
                ],
                where: {
                    ...whereCondition,
                    valor_renda: { [Op.not]: null, [Op.ne]: '', [Op.ne]: '0' }
                },
                raw: true
            });

            const renda = rendaData[0] || {};
            rendaAnalysis = {
                rendaMedia: parseFloat(renda.rendaMedia || 0).toFixed(2),
                rendaMaxima: parseFloat(renda.rendaMaxima || 0).toFixed(2),
                rendaMinima: parseFloat(renda.rendaMinima || 0).toFixed(2),
                clientesComRenda: parseInt(renda.clientesComRenda || 0)
            };
        } catch (error) {
            console.log('Erro ao analisar renda, continuando com valores padrão:', error.message);
        }

        const responseData = {
            // Contadores básicos
            totalCorretores,
            totalClientes,
            totalCount: totalClientes, // ✅ ADICIONAR totalCount para consistência com lista
            totalCorrespondentes,
            totalClientesAguardandoAprovacao,
            clientesAguardandoAprovacao,

            // ✅ ADICIONAR PERMISSÕES DO USUÁRIO
            userPermissions: {
                canViewAll: userRole === 'administrador' || userRole === 'correspondente',
                isCorretor: userRole === 'corretor',
                isAdministrador: userRole === 'administrador',
                isCorrespondente: userRole === 'correspondente'
            },

            // Status detalhado
            clientesAprovados,
            clientesReprovados,
            clientesPendentes,

            // Crescimento
            clientesEsteMes,
            clientesMesAnterior,
            crescimentoSemanal,
            crescimentoMensal,

            // Atividade
            usuariosAtivosHoje,
            clientesHoje,
            clientesSemana,

            // Ranking
            top5Usuarios,

            // Performance
            performance: {
                eficienciaMedia,
                taxaAprovacao,
                taxaRejeicao,
                totalUsuarios
            },

            // Análise de renda
            rendaAnalysis
        };

        setCachedData(cacheKey, responseData);
        res.json(responseData);
    } catch (error) {
        console.error('Erro ao buscar dados do dashboard:', error);
        res.status(500).json({ 
            message: 'Erro ao buscar dados do dashboard', 
            error: error.message 
        });
    }
});

// Dados mensais de clientes cadastrados (12 meses)
router.get('/monthly', async (req, res) => {
    try {
        const userRole = req.user.role;
        const user = await User.findOne({ where: { email: req.user.email } });

        let whereCondition = {};
        if (userRole === 'corretor' && user && user.is_corretor) {
            whereCondition = { user_id: user.id }; // ✅ Corrigido: user_id
        }

        // Últimos 12 meses
        const monthlyclientes = await Cliente.findAll({
            attributes: [
                [literal('EXTRACT(MONTH FROM "created_at")'), 'month'],
                [literal('EXTRACT(YEAR FROM "created_at")'), 'year'],
                [fn('COUNT', col('id')), 'count']
            ],
            where: {
                ...whereCondition,
                created_at: {
                    [Op.gte]: new Date(new Date().getFullYear() - 1, new Date().getMonth(), 1),
                },
            },
            group: [literal('EXTRACT(YEAR FROM "created_at")'), literal('EXTRACT(MONTH FROM "created_at")')],
            order: [
                [literal('EXTRACT(YEAR FROM "created_at")'), 'ASC'],
                [literal('EXTRACT(MONTH FROM "created_at")'), 'ASC']
            ],
            raw: true
        });

        // Inicializar array com 12 meses
        const monthlyData = Array(12).fill(0);
        const currentYear = new Date().getFullYear();

        // Preencher dados reais
        monthlyclientes.forEach(client => {
            const year = parseInt(client.year);
            const month = parseInt(client.month) - 1; // JS usa 0-11
            const count = parseInt(client.count);

            // Calcular índice do array (últimos 12 meses)
            if (year === currentYear && month >= 0 && month < 12) {
                monthlyData[month] = count;
            } else if (year === currentYear - 1 && month >= 0 && month < 12) {
                monthlyData[month] = count;
            }
        });

        // Crescimento mensal
        const monthlyGrowth = monthlyData.map((current, index) => {
            if (index === 0) return 0;
            const previous = monthlyData[index - 1];
            return previous > 0 ? Math.round(((current - previous) / previous) * 100) : current > 0 ? 100 : 0;
        });

        const totalYear = monthlyData.reduce((a, b) => a + b, 0);
        const averageMonth = totalYear > 0 ? Math.round(totalYear / 12) : 0;

        res.json({ 
            monthlyData,
            monthlyGrowth,
            totalYear,
            averageMonth,
            labels: [
                "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
                "Jul", "Ago", "Set", "Out", "Nov", "Dez"
            ]
        });
    } catch (error) {
        console.error('Erro ao buscar dados mensais:', error);
        res.status(500).json({ message: 'Erro ao buscar dados mensais', error: error.message });
    }
});

// Dados semanais de clientes cadastrados
router.get('/weekly', async (req, res) => {
    try {
        const userRole = req.user.role;
        const user = await User.findOne({ where: { email: req.user.email } });

        let whereCondition = {};
        if (userRole === 'corretor' && user && user.is_corretor) {
            whereCondition = { user_id: user.id }; // ✅ Corrigido: user_id
        }

        // Última semana
        const inicioSemana = new Date();
        inicioSemana.setDate(inicioSemana.getDate() - 7);

        const weeklyclientes = await Cliente.findAll({
            attributes: [
                [literal('EXTRACT(DOW FROM "created_at")'), 'dayOfWeek'],
                [fn('COUNT', col('id')), 'count']
            ],
            where: {
                ...whereCondition,
                created_at: {
                    [Op.gte]: inicioSemana,
                },
            },
            group: [literal('EXTRACT(DOW FROM "created_at")')],
            order: [[literal('EXTRACT(DOW FROM "created_at")'), 'ASC']],
            raw: true
        });

        const weeklyData = Array(7).fill(0);
        weeklyclientes.forEach(client => {
            const day = parseInt(client.dayOfWeek);
            if (day >= 0 && day < 7) {
                weeklyData[day] = parseInt(client.count);
            }
        });

        // Semana anterior para comparação
        const inicioSemanaAnterior = new Date();
        inicioSemanaAnterior.setDate(inicioSemanaAnterior.getDate() - 14);
        const fimSemanaAnterior = new Date();
        fimSemanaAnterior.setDate(fimSemanaAnterior.getDate() - 7);

        const previousWeekClientes = await Cliente.findAll({
            attributes: [
                [literal('EXTRACT(DOW FROM "created_at")'), 'dayOfWeek'],
                [fn('COUNT', col('id')), 'count']
            ],
            where: {
                ...whereCondition,
                created_at: {
                    [Op.gte]: inicioSemanaAnterior,
                    [Op.lt]: fimSemanaAnterior,
                },
            },
            group: [literal('EXTRACT(DOW FROM "created_at")')],
            order: [[literal('EXTRACT(DOW FROM "created_at")'), 'ASC']],
            raw: true
        });

        const previousWeekData = Array(7).fill(0);
        previousWeekClientes.forEach(client => {
            const day = parseInt(client.dayOfWeek);
            if (day >= 0 && day < 7) {
                previousWeekData[day] = parseInt(client.count);
            }
        });

        const totalWeek = weeklyData.reduce((a, b) => a + b, 0);
        const totalPreviousWeek = previousWeekData.reduce((a, b) => a + b, 0);
        
        const weeklyGrowth = totalPreviousWeek > 0 
            ? Math.round(((totalWeek - totalPreviousWeek) / totalPreviousWeek) * 100)
            : totalWeek > 0 ? 100 : 0;

        res.json({ 
            weeklyData,
            previousWeekData,
            totalWeek,
            weeklyGrowth,
            labels: ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]
        });
    } catch (error) {
        console.error('Erro ao buscar dados semanais:', error);
        res.status(500).json({ message: 'Erro ao buscar dados semanais', error: error.message });
    }
});

// Sistema de estatísticas do servidor
router.get('/system-stats', async (req, res) => {
    try {
        const totalRegistros = await Cliente.count();
        const totalUsuarios = await User.count();
        
        const ultimasVinteQuatroHoras = new Date(Date.now() - 24 * 60 * 60 * 1000);
        
        const atividadeRecente = await Cliente.count({
            where: {
                created_at: {
                    [Op.gte]: ultimasVinteQuatroHoras
                }
            }
        });

        const usuariosRecentes = await User.count({
            where: {
                updated_at: {
                    [Op.gte]: ultimasVinteQuatroHoras
                }
            }
        });

        res.json({
            totalRegistros,
            totalUsuarios,
            atividadeRecente,
            usuariosRecentes,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Erro ao buscar estatísticas do sistema:', error);
        res.status(500).json({ message: 'Erro ao buscar estatísticas do sistema', error: error.message });
    }
});

// Métricas de atividade em tempo real
router.get('/activity-metrics', async (req, res) => {
    try {
        const userRole = req.user.role;
        const user = await User.findOne({ where: { email: req.user.email } });

        let whereCondition = {};
        if (userRole === 'corretor' && user && user.is_corretor) {
            whereCondition = { user_id: user.id }; // ✅ Corrigido: user_id
        }

        // Atividade das últimas 24 horas
        const ultimasVinteQuatroHoras = new Date(Date.now() - 24 * 60 * 60 * 1000);
        
        const clientesHoje = await Cliente.count({
            where: {
                ...whereCondition,
                created_at: {
                    [Op.gte]: ultimasVinteQuatroHoras
                }
            }
        });

        // Atividade da última semana
        const ultimaSemana = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        
        const clientesSemana = await Cliente.count({
            where: {
                ...whereCondition,
                created_at: {
                    [Op.gte]: ultimaSemana
                }
            }
        });

        // Taxa de crescimento semanal real
        const semanaAnterior = await Cliente.count({
            where: {
                ...whereCondition,
                created_at: {
                    [Op.gte]: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
                    [Op.lt]: ultimaSemana
                }
            }
        });

        const crescimentoSemanal = semanaAnterior > 0 
            ? Math.round(((clientesSemana - semanaAnterior) / semanaAnterior) * 100)
            : clientesSemana > 0 ? 100 : 0;

        // Usuários online baseado em atividade recente (últimos 30 minutos)
        const usuariosOnline = await User.count({
            where: {
                updated_at: {
                    [Op.gte]: new Date(Date.now() - 30 * 60 * 1000)
                }
            }
        });

        // Eficiência baseada em dados reais
        // Sempre mostrar o total de clientes do sistema inteiro (sem filtro)
        const totalClientes = await Cliente.count();
        const totalUsuarios = await User.count();
        const eficienciaGeral = totalUsuarios > 0 ? Math.round((totalClientes / totalUsuarios) * 100) : 0;

        res.json({
            clientesHoje,
            clientesSemana,
            crescimentoSemanal,
            usuariosOnline,
            eficienciaGeral,
            totalClientes
        });
    } catch (error) {
        console.error('Erro ao buscar métricas de atividade', error);
        res.status(500).json({ message: 'Erro ao buscar métricas de atividade', error });
    }
});

// Clientes com filtros avançados
router.get('/clientes', async (req, res) => {
    try {
        const { status, search, limit = 10, offset = 0 } = req.query;
        const userRole = req.user.role;
        const user = await User.findOne({ where: { email: req.user.email } });

        let whereCondition = {};
        if (userRole === 'corretor' && user && user.is_corretor) {
            whereCondition = { user_id: user.id }; // ✅ Corrigido: user_id
        }

        // Filtros
        if (status) whereCondition.status = status;
        if (search) {
            whereCondition.nome = {
                [Op.iLike]: `%${search}%`
            };
        }


        // Buscar todos os clientes sem limite/paginação
        const clientes = await Cliente.findAll({ 
            where: whereCondition,
            attributes: [
                'id', 'nome', 'email', 'telefone', 'status', 
                'created_at', 'updated_at'
            ],
            order: [['created_at', 'DESC']]
        });

        const total = clientes.length;

        // Calcular prioridade baseada em data de criação
        const clientesComDados = clientes.map((cliente) => {
            const diasAguardando = Math.floor((new Date() - new Date(cliente.created_at)) / (1000 * 60 * 60 * 24));
            let priority = 'baixa';
            
            if (diasAguardando > 7) priority = 'alta';
            else if (diasAguardando > 3) priority = 'media';

            return {
                ...cliente.toJSON(),
                priority,
                diasAguardando
            };
        });

        res.json({ 
            clientes: clientesComDados, 
            total,
            hasMore: (parseInt(offset) + parseInt(limit)) < total
        });
    } catch (error) {
        console.error('Erro ao buscar clientes', error);
        res.status(500).json({ message: 'Erro ao buscar clientes', error });
    }
});

// Notificações baseadas em dados reais
router.get('/notifications', async (req, res) => {
    try {
        const userRole = req.user.role;
        const user = await User.findOne({ where: { email: req.user.email } });

        let whereCondition = {};
        if (userRole === 'corretor' && user && user.is_corretor) {
            whereCondition = { user_id: user.id }; // ✅ Corrigido: user_id
        }

        const notifications = [];

        // Notificação para clientes aguardando aprovação
        const clientesPendentes = await Cliente.count({
            where: {
                ...whereCondition,
                status: 'aguardando_aprovação'
            }
        });

        if (clientesPendentes > 0) {
            notifications.push({
                id: 1,
                type: 'client_pending',
                title: 'Clientes aguardando aprovação',
                message: `${clientesPendentes} cliente${clientesPendentes > 1 ? 's' : ''} aguardando aprovação`,
                timestamp: new Date(),
                read: false,
                count: clientesPendentes
            });
        }

        // Notificação para novos clientes hoje
        const clientesHoje = await Cliente.count({
            where: {
                ...whereCondition,
                created_at: {
                    [Op.gte]: new Date(new Date().setHours(0, 0, 0, 0))
                }
            }
        });

        if (clientesHoje > 0) {
            notifications.push({
                id: 2,
                type: 'new_clients',
                title: 'Novos clientes hoje',
                message: `${clientesHoje} novo${clientesHoje > 1 ? 's' : ''} cliente${clientesHoje > 1 ? 's' : ''} cadastrado${clientesHoje > 1 ? 's' : ''} hoje`,
                timestamp: new Date(),
                read: false,
                count: clientesHoje
            });
        }

        // Notificação para clientes antigos sem atualização (mais de 30 dias)
        const clientesAntigos = await Cliente.count({
            where: {
                ...whereCondition,
                updated_at: {
                    [Op.lt]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                }
            }
        });

        if (clientesAntigos > 0) {
            notifications.push({
                id: 3,
                type: 'old_clients',
                title: 'Clientes sem atualização',
                message: `${clientesAntigos} cliente${clientesAntigos > 1 ? 's' : ''} sem atualização há mais de 30 dias`,
                timestamp: new Date(Date.now() - 60 * 60 * 1000),
                read: true,
                count: clientesAntigos
            });
        }

        res.json({
            notifications,
            unreadCount: notifications.filter(n => !n.read).length
        });
    } catch (error) {
        console.error('Erro ao buscar notificações', error);
        res.status(500).json({ message: 'Erro ao buscar notificações', error });
    }
});

// ✅ ENDPOINT ESPECÍFICO PARA AGUARDANDO APROVAÇÃO
router.get('/dashboard/aguardando-aprovacao', async (req, res) => {
  try {
    const clientesAguardando = await Cliente.findAll({
      where: { 
        status: 'aguardando_aprovação' // ✅ APENAS ESTE STATUS
      },
      order: [['created_at', 'DESC']]
    });

    res.json({
      total: clientesAguardando.length,
      clientes: clientesAguardando
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar clientes aguardando aprovação' });
  }
});

module.exports = router;