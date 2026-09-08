# Registro das Avaliações do SIOPI — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Guardar no CRM as avaliações do SIOPI (aprovada, condicionada, reprovada) com histórico por cliente, calcular no servidor o percentual de comprometimento da renda, perguntar os dados num modal quando o status muda, e mostrar tudo numa página que reproduz a tela do banco.

**Architecture:** Uma tabela nova `cliente_avaliacoes` com um registro por avaliação; três endpoints REST no módulo `clientes`; um modal shadcn com três conjuntos de campos escolhidos pelo resultado; e a rota `/clientes/[id]/aprovacao` no App Router com destaque e histórico.

**Tech Stack:** Go + Gin + GORM + PostgreSQL (`backend-go`); golang-migrate para schema; Next.js App Router + React 19 + Tailwind v4 + shadcn/ui sobre Base UI (`frontend-next`).

**Spec:** `docs/superpowers/specs/2026-09-08-aprovacao-renda-parcela-design.md`

## Global Constraints

- Mapa de status para resultado, fixo: `cliente_aprovado` e `aprovado` → `aprovada`; `condicionado` → `condicionada`; `reprovado` → `reprovada`. Qualquer outro status não dispara nada. Os valores de status vêm do enum `models.StatusValidos` em `backend-go/internal/models/cliente.go:95`.
- Percentual: `parcela / renda_utilizada * 100`, arredondado a **uma** casa decimal. `600 / 2000` dá `30.0`.
- A parcela é `prestacao` numa avaliação `aprovada` e `valor_prestacao_possivel` numa `condicionada`. Uma `reprovada` não tem parcela nem renda, e o percentual fica nulo.
- O percentual persistido é sempre o calculado no servidor. Nenhum percentual enviado pelo cliente é aceito.
- `codigo_proposta` e `codigo_avaliacao` são obrigatórios (`422` se faltarem). Todos os demais campos são opcionais.
- Renda menor ou igual a zero ou parcela negativa é `422`. Renda **em branco** é permitida e deixa o percentual nulo.
- `valor_renda` do cliente nunca é sobrescrito por este fluxo.
- O isolamento de tenant é automático: os callbacks de `internal/tenant` injetam `tenant_id` no `INSERT` e no `WHERE` de todo model que tenha essa coluna (ver `internal/tenant/scope.go`). Nenhuma query deste plano filtra `tenant_id` na mão.
- Nenhuma classe nova em arquivo `.css`. UI só com os componentes de `frontend-next/src/components/ui/` e utilitárias do Tailwind. Cores só por token (`bg-cx-surface`, `border-cx-border`, `text-cx-muted`, `text-cx-text`) ou pelos tons já calibrados de `statusInfo` em `src/lib/cliente-status.js` — aqueles valores foram escolhidos no limite de contraste AA e não podem ser recriados a olho.
- Inputs dentro de `.crm-content` recebem `min-height: 48px` de `crm-design.css`, que vence utilitárias do Tailwind por especificidade. Use a classe `cx-input` do `ClienteDrawer` ou `h-12`.
- O `Button` de `components/ui/button.jsx` é do **Base UI**, não do Radix: não aceita `asChild`. Para renderizar como link, use `render={<Link href="..." />}` com `nativeButton={false}`.
- O frontend roda em `npm run dev`. Nunca `next build` + `next start` para verificar.

---

### Task 1: Tabela e model das avaliações

**Files:**
- Create: `backend-go/migrations/0010_cliente_avaliacoes.up.sql`
- Create: `backend-go/migrations/0010_cliente_avaliacoes.down.sql`
- Create: `backend-go/internal/models/cliente_avaliacao.go`

**Interfaces:**
- Consumes: nada.
- Produces: `models.ClienteAvaliacao`, com `TableName() == "cliente_avaliacoes"` e as constantes `models.ResultadoAprovada`, `models.ResultadoCondicionada`, `models.ResultadoReprovada`, além de `models.ResultadoPorStatus(status string) (string, bool)`.

- [ ] **Step 1: Escrever a migration de subida**

Criar `backend-go/migrations/0010_cliente_avaliacoes.up.sql`:

```sql
-- Avaliações do SIOPI. Cada proposta enviada à Caixa volta como uma tela com o
-- resultado da análise de risco; até aqui esses números só existiam como print
-- no WhatsApp do corretor.
--
-- É histórico, não estado: as capturas de referência mostram o mesmo CPF
-- reprovado em 03/09 e condicionado em 09/09. Uma avaliação nova não apaga a
-- anterior.
--
-- Os campos monetários são NUMERIC. A coluna clientes.valor_renda é VARCHAR com
-- o número formatado em pt-BR ("1.234,56"), herança da migração do backend Node
-- que obriga todo consumidor a fazer REPLACE/CAST em SQL — aqui isso não se
-- repete.
--
-- Os campos descritivos (produto, modalidade, origem_recurso, indexador,
-- sistema_amortizacao, sistema_originador) são texto livre de propósito: o
-- SIOPI muda a nomenclatura dos produtos sem aviso, e um CHECK obrigaria uma
-- migration a cada produto novo. Mesmo raciocínio da migration 0008 (origem).
CREATE TABLE IF NOT EXISTS cliente_avaliacoes (
    id                       BIGSERIAL PRIMARY KEY,
    cliente_id               BIGINT      NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
    tenant_id                BIGINT      NOT NULL,
    criado_por               BIGINT,
    resultado                VARCHAR(16) NOT NULL,

    -- comuns às três telas
    codigo_proposta          VARCHAR(40),
    codigo_avaliacao         VARCHAR(40),
    codigo_correspondente    VARCHAR(40),
    resposta_siric           TIMESTAMPTZ,

    -- tela "Reprovado"
    motivo_reprovacao        TEXT,

    -- tela "Condicionada"
    condicao_aprovacao       TEXT,
    valor_prestacao_possivel NUMERIC(12,2),

    -- tela "DADOS DA AVALIAÇÃO" (aprovada)
    protocolo_cadastro       VARCHAR(40),
    agencia_relacionamento   VARCHAR(20),
    validade_inicio          DATE,
    validade_fim             DATE,
    origem_recurso           VARCHAR(60),
    modalidade               VARCHAR(120),
    produto                  VARCHAR(160),
    valor_imovel             NUMERIC(12,2),
    valor_financiamento      NUMERIC(12,2),
    prestacao                NUMERIC(12,2),
    indexador                VARCHAR(20),
    sistema_amortizacao      VARCHAR(20),
    prazo_meses              INTEGER,
    sistema_originador       VARCHAR(40),

    -- cálculo do CRM, não vem do SIOPI
    renda_utilizada          NUMERIC(12,2),
    percentual_renda         NUMERIC(5,2),

    created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Exatamente como a página lê o histórico: as avaliações de um cliente, da mais
-- recente para a mais antiga, dentro do tenant.
CREATE INDEX IF NOT EXISTS idx_cliente_avaliacoes_cliente
    ON cliente_avaliacoes (tenant_id, cliente_id, created_at DESC);
```

- [ ] **Step 2: Escrever a migration de descida**

Criar `backend-go/migrations/0010_cliente_avaliacoes.down.sql`:

```sql
DROP INDEX IF EXISTS idx_cliente_avaliacoes_cliente;
DROP TABLE IF EXISTS cliente_avaliacoes;
```

- [ ] **Step 3: Escrever o model**

Criar `backend-go/internal/models/cliente_avaliacao.go`:

