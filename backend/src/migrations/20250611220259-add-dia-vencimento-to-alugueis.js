'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('alugueis', 'dia_vencimento', {
      type: Sequelize.INTEGER,
      allowNull: true
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('alugueis', 'dia_vencimento');
  }
};