# Imóveis unificados (aluguel / venda / ambos) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fundir a tabela `alugueis` em `imoveis`, com uma coluna `finalidade` que permite aluguel, venda ou ambos no mesmo registro, e apresentar isso como uma tela única.

**Architecture:** `imoveis` já é a mais rica das duas tabelas, então ela é a base e recebe as colunas de locação. `alugueis` é aposentada e as três FKs que apontavam para ela (`chamado_manutencaos`, `vistoria_aluguels`, `cliente_aluguels`) passam a apontar para `imoveis`. O módulo `alugueis` perde o CRUD de imóvel mas **mantém** inquilino, cobrança, Asaas e régua — essa lógica pertence ao contrato, não ao imóvel.

**Tech Stack:** Go + GORM + Gin, Postgres, golang-migrate, Next.js (App Router).

**Spec:** `docs/superpowers/specs/2026-09-06-unificacao-cadastros-design.md`

**Depende de:** `2026-09-06-01-fundacao-pessoas.md` Task 1 (correção das FKs legadas). As demais tasks do plano 01 são independentes desta.

## Global Constraints

- Migrations golang-migrate, numeradas. Este plano usa **0005**.
- Sem dados em produção: migrations não precisam preservar linhas.
- Tenant scoping é automático para models com `tenant_id`. Não escrever `WHERE tenant_id` à mão.
- `imoveis` tem timestamps em **camelCase** (`"createdAt"`, `"updatedAt"`) além de `created_at`/`updated_at` — divergência preservada do Sequelize. Não "consertar" isso aqui.
- Rodar backend: `cd backend-go && go build ./... && go test ./...`
- Rodar frontend: `cd frontend-next && npm run lint && npm run build`

---

### Task 1: Migration de fusão de imóveis

**Files:**
- Create: `backend-go/migrations/0005_imoveis_finalidade.up.sql`
- Create: `backend-go/migrations/0005_imoveis_finalidade.down.sql`

**Interfaces:**
- Consumes: plano 01 Task 1.
- Produces: `imoveis` com `finalidade`, `valor_aluguel`, `dia_vencimento`, `alugado`; `valor_venda` nullable; colunas `imovel_id` em `chamado_manutencaos`, `vistoria_aluguels` e `cliente_aluguels`; tabela `alugueis` removida.

- [ ] **Step 1: Confirmar as FKs que apontam para `alugueis`**

Run:
```bash
cd backend-go && grep -n 'REFERENCES public.alugueis' migrations/0001_baseline_schema.up.sql
```
Expected: 3 linhas — `chamado_manutencaos_aluguel_id_fkey`, `cliente_aluguels_aluguel_id_fkey`, e a de `vistoria_aluguels`. Se houver uma quarta, inclua-a nos passos seguintes.

- [ ] **Step 2: Escrever a migration up**

`backend-go/migrations/0005_imoveis_finalidade.up.sql`:
```sql
-- imoveis absorve alugueis. valor_venda passa a aceitar NULL porque um imóvel
-- exclusivamente de locação não tem preço de venda.
ALTER TABLE public.imoveis
    ADD COLUMN finalidade character varying(10) NOT NULL DEFAULT 'venda'
    CONSTRAINT imoveis_finalidade_check CHECK (finalidade IN ('aluguel','venda','ambos'));
ALTER TABLE public.imoveis ADD COLUMN valor_aluguel  double precision;
ALTER TABLE public.imoveis ADD COLUMN dia_vencimento integer;
ALTER TABLE public.imoveis ADD COLUMN alugado boolean NOT NULL DEFAULT false;
ALTER TABLE public.imoveis ALTER COLUMN valor_venda DROP NOT NULL;

CREATE INDEX idx_imoveis_finalidade ON public.imoveis (finalidade);

-- Reaponta as FKs de alugueis para imoveis, renomeando a coluna.
ALTER TABLE public.chamado_manutencaos DROP CONSTRAINT chamado_manutencaos_aluguel_id_fkey;
ALTER TABLE public.chamado_manutencaos RENAME COLUMN aluguel_id TO imovel_id;
ALTER TABLE public.chamado_manutencaos
    ADD CONSTRAINT chamado_manutencaos_imovel_id_fkey
    FOREIGN KEY (imovel_id) REFERENCES public.imoveis(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE public.vistoria_aluguels DROP CONSTRAINT vistoria_aluguels_aluguel_id_fkey;
ALTER TABLE public.vistoria_aluguels RENAME COLUMN aluguel_id TO imovel_id;
ALTER TABLE public.vistoria_aluguels
    ADD CONSTRAINT vistoria_aluguels_imovel_id_fkey
    FOREIGN KEY (imovel_id) REFERENCES public.imoveis(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE public.cliente_aluguels DROP CONSTRAINT cliente_aluguels_aluguel_id_fkey;
ALTER TABLE public.cliente_aluguels RENAME COLUMN aluguel_id TO imovel_id;
ALTER TABLE public.cliente_aluguels
    ADD CONSTRAINT cliente_aluguels_imovel_id_fkey
    FOREIGN KEY (imovel_id) REFERENCES public.imoveis(id) ON UPDATE CASCADE ON DELETE SET NULL;

DROP TABLE public.alugueis;
```

