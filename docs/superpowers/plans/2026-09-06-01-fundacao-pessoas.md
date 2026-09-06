# Fundação: correção de FKs + núcleo de pessoas — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corrigir a tabela legada `ClienteAluguels` que quebra as FKs de cobrança/repasse/vistoria, e introduzir a tabela `pessoas` como núcleo de identidade compartilhado pelas três fichas de papel.

**Architecture:** Aditivo. `pessoas` é uma tabela nova, pequena, ligada às tabelas existentes (`clientes`, `cliente_aluguels`, `proprietario`) por uma coluna `pessoa_id` nullable. As três fichas mantêm PK, colunas e FKs atuais, então os 12 módulos que dependem de `cliente_aluguels` não mudam. O papel de uma pessoa é derivado da existência de ficha, não armazenado.

**Tech Stack:** Go 1.x + GORM + Gin, Postgres, golang-migrate, Next.js (App Router).

**Spec:** `docs/superpowers/specs/2026-09-06-unificacao-cadastros-design.md`

## Global Constraints

- Migrations são golang-migrate, numeradas sequencialmente, com `.up.sql` e `.down.sql` obrigatórios. Próximo número livre: **0003**.
- Não há dados em produção. Migrations não precisam preservar linhas existentes.
- Todo model com campo `tenant_id` recebe isolamento por tenant automaticamente via os callbacks de `internal/tenant` — basta usar `db.WithContext(ctx)`. Não escrever `WHERE tenant_id` à mão.
- Módulos Go seguem o formato `repository.go` / `service.go` / `handler.go` / `dto.go`, com `NewRepository(db)`, `NewService(repo)`, `NewHandler(svc)`. Ver `internal/modules/proprietarios/` como molde.
- Testes Go existentes usam GORM em modo `DryRun` (sem banco real) e inspecionam o SQL gerado. Ver `internal/tenant/scope_test.go`.
- O frontend não tem test runner instalado. Verificação de UI é manual, com passos explícitos.
- Rodar backend: `cd backend-go && go build ./... && go test ./...`
- Rodar frontend: `cd frontend-next && npm run lint && npm run build`

---

### Task 1: Remover a tabela legada `ClienteAluguels` e reapontar as 5 FKs

O banco tem duas tabelas de inquilino. `public."ClienteAluguels"` é resíduo do Sequelize e **não é referenciada por nenhuma linha de Go**. `public.cliente_aluguels` é a que `models.ClienteAluguel` usa. As cinco tabelas dependentes têm FK para a legada, então qualquer cobrança/repasse/chamado/vistoria de um inquilino real viola a constraint.

**Files:**
- Create: `backend-go/migrations/0003_drop_cliente_aluguels_legado.up.sql`
- Create: `backend-go/migrations/0003_drop_cliente_aluguels_legado.down.sql`

**Interfaces:**
- Consumes: nada.
- Produces: `cliente_aluguels(id)` passa a ser o único alvo de FK para inquilino. Todas as tasks seguintes assumem isso.

- [ ] **Step 1: Confirmar que a tabela legada não é usada por código Go**

Run:
```bash
cd backend-go && grep -rn 'ClienteAluguels' internal --include=*.go
```
Expected: nenhuma saída. Se houver qualquer resultado, **pare** e reporte — a premissa desta task caiu.

- [ ] **Step 2: Confirmar as cinco FKs que apontam para a legada**

Run:
```bash
cd backend-go && grep -n 'REFERENCES public."ClienteAluguels"' migrations/0001_baseline_schema.up.sql
```
Expected: exatamente 5 linhas — `chamado_manutencaos`, `cobranca_aluguels`, `regua_cobrancas`, `repasse_proprietarios`, `vistoria_aluguels`.

- [ ] **Step 3: Escrever a migration up**

`backend-go/migrations/0003_drop_cliente_aluguels_legado.up.sql`:
```sql
-- A tabela public."ClienteAluguels" é resíduo do Sequelize e não é referenciada
-- por nenhuma linha de Go. A aplicação grava inquilinos em cliente_aluguels.
-- As 5 FKs abaixo apontavam para a tabela errada, o que fazia qualquer
-- cobrança/repasse/chamado/vistoria de inquilino real violar a constraint.

ALTER TABLE public.chamado_manutencaos
    DROP CONSTRAINT chamado_manutencaos_cliente_aluguel_id_fkey;
ALTER TABLE public.chamado_manutencaos
    ADD CONSTRAINT chamado_manutencaos_cliente_aluguel_id_fkey
    FOREIGN KEY (cliente_aluguel_id) REFERENCES public.cliente_aluguels(id)
    ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE public.cobranca_aluguels
    DROP CONSTRAINT cobranca_aluguels_cliente_aluguel_id_fkey;
ALTER TABLE public.cobranca_aluguels
    ADD CONSTRAINT cobranca_aluguels_cliente_aluguel_id_fkey
    FOREIGN KEY (cliente_aluguel_id) REFERENCES public.cliente_aluguels(id)
    ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE public.regua_cobrancas
    DROP CONSTRAINT regua_cobrancas_cliente_aluguel_id_fkey;
ALTER TABLE public.regua_cobrancas
    ADD CONSTRAINT regua_cobrancas_cliente_aluguel_id_fkey
    FOREIGN KEY (cliente_aluguel_id) REFERENCES public.cliente_aluguels(id)
    ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE public.repasse_proprietarios
    DROP CONSTRAINT repasse_proprietarios_cliente_aluguel_id_fkey;
ALTER TABLE public.repasse_proprietarios
    ADD CONSTRAINT repasse_proprietarios_cliente_aluguel_id_fkey
    FOREIGN KEY (cliente_aluguel_id) REFERENCES public.cliente_aluguels(id)
    ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE public.vistoria_aluguels
    DROP CONSTRAINT vistoria_aluguels_cliente_aluguel_id_fkey;
ALTER TABLE public.vistoria_aluguels
    ADD CONSTRAINT vistoria_aluguels_cliente_aluguel_id_fkey
    FOREIGN KEY (cliente_aluguel_id) REFERENCES public.cliente_aluguels(id)
    ON UPDATE CASCADE ON DELETE CASCADE;

DROP TABLE public."ClienteAluguels";
```

Se algum nome de constraint divergir, obtenha o real com:
```sql
SELECT conname, conrelid::regclass FROM pg_constraint
WHERE confrelid = 'public."ClienteAluguels"'::regclass;
```

- [ ] **Step 4: Escrever a migration down**