```go
package models

import "time"

// Resultados possíveis de uma avaliação do SIOPI. Correspondem às três telas
// que o correspondente recebe: "DADOS DA AVALIAÇÃO" (aprovada), "Condicionada"
// e "Reprovado".
const (
	ResultadoAprovada     = "aprovada"
	ResultadoCondicionada = "condicionada"
	ResultadoReprovada    = "reprovada"
)

// ClienteAvaliacao é um registro do que a Caixa respondeu sobre uma proposta.
//
// O Resultado é gravado na avaliação em vez de ser relido do cliente: o status
// do cliente muda com o tempo, e uma avaliação antiga precisa continuar dizendo
// o que ela foi.
//
// CPF e nome do cliente aparecem nas telas do SIOPI mas não são colunas aqui —
// já estão em `clientes`, e duplicá-los criaria duas verdades sobre o mesmo dado.
type ClienteAvaliacao struct {
	ID        uint   `gorm:"primaryKey" json:"id"`
	ClienteID uint   `gorm:"column:cliente_id;not null;index" json:"cliente_id"`
	TenantID  uint   `gorm:"column:tenant_id;not null;index" json:"tenant_id"`
	CriadoPor *uint  `gorm:"column:criado_por" json:"criado_por"`
	Resultado string `gorm:"column:resultado;not null" json:"resultado"`

	// Comuns às três telas.
	CodigoProposta       *string    `gorm:"column:codigo_proposta" json:"codigo_proposta"`
	CodigoAvaliacao      *string    `gorm:"column:codigo_avaliacao" json:"codigo_avaliacao"`
	CodigoCorrespondente *string    `gorm:"column:codigo_correspondente" json:"codigo_correspondente"`
	RespostaSiric        *time.Time `gorm:"column:resposta_siric" json:"resposta_siric"`

	// Tela "Reprovado".
	MotivoReprovacao *string `gorm:"column:motivo_reprovacao" json:"motivo_reprovacao"`

	// Tela "Condicionada".
	CondicaoAprovacao      *string  `gorm:"column:condicao_aprovacao" json:"condicao_aprovacao"`
	ValorPrestacaoPossivel *float64 `gorm:"column:valor_prestacao_possivel" json:"valor_prestacao_possivel"`

	// Tela "DADOS DA AVALIAÇÃO".
	ProtocoloCadastro     *string    `gorm:"column:protocolo_cadastro" json:"protocolo_cadastro"`
	AgenciaRelacionamento *string    `gorm:"column:agencia_relacionamento" json:"agencia_relacionamento"`
	ValidadeInicio        *time.Time `gorm:"column:validade_inicio" json:"validade_inicio"`
	ValidadeFim           *time.Time `gorm:"column:validade_fim" json:"validade_fim"`
	OrigemRecurso         *string    `gorm:"column:origem_recurso" json:"origem_recurso"`
	Modalidade            *string    `gorm:"column:modalidade" json:"modalidade"`
	Produto               *string    `gorm:"column:produto" json:"produto"`
	ValorImovel           *float64   `gorm:"column:valor_imovel" json:"valor_imovel"`
	ValorFinanciamento    *float64   `gorm:"column:valor_financiamento" json:"valor_financiamento"`
	Prestacao             *float64   `gorm:"column:prestacao" json:"prestacao"`
	Indexador             *string    `gorm:"column:indexador" json:"indexador"`
	SistemaAmortizacao    *string    `gorm:"column:sistema_amortizacao" json:"sistema_amortizacao"`
	PrazoMeses            *int       `gorm:"column:prazo_meses" json:"prazo_meses"`
	SistemaOriginador     *string    `gorm:"column:sistema_originador" json:"sistema_originador"`

	// Cálculo do CRM. RendaUtilizada é a renda que o BANCO usou, que pode
	// divergir legitimamente de clientes.valor_renda — os dois são preservados.
	RendaUtilizada  *float64 `gorm:"column:renda_utilizada" json:"renda_utilizada"`
	PercentualRenda *float64 `gorm:"column:percentual_renda" json:"percentual_renda"`

	CreatedAt time.Time `gorm:"column:created_at" json:"created_at"`
	UpdatedAt time.Time `gorm:"column:updated_at" json:"updated_at"`
}

func (ClienteAvaliacao) TableName() string { return "cliente_avaliacoes" }

// ResultadoPorStatus mapeia o status do cliente para o formato de tela que o
// SIOPI devolve. O segundo retorno é false para todo status que não representa
// uma decisão de avaliação — esses não pedem registro nenhum.
func ResultadoPorStatus(status string) (string, bool) {
	switch status {
	case "cliente_aprovado", "aprovado":
		return ResultadoAprovada, true
	case "condicionado":
		return ResultadoCondicionada, true
	case "reprovado":
		return ResultadoReprovada, true
	}
	return "", false
}
```

- [ ] **Step 4: Compilar**

Run: `cd backend-go && go build ./...`
Expected: sem saída.

- [ ] **Step 5: Rodar a migration**

A URL do banco está em `backend-go/.env` (`DATABASE_URL`). Com a CLI do golang-migrate instalada (`go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest`):

```bash
cd backend-go && migrate -path migrations -database "$DATABASE_URL" up
psql "$DATABASE_URL" -c "\d cliente_avaliacoes"
```

Expected: a migration sobe até `10`, e a tabela lista as colunas com os tipos declarados acima.

Se o Postgres local não estiver disponível, pare e avise — não siga adiante fingindo que a migration rodou.

- [ ] **Step 6: Commit**

```bash
git add backend-go/migrations/0010_cliente_avaliacoes.up.sql backend-go/migrations/0010_cliente_avaliacoes.down.sql backend-go/internal/models/cliente_avaliacao.go
git commit -m "feat(clientes): tabela e model das avaliacoes do SIOPI"
```

---

### Task 2: Cálculo e validação (funções puras, com teste)

**Files:**
- Create: `backend-go/internal/modules/clientes/avaliacoes.go`
- Test: `backend-go/internal/modules/clientes/avaliacoes_test.go`

**Interfaces:**
- Consumes: `models.ResultadoAprovada` e afins da Task 1.
- Produces:
  - `clientes.AvaliacaoInput` — struct com todos os campos do formulário, todos ponteiros exceto `Resultado string`, `CodigoProposta string` e `CodigoAvaliacao string`.
  - `clientes.ParcelaConsiderada(in AvaliacaoInput) *float64`
  - `clientes.CalcularPercentual(renda, parcela float64) (float64, error)`
  - `clientes.PercentualDaAvaliacao(in AvaliacaoInput) (*float64, error)`
  - `(AvaliacaoInput).Validar() error`

- [ ] **Step 1: Escrever o teste que falha**

Criar `backend-go/internal/modules/clientes/avaliacoes_test.go`:

```go
package clientes

import (
	"errors"
	"testing"

	"crmimob/internal/models"
)

func f(v float64) *float64 { return &v }

func TestCalcularPercentual(t *testing.T) {
	casos := []struct {
		nome    string
		renda   float64
		parcela float64
		quer    float64
	}{
		{"trinta por cento", 2000, 600, 30},
		{"vinte e cinco por cento", 2000, 500, 25},
		{"arredonda para uma casa", 3000, 823, 27.4},
		{"parcela zero", 2000, 0, 0},
	}
	for _, c := range casos {
		t.Run(c.nome, func(t *testing.T) {
			got, err := CalcularPercentual(c.renda, c.parcela)
			if err != nil {
				t.Fatalf("erro inesperado: %v", err)
			}
			if got != c.quer {
				t.Fatalf("CalcularPercentual(%v, %v) = %v; quer %v", c.renda, c.parcela, got, c.quer)
			}
		})
	}
}

func TestCalcularPercentualInvalido(t *testing.T) {
	if _, err := CalcularPercentual(0, 600); !errors.Is(err, ErrDadosInvalidos) {
		t.Fatalf("renda zero deveria ser ErrDadosInvalidos, veio %v", err)
	}
	if _, err := CalcularPercentual(2000, -1); !errors.Is(err, ErrDadosInvalidos) {
		t.Fatalf("parcela negativa deveria ser ErrDadosInvalidos, veio %v", err)
	}
}

func TestParcelaConsiderada(t *testing.T) {
	aprovada := AvaliacaoInput{Resultado: models.ResultadoAprovada, Prestacao: f(575), ValorPrestacaoPossivel: f(525)}
	if p := ParcelaConsiderada(aprovada); p == nil || *p != 575 {
		t.Fatalf("aprovada deveria usar Prestacao (575), veio %v", p)
	}
	condicionada := AvaliacaoInput{Resultado: models.ResultadoCondicionada, Prestacao: f(575), ValorPrestacaoPossivel: f(525)}
	if p := ParcelaConsiderada(condicionada); p == nil || *p != 525 {
		t.Fatalf("condicionada deveria usar ValorPrestacaoPossivel (525), veio %v", p)
	}
	reprovada := AvaliacaoInput{Resultado: models.ResultadoReprovada, Prestacao: f(575)}
	if p := ParcelaConsiderada(reprovada); p != nil {
		t.Fatalf("reprovada não tem parcela, veio %v", *p)
	}
}

func TestPercentualDaAvaliacao(t *testing.T) {
	in := AvaliacaoInput{Resultado: models.ResultadoCondicionada, ValorPrestacaoPossivel: f(525), RendaUtilizada: f(2100)}
	pct, err := PercentualDaAvaliacao(in)
	if err != nil {
		t.Fatalf("erro inesperado: %v", err)
	}
	if pct == nil || *pct != 25 {
		t.Fatalf("quer 25, veio %v", pct)
	}

	// Renda em branco significa "ainda não sei" — não é erro, é percentual nulo.
	semRenda := AvaliacaoInput{Resultado: models.ResultadoAprovada, Prestacao: f(575)}
	pct, err = PercentualDaAvaliacao(semRenda)
	if err != nil || pct != nil {
		t.Fatalf("sem renda quer (nil, nil), veio (%v, %v)", pct, err)
	}

	// Reprovada não tem parcela, logo não tem percentual.
	reprovada := AvaliacaoInput{Resultado: models.ResultadoReprovada, RendaUtilizada: f(2000)}
	pct, err = PercentualDaAvaliacao(reprovada)
	if err != nil || pct != nil {
		t.Fatalf("reprovada quer (nil, nil), veio (%v, %v)", pct, err)
	}

	// Renda zero informada explicitamente é entrada inválida.
	rendaZero := AvaliacaoInput{Resultado: models.ResultadoAprovada, Prestacao: f(575), RendaUtilizada: f(0)}
	if _, err := PercentualDaAvaliacao(rendaZero); !errors.Is(err, ErrDadosInvalidos) {
		t.Fatalf("renda zero deveria ser ErrDadosInvalidos, veio %v", err)
	}
}

func TestAvaliacaoInputValidar(t *testing.T) {
	ok := AvaliacaoInput{Resultado: models.ResultadoAprovada, CodigoProposta: "96668163", CodigoAvaliacao: "10086579010"}
	if err := ok.Validar(); err != nil {
		t.Fatalf("entrada válida recusada: %v", err)
	}
	semProposta := AvaliacaoInput{Resultado: models.ResultadoAprovada, CodigoAvaliacao: "10086579010"}
	if err := semProposta.Validar(); !errors.Is(err, ErrDadosInvalidos) {
		t.Fatalf("sem codigo_proposta deveria ser ErrDadosInvalidos, veio %v", err)
	}
	semAvaliacao := AvaliacaoInput{Resultado: models.ResultadoAprovada, CodigoProposta: "96668163"}
	if err := semAvaliacao.Validar(); !errors.Is(err, ErrDadosInvalidos) {
		t.Fatalf("sem codigo_avaliacao deveria ser ErrDadosInvalidos, veio %v", err)
	}
	resultadoInvalido := AvaliacaoInput{Resultado: "seila", CodigoProposta: "1", CodigoAvaliacao: "2"}
	if err := resultadoInvalido.Validar(); !errors.Is(err, ErrDadosInvalidos) {
		t.Fatalf("resultado fora do enum deveria ser ErrDadosInvalidos, veio %v", err)
	}
}
```

