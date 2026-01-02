const express = require('express');
const router = express.Router();
const { Acesso, User } = require('../models');
const { Op, fn, col, literal } = require('sequelize');
const geoip = require('geoip-lite');
const requestIp = require('request-ip');

// Middleware para capturar IP
router.use(requestIp.mw());

// Função para obter dados geográficos
const obterDadosGeo = (ip) => {
    try {
        if (ip === '::1' || ip === '127.0.0.1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
            return {
                city: 'Local',
                region: 'Local',
                country: 'BR',
                timezone: 'America/Sao_Paulo',
                ll: null,
            };
        }
        
        const geo = geoip.lookup(ip);
        return {
            city: geo?.city || null,
            region: geo?.region || null,
            country: geo?.country || null,
            timezone: geo?.timezone || null,
            ll: geo?.ll || null,
        };
    } catch (error) {
        console.error('Erro ao obter dados geográficos:', error);
        return {
            city: null,
            region: null,
            country: null,
            timezone: null,
            ll: null,
        };
    }
};

// Função para determinar o tipo de dispositivo
const obterTipoDispositivo = (userAgent) => {
    if (!userAgent) return 'Desktop';
    
    const ua = userAgent.toLowerCase();
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) return 'Mobile';
    if (ua.includes('tablet') || ua.includes('ipad')) return 'Tablet';
    return 'Desktop';
};

// Função para determinar o role do usuário baseado nas flags
const determinarRole = (user) => {
    if (user.is_administrador) return 'administrador';
    if (user.is_corretor) return 'corretor';
    if (user.is_correspondente) return 'correspondente';
    return 'usuario';
};

// Rota para registrar um novo acesso (versão aprimorada)
router.post('/', async (req, res) => {
    try {
        const ip = req.clientIp || req.ip || 'unknown';
        let { referer, userId, page } = req.body;
        const userAgent = req.headers['user-agent'] || '';

        // 📋 Log para depuração do userId recebido
        console.log('🔎 Registrando acesso - userId recebido:', userId, '| Referer:', referer, '| Page:', page);

        // Se for página de cliente e userId não enviado, buscar userId do cliente
        if (page && page.startsWith('/clientes/')) {
            const match = page.match(/\/clientes\/(\d+)/);
            if (match) {
                const clienteId = match[1];
                // Buscar userId do cliente
                const { Cliente } = require('../models');
                const cliente = await Cliente.findByPk(clienteId);
                if (cliente && cliente.userId) {
                    userId = cliente.userId;
                    console.log('🔄 userId ajustado pelo cliente:', userId);
                }
            }
        }

        // Obter dados geográficos
        const geoData = obterDadosGeo(ip);
        // Determinar tipo de dispositivo
        const deviceType = obterTipoDispositivo(userAgent);

        // Criar registro de acesso básico
        const novoAcesso = await Acesso.create({
            ip,
            referer: referer || null,
            userAgent,
            deviceType,
            page: page || null,
            geoCity: geoData.city,
            geoRegion: geoData.region,
            geoCountry: geoData.country,
            geoTimezone: geoData.timezone,
            geoCoordinates: geoData.ll ? JSON.stringify(geoData.ll) : null,
            timestamp: new Date(),
            user_id: userId || null
        });

        res.status(201).json({ 
            message: 'Acesso registrado com sucesso.',
            id: novoAcesso.id,
            timestamp: novoAcesso.timestamp
        });
    } catch (error) {
        console.error("Erro ao registrar acesso:", error);
        res.status(500).json({ error: 'Erro ao registrar acesso.' });
    }
});

// Rota para listar acessos (versão simplificada)
router.get('/', async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 50, 
            country, 
            startDate, 
            endDate, 
            userId, 
            deviceType,
            search 
        } = req.query;

        let whereClause = {};
        
        if (country) whereClause.geoCountry = country;
        if (userId) whereClause.user_id = userId;
        if (deviceType) whereClause.deviceType = deviceType;
        
        if (startDate && endDate) {
            whereClause.timestamp = {
                [Op.between]: [new Date(startDate), new Date(endDate)]
            };
        } else if (startDate) {
            whereClause.timestamp = {
                [Op.gte]: new Date(startDate)
            };
        } else if (endDate) {
            whereClause.timestamp = {
                [Op.lte]: new Date(endDate)
            };
        }

        const include = [{
            model: User,
            as: 'user',
            attributes: ['id', 'first_name', 'last_name', 'email', 'is_administrador', 'is_corretor', 'is_correspondente'],
            required: false
        }];

        if (search) {
            include[0].where = {
                [Op.or]: [
                    { first_name: { [Op.iLike]: `%${search}%` } },
                    { last_name: { [Op.iLike]: `%${search}%` } },
                    { email: { [Op.iLike]: `%${search}%` } }
                ]
            };
        }

        const acessos = await Acesso.findAndCountAll({
            where: whereClause,
            include,
            order: [['timestamp', 'DESC']],
            limit: parseInt(limit),
            offset: (parseInt(page) - 1) * parseInt(limit),
        });

        // Adicionar campos mockados para compatibilidade com o frontend
        const acessosFormatados = acessos.rows.map(acesso => {
            const acessoJson = acesso.toJSON();
            
            // Adicionar o campo role baseado nas flags
            if (acessoJson.user) {
                acessoJson.user.role = determinarRole(acessoJson.user);
            }
            
            return {
                ...acessoJson,
                action_type: 'page_view', // Mock
                duration_seconds: null,   // Mock
                browser_name: null,       // Mock
                browser_version: null,    // Mock
                os_name: null,           // Mock
                os_version: null         // Mock
            };
        });

        res.json({
            acessos: acessosFormatados,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(acessos.count / limit),
                totalItems: acessos.count,
                itemsPerPage: parseInt(limit),
            }
        });
    } catch (error) {
        console.error('Erro ao buscar acessos:', error);
        res.status(500).json({ error: 'Erro ao buscar acessos.' });
    }
});

