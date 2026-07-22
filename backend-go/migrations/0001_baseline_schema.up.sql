--
-- PostgreSQL database dump
--


-- Dumped from database version 18.4
-- Dumped by pg_dump version 18.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: enum_acessos_action_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_acessos_action_type AS ENUM (
    'login',
    'logout',
    'page_view',
    'api_call'
);


--
-- Name: enum_laudos_tipo_imovel; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_laudos_tipo_imovel AS ENUM (
    'casa',
    'apartamento'
);


--
-- Name: enum_notificacoes_tipo; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_notificacoes_tipo AS ENUM (
    'info',
    'alerta',
    'sucesso',
    'erro',
    'vencimento',
    'proposta',
    'visita',
    'pagamento'
);


--
-- Name: enum_pagamentos_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_pagamentos_status AS ENUM (
    'pendente',
    'aprovado',
    'rejeitado',
    'cancelado',
    'expirado',
    'aguardando'
);


--
-- Name: enum_pagamentos_tipo; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_pagamentos_tipo AS ENUM (
    'boleto',
    'pix',
    'cartao',
    'universal'
);


--
-- Name: enum_propostas_forma_pagamento; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_propostas_forma_pagamento AS ENUM (
    'financiamento',
    'a_vista',
    'fgts',
    'misto'
);


--
-- Name: enum_propostas_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_propostas_status AS ENUM (
    'pendente',
    'em_negociacao',
    'aceita',
    'recusada',
    'expirada',
    'cancelada'
);


--
-- Name: enum_simulacoes_sistema; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_simulacoes_sistema AS ENUM (
    'SAC',
    'PRICE'
);


--
-- Name: enum_subscriptions_ciclo; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_subscriptions_ciclo AS ENUM (
    'mensal',
    'anual'
);


--
-- Name: enum_subscriptions_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_subscriptions_status AS ENUM (
    'trialing',
    'active',
    'past_due',
    'canceled',
    'suspended'
);


--
-- Name: enum_visitas_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_visitas_status AS ENUM (
    'agendada',
    'realizada',
    'cancelada',
    'reagendada'
);


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: ClienteAluguels; Type: TABLE; Schema: public; Owner: -
--

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


--
-- Name: ClienteAluguels_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."ClienteAluguels_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ClienteAluguels_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."ClienteAluguels_id_seq" OWNED BY public."ClienteAluguels".id;


--
-- Name: Estados; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Estados" (
    id integer NOT NULL,
    nome character varying(255),
    sigla character varying(255),
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);


--
-- Name: Estados_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."Estados_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: Estados_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."Estados_id_seq" OWNED BY public."Estados".id;


--
-- Name: Lembretes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Lembretes" (
    id integer NOT NULL,
    titulo character varying(255) NOT NULL,
    descricao text,
    data timestamp with time zone NOT NULL,
    notificado boolean DEFAULT false,
    concluido boolean DEFAULT false,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    tenant_id integer
);


--
-- Name: Lembretes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."Lembretes_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: Lembretes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."Lembretes_id_seq" OWNED BY public."Lembretes".id;


--
-- Name: UserAccessLog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."UserAccessLog" (
    id integer NOT NULL,
    "userId" integer,
    "timestamp" timestamp with time zone NOT NULL,
    ip_address character varying(255),
    location character varying(255),
    action text,
    reference_page character varying(255),
    session_data text,
    referer_url character varying(255),
    http_method character varying(255),
    request_params text,
    request_body text,
    request_headers text,
    browser_info text,
    device_info text,
    os_info text,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);


--
-- Name: UserAccessLog_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."UserAccessLog_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: UserAccessLog_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."UserAccessLog_id_seq" OWNED BY public."UserAccessLog".id;


--
-- Name: acessos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.acessos (
    id integer NOT NULL,
    ip character varying(255) NOT NULL,
    referer character varying(255),
    "userAgent" character varying(255),
    "timestamp" timestamp with time zone,
    "userId" integer,
    user_agent character varying(255),
    user_id integer,
    device_type character varying(50),
    page character varying(255),
    geo_city character varying(100),
    geo_region character varying(100),
    geo_country character varying(10),
    geo_timezone character varying(50),
    geo_coordinates text,
    session_id character varying(255),
    action_type public.enum_acessos_action_type DEFAULT 'page_view'::public.enum_acessos_action_type NOT NULL,
    duration_seconds integer,
    browser_name character varying(255),
    browser_version character varying(255),
    os_name character varying(255),
    os_version character varying(255),
    tenant_id integer
);


--
-- Name: acessos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.acessos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: acessos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.acessos_id_seq OWNED BY public.acessos.id;


--
-- Name: alugueis; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.alugueis (
    id integer NOT NULL,
    nome_imovel character varying(255),
    descricao character varying(255),
    valor_aluguel double precision,
    quartos integer,
    banheiro integer,
    foto_capa character varying(255),
    alugado boolean DEFAULT false NOT NULL,
    foto_adicional text,
    dia_vencimento integer,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    tenant_id integer
);


--
-- Name: alugueis_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.alugueis_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: alugueis_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.alugueis_id_seq OWNED BY public.alugueis.id;


--
-- Name: chamado_manutencaos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chamado_manutencaos (
    id integer NOT NULL,
    cliente_aluguel_id integer NOT NULL,
    aluguel_id integer,
    titulo character varying(255) NOT NULL,
    descricao text NOT NULL,
    categoria character varying(255),
    prioridade character varying(255) DEFAULT 'media'::character varying,
    status character varying(255) DEFAULT 'aberto'::character varying,
    fotos json DEFAULT '[]'::json,
    resposta_admin text,
    data_resolucao timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    tenant_id integer
);


--
-- Name: chamado_manutencaos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.chamado_manutencaos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: chamado_manutencaos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.chamado_manutencaos_id_seq OWNED BY public.chamado_manutencaos.id;


--
-- Name: cliente_aluguels; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cliente_aluguels (
    id integer NOT NULL,
    nome character varying(255),
    cpf character varying(255),
    email character varying(255),
    telefone character varying(255),
    valor_aluguel character varying(255),
    dia_vencimento character varying(255),
    pago boolean,
    historico_pagamentos jsonb,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    cliente_id integer,
    data_nascimento date,
    cidade_nascimento character varying(255),
    tem_fiador boolean DEFAULT false NOT NULL,
    fiador_nome character varying(255),
    fiador_telefone character varying(255),
    fiador_email character varying(255),
    fiador_cpf character varying(255),
    fiador_data_nascimento date,
    fiador_cidade_nascimento character varying(255),
    documento_id_path character varying(255),
    contrato_path character varying(255),
    fiador_documento_id_path character varying(255),
    proprietario_id integer,
    contrato_documentos jsonb DEFAULT '[]'::jsonb,
    asaas_customer_id character varying(255),
    asaas_subscription_id character varying(255),
    asaas_subscription_status character varying(255),
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
    corretor_percentual numeric(5,2) DEFAULT 0,
    corretor_nome character varying(255),
    corretor_pix character varying(255),
    tenant_id integer
);


