'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('alugueis', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      nome_imovel: {
        type: Sequelize.STRING,
        allowNull: true
      },
      descricao: {
        type: Sequelize.STRING,
        allowNull: true
      },
      valor_aluguel: {
        type: Sequelize.FLOAT,
        allowNull: true
      },
      quartos: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      banheiro: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      dia_vencimento: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      foto_capa: {
        type: Sequelize.STRING,
        allowNull: true
      },
      alugado: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false
      },
      foto_adicional: {
        type: Sequelize.TEXT,
        allowNull: true
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
    await queryInterface.dropTable('alugueis');
  }
};