- [ ] **Step 2: Rodar o teste e ver falhar**

Run: `cd backend-go && go test ./internal/modules/clientes/ -run 'TestCalcularPercentual|TestParcelaConsiderada|TestPercentualDaAvaliacao|TestAvaliacaoInputValidar' -v`
Expected: FAIL na compilação, com `undefined: AvaliacaoInput`.

- [ ] **Step 3: Implementar o mínimo**

Criar `backend-go/internal/modules/clientes/avaliacoes.go`:

```go
package clientes

import (
	"math"
	"strings"
	"time"

	"crmimob/internal/models"
)

// AvaliacaoInput é o corpo de POST/PUT das rotas de avaliação. Todo campo que a
// tela do SIOPI pode não trazer é ponteiro: o corretor às vezes registra a
// avaliação antes de ter a tela inteira à mão.
type AvaliacaoInput struct {
	Resultado       string `json:"resultado"`
	CodigoProposta  string `json:"codigo_proposta"`
	CodigoAvaliacao string `json:"codigo_avaliacao"`

	CodigoCorrespondente *string    `json:"codigo_correspondente"`
	RespostaSiric        *time.Time `json:"resposta_siric"`

	MotivoReprovacao *string `json:"motivo_reprovacao"`

	CondicaoAprovacao      *string  `json:"condicao_aprovacao"`
	ValorPrestacaoPossivel *float64 `json:"valor_prestacao_possivel"`

	ProtocoloCadastro     *string    `json:"protocolo_cadastro"`
	AgenciaRelacionamento *string    `json:"agencia_relacionamento"`
	ValidadeInicio        *time.Time `json:"validade_inicio"`
	ValidadeFim           *time.Time `json:"validade_fim"`
	OrigemRecurso         *string    `json:"origem_recurso"`
	Modalidade            *string    `json:"modalidade"`
	Produto               *string    `json:"produto"`
	ValorImovel           *float64   `json:"valor_imovel"`
	ValorFinanciamento    *float64   `json:"valor_financiamento"`
	Prestacao             *float64   `json:"prestacao"`
	Indexador             *string    `json:"indexador"`
	SistemaAmortizacao    *string    `json:"sistema_amortizacao"`
	PrazoMeses            *int       `json:"prazo_meses"`
	SistemaOriginador     *string    `json:"sistema_originador"`

	RendaUtilizada *float64 `json:"renda_utilizada"`
}

// Validar recusa o que não identifica a avaliação. Só os dois códigos são
// exigidos: são o que permite achar a proposta no SIOPI depois.
func (in AvaliacaoInput) Validar() error {
	switch in.Resultado {
	case models.ResultadoAprovada, models.ResultadoCondicionada, models.ResultadoReprovada:
	default:
		return ErrDadosInvalidos
	}
	if strings.TrimSpace(in.CodigoProposta) == "" || strings.TrimSpace(in.CodigoAvaliacao) == "" {
		return ErrDadosInvalidos
	}
	if in.RendaUtilizada != nil && *in.RendaUtilizada < 0 {
		return ErrDadosInvalidos
	}
	return nil
}

// ParcelaConsiderada devolve a parcela que entra no cálculo do comprometimento.
// A tela aprovada traz "Prestação"; a condicionada traz "Valor da prestação
// Possível"; a reprovada não traz parcela nenhuma.
func ParcelaConsiderada(in AvaliacaoInput) *float64 {
	switch in.Resultado {
	case models.ResultadoAprovada:
		return in.Prestacao
	case models.ResultadoCondicionada:
		return in.ValorPrestacaoPossivel
	}
	return nil
}

// CalcularPercentual devolve o comprometimento da renda pela parcela,
// arredondado a uma casa decimal: renda de 2000 com parcela de 600 dá 30.
//
// Esta é a única fonte do percentual no sistema. O frontend recalcula o mesmo
// número enquanto o corretor digita, mas só para retorno visual imediato.
func CalcularPercentual(renda, parcela float64) (float64, error) {
	if renda <= 0 || parcela < 0 {
		return 0, ErrDadosInvalidos
	}
	return math.Round(parcela/renda*1000) / 10, nil
}

// PercentualDaAvaliacao aplica o cálculo à avaliação inteira. Devolve (nil, nil)
// quando não há o que calcular — sem renda informada ou sem parcela no formato.
// Renda informada como zero ou negativa é outra coisa: é entrada inválida.
func PercentualDaAvaliacao(in AvaliacaoInput) (*float64, error) {
	parcela := ParcelaConsiderada(in)
	if in.RendaUtilizada == nil || parcela == nil {
		return nil, nil
	}
	pct, err := CalcularPercentual(*in.RendaUtilizada, *parcela)
	if err != nil {
		return nil, err
	}
	return &pct, nil
}
```

- [ ] **Step 4: Rodar os testes e ver passar**

Run: `cd backend-go && go test ./internal/modules/clientes/ -v`
Expected: PASS em todos os subtestes.

- [ ] **Step 5: Commit**

```bash
git add backend-go/internal/modules/clientes/avaliacoes.go backend-go/internal/modules/clientes/avaliacoes_test.go
git commit -m "feat(clientes): calculo e validacao das avaliacoes"
```

---

### Task 3: Repositório, serviço, handlers e rotas

**Files:**
- Create: `backend-go/internal/modules/clientes/avaliacoes_service.go`
- Create: `backend-go/internal/modules/clientes/avaliacoes_handler.go`
- Modify: `backend-go/internal/modules/clientes/routes.go` (dentro do bloco `g := rg.Group("/clientes")`)

**Interfaces:**
- Consumes: `AvaliacaoInput`, `PercentualDaAvaliacao` e `Validar` da Task 2; `models.ClienteAvaliacao` da Task 1; `ErrNaoEncontrado`, `ErrSemPermissao` e `ErrDadosInvalidos` de `service.go:16-18`; `CanAccessClient(actor, c)` de `service.go:339`; `respondClienteErr(c, err)` de `handler.go:655`; `parseID(c)`; `auth.UserFrom(c)`.
- Produces: as rotas `POST /clientes/:id/avaliacoes`, `GET /clientes/:id/avaliacoes` e `PUT /clientes/:id/avaliacoes/:avaliacaoId`, todas respondendo `{"avaliacao": …}` ou `{"avaliacoes": […]}`.

