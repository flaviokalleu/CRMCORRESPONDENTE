const { FluxoCaixa } = require('../models');

module.exports = {
  // Dashboard financeiro: retorna totais de receitas, despesas, lucro e pendências
  async dashboard(req, res) {
    try {
      const { Receita, Despesa } = require('../models');

      // Total de receitas
      const totalReceitas = await Receita.sum('valor') || 0;
      // Total de despesas
      const totalDespesas = await Despesa.sum('valor') || 0;
      // Lucro líquido
      const lucro = totalReceitas - totalDespesas;

      // Pendências: receitas e despesas com data futura
      const hoje = new Date();
      const pendenciasReceitas = await Receita.count({ where: { data: { [require('sequelize').Op.gt]: hoje } } });
      const pendenciasDespesas = await Despesa.count({ where: { data: { [require('sequelize').Op.gt]: hoje } } });
      const pendencias = pendenciasReceitas + pendenciasDespesas;

      return res.json({
        totalReceitas: Number(totalReceitas),
        totalDespesas: Number(totalDespesas),
        lucro: Number(lucro),
        pendencias
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  },
  async create(req, res) {
    try {
      const fluxo = await FluxoCaixa.create(req.body);
      return res.status(201).json(fluxo);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  },
  async list(req, res) {
    try {
      const fluxos = await FluxoCaixa.findAll();
      return res.json(fluxos);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  },
  async get(req, res) {
    try {
      const fluxo = await FluxoCaixa.findByPk(req.params.id);
      if (!fluxo) return res.status(404).json({ error: 'Fluxo não encontrado' });
      return res.json(fluxo);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  },
  async update(req, res) {
    try {
      const fluxo = await FluxoCaixa.findByPk(req.params.id);
      if (!fluxo) return res.status(404).json({ error: 'Fluxo não encontrado' });
      await fluxo.update(req.body);
      return res.json(fluxo);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  },
  async delete(req, res) {
    try {
      const fluxo = await FluxoCaixa.findByPk(req.params.id);
      if (!fluxo) return res.status(404).json({ error: 'Fluxo não encontrado' });
      await fluxo.destroy();
      return res.status(204).send();
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  },
};
