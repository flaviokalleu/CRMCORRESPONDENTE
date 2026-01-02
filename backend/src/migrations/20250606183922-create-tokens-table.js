'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('tokens', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      token: {
        type: Sequelize.TEXT,
        allowNull: false,
        unique: true // IMPORTANTE: Adicionar constraint de unicidade
      },
      refresh_token: {
        type: Sequelize.TEXT,
        allowNull: true,
        unique: true // Também único para o refresh token
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users', // Nome da tabela em minúsculo
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      user_type: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      email: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW')
      }
    });

    // Adicionar índices para performance
    await queryInterface.addIndex('tokens', ['user_id']);
    await queryInterface.addIndex('tokens', ['email']);
    await queryInterface.addIndex('tokens', ['expires_at']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('tokens');
  }
};