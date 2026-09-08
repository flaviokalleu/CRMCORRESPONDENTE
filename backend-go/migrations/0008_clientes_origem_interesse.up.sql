-- Origem e interesse do cliente — dois campos que a lista de clientes exibe como
-- coluna própria e que até aqui não tinham onde ser gravados.
--
-- Ambos são texto livre e opcional: os valores sugeridos na UI (Facebook,
-- Google, Indicação, Site, WhatsApp, Instagram, Campanha) são uma conveniência
-- do formulário, não uma restrição do banco — cada imobiliária capta por canais
-- diferentes, e um CHECK/enum aqui obrigaria uma migration a cada canal novo.
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS origem VARCHAR(80);
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS interesse VARCHAR(160);

-- A lista filtra e agrupa por origem; o índice parcial ignora as linhas nulas,
-- que são a maioria enquanto o campo não estiver preenchido no cadastro.
CREATE INDEX IF NOT EXISTS idx_clientes_origem ON clientes (tenant_id, origem) WHERE origem IS NOT NULL;
