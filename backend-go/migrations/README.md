# Migrations (golang-migrate)

O Go é o **dono das migrations** (decisão de 2026-07-22). Funciona exatamente como
`sequelize db:migrate`/`db:seed`: arquivos numerados versionados, uma tabela de
controle (`schema_migrations`) rastreia o estado, e `migrate up` recria o banco
inteiro (schema + dados essenciais) em **qualquer** Postgres novo — testado do
zero em 2026-07-22 (ver histórico de sessão).

## Arquivos

| Migration | Conteúdo |
|---|---|
| `0001_baseline_schema.up/down.sql` | Schema completo (36 tabelas, enums, índices, constraints) gerado via `pg_dump --schema-only` do banco real. **Exclui** as tabelas `whatsmeow_*` (geridas pelo próprio whatsmeow via seu `sqlstore.Container.Upgrade()`, não por nós) e `SequelizeMeta` (bookkeeping do Node, irrelevante aqui). |
| `0002_baseline_seed.up/down.sql` | Dados essenciais para a aplicação nascer funcional: 1 tenant admin, 3 planos, 1 usuário super-admin (`admin@admin.com` / `admin`), 27 estados, 5570 municípios. **Não inclui** `clientes` nem `tokens` (dados de teste/sessão, não fazem parte do baseline). |

## Uso (idêntico ao fluxo Sequelize)

Instalar a CLI (uma vez):
```bash
go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest
```

Rodar contra qualquer Postgres (local, staging, produção, reinstalação do zero):
```bash
migrate -path migrations -database "postgres://user:senha@host:5432/dbname?sslmode=disable" up
```

Reverter:
```bash
migrate -path migrations -database "$DATABASE_URL" down 1
```

Ver a versão atual:
```bash
migrate -path migrations -database "$DATABASE_URL" version
```

Criar uma nova migration (mudanças futuras de schema):
```bash
migrate create -ext sql -dir migrations -seq nome_da_mudanca
migrate -path migrations -database "$DATABASE_URL" up
```

## Banco `crmjs` local (dev)

Já está marcado como versão `2` (`migrate force 2`) — **não rode `up` nele**, ele já
tem o schema+seed aplicados (foi a própria fonte do dump). `force` é usado quando o
banco já tem o schema mas nunca rodou pelo `golang-migrate` (evita re-executar
`CREATE TABLE` em tabelas que já existem).

## Convenções

- Naming: `NNNN_descricao.up.sql` / `NNNN_descricao.down.sql`.
- Tabela de controle: `schema_migrations` — isenta de tenant scope (ver `internal/tenant/globals.go`).
- `whatsmeow_*` tables **nunca** entram em migrations nossas — o `whatsmeow.OpenContainer` gerencia seu próprio schema no boot.
- Dados de teste/demo (ex.: clientes fictícios) **não** pertencem ao baseline — usar seeders/fixtures separados se precisar deles em dev.