`backend-go/migrations/0003_drop_cliente_aluguels_legado.down.sql`:
```sql
-- Recria a tabela legada vazia e devolve as FKs a ela. Não restaura dados:
-- a tabela nunca teve linhas de produção.
CREATE TABLE public."ClienteAluguels" (
    id integer NOT NULL,
    "clienteId" integer,
    nome character varying(255) NOT NULL,
    cpf character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    telefone character varying(255) NOT NULL,
    valor_aluguel numeric NOT NULL,
    dia_vencimento integer NOT NULL,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    CONSTRAINT "ClienteAluguels_pkey" PRIMARY KEY (id)
);

ALTER TABLE public.chamado_manutencaos DROP CONSTRAINT chamado_manutencaos_cliente_aluguel_id_fkey;
ALTER TABLE public.chamado_manutencaos ADD CONSTRAINT chamado_manutencaos_cliente_aluguel_id_fkey
    FOREIGN KEY (cliente_aluguel_id) REFERENCES public."ClienteAluguels"(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE public.cobranca_aluguels DROP CONSTRAINT cobranca_aluguels_cliente_aluguel_id_fkey;
ALTER TABLE public.cobranca_aluguels ADD CONSTRAINT cobranca_aluguels_cliente_aluguel_id_fkey
    FOREIGN KEY (cliente_aluguel_id) REFERENCES public."ClienteAluguels"(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE public.regua_cobrancas DROP CONSTRAINT regua_cobrancas_cliente_aluguel_id_fkey;
ALTER TABLE public.regua_cobrancas ADD CONSTRAINT regua_cobrancas_cliente_aluguel_id_fkey
    FOREIGN KEY (cliente_aluguel_id) REFERENCES public."ClienteAluguels"(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE public.repasse_proprietarios DROP CONSTRAINT repasse_proprietarios_cliente_aluguel_id_fkey;
ALTER TABLE public.repasse_proprietarios ADD CONSTRAINT repasse_proprietarios_cliente_aluguel_id_fkey
    FOREIGN KEY (cliente_aluguel_id) REFERENCES public."ClienteAluguels"(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE public.vistoria_aluguels DROP CONSTRAINT vistoria_aluguels_cliente_aluguel_id_fkey;
ALTER TABLE public.vistoria_aluguels ADD CONSTRAINT vistoria_aluguels_cliente_aluguel_id_fkey
    FOREIGN KEY (cliente_aluguel_id) REFERENCES public."ClienteAluguels"(id) ON UPDATE CASCADE ON DELETE CASCADE;
```

- [ ] **Step 5: Aplicar e verificar**

Run:
```bash
cd backend-go
migrate -path migrations -database "$DATABASE_URL" up
psql "$DATABASE_URL" -c "SELECT conname, confrelid::regclass FROM pg_constraint WHERE conname LIKE '%cliente_aluguel_id_fkey';"
```
Expected: as 5 constraints com `confrelid = cliente_aluguels`. E:
```bash
psql "$DATABASE_URL" -c "\dt public.\"ClienteAluguels\""
```
Expected: `Did not find any relation named "public.ClienteAluguels"`.

- [ ] **Step 6: Verificar que o defeito original sumiu**

Este é o teste que importa: antes desta task, o insert abaixo falhava.
```bash
psql "$DATABASE_URL" <<'SQL'
INSERT INTO cliente_aluguels (nome, valor_aluguel, dia_vencimento, tenant_id, created_at, updated_at)
VALUES ('Teste FK', 1000, 5, 1, now(), now()) RETURNING id;
SQL
```
Anote o `id` devolvido e use-o:
```bash
psql "$DATABASE_URL" -c "INSERT INTO cobranca_aluguels (cliente_aluguel_id, tenant_id) VALUES (<id>, 1);"
```
Expected: `INSERT 0 1` sem violação de FK. Limpe depois:
```bash
psql "$DATABASE_URL" -c "DELETE FROM cliente_aluguels WHERE nome = 'Teste FK';"
```

- [ ] **Step 7: Testar o rollback**

Run:
```bash
cd backend-go
migrate -path migrations -database "$DATABASE_URL" down 1
migrate -path migrations -database "$DATABASE_URL" up
```
Expected: ambos sem erro.

- [ ] **Step 8: Commit**

```bash
git add backend-go/migrations/0003_drop_cliente_aluguels_legado.*.sql
git commit -m "fix(db): reaponta FKs de inquilino para cliente_aluguels e remove tabela legada"
```

---

### Task 2: Migration da tabela `pessoas`

**Files:**
- Create: `backend-go/migrations/0004_pessoas.up.sql`
- Create: `backend-go/migrations/0004_pessoas.down.sql`

**Interfaces:**
- Consumes: Task 1 (banco consistente).
- Produces: tabela `pessoas` com colunas `id, tenant_id, nome, cpf, email, telefone, data_nascimento, created_at, updated_at`; colunas `pessoa_id integer NULL` em `clientes`, `cliente_aluguels`, `proprietario`.

- [ ] **Step 1: Escrever a migration up**

`backend-go/migrations/0004_pessoas.up.sql`:
```sql
CREATE TABLE public.pessoas (
    id              serial PRIMARY KEY,
    tenant_id       integer NOT NULL REFERENCES public.tenants(id) ON UPDATE CASCADE,
    nome            character varying(255) NOT NULL,
    cpf             character varying(14),
    email           character varying(255),
    telefone        character varying(255),
    data_nascimento date,
    created_at      timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Índice parcial: pessoas sem CPF (lead que só deixou telefone) são permitidas
-- e não colidem entre si.
CREATE UNIQUE INDEX pessoas_tenant_cpf_key
    ON public.pessoas (tenant_id, cpf) WHERE cpf IS NOT NULL;

CREATE INDEX idx_pessoas_tenant ON public.pessoas (tenant_id);
CREATE INDEX idx_pessoas_nome   ON public.pessoas (nome);

ALTER TABLE public.clientes
    ADD COLUMN pessoa_id integer REFERENCES public.pessoas(id) ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE public.cliente_aluguels
    ADD COLUMN pessoa_id integer REFERENCES public.pessoas(id) ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE public.proprietario
    ADD COLUMN pessoa_id integer REFERENCES public.pessoas(id) ON UPDATE CASCADE ON DELETE SET NULL;

CREATE INDEX idx_clientes_pessoa         ON public.clientes (pessoa_id);
CREATE INDEX idx_cliente_aluguels_pessoa ON public.cliente_aluguels (pessoa_id);
CREATE INDEX idx_proprietario_pessoa     ON public.proprietario (pessoa_id);

-- clientes.cpf tinha UNIQUE global, o que impedia dois tenants de cadastrarem
-- o mesmo CPF. Corrigido para unicidade por tenant.
ALTER TABLE public.clientes DROP CONSTRAINT clientes_cpf_key;
CREATE UNIQUE INDEX clientes_tenant_cpf_key
    ON public.clientes (tenant_id, cpf) WHERE cpf IS NOT NULL;
```

