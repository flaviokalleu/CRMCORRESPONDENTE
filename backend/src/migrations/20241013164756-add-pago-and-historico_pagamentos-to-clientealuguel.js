'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('ClienteAluguels', 'pago', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
    await queryInterface.addColumn('ClienteAluguels', 'historico_pagamentos', {
      type: Sequelize.JSON,
      allowNull: true,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('ClienteAluguels', 'pago');
    await queryInterface.removeColumn('ClienteAluguels', 'historico_pagamentos');
  }
};
