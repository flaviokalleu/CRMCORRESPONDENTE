-- Recria a tabela legada vazia e devolve as FKs a ela. Não restaura dados:
-- a tabela nunca teve linhas de produção.
CREATE TABLE public."ClienteAluguels" (
    id integer NOT NULL,
    "clienteId" integer,
    nome character varying(255) NOT NULL,
    cpf character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    telefone character varying(255) NOT NULL,
    valor_aluguel numeric NOT NULL,
    dia_vencimento integer NOT NULL,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    CONSTRAINT "ClienteAluguels_pkey" PRIMARY KEY (id)
);

ALTER TABLE public.chamado_manutencaos DROP CONSTRAINT chamado_manutencaos_cliente_aluguel_id_fkey;
ALTER TABLE public.chamado_manutencaos ADD CONSTRAINT chamado_manutencaos_cliente_aluguel_id_fkey
    FOREIGN KEY (cliente_aluguel_id) REFERENCES public."ClienteAluguels"(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE public.cobranca_aluguels DROP CONSTRAINT cobranca_aluguels_cliente_aluguel_id_fkey;
ALTER TABLE public.cobranca_aluguels ADD CONSTRAINT cobranca_aluguels_cliente_aluguel_id_fkey
    FOREIGN KEY (cliente_aluguel_id) REFERENCES public."ClienteAluguels"(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE public.regua_cobrancas DROP CONSTRAINT regua_cobrancas_cliente_aluguel_id_fkey;
ALTER TABLE public.regua_cobrancas ADD CONSTRAINT regua_cobrancas_cliente_aluguel_id_fkey
    FOREIGN KEY (cliente_aluguel_id) REFERENCES public."ClienteAluguels"(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE public.repasse_proprietarios DROP CONSTRAINT repasse_proprietarios_cliente_aluguel_id_fkey;
ALTER TABLE public.repasse_proprietarios ADD CONSTRAINT repasse_proprietarios_cliente_aluguel_id_fkey
    FOREIGN KEY (cliente_aluguel_id) REFERENCES public."ClienteAluguels"(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE public.vistoria_aluguels DROP CONSTRAINT vistoria_aluguels_cliente_aluguel_id_fkey;
ALTER TABLE public.vistoria_aluguels ADD CONSTRAINT vistoria_aluguels_cliente_aluguel_id_fkey
    FOREIGN KEY (cliente_aluguel_id) REFERENCES public."ClienteAluguels"(id) ON UPDATE CASCADE ON DELETE CASCADE;
