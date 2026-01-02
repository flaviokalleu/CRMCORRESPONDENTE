const { Despesa } = require('../models');

module.exports = {
  async create(req, res) {
    try {
      const despesa = await Despesa.create(req.body);
      return res.status(201).json(despesa);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  },
  async list(req, res) {
    try {
      const despesas = await Despesa.findAll();
      return res.json(despesas);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  },
  async get(req, res) {
    try {
      const despesa = await Despesa.findByPk(req.params.id);
      if (!despesa) return res.status(404).json({ error: 'Despesa não encontrada' });
      return res.json(despesa);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  },
  async update(req, res) {
    try {
      const despesa = await Despesa.findByPk(req.params.id);
      if (!despesa) return res.status(404).json({ error: 'Despesa não encontrada' });
      await despesa.update(req.body);
      return res.json(despesa);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  },
  async delete(req, res) {
    try {
      const despesa = await Despesa.findByPk(req.params.id);
      if (!despesa) return res.status(404).json({ error: 'Despesa não encontrada' });
      await despesa.destroy();
      return res.status(204).send();
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  },
};
