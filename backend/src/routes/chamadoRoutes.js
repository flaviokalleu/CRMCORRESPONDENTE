const express = require('express');
const jwt = require('jsonwebtoken');
const { ChamadoManutencao, ClienteAluguel, Aluguel } = require('../models');

const router = express.Router();

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';
const WHATSAPP_API_URL = `${BACKEND_URL}/api/whatsapp`;

// Helper para enviar WhatsApp via API Baileys
async function enviarWhatsApp(telefone, mensagem) {
  try {
    const numero = telefone.replace(/\D/g, '');
    const destinatario = numero.startsWith('55') ? numero : `55${numero}`;
    const response = await fetch(`${WHATSAPP_API_URL}/send-message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: destinatario, message: mensagem })
    });
    const result = await response.json();
    if (!result.success) {
      console.log('WhatsApp nao disponivel:', result.message);
    }
  } catch (error) {
    console.error('Erro ao enviar WhatsApp:', error.message);
  }
}
const JWT_SECRET = process.env.JWT_SECRET_KEY || 'portal-inquilino-secret';

// Middleware do portal do inquilino
const authenticateInquilino = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'Token nao fornecido' });
  try {
    const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
    if (decoded.tipo !== 'inquilino') return res.status(403).json({ error: 'Acesso nao autorizado' });
    req.inquilino = decoded;
    next();
  } catch { return res.status(401).json({ error: 'Token invalido' }); }
};

// ===== ROTAS DO PORTAL (INQUILINO) =====

// POST /api/portal/chamados — Inquilino abre chamado
router.post('/portal/chamados', authenticateInquilino, async (req, res) => {
  try {
    const { titulo, descricao, categoria, prioridade } = req.body;
    const cliente = await ClienteAluguel.findByPk(req.inquilino.cliente_aluguel_id);

    const chamado = await ChamadoManutencao.create({
      cliente_aluguel_id: req.inquilino.cliente_aluguel_id,
      aluguel_id: cliente?.aluguel_id || null,
      titulo, descricao,
      categoria: categoria || 'outros',
      prioridade: prioridade || 'media',
    });

    // Notificar admin via WhatsApp
    const defaultPhone = process.env.DEFAULT_PHONE_NUMBER;
    if (defaultPhone) {
      const prioridadeEmoji = { baixa: '', media: '', alta: '!', urgente: 'URGENTE!' }[chamado.prioridade] || '';
      await enviarWhatsApp(defaultPhone,
        `Novo chamado de manutencao ${prioridadeEmoji}\n\nInquilino: ${cliente?.nome || 'N/A'}\nTitulo: ${titulo}\nCategoria: ${categoria || 'outros'}\nPrioridade: ${chamado.prioridade}\n\n${descricao}`
      );
    }

    res.status(201).json(chamado);
  } catch (error) {
    console.error('Erro ao abrir chamado:', error);
    res.status(500).json({ error: 'Erro ao abrir chamado' });
  }
});

// GET /api/portal/chamados — Inquilino lista seus chamados
router.get('/portal/chamados', authenticateInquilino, async (req, res) => {
  try {
    const chamados = await ChamadoManutencao.findAll({
      where: { cliente_aluguel_id: req.inquilino.cliente_aluguel_id },
      order: [['created_at', 'DESC']],
    });
    res.status(200).json(chamados);
  } catch (error) {
    console.error('Erro ao listar chamados:', error);
    res.status(500).json({ error: 'Erro ao listar chamados' });
  }
});

// ===== ROTAS DO ADMIN =====

// GET /api/chamados — Admin lista todos os chamados
router.get('/chamados', async (req, res) => {
  try {
    const { status, prioridade } = req.query;
    const where = {};
    if (status) where.status = status;
    if (prioridade) where.prioridade = prioridade;

    const chamados = await ChamadoManutencao.findAll({
      where,
      include: [
        { model: ClienteAluguel, as: 'clienteAluguel', attributes: ['id', 'nome', 'telefone'] },
        { model: Aluguel, as: 'imovel', attributes: ['id', 'nome_imovel'] },
      ],
      order: [
        [require('sequelize').literal("CASE WHEN prioridade = 'urgente' THEN 1 WHEN prioridade = 'alta' THEN 2 WHEN prioridade = 'media' THEN 3 ELSE 4 END"), 'ASC'],
        ['created_at', 'DESC'],
      ],
    });
    res.status(200).json(chamados);
  } catch (error) {
    console.error('Erro ao listar chamados admin:', error);
    res.status(500).json({ error: 'Erro ao listar chamados' });
  }
});

// PUT /api/chamados/:id — Admin atualiza chamado (status, resposta)
router.put('/chamados/:id', async (req, res) => {
  try {
    const chamado = await ChamadoManutencao.findByPk(req.params.id, {
      include: [{ model: ClienteAluguel, as: 'clienteAluguel' }],
    });
    if (!chamado) return res.status(404).json({ error: 'Chamado nao encontrado' });

    const { status, resposta_admin } = req.body;

    await chamado.update({
      status: status || chamado.status,
      resposta_admin: resposta_admin || chamado.resposta_admin,
      data_resolucao: status === 'resolvido' ? new Date() : chamado.data_resolucao,
    });

    // Notificar inquilino via WhatsApp sobre atualização
    if (chamado.clienteAluguel?.telefone) {
      let msg = `Atualizacao do seu chamado "${chamado.titulo}": Status agora e "${status || chamado.status}".`;
      if (resposta_admin) msg += `\n\nResposta: ${resposta_admin}`;

      await enviarWhatsApp(chamado.clienteAluguel.telefone, msg);
    }

    res.status(200).json(chamado);
  } catch (error) {
    console.error('Erro ao atualizar chamado:', error);
    res.status(500).json({ error: 'Erro ao atualizar chamado' });
  }
});

// GET /api/chamados/resumo — Resumo de chamados
router.get('/chamados/resumo', async (req, res) => {
  try {
    const total = await ChamadoManutencao.count();
    const abertos = await ChamadoManutencao.count({ where: { status: 'aberto' } });
    const emAndamento = await ChamadoManutencao.count({ where: { status: 'em_andamento' } });
    const resolvidos = await ChamadoManutencao.count({ where: { status: 'resolvido' } });
    const urgentes = await ChamadoManutencao.count({ where: { prioridade: 'urgente', status: ['aberto', 'em_andamento'] } });

    res.status(200).json({ total, abertos, em_andamento: emAndamento, resolvidos, urgentes });
  } catch (error) {
    console.error('Erro ao buscar resumo:', error);
    res.status(500).json({ error: 'Erro ao buscar resumo' });
  }
});

module.exports = router;
