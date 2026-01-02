'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addConstraint('tokens', {
      fields: ['user_id', 'user_type'],
      type: 'unique',
      name: 'unique_user_id_user_type'
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeConstraint('tokens', 'unique_user_id_user_type');
  }
};