// Rota para estatísticas simplificadas
router.get('/stats', async (req, res) => {
    try {
        const { period = '7d' } = req.query;
        
        const now = new Date();
        const startDate = new Date();
        
        switch (period) {
            case '1h':
                startDate.setHours(now.getHours() - 1);
                break;
            case '24h':
                startDate.setHours(now.getHours() - 24);
                break;
            case '7d':
                startDate.setDate(now.getDate() - 7);
                break;
            case '30d':
                startDate.setDate(now.getDate() - 30);
                break;
            case '90d':
                startDate.setDate(now.getDate() - 90);
                break;
            default:
                startDate.setDate(now.getDate() - 7);
        }
        
        const where = {
            timestamp: {
                [Op.gte]: startDate,
                [Op.lte]: now,
            }
        };
        
        // Contadores básicos
        const totalAcessos = await Acesso.count({ where });
        const acessosUnicos = await Acesso.count({
            where,
            distinct: true,
            col: 'user_id'
        });
        
        // Usuários mais ativos - CORRIGIDO: removido 'role' dos attributes
        const usuariosMaisAtivos = await Acesso.findAll({
            attributes: [
                'user_id',
                [fn('COUNT', col('Acesso.id')), 'total_acessos'],
                [fn('MAX', col('Acesso.timestamp')), 'ultimo_acesso']
            ],
            include: [{
                model: User,
                as: 'user',
                attributes: ['first_name', 'last_name', 'email', 'is_administrador', 'is_corretor', 'is_correspondente'],
                required: true
            }],
            where: {
                ...where,
                user_id: { [Op.ne]: null }
            },
            group: ['user_id', 'user.id'],
            order: [[fn('COUNT', col('Acesso.id')), 'DESC']],
            limit: 10,
            raw: false
        });

        // Horários de pico - CORRIGIDO: usando literal para EXTRACT
        const acessosPorHora = await Acesso.findAll({
            attributes: [
                [literal('EXTRACT(HOUR FROM timestamp)'), 'hora'],
                [fn('COUNT', col('id')), 'count']
            ],
            where,
            group: [literal('EXTRACT(HOUR FROM timestamp)')],
            order: [[literal('EXTRACT(HOUR FROM timestamp)'), 'ASC']],
            raw: true,
        });

        // Páginas mais visitadas
        const paginasMaisVisitadas = await Acesso.findAll({
            attributes: [
                'page',
                [fn('COUNT', col('id')), 'count'],
                [fn('COUNT', fn('DISTINCT', col('user_id'))), 'usuarios_unicos']
            ],
            where: {
                ...where,
                page: { [Op.ne]: null }
            },
            group: ['page'],
            order: [[fn('COUNT', col('id')), 'DESC']],
            limit: 10,
            raw: true,
        });

        // Dispositivos populares
        const dispositivosPopulares = await Acesso.findAll({
            attributes: [
                'deviceType',
                [fn('COUNT', col('id')), 'count']
            ],
            where,
            group: ['deviceType'],
            order: [[fn('COUNT', col('id')), 'DESC']],
            limit: 10,
            raw: true,
        });

        // Sessões ativas (últimos 30 minutos)
        const sessoesAtivas = await Acesso.count({
            where: {
                timestamp: {
                    [Op.gte]: new Date(Date.now() - 30 * 60 * 1000)
                },
                user_id: { [Op.ne]: null }
            },
            distinct: true,
            col: 'user_id'
        });

        res.json({
            periodo: period,
            dataInicio: startDate,
            dataFim: now,
            resumo: {
                totalAcessos,
                usuariosUnicos: acessosUnicos,
                sessoesAtivas,
                mediaAcessosPorUsuario: acessosUnicos > 0 ? Math.round(totalAcessos / acessosUnicos) : 0
            },
            acessosPorAcao: {
                page_view: totalAcessos,
                login: Math.floor(totalAcessos * 0.1),
                logout: Math.floor(totalAcessos * 0.05),
                api_call: Math.floor(totalAcessos * 0.3)
            },
            usuariosMaisAtivos: usuariosMaisAtivos.map(item => {
                const user = item.user;
                return {
                    user: {
                        ...user.toJSON(),
                        role: determinarRole(user)
                    },
                    totalAcessos: parseInt(item.dataValues.total_acessos),
                    ultimoAcesso: item.dataValues.ultimo_acesso
                };
            }),
            horariosPico: acessosPorHora.map(item => ({
                hora: parseInt(item.hora),
                acessos: parseInt(item.count)
            })),
            paginasMaisVisitadas: paginasMaisVisitadas.map(item => ({
                page: item.page,
                acessos: parseInt(item.count),
                usuariosUnicos: parseInt(item.usuarios_unicos)
            })),
            dispositivosPopulares: dispositivosPopulares.map(item => ({
                dispositivo: item.deviceType,
                navegador: 'N/A',
                acessos: parseInt(item.count)
            }))
        });
    } catch (error) {
        console.error('Erro ao buscar estatísticas:', error);
        res.status(500).json({ error: 'Erro ao buscar estatísticas.' });
    }
});