Se o nome real da constraint de `vistoria_aluguels` divergir, obtenha-o com:
```sql
SELECT conname, conrelid::regclass FROM pg_constraint
WHERE confrelid = 'public.alugueis'::regclass;
```

- [ ] **Step 3: Escrever a migration down**

`backend-go/migrations/0005_imoveis_finalidade.down.sql`:
```sql
CREATE TABLE public.alugueis (
    id serial PRIMARY KEY,
    nome_imovel character varying(255),
    descricao character varying(255),
    valor_aluguel double precision,
    quartos integer,
    banheiro integer,
    foto_capa character varying(255),
    alugado boolean DEFAULT false NOT NULL,
    foto_adicional text,
    dia_vencimento integer,
    created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    tenant_id integer
);

ALTER TABLE public.cliente_aluguels DROP CONSTRAINT cliente_aluguels_imovel_id_fkey;
ALTER TABLE public.cliente_aluguels RENAME COLUMN imovel_id TO aluguel_id;
ALTER TABLE public.cliente_aluguels ADD CONSTRAINT cliente_aluguels_aluguel_id_fkey
    FOREIGN KEY (aluguel_id) REFERENCES public.alugueis(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE public.vistoria_aluguels DROP CONSTRAINT vistoria_aluguels_imovel_id_fkey;
ALTER TABLE public.vistoria_aluguels RENAME COLUMN imovel_id TO aluguel_id;
ALTER TABLE public.vistoria_aluguels ADD CONSTRAINT vistoria_aluguels_aluguel_id_fkey
    FOREIGN KEY (aluguel_id) REFERENCES public.alugueis(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE public.chamado_manutencaos DROP CONSTRAINT chamado_manutencaos_imovel_id_fkey;
ALTER TABLE public.chamado_manutencaos RENAME COLUMN imovel_id TO aluguel_id;
ALTER TABLE public.chamado_manutencaos ADD CONSTRAINT chamado_manutencaos_aluguel_id_fkey
    FOREIGN KEY (aluguel_id) REFERENCES public.alugueis(id) ON UPDATE CASCADE ON DELETE SET NULL;

DROP INDEX IF EXISTS public.idx_imoveis_finalidade;
ALTER TABLE public.imoveis DROP COLUMN alugado;
ALTER TABLE public.imoveis DROP COLUMN dia_vencimento;
ALTER TABLE public.imoveis DROP COLUMN valor_aluguel;
ALTER TABLE public.imoveis DROP CONSTRAINT imoveis_finalidade_check;
ALTER TABLE public.imoveis DROP COLUMN finalidade;
UPDATE public.imoveis SET valor_venda = 0 WHERE valor_venda IS NULL;
ALTER TABLE public.imoveis ALTER COLUMN valor_venda SET NOT NULL;
```

- [ ] **Step 4: Aplicar e verificar**

Run:
```bash
cd backend-go
migrate -path migrations -database "$DATABASE_URL" up
psql "$DATABASE_URL" -c "\d public.imoveis"
```
Expected: colunas `finalidade`, `valor_aluguel`, `dia_vencimento`, `alugado` presentes; `valor_venda` sem `not null`.

```bash
psql "$DATABASE_URL" -c "INSERT INTO imoveis (nome_imovel, endereco, tipo, quartos, banheiro, exclusivo, tem_inquilino, situacao_imovel, finalidade, \"createdAt\", \"updatedAt\") VALUES ('So aluguel','Rua A','casa',2,1,false,false,'disponivel','aluguel',now(),now());"
```
Expected: `INSERT 0 1` — um imóvel sem `valor_venda`, que antes era impossível.

```bash
psql "$DATABASE_URL" -c "INSERT INTO imoveis (nome_imovel, endereco, tipo, quartos, banheiro, exclusivo, tem_inquilino, situacao_imovel, finalidade, \"createdAt\", \"updatedAt\") VALUES ('Invalida','Rua B','casa',2,1,false,false,'disponivel','permuta',now(),now());"
```
Expected: falha com violação de `imoveis_finalidade_check`.

