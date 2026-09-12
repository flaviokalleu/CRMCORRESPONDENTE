-- O baseline 0001 veio de pg_dump e traz `set_config('search_path','')`,
-- que vale pela sessão inteira do golang-migrate. Sem restaurar aqui, os
-- nomes sem schema abaixo falham com "relação não existe" num banco novo.
SET search_path TO public;

-- Fecha o buraco entre as migrations versionadas e o banco de desenvolvimento.
--
-- As versões 3 a 7 foram aplicadas direto no banco de dev e nunca chegaram ao
-- repositório: `schema_migrations` marcava 7, mas `migrations/` só ia até 2.
-- Um banco criado do zero pelo docker-compose nasceria sem `pessoas` e sem
-- `clientes.pessoa_id`, divergindo de dev sem ninguém perceber.
--
-- Tudo aqui é idempotente (IF NOT EXISTS), então rodar no banco que já tem as
-- alterações é inofensivo — é o que permite aplicar nos dois lugares.

CREATE TABLE IF NOT EXISTS pessoas (
    id              SERIAL PRIMARY KEY,
    tenant_id       INTEGER      NOT NULL REFERENCES tenants (id) ON UPDATE CASCADE,
    nome            VARCHAR(255) NOT NULL,
    cpf             VARCHAR(14),
    email           VARCHAR(255),
    telefone        VARCHAR(255),
    data_nascimento DATE,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pessoas_nome ON pessoas (nome);
CREATE INDEX IF NOT EXISTS idx_pessoas_tenant ON pessoas (tenant_id);

-- CPF é único dentro do tenant, mas só quando informado: cadastro sem CPF é
-- comum, e um índice único simples trataria vários NULL como colisão.
CREATE UNIQUE INDEX IF NOT EXISTS pessoas_tenant_cpf_key
    ON pessoas (tenant_id, cpf) WHERE cpf IS NOT NULL;

-- Ligação das três tabelas que apontam para a pessoa unificada. A coluna é
-- opcional: o backend Go não a usa ainda, e um NOT NULL travaria a criação de
-- cliente pelo fluxo atual.
ALTER TABLE clientes          ADD COLUMN IF NOT EXISTS pessoa_id INTEGER REFERENCES pessoas (id);
ALTER TABLE cliente_aluguels  ADD COLUMN IF NOT EXISTS pessoa_id INTEGER REFERENCES pessoas (id);
ALTER TABLE proprietario      ADD COLUMN IF NOT EXISTS pessoa_id INTEGER REFERENCES pessoas (id);

CREATE INDEX IF NOT EXISTS idx_clientes_pessoa ON clientes (pessoa_id) WHERE pessoa_id IS NOT NULL;
