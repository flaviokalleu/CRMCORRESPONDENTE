-- whatsapp_sessions.data é NOT NULL sem valor padrão, e o model Go não
-- preenche essa coluna: ao clicar "Mostrar QR Code" o INSERT da sessão
-- falhava ("valor nulo na coluna data") e o estado nunca era gravado.
ALTER TABLE whatsapp_sessions ALTER COLUMN data SET DEFAULT '{}'::jsonb;
