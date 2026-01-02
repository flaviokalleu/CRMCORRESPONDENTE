const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const archiver = require('archiver'); // Biblioteca para criar arquivos ZIP
const db = require('../models');
const { Imovel } = require('../models'); // Certifique-se de que o caminho está correto
const { Op } = require('sequelize'); // Importar Op para operações do Sequelize
const router = express.Router();

// Função para criar pastas automaticamente
const createFolderIfNotExists = (folder) => {
  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder, { recursive: true });
  }
};

// Função para converter imagens para WebP e salvar em pasta apropriada
const convertImage = async (filePath, outputPath) => {
  await sharp(filePath)
    .webp({ quality: 80 }) // Converter para WebP com qualidade de 80
    .toFile(outputPath);
};

// Função para mover um arquivo para a pasta de deletar se ele existir
const moveFileToDeleteFolder = async (filePath) => {
  try {
    const deleteFolderPath = path.join(__dirname, '../../uploads/deletar');
    createFolderIfNotExists(deleteFolderPath);

    const fileName = path.basename(filePath);
    const newFilePath = path.join(deleteFolderPath, fileName);
    
    fs.rename(filePath, newFilePath, (err) => {
      if (err) {
        console.error(`Erro ao mover arquivo para a pasta de deletar: ${filePath}`, err);
      }
    });
  } catch (error) {
    console.error(`Erro ao mover arquivo: ${filePath}`, error);
  }
};

// Função para organizar e converter imagens
const organizeAndConvertImages = async (imovelId, files) => {
  const imovelFolderPath = path.join(__dirname, `../../uploads/imoveis/${imovelId}`);
  createFolderIfNotExists(imovelFolderPath); // Cria a pasta para o imóvel

  // Subpastas para imagens
  const imagensFolderPath = path.join(imovelFolderPath, 'imagens');
  createFolderIfNotExists(imagensFolderPath); // Cria a subpasta para as imagens

  // Caminhos dos arquivos
  const caminhos = {
    documentacao: null,
    imagens: [],
    imagem_capa: null,
  };

  // Processar imagem de capa
  const imagemCapaPath = files['imagem_capa'] ? files['imagem_capa'][0].path : null;
  if (imagemCapaPath) {
    const imagemCapaWebP = path.join(imovelFolderPath, 'capa.webp');
    await convertImage(imagemCapaPath, imagemCapaWebP);
    caminhos.imagem_capa = path.join('uploads', 'imoveis', imovelId.toString(), 'capa.webp');
    await moveFileToDeleteFolder(imagemCapaPath); // Mover o arquivo original para a pasta de deletar
  }

  // Processar imagens adicionais
  const imagensPaths = files['imagens'] || [];
  for (let i = 0; i < imagensPaths.length; i++) {
    const imgPath = imagensPaths[i].path;
    const imgWebP = path.join(imagensFolderPath, `${i + 1}.webp`);
    await convertImage(imgPath, imgWebP);
    caminhos.imagens.push(path.join('uploads', 'imoveis', imovelId.toString(), 'imagens', `${i + 1}.webp`));
    await moveFileToDeleteFolder(imgPath); // Mover o arquivo original para a pasta de deletar
  }

  // Processar documentação se existir
  const documentacaoPath = files['documentacao'] ? files['documentacao'][0].path : null;
  if (documentacaoPath) {
    const documentacaoWebP = path.join(imovelFolderPath, 'documentacao.webp');
    await convertImage(documentacaoPath, documentacaoWebP);
    caminhos.documentacao = path.join('uploads', 'imoveis', imovelId.toString(), 'documentacao.webp');
    await moveFileToDeleteFolder(documentacaoPath); // Mover o arquivo original para a pasta de deletar
  }

  return caminhos;
};

// Configuração de armazenamento do Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../uploads/');
    createFolderIfNotExists(uploadPath); // Cria o diretório se não existir
    cb(null, uploadPath); // Diretório para onde os arquivos serão armazenados
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Nome do arquivo
  }
});

