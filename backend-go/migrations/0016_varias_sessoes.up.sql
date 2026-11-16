-- Até 5 sessões por usuário (celular, computador…): a restrição única
-- (user_id, user_type) obrigava uma sessão só — entrar no celular derrubava
-- o computador. O limite agora é aplicado no código (auth.MaxSessoesPorUsuario).
ALTER TABLE tokens DROP CONSTRAINT IF EXISTS unique_user_id_user_type;
DROP INDEX IF EXISTS unique_user_id_user_type;
CREATE INDEX IF NOT EXISTS tokens_user_id_idx ON tokens (user_id, updated_at DESC);
