const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { ClienteAluguel, Aluguel, proprietario, sequelize } = require('../models');
const { Op } = require('sequelize');
const authenticateToken = require('../middleware/authenticateToken');
const { resolveTenant, addTenantFilter } = require('../middleware/tenantMiddleware');

const router = express.Router();
router.use(authenticateToken, resolveTenant);

let schemaCache = null;

async function getSchemaSupport() {
  if (schemaCache) return schemaCache;

  const queryInterface = sequelize.getQueryInterface();
  const [clienteTable, proprietarioTable, aluguelTable] = await Promise.all([
    queryInterface.describeTable('cliente_aluguels').catch(() => ({})),
    queryInterface.describeTable('proprietario').catch(() => ({})),
    queryInterface.describeTable('alugueis').catch(() => ({})),
  ]);

  schemaCache = {
    clienteColumns: Object.keys(clienteTable),
    clienteHasProprietarioId: !!clienteTable.proprietario_id,
    clienteHasContratoDocumentos: !!clienteTable.contrato_documentos,
    clienteHasTenantId: !!clienteTable.tenant_id,
    proprietarioHasTenantId: !!proprietarioTable.tenant_id,
    aluguelHasTenantId: !!aluguelTable.tenant_id,
  };

  return schemaCache;
}

function buildTenantWhere(req, enabled) {
  return enabled ? addTenantFilter(req, {}) : {};
}

function buildTenantWhereIncludingLegacy(req, enabled) {
  if (!enabled) return {};
  return {
    [Op.or]: [
      { tenant_id: req.tenantId },
      { tenant_id: null },
    ],
  };
}

function pickExistingAttributes(existingColumns, desiredColumns) {
  return desiredColumns.filter((column) => existingColumns.includes(column));
}

const contratoUploadDir = path.resolve(__dirname, '../../uploads/contratos');
if (!fs.existsSync(contratoUploadDir)) {
  fs.mkdirSync(contratoUploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, contratoUploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    cb(null, `contrato_${Date.now()}_${Math.round(Math.random() * 1e6)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'];
    const ext = path.extname(file.originalname || '').toLowerCase();
    cb(null, allowed.includes(ext));
  },
});

router.get('/contratos/opcoes', async (req, res) => {
  try {
    const schema = await getSchemaSupport();
    const [imoveis, proprietarios, inquilinos] = await Promise.all([
      Aluguel.findAll({
        attributes: ['id', 'nome_imovel'],
        where: buildTenantWhereIncludingLegacy(req, schema.aluguelHasTenantId),
        order: [['nome_imovel', 'ASC']]
      }),
      proprietario.findAll({
        attributes: ['id', 'name', 'phone'],
        where: buildTenantWhereIncludingLegacy(req, schema.proprietarioHasTenantId),
        order: [['name', 'ASC']]
      }),
      ClienteAluguel.findAll({
        attributes: pickExistingAttributes(schema.clienteColumns, ['id', 'nome', 'aluguel_id', 'proprietario_nome', 'proprietario_telefone', 'contrato_path']),
        where: buildTenantWhereIncludingLegacy(req, schema.clienteHasTenantId),
        order: [['nome', 'ASC']]
      }),
    ]);

    res.json({ imoveis, proprietarios, inquilinos });
  } catch (error) {
    console.error('Erro ao carregar opcoes de contrato:', error);
    res.status(500).json({ error: 'Erro ao carregar opcoes' });
  }
});

router.post('/contratos/vincular', async (req, res) => {
  try {
    const schema = await getSchemaSupport();
    const { cliente_aluguel_id, aluguel_id, proprietario_id } = req.body;

    if (!cliente_aluguel_id || !aluguel_id || !proprietario_id) {
      return res.status(400).json({ error: 'cliente_aluguel_id, aluguel_id e proprietario_id sao obrigatorios' });
    }

    const [cliente, imovel, dono] = await Promise.all([
      ClienteAluguel.findOne({
        where: { id: cliente_aluguel_id },
        attributes: pickExistingAttributes(schema.clienteColumns, ['id', 'tenant_id', 'aluguel_id', 'proprietario_nome', 'proprietario_telefone', 'contrato_path'])
      }),
      Aluguel.findByPk(aluguel_id),
      proprietario.findByPk(proprietario_id),
    ]);

    if (!cliente) return res.status(404).json({ error: 'Inquilino nao encontrado' });
    if (!imovel) return res.status(404).json({ error: 'Imovel nao encontrado' });
    if (!dono) return res.status(404).json({ error: 'Proprietario nao encontrado' });
    if ((schema.clienteHasTenantId && cliente.tenant_id && cliente.tenant_id !== req.tenantId) || (schema.aluguelHasTenantId && imovel.tenant_id && imovel.tenant_id !== req.tenantId) || (schema.proprietarioHasTenantId && dono.tenant_id && dono.tenant_id !== req.tenantId)) {
      return res.status(403).json({ error: 'Vinculo fora da sua organização' });
    }

    const updateData = {
      aluguel_id: imovel.id,
      proprietario_nome: dono.name || cliente.proprietario_nome,
      proprietario_telefone: dono.phone || cliente.proprietario_telefone,
    };

    if (schema.clienteHasProprietarioId) {
      updateData.proprietario_id = dono.id;
    }

    await cliente.update(updateData);

    res.json({ message: 'Vinculo salvo com sucesso', cliente });
  } catch (error) {
    console.error('Erro ao vincular contrato:', error);
    res.status(500).json({ error: 'Erro ao vincular contrato' });
  }
});

router.post('/contratos/:clienteAluguelId/documentos', upload.array('documentos', 10), async (req, res) => {
  try {
    const schema = await getSchemaSupport();
    const { clienteAluguelId } = req.params;
    const cliente = await ClienteAluguel.findOne({
      where: { id: clienteAluguelId },
      attributes: pickExistingAttributes(schema.clienteColumns, ['id', 'tenant_id', 'contrato_path', 'contrato_documentos'])
    });

    if (!cliente) {
      return res.status(404).json({ error: 'Inquilino nao encontrado' });
    }
    if (schema.clienteHasTenantId && cliente.tenant_id && cliente.tenant_id !== req.tenantId) {
      return res.status(403).json({ error: 'Inquilino fora da sua organização' });
    }

    const documentosAtuais = schema.clienteHasContratoDocumentos && Array.isArray(cliente.contrato_documentos)
      ? cliente.contrato_documentos
      : [];

    const novos = (req.files || []).map((file, index) => ({
      id: `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
      nome: file.originalname,
      tipo: file.mimetype,
      path: `contratos/${file.filename}`,
      data_upload: new Date().toISOString(),
    }));

    const todos = [...documentosAtuais, ...novos];

    if (schema.clienteHasContratoDocumentos) {
      await cliente.update({ contrato_documentos: todos });
    } else if (novos[0]) {
      // Fallback para schema antigo: mantém pelo menos um contrato no campo legado.
      await cliente.update({ contrato_path: path.join('uploads', novos[0].path).replace(/\\/g, '/') });
    }

    res.status(201).json({ message: 'Documentos enviados com sucesso', documentos: todos });
  } catch (error) {
    console.error('Erro ao enviar documentos do contrato:', error);
    res.status(500).json({ error: 'Erro ao enviar documentos' });
  }
});

