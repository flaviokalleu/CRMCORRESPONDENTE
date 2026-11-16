-- Usuários criados pelo cadastro SaaS ficavam com username vazio (coluna
-- UNIQUE), o que travava o cadastro seguinte. Usa o e-mail como username.
UPDATE users SET username = lower(email) WHERE (username IS NULL OR username = '') AND email IS NOT NULL;
