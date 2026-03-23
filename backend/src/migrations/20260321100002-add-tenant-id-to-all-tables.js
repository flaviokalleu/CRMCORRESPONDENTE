'use strict';

/**
 * Adiciona tenant_id em todas as tabelas de dados do sistema.
 * Popula com tenant_id = 1 (tenant padrão) para dados existentes.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Tabelas que precisam de tenant_id
    const tables = [
      'users',
      'clientes',
      'imoveis',
      'alugueis',
      'pagamentos',
      'notas',
      'acessos',
      'tokens',
      'proprietario',
      'laudos',
      'comissoes',
      'receitas',
      'despesas',
      'fluxo_caixa',
      'system_configs',
      'cobranca_aluguels',
      'regua_cobrancas',
      'repasse_proprietarios',
      'vistoria_aluguels',
      'chamado_manutencaos',
      'whatsapps',
      'whatsapp_sessions',
    ];

    // Tabelas que podem não existir dependendo do estado das migrations
    const optionalTables = [
      'ClienteAluguels',
      'Lembretes',
      'UserAccessLogs',
    ];

    // Adicionar tenant_id nullable em todas as tabelas
    for (const table of tables) {
      try {
        const tableDesc = await queryInterface.describeTable(table);
        if (tableDesc && !tableDesc.tenant_id) {
          await queryInterface.addColumn(table, 'tenant_id', {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: {
              model: 'tenants',
              key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL'
          });
          // Popular dados existentes com tenant_id = 1
          await queryInterface.sequelize.query(
            `UPDATE "${table}" SET tenant_id = 1 WHERE tenant_id IS NULL`
          );
          // Criar índice para performance
          await queryInterface.addIndex(table, ['tenant_id'], {
            name: `idx_${table}_tenant_id`
          });
        }
      } catch (error) {
        console.log(`Aviso: Tabela ${table} - ${error.message}`);
      }
    }

    // Tabelas opcionais (podem ter nomes com case diferente)
    for (const table of optionalTables) {
      try {
        const tableDesc = await queryInterface.describeTable(table);
        if (tableDesc && !tableDesc.tenant_id) {
          await queryInterface.addColumn(table, 'tenant_id', {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: {
              model: 'tenants',
              key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL'
          });
          await queryInterface.sequelize.query(
            `UPDATE "${table}" SET tenant_id = 1 WHERE tenant_id IS NULL`
          );
          await queryInterface.addIndex(table, ['tenant_id'], {
            name: `idx_${table.toLowerCase()}_tenant_id`
          });
        }
      } catch (error) {
        console.log(`Aviso: Tabela opcional ${table} não encontrada - ${error.message}`);
      }
    }

    // Adicionar is_super_admin ao users
    try {
      const usersDesc = await queryInterface.describeTable('users');
      if (!usersDesc.is_super_admin) {
        await queryInterface.addColumn('users', 'is_super_admin', {
          type: Sequelize.BOOLEAN,
          defaultValue: false
        });
      }
    } catch (error) {
      console.log(`Aviso: Coluna is_super_admin - ${error.message}`);
    }
  },

  async down(queryInterface) {
    const tables = [
      'users', 'clientes', 'imoveis', 'alugueis', 'pagamentos',
      'notas', 'acessos', 'tokens', 'proprietario', 'laudos',
      'comissoes', 'receitas', 'despesas', 'fluxo_caixa', 'system_configs',
      'cobranca_aluguels', 'regua_cobrancas', 'repasse_proprietarios',
      'vistoria_aluguels', 'chamado_manutencaos', 'whatsapps', 'whatsapp_sessions'
    ];

    const optionalTables = ['ClienteAluguels', 'Lembretes', 'UserAccessLogs'];

    for (const table of [...tables, ...optionalTables]) {
      try {
        await queryInterface.removeIndex(table, `idx_${table.toLowerCase()}_tenant_id`);
        await queryInterface.removeColumn(table, 'tenant_id');
      } catch (error) {
        console.log(`Aviso ao reverter ${table}: ${error.message}`);
      }
    }

    try {
      await queryInterface.removeColumn('users', 'is_super_admin');
    } catch (error) {
      console.log(`Aviso ao reverter is_super_admin: ${error.message}`);
    }
  }
};
