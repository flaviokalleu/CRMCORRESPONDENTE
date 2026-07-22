-- Reverte 0001_baseline_schema: derruba TODO o schema public e recria vazio.
-- É a forma padrão de reverter uma migration baseline (equivalente ao
-- "drop all tables" que o Sequelize faria via successive down migrations).
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
