'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('users', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      username: {
        type: Sequelize.STRING,
        allowNull: true
      },
      first_name: {
        type: Sequelize.STRING,
        allowNull: true
      },
      last_name: {
        type: Sequelize.STRING,
        allowNull: true
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      telefone: {
        type: Sequelize.STRING,
        allowNull: true
      },
      password: {
        type: Sequelize.STRING,
        allowNull: false
      },
      creci: {
        type: Sequelize.STRING,
        allowNull: true
      },
      address: {
        type: Sequelize.STRING,
        allowNull: true
      },
      pix_account: {
        type: Sequelize.STRING,
        allowNull: true
      },
      photo: {
        type: Sequelize.STRING,
        allowNull: true
      },
      is_corretor: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      is_administrador: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      is_correspondente: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('users');
  }
};