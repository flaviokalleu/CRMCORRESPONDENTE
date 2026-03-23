const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/authenticateToken');
const logger = require('../config/logger');

// GET /api/timeline/cliente/:clienteId — timeline agregada do cliente
router.get('/cliente/:clienteId', authenticateToken, async (req, res) => {
  try {
    const { Nota, Pagamento, Simulacao, User } = require('../models');
    const clienteId = req.params.clienteId;
    const timeline = [];

    // Notas
    try {
      const notas = await Nota.findAll({
        where: { cliente_id: clienteId },
        include: [{ model: User, as: 'criador', attributes: ['id', 'first_name', 'last_name'] }],
        order: [['created_at', 'DESC']],
        limit: 50,
      });
      notas.forEach(n => timeline.push({
        tipo: 'nota',
        titulo: n.titulo || 'Nota adicionada',
        descricao: n.conteudo,
        data: n.created_at,
        usuario: n.criador ? `${n.criador.first_name} ${n.criador.last_name}` : null,
        id: n.id,
      }));
    } catch { /* modelo pode não existir */ }

    // Pagamentos
    try {
      const pagamentos = await Pagamento.findAll({
        where: { cliente_id: clienteId },
        order: [['created_at', 'DESC']],
        limit: 50,
      });
      pagamentos.forEach(p => timeline.push({
        tipo: 'pagamento',
        titulo: `Pagamento ${p.status || 'registrado'}`,
        descricao: `R$ ${parseFloat(p.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} — ${p.tipo || 'N/A'}`,
        data: p.created_at,
        status: p.status,
        id: p.id,
      }));
    } catch { /* modelo pode não existir */ }

    // Simulações
    try {
      const simulacoes = await Simulacao.findAll({
        where: { cliente_id: clienteId },
        include: [{ model: User, as: 'user', attributes: ['id', 'first_name', 'last_name'] }],
        order: [['created_at', 'DESC']],
        limit: 20,
      });
      simulacoes.forEach(s => timeline.push({
        tipo: 'simulacao',
        titulo: `Simulação ${s.sistema}`,
        descricao: `Imóvel: R$ ${parseFloat(s.valor_imovel || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} | Parcela: R$ ${parseFloat(s.primeira_parcela || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        data: s.created_at,
        usuario: s.user ? `${s.user.first_name} ${s.user.last_name}` : null,
        id: s.id,
      }));
    } catch { /* modelo pode não existir */ }

    // Visitas
    try {
      const { Visita, Imovel } = require('../models');
      const visitas = await Visita.findAll({
        where: { cliente_id: clienteId },
        include: [
          { model: Imovel, as: 'imovel', attributes: ['id', 'nome_imovel'] },
          { model: User, as: 'corretor', attributes: ['id', 'first_name', 'last_name'] },
        ],
        order: [['data_visita', 'DESC']],
        limit: 30,
      });
      visitas.forEach(v => timeline.push({
        tipo: 'visita',
        titulo: `Visita ${v.status}`,
        descricao: `${v.imovel?.nome_imovel || 'Imóvel'}${v.feedback_cliente ? ` — ${v.feedback_cliente}` : ''}`,
        data: v.data_visita,
        usuario: v.corretor ? `${v.corretor.first_name} ${v.corretor.last_name}` : null,
        status: v.status,
        id: v.id,
      }));
    } catch { /* modelo pode não existir */ }

    // Propostas
    try {
      const { Proposta, Imovel } = require('../models');
      const propostas = await Proposta.findAll({
        where: { cliente_id: clienteId },
        include: [{ model: Imovel, as: 'imovel', attributes: ['id', 'nome_imovel'] }],
        order: [['created_at', 'DESC']],
        limit: 20,
      });
      propostas.forEach(p => timeline.push({
        tipo: 'proposta',
        titulo: `Proposta ${p.status}`,
        descricao: `${p.imovel?.nome_imovel || 'Imóvel'} — R$ ${parseFloat(p.valor_ofertado || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        data: p.created_at,
        status: p.status,
        id: p.id,
      }));
    } catch { /* modelo pode não existir */ }

    // Ordenar por data (mais recente primeiro)
    timeline.sort((a, b) => new Date(b.data) - new Date(a.data));

    res.json({ success: true, data: timeline });
  } catch (error) {
    logger.error({ err: error }, 'Erro ao montar timeline do cliente');
    res.status(500).json({ success: false, error: 'Erro ao montar timeline' });
  }
});

module.exports = router;
