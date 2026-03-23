'use strict';

const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const db = require('../models');
const { Op } = require('sequelize');

// ===== FILE HELPERS =====

function createFolderIfNotExists(folder) {
  if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });
}

async function convertImage(filePath, outputPath) {
  await sharp(filePath).webp({ quality: 80 }).toFile(outputPath);
  return outputPath;
}

function moveFileToDeleteFolder(filePath) {
  const deleteDir = path.resolve(__dirname, '../../uploads/deletar');
  createFolderIfNotExists(deleteDir);
  const fileName = path.basename(filePath);
  const deletePath = path.join(deleteDir, `${Date.now()}_${fileName}`);
  try {
    if (fs.existsSync(filePath)) fs.renameSync(filePath, deletePath);
  } catch (e) {}
}

async function organizeAndConvertImages(imovelId, files) {
  const baseDir = path.resolve(__dirname, '../../uploads/imoveis', String(imovelId));
  const paths = {};

  if (files?.imagem_capa?.[0]) {
    const capaDir = path.join(baseDir, 'capa');
    createFolderIfNotExists(capaDir);
    const webpName = `capa_${Date.now()}.webp`;
    const webpPath = path.join(capaDir, webpName);
    await convertImage(files.imagem_capa[0].path, webpPath);
    moveFileToDeleteFolder(files.imagem_capa[0].path);
    paths.imagem_capa = `imoveis/${imovelId}/capa/${webpName}`;
  }

  if (files?.imagens) {
    const imgDir = path.join(baseDir, 'imagens');
    createFolderIfNotExists(imgDir);
    const imagensPaths = [];
    for (let i = 0; i < files.imagens.length; i++) {
      const webpName = `img_${Date.now()}_${i}.webp`;
      const webpPath = path.join(imgDir, webpName);
      await convertImage(files.imagens[i].path, webpPath);
      moveFileToDeleteFolder(files.imagens[i].path);
      imagensPaths.push(`imoveis/${imovelId}/imagens/${webpName}`);
    }
    paths.imagens = imagensPaths;
  }

  if (files?.documentacao?.[0]) {
    const docDir = path.join(baseDir, 'documentacao');
    createFolderIfNotExists(docDir);
    const ext = path.extname(files.documentacao[0].originalname);
    const docName = `doc_${Date.now()}${ext}`;
    const docPath = path.join(docDir, docName);
    fs.renameSync(files.documentacao[0].path, docPath);
    paths.documentacao = `imoveis/${imovelId}/documentacao/${docName}`;
  }

  return paths;
}

function removeAcentos(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

// ===== BUSINESS LOGIC =====

async function listarImoveis({ categoria, localizacao, busca } = {}) {
  const where = {};

  if (categoria) where.tipo = categoria;
  if (localizacao) where.localizacao = { [Op.iLike]: `%${localizacao}%` };

  if (busca) {
    const term = `%${removeAcentos(busca)}%`;
    where[Op.or] = [
      { titulo: { [Op.iLike]: `%${busca}%` } },
      { descricao: { [Op.iLike]: `%${busca}%` } },
      { localizacao: { [Op.iLike]: `%${busca}%` } },
      { tipo: { [Op.iLike]: `%${busca}%` } },
      { endereco: { [Op.iLike]: `%${busca}%` } },
      { bairro: { [Op.iLike]: `%${busca}%` } },
      { cidade: { [Op.iLike]: `%${busca}%` } },
    ];
  }

  return db.Imovel.findAll({ where, order: [['created_at', 'DESC']] });
}

async function criarImovel(data, files) {
  const imovel = await db.Imovel.create(data);

  if (files && Object.keys(files).length > 0) {
    const paths = await organizeAndConvertImages(imovel.id, files);
    if (Object.keys(paths).length > 0) {
      await imovel.update(paths);
    }
  }

  return imovel;
}

async function atualizarImovel(id, data, files) {
  const imovel = await db.Imovel.findByPk(id);
  if (!imovel) return null;

  const updateData = { ...data };

  if (files && Object.keys(files).length > 0) {
    const paths = await organizeAndConvertImages(id, files);
    Object.assign(updateData, paths);
  }

  await imovel.update(updateData);
  return imovel;
}

async function deletarImovel(id) {
  const imovel = await db.Imovel.findByPk(id);
  if (!imovel) return null;
  await imovel.destroy();
  return { success: true };
}

async function obterImovel(id) {
  return db.Imovel.findByPk(id);
}

async function obterSemelhantes(id) {
  const imovel = await db.Imovel.findByPk(id);
  if (!imovel || !imovel.localizacao) return [];

  return db.Imovel.findAll({
    where: {
      localizacao: imovel.localizacao,
      id: { [Op.ne]: id }
    },
    limit: 6
  });
}

module.exports = {
  listarImoveis,
  criarImovel,
  atualizarImovel,
  deletarImovel,
  obterImovel,
  obterSemelhantes,
  organizeAndConvertImages,
  removeAcentos
};
