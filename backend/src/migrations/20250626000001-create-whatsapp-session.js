'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('whatsapp_sessions', {
      id: {
        type: Sequelize.STRING,
        allowNull: false,
        primaryKey: true
      },
      data: {
        type: Sequelize.JSONB,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW')
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('whatsapp_sessions');
  }
};
