'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Renomeia as colunas snake_case para camelCase, se existirem
    const table = await queryInterface.describeTable('alugueis');
    if (table.created_at && !table.createdAt) {
      await queryInterface.renameColumn('alugueis', 'created_at', 'createdAt');
    }
    if (table.updated_at && !table.updatedAt) {
      await queryInterface.renameColumn('alugueis', 'updated_at', 'updatedAt');
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Reverte para snake_case se necessário
    const table = await queryInterface.describeTable('alugueis');
    if (table.createdAt && !table.created_at) {
      await queryInterface.renameColumn('alugueis', 'createdAt', 'created_at');
    }
    if (table.updatedAt && !table.updated_at) {
      await queryInterface.renameColumn('alugueis', 'updatedAt', 'updated_at');
    }
  }
};