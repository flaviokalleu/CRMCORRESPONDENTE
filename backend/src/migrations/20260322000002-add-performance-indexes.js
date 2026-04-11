'use strict';

/**
 * Adiciona índices de performance nas tabelas mais consultadas.
 * Todos os comandos usam IF NOT EXISTS para ser idempotente.
 */
module.exports = {
  async up(queryInterface) {
    const addIndexSafe = async (table, columns, options = {}) => {
      try {
        await queryInterface.addIndex(table, columns, options);
      } catch (e) {
        // Índice já existe ou tabela não existe — ignorar
        if (
          e.message.includes('already exists') ||
          e.message.includes('já existe') ||
          e.message.includes('não existe') ||
          e.message.includes('does not exist')
        ) return;
        throw e;
      }
    };

    // Clientes
    await addIndexSafe('clientes', ['user_id'], { name: 'idx_clientes_user_id' });
    await addIndexSafe('clientes', ['tenant_id'], { name: 'idx_clientes_tenant_id' });
    await addIndexSafe('clientes', ['cpf'], { name: 'idx_clientes_cpf' });
    await addIndexSafe('clientes', ['email'], { name: 'idx_clientes_email' });
    await addIndexSafe('clientes', ['created_at'], { name: 'idx_clientes_created_at' });

    // Users
    await addIndexSafe('users', ['tenant_id'], { name: 'idx_users_tenant_id' });
    await addIndexSafe('users', ['email'], { name: 'idx_users_email' });

    // Imóveis
    await addIndexSafe('imoveis', ['tenant_id'], { name: 'idx_imoveis_tenant_id' });
    await addIndexSafe('imoveis', ['created_at'], { name: 'idx_imoveis_created_at' });

    // Pagamentos
    await addIndexSafe('pagamentos', ['cliente_id'], { name: 'idx_pagamentos_cliente_id' });
    await addIndexSafe('pagamentos', ['tenant_id'], { name: 'idx_pagamentos_tenant_id' });
    await addIndexSafe('pagamentos', ['status'], { name: 'idx_pagamentos_status' });
    await addIndexSafe('pagamentos', ['created_at'], { name: 'idx_pagamentos_created_at' });

    // Aluguéis
    await addIndexSafe('alugueis', ['tenant_id'], { name: 'idx_alugueis_tenant_id' });

    // ClienteAluguel
    await addIndexSafe('cliente_aluguels', ['tenant_id'], { name: 'idx_cliente_aluguels_tenant_id' });

    // Notas
    await addIndexSafe('notas', ['cliente_id'], { name: 'idx_notas_cliente_id' });

    // Acessos
    await addIndexSafe('acessos', ['user_id'], { name: 'idx_acessos_user_id' });
    await addIndexSafe('acessos', ['created_at'], { name: 'idx_acessos_created_at' });

    // Tokens
    await addIndexSafe('tokens', ['user_id'], { name: 'idx_tokens_user_id' });
    await addIndexSafe('tokens', ['expires_at'], { name: 'idx_tokens_expires_at' });
  },

  async down(queryInterface) {
    const removeIndexSafe = async (table, name) => {
      try { await queryInterface.removeIndex(table, name); } catch { /* ignorar */ }
    };

    await removeIndexSafe('clientes', 'idx_clientes_user_id');
    await removeIndexSafe('clientes', 'idx_clientes_tenant_id');
    await removeIndexSafe('clientes', 'idx_clientes_cpf');
    await removeIndexSafe('clientes', 'idx_clientes_email');
    await removeIndexSafe('clientes', 'idx_clientes_created_at');
    await removeIndexSafe('users', 'idx_users_tenant_id');
    await removeIndexSafe('users', 'idx_users_email');
    await removeIndexSafe('imoveis', 'idx_imoveis_tenant_id');
    await removeIndexSafe('imoveis', 'idx_imoveis_created_at');
    await removeIndexSafe('pagamentos', 'idx_pagamentos_cliente_id');
    await removeIndexSafe('pagamentos', 'idx_pagamentos_tenant_id');
    await removeIndexSafe('pagamentos', 'idx_pagamentos_status');
    await removeIndexSafe('pagamentos', 'idx_pagamentos_created_at');
    await removeIndexSafe('alugueis', 'idx_alugueis_tenant_id');
    await removeIndexSafe('cliente_aluguels', 'idx_cliente_aluguels_tenant_id');
    await removeIndexSafe('notas', 'idx_notas_cliente_id');
    await removeIndexSafe('acessos', 'idx_acessos_user_id');
    await removeIndexSafe('acessos', 'idx_acessos_created_at');
    await removeIndexSafe('tokens', 'idx_tokens_user_id');
    await removeIndexSafe('tokens', 'idx_tokens_expires_at');
  },
};