- [ ] **Step 2: Escrever a migration down**

`backend-go/migrations/0004_pessoas.down.sql`:
```sql
DROP INDEX IF EXISTS public.clientes_tenant_cpf_key;
ALTER TABLE public.clientes ADD CONSTRAINT clientes_cpf_key UNIQUE (cpf);

DROP INDEX IF EXISTS public.idx_proprietario_pessoa;
DROP INDEX IF EXISTS public.idx_cliente_aluguels_pessoa;
DROP INDEX IF EXISTS public.idx_clientes_pessoa;

ALTER TABLE public.proprietario     DROP COLUMN pessoa_id;
ALTER TABLE public.cliente_aluguels DROP COLUMN pessoa_id;
ALTER TABLE public.clientes         DROP COLUMN pessoa_id;

DROP TABLE public.pessoas;
```

- [ ] **Step 3: Aplicar e verificar**

Run:
```bash
cd backend-go
migrate -path migrations -database "$DATABASE_URL" up
psql "$DATABASE_URL" -c "\d public.pessoas"
```
Expected: a tabela com as 9 colunas.

- [ ] **Step 4: Verificar a unicidade parcial de CPF**

Run:
```bash
psql "$DATABASE_URL" <<'SQL'
INSERT INTO pessoas (tenant_id, nome, cpf) VALUES (1, 'A', NULL);
INSERT INTO pessoas (tenant_id, nome, cpf) VALUES (1, 'B', NULL);
INSERT INTO pessoas (tenant_id, nome, cpf) VALUES (1, 'C', '11111111111');
INSERT INTO pessoas (tenant_id, nome, cpf) VALUES (1, 'D', '11111111111');
SQL
```
Expected: os dois primeiros e o terceiro passam; o quarto falha com violação de `pessoas_tenant_cpf_key`. Limpe:
```bash
psql "$DATABASE_URL" -c "DELETE FROM pessoas WHERE nome IN ('A','B','C');"
```

- [ ] **Step 5: Testar rollback**

Run:
```bash
cd backend-go
migrate -path migrations -database "$DATABASE_URL" down 1
migrate -path migrations -database "$DATABASE_URL" up
```
Expected: sem erro.

- [ ] **Step 6: Commit**

```bash
git add backend-go/migrations/0004_pessoas.*.sql
git commit -m "feat(db): tabela pessoas como nucleo de identidade e cpf unico por tenant"
```

---

### Task 3: Model `Pessoa` e colunas `pessoa_id` nos models existentes

**Files:**
- Create: `backend-go/internal/models/pessoa.go`
- Modify: `backend-go/internal/models/cliente.go` (adicionar campo `PessoaID`)
- Modify: `backend-go/internal/models/cliente_aluguel.go` (adicionar campo `PessoaID`)
- Modify: `backend-go/internal/models/proprietario.go` (adicionar campo `PessoaID`)
- Test: `backend-go/internal/models/pessoa_test.go`

**Interfaces:**
- Consumes: Task 2.
- Produces: `models.Pessoa` com `TableName() == "pessoas"` e campos `ID uint`, `TenantID uint`, `Nome string`, `CPF *string`, `Email *string`, `Telefone *string`, `DataNascimento *string`, `CreatedAt/UpdatedAt time.Time`. Campo `PessoaID *uint` em `Cliente`, `ClienteAluguel` e `Proprietario`.

- [ ] **Step 1: Escrever o teste que falha**

`backend-go/internal/models/pessoa_test.go`:
```go
package models

import "testing"

func TestPessoaTableName(t *testing.T) {
	if got := (Pessoa{}).TableName(); got != "pessoas" {
		t.Fatalf("TableName = %q, quero \"pessoas\"", got)
	}
}

// Pessoa precisa de tenant_id para herdar o isolamento automático dos
// callbacks de internal/tenant (ver internal/tenant/scope.go: shouldApply
// devolve false para modelos sem esse campo).
func TestPessoaTemTenantID(t *testing.T) {
	p := Pessoa{TenantID: 7}
	if p.TenantID != 7 {
		t.Fatalf("TenantID = %d, quero 7", p.TenantID)
	}
}
```

- [ ] **Step 2: Rodar o teste para confirmar que falha**

Run: `cd backend-go && go test ./internal/models/ -run TestPessoa -v`
Expected: FAIL — `undefined: Pessoa`.

- [ ] **Step 3: Criar o model**

`backend-go/internal/models/pessoa.go`:
```go
package models

import "time"

// Pessoa é o núcleo de identidade compartilhado pelas três fichas de papel
// (clientes, cliente_aluguels, proprietario). Guarda só o que identifica a
// pessoa; os campos de cada papel continuam na ficha correspondente.
//
// O papel NÃO é armazenado aqui: é derivado da existência de ficha apontando
// para esta pessoa. Ver docs/superpowers/specs/2026-09-06-unificacao-cadastros-design.md.
type Pessoa struct {
	ID       uint `gorm:"primaryKey" json:"id"`
	TenantID uint `gorm:"column:tenant_id;not null;index" json:"tenant_id"`

	Nome     string  `gorm:"column:nome;not null" json:"nome"`
	CPF      *string `gorm:"column:cpf" json:"cpf,omitempty"`
	Email    *string `gorm:"column:email" json:"email,omitempty"`
	Telefone *string `gorm:"column:telefone" json:"telefone,omitempty"`
	// VARCHAR/date "YYYY-MM-DD" — mantido como string por coerência com
	// Cliente.DataNascimento, que já é string nesse formato.
	DataNascimento *string `gorm:"column:data_nascimento" json:"data_nascimento,omitempty"`

	CreatedAt time.Time `gorm:"column:created_at" json:"created_at"`
	UpdatedAt time.Time `gorm:"column:updated_at" json:"updated_at"`
}

func (Pessoa) TableName() string { return "pessoas" }

// Papeis descreve quais fichas existem para uma pessoa. Preenchido por
// consulta, não persistido.
type Papeis struct {
	Comprador     bool `json:"comprador"`
	Inquilino     bool `json:"inquilino"`
	Proprietario  bool `json:"proprietario"`
}
```

