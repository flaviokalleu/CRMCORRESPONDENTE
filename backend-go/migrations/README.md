# Migrations (golang-migrate)

O Go é o **dono das migrations** (decisão de 2026-07-22). Como o schema já existe
no Postgres (88 migrations Sequelize aplicadas), adotamos uma **baseline**:

## Estratégia de baseline

1. Dump do schema atual como migration inicial:
   ```bash
   pg_dump --schema-only --no-owner --no-privileges -d crmjs > migrations/0001_baseline.up.sql
   ```
   Criar o par vazio `migrations/0001_baseline.down.sql` (ou com DROPs, se quiser reversível).

2. Marcar a baseline como já aplicada (sem rodar), pois as tabelas já existem:
   ```bash
   migrate -path migrations -database "$DATABASE_URL" force 1
   ```

3. A partir daí, toda mudança de schema é uma nova migration numerada:
   ```bash
   migrate create -ext sql -dir migrations -seq nome_da_mudanca
   migrate -path migrations -database "$DATABASE_URL" up
   ```

## Instalar a CLI

```bash
go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest
```

## Convenções

- Naming: `NNNN_descricao.up.sql` / `NNNN_descricao.down.sql`.
- Coluna de controle: `schema_migrations` (isenta de tenant scope — ver internal/tenant/globals.go).
- Enquanto Node e Go coexistirem, **pausar as migrations do Sequelize** — só o golang-migrate altera o schema.
