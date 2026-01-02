const { getSocketIO } = require('../socket');
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const archiver = require('archiver');
const db = require('../models');

// Configuração de diretórios
const uploadDirectory = path.join(__dirname, '../../uploads/alugueis');
const tempDirectory = path.join(__dirname, '../../uploads/temp');

// Criar diretórios se não existirem
[uploadDirectory, tempDirectory].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Função para mover arquivo do temp para diretório final
const moveFileToFinal = (tempPath, finalPath) => {
  try {
    const finalDir = path.dirname(finalPath);
    if (!fs.existsSync(finalDir)) {
      fs.mkdirSync(finalDir, { recursive: true });
    }
    fs.renameSync(tempPath, finalPath);
    return true;
  } catch (error) {
    console.error('Erro ao mover arquivo:', error);
    return false;
  }
};

// Função para limpar arquivos temporários
const cleanupTempFiles = (files) => {
  if (!files) return;
  
  Object.values(files).flat().forEach(file => {
    if (file.path && fs.existsSync(file.path)) {
      try {
        fs.unlinkSync(file.path);
        console.log(`Arquivo temporário removido: ${file.filename}`);
      } catch (error) {
        console.error(`Erro ao remover arquivo temporário ${file.filename}:`, error);
      }
    }
  });
};

// Função para limpar arquivos antigos (executar periodicamente)
const cleanupOldTempFiles = () => {
  const now = Date.now();
  const maxAge = 30 * 60 * 1000; // 30 minutos
  
  try {
    if (fs.existsSync(tempDirectory)) {
      const files = fs.readdirSync(tempDirectory);
      
      files.forEach(file => {
        const filePath = path.join(tempDirectory, file);
        const stats = fs.statSync(filePath);
        
        if (now - stats.mtime.getTime() > maxAge) {
          fs.unlinkSync(filePath);
          console.log(`Arquivo temporário antigo removido: ${file}`);
        }
      });
    }
  } catch (error) {
    console.error('Erro na limpeza de arquivos antigos:', error);
  }
};

// Executar limpeza a cada 15 minutos
setInterval(cleanupOldTempFiles, 15 * 60 * 1000);

// Configuração do multer - primeiro salvar em temp
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, tempDirectory);
  },
  filename: function (req, file, cb) {
    const uniqueName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Apenas imagens são permitidas!'));
    }
  }
});

