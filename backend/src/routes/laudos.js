const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { User, Laudo, sequelize } = require('../models');
const { Op } = require('sequelize');
const { authenticateToken } = require('./authRoutes');
const { uploadFields, logUploadedFiles, handleMulterError, uploadDir } = require('../middleware/upload');

// ✅ LISTAR TODOS OS LAUDOS
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = '', 
      parceiro = '', 
      tipo_imovel = '',
      status = 'todos'
    } = req.query;

    const offset = (page - 1) * limit;
    const whereConditions = {};

    // Filtro por busca geral
    if (search) {
      whereConditions[Op.or] = [
        { parceiro: { [Op.iLike]: `%${search}%` } },
        { endereco: { [Op.iLike]: `%${search}%` } },
        { observacoes: { [Op.iLike]: `%${search}%` } }
      ];
    }

    // Filtro por parceiro
    if (parceiro) {
      whereConditions.parceiro = { [Op.iLike]: `%${parceiro}%` };
    }

    // Filtro por tipo de imóvel
    if (tipo_imovel && tipo_imovel !== 'todos') {
      whereConditions.tipo_imovel = tipo_imovel;
    }

    // Filtro por status (baseado no vencimento)
    if (status === 'vencidos') {
      whereConditions.vencimento = { [Op.lt]: new Date() };
    } else if (status === 'vencendo') {
      const hoje = new Date();
      const proximoMes = new Date();
      proximoMes.setMonth(hoje.getMonth() + 1);
      whereConditions.vencimento = { 
        [Op.between]: [hoje, proximoMes]
      };
    } else if (status === 'vigentes') {
      whereConditions.vencimento = { [Op.gt]: new Date() };
    }

    const { count, rows: laudos } = await Laudo.findAndCountAll({
      where: whereConditions,
      include: [
        {
          model: User,
          as: 'user', // ✅ Usando alias 'user'
          attributes: ['id', 'username', 'first_name', 'last_name', 'email']
        }
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    const totalPages = Math.ceil(count / limit);

    // Adicionar status calculado baseado no vencimento
    const laudosComStatus = laudos.map(laudo => {
      const hoje = new Date();
      const vencimento = new Date(laudo.vencimento);
      const diasParaVencimento = Math.ceil((vencimento - hoje) / (1000 * 60 * 60 * 24));
      
      let status = 'vigente';
      if (diasParaVencimento < 0) {
        status = 'vencido';
      } else if (diasParaVencimento <= 30) {
        status = 'vencendo';
      }

      return {
        ...laudo.toJSON(),
        status,
        diasParaVencimento
      };
    });

    res.json({
      success: true,
      data: laudosComStatus,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems: count,
        itemsPerPage: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('❌ Erro ao listar laudos:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

// ✅ BUSCAR LAUDO POR ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const laudo = await Laudo.findByPk(id, {
      include: [
        {
          model: User,
          as: 'user', // ✅ Usando alias 'user'
          attributes: ['id', 'username', 'first_name', 'last_name', 'email']
        }
      ]
    });

    if (!laudo) {
      return res.status(404).json({
        success: false,
        message: 'Laudo não encontrado'
      });
    }

    // Calcular status baseado no vencimento
    const hoje = new Date();
    const vencimento = new Date(laudo.vencimento);
    const diasParaVencimento = Math.ceil((vencimento - hoje) / (1000 * 60 * 60 * 24));
    
    let status = 'vigente';
    if (diasParaVencimento < 0) {
      status = 'vencido';
    } else if (diasParaVencimento <= 30) {
      status = 'vencendo';
    }

    res.json({
      success: true,
      data: {
        ...laudo.toJSON(),
        status,
        diasParaVencimento
      }
    });

  } catch (error) {
    console.error('❌ Erro ao buscar laudo:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

// ✅ CRIAR NOVO LAUDO
router.post('/', authenticateToken, uploadFields, async (req, res) => {
  let transaction;
  
  try {
    transaction = await sequelize.transaction();
    
    const {
      parceiro,
      tipo_imovel,
      valor_solicitado,
      valor_liberado,
      vencimento,
      endereco,
      observacoes
    } = req.body;

    // Validações
    if (!parceiro || !tipo_imovel || !valor_solicitado || !vencimento || !endereco) {
      if (transaction) {
        await transaction.rollback();
        transaction = null;
      }
      await cleanupAllTempFiles(req);
      return res.status(400).json({
        success: false,
        message: 'Campos obrigatórios: parceiro, tipo_imovel, valor_solicitado, vencimento, endereco'
      });
    }

    // Validar tipo de imóvel
    if (!['casa', 'apartamento'].includes(tipo_imovel)) {
      if (transaction) {
        await transaction.rollback();
        transaction = null;
      }
      await cleanupAllTempFiles(req);
      return res.status(400).json({
        success: false,
        message: 'Tipo de imóvel deve ser "casa" ou "apartamento"'
      });
    }

    // Validar valores
    if (isNaN(parseFloat(valor_solicitado)) || parseFloat(valor_solicitado) <= 0) {
      if (transaction) {
        await transaction.rollback();
        transaction = null;
      }
      await cleanupAllTempFiles(req);
      return res.status(400).json({
        success: false,
        message: 'Valor solicitado deve ser um número positivo'
      });
    }

    if (valor_liberado && (isNaN(parseFloat(valor_liberado)) || parseFloat(valor_liberado) < 0)) {
      if (transaction) {
        await transaction.rollback();
        transaction = null;
      }
      await cleanupAllTempFiles(req);
      return res.status(400).json({
        success: false,
        message: 'Valor liberado deve ser um número positivo'
      });
    }

    // Validar data de vencimento
    const dataVencimento = new Date(vencimento);
    if (isNaN(dataVencimento.getTime())) {
      if (transaction) {
        await transaction.rollback();
        transaction = null;
      }
      await cleanupAllTempFiles(req);
      return res.status(400).json({
        success: false,
        message: 'Data de vencimento inválida'
      });
    }

    // Processar arquivos enviados
    const arquivos = {};
    if (req.files) {
      Object.keys(req.files).forEach(fieldName => {
        const files = req.files[fieldName];
        if (files && files.length > 0) {
          arquivos[fieldName] = files.map(file => ({
            filename: file.filename,
            originalname: file.originalname,
            path: file.path,
            size: file.size,
            mimetype: file.mimetype
          }));
        }
      });
    }

    // Criar laudo
    const novoLaudo = await Laudo.create({
      parceiro: parceiro.trim(),
      tipo_imovel,
      valor_solicitado: parseFloat(valor_solicitado),
      valor_liberado: valor_liberado ? parseFloat(valor_liberado) : null,
      vencimento: dataVencimento,
      endereco: endereco.trim(),
      observacoes: observacoes ? observacoes.trim() : null,
      arquivos: Object.keys(arquivos).length > 0 ? arquivos : null,
      user_id: req.user.id
    }, { transaction });

    // Commit da transação antes de buscar dados
    await transaction.commit();
    transaction = null; // Marcar como null para evitar rollback no catch

    // Buscar laudo criado com dados do usuário
    const laudoCriado = await Laudo.findByPk(novoLaudo.id, {
      include: [
        {
          model: User,
          as: 'user', // ✅ Usando alias 'user'
          attributes: ['id', 'username', 'first_name', 'last_name', 'email']
        }
      ]
    });

    console.log(`✅ Laudo criado - ID: ${novoLaudo.id}, Parceiro: ${parceiro}, Usuário: ${req.user.username}`);

    res.status(201).json({
      success: true,
      message: 'Laudo criado com sucesso',
      data: laudoCriado
    });

  } catch (error) {
    // Só faz rollback se a transação ainda não foi commitada
    if (transaction) {
      try {
        await transaction.rollback();
      } catch (rollbackError) {
        console.error('❌ Erro ao fazer rollback:', rollbackError.message);
      }
    }
    
    await cleanupAllTempFiles(req);
    
    console.error('❌ Erro ao criar laudo:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

// ✅ ATUALIZAR LAUDO
router.put('/:id', authenticateToken, uploadFields, async (req, res) => {
  let transaction;
  
  try {
    transaction = await sequelize.transaction();
    
    const { id } = req.params;
    const {
      parceiro,
      tipo_imovel,
      valor_solicitado,
      valor_liberado,
      vencimento,
      endereco,
      observacoes,
      remover_arquivos
    } = req.body;

    // Buscar laudo existente
    const laudo = await Laudo.findByPk(id);
    if (!laudo) {
      if (transaction) {
        await transaction.rollback();
        transaction = null;
      }
      await cleanupAllTempFiles(req);
      return res.status(404).json({
        success: false,
        message: 'Laudo não encontrado'
      });
    }

    // Verificar permissões (apenas admin ou dono do registro)
    if (req.user.role !== 'Administrador' && laudo.user_id !== req.user.id) {
      if (transaction) {
        await transaction.rollback();
        transaction = null;
      }
      await cleanupAllTempFiles(req);
      return res.status(403).json({
        success: false,
        message: 'Acesso negado. Você só pode editar seus próprios laudos.'
      });
    }

    // Validações se os campos foram fornecidos
    if (tipo_imovel && !['casa', 'apartamento'].includes(tipo_imovel)) {
      if (transaction) {
        await transaction.rollback();
        transaction = null;
      }
      await cleanupAllTempFiles(req);
      return res.status(400).json({
        success: false,
        message: 'Tipo de imóvel deve ser "casa" ou "apartamento"'
      });
    }

    if (valor_solicitado && (isNaN(parseFloat(valor_solicitado)) || parseFloat(valor_solicitado) <= 0)) {
      if (transaction) {
        await transaction.rollback();
        transaction = null;
      }
      await cleanupAllTempFiles(req);
      return res.status(400).json({
        success: false,
        message: 'Valor solicitado deve ser um número positivo'
      });
    }

    if (valor_liberado && (isNaN(parseFloat(valor_liberado)) || parseFloat(valor_liberado) < 0)) {
      if (transaction) {
        await transaction.rollback();
        transaction = null;
      }
      await cleanupAllTempFiles(req);
      return res.status(400).json({
        success: false,
        message: 'Valor liberado deve ser um número positivo'
      });
    }

    if (vencimento) {
      const dataVencimento = new Date(vencimento);
      if (isNaN(dataVencimento.getTime())) {
        if (transaction) {
          await transaction.rollback();
          transaction = null;
        }
        await cleanupAllTempFiles(req);
        return res.status(400).json({
          success: false,
          message: 'Data de vencimento inválida'
        });
      }
    }

    // Preparar dados para atualização
    const dadosAtualizacao = {};
    
    if (parceiro !== undefined) dadosAtualizacao.parceiro = parceiro.trim();
    if (tipo_imovel !== undefined) dadosAtualizacao.tipo_imovel = tipo_imovel;
    if (valor_solicitado !== undefined) dadosAtualizacao.valor_solicitado = parseFloat(valor_solicitado);
    if (valor_liberado !== undefined) dadosAtualizacao.valor_liberado = valor_liberado ? parseFloat(valor_liberado) : null;
    if (vencimento !== undefined) dadosAtualizacao.vencimento = new Date(vencimento);
    if (endereco !== undefined) dadosAtualizacao.endereco = endereco.trim();
    if (observacoes !== undefined) dadosAtualizacao.observacoes = observacoes ? observacoes.trim() : null;

    // Gerenciar arquivos
    let arquivosAtuais = laudo.arquivos || {};

    // Remover arquivos se solicitado
    if (remover_arquivos) {
      const arquivosParaRemover = Array.isArray(remover_arquivos) ? remover_arquivos : [remover_arquivos];
      
      for (const categoria of arquivosParaRemover) {
        if (arquivosAtuais[categoria]) {
          // Remover arquivos do disco
          for (const arquivo of arquivosAtuais[categoria]) {
            try {
              const caminhoArquivo = path.join(uploadDir, arquivo.filename);
              if (fs.existsSync(caminhoArquivo)) {
                fs.unlinkSync(caminhoArquivo);
              }
            } catch (error) {
              console.warn(`⚠️ Erro ao remover arquivo ${arquivo.filename}:`, error.message);
            }
          }
          delete arquivosAtuais[categoria];
        }
      }
    }

    // Adicionar novos arquivos
    if (req.files) {
      Object.keys(req.files).forEach(fieldName => {
        const files = req.files[fieldName];
        if (files && files.length > 0) {
          arquivosAtuais[fieldName] = files.map(file => ({
            filename: file.filename,
            originalname: file.originalname,
            path: file.path,
            size: file.size,
            mimetype: file.mimetype
          }));
        }
      });
    }

    dadosAtualizacao.arquivos = Object.keys(arquivosAtuais).length > 0 ? arquivosAtuais : null;

    // Atualizar laudo
    await laudo.update(dadosAtualizacao, { transaction });
    
    // Commit da transação antes de buscar dados
    await transaction.commit();
    transaction = null; // Marcar como null para evitar rollback no catch

    // Buscar laudo atualizado com dados do usuário
    const laudoAtualizado = await Laudo.findByPk(id, {
      include: [
        {
          model: User,
          as: 'user', // ✅ Usando alias 'user'
          attributes: ['id', 'username', 'first_name', 'last_name', 'email']
        }
      ]
    });

    console.log(`✅ Laudo atualizado - ID: ${id}, Usuário: ${req.user.username}`);

    res.json({
      success: true,
      message: 'Laudo atualizado com sucesso',
      data: laudoAtualizado
    });

  } catch (error) {
    // Só faz rollback se a transação ainda não foi commitada
    if (transaction) {
      try {
        await transaction.rollback();
      } catch (rollbackError) {
        console.error('❌ Erro ao fazer rollback:', rollbackError.message);
      }
    }
    
    await cleanupAllTempFiles(req);
    
    console.error('❌ Erro ao atualizar laudo:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

// ✅ EXCLUIR LAUDO
router.delete('/:id', authenticateToken, async (req, res) => {
  let transaction;
  
  try {
    transaction = await sequelize.transaction();
    
    const { id } = req.params;

    // Buscar laudo
    const laudo = await Laudo.findByPk(id);
    if (!laudo) {
      if (transaction) {
        await transaction.rollback();
        transaction = null;
      }
      return res.status(404).json({
        success: false,
        message: 'Laudo não encontrado'
      });
    }

    // Verificar permissões (apenas admin ou dono do registro)
    if (req.user.role !== 'Administrador' && laudo.user_id !== req.user.id) {
      if (transaction) {
        await transaction.rollback();
        transaction = null;
      }
      return res.status(403).json({
        success: false,
        message: 'Acesso negado. Você só pode excluir seus próprios laudos.'
      });
    }

    // Remover arquivos associados
    if (laudo.arquivos) {
      Object.values(laudo.arquivos).forEach(categoria => {
        if (Array.isArray(categoria)) {
          categoria.forEach(arquivo => {
            try {
              const caminhoArquivo = path.join(uploadDir, arquivo.filename);
              if (fs.existsSync(caminhoArquivo)) {
                fs.unlinkSync(caminhoArquivo);
              }
            } catch (error) {
              console.warn(`⚠️ Erro ao remover arquivo ${arquivo.filename}:`, error.message);
            }
          });
        }
      });
    }

    // Excluir laudo
    await laudo.destroy({ transaction });
    
    // Commit da transação
    await transaction.commit();
    transaction = null; // Marcar como null para evitar rollback no catch

    console.log(`✅ Laudo excluído - ID: ${id}, Usuário: ${req.user.username}`);

    res.json({
      success: true,
      message: 'Laudo excluído com sucesso'
    });

  } catch (error) {
    // Só faz rollback se a transação ainda não foi commitada
    if (transaction) {
      try {
        await transaction.rollback();
      } catch (rollbackError) {
        console.error('❌ Erro ao fazer rollback:', rollbackError.message);
      }
    }
    
    console.error('❌ Erro ao excluir laudo:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

// ✅ DOWNLOAD DE ARQUIVO
router.get('/:id/arquivo/:categoria/:filename', authenticateToken, async (req, res) => {
  try {
    const { id, categoria, filename } = req.params;

    // Buscar laudo
    const laudo = await Laudo.findByPk(id);
    if (!laudo) {
      return res.status(404).json({
        success: false,
        message: 'Laudo não encontrado'
      });
    }

    // Verificar se o arquivo existe no laudo
    if (!laudo.arquivos || !laudo.arquivos[categoria]) {
      return res.status(404).json({
        success: false,
        message: 'Categoria de arquivo não encontrada'
      });
    }

    const arquivo = laudo.arquivos[categoria].find(a => a.filename === filename);
    if (!arquivo) {
      return res.status(404).json({
        success: false,
        message: 'Arquivo não encontrado'
      });
    }

    const caminhoArquivo = path.join(uploadDir, filename);
    if (!fs.existsSync(caminhoArquivo)) {
      return res.status(404).json({
        success: false,
        message: 'Arquivo não encontrado no servidor'
      });
    }

    // Definir headers para download
    res.setHeader('Content-Disposition', `attachment; filename="${arquivo.originalname}"`);
    res.setHeader('Content-Type', arquivo.mimetype);

    // Enviar arquivo
    res.sendFile(path.resolve(caminhoArquivo));

  } catch (error) {
    console.error('❌ Erro ao fazer download do arquivo:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

// ✅ RELATÓRIOS E ESTATÍSTICAS
router.get('/relatorios/estatisticas', authenticateToken, async (req, res) => {
  try {
    const hoje = new Date();
    const proximoMes = new Date();
    proximoMes.setMonth(hoje.getMonth() + 1);

    // Contar laudos por status
    const totalLaudos = await Laudo.count();
    const laudosVencidos = await Laudo.count({
      where: { vencimento: { [Op.lt]: hoje } }
    });
    const laudosVencendo = await Laudo.count({
      where: { 
        vencimento: { 
          [Op.between]: [hoje, proximoMes]
        }
      }
    });
    const laudosVigentes = await Laudo.count({
      where: { vencimento: { [Op.gt]: proximoMes } }
    });

    // Laudos por tipo de imóvel
    const laudosPorTipo = await Laudo.findAll({
      attributes: [
        'tipo_imovel',
        [sequelize.fn('COUNT', sequelize.col('id')), 'total']
      ],
      group: ['tipo_imovel']
    });

    // Laudos por parceiro
    const laudosPorParceiro = await Laudo.findAll({
      attributes: [
        'parceiro',
        [sequelize.fn('COUNT', sequelize.col('id')), 'total'],
        [sequelize.fn('SUM', sequelize.col('valor_solicitado')), 'valor_total_solicitado'],
        [sequelize.fn('SUM', sequelize.col('valor_liberado')), 'valor_total_liberado']
      ],
      group: ['parceiro'],
      order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']]
    });

    // Valores totais
    const valoresSolicitados = await Laudo.findOne({
      attributes: [
        [sequelize.fn('SUM', sequelize.col('valor_solicitado')), 'total']
      ]
    });

    const valoresLiberados = await Laudo.findOne({
      attributes: [
        [sequelize.fn('SUM', sequelize.col('valor_liberado')), 'total']
      ]
    });

    res.json({
      success: true,
      data: {
        resumo: {
          totalLaudos,
          laudosVencidos,
          laudosVencendo,
          laudosVigentes
        },
        laudosPorTipo: laudosPorTipo.map(item => ({
          tipo: item.tipo_imovel,
          total: parseInt(item.dataValues.total)
        })),
        laudosPorParceiro: laudosPorParceiro.map(item => ({
          parceiro: item.parceiro,
          total: parseInt(item.dataValues.total),
          valorTotalSolicitado: parseFloat(item.dataValues.valor_total_solicitado) || 0,
          valorTotalLiberado: parseFloat(item.dataValues.valor_total_liberado) || 0
        })),
        valores: {
          totalSolicitado: parseFloat(valoresSolicitados.dataValues.total) || 0,
          totalLiberado: parseFloat(valoresLiberados.dataValues.total) || 0
        }
      }
    });

  } catch (error) {
    console.error('❌ Erro ao gerar estatísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

// ✅ FUNÇÃO PARA LIMPAR ARQUIVOS TEMPORÁRIOS
const cleanupAllTempFiles = async (req) => {
  if (req.files) {
    Object.values(req.files).forEach(files => {
      files.forEach(file => {
        try {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        } catch (error) {
          console.warn(`⚠️ Erro ao limpar arquivo temporário ${file.filename}:`, error.message);
        }
      });
    });
  }
};

module.exports = router;