- [ ] **Step 1: Escrever repositório e serviço**

Criar `backend-go/internal/modules/clientes/avaliacoes_service.go`:

```go
package clientes

import (
	"context"

	"crmimob/internal/models"
)

// --- Repositório ---
//
// Nenhum método aqui filtra tenant_id: os callbacks de internal/tenant injetam
// o tenant no INSERT e no WHERE de todo model que tenha a coluna, desde que o
// contexto tenha passado por middleware.ResolveTenant (ver tenant/scope.go).

func (r *Repository) CriarAvaliacao(ctx context.Context, a *models.ClienteAvaliacao) error {
	return r.db.WithContext(ctx).Create(a).Error
}

func (r *Repository) SalvarAvaliacao(ctx context.Context, a *models.ClienteAvaliacao) error {
	return r.db.WithContext(ctx).Save(a).Error
}

func (r *Repository) ListarAvaliacoes(ctx context.Context, clienteID uint) ([]models.ClienteAvaliacao, error) {
	var out []models.ClienteAvaliacao
	err := r.db.WithContext(ctx).
		Where("cliente_id = ?", clienteID).
		Order("created_at DESC").
		Find(&out).Error
	return out, err
}

func (r *Repository) BuscarAvaliacao(ctx context.Context, clienteID, avaliacaoID uint) (*models.ClienteAvaliacao, error) {
	var a models.ClienteAvaliacao
	err := r.db.WithContext(ctx).
		Where("id = ? AND cliente_id = ?", avaliacaoID, clienteID).
		First(&a).Error
	if err != nil {
		return nil, err
	}
	return &a, nil
}

// --- Serviço ---

// aplicaInput copia o formulário sobre o registro. Fica num lugar só para que
// criar e editar não divirjam com o tempo.
func aplicaInput(a *models.ClienteAvaliacao, in AvaliacaoInput, pct *float64) {
	a.Resultado = in.Resultado
	a.CodigoProposta = &in.CodigoProposta
	a.CodigoAvaliacao = &in.CodigoAvaliacao
	a.CodigoCorrespondente = in.CodigoCorrespondente
	a.RespostaSiric = in.RespostaSiric
	a.MotivoReprovacao = in.MotivoReprovacao
	a.CondicaoAprovacao = in.CondicaoAprovacao
	a.ValorPrestacaoPossivel = in.ValorPrestacaoPossivel
	a.ProtocoloCadastro = in.ProtocoloCadastro
	a.AgenciaRelacionamento = in.AgenciaRelacionamento
	a.ValidadeInicio = in.ValidadeInicio
	a.ValidadeFim = in.ValidadeFim
	a.OrigemRecurso = in.OrigemRecurso
	a.Modalidade = in.Modalidade
	a.Produto = in.Produto
	a.ValorImovel = in.ValorImovel
	a.ValorFinanciamento = in.ValorFinanciamento
	a.Prestacao = in.Prestacao
	a.Indexador = in.Indexador
	a.SistemaAmortizacao = in.SistemaAmortizacao
	a.PrazoMeses = in.PrazoMeses
	a.SistemaOriginador = in.SistemaOriginador
	a.RendaUtilizada = in.RendaUtilizada
	a.PercentualRenda = pct
}

func (s *Service) CriarAvaliacao(ctx context.Context, clienteID uint, in AvaliacaoInput, actor *models.User) (*models.ClienteAvaliacao, error) {
	if err := in.Validar(); err != nil {
		return nil, err
	}
	pct, err := PercentualDaAvaliacao(in)
	if err != nil {
		return nil, err
	}
	c, err := s.repo.FindByID(ctx, clienteID)
	if err != nil {
		return nil, ErrNaoEncontrado
	}
	if !CanAccessClient(actor, c) {
		return nil, ErrSemPermissao
	}
	a := &models.ClienteAvaliacao{ClienteID: clienteID, TenantID: c.TenantID, CriadoPor: &actor.ID}
	aplicaInput(a, in, pct)
	if err := s.repo.CriarAvaliacao(ctx, a); err != nil {
		return nil, err
	}
	return a, nil
}

func (s *Service) AtualizarAvaliacao(ctx context.Context, clienteID, avaliacaoID uint, in AvaliacaoInput, actor *models.User) (*models.ClienteAvaliacao, error) {
	if err := in.Validar(); err != nil {
		return nil, err
	}
	pct, err := PercentualDaAvaliacao(in)
	if err != nil {
		return nil, err
	}
	c, err := s.repo.FindByID(ctx, clienteID)
	if err != nil {
		return nil, ErrNaoEncontrado
	}
	if !CanAccessClient(actor, c) {
		return nil, ErrSemPermissao
	}
	a, err := s.repo.BuscarAvaliacao(ctx, clienteID, avaliacaoID)
	if err != nil {
		return nil, ErrNaoEncontrado
	}
	aplicaInput(a, in, pct)
	if err := s.repo.SalvarAvaliacao(ctx, a); err != nil {
		return nil, err
	}
	return a, nil
}

func (s *Service) ListarAvaliacoes(ctx context.Context, clienteID uint, actor *models.User) ([]models.ClienteAvaliacao, error) {
	c, err := s.repo.FindByID(ctx, clienteID)
	if err != nil {
		return nil, ErrNaoEncontrado
	}
	if !CanAccessClient(actor, c) {
		return nil, ErrSemPermissao
	}
	return s.repo.ListarAvaliacoes(ctx, clienteID)
}
```

- [ ] **Step 2: Escrever os handlers**

Criar `backend-go/internal/modules/clientes/avaliacoes_handler.go`:

```go
package clientes

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"crmimob/internal/auth"
)

// bindAvaliacao concentra o preâmbulo repetido de POST e PUT: quem é o ator,
// qual o cliente, e o corpo já validado.
func bindAvaliacao(c *gin.Context) (uint, AvaliacaoInput, bool) {
	var in AvaliacaoInput
	id, err := parseID(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id inválido"})
		return 0, in, false
	}
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": "Dados da avaliação inválidos"})
		return 0, in, false
	}
	if err := in.Validar(); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": "Resultado, código da proposta e código da avaliação são obrigatórios"})
		return 0, in, false
	}
	return id, in, true
}

// CriarAvaliacao — POST /clientes/:id/avaliacoes.
func (h *Handler) CriarAvaliacao(c *gin.Context) {
	actor, ok := auth.UserFrom(c)
	if !ok {
		c.JSON(http.StatusForbidden, gin.H{"error": "Não autorizado"})
		return
	}
	id, in, ok := bindAvaliacao(c)
	if !ok {
		return
	}
	a, err := h.svc.CriarAvaliacao(c.Request.Context(), id, in, actor)
	if err != nil {
		respondAvaliacaoErr(c, err)
		return
	}
	c.JSON(http.StatusCreated, gin.H{"message": "Avaliação registrada com sucesso", "avaliacao": a})
}

// AtualizarAvaliacao — PUT /clientes/:id/avaliacoes/:avaliacaoId.
func (h *Handler) AtualizarAvaliacao(c *gin.Context) {
	actor, ok := auth.UserFrom(c)
	if !ok {
		c.JSON(http.StatusForbidden, gin.H{"error": "Não autorizado"})
		return
	}
	id, in, ok := bindAvaliacao(c)
	if !ok {
		return
	}
	avaliacaoID, err := strconv.ParseUint(c.Param("avaliacaoId"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id da avaliação inválido"})
		return
	}
	a, err := h.svc.AtualizarAvaliacao(c.Request.Context(), id, uint(avaliacaoID), in, actor)
	if err != nil {
		respondAvaliacaoErr(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Avaliação atualizada com sucesso", "avaliacao": a})
}

// ListarAvaliacoes — GET /clientes/:id/avaliacoes.
func (h *Handler) ListarAvaliacoes(c *gin.Context) {
	actor, ok := auth.UserFrom(c)
	if !ok {
		c.JSON(http.StatusForbidden, gin.H{"error": "Não autorizado"})
		return
	}
	id, err := parseID(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id inválido"})
		return
	}
	lista, err := h.svc.ListarAvaliacoes(c.Request.Context(), id, actor)
	if err != nil {
		respondAvaliacaoErr(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"avaliacoes": lista})
}

// respondAvaliacaoErr reaproveita o mapeamento do módulo, mas devolve 422 para
// dados inválidos — as rotas de avaliação distinguem "requisição malformada"
// (400) de "campos que não formam uma avaliação" (422).
func respondAvaliacaoErr(c *gin.Context, err error) {
	if err == ErrDadosInvalidos {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": "Dados da avaliação inválidos"})
		return
	}
	respondClienteErr(c, err)
}
```

