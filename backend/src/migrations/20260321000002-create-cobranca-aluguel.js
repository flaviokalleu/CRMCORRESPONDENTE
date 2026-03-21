'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('cobranca_aluguels', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      cliente_aluguel_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'ClienteAluguels',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      asaas_payment_id: {
        type: Sequelize.STRING,
        allowNull: true,
        unique: true,
      },
      valor: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      data_vencimento: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      data_pagamento: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      status: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'PENDING',
      },
      billing_type: {
        type: Sequelize.STRING,
        allowNull: true,
        defaultValue: 'UNDEFINED',
      },
      invoice_url: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      bank_slip_url: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      pix_qr_code: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      tipo: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'recorrente',
      },
      descricao: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('cobranca_aluguels');
  }
};