- [ ] **Step 4: Rodar o teste para confirmar que passa**

Run: `cd backend-go && go test ./internal/models/ -run TestPessoa -v`
Expected: PASS.

- [ ] **Step 5: Adicionar `PessoaID` aos três models existentes**

Em `backend-go/internal/models/cliente.go`, na seção "3.7 Status / relacionamentos / tenant", logo abaixo de `UserID`:
```go
	// PessoaID liga esta ficha de comprador ao núcleo de identidade (tabela
	// pessoas). Nullable: fichas criadas antes da unificação não têm pessoa.
	PessoaID *uint `gorm:"column:pessoa_id;index" json:"pessoa_id,omitempty"`
```

Em `backend-go/internal/models/cliente_aluguel.go`, logo acima do bloco `// Multitenancy`:
```go
	// PessoaID liga esta ficha de inquilino ao núcleo de identidade.
	PessoaID *uint `gorm:"column:pessoa_id;index" json:"pessoa_id,omitempty"`
```

Em `backend-go/internal/models/proprietario.go`, entre `Phone` e `TenantID`:
```go
	PessoaID  *uint     `gorm:"column:pessoa_id;index" json:"pessoa_id,omitempty"`
```

- [ ] **Step 6: Compilar e rodar a suíte inteira**

Run: `cd backend-go && go build ./... && go test ./...`
Expected: build ok, testes passando.

- [ ] **Step 7: Commit**

```bash
git add backend-go/internal/models/
git commit -m "feat(models): model Pessoa e coluna pessoa_id nas tres fichas de papel"
```

---

### Task 4: Repository de pessoas com busca por CPF e derivação de papéis

**Files:**
- Create: `backend-go/internal/modules/pessoas/repository.go`
- Test: `backend-go/internal/modules/pessoas/repository_test.go`

**Interfaces:**
- Consumes: `models.Pessoa`, `models.Papeis` (Task 3).
- Produces:
  - `NewRepository(db *gorm.DB) *Repository`
  - `(*Repository) List(ctx context.Context, papel string, busca string) ([]models.Pessoa, error)`
  - `(*Repository) FindByID(ctx context.Context, id uint) (*models.Pessoa, error)`
  - `(*Repository) FindByCPF(ctx context.Context, cpf string) (*models.Pessoa, error)` — devolve `(nil, nil)` quando não existe
  - `(*Repository) Create(ctx context.Context, p *models.Pessoa) error`
  - `(*Repository) Update(ctx context.Context, p *models.Pessoa) error`
  - `(*Repository) Papeis(ctx context.Context, pessoaID uint) (models.Papeis, error)`

- [ ] **Step 1: Escrever o teste que falha**

`backend-go/internal/modules/pessoas/repository_test.go`:
```go
package pessoas

import (
	"context"
	"strings"
	"testing"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"

	"crmimob/internal/models"
	"crmimob/internal/tenant"
)

func dryRunDB(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(postgres.Open("host=localhost user=test dbname=test"), &gorm.Config{
		DryRun: true, DisableAutomaticPing: true, SkipDefaultTransaction: true,
	})
	if err != nil {
		t.Fatal(err)
	}
	if err := tenant.RegisterCallbacks(db); err != nil {
		t.Fatal(err)
	}
	return db
}

func ctxComTenant() context.Context {
	id := uint(42)
	return tenant.With(context.Background(), tenant.Scope{TenantID: &id})
}

// A busca por CPF precisa ser filtrada por tenant, senão um tenant enxerga o
// CPF de outro. O filtro vem dos callbacks globais, não de WHERE manual.
func TestFindByCPFFiltraPorTenant(t *testing.T) {
	db := dryRunDB(t)
	stmt := db.WithContext(ctxComTenant()).
		Where("cpf = ?", "11111111111").
		First(&models.Pessoa{}).Statement
	sql := stmt.SQL.String()
	if !strings.Contains(sql, "tenant_id") {
		t.Fatalf("busca por CPF sem filtro de tenant: %s", sql)
	}
	if !strings.Contains(sql, "cpf") {
		t.Fatalf("busca por CPF sem filtro de cpf: %s", sql)
	}
}

func TestListFiltraPorTenantEBusca(t *testing.T) {
	db := dryRunDB(t)
	repo := NewRepository(db)
	stmt := repo.listQuery(ctxComTenant(), "", "silva").Find(&[]struct{}{}).Statement
	sql := stmt.SQL.String()
	if !strings.Contains(sql, "tenant_id") {
		t.Fatalf("List sem filtro de tenant: %s", sql)
	}
	if !strings.Contains(strings.ToLower(sql), "ilike") {
		t.Fatalf("List sem busca textual: %s", sql)
	}
}
```

- [ ] **Step 2: Rodar o teste para confirmar que falha**

Run: `cd backend-go && go test ./internal/modules/pessoas/ -v`
Expected: FAIL — pacote não existe / `undefined: NewRepository`.

- [ ] **Step 3: Implementar o repository**

