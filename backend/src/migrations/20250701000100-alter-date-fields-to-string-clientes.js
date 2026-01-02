'use strict';

// Migration para alterar campos de data de DATE para STRING (YYYY-MM-DD) na tabela clientes

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Campos do cliente
    // Apenas campos de data devem ser alterados para STRING(10)
    await queryInterface.changeColumn('clientes', 'data_admissao', {
      type: Sequelize.STRING(10),
      allowNull: true
    });
    await queryInterface.changeColumn('clientes', 'data_nascimento', {
      type: Sequelize.STRING(10),
      allowNull: true
    });
    await queryInterface.changeColumn('clientes', 'conjuge_data_nascimento', {
      type: Sequelize.STRING(10),
      allowNull: true
    });
    await queryInterface.changeColumn('clientes', 'conjuge_data_admissao', {
      type: Sequelize.STRING(10),
      allowNull: true
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Reverte para DATE
    await queryInterface.changeColumn('clientes', 'data_admissao', {
      type: Sequelize.DATE,
      allowNull: true
    });
    await queryInterface.changeColumn('clientes', 'data_nascimento', {
      type: Sequelize.DATE,
      allowNull: true
    });
    await queryInterface.changeColumn('clientes', 'conjuge_data_nascimento', {
      type: Sequelize.DATE,
      allowNull: true
    });
    await queryInterface.changeColumn('clientes', 'conjuge_data_admissao', {
      type: Sequelize.DATE,
      allowNull: true
    });
  }
};
