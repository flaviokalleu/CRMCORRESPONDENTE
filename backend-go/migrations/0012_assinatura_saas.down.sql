DROP TABLE IF EXISTS avisos_cobranca;
DROP TABLE IF EXISTS faturas_assinatura;
DROP TABLE IF EXISTS webhook_events;
DROP INDEX IF EXISTS subscriptions_tenant_unico;
ALTER TABLE subscriptions
    DROP COLUMN IF EXISTS tolerancia_dias,
    DROP COLUMN IF EXISTS preco_combinado,
    DROP COLUMN IF EXISTS plano_agendado_id,
    DROP COLUMN IF EXISTS ultimo_pagamento_em;
ALTER TABLE tenants
    DROP COLUMN IF EXISTS bloqueado,
    DROP COLUMN IF EXISTS bloqueado_motivo,
    DROP COLUMN IF EXISTS bloqueado_em,
    DROP COLUMN IF EXISTS documento_cobranca;
UPDATE plans SET trial_dias = 14 WHERE preco_mensal > 0;
UPDATE plans SET ativo = TRUE WHERE slug = 'free';