`backend-go/internal/modules/pessoas/repository.go`:
```go
// Package pessoas implementa o núcleo de identidade compartilhado pelas três
// fichas de papel (clientes, cliente_aluguels, proprietario).
//
// Isolamento por tenant é automático: models.Pessoa tem tenant_id, então os
// callbacks de internal/tenant injetam o filtro em toda query feita com
// db.WithContext(ctx). Não escrever WHERE tenant_id à mão.
package pessoas

import (
	"context"
	"errors"

	"gorm.io/gorm"

	"crmimob/internal/models"
)

type Repository struct{ db *gorm.DB }

func NewRepository(db *gorm.DB) *Repository { return &Repository{db: db} }

// listQuery monta a query de listagem. Separado de List para ser inspecionável
// em teste com DryRun.
func (r *Repository) listQuery(ctx context.Context, papel, busca string) *gorm.DB {
	q := r.db.WithContext(ctx).Model(&models.Pessoa{})

	switch papel {
	case "comprador":
		q = q.Where("EXISTS (SELECT 1 FROM clientes c WHERE c.pessoa_id = pessoas.id)")
	case "inquilino":
		q = q.Where("EXISTS (SELECT 1 FROM cliente_aluguels ca WHERE ca.pessoa_id = pessoas.id)")
	case "proprietario":
		q = q.Where("EXISTS (SELECT 1 FROM proprietario p WHERE p.pessoa_id = pessoas.id)")
	}

	if busca != "" {
		like := "%" + busca + "%"
		q = q.Where("nome ILIKE ? OR cpf ILIKE ? OR email ILIKE ?", like, like, like)
	}

	return q.Order("nome ASC")
}

func (r *Repository) List(ctx context.Context, papel, busca string) ([]models.Pessoa, error) {
	var out []models.Pessoa
	err := r.listQuery(ctx, papel, busca).Find(&out).Error
	return out, err
}

func (r *Repository) FindByID(ctx context.Context, id uint) (*models.Pessoa, error) {
	var p models.Pessoa
	if err := r.db.WithContext(ctx).First(&p, id).Error; err != nil {
		return nil, err
	}
	return &p, nil
}

// FindByCPF devolve (nil, nil) quando não há pessoa com aquele CPF no tenant —
// "não existe" é resposta esperada no fluxo de cadastro, não erro.
func (r *Repository) FindByCPF(ctx context.Context, cpf string) (*models.Pessoa, error) {
	var p models.Pessoa
	err := r.db.WithContext(ctx).Where("cpf = ?", cpf).First(&p).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &p, nil
}

func (r *Repository) Create(ctx context.Context, p *models.Pessoa) error {
	return r.db.WithContext(ctx).Create(p).Error
}

func (r *Repository) Update(ctx context.Context, p *models.Pessoa) error {
	return r.db.WithContext(ctx).Save(p).Error
}

// Papeis deriva os papéis da pessoa pela existência de ficha em cada tabela.
// Não há coluna de papel: a ficha É o papel.
func (r *Repository) Papeis(ctx context.Context, pessoaID uint) (models.Papeis, error) {
	var out models.Papeis
	db := r.db.WithContext(ctx)

	var n int64
	if err := db.Model(&models.Cliente{}).Where("pessoa_id = ?", pessoaID).Count(&n).Error; err != nil {
		return out, err
	}
	out.Comprador = n > 0

	if err := db.Model(&models.ClienteAluguel{}).Where("pessoa_id = ?", pessoaID).Count(&n).Error; err != nil {
		return out, err
	}
	out.Inquilino = n > 0

	if err := db.Model(&models.Proprietario{}).Where("pessoa_id = ?", pessoaID).Count(&n).Error; err != nil {
		return out, err
	}
	out.Proprietario = n > 0

	return out, nil
}
```

- [ ] **Step 4: Rodar o teste para confirmar que passa**

Run: `cd backend-go && go test ./internal/modules/pessoas/ -v`
Expected: PASS nos dois testes.

- [ ] **Step 5: Commit**

```bash
git add backend-go/internal/modules/pessoas/
git commit -m "feat(pessoas): repository com busca por cpf e derivacao de papeis"
```

---

### Task 5: Service de pessoas com criação transacional de ficha

O ponto crítico: identidade e ficha gravam na mesma transação, senão `pessoas` e a ficha divergem.

**Files:**
- Create: `backend-go/internal/modules/pessoas/dto.go`
- Create: `backend-go/internal/modules/pessoas/service.go`
- Test: `backend-go/internal/modules/pessoas/service_test.go`

**Interfaces:**
- Consumes: `*Repository` (Task 4).
- Produces:
  - `NewService(repo *Repository, db *gorm.DB) *Service`
  - `(*Service) Buscar(ctx, cpf string) (*PessoaComPapeis, error)`
  - `(*Service) Criar(ctx, req CriarRequest) (*PessoaComPapeis, error)`
  - `var ErrPapelInvalido, ErrNomeObrigatorio, ErrPapelJaExiste error`
  - Tipos `CriarRequest`, `PessoaComPapeis` conforme dto.go abaixo.

- [ ] **Step 1: Escrever o dto**

`backend-go/internal/modules/pessoas/dto.go`:
```go
package pessoas

import "crmimob/internal/models"

// Papéis aceitos por CriarRequest.Papel.
const (
	PapelComprador    = "comprador"
	PapelInquilino    = "inquilino"
	PapelProprietario = "proprietario"
)

// CriarRequest é o corpo de POST /api/pessoas. Cria (ou reaproveita) a
// identidade e abre a ficha do papel pedido, na mesma transação.
type CriarRequest struct {
	Papel string `json:"papel" binding:"required"`

	Nome           string `json:"nome" binding:"required"`
	CPF            string `json:"cpf"`
	Email          string `json:"email"`
	Telefone       string `json:"telefone"`
	DataNascimento string `json:"data_nascimento"`
}

// PessoaComPapeis é o que a API devolve: a identidade mais os papéis derivados.
type PessoaComPapeis struct {
	models.Pessoa
	Papeis models.Papeis `json:"papeis"`
}
```

- [ ] **Step 2: Escrever o teste que falha**

`backend-go/internal/modules/pessoas/service_test.go`:
```go
package pessoas

import (
	"context"
	"errors"
	"testing"
)

func TestCriarRejeitaPapelInvalido(t *testing.T) {
	svc := NewService(nil, nil)
	_, err := svc.Criar(context.Background(), CriarRequest{Papel: "sindico", Nome: "Ana"})
	if !errors.Is(err, ErrPapelInvalido) {
		t.Fatalf("erro = %v, quero ErrPapelInvalido", err)
	}
}

func TestCriarRejeitaNomeVazio(t *testing.T) {
	svc := NewService(nil, nil)
	_, err := svc.Criar(context.Background(), CriarRequest{Papel: PapelComprador, Nome: "   "})
	if !errors.Is(err, ErrNomeObrigatorio) {
		t.Fatalf("erro = %v, quero ErrNomeObrigatorio", err)
	}
}

func TestPapelValido(t *testing.T) {
	casos := map[string]bool{
		PapelComprador: true, PapelInquilino: true, PapelProprietario: true,
		"": false, "sindico": false, "Comprador": false,
	}
	for papel, quero := range casos {
		if got := papelValido(papel); got != quero {
			t.Errorf("papelValido(%q) = %v, quero %v", papel, got, quero)
		}
	}
}
```

- [ ] **Step 3: Rodar o teste para confirmar que falha**

Run: `cd backend-go && go test ./internal/modules/pessoas/ -run "TestCriar|TestPapel" -v`
Expected: FAIL — `undefined: NewService`.

- [ ] **Step 4: Implementar o service**

