DROP INDEX IF EXISTS clientes_tenant_cpf_key;
DROP INDEX IF EXISTS clientes_tenant_email_key;
ALTER TABLE clientes ADD CONSTRAINT clientes_cpf_key UNIQUE (cpf);
ALTER TABLE clientes ADD CONSTRAINT clientes_email_key UNIQUE (email);
