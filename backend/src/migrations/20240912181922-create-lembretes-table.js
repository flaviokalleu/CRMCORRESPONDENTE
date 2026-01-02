'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Lembretes', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      titulo: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      descricao: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      data: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      notificado: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      concluido: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('Lembretes');
  }
};
