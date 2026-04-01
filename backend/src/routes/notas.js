const express = require('express');
const router = express.Router();
const { Nota, Cliente, User } = require('../models');
const axios = require('axios'); // Para fazer requisições HTTP

// Rota para criar uma nova nota (agora sob /api/notas)
router.post('/', async (req, res) => {
    const { cliente_id, processo_id, nova, destinatario, texto, data_criacao, criado_por_id } = req.body;

    console.log('Dados recebidos:', { cliente_id, processo_id, nova, destinatario, texto, data_criacao, criado_por_id });

    try {
        if (criado_por_id && isNaN(Number(criado_por_id))) {
            return res.status(400).json({ error: 'O campo criado_por_id deve ser um número.' });
        }

        let user = null;
        if (criado_por_id) {
            user = await User.findByPk(criado_por_id);
            if (!user) {
                return res.status(400).json({ error: 'Usuário criador não encontrado.' });
            }
        }

        // 🔍 BUSCAR O CLIENTE SEM INCLUDE (MÉTODO MAIS SIMPLES)
        const cliente = await Cliente.findByPk(cliente_id);

        if (!cliente) {
            return res.status(400).json({ error: 'Cliente não encontrado.' });
        }

        console.log('📋 Dados do cliente encontrado:', {
            id: cliente.id,
            nome: cliente.nome || cliente.first_name,
            criado_por_id: cliente.criado_por_id,
            user_id: cliente.user_id // Pode ser que o campo seja diferente
        });

        // 📱 IDENTIFICAR O USUÁRIO QUE CADASTROU O CLIENTE
        let usuarioQueEuCadastrei = null;

        // Emitir evento socket para criação de nota
        try {
            const { getSocketIO } = require('../socket');
            getSocketIO().emit('nota-criada', {
                clienteId: cliente.id,
                criadoPor: user ? user.username : 'sistema',
                destinatario,
                texto
            });
        } catch (e) {
            console.warn('Socket.IO não inicializado:', e.message);
        }
        let numeroWhatsApp = null;

        // Tentar primeiro com criado_por_id, depois com userId (Sequelize padrão)
        const userId = cliente.criado_por_id || cliente.userId;

        if (userId) {
            usuarioQueEuCadastrei = await User.findByPk(userId, {
                attributes: ['id', 'first_name', 'last_name', 'telefone']
            });

            console.log('🔍 Usuário encontrado:', usuarioQueEuCadastrei ? {
                id: usuarioQueEuCadastrei.id,
                nome: `${usuarioQueEuCadastrei.first_name} ${usuarioQueEuCadastrei.last_name}`,
                telefone: usuarioQueEuCadastrei.telefone
            } : 'Não encontrado');

            if (usuarioQueEuCadastrei) {
                // Usar o telefone do usuário (não tem campo whatsapp no modelo)
                numeroWhatsApp = usuarioQueEuCadastrei.telefone;
                
                console.log(`📱 Cliente cadastrado por: ${usuarioQueEuCadastrei.first_name} ${usuarioQueEuCadastrei.last_name}`);
                console.log(`📞 Número para envio: ${numeroWhatsApp}`);
            }
        } else {
            console.log('❌ Cliente não possui user_id nem criado_por_id');
        }

        // ✅ CRIAR A NOTA
        const novaNota = await Nota.create({
            cliente_id,
            processo_id,
            nova,
            destinatario: numeroWhatsApp || destinatario,
            texto,
            data_criacao,
            criado_por_id: user ? user.id : null,
        });

        // 📨 ENVIAR MENSAGEM VIA WHATSAPP
        if (numeroWhatsApp && usuarioQueEuCadastrei) {
            try {
                const nomeCliente = cliente.nome || cliente.first_name || 'Cliente';
                const nomeUsuarioResponsavel = `${usuarioQueEuCadastrei.first_name} ${usuarioQueEuCadastrei.last_name}`;
                const nomeQuemAdicionou = user ? `${user.first_name} ${user.last_name}` : 'Sistema';

                console.log('📤 Preparando envio WhatsApp:', {
                    nomeCliente,
                    nomeUsuarioResponsavel,
                    nomeQuemAdicionou,
                    numeroWhatsApp
                });

                // Dados para envio via WhatsApp
                const whatsappData = {
                    clienteId: cliente.id,
                    clienteNome: nomeCliente,
                    notaTexto: texto,
                    usuarioAdicionou: nomeQuemAdicionou,
                    prioridade: nova ? 'alta' : 'normal',
                    telefoneUsuarioResponsavel: numeroWhatsApp
                };

                // Fazer requisição para a rota de WhatsApp
                const baseUrl = process.env.BASE_URL || 'http://localhost:8000';
                const whatsappUrl = `${baseUrl}/api/whatsapp/notificarNotaAdicionada`;
                
                console.log('🔗 URL do WhatsApp:', whatsappUrl);
                console.log('📦 Dados enviados:', whatsappData);

                const response = await axios.post(whatsappUrl, whatsappData, {
                    timeout: 10000, // 10 segundos de timeout
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Tenant-Id': String(req.tenantId || req.user?.tenant_id || ''),
                    }
                });

                console.log('✅ Resposta do WhatsApp:', response.data);
                console.log('📤 Notificação enviada via WhatsApp para:', numeroWhatsApp);

            } catch (whatsappError) {
                console.error('❌ Erro detalhado ao enviar WhatsApp:', {
                    message: whatsappError.message,
                    status: whatsappError.response?.status,
                    statusText: whatsappError.response?.statusText,
                    data: whatsappError.response?.data,
                    code: whatsappError.code,
                    config: {
                        url: whatsappError.config?.url,
                        method: whatsappError.config?.method,
                        data: whatsappError.config?.data
                    }
                });
                
                // Específicos para diferentes tipos de erro
                if (whatsappError.code === 'ECONNREFUSED') {
                    console.error('🔌 Erro de conexão: Servidor WhatsApp não está rodando');
                } else if (whatsappError.code === 'ETIMEDOUT') {
                    console.error('⏰ Timeout: WhatsApp demorou para responder');
                } else if (whatsappError.response?.status === 404) {
                    console.error('🔍 Rota não encontrada: /api/whatsapp/notificarNotaAdicionada');
                } else if (whatsappError.response?.status === 503) {
                    console.error('🚫 WhatsApp não está conectado ou autenticado');
                }
                
                // Não falhar a criação da nota se o WhatsApp falhar
            }
        } else {
            console.log('❌ Não foi possível enviar WhatsApp:', {
                temNumero: !!numeroWhatsApp,
                temUsuario: !!usuarioQueEuCadastrei,
                numero: numeroWhatsApp
            });
        }

        // 📊 PREPARAR DADOS PARA RESPOSTA
        const response = {
            ...novaNota.toJSON(),
            usuario_responsavel: usuarioQueEuCadastrei ? {
                id: usuarioQueEuCadastrei.id,
                nome: `${usuarioQueEuCadastrei.first_name} ${usuarioQueEuCadastrei.last_name}`,
                telefone: numeroWhatsApp
            } : null,
            cliente_nome: cliente.nome || cliente.first_name || 'Cliente não identificado',
            whatsapp_enviado: !!numeroWhatsApp,
            debug_info: {
                cliente_criado_por_id: cliente.criado_por_id,
                cliente_user_id: cliente.user_id,
                usuario_encontrado: !!usuarioQueEuCadastrei,
                numero_whatsapp: numeroWhatsApp
            }
        };

        console.log('✅ Nota criada e notificação processada:', {
            usuario: usuarioQueEuCadastrei ? `${usuarioQueEuCadastrei.first_name} ${usuarioQueEuCadastrei.last_name}` : 'Não identificado',
            telefone: numeroWhatsApp || 'Não encontrado',
            whatsapp_enviado: !!numeroWhatsApp,
            cliente_user_id: cliente.user_id,
            cliente_criado_por_id: cliente.criado_por_id
        });

        res.status(201).json(response);

    } catch (error) {
        console.error('❌ Erro ao criar nota:', error);
        res.status(500).json({ error: error.message });
    }
});

