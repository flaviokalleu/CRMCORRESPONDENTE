'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      await queryInterface.sequelize.query(`
        DO $$
        BEGIN
          IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name='whatsapps' AND column_name='createdAt'
          ) THEN
            ALTER TABLE whatsapps RENAME COLUMN "createdAt" TO created_at;
          END IF;
          IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name='whatsapps' AND column_name='updatedAt'
          ) THEN
            ALTER TABLE whatsapps RENAME COLUMN "updatedAt" TO updated_at;
          END IF;
        END $$;
      `);
    } catch (error) {
      console.log('Migration error:', error);
    }
  },

  async down(queryInterface, Sequelize) {
    try {
      await queryInterface.sequelize.query(`
        DO $$
        BEGIN
          IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name='whatsapps' AND column_name='created_at'
          ) THEN
            ALTER TABLE whatsapps RENAME COLUMN created_at TO "createdAt";
          END IF;
          IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name='whatsapps' AND column_name='updated_at'
          ) THEN
            ALTER TABLE whatsapps RENAME COLUMN updated_at TO "updatedAt";
          END IF;
        END $$;
      `);
    } catch (error) {
      console.log('Migration rollback error:', error);
    }
  }
};