-- A descrição do imóvel de aluguel era varchar(255): qualquer texto maior
-- (uma descrição normal de anúncio) estourava com erro 500 no cadastro.
ALTER TABLE alugueis ALTER COLUMN descricao TYPE text;
