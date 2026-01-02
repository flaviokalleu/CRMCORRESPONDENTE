'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('UserAccessLog', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      timestamp: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      ip_address: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      location: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      action: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      reference_page: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      session_data: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      referer_url: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      http_method: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      request_params: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      request_body: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      request_headers: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      browser_info: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      device_info: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      os_info: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('UserAccessLog');
  },
};