Limpe: `psql "$DATABASE_URL" -c "DELETE FROM imoveis WHERE nome_imovel='So aluguel';"`

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
git add backend-go/migrations/0005_imoveis_finalidade.*.sql
git commit -m "feat(db): funde alugueis em imoveis com coluna finalidade"
```

---

### Task 2: Model `Imovel` com finalidade; remoção de `models.Aluguel`

**Files:**
- Modify: `backend-go/internal/models/imovel.go`
- Delete: `backend-go/internal/models/aluguel.go`
- Modify: `backend-go/internal/models/chamado_manutencao.go` (`AluguelID` → `ImovelID`)
- Modify: `backend-go/internal/models/vistoria_aluguel.go` (`AluguelID` → `ImovelID`)
- Modify: `backend-go/internal/models/cliente_aluguel.go` (`AluguelID` → `ImovelID`)
- Test: `backend-go/internal/models/imovel_test.go`

**Interfaces:**
- Consumes: Task 1.
- Produces: `models.Imovel` com `Finalidade string`, `ValorVenda *float64`, `ValorAluguel *float64`, `DiaVencimento *int`, `Alugado bool`, e os métodos `ParaAluguel() bool` / `ParaVenda() bool`. Constantes `FinalidadeAluguel`, `FinalidadeVenda`, `FinalidadeAmbos`. `models.Aluguel` deixa de existir.

- [ ] **Step 1: Escrever o teste que falha**

`backend-go/internal/models/imovel_test.go`:
```go
package models

import "testing"

func TestFinalidadeDeterminaUso(t *testing.T) {
	casos := []struct {
		finalidade            string
		aluguel, venda        bool
	}{
		{FinalidadeAluguel, true, false},
		{FinalidadeVenda, false, true},
		{FinalidadeAmbos, true, true},
	}
	for _, c := range casos {
		i := Imovel{Finalidade: c.finalidade}
		if got := i.ParaAluguel(); got != c.aluguel {
			t.Errorf("%s: ParaAluguel = %v, quero %v", c.finalidade, got, c.aluguel)
		}
		if got := i.ParaVenda(); got != c.venda {
			t.Errorf("%s: ParaVenda = %v, quero %v", c.finalidade, got, c.venda)
		}
	}
}

func TestIsFinalidadeValida(t *testing.T) {
	for _, ok := range []string{FinalidadeAluguel, FinalidadeVenda, FinalidadeAmbos} {
		if !IsFinalidadeValida(ok) {
			t.Errorf("IsFinalidadeValida(%q) = false, quero true", ok)
		}
	}
	for _, ruim := range []string{"", "permuta", "Venda"} {
		if IsFinalidadeValida(ruim) {
			t.Errorf("IsFinalidadeValida(%q) = true, quero false", ruim)
		}
	}
}
```

- [ ] **Step 2: Rodar o teste para confirmar que falha**

Run: `cd backend-go && go test ./internal/models/ -run "TestFinalidade|TestIsFinalidade" -v`
Expected: FAIL — `undefined: FinalidadeAluguel`.

- [ ] **Step 3: Alterar o model `Imovel`**

Em `backend-go/internal/models/imovel.go`, troque a linha de `ValorVenda` e adicione os campos de locação logo abaixo:
```go
	ValorAvaliacao  *float64 `gorm:"column:valor_avaliacao" json:"valor_avaliacao"`
	// ValorVenda é nullable desde a fusão com alugueis: um imóvel exclusivamente
	// de locação não tem preço de venda.
	ValorVenda      *float64 `gorm:"column:valor_venda" json:"valor_venda"`

	// Finalidade define para que o imóvel é anunciado. 'ambos' substitui o que
	// antes exigiria um registro em cada tabela.
	Finalidade    string   `gorm:"column:finalidade;not null;default:venda;index" json:"finalidade"`
	ValorAluguel  *float64 `gorm:"column:valor_aluguel" json:"valor_aluguel,omitempty"`
	DiaVencimento *int     `gorm:"column:dia_vencimento" json:"dia_vencimento,omitempty"`
	Alugado       bool     `gorm:"column:alugado;not null;default:false" json:"alugado"`
```

E no fim do arquivo, depois de `TableName`:
```go
// Finalidades aceitas.
const (
	FinalidadeAluguel = "aluguel"
	FinalidadeVenda   = "venda"
	FinalidadeAmbos   = "ambos"
)

func IsFinalidadeValida(f string) bool {
	return f == FinalidadeAluguel || f == FinalidadeVenda || f == FinalidadeAmbos
}

// ParaAluguel diz se o imóvel é anunciado para locação.
func (i Imovel) ParaAluguel() bool {
	return i.Finalidade == FinalidadeAluguel || i.Finalidade == FinalidadeAmbos
}

