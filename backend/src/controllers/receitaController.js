const { Receita } = require('../models');

module.exports = {
  async create(req, res) {
    try {
      const receita = await Receita.create(req.body);
      return res.status(201).json(receita);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  },
  async list(req, res) {
    try {
      const receitas = await Receita.findAll();
      return res.json(receitas);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  },
  async get(req, res) {
    try {
      const receita = await Receita.findByPk(req.params.id);
      if (!receita) return res.status(404).json({ error: 'Receita não encontrada' });
      return res.json(receita);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  },
  async update(req, res) {
    try {
      const receita = await Receita.findByPk(req.params.id);
      if (!receita) return res.status(404).json({ error: 'Receita não encontrada' });
      await receita.update(req.body);
      return res.json(receita);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  },
  async delete(req, res) {
    try {
      const receita = await Receita.findByPk(req.params.id);
      if (!receita) return res.status(404).json({ error: 'Receita não encontrada' });
      await receita.destroy();
      return res.status(204).send();
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  },
};
