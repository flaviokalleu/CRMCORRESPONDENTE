'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('ClienteAluguels', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      clienteId: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      nome: {
        type: Sequelize.STRING,
        allowNull: false
      },
      cpf: {
        type: Sequelize.STRING,
        allowNull: false
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false,
        validate: {
          isEmail: true
        }
      },
      telefone: {
        type: Sequelize.STRING,
        allowNull: false
      },
      valor_aluguel: {
        type: Sequelize.DECIMAL,
        allowNull: false
      },
      dia_vencimento: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('ClienteAluguels');
  }
};
