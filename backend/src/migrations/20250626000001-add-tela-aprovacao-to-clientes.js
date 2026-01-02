'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('clientes', 'tela_aprovacao', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Caminho para o arquivo de tela de aprovação do cliente'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('clientes', 'tela_aprovacao');
  }
};
