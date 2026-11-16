-- cliente_aluguels.valor_aluguel e dia_vencimento eram texto (herança do
-- Node), mas o Go grava número: o cadastro de inquilino dava erro 500
-- ("unable to encode 1200 into text format for varchar"). Converte para os
-- mesmos tipos de alugueis, aceitando valores antigos "1.200,00" ou "1200.00".
ALTER TABLE cliente_aluguels
    ALTER COLUMN valor_aluguel TYPE NUMERIC(10,2) USING (
        CASE
            WHEN valor_aluguel IS NULL OR btrim(valor_aluguel) = '' THEN NULL
            WHEN valor_aluguel LIKE '%,%' THEN replace(NULLIF(regexp_replace(replace(valor_aluguel, '.', ''), '[^0-9,]', '', 'g'), ''), ',', '.')
            ELSE NULLIF(regexp_replace(valor_aluguel, '[^0-9.]', '', 'g'), '')
        END
    )::NUMERIC(10,2),
    ALTER COLUMN dia_vencimento TYPE INTEGER USING NULLIF(regexp_replace(dia_vencimento, '[^0-9]', '', 'g'), '')::INTEGER;
