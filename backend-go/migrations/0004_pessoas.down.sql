DROP INDEX IF EXISTS public.clientes_tenant_cpf_key;

ALTER TABLE ONLY public.clientes
    ADD CONSTRAINT clientes_cpf_key UNIQUE (cpf);

DROP INDEX IF EXISTS public.idx_proprietario_pessoa;
DROP INDEX IF EXISTS public.idx_cliente_aluguels_pessoa;
DROP INDEX IF EXISTS public.idx_clientes_pessoa;

ALTER TABLE public.proprietario     DROP COLUMN pessoa_id;
ALTER TABLE public.cliente_aluguels DROP COLUMN pessoa_id;
ALTER TABLE public.clientes         DROP COLUMN pessoa_id;

DROP TABLE public.pessoas;