// Rota para buscar todos os aluguéis
router.get('/', async (req, res) => {
  try {
    const alugueis = await db.Aluguel.findAll({
      order: [['created_at', 'DESC']]
    });
    
    const alugueisFormatted = alugueis.map(aluguel => ({
      ...aluguel.toJSON(),
      foto_adicional: aluguel.foto_adicional
    }));
    
    res.status(200).json(alugueisFormatted);
  } catch (error) {
    console.error('Erro ao buscar aluguéis:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Rota para criar um novo aluguel
router.post('/', upload.fields([
  { name: 'fotoCapa', maxCount: 1 }, 
  { name: 'fotoAdicional', maxCount: 10 }
]), async (req, res) => {
  let tempFiles = [];
  let finalFiles = {
    fotoCapa: null,
    fotoAdicional: []
  };

  try {
    console.log('Dados recebidos:', req.body);
    console.log('Arquivos temporários recebidos:', req.files);

    const { nome_imovel, descricao, valor_aluguel, quartos, banheiro, dia_vencimento } = req.body;

    // Validações básicas
    if (!nome_imovel || !descricao || !valor_aluguel || !quartos || !banheiro || !dia_vencimento) {
      cleanupTempFiles(req.files);
      return res.status(400).json({ 
        error: 'Todos os campos obrigatórios devem ser preenchidos',
        camposFaltando: {
          nome_imovel: !nome_imovel,
          descricao: !descricao,
          valor_aluguel: !valor_aluguel,
          quartos: !quartos,
          banheiro: !banheiro,
          dia_vencimento: !dia_vencimento
        }
      });
    }

    // Preparar arquivos para movimentação
    if (req.files['fotoCapa']) {
      const tempFile = req.files['fotoCapa'][0];
      const finalFileName = `${Date.now()}_capa${path.extname(tempFile.originalname)}`;
      const finalPath = path.join(uploadDirectory, 'capa', finalFileName);
      
      if (moveFileToFinal(tempFile.path, finalPath)) {
        finalFiles.fotoCapa = finalFileName;
        console.log(`Foto de capa movida: ${finalFileName}`);
      } else {
        throw new Error('Erro ao processar foto de capa');
      }
    }

    if (req.files['fotoAdicional']) {
      for (const tempFile of req.files['fotoAdicional']) {
        const finalFileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}${path.extname(tempFile.originalname)}`;
        const finalPath = path.join(uploadDirectory, 'adicional', finalFileName);
        
        if (moveFileToFinal(tempFile.path, finalPath)) {
          finalFiles.fotoAdicional.push(finalFileName);
          console.log(`Foto adicional movida: ${finalFileName}`);
        } else {
          // Se falhar, limpar arquivos já movidos
          throw new Error('Erro ao processar fotos adicionais');
        }
      }
    }

    // Converter e validar valor_aluguel
    let valorDecimal;
    if (typeof valor_aluguel === 'string') {
      const valorLimpo = valor_aluguel.replace(/[^\d,]/g, '').replace(',', '.');
      valorDecimal = parseFloat(valorLimpo);
    } else {
      valorDecimal = parseFloat(valor_aluguel);
    }

    if (isNaN(valorDecimal) || valorDecimal <= 0) {
      // Limpar arquivos já movidos em caso de erro
      cleanupFinalFiles(finalFiles);
      return res.status(400).json({ error: 'Valor do aluguel deve ser um número válido maior que zero' });
    }


    // Criar o aluguel no banco de dados
    const novoAluguel = await db.Aluguel.create({
      nome_imovel: nome_imovel.toString().toUpperCase(),
      descricao: descricao.toString().toUpperCase(),
      valor_aluguel: valorDecimal,
      quartos: parseInt(quartos),
      banheiro: parseInt(banheiro),
      dia_vencimento: parseInt(dia_vencimento),
      foto_capa: finalFiles.fotoCapa,
      foto_adicional: finalFiles.fotoAdicional,
      alugado: false
    });

    console.log('Aluguel criado com sucesso:', novoAluguel.id);

    // Emitir evento socket
    try {
      getSocketIO().emit('aluguel-criado', {
        aluguelId: novoAluguel.id,
        nome_imovel: novoAluguel.nome_imovel
      });
    } catch (e) {
      console.warn('Socket.IO não inicializado:', e.message);
    }

    res.status(201).json({
      message: 'Imóvel cadastrado com sucesso!',
      aluguel: {
        ...novoAluguel.toJSON(),
        foto_adicional: novoAluguel.foto_adicional
      }
    });

  } catch (error) {
    console.error('Erro detalhado ao criar aluguel:', error);
    
    // Limpar arquivos temporários restantes
    cleanupTempFiles(req.files);
    
    // Limpar arquivos finais já movidos em caso de erro
    cleanupFinalFiles(finalFiles);

    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        error: 'Dados inválidos',
        detalhes: error.errors.map(err => ({
          campo: err.path,
          mensagem: err.message
        }))
      });
    }

    res.status(500).json({ 
      error: 'Erro interno do servidor ao criar imóvel'
    });
  }
});

// Função para limpar arquivos finais em caso de erro
const cleanupFinalFiles = (finalFiles) => {
  try {
    if (finalFiles.fotoCapa) {
      const capaPath = path.join(uploadDirectory, 'capa', finalFiles.fotoCapa);
      if (fs.existsSync(capaPath)) {
        fs.unlinkSync(capaPath);
        console.log(`Arquivo final removido: ${finalFiles.fotoCapa}`);
      }
    }
    
    if (finalFiles.fotoAdicional && Array.isArray(finalFiles.fotoAdicional)) {
      finalFiles.fotoAdicional.forEach(file => {
        const filePath = path.join(uploadDirectory, 'adicional', file);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`Arquivo final removido: ${file}`);
        }
      });
    }
  } catch (error) {
    console.error('Erro ao limpar arquivos finais:', error);
  }
};

// Rota para atualizar um aluguel
router.put('/:id', upload.fields([
  { name: 'fotoCapa', maxCount: 1 }, 
  { name: 'fotoAdicional', maxCount: 10 }
]), async (req, res) => {
  let finalFiles = {
    fotoCapa: null,
    fotoAdicional: []
  };

  try {
    const { id } = req.params;
    const { nome_imovel, descricao, valor_aluguel, quartos, banheiro, dia_vencimento } = req.body;
    
    const aluguel = await db.Aluguel.findByPk(id);
    
    if (!aluguel) {
      cleanupTempFiles(req.files);
      return res.status(404).json({ error: 'Aluguel não encontrado' });
    }

    // Processar novos arquivos se houver
    if (req.files['fotoCapa']) {
      const tempFile = req.files['fotoCapa'][0];
      const finalFileName = `${Date.now()}_capa${path.extname(tempFile.originalname)}`;
      const finalPath = path.join(uploadDirectory, 'capa', finalFileName);
      
      if (moveFileToFinal(tempFile.path, finalPath)) {
        // Remover foto de capa antiga se existir
        if (aluguel.foto_capa) {
          const oldCapaPath = path.join(uploadDirectory, 'capa', aluguel.foto_capa);
          if (fs.existsSync(oldCapaPath)) {
            fs.unlinkSync(oldCapaPath);
          }
        }
        finalFiles.fotoCapa = finalFileName;
      }
    }

    if (req.files['fotoAdicional']) {
      // Remover fotos adicionais antigas
      if (aluguel.foto_adicional && Array.isArray(aluguel.foto_adicional)) {
        aluguel.foto_adicional.forEach(file => {
          const oldFilePath = path.join(uploadDirectory, 'adicional', file);
          if (fs.existsSync(oldFilePath)) {
            fs.unlinkSync(oldFilePath);
          }
        });
      }

      // Processar novas fotos adicionais
      for (const tempFile of req.files['fotoAdicional']) {
        const finalFileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}${path.extname(tempFile.originalname)}`;
        const finalPath = path.join(uploadDirectory, 'adicional', finalFileName);
        
        if (moveFileToFinal(tempFile.path, finalPath)) {
          finalFiles.fotoAdicional.push(finalFileName);
        }
      }
    }

    // Converter valor se necessário
    let valorDecimal = valor_aluguel;
    if (typeof valor_aluguel === 'string') {
      const valorLimpo = valor_aluguel.replace(/[^\d,]/g, '').replace(',', '.');
      valorDecimal = parseFloat(valorLimpo);
    }

    // Atualizar o registro
    await aluguel.update({
      nome_imovel: nome_imovel?.toString().toUpperCase() || aluguel.nome_imovel,
      descricao: descricao?.toString().toUpperCase() || aluguel.descricao,
      valor_aluguel: valorDecimal || aluguel.valor_aluguel,
      quartos: quartos ? parseInt(quartos) : aluguel.quartos,
      banheiro: banheiro ? parseInt(banheiro) : aluguel.banheiro,
      dia_vencimento: dia_vencimento ? parseInt(dia_vencimento) : aluguel.dia_vencimento,
      foto_capa: finalFiles.fotoCapa || aluguel.foto_capa,
      foto_adicional: finalFiles.fotoAdicional.length ? finalFiles.fotoAdicional : aluguel.foto_adicional
    });

    res.status(200).json({
      message: 'Imóvel atualizado com sucesso!',
      aluguel: {
        ...aluguel.toJSON(),
        foto_adicional: aluguel.foto_adicional
      }
    });

  } catch (error) {
    console.error('Erro ao atualizar aluguel:', error);
    
    // Limpar arquivos temporários e finais em caso de erro
    cleanupTempFiles(req.files);
    cleanupFinalFiles(finalFiles);
    
    res.status(500).json({ error: 'Erro ao atualizar aluguel' });
  }
});

// Rota para marcar um imóvel como alugado ou desocupado
router.put('/:id/alugado', async (req, res) => {
  try {
    const { id } = req.params;
    const { alugado } = req.body;
    
    const aluguel = await db.Aluguel.findByPk(id);
    
    if (!aluguel) {
      return res.status(404).json({ error: 'Aluguel não encontrado' });
    }

    await aluguel.update({ alugado });
    
    res.status(200).json({ 
      message: `Imóvel ${alugado ? 'marcado como alugado' : 'marcado como disponível'}`,
      aluguel: aluguel.toJSON()
    });
  } catch (error) {
    console.error('Erro ao atualizar status:', error);
    res.status(500).json({ error: 'Erro ao atualizar o status do imóvel' });
  }
});

// Rota para excluir um aluguel
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const aluguel = await db.Aluguel.findByPk(id);
    
    if (!aluguel) {
      return res.status(404).json({ error: 'Aluguel não encontrado' });
    }

    // Remover arquivos do sistema de arquivos
    try {
      if (aluguel.foto_capa) {
        const capaPath = path.join(uploadDirectory, 'capa', aluguel.foto_capa);
        if (fs.existsSync(capaPath)) {
          fs.unlinkSync(capaPath);
          console.log(`Foto de capa removida: ${aluguel.foto_capa}`);
        }
      }
      
      if (aluguel.foto_adicional && Array.isArray(aluguel.foto_adicional)) {
        aluguel.foto_adicional.forEach(file => {
          const filePath = path.join(uploadDirectory, 'adicional', file);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`Foto adicional removida: ${file}`);
          }
        });
      }
    } catch (fileError) {
      console.error('Erro ao remover arquivos:', fileError);
    }

    await aluguel.destroy();
    res.status(200).json({ message: 'Aluguel deletado com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar aluguel:', error);
    res.status(500).json({ error: 'Erro ao deletar aluguel' });
  }
});