// ParaVenda diz se o imóvel é anunciado para venda.
func (i Imovel) ParaVenda() bool {
	return i.Finalidade == FinalidadeVenda || i.Finalidade == FinalidadeAmbos
}
```

- [ ] **Step 4: Rodar o teste para confirmar que passa**

Run: `cd backend-go && go test ./internal/models/ -run "TestFinalidade|TestIsFinalidade" -v`
Expected: PASS.

- [ ] **Step 5: Renomear os campos de FK nos três models**

Em `backend-go/internal/models/chamado_manutencao.go`:
```go
	ImovelID *uint `gorm:"column:imovel_id;index" json:"imovel_id,omitempty"`
```
(substituindo a linha `AluguelID`).

Em `backend-go/internal/models/vistoria_aluguel.go`, a mesma substituição.

Em `backend-go/internal/models/cliente_aluguel.go`, na seção `// Contrato`:
```go
	ImovelID *uint `gorm:"column:imovel_id" json:"imovel_id,omitempty"`
```

- [ ] **Step 6: Remover o model `Aluguel`**

```bash
cd backend-go && git rm internal/models/aluguel.go
```

- [ ] **Step 7: Levantar todos os pontos de compilação quebrados**

Run: `cd backend-go && go build ./... 2>&1 | tee /tmp/quebras.txt`
Expected: erros em `modules/alugueis`, `modules/contratos`, `modules/portalinquilino`, `modules/vistorias`. **Não conserte agora** — as Tasks 3 e 4 fazem isso. Guarde a lista.

- [ ] **Step 8: Commit (build ainda quebrado, intencionalmente)**

```bash
git add backend-go/internal/models/
git commit -m "refactor(models): Imovel ganha finalidade e absorve Aluguel"
```

> Este é o único commit do plano que não compila. As Tasks 3 e 4 são obrigatórias para fechar. Se preferir um histórico sempre verde, faça as Tasks 2, 3 e 4 num commit só.

---

### Task 3: Módulo `imoveis` cobre locação; `alugueis` perde o CRUD de imóvel

**Files:**
- Modify: `backend-go/internal/modules/imoveis/dto.go`
- Modify: `backend-go/internal/modules/imoveis/service.go`
- Modify: `backend-go/internal/modules/imoveis/repository.go`
- Modify: `backend-go/internal/modules/alugueis/repository.go` (remover funções de `models.Aluguel`)
- Modify: `backend-go/internal/modules/alugueis/service.go` (idem)
- Modify: `backend-go/internal/modules/alugueis/handler.go` (remover as rotas de imóvel)
- Test: `backend-go/internal/modules/imoveis/service_test.go`

**Interfaces:**
- Consumes: `models.Imovel` (Task 2).
- Produces: `imoveis.Filters` ganha o campo `Finalidade string`; `imoveis.ImovelInput` ganha `Finalidade`, `ValorAluguel`, `DiaVencimento`; `imoveis` exporta `ValidarFinalidade(finalidade string, valorVenda, valorAluguel *float64, diaVencimento *int) error` e `var ErrValorVendaObrigatorio, ErrValorAluguelObrigatorio, ErrFinalidadeInvalida error`.

- [ ] **Step 1: Escrever o teste de validação que falha**

`backend-go/internal/modules/imoveis/service_test.go`:
```go
package imoveis

import (
	"errors"
	"testing"
)

func f(v float64) *float64 { return &v }
func i(v int) *int         { return &v }

func TestValidarFinalidade(t *testing.T) {
	casos := []struct {
		nome          string
		finalidade    string
		venda         *float64
		aluguel       *float64
		dia           *int
		quero         error
	}{
		{"venda sem preco", "venda", nil, nil, nil, ErrValorVendaObrigatorio},
		{"venda ok", "venda", f(300000), nil, nil, nil},
		{"aluguel sem preco", "aluguel", nil, nil, nil, ErrValorAluguelObrigatorio},
		{"aluguel sem dia", "aluguel", nil, f(1500), nil, ErrValorAluguelObrigatorio},
		{"aluguel ok", "aluguel", nil, f(1500), i(5), nil},
		{"ambos exige os dois", "ambos", f(300000), nil, nil, ErrValorAluguelObrigatorio},
		{"ambos ok", "ambos", f(300000), f(1500), i(5), nil},
		{"finalidade invalida", "permuta", nil, nil, nil, ErrFinalidadeInvalida},
	}
	for _, c := range casos {
		t.Run(c.nome, func(t *testing.T) {
			err := ValidarFinalidade(c.finalidade, c.venda, c.aluguel, c.dia)
			if !errors.Is(err, c.quero) {
				t.Fatalf("erro = %v, quero %v", err, c.quero)
			}
		})
	}
}
```

- [ ] **Step 2: Rodar o teste para confirmar que falha**

