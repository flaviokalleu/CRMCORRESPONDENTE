BEGIN;
-- Falha atomicamente se empresas diferentes já compartilham e-mails.
-- Não apagar nem alterar esses cadastros para forçar o rollback.
ALTER TABLE public.clientes ADD CONSTRAINT clientes_email_key UNIQUE (email);
DROP INDEX public.clientes_tenant_email_key;
COMMIT;
