const { Comissao } = require('../models');

module.exports = {
  async create(req, res) {
    try {
      const comissao = await Comissao.create(req.body);
      return res.status(201).json(comissao);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  },
  async list(req, res) {
    try {
      const comissoes = await Comissao.findAll();
      return res.json(comissoes);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  },
  async get(req, res) {
    try {
      const comissao = await Comissao.findByPk(req.params.id);
      if (!comissao) return res.status(404).json({ error: 'Comissão não encontrada' });
      return res.json(comissao);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  },
  async update(req, res) {
    try {
      const comissao = await Comissao.findByPk(req.params.id);
      if (!comissao) return res.status(404).json({ error: 'Comissão não encontrada' });
      await comissao.update(req.body);
      return res.json(comissao);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  },
  async delete(req, res) {
    try {
      const comissao = await Comissao.findByPk(req.params.id);
      if (!comissao) return res.status(404).json({ error: 'Comissão não encontrada' });
      await comissao.destroy();
      return res.status(204).send();
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  },
};
