ALTER TABLE alugueis ALTER COLUMN descricao TYPE varchar(255) USING left(descricao, 255);
