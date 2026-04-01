'use strict';

/**
 * Migration: garante que a tabela whatsapp_sessions possui todas as colunas necessárias.
 * É idempotente — pode ser executada mesmo que a tabela ou colunas já existam.
 */
module.exports = {
  up: async (queryInterface) => {
    await queryInterface.sequelize.query(`
      -- Cria a tabela com colunas completas (no-op se já existir)
      CREATE TABLE IF NOT EXISTS whatsapp_sessions (
        id           VARCHAR(255)              NOT NULL PRIMARY KEY,
        data         JSONB                     NOT NULL DEFAULT '{"creds":{},"keys":{}}',
        status       VARCHAR(20)               NOT NULL DEFAULT 'inactive',
        phone_number VARCHAR(255)              NULL,
        last_activity TIMESTAMP WITH TIME ZONE NULL,
        is_authenticated BOOLEAN              NOT NULL DEFAULT FALSE,
        created_at   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);

    // Corrigir coluna updatedAt (camelCase legado) -> updated_at
    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'whatsapp_sessions' AND column_name = 'updatedAt'
        ) AND NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'whatsapp_sessions' AND column_name = 'updated_at'
        ) THEN
          ALTER TABLE whatsapp_sessions RENAME COLUMN "updatedAt" TO updated_at;
        END IF;
      END $$;
    `);

    // Adicionar colunas ausentes (idempotente via IF NOT EXISTS do bloco DO)
    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'whatsapp_sessions' AND column_name = 'status'
        ) THEN
          ALTER TABLE whatsapp_sessions ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'inactive';
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'whatsapp_sessions' AND column_name = 'phone_number'
        ) THEN
          ALTER TABLE whatsapp_sessions ADD COLUMN phone_number VARCHAR(255) NULL;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'whatsapp_sessions' AND column_name = 'last_activity'
        ) THEN
          ALTER TABLE whatsapp_sessions ADD COLUMN last_activity TIMESTAMP WITH TIME ZONE NULL;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'whatsapp_sessions' AND column_name = 'is_authenticated'
        ) THEN
          ALTER TABLE whatsapp_sessions ADD COLUMN is_authenticated BOOLEAN NOT NULL DEFAULT FALSE;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'whatsapp_sessions' AND column_name = 'created_at'
        ) THEN
          ALTER TABLE whatsapp_sessions ADD COLUMN created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW();
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'whatsapp_sessions' AND column_name = 'updated_at'
        ) THEN
          ALTER TABLE whatsapp_sessions ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW();
        END IF;
      END $$;
    `);

    // Atualizar registros existentes com defaults onde updated_at é NULL
    await queryInterface.sequelize.query(`
      UPDATE whatsapp_sessions SET updated_at = NOW() WHERE updated_at IS NULL;
      UPDATE whatsapp_sessions SET created_at = NOW() WHERE created_at IS NULL;
    `);
  },

  down: async () => {
    // Não desfaz (todas as alterações são aditivas/seguras)
  },
};