Run: `cd backend-go && go test ./internal/modules/imoveis/ -run TestValidarFinalidade -v`
Expected: FAIL — `undefined: ValidarFinalidade`.

- [ ] **Step 3: Implementar a validação**

No fim de `backend-go/internal/modules/imoveis/service.go`:
```go
var (
	ErrFinalidadeInvalida      = errors.New("finalidade inválida")
	ErrValorVendaObrigatorio   = errors.New("valor de venda é obrigatório para imóvel à venda")
	ErrValorAluguelObrigatorio = errors.New("valor de aluguel e dia de vencimento são obrigatórios para imóvel de locação")
)

// ValidarFinalidade garante que os valores exigidos pela finalidade estão
// presentes. Substitui o NOT NULL que valor_venda tinha antes da fusão: agora
// a obrigatoriedade depende da finalidade, e o banco não consegue expressá-la.
func ValidarFinalidade(finalidade string, valorVenda, valorAluguel *float64, diaVencimento *int) error {
	if !models.IsFinalidadeValida(finalidade) {
		return ErrFinalidadeInvalida
	}
	i := models.Imovel{Finalidade: finalidade}
	if i.ParaVenda() && valorVenda == nil {
		return ErrValorVendaObrigatorio
	}
	if i.ParaAluguel() && (valorAluguel == nil || diaVencimento == nil) {
		return ErrValorAluguelObrigatorio
	}
	return nil
}
```
Garanta que `errors` e `crmimob/internal/models` estão importados no arquivo.

- [ ] **Step 4: Rodar o teste para confirmar que passa**

Run: `cd backend-go && go test ./internal/modules/imoveis/ -run TestValidarFinalidade -v`
Expected: PASS nos 8 casos.

- [ ] **Step 5: Estender `ImovelInput` e `Filters`**

Em `backend-go/internal/modules/imoveis/dto.go`, adicione ao final de `ImovelInput`:
```go
	Finalidade    *string
	ValorAluguel  *string
	DiaVencimento *string
```

Localize a struct `Filters` (`grep -n "type Filters" internal/modules/imoveis/*.go`) e adicione:
```go
	// Finalidade filtra por 'aluguel' | 'venda' | 'ambos'. Vazio = todas.
	// Um imóvel com finalidade 'ambos' aparece tanto no filtro 'aluguel'
	// quanto no 'venda'.
	Finalidade string
```

- [ ] **Step 6: Aplicar o filtro no repository**

Em `backend-go/internal/modules/imoveis/repository.go`, no método que monta a query de listagem a partir de `Filters`, adicione:
```go
	switch f.Finalidade {
	case models.FinalidadeAluguel:
		q = q.Where("finalidade IN (?, ?)", models.FinalidadeAluguel, models.FinalidadeAmbos)
	case models.FinalidadeVenda:
		q = q.Where("finalidade IN (?, ?)", models.FinalidadeVenda, models.FinalidadeAmbos)
	}
```

- [ ] **Step 7: Chamar a validação no create/update do service**

No service de `imoveis`, nos métodos de criação e atualização, depois de converter os campos do form e antes de gravar, chame `ValidarFinalidade(...)` com os valores convertidos e propague o erro. Se `Finalidade` vier vazio no input, use `models.FinalidadeVenda` (o default da coluna), preservando o comportamento de quem já usava a tela de venda.

- [ ] **Step 8: Remover o CRUD de imóvel do módulo `alugueis`**

Em `backend-go/internal/modules/alugueis/repository.go`, remova: `ListAlugueis`, `ListAlugueisDisponiveis`, `FindAluguelByID`, `CreateAluguel`, `SaveAluguel` e o `Delete` de `models.Aluguel`.

Em `backend-go/internal/modules/alugueis/service.go`, remova: `ListAlugueis`, `ListAlugueisDisponiveis`, `CreateAluguel`, `UpdateAluguel`, `ToggleAlugado`, `DownloadFotosZip`.

Em `backend-go/internal/modules/alugueis/handler.go`, remova as rotas que chamavam esses métodos.

**Mantenha intactos** inquilino (`inquilino_service.go`), cobrança (`cobranca_service.go`), Asaas (`asaas.go`) e arquivos de contrato (`files.go`) — essa lógica pertence ao contrato de locação, não ao imóvel.

- [ ] **Step 9: Compilar**

Run: `cd backend-go && go build ./internal/modules/imoveis/ ./internal/modules/alugueis/`
Expected: sem erro. Os módulos `contratos`, `portalinquilino` e `vistorias` ainda quebram — Task 4.

- [ ] **Step 10: Commit**

```bash
git add backend-go/internal/modules/imoveis/ backend-go/internal/modules/alugueis/
git commit -m "feat(imoveis): cobre locacao e venda; alugueis perde o CRUD de imovel"
```

