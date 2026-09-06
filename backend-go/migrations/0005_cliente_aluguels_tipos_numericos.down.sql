-- Reverte cliente_aluguels.valor_aluguel e dia_vencimento para
-- character varying(255), formato pt-BR (vírgula decimal) para valor_aluguel,
-- igual ao schema legado original.

ALTER TABLE public.cliente_aluguels
    ALTER COLUMN valor_aluguel TYPE character varying(255)
    USING (
        CASE
            WHEN valor_aluguel IS NULL THEN NULL
            ELSE replace(valor_aluguel::text, '.', ',')
        END
    );

ALTER TABLE public.cliente_aluguels
    ALTER COLUMN dia_vencimento TYPE character varying(255)
    USING dia_vencimento::text;
