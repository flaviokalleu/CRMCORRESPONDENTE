DROP INDEX IF EXISTS idx_clientes_origem;
ALTER TABLE clientes DROP COLUMN IF EXISTS interesse;
ALTER TABLE clientes DROP COLUMN IF EXISTS origem;
