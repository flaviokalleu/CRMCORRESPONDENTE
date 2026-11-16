DROP INDEX IF EXISTS pagamentos_asaas_payment_id_idx;
ALTER TABLE pagamentos DROP COLUMN IF EXISTS asaas_customer_id, DROP COLUMN IF EXISTS asaas_payment_id,
    DROP COLUMN IF EXISTS invoice_url, DROP COLUMN IF EXISTS dados_gateway, DROP COLUMN IF EXISTS transaction_receipt_url;
ALTER TABLE whatsapp_sessions DROP COLUMN IF EXISTS session_id, DROP COLUMN IF EXISTS device_jid, DROP COLUMN IF EXISTS last_error;
