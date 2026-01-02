'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // Verificar se as colunas já existem
      const tableInfo = await queryInterface.describeTable('alugueis');
      
      // Adicionar created_at se não existir
      if (!tableInfo.created_at) {
        await queryInterface.addColumn('alugueis', 'created_at', {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW
        });
        console.log('✅ Coluna created_at adicionada com sucesso');
      }

      // Adicionar updated_at se não existir
      if (!tableInfo.updated_at) {
        await queryInterface.addColumn('alugueis', 'updated_at', {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW
        });
        console.log('✅ Coluna updated_at adicionada com sucesso');
      }

      // Atualizar registros existentes que possam ter timestamps nulos
      await queryInterface.sequelize.query(`
        UPDATE alugueis 
        SET created_at = NOW(), updated_at = NOW() 
        WHERE created_at IS NULL OR updated_at IS NULL
      `);

    } catch (error) {
      console.error('❌ Erro ao adicionar timestamps:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      await queryInterface.removeColumn('alugueis', 'created_at');
      await queryInterface.removeColumn('alugueis', 'updated_at');
      console.log('✅ Colunas de timestamp removidas com sucesso');
    } catch (error) {
      console.error('❌ Erro ao remover timestamps:', error);
      throw error;
    }
  }
};