// Rota para baixar todas as fotos em um arquivo ZIP
router.get('/:id/download', async (req, res) => {
  try {
    const { id } = req.params;
    const aluguel = await db.Aluguel.findByPk(id);
    
    if (!aluguel) {
      return res.status(404).json({ error: 'Aluguel não encontrado' });
    }

    const archive = archiver('zip', {
      zlib: { level: 9 }
    });

    res.attachment(`fotos_imovel_${id}.zip`);
    archive.pipe(res);

    // Adicionar foto de capa
    if (aluguel.foto_capa) {
      const capaPath = path.join(uploadDirectory, 'capa', aluguel.foto_capa);
      if (fs.existsSync(capaPath)) {
        archive.file(capaPath, { name: `capa_${aluguel.foto_capa}` });
      }
    }

    // Adicionar fotos adicionais
    if (aluguel.foto_adicional && Array.isArray(aluguel.foto_adicional)) {
      aluguel.foto_adicional.forEach((file, index) => {
        const filePath = path.join(uploadDirectory, 'adicional', file);
        if (fs.existsSync(filePath)) {
          archive.file(filePath, { name: `adicional_${index + 1}_${file}` });
        }
      });
    }

    archive.finalize();
  } catch (error) {
    console.error('Erro ao criar ZIP:', error);
    res.status(500).json({ error: 'Erro ao criar o arquivo ZIP' });
  }
});

// Rota para limpeza manual de arquivos temporários (opcional - para debug)
router.post('/cleanup-temp', async (req, res) => {
  try {
    cleanupOldTempFiles();
    res.status(200).json({ message: 'Limpeza de arquivos temporários executada' });
  } catch (error) {
    console.error('Erro na limpeza manual:', error);
    res.status(500).json({ error: 'Erro ao executar limpeza' });
  }
});

module.exports = router;
