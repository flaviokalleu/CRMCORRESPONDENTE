"use strict";
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("despesas", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      tipo: {
        type: Sequelize.STRING,
        allowNull: false, // operacional, comissão, imposto, manutenção
      },
      valor: {
        type: Sequelize.DECIMAL(12,2),
        allowNull: false,
      },
      descricao: {
        type: Sequelize.STRING,
      },
      data: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      contratoId: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      corretorId: {
        type: Sequelize.INTEGER,
        allowNull: true,
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
    await queryInterface.dropTable("despesas");
  },
};
