'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      // First check if table exists, if not create it
      const tables = await queryInterface.showAllTables();
      if (!tables.includes('notas')) {
        await queryInterface.createTable('notas', {
          id: {
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
            type: Sequelize.INTEGER
          },
          cliente_id: {
            type: Sequelize.INTEGER,
            references: { model: 'clientes', key: 'id' }
          },
          texto: {
            type: Sequelize.TEXT
          },
          created_at: {
            allowNull: false,
            type: Sequelize.DATE,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
          },
          updated_at: {
            allowNull: false,
            type: Sequelize.DATE,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
          }
        });
        return; // Exit if we just created the table
      }

      // If table exists, check and update timestamp columns
      const tableInfo = await queryInterface.describeTable('notas');
      
      // Handle created_at column
      if (!tableInfo.created_at) {
        await queryInterface.addColumn('notas', 'created_at', {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        });
      }

      // Handle updated_at column
      if (!tableInfo.updated_at) {
        await queryInterface.addColumn('notas', 'updated_at', {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        });
      }
    } catch (error) {
      console.error('Migration Error:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    try {
      const tableInfo = await queryInterface.describeTable('notas');
      
      if (tableInfo.created_at) {
        await queryInterface.removeColumn('notas', 'created_at');
      }
      if (tableInfo.updated_at) {
        await queryInterface.removeColumn('notas', 'updated_at');
      }
    } catch (error) {
      console.error('Migration Rollback Error:', error);
      throw error;
    }
  }
};