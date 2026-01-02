'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      // Adicionar campos do fiador
      await queryInterface.addColumn('clientes', 'possui_fiador', {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false
      });

      await queryInterface.addColumn('clientes', 'fiador_nome', {
        type: Sequelize.STRING,
        allowNull: true
      });

      await queryInterface.addColumn('clientes', 'fiador_cpf', {
        type: Sequelize.STRING,
        allowNull: true
      });

      await queryInterface.addColumn('clientes', 'fiador_telefone', {
        type: Sequelize.STRING,
        allowNull: true
      });

      await queryInterface.addColumn('clientes', 'fiador_email', {
        type: Sequelize.STRING,
        allowNull: true
      });

      await queryInterface.addColumn('clientes', 'fiador_documentos', {
        type: Sequelize.TEXT,
        allowNull: true
      });

      // Adicionar campos dos formulários Caixa
      await queryInterface.addColumn('clientes', 'possui_formularios_caixa', {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false
      });

      await queryInterface.addColumn('clientes', 'formularios_caixa', {
        type: Sequelize.TEXT,
        allowNull: true
      });

      console.log('✅ Campos do fiador e formulários Caixa adicionados com sucesso');

    } catch (error) {
      console.error('❌ Erro ao adicionar campos:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    try {
      await queryInterface.removeColumn('clientes', 'possui_fiador');
      await queryInterface.removeColumn('clientes', 'fiador_nome');
      await queryInterface.removeColumn('clientes', 'fiador_cpf');
      await queryInterface.removeColumn('clientes', 'fiador_telefone');
      await queryInterface.removeColumn('clientes', 'fiador_email');
      await queryInterface.removeColumn('clientes', 'fiador_documentos');
      await queryInterface.removeColumn('clientes', 'possui_formularios_caixa');
      await queryInterface.removeColumn('clientes', 'formularios_caixa');
    } catch (error) {
      console.error('❌ Erro ao remover campos:', error);
      throw error;
    }
  }
};