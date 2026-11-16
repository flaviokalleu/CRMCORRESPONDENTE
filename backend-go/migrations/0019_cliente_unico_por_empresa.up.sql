-- CPF e e-mail de cliente eram UNIQUE no banco inteiro: uma imobiliária não
-- conseguia cadastrar um cliente que outra já atendia, e a recusa revelava que
-- o CPF existia em outra empresa (LGPD). Passa a ser único por empresa.
ALTER TABLE clientes DROP CONSTRAINT IF EXISTS clientes_cpf_key;
ALTER TABLE clientes DROP CONSTRAINT IF EXISTS clientes_email_key;
CREATE UNIQUE INDEX IF NOT EXISTS clientes_tenant_cpf_key ON clientes (tenant_id, cpf) WHERE cpf IS NOT NULL AND cpf <> '';
CREATE UNIQUE INDEX IF NOT EXISTS clientes_tenant_email_key ON clientes (tenant_id, lower(email)) WHERE email IS NOT NULL AND email <> '';