--
-- Name: cliente_aluguels_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cliente_aluguels_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cliente_aluguels_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cliente_aluguels_id_seq OWNED BY public.cliente_aluguels.id;


--
-- Name: clientes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clientes (
    id integer NOT NULL,
    nome character varying(255),
    email character varying(255),
    telefone character varying(255),
    cpf character varying(255),
    valor_renda character varying(255),
    estado_civil character varying(255),
    naturalidade character varying(255),
    profissao character varying(255),
    data_admissao character varying(10),
    data_nascimento character varying(10),
    renda_tipo character varying(255),
    possui_carteira_mais_tres_anos boolean,
    numero_pis character varying(255),
    possui_dependente boolean,
    documentos_pessoais character varying(255),
    extrato_bancario character varying(255),
    documentos_dependente character varying(255),
    documentos_conjuge character varying(255),
    status character varying(255) DEFAULT 'aguardando_aprovação'::character varying NOT NULL,
    opcoes_processo json,
    user_id integer,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    possui_fiador boolean DEFAULT false NOT NULL,
    fiador_nome character varying(255),
    fiador_cpf character varying(255),
    fiador_telefone character varying(255),
    fiador_email character varying(255),
    fiador_documentos text,
    possui_formularios_caixa boolean DEFAULT false NOT NULL,
    formularios_caixa text,
    tela_aprovacao text,
    conjuge_nome character varying(255),
    conjuge_email character varying(255),
    conjuge_telefone character varying(255),
    conjuge_cpf character varying(255),
    conjuge_profissao character varying(255),
    conjuge_data_nascimento character varying(10),
    conjuge_valor_renda character varying(255),
    conjuge_renda_tipo character varying(255),
    conjuge_data_admissao character varying(10),
    tenant_id integer
);


--
-- Name: clientes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.clientes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: clientes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.clientes_id_seq OWNED BY public.clientes.id;


--
-- Name: cobranca_aluguels; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cobranca_aluguels (
    id integer NOT NULL,
    cliente_aluguel_id integer NOT NULL,
    asaas_payment_id character varying(255),
    valor numeric(10,2) NOT NULL,
    data_vencimento date NOT NULL,
    data_pagamento date,
    status character varying(255) DEFAULT 'PENDING'::character varying NOT NULL,
    billing_type character varying(255) DEFAULT 'UNDEFINED'::character varying,
    invoice_url character varying(255),
    bank_slip_url character varying(255),
    pix_qr_code text,
    tipo character varying(255) DEFAULT 'recorrente'::character varying NOT NULL,
    descricao character varying(255),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    recibo_url character varying(255),
    tenant_id integer
);


--
-- Name: cobranca_aluguels_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cobranca_aluguels_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cobranca_aluguels_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cobranca_aluguels_id_seq OWNED BY public.cobranca_aluguels.id;


--
-- Name: comissoes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.comissoes (
    id integer NOT NULL,
    valor numeric(12,2) NOT NULL,
    percentual numeric(5,2) NOT NULL,
    data date NOT NULL,
    "contratoId" integer NOT NULL,
    "corretorId" integer NOT NULL,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    tenant_id integer
);


--
-- Name: comissoes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.comissoes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: comissoes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.comissoes_id_seq OWNED BY public.comissoes.id;


--
-- Name: despesas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.despesas (
    id integer NOT NULL,
    tipo character varying(255) NOT NULL,
    valor numeric(12,2) NOT NULL,
    descricao character varying(255),
    data date NOT NULL,
    "contratoId" integer,
    "corretorId" integer,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    tenant_id integer
);


--
-- Name: despesas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.despesas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: despesas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.despesas_id_seq OWNED BY public.despesas.id;


