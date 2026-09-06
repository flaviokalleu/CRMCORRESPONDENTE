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

## Banco novo e banco local

Em um banco vazio, execute `migrate up`: as migrations 0001–0007 criam o schema,
o seed e aplicam as correções de FKs, pessoas e tipos numéricos. Em banco já
versionado, o mesmo comando aplica apenas as versões pendentes. Não use `force`
para substituir a execução de migrations.

O banco local foi atualizado para a versão 7 em 2026-09-06.

- 0006 vincula os cadastros existentes a pessoas, por CPF normalizado e empresa.
  Cadastros sem CPF recebem identidades separadas. Dados inválidos interrompem a
  transação; nenhum cadastro é descartado. O down preserva esses vínculos.
- 0007 torna a unicidade de e-mail de clientes restrita à empresa. O down falha
  sem alterar dados se já houver e-mails iguais em empresas diferentes.

### Teste em banco descartável

Com PostgreSQL local e credenciais de desenvolvimento em `backend-go/.env`,
execute `TEST_MIGRATIONS=1 go test ./migrations -v -count=1` (no PowerShell,
defina `$env:TEST_MIGRATIONS='1'` antes do comando). O teste exige permissão para
criar banco, aplica o histórico completo e remove seu banco temporário ao fim.

## Convenções

- Naming: `NNNN_descricao.up.sql` / `NNNN_descricao.down.sql`.
- Tabela de controle: `schema_migrations` — isenta de tenant scope (ver `internal/tenant/globals.go`).
- `whatsmeow_*` tables **nunca** entram em migrations nossas — o `whatsmeow.OpenContainer` gerencia seu próprio schema no boot.
- Dados de teste/demo (ex.: clientes fictícios) **não** pertencem ao baseline — usar seeders/fixtures separados se precisar deles em dev.
