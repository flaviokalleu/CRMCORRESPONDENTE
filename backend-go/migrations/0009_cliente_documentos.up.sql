-- O baseline 0001 veio de pg_dump e traz `set_config('search_path','')`,
-- que vale pela sessão inteira do golang-migrate. Sem restaurar aqui, os
-- nomes sem schema abaixo falham com "relação não existe" num banco novo.
SET search_path TO public;

-- Documentos do cliente, um arquivo por linha.
--
-- Até aqui cada tipo de documento tinha UMA coluna de texto em `clientes`
-- guardando um único caminho, o que impedia enviar as duas faces do RG sem que
-- a segunda sobrescrevesse a primeira. Cada arquivo passa a ser uma linha, e as
-- colunas antigas continuam existindo apontando para o PDF consolidado do tipo
-- — nada que já lê `clientes.documentos_pessoais` precisa mudar.
CREATE TABLE IF NOT EXISTS cliente_documentos (
    id            SERIAL PRIMARY KEY,
    cliente_id    INTEGER NOT NULL REFERENCES clientes (id) ON DELETE CASCADE,
    tenant_id     INTEGER NOT NULL,
    tipo          VARCHAR(40)  NOT NULL,  -- chave de models.DocumentTypeMap
    ordem         INTEGER      NOT NULL DEFAULT 0,
    nome_original VARCHAR(255) NOT NULL,
    caminho       TEXT         NOT NULL,  -- relativo a UploadsRoot()
    mime          VARCHAR(100) NOT NULL,
    bytes         BIGINT       NOT NULL DEFAULT 0,
    bytes_origem  BIGINT       NOT NULL DEFAULT 0,  -- tamanho antes de otimizar
    paginas       INTEGER      NOT NULL DEFAULT 1,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- A listagem sempre pede "os documentos deste cliente, deste tipo, nesta ordem".
CREATE INDEX IF NOT EXISTS idx_cliente_documentos_cliente_tipo
    ON cliente_documentos (cliente_id, tipo, ordem);

-- O mesmo arquivo não pode ser registrado duas vezes para o mesmo cliente.
CREATE UNIQUE INDEX IF NOT EXISTS idx_cliente_documentos_caminho
    ON cliente_documentos (caminho);
