'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      // Verificar se as colunas já existem antes de adicioná-las
      const tableInfo = await queryInterface.describeTable('acessos');
      
      const columnsToAdd = [];
      
      if (!tableInfo.session_id) {
        columnsToAdd.push({
          name: 'session_id',
          definition: {
            type: Sequelize.STRING,
            allowNull: true,
          }
        });
      }
      
      if (!tableInfo.action_type) {
        columnsToAdd.push({
          name: 'action_type',
          definition: {
            type: Sequelize.ENUM('login', 'logout', 'page_view', 'api_call'),
            defaultValue: 'page_view',
            allowNull: false,
          }
        });
      }
      
      if (!tableInfo.duration_seconds) {
        columnsToAdd.push({
          name: 'duration_seconds',
          definition: {
            type: Sequelize.INTEGER,
            allowNull: true,
            comment: 'Tempo gasto na página em segundos'
          }
        });
      }
      
      if (!tableInfo.browser_name) {
        columnsToAdd.push({
          name: 'browser_name',
          definition: {
            type: Sequelize.STRING,
            allowNull: true,
          }
        });
      }
      
      if (!tableInfo.browser_version) {
        columnsToAdd.push({
          name: 'browser_version',
          definition: {
            type: Sequelize.STRING,
            allowNull: true,
          }
        });
      }
      
      if (!tableInfo.os_name) {
        columnsToAdd.push({
          name: 'os_name',
          definition: {
            type: Sequelize.STRING,
            allowNull: true,
          }
        });
      }
      
      if (!tableInfo.os_version) {
        columnsToAdd.push({
          name: 'os_version',
          definition: {
            type: Sequelize.STRING,
            allowNull: true,
          }
        });
      }

      // Adicionar colunas que não existem
      for (const column of columnsToAdd) {
        console.log(`Adicionando coluna ${column.name} na tabela acessos`);
        await queryInterface.addColumn('acessos', column.name, column.definition);
      }
      
      console.log('Migration concluída com sucesso!');
    } catch (error) {
      console.error('Erro na migration:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    try {
      const columnsToRemove = [
        'session_id',
        'action_type', 
        'duration_seconds',
        'browser_name',
        'browser_version',
        'os_name',
        'os_version'
      ];
      
      for (const columnName of columnsToRemove) {
        try {
          await queryInterface.removeColumn('acessos', columnName);
          console.log(`Coluna ${columnName} removida`);
        } catch (error) {
          console.log(`Coluna ${columnName} não existe ou já foi removida`);
        }
      }
      
      // Remover o ENUM se existir
      try {
        await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_acessos_action_type";');
      } catch (error) {
        console.log('ENUM action_type não existe');
      }
      
    } catch (error) {
      console.error('Erro ao reverter migration:', error);
      throw error;
    }
  }
};