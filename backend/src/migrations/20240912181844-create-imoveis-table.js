'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('imoveis', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      nome_imovel: {
        type: Sequelize.STRING,
        allowNull: false
      },
      descricao_imovel: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      endereco: {
        type: Sequelize.STRING,
        allowNull: false
      },
      tipo: {
        type: Sequelize.STRING,
        allowNull: false
      },
      quartos: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      banheiro: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      tags: {
        type: Sequelize.STRING,
        allowNull: true
      },
      valor_avaliacao: {
        type: Sequelize.FLOAT,
        allowNull: true
      },
      valor_venda: {
        type: Sequelize.FLOAT,
        allowNull: false
      },
      documentacao: {
        type: Sequelize.STRING,
        allowNull: true
      },
      imagens: {
        type: Sequelize.JSON,
        allowNull: true
      },
      imagem_capa: {
        type: Sequelize.STRING,
        allowNull: true
      },
      localizacao: {
        type: Sequelize.STRING,
        allowNull: true
      },
      exclusivo: {
        type: Sequelize.BOOLEAN,
        allowNull: false
      },
      tem_inquilino: {
        type: Sequelize.BOOLEAN,
        allowNull: false
      },
      situacao_imovel: {
        type: Sequelize.STRING,
        allowNull: false
      },
      observacoes: {
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
    await queryInterface.dropTable('imoveis');
  }
};
