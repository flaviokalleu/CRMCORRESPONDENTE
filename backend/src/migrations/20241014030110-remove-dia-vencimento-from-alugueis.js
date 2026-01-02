'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('alugueis', 'dia_vencimento');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('alugueis', 'dia_vencimento', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
  }
};