---

### Task 4: Adaptar `contratos`, `portalinquilino`, `vistorias` e `chamados`

**Files:**
- Modify: `backend-go/internal/modules/contratos/repository.go:27-50`
- Modify: `backend-go/internal/modules/contratos/service.go:71`
- Modify: `backend-go/internal/modules/contratos/template.go:14`
- Modify: `backend-go/internal/modules/contratos/dto.go`
- Modify: `backend-go/internal/modules/portalinquilino/repository.go:37`
- Modify: `backend-go/internal/modules/vistorias/repository.go:46,120`
- Modify: `backend-go/internal/modules/chamados/` (onde usar `AluguelID`)

**Interfaces:**
- Consumes: `models.Imovel` (Task 2).
- Produces: build limpo. `contratos.Repository.FindAluguel` passa a se chamar `FindImovel(ctx, id) (*models.Imovel, error)`; `ListAlugueis` → `ListImoveisLocacao(ctx) ([]models.Imovel, error)`; `GerarTextoContrato(inq *models.ClienteAluguel, imovel *models.Imovel) string`.

- [ ] **Step 1: Adaptar `contratos/repository.go`**

Troque `FindAluguel` por:
```go
// FindImovel busca o imóvel do contrato. Antes da fusão isso lia a tabela
// alugueis; hoje imóveis de locação e venda vivem em imoveis.
func (r *Repository) FindImovel(ctx context.Context, id uint) (*models.Imovel, error) {
	var im models.Imovel
	if err := r.db.WithContext(ctx).First(&im, id).Error; err != nil {
		return nil, err
	}
	return &im, nil
}
```
E `ListAlugueis` por:
```go
// ListImoveisLocacao devolve os imóveis anunciados para locação (inclui os de
// finalidade 'ambos').
func (r *Repository) ListImoveisLocacao(ctx context.Context) ([]models.Imovel, error) {
	var out []models.Imovel
	err := r.db.WithContext(ctx).
		Where("finalidade IN (?, ?)", models.FinalidadeAluguel, models.FinalidadeAmbos).
		Order("nome_imovel ASC").Find(&out).Error
	return out, err
}
```

- [ ] **Step 2: Adaptar `contratos/service.go` e `template.go`**

Em `service.go:71`, troque `var imovel *models.Aluguel` por `var imovel *models.Imovel` e ajuste a chamada de `FindAluguel` para `FindImovel`.

Em `template.go:14`, troque a assinatura para:
```go
func GerarTextoContrato(inq *models.ClienteAluguel, imovel *models.Imovel) string {
```
Dentro da função, os campos mudam de nome:

| Antes (`models.Aluguel`) | Agora (`models.Imovel`) |
|---|---|
| `imovel.NomeImovel` | `imovel.NomeImovel` (igual) |
| `imovel.Descricao` | `imovel.DescricaoImovel` (é `*string` — trate nil) |
| `imovel.ValorAluguel` (float64) | `imovel.ValorAluguel` (`*float64` — trate nil) |
| `imovel.DiaVencimento` (int) | `imovel.DiaVencimento` (`*int` — trate nil) |
| — | `imovel.Endereco` agora existe e deve entrar no contrato |

O endereço no contrato é um ganho real da fusão: antes o texto não tinha como incluí-lo, porque `alugueis` não guardava endereço.

- [ ] **Step 3: Adaptar `portalinquilino/repository.go:37`**

Mesma troca do Step 1: `FindAluguel` → `FindImovel`, devolvendo `*models.Imovel`. Ajuste os chamadores em `service.go` e `handler.go` do mesmo módulo.

- [ ] **Step 4: Adaptar `vistorias/repository.go`**

Na linha ~46, troque `Model(&models.Aluguel{})` por `Model(&models.Imovel{})` e a coluna `aluguel_id` por `imovel_id` na condição.
Na linha ~120, `FindAluguel` → `FindImovel` devolvendo `*models.Imovel`.
Ajuste `dto.go` e `service.go` do módulo onde `AluguelID` aparecer.

- [ ] **Step 5: Adaptar `chamados`**

Run: `cd backend-go && grep -rn "AluguelID\|aluguel_id" internal/modules/chamados/`
Troque cada ocorrência para `ImovelID` / `imovel_id`.

- [ ] **Step 6: Varrer o que sobrou**

Run:
```bash
cd backend-go && grep -rn "models.Aluguel\|AluguelID" internal/ --include=*.go
```
Expected: nenhuma saída. `ClienteAluguel` e `ClienteAluguelID` **devem** continuar aparecendo — são o inquilino, não o imóvel. Não os toque.

- [ ] **Step 7: Compilar e testar**

