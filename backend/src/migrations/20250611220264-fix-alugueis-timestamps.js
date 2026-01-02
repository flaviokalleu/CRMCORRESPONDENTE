'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Verificar se as colunas createdAt e updatedAt existem
      const tableDescription = await queryInterface.describeTable('alugueis');
      
      // Se existirem as colunas em camelCase, removê-las
      if (tableDescription.createdAt) {
        await queryInterface.removeColumn('alugueis', 'createdAt', { transaction });
      }
      
      if (tableDescription.updatedAt) {
        await queryInterface.removeColumn('alugueis', 'updatedAt', { transaction });
      }
      
      // Adicionar as colunas em snake_case se não existirem
      if (!tableDescription.created_at) {
        await queryInterface.addColumn('alugueis', 'created_at', {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('NOW')
        }, { transaction });
      }
      
      if (!tableDescription.updated_at) {
        await queryInterface.addColumn('alugueis', 'updated_at', {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('NOW')
        }, { transaction });
      }
      
      // Criar função para atualizar updated_at automaticamente
      await queryInterface.sequelize.query(`
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $$ language 'plpgsql';
      `, { transaction });
      
      // Criar trigger para atualizar updated_at automaticamente
      await queryInterface.sequelize.query(`
        DROP TRIGGER IF EXISTS update_alugueis_updated_at ON alugueis;
        CREATE TRIGGER update_alugueis_updated_at 
            BEFORE UPDATE ON alugueis 
            FOR EACH ROW 
            EXECUTE FUNCTION update_updated_at_column();
      `, { transaction });
      
      // Atualizar registros existentes que podem ter valores null
      await queryInterface.sequelize.query(`
        UPDATE alugueis 
        SET created_at = NOW(), updated_at = NOW() 
        WHERE created_at IS NULL OR updated_at IS NULL;
      `, { transaction });
      
      await transaction.commit();
      console.log('Migration executada com sucesso: timestamps corrigidos');
      
    } catch (error) {
      await transaction.rollback();
      console.error('Erro na migration:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Remover trigger e função
      await queryInterface.sequelize.query(`
        DROP TRIGGER IF EXISTS update_alugueis_updated_at ON alugueis;
      `, { transaction });
      
      await queryInterface.sequelize.query(`
        DROP FUNCTION IF EXISTS update_updated_at_column();
      `, { transaction });
      
      // Remover as colunas snake_case
      await queryInterface.removeColumn('alugueis', 'created_at', { transaction });
      await queryInterface.removeColumn('alugueis', 'updated_at', { transaction });
      
      // Adicionar de volta as colunas camelCase
      await queryInterface.addColumn('alugueis', 'createdAt', {
        type: Sequelize.DATE,
        allowNull: true
      }, { transaction });
      
      await queryInterface.addColumn('alugueis', 'updatedAt', {
        type: Sequelize.DATE,
        allowNull: true
      }, { transaction });
      
      await transaction.commit();
      console.log('Migration revertida com sucesso');
      
    } catch (error) {
      await transaction.rollback();
      console.error('Erro ao reverter migration:', error);
      throw error;
    }
  }
};