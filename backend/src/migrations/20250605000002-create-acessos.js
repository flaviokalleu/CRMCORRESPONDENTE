'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('acessos', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      user_id: {
        type: Sequelize.INTEGER,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      ip: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      referer: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      user_agent: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      data_acesso: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('acessos');
  }
};