--
-- Name: estados; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.estados (
    id integer NOT NULL,
    nome character varying(255),
    sigla character varying(255),
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: estados_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.estados_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: estados_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.estados_id_seq OWNED BY public.estados.id;


--
-- Name: fluxo_caixa; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fluxo_caixa (
    id integer NOT NULL,
    data date NOT NULL,
    tipo character varying(255) NOT NULL,
    valor numeric(12,2) NOT NULL,
    descricao character varying(255),
    "referenciaId" integer,
    "referenciaTipo" character varying(255),
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    tenant_id integer
);


--
-- Name: fluxo_caixa_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.fluxo_caixa_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: fluxo_caixa_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.fluxo_caixa_id_seq OWNED BY public.fluxo_caixa.id;


--
-- Name: imoveis; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.imoveis (
    id integer NOT NULL,
    nome_imovel character varying(255) NOT NULL,
    descricao_imovel text,
    endereco character varying(255) NOT NULL,
    tipo character varying(255) NOT NULL,
    quartos integer NOT NULL,
    banheiro integer NOT NULL,
    tags character varying(255),
    valor_avaliacao double precision,
    valor_venda double precision NOT NULL,
    documentacao character varying(255),
    imagens json,
    imagem_capa character varying(255),
    localizacao character varying(255),
    exclusivo boolean NOT NULL,
    tem_inquilino boolean NOT NULL,
    situacao_imovel character varying(255) NOT NULL,
    observacoes text,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    tenant_id integer
);


--
-- Name: imoveis_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.imoveis_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: imoveis_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.imoveis_id_seq OWNED BY public.imoveis.id;


--
-- Name: laudos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.laudos (
    id integer NOT NULL,
    parceiro character varying(255) NOT NULL,
    tipo_imovel public.enum_laudos_tipo_imovel NOT NULL,
    valor_solicitado numeric(15,2) NOT NULL,
    valor_liberado numeric(15,2),
    vencimento timestamp with time zone NOT NULL,
    endereco text NOT NULL,
    observacoes text,
    arquivos jsonb,
    user_id integer NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    tenant_id integer
);


--
-- Name: laudos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.laudos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: laudos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.laudos_id_seq OWNED BY public.laudos.id;


--
-- Name: municipios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.municipios (
    id integer NOT NULL,
    nome character varying(255) NOT NULL,
    estado_id integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: municipios_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.municipios_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: municipios_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.municipios_id_seq OWNED BY public.municipios.id;


--
-- Name: notas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notas (
    id integer NOT NULL,
    cliente_id integer NOT NULL,
    "processoId" integer,
    nova boolean,
    destinatario character varying(255),
    texto text,
    conteudo text,
    data_criacao timestamp with time zone,
    criado_por_id integer,
    "createdAt" timestamp with time zone,
    "updatedAt" timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    processo_id integer,
    tenant_id integer
);


--
-- Name: notas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.notas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: notas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.notas_id_seq OWNED BY public.notas.id;


--
-- Name: notificacoes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notificacoes (
    id integer NOT NULL,
    user_id integer NOT NULL,
    tenant_id integer,
    tipo public.enum_notificacoes_tipo DEFAULT 'info'::public.enum_notificacoes_tipo,
    titulo character varying(255) NOT NULL,
    mensagem text,
    lida boolean DEFAULT false,
    link character varying(255),
    dados jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: notificacoes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.notificacoes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: notificacoes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.notificacoes_id_seq OWNED BY public.notificacoes.id;


--
-- Name: pagamentos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pagamentos (
    id integer NOT NULL,
    cliente_id integer NOT NULL,
    created_by integer NOT NULL,
    mp_preference_id character varying(255),
    mp_payment_id character varying(255),
    tipo public.enum_pagamentos_tipo DEFAULT 'boleto'::public.enum_pagamentos_tipo NOT NULL,
    status public.enum_pagamentos_status DEFAULT 'pendente'::public.enum_pagamentos_status NOT NULL,
    titulo character varying(255) NOT NULL,
    descricao text,
    valor character varying(255) NOT NULL,
    valor_numerico numeric(10,2) NOT NULL,
    data_vencimento timestamp with time zone,
    data_pagamento timestamp with time zone,
    link_pagamento text,
    codigo_barras character varying(255),
    linha_digitavel character varying(255),
    qr_code text,
    qr_code_base64 text,
    observacoes text,
    dados_mp json,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    parcelas integer DEFAULT 1 NOT NULL,
    valor_parcela character varying(255),
    valor_parcela_numerico numeric(10,2),
    whatsapp_enviado boolean DEFAULT false,
    email_enviado boolean DEFAULT false,
    data_envio_whatsapp timestamp with time zone,
    data_envio_email timestamp with time zone,
    link_curto character varying(255),
    comprovante_url text,
    valor_original character varying(255),
    valor_original_numerico numeric(10,2),
    juros_total character varying(255),
    juros_total_numerico numeric(10,2),
    taxa_juros numeric(5,2),
    calculo_mp boolean DEFAULT false,
    parcela_atual integer DEFAULT 1 NOT NULL,
    pagamento_pai_id integer,
    is_parcelado boolean DEFAULT false NOT NULL,
    data_envio_proxima_parcela timestamp with time zone,
    juros_mp numeric(10,2),
    valor_com_juros numeric(10,2),
    link_unico character varying(255),
    tenant_id integer
);


--
-- Name: pagamentos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pagamentos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pagamentos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pagamentos_id_seq OWNED BY public.pagamentos.id;


--
-- Name: plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.plans (
    id integer NOT NULL,
    nome character varying(255) NOT NULL,
    slug character varying(255) NOT NULL,
    descricao text,
    preco_mensal numeric(10,2) DEFAULT 0 NOT NULL,
    preco_anual numeric(10,2) DEFAULT 0 NOT NULL,
    max_clientes integer DEFAULT 50,
    max_usuarios integer DEFAULT 2,
    max_imoveis integer DEFAULT 20,
    max_alugueis integer DEFAULT 10,
    has_whatsapp boolean DEFAULT false,
    has_pagamentos boolean DEFAULT false,
    has_ai_analysis boolean DEFAULT false,
    has_relatorios_avancados boolean DEFAULT false,
    has_multi_usuarios boolean DEFAULT false,
    has_api_access boolean DEFAULT false,
    has_suporte_prioritario boolean DEFAULT false,
    has_dominio_customizado boolean DEFAULT false,
    features_extras jsonb DEFAULT '{}'::jsonb,
    ativo boolean DEFAULT true,
    ordem integer DEFAULT 0,
    trial_dias integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    max_storage_mb integer DEFAULT 500,
    max_file_size_mb integer DEFAULT 10
);


--
-- Name: plans_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.plans_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: plans_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.plans_id_seq OWNED BY public.plans.id;


--
-- Name: propostas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.propostas (
    id integer NOT NULL,
    cliente_id integer NOT NULL,
    imovel_id integer NOT NULL,
    corretor_id integer,
    tenant_id integer,
    valor_ofertado numeric(12,2) NOT NULL,
    valor_contra_proposta numeric(12,2),
    valor_aceito numeric(12,2),
    forma_pagamento public.enum_propostas_forma_pagamento DEFAULT 'financiamento'::public.enum_propostas_forma_pagamento,
    status public.enum_propostas_status DEFAULT 'pendente'::public.enum_propostas_status,
    data_validade timestamp with time zone,
    condicoes text,
    motivo_recusa text,
    observacoes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: propostas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.propostas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: propostas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.propostas_id_seq OWNED BY public.propostas.id;


--
-- Name: proprietario; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.proprietario (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    address character varying(255),
    phone character varying(255),
    "createdAt" timestamp with time zone,
    "updatedAt" timestamp with time zone,
    tenant_id integer
);


--
-- Name: proprietario_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.proprietario_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: proprietario_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.proprietario_id_seq OWNED BY public.proprietario.id;


--
-- Name: receitas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.receitas (
    id integer NOT NULL,
    tipo character varying(255) NOT NULL,
    valor numeric(12,2) NOT NULL,
    descricao character varying(255),
    data date NOT NULL,
    "contratoId" integer,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    tenant_id integer
);


--
-- Name: receitas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.receitas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: receitas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.receitas_id_seq OWNED BY public.receitas.id;


--
-- Name: regua_cobrancas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.regua_cobrancas (
    id integer NOT NULL,
    cliente_aluguel_id integer NOT NULL,
    cobranca_aluguel_id integer,
    etapa character varying(255) NOT NULL,
    dias_referencia integer NOT NULL,
    mensagem_enviada boolean DEFAULT false,
    data_envio timestamp with time zone,
    data_referencia date NOT NULL,
    mes_referencia character varying(255),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    tenant_id integer
);


--
-- Name: regua_cobrancas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.regua_cobrancas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: regua_cobrancas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.regua_cobrancas_id_seq OWNED BY public.regua_cobrancas.id;


--
-- Name: repasse_proprietarios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.repasse_proprietarios (
    id integer NOT NULL,
    cliente_aluguel_id integer NOT NULL,
    cobranca_aluguel_id integer,
    valor_aluguel numeric(10,2) NOT NULL,
    taxa_administracao_percentual numeric(5,2) NOT NULL,
    valor_taxa numeric(10,2) NOT NULL,
    valor_repasse numeric(10,2) NOT NULL,
    mes_referencia character varying(255) NOT NULL,
    status character varying(255) DEFAULT 'PENDENTE'::character varying,
    data_repasse date,
    observacao character varying(255),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    tenant_id integer,
    asaas_transfer_id character varying(255),
    transfer_status character varying(255) DEFAULT 'PENDENTE'::character varying,
    transfer_error text,
    comissao_corretor numeric(10,2) DEFAULT 0,
    corretor_percentual numeric(5,2) DEFAULT 0
);


--
-- Name: repasse_proprietarios_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.repasse_proprietarios_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: repasse_proprietarios_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.repasse_proprietarios_id_seq OWNED BY public.repasse_proprietarios.id;


--
-- Name: simulacoes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.simulacoes (
    id integer NOT NULL,
    cliente_id integer,
    user_id integer NOT NULL,
    tenant_id integer,
    valor_imovel numeric(12,2) NOT NULL,
    valor_entrada numeric(12,2) NOT NULL,
    valor_financiado numeric(12,2) NOT NULL,
    prazo_meses integer NOT NULL,
    taxa_juros_anual numeric(5,2) NOT NULL,
    sistema public.enum_simulacoes_sistema DEFAULT 'SAC'::public.enum_simulacoes_sistema NOT NULL,
    primeira_parcela numeric(12,2),
    ultima_parcela numeric(12,2),
    total_pago numeric(14,2),
    total_juros numeric(14,2),
    renda_minima numeric(12,2),
    observacoes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: simulacoes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.simulacoes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: simulacoes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.simulacoes_id_seq OWNED BY public.simulacoes.id;


--
-- Name: subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscriptions (
    id integer NOT NULL,
    tenant_id integer NOT NULL,
    plan_id integer NOT NULL,
    status public.enum_subscriptions_status DEFAULT 'trialing'::public.enum_subscriptions_status NOT NULL,
    ciclo public.enum_subscriptions_ciclo DEFAULT 'mensal'::public.enum_subscriptions_ciclo NOT NULL,
    data_inicio timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    data_fim timestamp with time zone,
    data_fim_trial timestamp with time zone,
    valor numeric(10,2),
    gateway_subscription_id character varying(255),
    gateway_customer_id character varying(255),
    gateway character varying(255),
    proximo_pagamento timestamp with time zone,
    tentativas_cobranca integer DEFAULT 0,
    cancelado_em timestamp with time zone,
    motivo_cancelamento text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: subscriptions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.subscriptions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: subscriptions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.subscriptions_id_seq OWNED BY public.subscriptions.id;


--
-- Name: system_configs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_configs (
    id integer NOT NULL,
    nome_sistema character varying(255) DEFAULT 'Parnassá CRM'::character varying NOT NULL,
    cor_primaria character varying(255) DEFAULT '#003366'::character varying NOT NULL,
    cor_secundaria character varying(255) DEFAULT '#ff7b00'::character varying NOT NULL,
    cor_texto character varying(255) DEFAULT '#ffffff'::character varying NOT NULL,
    logo_url character varying(255),
    tema_escuro boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    tenant_id integer
);


--
-- Name: system_configs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.system_configs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: system_configs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.system_configs_id_seq OWNED BY public.system_configs.id;


--
-- Name: tenants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tenants (
    id integer NOT NULL,
    nome character varying(255) NOT NULL,
    slug character varying(255) NOT NULL,
    cnpj character varying(18),
    email character varying(255) NOT NULL,
    telefone character varying(255),
    logo character varying(255),
    ativo boolean DEFAULT true,
    configuracoes jsonb DEFAULT '{}'::jsonb,
    dominio_customizado character varying(255),
    endereco character varying(255),
    cidade character varying(255),
    estado character varying(2),
    cep character varying(10),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    use_custom_modules boolean DEFAULT false,
    max_clientes integer,
    max_usuarios integer,
    max_imoveis integer,
    max_alugueis integer,
    has_whatsapp boolean,
    has_pagamentos boolean,
    has_ai_analysis boolean,
    has_relatorios_avancados boolean,
    has_multi_usuarios boolean,
    has_api_access boolean,
    has_suporte_prioritario boolean,
    has_dominio_customizado boolean,
    max_storage_mb integer,
    max_file_size_mb integer,
    storage_used_bytes bigint DEFAULT 0,
    asaas_api_key text,
    asaas_webhook_token character varying(255)
);


--
-- Name: tenants_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tenants_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tenants_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tenants_id_seq OWNED BY public.tenants.id;


--
-- Name: tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tokens (
    id integer NOT NULL,
    token text NOT NULL,
    refresh_token text,
    user_id integer,
    user_type character varying(255),
    expires_at timestamp with time zone NOT NULL,
    email character varying(255),
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    tenant_id integer
);


--
-- Name: tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tokens_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tokens_id_seq OWNED BY public.tokens.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username character varying(255),
    first_name character varying(255),
    last_name character varying(255),
    email character varying(255) NOT NULL,
    telefone character varying(255),
    password character varying(255) NOT NULL,
    creci character varying(255),
    address character varying(255),
    pix_account character varying(255),
    photo character varying(255),
    is_corretor boolean DEFAULT false NOT NULL,
    is_administrador boolean DEFAULT false NOT NULL,
    is_correspondente boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    tenant_id integer,
    is_super_admin boolean DEFAULT false
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: visitas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.visitas (
    id integer NOT NULL,
    cliente_id integer NOT NULL,
    imovel_id integer NOT NULL,
    corretor_id integer,
    criado_por_id integer NOT NULL,
    tenant_id integer,
    data_visita timestamp with time zone NOT NULL,
    status public.enum_visitas_status DEFAULT 'agendada'::public.enum_visitas_status,
    observacoes text,
    feedback_cliente text,
    nota_avaliacao integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: visitas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.visitas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: visitas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.visitas_id_seq OWNED BY public.visitas.id;


--
-- Name: vistoria_aluguels; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vistoria_aluguels (
    id integer NOT NULL,
    cliente_aluguel_id integer NOT NULL,
    aluguel_id integer,
    tipo character varying(255) DEFAULT 'entrada'::character varying NOT NULL,
    data_vistoria date NOT NULL,
    observacoes_gerais text,
    checklist json DEFAULT '[]'::json,
    fotos json DEFAULT '[]'::json,
    pdf_url character varying(255),
    status character varying(255) DEFAULT 'rascunho'::character varying,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    tenant_id integer
);


--
-- Name: vistoria_aluguels_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.vistoria_aluguels_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: vistoria_aluguels_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.vistoria_aluguels_id_seq OWNED BY public.vistoria_aluguels.id;


--
-- Name: whatsapp_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.whatsapp_sessions (
    id character varying(255) NOT NULL,
    data jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now() CONSTRAINT "whatsapp_sessions_updatedAt_not_null" NOT NULL,
    tenant_id integer,
    status character varying(20) DEFAULT 'inactive'::character varying NOT NULL,
    phone_number character varying(255),
    last_activity timestamp with time zone,
    is_authenticated boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: whatsapps; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.whatsapps (
    id integer NOT NULL,
    message character varying(255) NOT NULL,
    sender character varying(255) NOT NULL,
    receiver character varying(255) NOT NULL,
    authenticated boolean DEFAULT false,
    "timestamp" timestamp with time zone,
    created_at timestamp with time zone CONSTRAINT "whatsapps_createdAt_not_null" NOT NULL,
    updated_at timestamp with time zone CONSTRAINT "whatsapps_updatedAt_not_null" NOT NULL,
    tenant_id integer
);


--
-- Name: whatsapps_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.whatsapps_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: whatsapps_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.whatsapps_id_seq OWNED BY public.whatsapps.id;


--
-- Name: ClienteAluguels id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ClienteAluguels" ALTER COLUMN id SET DEFAULT nextval('public."ClienteAluguels_id_seq"'::regclass);


--
-- Name: Estados id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Estados" ALTER COLUMN id SET DEFAULT nextval('public."Estados_id_seq"'::regclass);


--
-- Name: Lembretes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Lembretes" ALTER COLUMN id SET DEFAULT nextval('public."Lembretes_id_seq"'::regclass);


--
-- Name: UserAccessLog id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UserAccessLog" ALTER COLUMN id SET DEFAULT nextval('public."UserAccessLog_id_seq"'::regclass);


--
-- Name: acessos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.acessos ALTER COLUMN id SET DEFAULT nextval('public.acessos_id_seq'::regclass);


--
-- Name: alugueis id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alugueis ALTER COLUMN id SET DEFAULT nextval('public.alugueis_id_seq'::regclass);


--
-- Name: chamado_manutencaos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chamado_manutencaos ALTER COLUMN id SET DEFAULT nextval('public.chamado_manutencaos_id_seq'::regclass);


--
-- Name: cliente_aluguels id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cliente_aluguels ALTER COLUMN id SET DEFAULT nextval('public.cliente_aluguels_id_seq'::regclass);


--
-- Name: clientes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clientes ALTER COLUMN id SET DEFAULT nextval('public.clientes_id_seq'::regclass);


--
-- Name: cobranca_aluguels id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cobranca_aluguels ALTER COLUMN id SET DEFAULT nextval('public.cobranca_aluguels_id_seq'::regclass);


--
-- Name: comissoes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comissoes ALTER COLUMN id SET DEFAULT nextval('public.comissoes_id_seq'::regclass);


--
-- Name: despesas id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.despesas ALTER COLUMN id SET DEFAULT nextval('public.despesas_id_seq'::regclass);


--
-- Name: estados id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estados ALTER COLUMN id SET DEFAULT nextval('public.estados_id_seq'::regclass);


--
-- Name: fluxo_caixa id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fluxo_caixa ALTER COLUMN id SET DEFAULT nextval('public.fluxo_caixa_id_seq'::regclass);


--
-- Name: imoveis id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.imoveis ALTER COLUMN id SET DEFAULT nextval('public.imoveis_id_seq'::regclass);


--
-- Name: laudos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.laudos ALTER COLUMN id SET DEFAULT nextval('public.laudos_id_seq'::regclass);


--
-- Name: municipios id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.municipios ALTER COLUMN id SET DEFAULT nextval('public.municipios_id_seq'::regclass);


--
-- Name: notas id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notas ALTER COLUMN id SET DEFAULT nextval('public.notas_id_seq'::regclass);


--
-- Name: notificacoes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notificacoes ALTER COLUMN id SET DEFAULT nextval('public.notificacoes_id_seq'::regclass);


--
-- Name: pagamentos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pagamentos ALTER COLUMN id SET DEFAULT nextval('public.pagamentos_id_seq'::regclass);


--
-- Name: plans id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plans ALTER COLUMN id SET DEFAULT nextval('public.plans_id_seq'::regclass);


--
-- Name: propostas id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.propostas ALTER COLUMN id SET DEFAULT nextval('public.propostas_id_seq'::regclass);


--
-- Name: proprietario id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proprietario ALTER COLUMN id SET DEFAULT nextval('public.proprietario_id_seq'::regclass);


--
-- Name: receitas id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.receitas ALTER COLUMN id SET DEFAULT nextval('public.receitas_id_seq'::regclass);


--
-- Name: regua_cobrancas id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.regua_cobrancas ALTER COLUMN id SET DEFAULT nextval('public.regua_cobrancas_id_seq'::regclass);


--
-- Name: repasse_proprietarios id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.repasse_proprietarios ALTER COLUMN id SET DEFAULT nextval('public.repasse_proprietarios_id_seq'::regclass);


--
-- Name: simulacoes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.simulacoes ALTER COLUMN id SET DEFAULT nextval('public.simulacoes_id_seq'::regclass);


--
-- Name: subscriptions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions ALTER COLUMN id SET DEFAULT nextval('public.subscriptions_id_seq'::regclass);


--
-- Name: system_configs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_configs ALTER COLUMN id SET DEFAULT nextval('public.system_configs_id_seq'::regclass);


--
-- Name: tenants id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenants ALTER COLUMN id SET DEFAULT nextval('public.tenants_id_seq'::regclass);


--
-- Name: tokens id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tokens ALTER COLUMN id SET DEFAULT nextval('public.tokens_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: visitas id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visitas ALTER COLUMN id SET DEFAULT nextval('public.visitas_id_seq'::regclass);


--
-- Name: vistoria_aluguels id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vistoria_aluguels ALTER COLUMN id SET DEFAULT nextval('public.vistoria_aluguels_id_seq'::regclass);


--
-- Name: whatsapps id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapps ALTER COLUMN id SET DEFAULT nextval('public.whatsapps_id_seq'::regclass);


--
-- Name: ClienteAluguels ClienteAluguels_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ClienteAluguels"
    ADD CONSTRAINT "ClienteAluguels_pkey" PRIMARY KEY (id);


--
-- Name: Estados Estados_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Estados"
    ADD CONSTRAINT "Estados_pkey" PRIMARY KEY (id);


--
-- Name: Lembretes Lembretes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Lembretes"
    ADD CONSTRAINT "Lembretes_pkey" PRIMARY KEY (id);


--
-- Name: UserAccessLog UserAccessLog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UserAccessLog"
    ADD CONSTRAINT "UserAccessLog_pkey" PRIMARY KEY (id);


--
-- Name: acessos acessos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.acessos
    ADD CONSTRAINT acessos_pkey PRIMARY KEY (id);


--
-- Name: alugueis alugueis_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alugueis
    ADD CONSTRAINT alugueis_pkey PRIMARY KEY (id);


--
-- Name: chamado_manutencaos chamado_manutencaos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chamado_manutencaos
    ADD CONSTRAINT chamado_manutencaos_pkey PRIMARY KEY (id);


--
-- Name: cliente_aluguels cliente_aluguels_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cliente_aluguels
    ADD CONSTRAINT cliente_aluguels_pkey PRIMARY KEY (id);


--
-- Name: clientes clientes_cpf_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clientes
    ADD CONSTRAINT clientes_cpf_key UNIQUE (cpf);


--
-- Name: clientes clientes_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clientes
    ADD CONSTRAINT clientes_email_key UNIQUE (email);


--
-- Name: clientes clientes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clientes
    ADD CONSTRAINT clientes_pkey PRIMARY KEY (id);


--
-- Name: cobranca_aluguels cobranca_aluguels_asaas_payment_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cobranca_aluguels
    ADD CONSTRAINT cobranca_aluguels_asaas_payment_id_key UNIQUE (asaas_payment_id);


--
-- Name: cobranca_aluguels cobranca_aluguels_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cobranca_aluguels
    ADD CONSTRAINT cobranca_aluguels_pkey PRIMARY KEY (id);


--
-- Name: comissoes comissoes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comissoes
    ADD CONSTRAINT comissoes_pkey PRIMARY KEY (id);


--
-- Name: despesas despesas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.despesas
    ADD CONSTRAINT despesas_pkey PRIMARY KEY (id);


--
-- Name: estados estados_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estados
    ADD CONSTRAINT estados_pkey PRIMARY KEY (id);


--
-- Name: fluxo_caixa fluxo_caixa_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fluxo_caixa
    ADD CONSTRAINT fluxo_caixa_pkey PRIMARY KEY (id);


--
-- Name: imoveis imoveis_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.imoveis
    ADD CONSTRAINT imoveis_pkey PRIMARY KEY (id);


--
-- Name: laudos laudos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.laudos
    ADD CONSTRAINT laudos_pkey PRIMARY KEY (id);


--
-- Name: municipios municipios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.municipios
    ADD CONSTRAINT municipios_pkey PRIMARY KEY (id);


--
-- Name: notas notas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notas
    ADD CONSTRAINT notas_pkey PRIMARY KEY (id);


--
-- Name: notificacoes notificacoes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notificacoes
    ADD CONSTRAINT notificacoes_pkey PRIMARY KEY (id);


--
-- Name: pagamentos pagamentos_link_unico_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pagamentos
    ADD CONSTRAINT pagamentos_link_unico_key UNIQUE (link_unico);


--
-- Name: pagamentos pagamentos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pagamentos
    ADD CONSTRAINT pagamentos_pkey PRIMARY KEY (id);


--
-- Name: plans plans_nome_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plans
    ADD CONSTRAINT plans_nome_key UNIQUE (nome);


--
-- Name: plans plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plans
    ADD CONSTRAINT plans_pkey PRIMARY KEY (id);


--
-- Name: plans plans_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plans
    ADD CONSTRAINT plans_slug_key UNIQUE (slug);


--
-- Name: propostas propostas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.propostas
    ADD CONSTRAINT propostas_pkey PRIMARY KEY (id);


--
-- Name: proprietario proprietario_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proprietario
    ADD CONSTRAINT proprietario_pkey PRIMARY KEY (id);


--
-- Name: receitas receitas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.receitas
    ADD CONSTRAINT receitas_pkey PRIMARY KEY (id);


--
-- Name: regua_cobrancas regua_cobrancas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.regua_cobrancas
    ADD CONSTRAINT regua_cobrancas_pkey PRIMARY KEY (id);


--
-- Name: repasse_proprietarios repasse_proprietarios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.repasse_proprietarios
    ADD CONSTRAINT repasse_proprietarios_pkey PRIMARY KEY (id);


--
-- Name: simulacoes simulacoes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.simulacoes
    ADD CONSTRAINT simulacoes_pkey PRIMARY KEY (id);


--
-- Name: subscriptions subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (id);


--
-- Name: system_configs system_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_configs
    ADD CONSTRAINT system_configs_pkey PRIMARY KEY (id);


--
-- Name: tenants tenants_cnpj_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_cnpj_key UNIQUE (cnpj);


--
-- Name: tenants tenants_dominio_customizado_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_dominio_customizado_key UNIQUE (dominio_customizado);


--
-- Name: tenants tenants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_pkey PRIMARY KEY (id);


--
-- Name: tenants tenants_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_slug_key UNIQUE (slug);


--
-- Name: tokens tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tokens
    ADD CONSTRAINT tokens_pkey PRIMARY KEY (id);


--
-- Name: tokens tokens_refresh_token_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tokens
    ADD CONSTRAINT tokens_refresh_token_unique UNIQUE (refresh_token);


--
-- Name: tokens tokens_token_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tokens
    ADD CONSTRAINT tokens_token_unique UNIQUE (token);


--
-- Name: tokens unique_user_id_user_type; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tokens
    ADD CONSTRAINT unique_user_id_user_type UNIQUE (user_id, user_type);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_unique UNIQUE (username);


--
-- Name: visitas visitas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visitas
    ADD CONSTRAINT visitas_pkey PRIMARY KEY (id);


--
-- Name: vistoria_aluguels vistoria_aluguels_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vistoria_aluguels
    ADD CONSTRAINT vistoria_aluguels_pkey PRIMARY KEY (id);


--
-- Name: whatsapp_sessions whatsapp_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_sessions
    ADD CONSTRAINT whatsapp_sessions_pkey PRIMARY KEY (id);


--
-- Name: whatsapps whatsapps_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapps
    ADD CONSTRAINT whatsapps_pkey PRIMARY KEY (id);


--
-- Name: idx_acessos_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_acessos_tenant_id ON public.acessos USING btree (tenant_id);


--
-- Name: idx_acessos_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_acessos_user_id ON public.acessos USING btree (user_id);


--
-- Name: idx_alugueis_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_alugueis_tenant_id ON public.alugueis USING btree (tenant_id);


--
-- Name: idx_chamado_manutencaos_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chamado_manutencaos_tenant_id ON public.chamado_manutencaos USING btree (tenant_id);


--
-- Name: idx_clientealuguels_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clientealuguels_tenant_id ON public."ClienteAluguels" USING btree (tenant_id);


--
-- Name: idx_clientes_cpf; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clientes_cpf ON public.clientes USING btree (cpf);


--
-- Name: idx_clientes_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clientes_created_at ON public.clientes USING btree (created_at);


--
-- Name: idx_clientes_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clientes_email ON public.clientes USING btree (email);


--
-- Name: idx_clientes_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clientes_status ON public.clientes USING btree (status);


--
-- Name: idx_clientes_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clientes_tenant_id ON public.clientes USING btree (tenant_id);


--
-- Name: idx_clientes_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clientes_user_id ON public.clientes USING btree (user_id);


--
-- Name: idx_cobranca_aluguels_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cobranca_aluguels_tenant_id ON public.cobranca_aluguels USING btree (tenant_id);


--
-- Name: idx_comissoes_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_comissoes_tenant_id ON public.comissoes USING btree (tenant_id);


--
-- Name: idx_despesas_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_despesas_tenant_id ON public.despesas USING btree (tenant_id);


--
-- Name: idx_fluxo_caixa_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fluxo_caixa_tenant_id ON public.fluxo_caixa USING btree (tenant_id);


--
-- Name: idx_imoveis_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_imoveis_created_at ON public.imoveis USING btree (created_at);


--
-- Name: idx_imoveis_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_imoveis_tenant_id ON public.imoveis USING btree (tenant_id);


--
-- Name: idx_laudos_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_laudos_tenant_id ON public.laudos USING btree (tenant_id);


--
-- Name: idx_lembretes_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lembretes_tenant_id ON public."Lembretes" USING btree (tenant_id);


--
-- Name: idx_notas_cliente_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notas_cliente_id ON public.notas USING btree (cliente_id);


--
-- Name: idx_notas_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notas_tenant_id ON public.notas USING btree (tenant_id);


--
-- Name: idx_pagamentos_cliente_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pagamentos_cliente_id ON public.pagamentos USING btree (cliente_id);


--
-- Name: idx_pagamentos_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pagamentos_created_at ON public.pagamentos USING btree (created_at);


--
-- Name: idx_pagamentos_data_envio_proxima_parcela; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pagamentos_data_envio_proxima_parcela ON public.pagamentos USING btree (data_envio_proxima_parcela);


--
-- Name: idx_pagamentos_is_parcelado; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pagamentos_is_parcelado ON public.pagamentos USING btree (is_parcelado);


--
-- Name: idx_pagamentos_link_unico; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_pagamentos_link_unico ON public.pagamentos USING btree (link_unico);


--
-- Name: idx_pagamentos_pagamento_pai_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pagamentos_pagamento_pai_id ON public.pagamentos USING btree (pagamento_pai_id);


--
-- Name: idx_pagamentos_parcela_atual; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pagamentos_parcela_atual ON public.pagamentos USING btree (parcela_atual);


--
-- Name: idx_pagamentos_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pagamentos_status ON public.pagamentos USING btree (status);


--
-- Name: idx_pagamentos_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pagamentos_tenant_id ON public.pagamentos USING btree (tenant_id);


--
-- Name: idx_proprietario_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_proprietario_tenant_id ON public.proprietario USING btree (tenant_id);


--
-- Name: idx_receitas_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_receitas_tenant_id ON public.receitas USING btree (tenant_id);


--
-- Name: idx_regua_cobrancas_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_regua_cobrancas_tenant_id ON public.regua_cobrancas USING btree (tenant_id);


--
-- Name: idx_repasse_proprietarios_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_repasse_proprietarios_tenant_id ON public.repasse_proprietarios USING btree (tenant_id);


--
-- Name: idx_subscriptions_plan_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subscriptions_plan_id ON public.subscriptions USING btree (plan_id);


--
-- Name: idx_subscriptions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subscriptions_status ON public.subscriptions USING btree (status);


--
-- Name: idx_subscriptions_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subscriptions_tenant_id ON public.subscriptions USING btree (tenant_id);


--
-- Name: idx_system_configs_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_configs_tenant_id ON public.system_configs USING btree (tenant_id);


--
-- Name: idx_tokens_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tokens_expires_at ON public.tokens USING btree (expires_at);


--
-- Name: idx_tokens_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tokens_tenant_id ON public.tokens USING btree (tenant_id);


--
-- Name: idx_tokens_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tokens_user_id ON public.tokens USING btree (user_id);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: idx_users_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_tenant_id ON public.users USING btree (tenant_id);


--
-- Name: idx_vistoria_aluguels_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vistoria_aluguels_tenant_id ON public.vistoria_aluguels USING btree (tenant_id);


--
-- Name: idx_whatsapp_sessions_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_whatsapp_sessions_tenant_id ON public.whatsapp_sessions USING btree (tenant_id);


--
-- Name: idx_whatsapps_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_whatsapps_tenant_id ON public.whatsapps USING btree (tenant_id);


--
-- Name: laudos_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX laudos_created_at ON public.laudos USING btree (created_at);


--
-- Name: laudos_parceiro; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX laudos_parceiro ON public.laudos USING btree (parceiro);


--
-- Name: laudos_tipo_imovel; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX laudos_tipo_imovel ON public.laudos USING btree (tipo_imovel);


--
-- Name: laudos_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX laudos_user_id ON public.laudos USING btree (user_id);


--
-- Name: laudos_vencimento; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX laudos_vencimento ON public.laudos USING btree (vencimento);


--
-- Name: notificacoes_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notificacoes_created_at ON public.notificacoes USING btree (created_at);


--
-- Name: notificacoes_lida; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notificacoes_lida ON public.notificacoes USING btree (lida);


--
-- Name: notificacoes_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notificacoes_tenant_id ON public.notificacoes USING btree (tenant_id);


--
-- Name: notificacoes_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notificacoes_user_id ON public.notificacoes USING btree (user_id);


--
-- Name: propostas_cliente_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX propostas_cliente_id ON public.propostas USING btree (cliente_id);


--
-- Name: propostas_corretor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX propostas_corretor_id ON public.propostas USING btree (corretor_id);


--
-- Name: propostas_imovel_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX propostas_imovel_id ON public.propostas USING btree (imovel_id);


--
-- Name: propostas_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX propostas_status ON public.propostas USING btree (status);


--
-- Name: propostas_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX propostas_tenant_id ON public.propostas USING btree (tenant_id);


--
-- Name: simulacoes_cliente_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX simulacoes_cliente_id ON public.simulacoes USING btree (cliente_id);


--
-- Name: simulacoes_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX simulacoes_tenant_id ON public.simulacoes USING btree (tenant_id);


--
-- Name: simulacoes_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX simulacoes_user_id ON public.simulacoes USING btree (user_id);


--
-- Name: tokens_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX tokens_email ON public.tokens USING btree (email);


--
-- Name: tokens_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX tokens_expires_at ON public.tokens USING btree (expires_at);


--
-- Name: tokens_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX tokens_user_id ON public.tokens USING btree (user_id);


--
-- Name: visitas_cliente_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX visitas_cliente_id ON public.visitas USING btree (cliente_id);


--
-- Name: visitas_corretor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX visitas_corretor_id ON public.visitas USING btree (corretor_id);


--
-- Name: visitas_data_visita; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX visitas_data_visita ON public.visitas USING btree (data_visita);


--
-- Name: visitas_imovel_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX visitas_imovel_id ON public.visitas USING btree (imovel_id);


--
-- Name: visitas_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX visitas_status ON public.visitas USING btree (status);


--
-- Name: visitas_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX visitas_tenant_id ON public.visitas USING btree (tenant_id);


--
-- Name: alugueis update_alugueis_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_alugueis_updated_at BEFORE UPDATE ON public.alugueis FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: ClienteAluguels ClienteAluguels_aluguel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ClienteAluguels"
    ADD CONSTRAINT "ClienteAluguels_aluguel_id_fkey" FOREIGN KEY (aluguel_id) REFERENCES public.alugueis(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ClienteAluguels ClienteAluguels_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ClienteAluguels"
    ADD CONSTRAINT "ClienteAluguels_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Lembretes Lembretes_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Lembretes"
    ADD CONSTRAINT "Lembretes_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: acessos acessos_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.acessos
    ADD CONSTRAINT acessos_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: acessos acessos_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.acessos
    ADD CONSTRAINT "acessos_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id);


--
-- Name: acessos acessos_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.acessos
    ADD CONSTRAINT acessos_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: alugueis alugueis_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alugueis
    ADD CONSTRAINT alugueis_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: chamado_manutencaos chamado_manutencaos_aluguel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chamado_manutencaos
    ADD CONSTRAINT chamado_manutencaos_aluguel_id_fkey FOREIGN KEY (aluguel_id) REFERENCES public.alugueis(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: chamado_manutencaos chamado_manutencaos_cliente_aluguel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chamado_manutencaos
    ADD CONSTRAINT chamado_manutencaos_cliente_aluguel_id_fkey FOREIGN KEY (cliente_aluguel_id) REFERENCES public."ClienteAluguels"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: chamado_manutencaos chamado_manutencaos_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chamado_manutencaos
    ADD CONSTRAINT chamado_manutencaos_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: cliente_aluguels cliente_aluguels_aluguel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cliente_aluguels
    ADD CONSTRAINT cliente_aluguels_aluguel_id_fkey FOREIGN KEY (aluguel_id) REFERENCES public.alugueis(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: cliente_aluguels cliente_aluguels_proprietario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cliente_aluguels
    ADD CONSTRAINT cliente_aluguels_proprietario_id_fkey FOREIGN KEY (proprietario_id) REFERENCES public.proprietario(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: cliente_aluguels cliente_aluguels_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cliente_aluguels
    ADD CONSTRAINT cliente_aluguels_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: clientes clientes_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clientes
    ADD CONSTRAINT clientes_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: clientes clientes_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clientes
    ADD CONSTRAINT "clientes_userId_fkey" FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: cobranca_aluguels cobranca_aluguels_cliente_aluguel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cobranca_aluguels
    ADD CONSTRAINT cobranca_aluguels_cliente_aluguel_id_fkey FOREIGN KEY (cliente_aluguel_id) REFERENCES public."ClienteAluguels"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: cobranca_aluguels cobranca_aluguels_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cobranca_aluguels
    ADD CONSTRAINT cobranca_aluguels_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: comissoes comissoes_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comissoes
    ADD CONSTRAINT comissoes_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: despesas despesas_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.despesas
    ADD CONSTRAINT despesas_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: notas fk_notas_criado_por_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notas
    ADD CONSTRAINT fk_notas_criado_por_id FOREIGN KEY (criado_por_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: fluxo_caixa fluxo_caixa_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fluxo_caixa
    ADD CONSTRAINT fluxo_caixa_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: imoveis imoveis_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.imoveis
    ADD CONSTRAINT imoveis_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: laudos laudos_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.laudos
    ADD CONSTRAINT laudos_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: laudos laudos_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.laudos
    ADD CONSTRAINT laudos_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: municipios municipios_estado_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.municipios
    ADD CONSTRAINT municipios_estado_id_fkey FOREIGN KEY (estado_id) REFERENCES public.estados(id);


--
-- Name: notas notas_cliente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notas
    ADD CONSTRAINT notas_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: notas notas_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notas
    ADD CONSTRAINT notas_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: notificacoes notificacoes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notificacoes
    ADD CONSTRAINT notificacoes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: pagamentos pagamentos_cliente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pagamentos
    ADD CONSTRAINT pagamentos_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: pagamentos pagamentos_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pagamentos
    ADD CONSTRAINT pagamentos_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: pagamentos pagamentos_pagamento_pai_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pagamentos
    ADD CONSTRAINT pagamentos_pagamento_pai_id_fkey FOREIGN KEY (pagamento_pai_id) REFERENCES public.pagamentos(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: pagamentos pagamentos_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pagamentos
    ADD CONSTRAINT pagamentos_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: propostas propostas_cliente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.propostas
    ADD CONSTRAINT propostas_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: propostas propostas_corretor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.propostas
    ADD CONSTRAINT propostas_corretor_id_fkey FOREIGN KEY (corretor_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: propostas propostas_imovel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.propostas
    ADD CONSTRAINT propostas_imovel_id_fkey FOREIGN KEY (imovel_id) REFERENCES public.imoveis(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: proprietario proprietario_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proprietario
    ADD CONSTRAINT proprietario_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: receitas receitas_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.receitas
    ADD CONSTRAINT receitas_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: regua_cobrancas regua_cobrancas_cliente_aluguel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.regua_cobrancas
    ADD CONSTRAINT regua_cobrancas_cliente_aluguel_id_fkey FOREIGN KEY (cliente_aluguel_id) REFERENCES public."ClienteAluguels"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: regua_cobrancas regua_cobrancas_cobranca_aluguel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.regua_cobrancas
    ADD CONSTRAINT regua_cobrancas_cobranca_aluguel_id_fkey FOREIGN KEY (cobranca_aluguel_id) REFERENCES public.cobranca_aluguels(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: regua_cobrancas regua_cobrancas_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.regua_cobrancas
    ADD CONSTRAINT regua_cobrancas_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: repasse_proprietarios repasse_proprietarios_cliente_aluguel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.repasse_proprietarios
    ADD CONSTRAINT repasse_proprietarios_cliente_aluguel_id_fkey FOREIGN KEY (cliente_aluguel_id) REFERENCES public."ClienteAluguels"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: repasse_proprietarios repasse_proprietarios_cobranca_aluguel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.repasse_proprietarios
    ADD CONSTRAINT repasse_proprietarios_cobranca_aluguel_id_fkey FOREIGN KEY (cobranca_aluguel_id) REFERENCES public.cobranca_aluguels(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: repasse_proprietarios repasse_proprietarios_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.repasse_proprietarios
    ADD CONSTRAINT repasse_proprietarios_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: simulacoes simulacoes_cliente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.simulacoes
    ADD CONSTRAINT simulacoes_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: simulacoes simulacoes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.simulacoes
    ADD CONSTRAINT simulacoes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: subscriptions subscriptions_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.plans(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: subscriptions subscriptions_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: system_configs system_configs_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_configs
    ADD CONSTRAINT system_configs_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: tokens tokens_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tokens
    ADD CONSTRAINT tokens_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: tokens tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tokens
    ADD CONSTRAINT tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: users users_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: visitas visitas_cliente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visitas
    ADD CONSTRAINT visitas_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: visitas visitas_corretor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visitas
    ADD CONSTRAINT visitas_corretor_id_fkey FOREIGN KEY (corretor_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: visitas visitas_criado_por_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visitas
    ADD CONSTRAINT visitas_criado_por_id_fkey FOREIGN KEY (criado_por_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: visitas visitas_imovel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visitas
    ADD CONSTRAINT visitas_imovel_id_fkey FOREIGN KEY (imovel_id) REFERENCES public.imoveis(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: vistoria_aluguels vistoria_aluguels_aluguel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vistoria_aluguels
    ADD CONSTRAINT vistoria_aluguels_aluguel_id_fkey FOREIGN KEY (aluguel_id) REFERENCES public.alugueis(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: vistoria_aluguels vistoria_aluguels_cliente_aluguel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vistoria_aluguels
    ADD CONSTRAINT vistoria_aluguels_cliente_aluguel_id_fkey FOREIGN KEY (cliente_aluguel_id) REFERENCES public."ClienteAluguels"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: vistoria_aluguels vistoria_aluguels_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vistoria_aluguels
    ADD CONSTRAINT vistoria_aluguels_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: whatsapp_sessions whatsapp_sessions_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_sessions
    ADD CONSTRAINT whatsapp_sessions_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: whatsapps whatsapps_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapps
    ADD CONSTRAINT whatsapps_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--