Run: `cd backend-go && go build ./... && go test ./...`
Expected: build limpo, testes passando.

- [ ] **Step 8: Commit**

```bash
git add backend-go/internal/modules/
git commit -m "refactor: contratos, portal, vistorias e chamados passam a usar Imovel"
```

---

### Task 5: Filtro de finalidade na vitrine pública

Sem isto, imóvel de locação aparece no site público de vendas. É o item mais fácil de esquecer do plano inteiro.

**Files:**
- Modify: `backend-go/internal/modules/imoveis/handler.go` (`ListPublico`, `Busca`, `Semelhantes`)

**Interfaces:**
- Consumes: `Filters.Finalidade` (Task 3).
- Produces: rotas públicas que nunca devolvem imóvel de finalidade `aluguel`.

- [ ] **Step 1: Escrever o teste que falha**

Adicione a `backend-go/internal/modules/imoveis/service_test.go`:
```go
// A vitrine pública é de venda. Um imóvel só de locação nunca pode aparecer
// nela; um de finalidade 'ambos' pode.
func TestFiltroPublicoExcluiLocacaoPura(t *testing.T) {
	f := FiltersPublicos()
	if f.Finalidade != "venda" {
		t.Fatalf("Finalidade = %q, quero \"venda\"", f.Finalidade)
	}
	if !f.ApenasDisponiveis {
		t.Fatal("vitrine pública precisa de ApenasDisponiveis")
	}
}
```

- [ ] **Step 2: Rodar para confirmar que falha**

Run: `cd backend-go && go test ./internal/modules/imoveis/ -run TestFiltroPublico -v`
Expected: FAIL — `undefined: FiltersPublicos`.

- [ ] **Step 3: Implementar**

Em `backend-go/internal/modules/imoveis/handler.go`, antes de `ListPublico`:
```go
// FiltersPublicos é a base obrigatória de toda rota da vitrine pública:
// só imóveis disponíveis e só os que estão à venda ('venda' ou 'ambos').
// Toda rota pública nova DEVE partir daqui.
func FiltersPublicos() Filters {
	return Filters{
		ApenasDisponiveis: true,
		Finalidade:        models.FinalidadeVenda,
	}
}
```
E em `ListPublico`, troque a construção do filtro por:
```go
	f := FiltersPublicos()
	f.Categoria = c.Query("categoria")
	f.Localizacao = c.Query("localizacao")
	f.Busca = c.Query("busca")
```
Aplique o mesmo em `Busca` e `Semelhantes`.

- [ ] **Step 4: Rodar o teste**

Run: `cd backend-go && go test ./internal/modules/imoveis/ -v`
Expected: PASS.

- [ ] **Step 5: Verificar de ponta a ponta**

Crie três imóveis (um de cada finalidade) e chame a rota pública:
```bash
psql "$DATABASE_URL" <<'SQL'
INSERT INTO imoveis (nome_imovel,endereco,tipo,quartos,banheiro,exclusivo,tem_inquilino,situacao_imovel,finalidade,valor_venda,valor_aluguel,dia_vencimento,tenant_id,"createdAt","updatedAt") VALUES
 ('Pub Aluguel','R1','casa',2,1,false,false,'disponivel','aluguel',NULL,1500,5,1,now(),now()),
 ('Pub Venda','R2','casa',2,1,false,false,'disponivel','venda',300000,NULL,NULL,1,now(),now()),
 ('Pub Ambos','R3','casa',2,1,false,false,'disponivel','ambos',300000,1500,5,1,now(),now());
SQL
curl -s "localhost:8080/api/public/imoveis" | grep -o '"nome_imovel":"[^"]*"'
```
Expected: `Pub Venda` e `Pub Ambos` aparecem; **`Pub Aluguel` não aparece**. Limpe:
```bash
psql "$DATABASE_URL" -c "DELETE FROM imoveis WHERE nome_imovel LIKE 'Pub %';"
```

- [ ] **Step 6: Commit**

```bash
git add backend-go/internal/modules/imoveis/
git commit -m "fix(imoveis): vitrine publica nunca lista imovel exclusivo de locacao"
```

---

### Task 6: Tela `/imoveis` unificada

**Files:**
- Modify: `frontend-next/src/components/ImovelForm.jsx`
- Modify: `frontend-next/src/components/ImoveisLista.jsx`
- Create: `frontend-next/src/app/(app)/imoveis/page.js`

**Interfaces:**
- Consumes: as rotas de `imoveis` com `finalidade`.
- Produces: rota `/imoveis` com filtro `?finalidade=`.

- [ ] **Step 1: Ler as convenções de Next deste projeto**

