-- Colunas que os modelos Go usam e o baseline não tinha (o dump veio de um
-- banco anterior à migração do Asaas/whatsmeow). Sem elas, criar cobrança e
-- gravar sessão do WhatsApp davam erro de SQL. IF NOT EXISTS: seguro em
-- bancos que já as tenham.
ALTER TABLE pagamentos
    ADD COLUMN IF NOT EXISTS asaas_customer_id       VARCHAR(255),
    ADD COLUMN IF NOT EXISTS asaas_payment_id        VARCHAR(255),
    ADD COLUMN IF NOT EXISTS invoice_url             TEXT,
    ADD COLUMN IF NOT EXISTS dados_gateway           JSONB,
    ADD COLUMN IF NOT EXISTS transaction_receipt_url TEXT;
CREATE INDEX IF NOT EXISTS pagamentos_asaas_payment_id_idx ON pagamentos (asaas_payment_id);

ALTER TABLE whatsapp_sessions
    ADD COLUMN IF NOT EXISTS session_id VARCHAR(255),
    ADD COLUMN IF NOT EXISTS device_jid VARCHAR(255),
    ADD COLUMN IF NOT EXISTS last_error TEXT;
