-- Uma transação: nenhum cadastro pode ficar parcialmente migrado.
BEGIN;
LOCK TABLE public.clientes, public.cliente_aluguels, public.proprietario, public.pessoas IN SHARE ROW EXCLUSIVE MODE;
DO $$
DECLARE r record; identidade integer; documento text; nascimento date;
BEGIN
  FOR r IN
    SELECT 'clientes' AS tabela, id, tenant_id, nome, cpf, email, telefone, data_nascimento::text AS nascimento FROM public.clientes WHERE pessoa_id IS NULL
    UNION ALL
    SELECT 'cliente_aluguels', id, tenant_id, nome, cpf, email, telefone, data_nascimento::text FROM public.cliente_aluguels WHERE pessoa_id IS NULL
    UNION ALL
    SELECT 'proprietario', id, tenant_id, name, NULL, NULL, phone, NULL FROM public.proprietario WHERE pessoa_id IS NULL
    ORDER BY tabela, id
  LOOP
    IF r.tenant_id IS NULL THEN
      RAISE EXCEPTION 'Cadastro %.% sem tenant; atribua a empresa antes de migrar', r.tabela, r.id;
    END IF;
    documento := NULLIF(regexp_replace(r.cpf, '[^0-9]', '', 'g'), '');
    IF documento IS NOT NULL AND length(documento) <> 11 THEN
      RAISE EXCEPTION 'CPF com tamanho invalido em %.%; corrija antes de migrar', r.tabela, r.id;
    END IF;
    identidade := NULL;
    IF documento IS NOT NULL THEN
      SELECT id INTO identidade FROM public.pessoas
      WHERE tenant_id = r.tenant_id AND cpf = documento;
    END IF;
    nascimento := NULL;
    IF NULLIF(trim(r.nascimento), '') IS NOT NULL THEN
      BEGIN
        nascimento := r.nascimento::date;
      EXCEPTION WHEN invalid_datetime_format OR datetime_field_overflow THEN
        RAISE EXCEPTION 'Data invalida em %.%; corrija antes de migrar', r.tabela, r.id;
      END;
    END IF;
    IF identidade IS NULL THEN
      INSERT INTO public.pessoas (tenant_id, nome, cpf, email, telefone, data_nascimento)
      VALUES (r.tenant_id, COALESCE(NULLIF(trim(r.nome), ''), 'Cadastro ' || r.tabela || ' #' || r.id),
              documento, NULLIF(trim(r.email), ''), NULLIF(trim(r.telefone), ''), nascimento)
      RETURNING id INTO identidade;
    END IF;
    EXECUTE format('UPDATE public.%I SET pessoa_id = $1 WHERE id = $2 AND tenant_id = $3 AND pessoa_id IS NULL', r.tabela)
      USING identidade, r.id, r.tenant_id;
  END LOOP;
END $$;
COMMIT;
