-- O baseline 0001 veio de pg_dump e traz `set_config('search_path','')`,
-- que vale pela sessão inteira do golang-migrate. Sem restaurar aqui, os
-- nomes sem schema abaixo falham com "relação não existe" num banco novo.
SET search_path TO public;

DROP TABLE IF EXISTS cliente_documentos;
