'use strict';

/**
 * Configura scopes de tenant automaticamente nos models Sequelize.
 *
 * Em vez de modificar cada rota individualmente, este módulo adiciona
 * hooks beforeFind/beforeCreate/beforeUpdate/beforeDestroy que filtram
 * automaticamente por tenant_id usando AsyncLocalStorage.
 *
 * Uso no server.js:
 *   const { setupTenantScopes } = require('./middleware/tenantScope');
 *   setupTenantScopes();
 *
 * Uso nos middlewares (após authenticateToken):
 *   const { setCurrentTenant } = require('./middleware/tenantScope');
 *   app.use((req, res, next) => { setCurrentTenant(req.tenantId); next(); });
 */

const { AsyncLocalStorage } = require('async_hooks');

const tenantStorage = new AsyncLocalStorage();

/**
 * Define o tenant_id no contexto assíncrono atual.
 * Chamado pelo middleware Express após resolver o tenant.
 */
const setCurrentTenant = (tenantId, isSuperAdmin = false) => {
  const store = tenantStorage.getStore();
  if (store) {
    store.tenantId = tenantId;
    store.isSuperAdmin = isSuperAdmin;
  }
};

/**
 * Obtém o tenant_id do contexto assíncrono atual.
 */
const getCurrentTenant = () => {
  const store = tenantStorage.getStore();
  return store ? store.tenantId : null;
};

/**
 * Middleware Express que inicia o contexto de tenant para cada request.
 * Deve ser o primeiro middleware após authenticateToken e resolveTenant.
 */
const tenantContextMiddleware = (req, res, next) => {
  tenantStorage.run({ tenantId: req.tenantId || null, isSuperAdmin: req.isSuperAdmin || false }, () => {
    next();
  });
};

/**
 * Configura hooks automáticos de tenant nos models Sequelize.
 * Modelos que NÃO devem ser filtrados por tenant (tabelas globais).
 */
const GLOBAL_MODELS = [
  'Tenant', 'Plan', 'Subscription', 'SequelizeMeta',
  'Estado', 'Municipio'
];

const setupTenantScopes = () => {
  const db = require('../models');

  Object.keys(db).forEach(modelName => {
    // Pular models globais e propriedades do Sequelize
    if (GLOBAL_MODELS.includes(modelName) || modelName === 'sequelize' || modelName === 'Sequelize') {
      return;
    }

    const model = db[modelName];
    if (!model || !model.rawAttributes || !model.rawAttributes.tenant_id) {
      return; // Model não tem tenant_id, pular
    }

    // Hook: beforeFind - adiciona filtro tenant_id automaticamente em SELECTs
    model.addHook('beforeFind', 'tenantFilter', (options) => {
      const store = tenantStorage.getStore();
      if (!store || !store.tenantId) return;
      // Super admin acessando sem filtro (quando isSuperAdmin e sem X-Tenant-Id)
      if (store.isSuperAdmin && !store.tenantId) return;

      if (!options.where) options.where = {};
      // Não sobrescrever se já tem filtro de tenant_id explícito
      if (options.where.tenant_id === undefined) {
        options.where.tenant_id = store.tenantId;
      }
    });

    // Hook: beforeCount - mesma lógica para COUNT
    model.addHook('beforeCount', 'tenantFilterCount', (options) => {
      const store = tenantStorage.getStore();
      if (!store || !store.tenantId) return;
      if (store.isSuperAdmin && !store.tenantId) return;

      if (!options.where) options.where = {};
      if (options.where.tenant_id === undefined) {
        options.where.tenant_id = store.tenantId;
      }
    });

    // Hook: beforeCreate - injeta tenant_id automaticamente em INSERTs
    model.addHook('beforeCreate', 'tenantInject', (instance) => {
      const store = tenantStorage.getStore();
      if (!store || !store.tenantId) return;

      if (!instance.tenant_id) {
        instance.tenant_id = store.tenantId;
      }
    });

    // Hook: beforeBulkCreate - para criações em massa
    model.addHook('beforeBulkCreate', 'tenantInjectBulk', (instances) => {
      const store = tenantStorage.getStore();
      if (!store || !store.tenantId) return;

      instances.forEach(instance => {
        if (!instance.tenant_id) {
          instance.tenant_id = store.tenantId;
        }
      });
    });

    // Hook: beforeUpdate - garante que não mude para outro tenant
    model.addHook('beforeUpdate', 'tenantProtect', (instance) => {
      const store = tenantStorage.getStore();
      if (!store || !store.tenantId) return;
      if (store.isSuperAdmin) return;

      // Impedir que um registro tenha seu tenant_id alterado
      if (instance.changed('tenant_id') && instance.previous('tenant_id') !== store.tenantId) {
        throw new Error('Não é permitido alterar a organização de um registro');
      }
    });

    // Hook: beforeDestroy - garante que só deleta do próprio tenant
    model.addHook('beforeDestroy', 'tenantProtectDelete', (instance) => {
      const store = tenantStorage.getStore();
      if (!store || !store.tenantId) return;
      if (store.isSuperAdmin) return;

      if (instance.tenant_id && instance.tenant_id !== store.tenantId) {
        throw new Error('Não é permitido excluir registros de outra organização');
      }
    });
  });
};

module.exports = {
  tenantStorage,
  setCurrentTenant,
  getCurrentTenant,
  tenantContextMiddleware,
  setupTenantScopes
};
