-- cliente_aluguels.valor_aluguel e dia_vencimento foram criados como
-- character varying(255) no schema legado (ver 0001_baseline_schema.up.sql),
-- mas models.ClienteAluguel os declara como float64/int. pgx não consegue
-- codificar float64/int para varchar, então qualquer INSERT/UPDATE feito via
-- GORM (ex.: alugueis.CreateInquilino) falha com
-- "unable to encode ... for varchar (OID 1043)". Convertendo as colunas para
-- numeric(10,2) e integer, que é o que os dados realmente representam.
--
-- Os valores existentes estão em notação pt-BR (vírgula decimal, ex.:
-- "1200,00"), igual ao que models.ParseRenda documenta para valor_renda.
-- A normalização abaixo replica a mesma regra: só remove separador de
-- milhar ('.') e troca vírgula por ponto quando há vírgula; caso contrário
-- assume que já está em formato numérico ("1234.56").

ALTER TABLE public.cliente_aluguels
    ALTER COLUMN valor_aluguel TYPE numeric(10,2)
    USING (
        CASE
            WHEN valor_aluguel IS NULL OR btrim(valor_aluguel) = '' THEN NULL
            WHEN valor_aluguel LIKE '%,%'
                THEN replace(replace(btrim(valor_aluguel), '.', ''), ',', '.')::numeric(10,2)
            ELSE btrim(valor_aluguel)::numeric(10,2)
        END
    );

ALTER TABLE public.cliente_aluguels
    ALTER COLUMN dia_vencimento TYPE integer
    USING (
        CASE
            WHEN dia_vencimento IS NULL OR btrim(dia_vencimento) = '' THEN NULL
            ELSE btrim(dia_vencimento)::integer
        END
    );
