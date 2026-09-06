BEGIN;
ALTER TABLE public.clientes DROP CONSTRAINT IF EXISTS clientes_email_key;
-- Nome que AutoMigrate poderia ter criado a partir do antigo model.
DROP INDEX IF EXISTS public.idx_clientes_email;
DROP INDEX IF EXISTS public.idx_clientes_cpf;
CREATE UNIQUE INDEX clientes_tenant_email_key
    ON public.clientes (tenant_id, email) WHERE email IS NOT NULL;
COMMIT;