// Rota para buscar uma nota específica por ID
router.get('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const nota = await Nota.findByPk(id);
        if (!nota) {
            return res.status(404).json({ message: 'Nota não encontrada.' });
        }
        res.status(200).json(nota);
    } catch (error) {
        console.error('Erro ao buscar nota:', error);
        res.status(500).json({ error: 'Erro ao buscar nota.' });
    }
});

// Rota para concluir uma nota
router.put('/:id/concluir', async (req, res) => {
    const { id } = req.params;

    try {
        const nota = await Nota.findByPk(id);
        if (!nota) {
            return res.status(404).json({ error: 'Nota não encontrada' });
        }

        nota.nova = false;
        await nota.save();

        res.status(200).json(nota);
    } catch (error) {
        console.error('Erro ao concluir nota:', error);
        res.status(500).json({ error: error.message });
    }
    // Emitir evento socket para conclusão de nota
    try {
        const { getSocketIO } = require('../socket');
        getSocketIO().emit('nota-concluida', {
            notaId: id
        });
    } catch (e) {
        console.warn('Socket.IO não inicializado:', e.message);
    }
});

// Rota para deletar uma nota
router.delete('/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const nota = await Nota.findByPk(id);
        if (!nota) {
            return res.status(404).json({ error: 'Nota não encontrada' });
        }

        await nota.destroy();
        res.status(204).send();
        // Emitir evento socket para deleção de nota
        try {
            const { getSocketIO } = require('../socket');
            getSocketIO().emit('nota-removida', {
                notaId: id
            });
        } catch (e) {
            console.warn('Socket.IO não inicializado:', e.message);
        }
    } catch (error) {
        console.error('Erro ao deletar nota:', error);
        res.status(500).json({ error: error.message });
    }
});

// Rota para buscar notas por cliente (RESTful: /api/notas/clientes/:id/notas)
router.get('/clientes/:id/notas', async (req, res) => {
    const { id } = req.params;
    try {
        const notas = await Nota.findAll({ where: { cliente_id: id } });
        // Não retornar 404 se não houver notas, apenas array vazio
        // Adiciona o nome do criador se existir
        const notasComCriador = await Promise.all(notas.map(async nota => {
            let criador = "Desconhecido";
            if (nota.criado_por_id) {
                const user = await User.findByPk(nota.criado_por_id);
                if (user) {
                    criador = user.first_name + (user.last_name ? ` ${user.last_name}` : '');
                }
            }
            return {
                ...nota.toJSON(),
                criado_por_id: nota.criado_por_id || "Desconhecido",
                criador_nome: criador
            };
        }));
        res.status(200).json(notasComCriador);
    } catch (error) {
        console.error('Erro ao buscar notas:', error);
        res.status(500).json({ error: 'Erro ao buscar notas.' });
    }
});

module.exports = router;
