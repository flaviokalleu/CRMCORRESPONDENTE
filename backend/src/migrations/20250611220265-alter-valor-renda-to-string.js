'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('clientes', 'valor_renda', {
      type: Sequelize.STRING,
      allowNull: true
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('clientes', 'valor_renda', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true
    });
  }
};