router.get('/contratos', async (req, res) => {
  try {
    const schema = await getSchemaSupport();
    const include = [
      { model: Aluguel, as: 'imovel', required: false },
    ];

    if (schema.clienteHasProprietarioId) {
      include.push({ model: proprietario, as: 'proprietario', required: false });
    }

    const contratos = await ClienteAluguel.findAll({
      attributes: pickExistingAttributes(schema.clienteColumns, [
        'id',
        'nome',
        'tenant_id',
        'aluguel_id',
        'proprietario_nome',
        'proprietario_telefone',
        'contrato_path',
        'contrato_documentos',
        'updated_at',
        'updatedAt'
      ]),
      where: {
        ...buildTenantWhere(req, schema.clienteHasTenantId),
        aluguel_id: { [Op.ne]: null },
      },
      include,
      order: [['updatedAt', 'DESC']],
    });

    const contratosNormalizados = contratos.map((contrato) => {
      const item = contrato.toJSON();

      if (!schema.clienteHasContratoDocumentos) {
        item.contrato_documentos = item.contrato_path
          ? [{ id: `${item.id}-0`, nome: path.basename(item.contrato_path), path: item.contrato_path, tipo: null, data_upload: null }]
          : [];
      } else if (Array.isArray(item.contrato_documentos)) {
        // Garante IDs estáveis para documentos antigos que não possuem id salvo no JSON.
        item.contrato_documentos = item.contrato_documentos.map((doc, index) => ({
          ...doc,
          id: doc?.id ?? `${item.id}-${index}`,
        }));
      }

      if (!schema.clienteHasProprietarioId) {
        item.proprietario = null;
      }

      return item;
    });

    res.json(contratosNormalizados);
  } catch (error) {
    console.error('Erro ao listar contratos:', error);
    res.status(500).json({ error: 'Erro ao listar contratos' });
  }
});

