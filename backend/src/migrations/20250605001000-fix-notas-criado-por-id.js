'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      // Atualiza valores não numéricos para NULL
      await queryInterface.sequelize.query(`
        UPDATE notas 
        SET criado_por_id = NULL 
        WHERE criado_por_id !~ '^[0-9]+$'
      `);

      // Altera o tipo da coluna para INTEGER e adiciona FK para users(id)
      await queryInterface.sequelize.query(`
        ALTER TABLE notas 
        ALTER COLUMN criado_por_id TYPE INTEGER 
        USING CASE 
          WHEN criado_por_id ~ '^[0-9]+$' 
          THEN criado_por_id::INTEGER 
          ELSE NULL 
        END
      `);

      // Adiciona a constraint de chave estrangeira para users(id)
      await queryInterface.sequelize.query(`
        ALTER TABLE notas
        ADD CONSTRAINT fk_notas_criado_por_id
        FOREIGN KEY (criado_por_id)
        REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL
      `);
    } catch (error) {
      console.error('Migration Error:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    try {
      // Remove a constraint de chave estrangeira
      await queryInterface.sequelize.query(`
        ALTER TABLE notas
        DROP CONSTRAINT IF EXISTS fk_notas_criado_por_id
      `);

      // Altera o tipo da coluna de volta para VARCHAR(255)
      await queryInterface.sequelize.query(`
        ALTER TABLE notas 
        ALTER COLUMN criado_por_id TYPE VARCHAR(255)
      `);
    } catch (error) {
      console.error('Migration Rollback Error:', error);
      throw error;
    }
  }
};