// Filtro de arquivos para aceitar apenas imagens
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true); // Aceita o arquivo
  } else {
    cb(new Error('Invalid file type'), false); // Rejeita o arquivo
  }
};

// Configuração do Multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter
});

const uploadFields = upload.fields([
  { name: 'documentacao', maxCount: 1 },
  { name: 'imagens', maxCount: 50 },
  { name: 'imagem_capa', maxCount: 1 }
]);

// Rota para buscar todos os imóveis - ADICIONAR LOGS
router.get('/', async (req, res) => {
  try {
    console.log('Recebida requisição GET /imoveis');
    console.log('Query params:', req.query);
    
    const { categoria, localizacao } = req.query;

    // Filtros a serem aplicados
    const filters = {};

    // Adicione filtros baseado nos parâmetros recebidos
    if (categoria) {
      filters.tipo = categoria;
    }

    if (localizacao) {
      filters.localizacao = localizacao;
    }

    console.log('Filtros aplicados:', filters);

    // Buscando imóveis com os filtros aplicados
    const imoveis = await db.Imovel.findAll({
      where: filters,
    });

    console.log(`Encontrados ${imoveis.length} imóveis`);
    console.log('Primeiro imóvel (sample):', imoveis[0] || 'Nenhum imóvel encontrado');

    res.json(imoveis);
  } catch (error) {
    console.error('Erro detalhado ao buscar imóveis:', error);
    res.status(500).json({ 
      message: 'Erro ao buscar imóveis',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Rota para buscar imóveis com filtros

router.get('/imoveis', async (req, res) => {
  try {
    const { categoria, localizacao, busca } = req.query; // Extraindo parâmetros da consulta

    // Filtros a serem aplicados
    const filters = {};

    // Adicione filtros baseado nos parâmetros recebidos
    if (categoria) {
      filters.tipo = categoria; // Supondo que "categoria" refere-se ao tipo de imóvel
    }

    if (localizacao) {
      filters.localizacao = localizacao; // Filtro por localização
    }

    // Se houver um parâmetro de busca, incluir na consulta
    if (busca) {
      // Normaliza a string de busca
      const normalizedBusca = removeAcentos(busca.toLowerCase());
      // Adiciona filtro de busca
      filters[Op.or] = [
        { nome_imovel: { [Op.like]: `%${normalizedBusca}%` } },
        { descricao_imovel: { [Op.like]: `%${normalizedBusca}%` } },
        { endereco: { [Op.like]: `%${normalizedBusca}%` } },
        { tags: { [Op.like]: `%${normalizedBusca}%` } },
        { localizacao: { [Op.like]: `%${normalizedBusca}%` } },
        { observacoes: { [Op.like]: `%${normalizedBusca}%` } },
      ];
    }

    // Buscando imóveis com os filtros aplicados
    const imoveis = await db.Imovel.findAll({
      where: filters,
    });

    res.json(imoveis);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao buscar imóveis' });
  }
});

// Função para remover acentos
const removeAcentos = (str) => {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

// Rota para buscar imóveis
router.get('/busca', async (req, res) => {
  const { busca } = req.query;

  if (!busca) {
    return res.status(400).json({ message: "Parâmetro de busca é obrigatório." });
  }

  // Normaliza a string de busca
  const normalizedBusca = removeAcentos(busca.toLowerCase());

  try {
    // Consulta para buscar imóveis em todos os campos
    const properties = await Imovel.findAll({
      where: {
        [Op.or]: [
          { nome_imovel: { [Op.like]: `%${normalizedBusca}%` } },
          { descricao_imovel: { [Op.like]: `%${normalizedBusca}%` } },
          { tipo: { [Op.like]: `%${normalizedBusca}%` } },
          { endereco: { [Op.like]: `%${normalizedBusca}%` } },
          { tags: { [Op.like]: `%${normalizedBusca}%` } },
          { localizacao: { [Op.like]: `%${normalizedBusca}%` } },
          { observacoes: { [Op.like]: `%${normalizedBusca}%` } },
        ]
      }
    });

    res.json(properties);
  } catch (error) {
    console.error("Erro ao buscar imóveis:", error);
    res.status(500).json({ message: "Erro ao buscar imóveis." });
  }
});

// Rota para adicionar um imóvel
router.post('/', uploadFields, async (req, res) => {
  try {
    // Converta o campo 'exclusivo' para um valor numérico (1 para sim, 0 para não)
    const exclusivo = req.body.exclusivo === 'sim' ? 1 : 0;
    const tem_inquilino = req.body.tem_inquilino === 'sim' ? 1 : 0;

    // Criação do imóvel
    const novoImovel = await db.Imovel.create({
      nome_imovel: req.body.nome_imovel,
      descricao_imovel: req.body.descricao_imovel,
      endereco: req.body.endereco,
      tipo: req.body.tipo,
      quartos: req.body.quartos,
      banheiro: req.body.banheiro,
      tags: req.body.tags,
      valor_avaliacao: req.body.valor_avaliacao,
      valor_venda: req.body.valor_venda,
      documentacao: req.body.documentacao,
      imagens: req.body.imagens,
      imagem_capa: req.body.imagem_capa,
      localizacao: req.body.localizacao,
      exclusivo: exclusivo, // Aqui usa o valor numérico
      tem_inquilino: tem_inquilino, // Aqui usa o valor numérico
      situacao_imovel: req.body.situacao_imovel,
      observacoes: req.body.observacoes,
    });

    // Organizar e converter imagens após a criação do imóvel
    const caminhosImagens = await organizeAndConvertImages(novoImovel.id, req.files);

    // Atualizar o imóvel com os caminhos corretos
    await novoImovel.update({
      documentacao: caminhosImagens.documentacao,
      imagens: caminhosImagens.imagens,
      imagem_capa: caminhosImagens.imagem_capa,
    });

    res.status(201).json(novoImovel);

    // Emitir evento socket para criação de imóvel
    try {
      const { getSocketIO } = require('../socket');
      getSocketIO().emit('imovel-criado', {
        imovelId: novoImovel.id,
        nome: novoImovel.nome_imovel,
        criadoPor: req.user ? req.user.username : 'sistema'
      });
    } catch (e) {
      console.warn('Socket.IO não inicializado:', e.message);
    }
  } catch (error) {
    console.error('Erro ao criar imóvel:', error);
    res.status(500).json({ error: 'Erro ao criar imóvel' });
  }
  
  console.log(req.body); // Logs dos campos de texto
  console.log(req.files); // Logs dos arquivos enviados
});


// Rota para excluir um imóvel
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.Imovel.destroy({ where: { id } });
    res.status(200).json({ message: 'Imóvel deletado com sucesso' });

    // Emitir evento socket para deleção de imóvel
    try {
      const { getSocketIO } = require('../socket');
      getSocketIO().emit('imovel-removido', {
        imovelId: id,
        removidoPor: req.user ? req.user.username : 'sistema'
      });
    } catch (e) {
      console.warn('Socket.IO não inicializado:', e.message);
    }
  } catch (error) {
    console.error('Erro ao deletar imóvel:', error);
    res.status(500).json({ error: 'Erro ao deletar imóvel' });
  }
});

// Rota para editar um imóvel
router.put('/:id', uploadFields, async (req, res) => {
  try {
    const { id } = req.params;

    // Busca o imóvel existente no banco de dados
    const imovel = await db.Imovel.findByPk(id);

    if (!imovel) {
      return res.status(404).json({ error: 'Imóvel não encontrado' });
    }

    // Atualiza os dados do imóvel
    await imovel.update({
      nome_imovel: req.body.nome_imovel,
      descricao_imovel: req.body.descricao_imovel,
      endereco: req.body.endereco,
      tipo: req.body.tipo,
      quartos: req.body.quartos,
      banheiro: req.body.banheiro,
      tags: req.body.tags,
      valor_avaliacao: req.body.valor_avaliacao,
      valor_venda: req.body.valor_venda,
      localizacao: req.body.localizacao,
      exclusivo: req.body.exclusivo,
      tem_inquilino: req.body.tem_inquilino,
      situacao_imovel: req.body.situacao_imovel,
      observacoes: req.body.observacoes,
    });

    // Organizar e converter imagens se novos arquivos foram enviados
    if (req.files && Object.keys(req.files).length > 0) {
      const caminhosImagens = await organizeAndConvertImages(imovel.id, req.files);

      // Atualiza as imagens se forem fornecidas
      await imovel.update({
        documentacao: caminhosImagens.documentacao || imovel.documentacao,
        imagens: caminhosImagens.imagens.length > 0 ? caminhosImagens.imagens : imovel.imagens,
        imagem_capa: caminhosImagens.imagem_capa || imovel.imagem_capa,
      });
    }

    res.status(200).json(imovel);

    // Emitir evento socket para atualização de imóvel
    try {
      const { getSocketIO } = require('../socket');
      getSocketIO().emit('imovel-atualizado', {
        imovelId: imovel.id,
        alteradoPor: req.user ? req.user.username : 'sistema'
      });
    } catch (e) {
      console.warn('Socket.IO não inicializado:', e.message);
    }
  } catch (error) {
    console.error('Erro ao atualizar imóvel:', error);
    res.status(500).json({ error: 'Erro ao atualizar imóvel' });
  }
});

// Rota para baixar todas as imagens de um imóvel em um arquivo ZIP
router.get('/:id/download-imagens', async (req, res) => {
  try {
    const { id } = req.params;

    // Busca o imóvel no banco de dados
    const imovel = await db.Imovel.findByPk(id);
    if (!imovel) {
      return res.status(404).json({ error: 'Imóvel não encontrado' });
    }

    // Caminho da pasta do imóvel
    const imovelFolderPath = path.join(__dirname, `../../uploads/imoveis/${id}/imagens`);

    // Verifica se a pasta existe
    if (!fs.existsSync(imovelFolderPath)) {
      return res.status(404).json({ error: 'Nenhuma imagem encontrada para este imóvel' });
    }

    // Configura o cabeçalho para download do arquivo ZIP
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename=imagens_imovel_${id}.zip`);

    // Cria um arquivo ZIP
    const archive = archiver('zip', {
      zlib: { level: 9 } // Compressão máxima
    });

    // Lida com erros do ZIP
    archive.on('error', (err) => {
      throw err;
    });

    // Conecta o arquivo ZIP com a resposta
    archive.pipe(res);

    // Adiciona arquivos da pasta de imagens ao ZIP
    archive.directory(imovelFolderPath, false);

    // Finaliza o processo de arquivamento
    await archive.finalize();
  } catch (error) {
    console.error('Erro ao baixar imagens do imóvel:', error);
    res.status(500).json({ error: 'Erro ao baixar imagens do imóvel' });
  }
});

// Fetch a specific property by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const imovel = await db.Imovel.findByPk(id);

    if (!imovel) {
      return res.status(404).json({ success: false, error: 'Imóvel não encontrado' });
    }

    res.status(200).json({ success: true, data: imovel });
  } catch (error) {
    console.error('Erro ao buscar imóvel:', error);
    res.status(500).json({ success: false, error: 'Erro ao buscar imóvel' });
  }
});

// Rota para buscar imóveis semelhantes
router.get('/:id/semelhantes', async (req, res) => {
  try {
    const { id } = req.params;

    // Busca o imóvel específico para obter a localização
    const imovel = await db.Imovel.findByPk(id);
    if (!imovel) {
      return res.status(404).json({ error: 'Imóvel não encontrado' });
    }

    // Busca imóveis com a mesma localização, excluindo o imóvel atual
    const semelhantes = await db.Imovel.findAll({
      where: {
        localizacao: imovel.localizacao,
        id: {
          [Op.ne]: id // Exclui o próprio imóvel da lista
        }
      }
    });

    res.status(200).json(semelhantes);
  } catch (error) {
    console.error('Erro ao buscar imóveis semelhantes:', error);
    res.status(500).json({ error: 'Erro ao buscar imóveis semelhantes' });
  }
});


module.exports = router;
