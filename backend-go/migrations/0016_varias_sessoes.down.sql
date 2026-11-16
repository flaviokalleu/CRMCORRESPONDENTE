DROP INDEX IF EXISTS tokens_user_id_idx;
-- Mantém só a sessão mais recente de cada usuário antes de recriar a restrição.
DELETE FROM tokens t USING tokens n
 WHERE t.user_id = n.user_id AND t.user_type IS NOT DISTINCT FROM n.user_type AND t.updated_at < n.updated_at;
ALTER TABLE tokens ADD CONSTRAINT unique_user_id_user_type UNIQUE (user_id, user_type);
