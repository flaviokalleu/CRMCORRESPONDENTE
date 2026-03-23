'use strict';

const imovelService = require('../services/imovelService');
const { getSocketIO } = require('../socket');

async function listarImoveis(req, res) {
  try {
    const imoveis = await imovelService.listarImoveis(req.query);
    res.json(imoveis);
  } catch (error) {
    console.error('Erro ao listar imóveis:', error);
    res.status(500).json({ error: 'Erro ao listar imóveis' });
  }
}

async function buscarImoveis(req, res) {
  try {
    if (!req.query.busca) return res.status(400).json({ error: 'Parâmetro busca é obrigatório' });
    const imoveis = await imovelService.listarImoveis({ busca: req.query.busca });
    res.json(imoveis);
  } catch (error) {
    console.error('Erro ao buscar imóveis:', error);
    res.status(500).json({ error: 'Erro ao buscar imóveis' });
  }
}

async function criarImovel(req, res) {
  try {
    const imovel = await imovelService.criarImovel(req.body, req.files);
    try { getSocketIO().emit('imovel-criado', imovel); } catch (e) {}
    res.status(201).json(imovel);
  } catch (error) {
    console.error('Erro ao criar imóvel:', error);
    res.status(500).json({ error: 'Erro ao criar imóvel', details: error.message });
  }
}

async function atualizarImovel(req, res) {
  try {
    const imovel = await imovelService.atualizarImovel(req.params.id, req.body, req.files);
    if (!imovel) return res.status(404).json({ error: 'Imóvel não encontrado' });
    try { getSocketIO().emit('imovel-atualizado', imovel); } catch (e) {}
    res.json(imovel);
  } catch (error) {
    console.error('Erro ao atualizar imóvel:', error);
    res.status(500).json({ error: 'Erro ao atualizar imóvel', details: error.message });
  }
}

async function deletarImovel(req, res) {
  try {
    const result = await imovelService.deletarImovel(req.params.id);
    if (!result) return res.status(404).json({ error: 'Imóvel não encontrado' });
    try { getSocketIO().emit('imovel-removido', { id: req.params.id }); } catch (e) {}
    res.json({ message: 'Imóvel excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar imóvel:', error);
    res.status(500).json({ error: 'Erro ao deletar imóvel' });
  }
}

async function obterImovel(req, res) {
  try {
    const imovel = await imovelService.obterImovel(req.params.id);
    if (!imovel) return res.status(404).json({ error: 'Imóvel não encontrado' });
    res.json(imovel);
  } catch (error) {
    console.error('Erro ao buscar imóvel:', error);
    res.status(500).json({ error: 'Erro ao buscar imóvel' });
  }
}

async function obterSemelhantes(req, res) {
  try {
    const imoveis = await imovelService.obterSemelhantes(req.params.id);
    res.json(imoveis);
  } catch (error) {
    console.error('Erro ao buscar semelhantes:', error);
    res.status(500).json({ error: 'Erro ao buscar imóveis semelhantes' });
  }
}

async function downloadImagens(req, res) {
  try {
    const path = require('path');
    const fs = require('fs');
    const archiver = require('archiver');

    const imgDir = path.resolve(__dirname, `../../uploads/imoveis/${req.params.id}/imagens`);
    if (!fs.existsSync(imgDir)) return res.status(404).json({ error: 'Nenhuma imagem encontrada' });

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename=imovel_${req.params.id}_imagens.zip`);

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.pipe(res);
    archive.directory(imgDir, false);
    archive.finalize();
  } catch (error) {
    console.error('Erro ao baixar imagens:', error);
    res.status(500).json({ error: 'Erro ao baixar imagens' });
  }
}

module.exports = {
  listarImoveis,
  buscarImoveis,
  criarImovel,
  atualizarImovel,
  deletarImovel,
  obterImovel,
  obterSemelhantes,
  downloadImagens
};