`backend-go/internal/modules/pessoas/service.go`:
```go
package pessoas

import (
	"context"
	"errors"
	"strings"

	"gorm.io/gorm"

	"crmimob/internal/models"
)

var (
	ErrPapelInvalido   = errors.New("papel inválido")
	ErrNomeObrigatorio = errors.New("nome é obrigatório")
	ErrPapelJaExiste   = errors.New("pessoa já tem esse papel")
	ErrNaoEncontrada   = errors.New("pessoa não encontrada")
)

type Service struct {
	repo *Repository
	db   *gorm.DB
}

func NewService(repo *Repository, db *gorm.DB) *Service {
	return &Service{repo: repo, db: db}
}

func papelValido(p string) bool {
	return p == PapelComprador || p == PapelInquilino || p == PapelProprietario
}

func ptrOuNil(s string) *string {
	s = strings.TrimSpace(s)
	if s == "" {
		return nil
	}
	return &s
}

func (s *Service) List(ctx context.Context, papel, busca string) ([]models.Pessoa, error) {
	return s.repo.List(ctx, papel, busca)
}

// Buscar procura por CPF. Devolve (nil, nil) quando não existe — o frontend usa
// isso para decidir entre "criar nova" e "adicionar papel a quem já existe".
func (s *Service) Buscar(ctx context.Context, cpf string) (*PessoaComPapeis, error) {
	p, err := s.repo.FindByCPF(ctx, cpf)
	if err != nil || p == nil {
		return nil, err
	}
	papeis, err := s.repo.Papeis(ctx, p.ID)
	if err != nil {
		return nil, err
	}
	return &PessoaComPapeis{Pessoa: *p, Papeis: papeis}, nil
}

// Criar grava identidade e ficha na MESMA transação. Se a ficha falhar, a
// pessoa não é criada — é isso que impede pessoas e ficha de divergirem.
func (s *Service) Criar(ctx context.Context, req CriarRequest) (*PessoaComPapeis, error) {
	if !papelValido(req.Papel) {
		return nil, ErrPapelInvalido
	}
	if strings.TrimSpace(req.Nome) == "" {
		return nil, ErrNomeObrigatorio
	}

	var out *PessoaComPapeis

	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		txRepo := NewRepository(tx)

		var pessoa *models.Pessoa
		if cpf := strings.TrimSpace(req.CPF); cpf != "" {
			existente, err := txRepo.FindByCPF(ctx, cpf)
			if err != nil {
				return err
			}
			pessoa = existente
		}

		if pessoa == nil {
			pessoa = &models.Pessoa{
				Nome:           strings.TrimSpace(req.Nome),
				CPF:            ptrOuNil(req.CPF),
				Email:          ptrOuNil(req.Email),
				Telefone:       ptrOuNil(req.Telefone),
				DataNascimento: ptrOuNil(req.DataNascimento),
			}
			if err := txRepo.Create(ctx, pessoa); err != nil {
				return err
			}
		}

		papeis, err := txRepo.Papeis(ctx, pessoa.ID)
		if err != nil {
			return err
		}
		if jaTem(papeis, req.Papel) {
			return ErrPapelJaExiste
		}

		if err := criarFicha(ctx, tx, pessoa, req.Papel); err != nil {
			return err
		}

		papeis, err = txRepo.Papeis(ctx, pessoa.ID)
		if err != nil {
			return err
		}
		out = &PessoaComPapeis{Pessoa: *pessoa, Papeis: papeis}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return out, nil
}

func jaTem(p models.Papeis, papel string) bool {
	switch papel {
	case PapelComprador:
		return p.Comprador
	case PapelInquilino:
		return p.Inquilino
	case PapelProprietario:
		return p.Proprietario
	}
	return false
}

// criarFicha abre a ficha mínima do papel, copiando a identidade. As fichas
// mantêm nome/cpf/email/telefone como cópia de leitura: pessoas é a fonte da
// verdade, mas os 12 módulos que consultam as fichas continuam funcionando.
func criarFicha(ctx context.Context, tx *gorm.DB, p *models.Pessoa, papel string) error {
	switch papel {
	case PapelComprador:
		c := models.Cliente{
			PessoaID: &p.ID,
			Nome:     &p.Nome,
			CPF:      p.CPF,
			Email:    p.Email,
			Telefone: p.Telefone,
			Status:   "aguardando_aprovacao",
		}
		if p.DataNascimento != nil {
			c.DataNascimento = p.DataNascimento
		}
		return tx.WithContext(ctx).Create(&c).Error

	case PapelInquilino:
		ca := models.ClienteAluguel{
			PessoaID: &p.ID,
			Nome:     p.Nome,
			CPF:      p.CPF,
			Email:    p.Email,
			Telefone: p.Telefone,
		}
		return tx.WithContext(ctx).Create(&ca).Error

	case PapelProprietario:
		pr := models.Proprietario{
			PessoaID: &p.ID,
			Name:     p.Nome,
			Phone:    p.Telefone,
		}
		return tx.WithContext(ctx).Create(&pr).Error
	}
	return ErrPapelInvalido
}
```

- [ ] **Step 5: Rodar os testes**

Run: `cd backend-go && go test ./internal/modules/pessoas/ -v`
Expected: PASS em todos.

- [ ] **Step 6: Commit**

```bash
git add backend-go/internal/modules/pessoas/
git commit -m "feat(pessoas): service com criacao transacional de identidade e ficha"
```

---

### Task 6: Handler e rotas de pessoas

**Files:**
- Create: `backend-go/internal/modules/pessoas/handler.go`
- Modify: `backend-go/internal/server/` — o arquivo que registra as rotas (o mesmo que hoje tem `proprietariosHandler`; localize com o comando do Step 1)

**Interfaces:**
- Consumes: `*Service` (Task 5).
- Produces: rotas `GET /api/pessoas`, `GET /api/pessoas/buscar?cpf=`, `GET /api/pessoas/:id`, `POST /api/pessoas`.

- [ ] **Step 1: Localizar o arquivo de wiring**

Run:
```bash
cd backend-go && grep -rn "proprietarios.NewHandler\|proprietariosHandler" internal/server/
```
Anote o arquivo e a linha — é onde a Task registra o handler novo.

- [ ] **Step 2: Escrever o handler**