Run: `cd frontend-next && ls node_modules/next/dist/docs/`
Leia o guia de App Router antes de escrever. Este Next tem breaking changes em relação ao conhecimento geral.

- [ ] **Step 2: Adicionar finalidade ao formulário**

Em `frontend-next/src/components/ImovelForm.jsx`:
- No topo do formulário, um seletor de finalidade com três opções: Alugar / Vender / Alugar e vender. Estado `finalidade`, default `"venda"`.
- Bloco **Venda** (`valor_venda`, `valor_avaliacao`, `situacao_imovel`) visível quando `finalidade` for `venda` ou `ambos`.
- Bloco **Locação** (`valor_aluguel`, `dia_vencimento`) visível quando for `aluguel` ou `ambos`.
- Campos obrigatórios acompanham a visibilidade: `valor_venda` só é exigido se o bloco Venda estiver visível, e `valor_aluguel` + `dia_vencimento` só se o de Locação estiver. Isso espelha `ValidarFinalidade` no backend.
- Campos comuns (nome, endereço, tipo, quartos, banheiros, imagens) permanecem sempre visíveis.

- [ ] **Step 3: Adicionar o filtro à listagem**

Em `frontend-next/src/components/ImoveisLista.jsx`:
- Filtro com Todos / Para alugar / Para vender, refletido em `?finalidade=` na URL.
- Badge de finalidade em cada linha. Um imóvel `ambos` mostra os dois badges e aparece nos dois filtros.

- [ ] **Step 4: Criar a página**

`frontend-next/src/app/(app)/imoveis/page.js` renderizando `<ImoveisLista />`, seguindo a estrutura de `frontend-next/src/app/(app)/imoveis/lista/page.js`.

- [ ] **Step 5: Verificar**

Run: `cd frontend-next && npm run lint && npm run build`
Expected: sem erro.

Verificação manual:
1. `/imoveis` → cadastrar imóvel "Alugar e vender", preenchendo os dois blocos. Salvar.
2. Confirmar **uma** linha na listagem, com dois badges.
3. Filtrar por "Para alugar" → aparece. Filtrar por "Para vender" → aparece.
4. Cadastrar um só de locação sem `valor_venda` → deve salvar sem erro.
5. Tentar salvar um de venda sem `valor_venda` → o formulário deve bloquear.

- [ ] **Step 6: Commit**

```bash
git add frontend-next/src/components/ImovelForm.jsx frontend-next/src/components/ImoveisLista.jsx "frontend-next/src/app/(app)/imoveis/page.js"
git commit -m "feat(web): tela unica de imovel com finalidade aluguel, venda ou ambos"
```

---

### Task 7: Redirects das rotas antigas de imóvel

**Files:**
- Modify: `frontend-next/next.config.*`
- Delete: `frontend-next/src/app/(app)/alugueis/`, `frontend-next/src/app/(app)/imoveis/lista/`

**Interfaces:**
- Consumes: `/imoveis` (Task 6).
- Produces: redirects 308.

- [ ] **Step 1: Adicionar os redirects**

No array de `redirects()` (criado no plano 01 Task 9; se este plano rodar antes, crie a função conforme lá descrito):
```js
      { source: "/imoveis/lista", destination: "/imoveis", permanent: true },
      { source: "/alugueis", destination: "/imoveis?finalidade=aluguel", permanent: true },
      { source: "/alugueis/adicionar", destination: "/imoveis/adicionar", permanent: true },
```

- [ ] **Step 2: Remover as páginas antigas**

```bash
cd frontend-next
git rm -r "src/app/(app)/alugueis" "src/app/(app)/imoveis/lista"
```
Uma página que ainda existe vence o redirect, então a remoção é obrigatória.

- [ ] **Step 3: Verificar**

Run: `cd frontend-next && npm run lint && npm run build`
Expected: sem erro. Corrija imports quebrados apontando para os componentes novos.

```bash
curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' localhost:3000/alugueis
curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' localhost:3000/imoveis/lista
```
Expected: `308` com a URL nova.

- [ ] **Step 4: Commit**

```bash
git add -A frontend-next/
git commit -m "feat(web): redireciona /alugueis e /imoveis/lista para a tela unificada"
```

---

## Verificação final do plano

```bash
cd backend-go && go build ./... && go test ./...
cd ../frontend-next && npm run lint && npm run build
cd ../backend-go && grep -rn "models.Aluguel\|AluguelID" internal/ --include=*.go
```
O `grep` deve devolver vazio (ocorrências de `ClienteAluguel` são esperadas e corretas).

Os dois resultados que definem o sucesso:
1. Imóvel "ambos" é **uma** linha, presente nos dois filtros (Task 6, Step 5).
2. Imóvel exclusivo de locação **não** aparece na vitrine pública (Task 5, Step 5).