// ✅ ROTA DE ATUALIZAÇÃO: PUT /contratos/:id/atualizar
router.put('/contratos/:id/atualizar', async (req, res) => {
  try {
    const schema = await getSchemaSupport();
    const { id } = req.params;
    const { cliente_aluguel_id, aluguel_id, proprietario_id } = req.body;

    if (!cliente_aluguel_id || !aluguel_id || !proprietario_id) {
      return res.status(400).json({ error: 'cliente_aluguel_id, aluguel_id e proprietario_id sao obrigatorios' });
    }

    const [cliente, imovel, dono] = await Promise.all([
      ClienteAluguel.findOne({
        where: { id },
        attributes: pickExistingAttributes(schema.clienteColumns, ['id', 'tenant_id', 'aluguel_id', 'proprietario_nome', 'proprietario_telefone'])
      }),
      Aluguel.findByPk(aluguel_id),
      proprietario.findByPk(proprietario_id),
    ]);

    if (!cliente) return res.status(404).json({ error: 'Contrato nao encontrado' });
    if (!imovel) return res.status(404).json({ error: 'Imovel nao encontrado' });
    if (!dono) return res.status(404).json({ error: 'Proprietario nao encontrado' });
    
    if ((schema.clienteHasTenantId && cliente.tenant_id && cliente.tenant_id !== req.tenantId) || (schema.aluguelHasTenantId && imovel.tenant_id && imovel.tenant_id !== req.tenantId) || (schema.proprietarioHasTenantId && dono.tenant_id && dono.tenant_id !== req.tenantId)) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const updateData = {
      aluguel_id: imovel.id,
      proprietario_nome: dono.name || cliente.proprietario_nome,
      proprietario_telefone: dono.phone || cliente.proprietario_telefone,
    };

    if (schema.clienteHasProprietarioId) {
      updateData.proprietario_id = dono.id;
    }

    await cliente.update(updateData);

    res.json({ message: 'Contrato atualizado com sucesso', cliente });
  } catch (error) {
    console.error('Erro ao atualizar contrato:', error);
    res.status(500).json({ error: 'Erro ao atualizar contrato' });
  }
});

// ✅ ROTA DE DELEÇÃO: DELETE /contratos/:id
router.delete('/contratos/:id', async (req, res) => {
  try {
    const schema = await getSchemaSupport();
    const { id } = req.params;

    const cliente = await ClienteAluguel.findOne({
      where: { id },
      attributes: pickExistingAttributes(schema.clienteColumns, ['id', 'tenant_id', 'aluguel_id'])
    });

    if (!cliente) {
      return res.status(404).json({ error: 'Contrato nao encontrado' });
    }

    if (schema.clienteHasTenantId && cliente.tenant_id && cliente.tenant_id !== req.tenantId) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    // Limpar vinculações de contrato
    await cliente.update({
      aluguel_id: null,
      proprietario_nome: null,
      proprietario_telefone: null,
      ...(schema.clienteHasProprietarioId && { proprietario_id: null }),
      ...(schema.clienteHasContratoDocumentos && { contrato_documentos: [] }),
    });

    res.json({ message: 'Contrato deletado com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar contrato:', error);
    res.status(500).json({ error: 'Erro ao deletar contrato' });
  }
});

// ✅ ROTA DE DOWNLOAD: GET /contratos/documento/:id/download
router.get('/contratos/documento/:docId/download', async (req, res) => {
  try {
    // Para simplificar, vamos tentar localizar em todos os contratos do tenant
    const { docId } = req.params;
    const schema = await getSchemaSupport();

    const contratos = await ClienteAluguel.findAll({
      attributes: pickExistingAttributes(schema.clienteColumns, ['id', 'tenant_id', 'contrato_documentos', 'contrato_path']),
      where: buildTenantWhere(req, schema.clienteHasTenantId),
    });

    let documento = null;
    for (const contrato of contratos) {
      if (schema.clienteHasContratoDocumentos && Array.isArray(contrato.contrato_documentos)) {
        const doc = contrato.contrato_documentos.find((d, index) => {
          const normalizedId = d?.id ?? `${contrato.id}-${index}`;
          return String(normalizedId) === String(docId);
        });
        if (doc) {
          documento = doc;
          break;
        }
      } else if (contrato.contrato_path) {
        const legacyId = `${contrato.id}-0`;
        if (String(legacyId) === String(docId)) {
          documento = {
            nome: path.basename(contrato.contrato_path),
            path: contrato.contrato_path,
          };
          break;
        }
      }
    }

    if (!documento) {
      return res.status(404).json({ error: 'Documento nao encontrado' });
    }

    const filePath = path.join(__dirname, '../../uploads', documento.path);

    // Validar se arquivo existe
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Arquivo nao encontrado no servidor' });
    }

    res.download(filePath, documento.nome_arquivo || documento.nome || 'documento');
  } catch (error) {
    console.error('Erro ao baixar documento:', error);
    res.status(500).json({ error: 'Erro ao baixar documento' });
  }
});

module.exports = router;
