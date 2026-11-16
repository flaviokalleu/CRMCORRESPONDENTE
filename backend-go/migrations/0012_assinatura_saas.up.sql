-- Assinatura SaaS (plataforma cobra a imobiliária). Ver docs/ROADMAP-SAAS.md.

-- Bloqueio manual e documento usado na cobrança da assinatura.
ALTER TABLE tenants
    ADD COLUMN IF NOT EXISTS bloqueado          BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS bloqueado_motivo   TEXT,
    ADD COLUMN IF NOT EXISTS bloqueado_em       TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS documento_cobranca VARCHAR(14);

-- data_fim passa a significar "pago até". Tolerância por imobiliária, preço
-- combinado (NULL = preço de tabela; 0 = cortesia) e troca de plano agendada
-- para a próxima renovação.
ALTER TABLE subscriptions
    ADD COLUMN IF NOT EXISTS tolerancia_dias  INTEGER NOT NULL DEFAULT 3,
    ADD COLUMN IF NOT EXISTS preco_combinado  NUMERIC(10,2),
    ADD COLUMN IF NOT EXISTS plano_agendado_id INTEGER REFERENCES plans(id),
    ADD COLUMN IF NOT EXISTS ultimo_pagamento_em TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_tenant_unico ON subscriptions (tenant_id);

CREATE TABLE IF NOT EXISTS faturas_assinatura (
    id                 BIGSERIAL PRIMARY KEY,
    tenant_id          INTEGER       NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    plan_id            INTEGER       NOT NULL REFERENCES plans(id),
    ciclo              VARCHAR(10)   NOT NULL DEFAULT 'mensal',
    valor              NUMERIC(10,2) NOT NULL,
    vencimento         DATE          NOT NULL,
    status             VARCHAR(12)   NOT NULL DEFAULT 'pendente', -- pendente|paga|vencida|cancelada|estornada
    descricao          TEXT          NOT NULL,
    chave              VARCHAR(120)  NOT NULL UNIQUE,              -- anti-duplicidade (ex.: renovacao:7:2026-12-01)
    gateway_payment_id VARCHAR(64)   UNIQUE,
    link_pagamento     TEXT,
    paga_em            TIMESTAMPTZ,
    forma_pagamento    VARCHAR(20),
    created_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS faturas_assinatura_tenant_idx ON faturas_assinatura (tenant_id, vencimento DESC);
CREATE INDEX IF NOT EXISTS faturas_assinatura_status_idx ON faturas_assinatura (status, vencimento);

-- Um aviso de cobrança por fatura e estágio (antes3|no_dia|depois3|bloqueio).
CREATE TABLE IF NOT EXISTS avisos_cobranca (
    id         BIGSERIAL PRIMARY KEY,
    tenant_id  INTEGER     NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    fatura_id  BIGINT      NOT NULL REFERENCES faturas_assinatura(id) ON DELETE CASCADE,
    estagio    VARCHAR(12) NOT NULL,
    enviado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (fatura_id, estagio)
);

-- Idempotência dos webhooks (plataforma e imobiliárias). Faltava no baseline,
-- o que fazia o webhook do Asaas das imobiliárias descartar todos os eventos.
CREATE TABLE IF NOT EXISTS webhook_events (
    id           BIGSERIAL PRIMARY KEY,
    provider     VARCHAR(40)  NOT NULL,
    event_id     VARCHAR(120) NOT NULL,
    payload      JSONB,
    processed_at TIMESTAMPTZ,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT idx_webhook_provider_event UNIQUE (provider, event_id)
);

-- Teste de 7 dias nos planos pagos; o Free sai da vitrine (fica para cortesia).
UPDATE plans SET trial_dias = 7 WHERE preco_mensal > 0;
UPDATE plans SET ativo = FALSE WHERE slug = 'free';
