-- ============================================
-- SCRIPT DE INICIALIZACAO DO BANCO DE DADOS
-- ============================================

-- Criar extensoes necessarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Mensagem de confirmacao
DO $$
BEGIN
    RAISE NOTICE 'Banco de dados CRM inicializado com sucesso!';
END $$;
