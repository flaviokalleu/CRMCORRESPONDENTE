'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */
    await queryInterface.createTable('cliente_aluguels', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      nome: Sequelize.STRING,
      cpf: Sequelize.STRING,
      email: Sequelize.STRING,
      telefone: Sequelize.STRING,
      valor_aluguel: Sequelize.STRING,
      dia_vencimento: Sequelize.STRING,
      pago: Sequelize.BOOLEAN,
      historico_pagamentos: Sequelize.JSONB,
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });
  },

  async down (queryInterface, Sequelize) {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
    await queryInterface.dropTable('cliente_aluguels');
  }
};
