"use strict";
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("fluxo_caixa", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      data: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      tipo: {
        type: Sequelize.STRING,
        allowNull: false, // entrada ou saida
      },
      valor: {
        type: Sequelize.DECIMAL(12,2),
        allowNull: false,
      },
      descricao: {
        type: Sequelize.STRING,
      },
      referenciaId: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      referenciaTipo: {
        type: Sequelize.STRING,
        allowNull: true, // receita, despesa, comissão
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable("fluxo_caixa");
  },
};