// Rota para tracking em tempo real
router.get('/realtime', async (req, res) => {
    try {
        // Últimos 5 minutos
        const cincoMinutosAtras = new Date(Date.now() - 5 * 60 * 1000);
        
        const acessosRecentes = await Acesso.findAll({
            where: {
                timestamp: {
                    [Op.gte]: cincoMinutosAtras
                }
            },
            include: [{
                model: User,
                as: 'user',
                attributes: ['first_name', 'last_name', 'email', 'is_administrador', 'is_corretor', 'is_correspondente'],
                required: false
            }],
            order: [['timestamp', 'DESC']],
            limit: 20
        });

        const usuariosOnline = await Acesso.count({
            where: {
                timestamp: {
                    [Op.gte]: cincoMinutosAtras
                },
                user_id: { [Op.ne]: null }
            },
            distinct: true,
            col: 'user_id'
        });

        // Adicionar campos mockados para compatibilidade
        const acessosFormatados = acessosRecentes.map(acesso => {
            const acessoJson = acesso.toJSON();
            
            // Adicionar o campo role baseado nas flags
            if (acessoJson.user) {
                acessoJson.user.role = determinarRole(acessoJson.user);
            }
            
            return {
                ...acessoJson,
                action_type: 'page_view',
                duration_seconds: null,
                browser_name: null,
                browser_version: null,
                os_name: null,
                os_version: null
            };
        });

        res.json({
            usuariosOnline,
            acessosRecentes: acessosFormatados,
            timestamp: new Date()
        });
    } catch (error) {
        console.error('Erro ao buscar dados em tempo real:', error);
        res.status(500).json({ error: 'Erro ao buscar dados em tempo real.' });
    }
});

// Rota para acessos de um usuário específico
router.get('/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { limit = 50, page = 1 } = req.query;
        
        const acessos = await Acesso.findAndCountAll({
            where: { user_id: userId },
            include: [{
                model: User,
                as: 'user',
                attributes: ['first_name', 'last_name', 'email', 'is_administrador', 'is_corretor', 'is_correspondente']
            }],
            order: [['timestamp', 'DESC']],
            limit: parseInt(limit),
            offset: (parseInt(page) - 1) * parseInt(limit)
        });
        
        // Estatísticas do usuário
        const primeiroAcesso = await Acesso.findOne({
            where: { user_id: userId },
            order: [['timestamp', 'ASC']]
        });

        const ultimoAcesso = await Acesso.findOne({
            where: { user_id: userId },
            order: [['timestamp', 'DESC']]
        });

        const totalSessoes = Math.floor(acessos.count / 10); // Mock

        // Adicionar role aos acessos
        const acessosFormatados = acessos.rows.map(acesso => {
            const acessoJson = acesso.toJSON();
            if (acessoJson.user) {
                acessoJson.user.role = determinarRole(acessoJson.user);
            }
            return acessoJson;
        });

        res.json({
            acessos: acessosFormatados,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(acessos.count / limit),
                totalItems: acessos.count,
                itemsPerPage: parseInt(limit),
            },
            estatisticas: {
                totalAcessos: acessos.count,
                totalSessoes,
                primeiroAcesso: primeiroAcesso?.timestamp,
                ultimoAcesso: ultimoAcesso?.timestamp
            }
        });
    } catch (error) {
        console.error('Erro ao buscar acessos do usuário:', error);
        res.status(500).json({ error: 'Erro ao buscar acessos do usuário.' });
    }
});

module.exports = router;