- [ ] **Step 3: Registrar as rotas**

Em `backend-go/internal/modules/clientes/routes.go`, logo depois da linha `g.PATCH("/:id/status", h.UpdateStatus)`:

```go
		// Avaliações do SIOPI. Registradas antes das rotas de documento porque
		// o Gin casa na ordem e "/:id/documentos/:tipo" tem curinga no segundo
		// segmento.
		g.GET("/:id/avaliacoes", h.ListarAvaliacoes)
		g.POST("/:id/avaliacoes", h.CriarAvaliacao)
		g.PUT("/:id/avaliacoes/:avaliacaoId", h.AtualizarAvaliacao)
```

- [ ] **Step 4: Compilar e rodar os testes**

Run: `cd backend-go && go build ./... && go test ./internal/modules/clientes/ -v`
Expected: build sem saída; testes PASS.

Se o Gin reclamar de conflito de wildcard ao subir (`panic: ':avaliacaoId' in new path ... conflicts with existing wildcard`), mova as três linhas para depois do bloco de rotas de documento e rode de novo.

- [ ] **Step 5: Conferir os endpoints contra o servidor**

Suba a API (`cd backend-go && go run ./cmd/api`). Com um token válido e um id de cliente existente — confirme o prefixo real das rotas em `backend-go/internal/server/router.go` se `/api/clientes` não responder:

```bash
curl -i -X POST "http://localhost:8001/api/clientes/1/avaliacoes" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"resultado":"condicionada","codigo_proposta":"96975914","codigo_avaliacao":"10087942360","valor_prestacao_possivel":525,"renda_utilizada":2100,"condicao_aprovacao":"Proponente com margem insuficiente"}'
```

Expected: `HTTP/1.1 201`, com `"percentual_renda":25` no corpo.

```bash
curl -i -X POST "http://localhost:8001/api/clientes/1/avaliacoes" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"resultado":"aprovada","codigo_avaliacao":"10086579010"}'
```

Expected: `HTTP/1.1 422`.

```bash
curl -s "http://localhost:8001/api/clientes/1/avaliacoes" -H "Authorization: Bearer $TOKEN"
```

Expected: `{"avaliacoes":[…]}` com a avaliação criada.

- [ ] **Step 6: Commit**

```bash
git add backend-go/internal/modules/clientes/avaliacoes_service.go backend-go/internal/modules/clientes/avaliacoes_handler.go backend-go/internal/modules/clientes/routes.go
git commit -m "feat(clientes): endpoints de avaliacao do SIOPI"
```

---

### Task 4: Regras das avaliações no frontend (módulo puro)

**Files:**
- Create: `frontend-next/src/lib/avaliacao.js`

**Interfaces:**
- Consumes: nada.
- Produces: `RESULTADO_POR_STATUS`, `resultadoPorStatus(status)`, `RESULTADO_LABEL`, `CAMPOS_POR_RESULTADO`, `parcelaConsiderada({resultado, prestacao, valor_prestacao_possivel})`, `percentualDaRenda(renda, parcela)` e `formatarPercentual(pct)`. As Tasks 5, 6 e 7 importam daqui.

- [ ] **Step 1: Escrever o módulo**

Criar `frontend-next/src/lib/avaliacao.js`:

```js
// Regras das avaliações do SIOPI, isoladas da UI para que o modal, a lista, o
// drawer e a página concordem sobre quando perguntar, o que perguntar e como
// calcular. O percentual persistido é sempre o que o backend devolve — o daqui
// serve ao retorno visual enquanto o corretor digita.

// Espelha models.ResultadoPorStatus no Go. Só estes status representam uma
// decisão de avaliação; os demais não pedem registro nenhum.
export const RESULTADO_POR_STATUS = {
  cliente_aprovado: "aprovada",
  aprovado: "aprovada",
  condicionado: "condicionada",
  reprovado: "reprovada",
};

export function resultadoPorStatus(status) {
  return RESULTADO_POR_STATUS[status] || null;
}

export const RESULTADO_LABEL = {
  aprovada: "Aprovada",
  condicionada: "Condicionada",
  reprovada: "Reprovada",
};

// Os campos de cada tela, na ordem em que o SIOPI os mostra — a ordem importa:
// o corretor preenche olhando para o print, de cima para baixo.
// `tipo` decide o controle: texto, area, dinheiro, data, datahora ou inteiro.
export const CAMPOS_POR_RESULTADO = {
  aprovada: [
    { nome: "codigo_proposta", label: "Código Proposta", tipo: "texto" },
    { nome: "codigo_avaliacao", label: "Código Avaliação", tipo: "texto" },
    { nome: "protocolo_cadastro", label: "Protocolo do Cadastro", tipo: "texto" },
    { nome: "validade_inicio", label: "Validade — início", tipo: "data" },
    { nome: "validade_fim", label: "Validade — fim", tipo: "data" },
    { nome: "origem_recurso", label: "Origem de Recurso", tipo: "texto" },
    { nome: "modalidade", label: "Modalidade", tipo: "texto" },
    { nome: "produto", label: "Produto", tipo: "texto" },
    { nome: "valor_imovel", label: "Valor do Imóvel", tipo: "dinheiro" },
    { nome: "valor_financiamento", label: "Valor Financiamento", tipo: "dinheiro" },
    { nome: "prestacao", label: "Prestação", tipo: "dinheiro" },
    { nome: "indexador", label: "Indexador", tipo: "texto" },
    { nome: "sistema_amortizacao", label: "Sistema de Amortização", tipo: "texto" },
    { nome: "prazo_meses", label: "Prazo (meses)", tipo: "inteiro" },
    { nome: "sistema_originador", label: "Sistema Originador", tipo: "texto" },
    { nome: "agencia_relacionamento", label: "Agência de relacionamento", tipo: "texto" },
  ],
  condicionada: [
    { nome: "codigo_proposta", label: "Código Proposta", tipo: "texto" },
    { nome: "codigo_avaliacao", label: "Código Avaliação", tipo: "texto" },
    { nome: "codigo_correspondente", label: "Código do Correspondente", tipo: "texto" },
    { nome: "condicao_aprovacao", label: "Condição de Aprovação", tipo: "area" },
    { nome: "valor_prestacao_possivel", label: "Valor da prestação possível", tipo: "dinheiro" },
    { nome: "resposta_siric", label: "Resposta SIRIC", tipo: "datahora" },
  ],
  reprovada: [
    { nome: "codigo_proposta", label: "Código Proposta", tipo: "texto" },
    { nome: "codigo_avaliacao", label: "Código Avaliação", tipo: "texto" },
    { nome: "codigo_correspondente", label: "Código do Correspondente", tipo: "texto" },
    { nome: "motivo_reprovacao", label: "Motivo da Reprovação", tipo: "area" },
    { nome: "resposta_siric", label: "Resposta SIRIC", tipo: "datahora" },
  ],
};

// A tela aprovada traz "Prestação"; a condicionada traz "Valor da prestação
// Possível"; a reprovada não traz parcela nenhuma.
export function parcelaConsiderada(av) {
  if (!av) return null;
  if (av.resultado === "aprovada") return av.prestacao ?? null;
  if (av.resultado === "condicionada") return av.valor_prestacao_possivel ?? null;
  return null;
}

// Espelha clientes.CalcularPercentual no Go: parcela / renda * 100, uma casa.
export function percentualDaRenda(renda, parcela) {
  const r = Number(renda);
  const p = Number(parcela);
  if (!Number.isFinite(r) || !Number.isFinite(p) || r <= 0 || p < 0) return null;
  return Math.round((p / r) * 1000) / 10;
}

export function formatarPercentual(pct) {
  if (pct === null || pct === undefined) return "—";
  return `${Number(pct).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}
