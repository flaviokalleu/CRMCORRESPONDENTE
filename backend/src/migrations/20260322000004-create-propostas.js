'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('propostas', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      cliente_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'clientes', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      imovel_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'imoveis', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      corretor_id: {
        type: Sequelize.INTEGER, allowNull: true,
        references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL',
      },
      tenant_id: { type: Sequelize.INTEGER, allowNull: true },
      valor_ofertado: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      valor_contra_proposta: { type: Sequelize.DECIMAL(12, 2), allowNull: true },
      valor_aceito: { type: Sequelize.DECIMAL(12, 2), allowNull: true },
      forma_pagamento: {
        type: Sequelize.ENUM('financiamento', 'a_vista', 'fgts', 'misto'),
        defaultValue: 'financiamento',
      },
      status: {
        type: Sequelize.ENUM('pendente', 'em_negociacao', 'aceita', 'recusada', 'expirada', 'cancelada'),
        defaultValue: 'pendente',
      },
      data_validade: { type: Sequelize.DATE, allowNull: true },
      condicoes: { type: Sequelize.TEXT, allowNull: true },
      motivo_recusa: { type: Sequelize.TEXT, allowNull: true },
      observacoes: { type: Sequelize.TEXT, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.addIndex('propostas', ['cliente_id']);
    await queryInterface.addIndex('propostas', ['imovel_id']);
    await queryInterface.addIndex('propostas', ['corretor_id']);
    await queryInterface.addIndex('propostas', ['tenant_id']);
    await queryInterface.addIndex('propostas', ['status']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('propostas');
  },
};
