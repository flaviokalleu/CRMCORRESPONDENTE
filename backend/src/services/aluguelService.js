'use strict';

const path = require('path');
const fs = require('fs');
const db = require('../models');

const ALUGUEIS_DIR = path.resolve(__dirname, '../../uploads/alugueis');
const TEMP_DIR = path.resolve(__dirname, '../../uploads/temp');

// Garantir diretórios
[ALUGUEIS_DIR, TEMP_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// ===== FILE HELPERS =====

function moveFileToFinal(tempPath, finalPath) {
  const dir = path.dirname(finalPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.renameSync(tempPath, finalPath);
  return finalPath;
}

function cleanupTempFiles(files) {
  if (!files) return;
  Object.values(files).forEach(fileArray => {
    if (Array.isArray(fileArray)) {
      fileArray.forEach(file => {
        try { if (fs.existsSync(file.path)) fs.unlinkSync(file.path); } catch (e) {}
      });
    }
  });
}

function cleanupOldTempFiles() {
  if (!fs.existsSync(TEMP_DIR)) return;
  const now = Date.now();
  fs.readdirSync(TEMP_DIR).forEach(file => {
    const filePath = path.join(TEMP_DIR, file);
    try {
      const stats = fs.statSync(filePath);
      if (now - stats.mtimeMs > 30 * 60 * 1000) fs.unlinkSync(filePath);
    } catch (e) {}
  });
}

function cleanupFinalFiles(files) {
  files.forEach(filePath => {
    try {
      const fullPath = path.resolve(__dirname, '../../uploads', filePath);
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    } catch (e) {}
  });
}

function deleteAluguelPhotos(aluguel) {
  const photosToDelete = [];
  if (aluguel.foto_capa) photosToDelete.push(aluguel.foto_capa);
  if (aluguel.fotos_adicionais) {
    try {
      const fotos = typeof aluguel.fotos_adicionais === 'string'
        ? JSON.parse(aluguel.fotos_adicionais)
        : aluguel.fotos_adicionais;
      if (Array.isArray(fotos)) photosToDelete.push(...fotos);
    } catch (e) {}
  }
  photosToDelete.forEach(foto => {
    try {
      const fullPath = path.resolve(__dirname, '../../uploads', foto);
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    } catch (e) {}
  });
}

// Iniciar limpeza periódica
setInterval(cleanupOldTempFiles, 15 * 60 * 1000);

// ===== BUSINESS LOGIC =====

function parseCurrencyValue(val) {
  if (!val) return null;
  const str = val.toString().replace(/[^\d,.-]/g, '').replace('.', '').replace(',', '.');
  return parseFloat(str) || null;
}

async function listarAlugueis() {
  return db.Aluguel.findAll({ order: [['created_at', 'DESC']] });
}

async function criarAluguel(data, files) {
  const finalFiles = [];
  try {
    // Foto capa
    let fotoCapa = null;
    if (files?.foto_capa?.[0]) {
      const file = files.foto_capa[0];
      const finalName = `alugueis/capa_${Date.now()}${path.extname(file.originalname)}`;
      const finalPath = path.resolve(__dirname, '../../uploads', finalName);
      moveFileToFinal(file.path, finalPath);
      fotoCapa = finalName;
      finalFiles.push(finalName);
    }

    // Fotos adicionais
    let fotosAdicionais = [];
    if (files?.fotos_adicionais) {
      for (const file of files.fotos_adicionais) {
        const finalName = `alugueis/foto_${Date.now()}_${Math.random().toString(36).substr(2, 5)}${path.extname(file.originalname)}`;
        const finalPath = path.resolve(__dirname, '../../uploads', finalName);
        moveFileToFinal(file.path, finalPath);
        fotosAdicionais.push(finalName);
        finalFiles.push(finalName);
      }
    }

    // Parse valor
    const valorAluguel = parseCurrencyValue(data.valor_aluguel);

    const aluguel = await db.Aluguel.create({
      ...data,
      valor_aluguel: valorAluguel || data.valor_aluguel,
      foto_capa: fotoCapa,
      fotos_adicionais: fotosAdicionais.length > 0 ? JSON.stringify(fotosAdicionais) : null
    });

    return aluguel;
  } catch (error) {
    cleanupFinalFiles(finalFiles);
    throw error;
  }
}

async function atualizarAluguel(id, data, files) {
  const aluguel = await db.Aluguel.findByPk(id);
  if (!aluguel) return null;

  const updateData = { ...data };

  // Nova foto capa
  if (files?.foto_capa?.[0]) {
    if (aluguel.foto_capa) {
      try {
        const oldPath = path.resolve(__dirname, '../../uploads', aluguel.foto_capa);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      } catch (e) {}
    }
    const file = files.foto_capa[0];
    const finalName = `alugueis/capa_${Date.now()}${path.extname(file.originalname)}`;
    moveFileToFinal(file.path, path.resolve(__dirname, '../../uploads', finalName));
    updateData.foto_capa = finalName;
  }

  // Novas fotos adicionais
  if (files?.fotos_adicionais) {
    const novasFotos = [];
    for (const file of files.fotos_adicionais) {
      const finalName = `alugueis/foto_${Date.now()}_${Math.random().toString(36).substr(2, 5)}${path.extname(file.originalname)}`;
      moveFileToFinal(file.path, path.resolve(__dirname, '../../uploads', finalName));
      novasFotos.push(finalName);
    }
    updateData.fotos_adicionais = JSON.stringify(novasFotos);
  }

  // Parse valor
  if (updateData.valor_aluguel) {
    const parsed = parseCurrencyValue(updateData.valor_aluguel);
    if (parsed) updateData.valor_aluguel = parsed;
  }

  await aluguel.update(updateData);
  return aluguel;
}

async function toggleAlugado(id) {
  const aluguel = await db.Aluguel.findByPk(id);
  if (!aluguel) return null;
  await aluguel.update({ alugado: !aluguel.alugado });
  return aluguel;
}

async function deletarAluguel(id) {
  const aluguel = await db.Aluguel.findByPk(id);
  if (!aluguel) return null;
  deleteAluguelPhotos(aluguel);
  await aluguel.destroy();
  return { success: true };
}

async function obterAluguel(id) {
  return db.Aluguel.findByPk(id);
}

module.exports = {
  listarAlugueis,
  criarAluguel,
  atualizarAluguel,
  toggleAlugado,
  deletarAluguel,
  obterAluguel,
  cleanupOldTempFiles,
  cleanupTempFiles,
  ALUGUEIS_DIR,
  TEMP_DIR
};
