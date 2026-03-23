'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('simulacoes', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      cliente_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'clientes', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      tenant_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      valor_imovel: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
      },
      valor_entrada: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
      },
      valor_financiado: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
      },
      prazo_meses: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      taxa_juros_anual: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
      },
      sistema: {
        type: Sequelize.ENUM('SAC', 'PRICE'),
        allowNull: false,
        defaultValue: 'SAC',
      },
      primeira_parcela: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: true,
      },
      ultima_parcela: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: true,
      },
      total_pago: {
        type: Sequelize.DECIMAL(14, 2),
        allowNull: true,
      },
      total_juros: {
        type: Sequelize.DECIMAL(14, 2),
        allowNull: true,
      },
      renda_minima: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: true,
      },
      observacoes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // Índices para performance
    await queryInterface.addIndex('simulacoes', ['cliente_id']);
    await queryInterface.addIndex('simulacoes', ['user_id']);
    await queryInterface.addIndex('simulacoes', ['tenant_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('simulacoes');
  },
};
