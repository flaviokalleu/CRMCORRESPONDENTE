"use strict";
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("receitas", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      tipo: {
        type: Sequelize.STRING,
        allowNull: false, // venda, aluguel, taxa
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
    await queryInterface.dropTable("receitas");
  },
};
