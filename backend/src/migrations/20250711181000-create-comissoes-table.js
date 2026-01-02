"use strict";
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("comissoes", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      valor: {
        type: Sequelize.DECIMAL(12,2),
        allowNull: false,
      },
      percentual: {
        type: Sequelize.DECIMAL(5,2),
        allowNull: false,
      },
      data: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      contratoId: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      corretorId: {
        type: Sequelize.INTEGER,
        allowNull: false,
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
    await queryInterface.dropTable("comissoes");
  },
};