`backend-go/internal/modules/pessoas/handler.go`:
```go
package pessoas

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

type Handler struct{ svc *Service }

func NewHandler(svc *Service) *Handler { return &Handler{svc: svc} }

// Register monta as rotas de pessoas. Auth e tenant são responsabilidade de
// quem monta o grupo, como nos demais módulos.
func (h *Handler) Register(r *gin.RouterGroup) {
	r.GET("/pessoas", h.List)
	r.GET("/pessoas/buscar", h.Buscar)
	r.GET("/pessoas/:id", h.Get)
	r.POST("/pessoas", h.Criar)
}

func (h *Handler) List(c *gin.Context) {
	out, err := h.svc.List(c.Request.Context(), c.Query("papel"), c.Query("busca"))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao listar pessoas"})
		return
	}
	c.JSON(http.StatusOK, out)
}

// Buscar responde 200 com null quando não encontra — "não existe" é resposta
// normal no fluxo de cadastro, não erro.
func (h *Handler) Buscar(c *gin.Context) {
	cpf := c.Query("cpf")
	if cpf == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "cpf é obrigatório"})
		return
	}
	out, err := h.svc.Buscar(c.Request.Context(), cpf)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao buscar pessoa"})
		return
	}
	c.JSON(http.StatusOK, out)
}

func (h *Handler) Get(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id inválido"})
		return
	}
	out, err := h.svc.BuscarPorID(c.Request.Context(), uint(id))
	if err != nil {
		if errors.Is(err, ErrNaoEncontrada) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Pessoa não encontrada"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao buscar pessoa"})
		return
	}
	c.JSON(http.StatusOK, out)
}

func (h *Handler) Criar(c *gin.Context) {
	var req CriarRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "papel e nome são obrigatórios"})
		return
	}
	out, err := h.svc.Criar(c.Request.Context(), req)
	if err != nil {
		switch {
		case errors.Is(err, ErrPapelInvalido):
			c.JSON(http.StatusBadRequest, gin.H{"error": "Papel inválido"})
		case errors.Is(err, ErrNomeObrigatorio):
			c.JSON(http.StatusBadRequest, gin.H{"error": "Nome é obrigatório"})
		case errors.Is(err, ErrPapelJaExiste):
			c.JSON(http.StatusConflict, gin.H{"error": "Essa pessoa já tem esse papel"})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao criar pessoa"})
		}
		return
	}
	c.JSON(http.StatusCreated, out)
}
```

- [ ] **Step 3: Adicionar `BuscarPorID` ao service**

Em `backend-go/internal/modules/pessoas/service.go`, depois de `Buscar`:
```go
// BuscarPorID devolve a pessoa com seus papéis, ou ErrNaoEncontrada.
func (s *Service) BuscarPorID(ctx context.Context, id uint) (*PessoaComPapeis, error) {
	p, err := s.repo.FindByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNaoEncontrada
		}
		return nil, err
	}
	papeis, err := s.repo.Papeis(ctx, p.ID)
	if err != nil {
		return nil, err
	}
	return &PessoaComPapeis{Pessoa: *p, Papeis: papeis}, nil
}
```

- [ ] **Step 4: Registrar no server**

No arquivo localizado no Step 1, junto do bloco onde `proprietariosHandler` é montado, adicione o import `"crmimob/internal/modules/pessoas"` e:
```go
	pessoasRepo := pessoas.NewRepository(db)
	pessoasHandler := pessoas.NewHandler(pessoas.NewService(pessoasRepo, db))
```
E no mesmo grupo autenticado onde `proprietariosHandler.Register(...)` é chamado:
```go
	pessoasHandler.Register(<mesmo grupo de proprietarios>)
```

- [ ] **Step 5: Compilar e subir**

Run: `cd backend-go && go build ./... && go test ./...`
Expected: sem erro.

- [ ] **Step 6: Verificar as rotas de ponta a ponta**

Suba a API e, com um token válido no lugar de `$TOKEN`:
```bash
# criar proprietário
curl -s -X POST localhost:8080/api/pessoas -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"papel":"proprietario","nome":"Joao Silva","cpf":"52998224725","telefone":"11999999999"}'
```
Expected: 201, com `"papeis":{"comprador":false,"inquilino":false,"proprietario":true}`.

```bash
# mesma pessoa vira também comprador
curl -s -X POST localhost:8080/api/pessoas -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"papel":"comprador","nome":"Joao Silva","cpf":"52998224725"}'
```
Expected: 201, mesmo `id` de pessoa, agora com `comprador:true` **e** `proprietario:true`.

```bash
# repetir o mesmo papel
curl -s -o /dev/null -w '%{http_code}\n' -X POST localhost:8080/api/pessoas \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"papel":"comprador","nome":"Joao Silva","cpf":"52998224725"}'
```
Expected: `409`.

```bash
psql "$DATABASE_URL" -c "SELECT count(*) FROM pessoas WHERE cpf='52998224725';"
```
Expected: `1` — uma identidade, duas fichas. Este é o resultado central do plano.

- [ ] **Step 7: Commit**

```bash
git add backend-go/internal/modules/pessoas/ backend-go/internal/server/
git commit -m "feat(pessoas): endpoints de listagem, busca por cpf e criacao com papel"
```

---

### Task 7: Tela `/pessoas` — lista

**Files:**
- Create: `frontend-next/src/app/(app)/pessoas/page.js`
- Create: `frontend-next/src/components/PessoasLista.jsx`

**Interfaces:**
- Consumes: `GET /api/pessoas?papel=&busca=`.
- Produces: rota `/pessoas`, aceitando `?papel=comprador|inquilino|proprietario`.

- [ ] **Step 1: Ler as convenções de Next deste projeto**

Este Next tem breaking changes em relação ao conhecimento geral. Antes de escrever:
```bash
cd frontend-next && ls node_modules/next/dist/docs/
```
Leia o guia de App Router / páginas antes de prosseguir. Siga também o padrão de `frontend-next/src/components/ClientesLista.jsx`, que é a lista equivalente hoje.

- [ ] **Step 2: Escrever o componente de lista**

`frontend-next/src/components/PessoasLista.jsx` — espelhe a estrutura de `ClientesLista.jsx` (mesmo estilo de tabela, paginação e estados de carregamento), com estas diferenças:
- filtro de papel com as opções Todos / Compradores / Inquilinos / Proprietários, refletido em `?papel=` na URL;
- coluna "Papéis" mostrando os papéis derivados como badges;
- botão "Nova pessoa" apontando para `/pessoas/nova`.

- [ ] **Step 3: Escrever a página**

`frontend-next/src/app/(app)/pessoas/page.js` — siga a estrutura de `frontend-next/src/app/(app)/clientes/lista/page.js`, renderizando `<PessoasLista />`.

- [ ] **Step 4: Verificar**

