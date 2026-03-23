'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Criar tabela tenants
    await queryInterface.createTable('tenants', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      nome: {
        type: Sequelize.STRING,
        allowNull: false
      },
      slug: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      cnpj: {
        type: Sequelize.STRING(18),
        allowNull: true,
        unique: true
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false
      },
      telefone: {
        type: Sequelize.STRING,
        allowNull: true
      },
      logo: {
        type: Sequelize.STRING,
        allowNull: true
      },
      ativo: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      configuracoes: {
        type: Sequelize.JSONB,
        defaultValue: {}
      },
      dominio_customizado: {
        type: Sequelize.STRING,
        allowNull: true,
        unique: true
      },
      endereco: {
        type: Sequelize.STRING,
        allowNull: true
      },
      cidade: {
        type: Sequelize.STRING,
        allowNull: true
      },
      estado: {
        type: Sequelize.STRING(2),
        allowNull: true
      },
      cep: {
        type: Sequelize.STRING(10),
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // 2. Inserir tenant padrão (Empresa 1 - Super Admin)
    await queryInterface.bulkInsert('tenants', [{
      nome: 'Administradora Principal',
      slug: 'admin-principal',
      email: 'admin@crmimob.com.br',
      ativo: true,
      configuracoes: '{}',
      created_at: new Date(),
      updated_at: new Date()
    }]);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('tenants');
  }
};
