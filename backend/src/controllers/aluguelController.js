'use strict';

const aluguelService = require('../services/aluguelService');
const { getSocketIO } = require('../socket');

async function listarAlugueis(req, res) {
  try {
    const alugueis = await aluguelService.listarAlugueis();
    res.json(alugueis);
  } catch (error) {
    console.error('Erro ao listar aluguéis:', error);
    res.status(500).json({ error: 'Erro ao listar aluguéis' });
  }
}

async function criarAluguel(req, res) {
  try {
    const aluguel = await aluguelService.criarAluguel(req.body, req.files);
    try { getSocketIO().emit('aluguel-criado', aluguel); } catch (e) {}
    res.status(201).json(aluguel);
  } catch (error) {
    aluguelService.cleanupTempFiles(req.files);
    console.error('Erro ao criar aluguel:', error);
    res.status(500).json({ error: 'Erro ao criar aluguel', details: error.message });
  }
}

async function atualizarAluguel(req, res) {
  try {
    const aluguel = await aluguelService.atualizarAluguel(req.params.id, req.body, req.files);
    if (!aluguel) return res.status(404).json({ error: 'Aluguel não encontrado' });
    try { getSocketIO().emit('aluguel-atualizado', aluguel); } catch (e) {}
    res.json(aluguel);
  } catch (error) {
    console.error('Erro ao atualizar aluguel:', error);
    res.status(500).json({ error: 'Erro ao atualizar aluguel', details: error.message });
  }
}

async function toggleAlugado(req, res) {
  try {
    const aluguel = await aluguelService.toggleAlugado(req.params.id);
    if (!aluguel) return res.status(404).json({ error: 'Aluguel não encontrado' });
    res.json(aluguel);
  } catch (error) {
    console.error('Erro ao alterar status:', error);
    res.status(500).json({ error: 'Erro ao alterar status' });
  }
}

async function deletarAluguel(req, res) {
  try {
    const result = await aluguelService.deletarAluguel(req.params.id);
    if (!result) return res.status(404).json({ error: 'Aluguel não encontrado' });
    try { getSocketIO().emit('aluguel-removido', { id: req.params.id }); } catch (e) {}
    res.json({ message: 'Aluguel excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar aluguel:', error);
    res.status(500).json({ error: 'Erro ao deletar aluguel' });
  }
}

async function downloadFotos(req, res) {
  try {
    const aluguel = await aluguelService.obterAluguel(req.params.id);
    if (!aluguel) return res.status(404).json({ error: 'Aluguel não encontrado' });

    const archiver = require('archiver');
    const path = require('path');
    const fs = require('fs');

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename=aluguel_${aluguel.id}_fotos.zip`);

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.pipe(res);

    const uploadsDir = path.resolve(__dirname, '../../uploads');
    if (aluguel.foto_capa) {
      const capaPath = path.join(uploadsDir, aluguel.foto_capa);
      if (fs.existsSync(capaPath)) archive.file(capaPath, { name: `capa${path.extname(aluguel.foto_capa)}` });
    }

    if (aluguel.fotos_adicionais) {
      const fotos = typeof aluguel.fotos_adicionais === 'string'
        ? JSON.parse(aluguel.fotos_adicionais)
        : aluguel.fotos_adicionais;
      if (Array.isArray(fotos)) {
        fotos.forEach((foto, i) => {
          const fotoPath = path.join(uploadsDir, foto);
          if (fs.existsSync(fotoPath)) archive.file(fotoPath, { name: `foto_${i + 1}${path.extname(foto)}` });
        });
      }
    }

    archive.finalize();
  } catch (error) {
    console.error('Erro ao baixar fotos:', error);
    res.status(500).json({ error: 'Erro ao baixar fotos' });
  }
}

async function cleanupTemp(req, res) {
  aluguelService.cleanupOldTempFiles();
  res.json({ success: true, message: 'Limpeza de temporários executada' });
}

module.exports = {
  listarAlugueis,
  criarAluguel,
  atualizarAluguel,
  toggleAlugado,
  deletarAluguel,
  downloadFotos,
  cleanupTemp
};