Run: `cd frontend-next && npm run lint && npm run build`
Expected: sem erro.

Depois, com a API rodando, abra `/pessoas` e confirme: a pessoa criada na Task 6 aparece com dois badges (Comprador, Proprietário); o filtro `?papel=inquilino` não a lista.

- [ ] **Step 5: Commit**

```bash
git add frontend-next/src/app/\(app\)/pessoas/ frontend-next/src/components/PessoasLista.jsx
git commit -m "feat(web): tela de listagem unificada de pessoas com filtro por papel"
```

---

### Task 8: Tela `/pessoas/nova` — escolha de papel + wizard

**Files:**
- Create: `frontend-next/src/app/(app)/pessoas/nova/page.js`
- Create: `frontend-next/src/components/pessoa/PessoaWizard.jsx`
- Create: `frontend-next/src/components/pessoa/EtapaIdentidade.jsx`

**Interfaces:**
- Consumes: `GET /api/pessoas/buscar?cpf=`, `POST /api/pessoas`.
- Produces: rota `/pessoas/nova`.

- [ ] **Step 1: Escrever a etapa de identidade**

`frontend-next/src/components/pessoa/EtapaIdentidade.jsx` — campos nome, CPF, e-mail, telefone, data de nascimento. Ao sair do campo CPF (evento `blur`), chamar `GET /api/pessoas/buscar?cpf=<cpf>`:
- resposta `null` → segue normal;
- resposta com pessoa → exibir aviso *"{nome} já está cadastrado como {papéis}. Os dados foram preenchidos; ao salvar, o papel {papel} será adicionado a essa mesma pessoa."* e preencher nome, e-mail, telefone e nascimento com os valores retornados.

- [ ] **Step 2: Escrever o wizard**

`frontend-next/src/components/pessoa/PessoaWizard.jsx`:
- **Passo 0** — escolha do papel: três cartões (Comprador, Inquilino, Proprietário). Nenhum outro campo aparece antes da escolha.
- **Passos seguintes** — barra de progresso, com as etapas definidas pelo papel:

| Papel | Etapas |
|---|---|
| Comprador | Identidade → Renda e trabalho → Cônjuge → Fiador → Documentos e formulários Caixa |
| Inquilino | Identidade → Contrato e valores → Fiador → Documentos |
| Proprietário | Identidade → Dados de repasse |

- A etapa Identidade é `<EtapaIdentidade />` nos três casos.
- Só a etapa Identidade é obrigatória para salvar: `POST /api/pessoas` cria a pessoa e a ficha mínima. As demais etapas editam a ficha e podem ser preenchidas depois — reaproveite os formulários existentes (`ClienteForm.jsx` para comprador, o formulário de inquilino de `clientes-aluguel`, `ProprietarioAddForm.jsx` para proprietário) em vez de reescrevê-los.
- Resposta 409 do POST → mostrar "Essa pessoa já tem esse papel" e oferecer link para a ficha existente.

- [ ] **Step 3: Escrever a página**

`frontend-next/src/app/(app)/pessoas/nova/page.js` renderizando `<PessoaWizard />`.

- [ ] **Step 4: Verificar**

Run: `cd frontend-next && npm run lint && npm run build`
Expected: sem erro.

Verificação manual, na ordem:
1. Abrir `/pessoas/nova` — só aparecem os três cartões de papel.
2. Escolher "Proprietário", preencher nome e CPF novo, salvar. Confirmar redirecionamento para a ficha e o badge Proprietário.
3. Abrir `/pessoas/nova` de novo, escolher "Comprador", digitar o **mesmo CPF** e sair do campo. Confirmar o aviso de pessoa existente e o preenchimento automático.
4. Salvar. Confirmar em `/pessoas` que existe **uma** linha com dois badges.

- [ ] **Step 5: Commit**

```bash
git add frontend-next/src/app/\(app\)/pessoas/nova/ frontend-next/src/components/pessoa/
git commit -m "feat(web): wizard de cadastro de pessoa com papel escolhido no inicio"
```

---

### Task 9: Redirects das rotas antigas de pessoa

**Files:**
- Modify: `frontend-next/next.config.mjs` (ou `next.config.js` — confirme o nome no Step 1)

**Interfaces:**
- Consumes: rotas `/pessoas` e `/pessoas/nova` (Tasks 7 e 8).
- Produces: redirects 308 das rotas antigas.

- [ ] **Step 1: Localizar o config**

Run: `cd frontend-next && ls next.config.*`

- [ ] **Step 2: Adicionar os redirects**

No objeto de config, adicione:
```js
  async redirects() {
    return [
      { source: "/clientes/lista", destination: "/pessoas?papel=comprador", permanent: true },
      { source: "/clientes/adicionar", destination: "/pessoas/nova", permanent: true },
      { source: "/editar-cliente/:id", destination: "/pessoas/:id", permanent: true },
      { source: "/proprietarios/lista", destination: "/pessoas?papel=proprietario", permanent: true },
    ];
  },
```

`permanent: true` emite 308. Os redirects de `/alugueis`, `/imoveis/lista` e `/clientes-aluguel` pertencem aos planos 02 e 03 — não os adicione aqui.

- [ ] **Step 3: Remover as páginas antigas**

```bash
cd frontend-next
git rm -r "src/app/(app)/clientes/lista" "src/app/(app)/clientes/adicionar" \
          "src/app/(app)/editar-cliente" "src/app/(app)/proprietarios"
```

Uma rota que ainda existe como página vence o redirect, então a remoção é obrigatória, não opcional.

- [ ] **Step 4: Verificar**

Run: `cd frontend-next && npm run lint && npm run build`
Expected: build sem erro. Se algum import quebrar, corrija apontando para os componentes novos.

Com o app rodando:
```bash
curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' localhost:3000/clientes/lista
curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' localhost:3000/proprietarios/lista
```
Expected: `308` e a URL nova em ambos.

- [ ] **Step 5: Commit**

```bash
git add -A frontend-next/
git commit -m "feat(web): redireciona rotas antigas de cliente e proprietario para /pessoas"
```

---

## Verificação final do plano

Rode tudo antes de considerar o plano concluído:

```bash
cd backend-go && go build ./... && go test ./...
cd ../frontend-next && npm run lint && npm run build
```

E confirme os dois resultados que definem o sucesso deste plano:

1. Cobrança para inquilino real insere sem violar FK (Task 1, Step 6).
2. Mesma pessoa em dois papéis = uma linha em `pessoas`, duas fichas (Task 6, Step 6).
