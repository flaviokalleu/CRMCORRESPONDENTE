-- Recria a tabela legada (schema completo, igual ao baseline) e devolve as
-- FKs a ela. Não restaura dados: a tabela nunca teve linhas de produção.
-- Colunas, sequence, default, PK, índice e FKs de saída copiados
-- verbatim de migrations/0001_baseline_schema.up.sql (linhas 178-211,
-- 218-231, 1779, 2021-2025, 2452, 2932-2944).

CREATE SEQUENCE public."ClienteAluguels_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

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
    pago boolean DEFAULT false NOT NULL,
    historico_pagamentos json,
    asaas_customer_id character varying(255) DEFAULT NULL::character varying,
    asaas_subscription_id character varying(255) DEFAULT NULL::character varying,
    asaas_subscription_status character varying(255) DEFAULT NULL::character varying,
    aluguel_id integer,
    data_inicio_contrato date,
    data_fim_contrato date,
    indice_reajuste character varying(255) DEFAULT 'IGPM'::character varying,
    percentual_multa numeric(5,2) DEFAULT 2,
    percentual_juros_mora numeric(5,2) DEFAULT 1,
    score_inquilino integer,
    score_detalhes json,
    score_atualizado_em timestamp with time zone,
    proprietario_nome character varying(255),
    proprietario_telefone character varying(255),
    proprietario_pix character varying(255),
    taxa_administracao numeric(5,2) DEFAULT 10,
    tenant_id integer,
    corretor_percentual numeric(5,2) DEFAULT 0,
    corretor_nome character varying(255),
    corretor_pix character varying(255)
);

ALTER SEQUENCE public."ClienteAluguels_id_seq" OWNED BY public."ClienteAluguels".id;

ALTER TABLE ONLY public."ClienteAluguels" ALTER COLUMN id SET DEFAULT nextval('public."ClienteAluguels_id_seq"'::regclass);

ALTER TABLE ONLY public."ClienteAluguels"
    ADD CONSTRAINT "ClienteAluguels_pkey" PRIMARY KEY (id);

CREATE INDEX idx_clientealuguels_tenant_id ON public."ClienteAluguels" USING btree (tenant_id);

ALTER TABLE ONLY public."ClienteAluguels"
    ADD CONSTRAINT "ClienteAluguels_aluguel_id_fkey" FOREIGN KEY (aluguel_id) REFERENCES public.alugueis(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public."ClienteAluguels"
    ADD CONSTRAINT "ClienteAluguels_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON UPDATE CASCADE ON DELETE SET NULL;

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
