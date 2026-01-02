'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('laudos', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      parceiro: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'Nome do parceiro/empresa'
      },
      tipo_imovel: {
        type: Sequelize.ENUM('casa', 'apartamento'),
        allowNull: false,
        comment: 'Tipo do imóvel: casa ou apartamento'
      },
      valor_solicitado: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        comment: 'Valor solicitado para o laudo'
      },
      valor_liberado: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true,
        comment: 'Valor liberado para o laudo'
      },
      vencimento: {
        type: Sequelize.DATE,
        allowNull: false,
        comment: 'Data de vencimento do laudo'
      },
      endereco: {
        type: Sequelize.TEXT,
        allowNull: false,
        comment: 'Endereço completo do imóvel'
      },
      observacoes: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Observações adicionais'
      },
      arquivos: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Arquivos anexados ao laudo (JSON)'
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users', // ✅ Mudança: 'users' minúsculo
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        comment: 'ID do usuário que criou o laudo'
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Índices para melhorar performance
    await queryInterface.addIndex('laudos', ['parceiro']);
    await queryInterface.addIndex('laudos', ['tipo_imovel']);
    await queryInterface.addIndex('laudos', ['vencimento']);
    await queryInterface.addIndex('laudos', ['user_id']);
    await queryInterface.addIndex('laudos', ['created_at']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('laudos');
  }
};
