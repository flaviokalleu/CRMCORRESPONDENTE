'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('imoveis', 'created_at', {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
    });
    
    await queryInterface.addColumn('imoveis', 'updated_at', {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('imoveis', 'created_at');
    await queryInterface.removeColumn('imoveis', 'updated_at');
  }
};