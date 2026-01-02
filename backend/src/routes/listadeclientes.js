const express = require('express');
const router = express.Router();
const { Cliente, User, Nota } = require('../models');
const { authenticateToken } = require('./authRoutes');
const { Op } = require('sequelize');

// Função auxiliar para validar datas
const validateDates = (dataInicio, dataFim) => {
  const startDate = new Date(dataInicio);
  const endDate = new Date(dataFim);

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    throw new Error('Datas inválidas fornecidas.');
  }

  if (startDate > endDate) {
    throw new Error('A data de início deve ser anterior à data de fim.');
  }

  return [startDate, endDate];
};

router.get('/', authenticateToken, async (req, res) => {
  try {
    const { status, corretor, dataInicio, dataFim } = req.query;

    console.log('Solicitação recebida com parâmetros:', req.query);
    console.log('Usuário autenticado:', req.user);

    // Buscar o usuário completo do banco
    const currentUser = await User.findByPk(req.user.id);
    
    if (!currentUser) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    console.log('Dados do usuário:', {
      id: currentUser.id,
      email: currentUser.email,
      is_administrador: currentUser.is_administrador,
      is_correspondente: currentUser.is_correspondente,
      is_corretor: currentUser.is_corretor
    });

    let whereConditions = {};

    // ✅ DETERMINAR PERMISSÕES BASEADO NOS FLAGS DO MODELO USER
    if (currentUser.is_corretor && !currentUser.is_administrador && !currentUser.is_correspondente) {
      // CORRETOR: Só vê seus próprios clientes
      console.log('Usuário é CORRETOR - filtrando por user_id');
      whereConditions.user_id = currentUser.id;
    } else if (currentUser.is_correspondente || currentUser.is_administrador) {
      // CORRESPONDENTE ou ADMINISTRADOR: Podem ver todos os clientes
      console.log('Usuário é CORRESPONDENTE ou ADMINISTRADOR - vendo todos os clientes');
      
      // ✅ PERMITIR FILTRO POR CORRETOR APENAS PARA ADMIN/CORRESPONDENTE
      if (corretor && corretor !== "Todos" && !isNaN(parseInt(corretor))) {
        console.log('Aplicando filtro por corretor:', corretor);
        whereConditions.user_id = parseInt(corretor);
      }
    } else {
      // Usuário sem permissões específicas
      return res.status(403).json({ error: 'Acesso negado. Usuário sem permissões adequadas.' });
    }

    // ✅ FILTROS ADICIONAIS
    if (status && status !== 'Todos') {
      whereConditions.status = status;
    }

    if (dataInicio && dataFim) {
      try {
        const [startDate, endDate] = validateDates(dataInicio, dataFim);
        whereConditions.created_at = {
          [Op.between]: [startDate.toISOString(), endDate.toISOString()],
        };
      } catch (error) {
        return res.status(400).json({ error: error.message });
      }
    }

    console.log('Condições de busca finais:', whereConditions);

    // ✅ BUSCAR CLIENTES COM ASSOCIAÇÕES
    const clientes = await Cliente.findAll({
      where: whereConditions,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'first_name', 'last_name', 'email', 'username', 'is_corretor', 'is_correspondente', 'is_administrador'],
          required: false, // ✅ PERMITIR CLIENTES SEM USUÁRIO ASSOCIADO
        },
        {
          model: Nota,
          as: 'notas',
          attributes: ['id', 'texto', 'criado_por_id', 'created_at'],
          required: false,
        },
      ],
      order: [['created_at', 'DESC']], // ✅ ORDENAR POR DATA DE CRIAÇÃO
    });

    console.log(`Encontrados ${clientes.length} clientes`);

    // ✅ ADICIONAR INFORMAÇÕES DE PERMISSÃO NA RESPOSTA
    const response = {
      clientes,
      userPermissions: {
        canViewAll: currentUser.is_correspondente || currentUser.is_administrador,
        isCorretor: currentUser.is_corretor,
        isCorrespondente: currentUser.is_correspondente,
        isAdministrador: currentUser.is_administrador,
        userId: currentUser.id
      },
      totalCount: clientes.length,
      appliedFilters: {
        status: status || 'Todos',
        corretor: corretor || 'Todos',
        dateRange: dataInicio && dataFim ? `${dataInicio} até ${dataFim}` : 'Sem filtro de data',
        userRestriction: currentUser.is_corretor && !currentUser.is_administrador && !currentUser.is_correspondente ? 'Apenas seus clientes' : 'Todos os clientes'
      }
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Erro detalhado ao buscar clientes:', error);
    res.status(500).json({ 
      error: 'Erro ao buscar clientes.',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// ✅ ROTA PARA BUSCAR TODOS OS USUÁRIOS (PARA O FILTRO)
router.get('/usuarios', authenticateToken, async (req, res) => {
  try {
    const currentUser = await User.findByPk(req.user.id);
    
    if (!currentUser) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    // ✅ APENAS ADMIN E CORRESPONDENTE PODEM VER LISTA DE USUÁRIOS
    if (!currentUser.is_administrador && !currentUser.is_correspondente) {
      return res.status(403).json({ error: 'Acesso negado. Apenas administradores e correspondentes podem ver a lista de usuários.' });
    }

    const usuarios = await User.findAll({
      attributes: ['id', 'first_name', 'last_name', 'email', 'username', 'is_corretor', 'is_correspondente', 'is_administrador'],
      order: [['first_name', 'ASC']]
    });

    res.json({
      success: true,
      users: usuarios,
      count: usuarios.length
    });
  } catch (error) {
    console.error('Erro ao buscar usuários:', error);
    res.status(500).json({ 
      error: 'Erro ao buscar usuários',
      message: error.message 
    });
  }
});

// Rota adicional para teste de permissões
router.get('/test-permissions', authenticateToken, async (req, res) => {
  try {
    const currentUser = await User.findByPk(req.user.id);
    
    if (!currentUser) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    const permissions = {
      userId: currentUser.id,
      email: currentUser.email,
      name: `${currentUser.first_name} ${currentUser.last_name}`,
      roles: {
        is_corretor: currentUser.is_corretor,
        is_correspondente: currentUser.is_correspondente,
        is_administrador: currentUser.is_administrador
      },
      canViewAllClients: currentUser.is_correspondente || currentUser.is_administrador,
      viewRestriction: currentUser.is_corretor && !currentUser.is_administrador && !currentUser.is_correspondente ? 'own_clients_only' : 'all_clients'
    };

    res.json({
      success: true,
      user: permissions,
      message: 'Permissões verificadas com sucesso'
    });
  } catch (error) {
    console.error('Erro ao verificar permissões:', error);
    res.status(500).json({ 
      error: 'Erro ao verificar permissões',
      message: error.message 
    });
  }
});

module.exports = router;