```

- [ ] **Step 2: Verificar as regras no node**

Run:

```bash
cd frontend-next && node --input-type=module -e "
import { resultadoPorStatus, parcelaConsiderada, percentualDaRenda, formatarPercentual, CAMPOS_POR_RESULTADO } from './src/lib/avaliacao.js';
console.log(resultadoPorStatus('condicionado'), resultadoPorStatus('cliente_aprovado'), resultadoPorStatus('reserva'));
console.log(parcelaConsiderada({ resultado: 'aprovada', prestacao: 575, valor_prestacao_possivel: 525 }));
console.log(parcelaConsiderada({ resultado: 'condicionada', prestacao: 575, valor_prestacao_possivel: 525 }));
console.log(parcelaConsiderada({ resultado: 'reprovada', prestacao: 575 }));
console.log(percentualDaRenda(2000, 600), percentualDaRenda(2100, 525), percentualDaRenda(0, 600));
console.log(formatarPercentual(30), formatarPercentual(null));
console.log(CAMPOS_POR_RESULTADO.aprovada.length, CAMPOS_POR_RESULTADO.condicionada.length, CAMPOS_POR_RESULTADO.reprovada.length);
"
```

Expected, linha a linha: `condicionada aprovada null`; `575`; `525`; `null`; `30 25 null`; `30,0% —`; `16 6 5`.

- [ ] **Step 3: Rodar o lint**

Run: `cd frontend-next && npm run lint`
Expected: sem erros novos.

- [ ] **Step 4: Commit**

```bash
git add frontend-next/src/lib/avaliacao.js
git commit -m "feat(frontend): regras das avaliacoes do SIOPI"
```

---

### Task 5: Modal de avaliação

**Files:**
- Create: `frontend-next/src/components/AvaliacaoModal.jsx`

**Interfaces:**
- Consumes: `CAMPOS_POR_RESULTADO`, `RESULTADO_LABEL`, `parcelaConsiderada`, `percentualDaRenda` e `formatarPercentual` da Task 4; os endpoints da Task 3.
- Produces: o componente `AvaliacaoModal`, com as props `{ clienteId, clienteNome, valorRenda, resultado, avaliacao, aberto, onFechar, onSalvo }`. `avaliacao` é `null` para criação, ou o registro a editar. `onSalvo(avaliacaoSalva)` roda depois do `201`/`200`. Consumido pelas Tasks 6 e 7.

- [ ] **Step 1: Escrever o modal**

Criar `frontend-next/src/components/AvaliacaoModal.jsx`:

```jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  CAMPOS_POR_RESULTADO, RESULTADO_LABEL, parcelaConsiderada, percentualDaRenda, formatarPercentual,
} from "@/lib/avaliacao";

