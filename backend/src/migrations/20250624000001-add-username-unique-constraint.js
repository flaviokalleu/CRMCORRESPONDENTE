'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Adicionar constraint única no username
    await queryInterface.addConstraint('users', {
      fields: ['username'],
      type: 'unique',
      name: 'users_username_unique'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remover constraint única do username
    await queryInterface.removeConstraint('users', 'users_username_unique');
  }
};
