'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // Verificar estrutura atual da tabela
      const tableInfo = await queryInterface.describeTable('alugueis');
      console.log('Estrutura atual da tabela alugueis:', Object.keys(tableInfo));

      // Se existir createdAt (camelCase), renomear para created_at (snake_case)
      if (tableInfo.createdAt && !tableInfo.created_at) {
        await queryInterface.renameColumn('alugueis', 'createdAt', 'created_at');
        console.log('✅ Coluna createdAt renomeada para created_at');
      }

      if (tableInfo.updatedAt && !tableInfo.updated_at) {
        await queryInterface.renameColumn('alugueis', 'updatedAt', 'updated_at');
        console.log('✅ Coluna updatedAt renomeada para updated_at');
      }

      // Se não existir nenhuma das colunas de timestamp, criar
      if (!tableInfo.createdAt && !tableInfo.created_at) {
        await queryInterface.addColumn('alugueis', 'created_at', {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW
        });
        console.log('✅ Coluna created_at criada');
      }

      if (!tableInfo.updatedAt && !tableInfo.updated_at) {
        await queryInterface.addColumn('alugueis', 'updated_at', {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW
        });
        console.log('✅ Coluna updated_at criada');
      }

      // Garantir que as colunas não sejam nulas
      await queryInterface.changeColumn('alugueis', 'created_at', {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      });

      await queryInterface.changeColumn('alugueis', 'updated_at', {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      });

      // Atualizar registros com timestamps nulos
      await queryInterface.sequelize.query(`
        UPDATE alugueis 
        SET created_at = COALESCE(created_at, NOW()),
            updated_at = COALESCE(updated_at, NOW())
        WHERE created_at IS NULL OR updated_at IS NULL
      `);

      console.log('✅ Timestamps corrigidos com sucesso');

    } catch (error) {
      console.error('❌ Erro ao corrigir timestamps:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      // Reverter para camelCase se necessário
      await queryInterface.renameColumn('alugueis', 'created_at', 'createdAt');
      await queryInterface.renameColumn('alugueis', 'updated_at', 'updatedAt');
      console.log('✅ Timestamps revertidos para camelCase');
    } catch (error) {
      console.error('❌ Erro ao reverter timestamps:', error);
      throw error;
    }
  }
};