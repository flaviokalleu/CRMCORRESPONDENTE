'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('clientes', 'conjuge_nome', {
      type: Sequelize.STRING,
      allowNull: true
    });
    await queryInterface.addColumn('clientes', 'conjuge_email', {
      type: Sequelize.STRING,
      allowNull: true
    });
    await queryInterface.addColumn('clientes', 'conjuge_telefone', {
      type: Sequelize.STRING,
      allowNull: true
    });
    await queryInterface.addColumn('clientes', 'conjuge_cpf', {
      type: Sequelize.STRING,
      allowNull: true
    });
    await queryInterface.addColumn('clientes', 'conjuge_profissao', {
      type: Sequelize.STRING,
      allowNull: true
    });
    await queryInterface.addColumn('clientes', 'conjuge_data_nascimento', {
      type: Sequelize.STRING(10), // YYYY-MM-DD
      allowNull: true
    });
    await queryInterface.addColumn('clientes', 'conjuge_valor_renda', {
      type: Sequelize.STRING,
      allowNull: true
    });
    await queryInterface.addColumn('clientes', 'conjuge_renda_tipo', {
      type: Sequelize.STRING,
      allowNull: true
    });
    await queryInterface.addColumn('clientes', 'conjuge_data_admissao', {
      type: Sequelize.STRING(10), // YYYY-MM-DD
      allowNull: true
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('clientes', 'conjuge_nome');
    await queryInterface.removeColumn('clientes', 'conjuge_email');
    await queryInterface.removeColumn('clientes', 'conjuge_telefone');
    await queryInterface.removeColumn('clientes', 'conjuge_cpf');
    await queryInterface.removeColumn('clientes', 'conjuge_profissao');
    await queryInterface.removeColumn('clientes', 'conjuge_data_nascimento');
    await queryInterface.removeColumn('clientes', 'conjuge_valor_renda');
    await queryInterface.removeColumn('clientes', 'conjuge_renda_tipo');
    await queryInterface.removeColumn('clientes', 'conjuge_data_admissao');
  }
};
