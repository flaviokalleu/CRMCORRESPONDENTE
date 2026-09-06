CREATE TABLE public.pessoas (
    id              serial PRIMARY KEY,
    tenant_id       integer NOT NULL REFERENCES public.tenants(id) ON UPDATE CASCADE,
    nome            character varying(255) NOT NULL,
    cpf             character varying(14),
    email           character varying(255),
    telefone        character varying(255),
    data_nascimento date,
    created_at      timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Índice parcial: pessoas sem CPF (lead que só deixou telefone) são permitidas
-- e não colidem entre si.
CREATE UNIQUE INDEX pessoas_tenant_cpf_key
    ON public.pessoas (tenant_id, cpf) WHERE cpf IS NOT NULL;

CREATE INDEX idx_pessoas_tenant ON public.pessoas (tenant_id);
CREATE INDEX idx_pessoas_nome   ON public.pessoas (nome);

ALTER TABLE public.clientes
    ADD COLUMN pessoa_id integer REFERENCES public.pessoas(id) ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE public.cliente_aluguels
    ADD COLUMN pessoa_id integer REFERENCES public.pessoas(id) ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE public.proprietario
    ADD COLUMN pessoa_id integer REFERENCES public.pessoas(id) ON UPDATE CASCADE ON DELETE SET NULL;

CREATE INDEX idx_clientes_pessoa         ON public.clientes (pessoa_id);
CREATE INDEX idx_cliente_aluguels_pessoa ON public.cliente_aluguels (pessoa_id);
CREATE INDEX idx_proprietario_pessoa     ON public.proprietario (pessoa_id);

-- clientes.cpf tinha UNIQUE global, o que impedia dois tenants de cadastrarem
-- o mesmo CPF. Corrigido para unicidade por tenant.
ALTER TABLE public.clientes DROP CONSTRAINT clientes_cpf_key;
CREATE UNIQUE INDEX clientes_tenant_cpf_key
    ON public.clientes (tenant_id, cpf) WHERE cpf IS NOT NULL;
