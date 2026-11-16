ALTER TABLE cliente_aluguels
    ALTER COLUMN valor_aluguel TYPE VARCHAR(255) USING valor_aluguel::text,
    ALTER COLUMN dia_vencimento TYPE VARCHAR(255) USING dia_vencimento::text;