// Dinheiro é guardado como string de dígitos de centavo, igual ao ClienteDrawer:
// a máscara pt-BR é derivada na exibição e o número real sai da divisão por 100.
const onlyDigits = (v) => (v || "").toString().replace(/\D/g, "");
const centavosToBRL = (digits) =>
  digits
    ? (Number(digits) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : "";
const paraNumero = (digits) => (digits ? Number(digits) / 100 : null);
const numeroParaCentavos = (n) =>
  n === null || n === undefined || n === "" ? "" : String(Math.round(Number(n) * 100));

// valor_renda do cadastro é VARCHAR pt-BR ("2.000,00").
const rendaCadastroEmCentavos = (valorRenda) => {
  if (!valorRenda) return "";
  const n = Number(String(valorRenda).replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? String(Math.round(n * 100)) : "";
};

const TIPOS_DINHEIRO = new Set(["dinheiro"]);

export default function AvaliacaoModal({
  clienteId, clienteNome, valorRenda, resultado, avaliacao, aberto, onFechar, onSalvo,
}) {
  const router = useRouter();
  const campos = CAMPOS_POR_RESULTADO[resultado] || [];
  const pedeRenda = resultado === "aprovada" || resultado === "condicionada";

  const [form, setForm] = useState({});
  const [renda, setRenda] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  const rendaCadastro = rendaCadastroEmCentavos(valorRenda);

  useEffect(() => {
    if (!aberto) return;
    const inicial = {};
    for (const campo of campos) {
      const bruto = avaliacao?.[campo.nome];
      if (bruto === null || bruto === undefined) { inicial[campo.nome] = ""; continue; }
      if (TIPOS_DINHEIRO.has(campo.tipo)) inicial[campo.nome] = numeroParaCentavos(bruto);
      else if (campo.tipo === "data") inicial[campo.nome] = String(bruto).slice(0, 10);
      else if (campo.tipo === "datahora") inicial[campo.nome] = String(bruto).slice(0, 16);
      else inicial[campo.nome] = String(bruto);
    }
    setForm(inicial);
    setRenda(
      avaliacao?.renda_utilizada != null ? numeroParaCentavos(avaliacao.renda_utilizada) : rendaCadastro
    );
    setErro("");
  }, [aberto, avaliacao, resultado, rendaCadastro, campos]);

  const parcela = useMemo(() => {
    const base = { resultado };
    if (resultado === "aprovada") base.prestacao = paraNumero(form.prestacao);
    if (resultado === "condicionada") base.valor_prestacao_possivel = paraNumero(form.valor_prestacao_possivel);
    return parcelaConsiderada(base);
  }, [form, resultado]);

  const pct = useMemo(
    () => (pedeRenda ? percentualDaRenda(paraNumero(renda), parcela) : null),
    [pedeRenda, renda, parcela]
  );
  const divergente = !!rendaCadastro && !!renda && renda !== rendaCadastro;

  const setCampo = (nome, valor) => setForm((f) => ({ ...f, [nome]: valor }));

  const montarCorpo = () => {
    const corpo = { resultado };
    for (const campo of campos) {
      const v = form[campo.nome];
      if (v === "" || v === undefined) continue;
      if (TIPOS_DINHEIRO.has(campo.tipo)) corpo[campo.nome] = paraNumero(v);
      else if (campo.tipo === "inteiro") corpo[campo.nome] = Number(v);
      else if (campo.tipo === "data") corpo[campo.nome] = new Date(`${v}T00:00:00`).toISOString();
      else if (campo.tipo === "datahora") corpo[campo.nome] = new Date(v).toISOString();
      else corpo[campo.nome] = v;
    }
    // Obrigatórios sempre viajam como string, mesmo vazios: quem recusa é o
    // servidor, com a mensagem certa.
    corpo.codigo_proposta = form.codigo_proposta || "";
    corpo.codigo_avaliacao = form.codigo_avaliacao || "";
    if (pedeRenda) corpo.renda_utilizada = paraNumero(renda);
    return corpo;
  };

  const salvar = async (navegar) => {
    setErro("");
    setSalvando(true);
    try {
      const editando = !!avaliacao?.id;
      const url = editando
        ? `/api/backend/clientes/${clienteId}/avaliacoes/${avaliacao.id}`
        : `/api/backend/clientes/${clienteId}/avaliacoes`;
      const res = await fetch(url, {
        method: editando ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(montarCorpo()),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Não foi possível salvar a avaliação");
      onSalvo?.(data?.avaliacao);
      onFechar?.();
      if (navegar) router.push(`/clientes/${clienteId}/aprovacao`);
    } catch (e) {
      setErro(e.message);
    } finally {
      setSalvando(false);
    }
  };

  if (!resultado) return null;

  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && !salvando && onFechar?.()}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Avaliação {RESULTADO_LABEL[resultado]}</DialogTitle>
          <DialogDescription>
            Os dados da tela do SIOPI de {clienteNome || "este cliente"}.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          {campos.map((campo) => (
            <div key={campo.nome} className={campo.tipo === "area" ? "sm:col-span-2" : ""}>
              <label className="mb-1 block text-[11px] font-medium text-cx-muted" htmlFor={`av-${campo.nome}`}>
                {campo.label}
              </label>
              {campo.tipo === "area" ? (
                <textarea
                  id={`av-${campo.nome}`}
                  rows={3}
                  value={form[campo.nome] || ""}
                  onChange={(e) => setCampo(campo.nome, e.target.value)}
                  className="cx-input"
                />
              ) : campo.tipo === "dinheiro" ? (
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-cx-muted">R$</span>
                  <input
                    id={`av-${campo.nome}`}
                    inputMode="numeric"
                    value={centavosToBRL(form[campo.nome]) || "0,00"}
                    onChange={(e) => setCampo(campo.nome, onlyDigits(e.target.value))}
                    style={{ paddingLeft: "2.25rem" }}
                    className="cx-input tabular-nums"
                  />
                </div>
              ) : (
                <input
                  id={`av-${campo.nome}`}
                  type={campo.tipo === "data" ? "date" : campo.tipo === "datahora" ? "datetime-local" : "text"}
                  inputMode={campo.tipo === "inteiro" ? "numeric" : undefined}
                  value={form[campo.nome] || ""}
                  onChange={(e) =>
                    setCampo(campo.nome, campo.tipo === "inteiro" ? onlyDigits(e.target.value) : e.target.value)
                  }
                  className="cx-input"
                />
              )}
            </div>
          ))}

          {pedeRenda ? (
            <>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-cx-muted" htmlFor="av-renda">
                  Renda utilizada na aprovação
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-cx-muted">R$</span>
                  <input
                    id="av-renda"
                    inputMode="numeric"
                    value={centavosToBRL(renda) || "0,00"}
                    onChange={(e) => setRenda(onlyDigits(e.target.value))}
                    style={{ paddingLeft: "2.25rem" }}
                    className="cx-input tabular-nums"
                  />
                </div>
                {rendaCadastro ? (
                  <p className="mt-1 text-[11px] text-cx-muted">
                    No cadastro: R$ {centavosToBRL(rendaCadastro)}
                    {divergente ? " — diferente do valor acima" : ""}
                  </p>
                ) : null}
              </div>

              <div className="rounded-lg border border-cx-border bg-cx-surface px-4 py-3">
                <p className="text-[11px] font-medium text-cx-muted">Comprometimento da renda</p>
                <p className="text-2xl font-semibold tabular-nums text-cx-text">{formatarPercentual(pct)}</p>
              </div>
            </>
          ) : null}
        </div>

        {erro ? <p className="text-xs text-red-600">{erro}</p> : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => onFechar?.()} disabled={salvando}>
            Depois
          </Button>
          <Button onClick={() => salvar(true)} disabled={salvando}>
            {salvando ? "Salvando…" : "Salvar e abrir a avaliação"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

Confira as variantes disponíveis em `frontend-next/src/components/ui/button.jsx` antes de usar `variant="outline"`; se não existir, use a equivalente que já está no projeto — não invente classe.

- [ ] **Step 2: Rodar o lint**

Run: `cd frontend-next && npm run lint`
Expected: sem erros novos.

- [ ] **Step 3: Commit**

```bash
git add frontend-next/src/components/AvaliacaoModal.jsx
git commit -m "feat(frontend): modal de avaliacao com os tres formatos do SIOPI"
```

---

### Task 6: Gatilhos na lista e no drawer

**Files:**
- Modify: `frontend-next/src/components/ClientesLista.jsx` (função `changeStatus`, por volta da linha 493-510; imports no topo; JSX do componente)
- Modify: `frontend-next/src/components/ClienteDrawer.jsx` (função de salvar, por volta das linhas 215-236; imports no topo; JSX)

**Interfaces:**
- Consumes: `AvaliacaoModal` da Task 5 e `resultadoPorStatus` da Task 4.
- Produces: nada que outras tasks consumam.

- [ ] **Step 1: Ligar o gatilho na lista**

Em `frontend-next/src/components/ClientesLista.jsx`, junto dos outros imports:

```jsx
import AvaliacaoModal from "@/components/AvaliacaoModal";
import { resultadoPorStatus } from "@/lib/avaliacao";
```

Ao lado dos outros `useState` do componente que declara `changeStatus`:

```jsx
  const [avaliacaoDe, setAvaliacaoDe] = useState(null);
```

Em `changeStatus`, logo depois da chamada a `fetchContagens({ ... })` dentro do `try`:

```jsx
      // Aprovação, condicionamento e reprovação vêm de uma tela do SIOPI cujos
      // números o CRM só conhece perguntando.
      const resultado = resultadoPorStatus(newStatus);
      if (resultado) {
        const atual = clientes.find((c) => c.id === id);
        setAvaliacaoDe({ id, resultado, nome: atual?.nome, valor_renda: atual?.valor_renda });
      }
```

No JSX, antes do fechamento do elemento raiz:

```jsx
      <AvaliacaoModal
        clienteId={avaliacaoDe?.id}
        clienteNome={avaliacaoDe?.nome}
        valorRenda={avaliacaoDe?.valor_renda}
        resultado={avaliacaoDe?.resultado}
        avaliacao={null}
        aberto={!!avaliacaoDe}
        onFechar={() => setAvaliacaoDe(null)}
        onSalvo={() => setAvaliacaoDe(null)}
      />
```

- [ ] **Step 2: Verificar a lista no navegador**

Com o backend no ar e `cd frontend-next && npm run dev`:

1. Troque o status de um cliente para **Condicionado** pelo dropdown. Expected: o modal abre com o título "Avaliação Condicionada" e os seis campos daquela tela, com a renda do cadastro preenchida.
2. Preencha prestação possível 525,00 sobre renda 2.100,00. Expected: o bloco mostra `25,0%`.
3. Clique em **Depois**. Expected: o modal fecha, o status continua trocado, nada gravado.
4. Troque outro cliente para **Reprovado**. Expected: o modal abre com "Avaliação Reprovada", com Motivo da Reprovação e Resposta SIRIC, e **sem** renda nem percentual.
5. Troque outro para **Cliente aprovado** e salve com os dois códigos preenchidos. Expected: navega para `/clientes/<id>/aprovacao` (404 até a Task 7 — esperado neste ponto).
6. Troque um cliente para **Reserva**. Expected: nenhum modal abre.
7. Arraste um card no kanban para a lane **Cliente aprovado**. Expected: o modal abre igual.

- [ ] **Step 3: Ligar o gatilho no drawer**

O drawer não usa `PATCH /status`: ele grava o cliente inteiro com `PUT /clientes/:id` (linha 216). O gatilho ali é o status salvo ser diferente do carregado.

Em `frontend-next/src/components/ClienteDrawer.jsx`, junto dos outros imports:

```jsx
import AvaliacaoModal from "@/components/AvaliacaoModal";
import { resultadoPorStatus } from "@/lib/avaliacao";
```

Junto dos outros `useState`:

```jsx
  const [avaliacaoDe, setAvaliacaoDe] = useState(null);
```

Na função de salvar, substituindo a linha `onClose();` que vem depois de `onSaved?.(...)`:

```jsx
      // Só pergunta quando o status ACABOU de mudar — reabrir o drawer num
      // cliente já aprovado não deve reperguntar nada.
      const resultado = resultadoPorStatus(form.status);
      if (resultado && form.status !== original?.status) {
        setAvaliacaoDe({ resultado, nome: form.nome, valor_renda: centavosToBRL(form.valor_renda) });
      } else {
        onClose();
      }
```

No JSX, dentro do elemento raiz do drawer, antes do fechamento:

```jsx
      <AvaliacaoModal
        clienteId={clienteId}
        clienteNome={avaliacaoDe?.nome}
        valorRenda={avaliacaoDe?.valor_renda}
        resultado={avaliacaoDe?.resultado}
        avaliacao={null}
        aberto={!!avaliacaoDe}
        onFechar={() => { setAvaliacaoDe(null); onClose(); }}
        onSalvo={() => setAvaliacaoDe(null)}
      />
```

- [ ] **Step 4: Verificar o drawer no navegador**

1. Abra o drawer de um cliente cujo status não seja de avaliação, troque para **Condicionado** e salve. Expected: o modal abre por cima do drawer, no formato Condicionada.
2. Feche em **Depois**. Expected: modal e drawer fecham, e a linha da lista mostra o status novo.
3. Reabra o mesmo cliente (já condicionado), mude só o telefone e salve. Expected: nenhum modal abre.

- [ ] **Step 5: Rodar o lint**

Run: `cd frontend-next && npm run lint`
Expected: sem erros novos.

- [ ] **Step 6: Commit**

```bash
git add frontend-next/src/components/ClientesLista.jsx frontend-next/src/components/ClienteDrawer.jsx
git commit -m "feat(frontend): abre o modal de avaliacao na troca de status"
```

---

### Task 7: Página de avaliações do cliente

**Files:**
- Create: `frontend-next/src/app/(app)/clientes/[id]/aprovacao/page.jsx`

**Interfaces:**
- Consumes: `AvaliacaoModal` da Task 5; `CAMPOS_POR_RESULTADO`, `RESULTADO_LABEL`, `parcelaConsiderada` e `formatarPercentual` da Task 4; `statusInfo` de `@/lib/cliente-status`; os endpoints `GET /api/backend/clientes/:id` e `GET /api/backend/clientes/:id/avaliacoes`.
- Produces: a rota `/clientes/[id]/aprovacao`, destino do botão primário do modal.

- [ ] **Step 1: Escrever a página**

Criar `frontend-next/src/app/(app)/clientes/[id]/aprovacao/page.jsx`:

```jsx
"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import AvaliacaoModal from "@/components/AvaliacaoModal";
import {
  CAMPOS_POR_RESULTADO, RESULTADO_LABEL, parcelaConsiderada, formatarPercentual, resultadoPorStatus,
} from "@/lib/avaliacao";
import { statusInfo } from "@/lib/cliente-status";

const BRL = (n) =>
  n === null || n === undefined
    ? "—"
    : Number(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const dataCurta = (iso) => (iso ? new Date(iso).toLocaleDateString("pt-BR") : "—");
const dataHora = (iso) => (iso ? new Date(iso).toLocaleString("pt-BR") : "—");

// O status cuja pílula empresta a cor da faixa. Os tons de cliente-status.js
// foram calibrados no limite de contraste AA — reusá-los evita recriar cor.
const STATUS_DO_RESULTADO = {
  aprovada: "cliente_aprovado",
  condicionada: "condicionado",
  reprovada: "reprovado",
};

function valorFormatado(campo, av) {
  const v = av[campo.nome];
  if (v === null || v === undefined || v === "") return "—";
  if (campo.tipo === "dinheiro") return BRL(v);
  if (campo.tipo === "data") return dataCurta(v);
  if (campo.tipo === "datahora") return dataHora(v);
  return String(v);
}

export default function AvaliacoesPage({ params }) {
  const { id } = use(params);
  const [cliente, setCliente] = useState(null);
  const [avaliacoes, setAvaliacoes] = useState([]);
  const [selecionadaId, setSelecionadaId] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [modal, setModal] = useState(null); // { resultado, avaliacao }

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const [rc, ra] = await Promise.all([
        fetch(`/api/backend/clientes/${id}`),
        fetch(`/api/backend/clientes/${id}/avaliacoes`),
      ]);
      const dc = await rc.json().catch(() => null);
      const da = await ra.json().catch(() => null);
      if (!rc.ok) throw new Error(dc?.error || "Não foi possível carregar o cliente");
      if (!ra.ok) throw new Error(da?.error || "Não foi possível carregar as avaliações");
      setCliente(dc?.cliente || dc);
      setAvaliacoes(da?.avaliacoes || []);
    } catch (e) {
      setErro(e.message);
    } finally {
      setCarregando(false);
    }
  }, [id]);

  useEffect(() => { carregar(); }, [carregar]);

  const selecionada = useMemo(
    () => avaliacoes.find((a) => a.id === selecionadaId) || avaliacoes[0] || null,
    [avaliacoes, selecionadaId]
  );

  // Cliente sem nenhuma avaliação cai direto no formulário, em vez de encarar
  // uma página vazia. O formato vem do status atual; um cliente que chegou aqui
  // por outro caminho, com status fora do mapa, começa pelo formato aprovada.
  useEffect(() => {
    if (!carregando && cliente && avaliacoes.length === 0 && !modal) {
      setModal({ resultado: resultadoPorStatus(cliente.status) || "aprovada", avaliacao: null });
    }
  }, [carregando, cliente, avaliacoes.length, modal]);

  if (carregando) return <p className="p-6 text-sm text-cx-muted">Carregando…</p>;
  if (erro) return <p className="p-6 text-sm text-red-600">{erro}</p>;
  if (!cliente) return null;

  const info = statusInfo(cliente.status);
  const faixa = selecionada ? statusInfo(STATUS_DO_RESULTADO[selecionada.resultado]) : info;
  const campos = selecionada ? CAMPOS_POR_RESULTADO[selecionada.resultado] || [] : [];
  const parcela = parcelaConsiderada(selecionada);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold text-cx-text">{cliente.nome || "Cliente"}</h1>
          <p className="mt-1 text-xs text-cx-muted">CPF {cliente.cpf || "—"} · {info.label}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" nativeButton={false} render={<Link href="/clientes/lista" />}>
            Voltar à lista
          </Button>
          {selecionada ? (
            <Button variant="outline" onClick={() => setModal({ resultado: selecionada.resultado, avaliacao: selecionada })}>
              Editar
            </Button>
          ) : null}
          <Button onClick={() => setModal({ resultado: "aprovada", avaliacao: null })}>
            Nova avaliação
          </Button>
        </div>
      </header>

      {selecionada ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <section className="overflow-hidden rounded-lg border border-cx-border">
            <h2
              className="px-4 py-2 text-center text-sm font-semibold"
              style={{ backgroundColor: faixa.soft, color: faixa.ink }}
            >
              Avaliação {RESULTADO_LABEL[selecionada.resultado]}
            </h2>
            <dl className="divide-y divide-cx-border">
              {campos.map((campo) => (
                <div key={campo.nome} className="grid grid-cols-[minmax(0,12rem)_minmax(0,1fr)] gap-3 px-4 py-2">
                  <dt className="text-xs text-cx-muted">{campo.label}</dt>
                  <dd className="whitespace-pre-wrap text-sm text-cx-text">{valorFormatado(campo, selecionada)}</dd>
                </div>
              ))}
            </dl>
          </section>

          <aside className="flex flex-col gap-4">
            <div className="rounded-lg border border-cx-border bg-cx-surface px-4 py-3">
              <p className="text-[11px] font-medium text-cx-muted">Renda utilizada</p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-cx-text">{BRL(selecionada.renda_utilizada)}</p>
            </div>
            <div className="rounded-lg border border-cx-border bg-cx-surface px-4 py-3">
              <p className="text-[11px] font-medium text-cx-muted">Parcela considerada</p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-cx-text">{BRL(parcela)}</p>
            </div>
            <div className="rounded-lg border border-cx-border bg-cx-surface px-4 py-3">
              <p className="text-[11px] font-medium text-cx-muted">Comprometimento da renda</p>
              <p className="mt-1 text-3xl font-semibold tabular-nums text-cx-text">
                {formatarPercentual(selecionada.percentual_renda)}
              </p>
            </div>
          </aside>
        </div>
      ) : null}

      {avaliacoes.length > 1 ? (
        <section className="rounded-lg border border-cx-border">
          <h2 className="border-b border-cx-border px-4 py-2 text-sm font-medium text-cx-text">Histórico</h2>
          <ul className="divide-y divide-cx-border">
            {avaliacoes.map((a) => (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => setSelecionadaId(a.id)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-2 text-left hover:bg-cx-surface"
                >
                  <span className="text-sm text-cx-text">{RESULTADO_LABEL[a.resultado]}</span>
                  <span className="text-xs text-cx-muted">Proposta {a.codigo_proposta || "—"}</span>
                  <span className="text-xs text-cx-muted">{dataCurta(a.created_at)}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <AvaliacaoModal
        clienteId={cliente.id}
        clienteNome={cliente.nome}
        valorRenda={cliente.valor_renda}
        resultado={modal?.resultado}
        avaliacao={modal?.avaliacao || null}
        aberto={!!modal}
        onFechar={() => setModal(null)}
        onSalvo={() => { setModal(null); carregar(); }}
      />
    </div>
  );
}
```

Confira o shape de `GET /clientes/:id` no handler `Get` de `backend-go/internal/modules/clientes/handler.go`: se a resposta não vier dentro de `cliente`, ajuste a linha `setCliente(...)`.

- [ ] **Step 2: Verificar no navegador**

Com o backend no ar e `npm run dev`:

1. Abra `/clientes/<id>/aprovacao` de um cliente que já tem avaliação. Expected: a tabela reproduz a tela do SIOPI, na ordem dos campos daquele formato, com a faixa colorida pelo tom do resultado.
2. Confira o painel lateral. Expected: renda, parcela considerada e percentual — 525,00 sobre 2.100,00 mostra `25,0%`.
3. Clique em **Editar**, mude a prestação e salve. Expected: o modal fecha e a tabela recarrega com o valor novo e o percentual recalculado.
4. Clique em **Nova avaliação**, registre uma aprovada. Expected: aparece o bloco Histórico com duas linhas; clicar na linha antiga troca o destaque.
5. Abra a rota para um cliente sem nenhuma avaliação. Expected: o modal abre sozinho, no formato correspondente ao status atual do cliente.
6. Percorra a jornada inteira: lista → status **Condicionado** → preencher → **Salvar e abrir a avaliação**. Expected: cai nesta página com os valores certos.

- [ ] **Step 3: Rodar o lint**

Run: `cd frontend-next && npm run lint`
Expected: sem erros novos.

- [ ] **Step 4: Commit**

```bash
git add "frontend-next/src/app/(app)/clientes/[id]/aprovacao/page.jsx"
git commit -m "feat(frontend): pagina de avaliacoes do cliente"
```

---

## Nota sobre testes

O backend tem `go test`, e as Tasks 2 e 3 usam TDD de verdade — o cálculo, a escolha da parcela por formato e a validação são cobertos por teste antes da implementação. O `frontend-next` **não tem runner de teste**: `package.json` declara apenas `dev`, `build`, `start` e `lint`. Por isso toda a lógica pura do frontend está em `src/lib/avaliacao.js` (Task 4), verificável por `node` sem instalar nada, e as tarefas de UI trazem roteiros de verificação manual com passos e resultados esperados explícitos. Instalar um runner de teste no frontend está fora do escopo desta entrega.
