# Proposta flexível e consolidação da navegação — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir proposta sem imóvel cadastrado e para qualquer pessoa (não só quem tem ficha de financiamento), e enxugar o menu de cinco cadastros para dois.

**Architecture:** `propostas.imovel_id` deixa de ser `NOT NULL` e ganha um par textual `imovel_descricao` para o desejo ainda não cadastrado. `cliente_id` vira `pessoa_id`, apontando para o núcleo de identidade. No menu, `/clientes-aluguel` é renomeada para `/locacoes` — ela é a régua de cobrança, não um cadastro, e por isso **não** é absorvida por `/pessoas`.

**Tech Stack:** Go + GORM + Gin, Postgres, golang-migrate, Next.js (App Router).

**Spec:** `docs/superpowers/specs/2026-09-06-unificacao-cadastros-design.md`

**Depende de:** plano 01 (tabela `pessoas` e tela `/pessoas`) e plano 02 (tela `/imoveis`). As Tasks 1–4 precisam só do plano 01; as Tasks 5–6 precisam dos dois.

## Global Constraints

- Migrations golang-migrate, numeradas. Este plano usa **0006**.
- Sem dados em produção.
- Tenant scoping automático para models com `tenant_id`.
- Rodar backend: `cd backend-go && go build ./... && go test ./...`
- Rodar frontend: `cd frontend-next && npm run lint && npm run build`

---

### Task 1: Migration de propostas

**Files:**
- Create: `backend-go/migrations/0006_propostas_flexiveis.up.sql`
- Create: `backend-go/migrations/0006_propostas_flexiveis.down.sql`

**Interfaces:**
- Consumes: tabela `pessoas` (plano 01 Task 2).
- Produces: `propostas` com `imovel_id` nullable, coluna `imovel_descricao text`, e `pessoa_id` no lugar de `cliente_id`.

- [ ] **Step 1: Escrever a migration up**

`backend-go/migrations/0006_propostas_flexiveis.up.sql`:
```sql
-- imovel_id nulo cobre a proposta feita antes de existir imóvel cadastrado.
ALTER TABLE public.propostas ALTER COLUMN imovel_id DROP NOT NULL;

-- Guarda o desejo em texto ("2 quartos até 250 mil, Centro") enquanto não há
-- imóvel. Quando houver, preenche-se imovel_id e a proposta segue a mesma.
ALTER TABLE public.propostas ADD COLUMN imovel_descricao text;

-- cliente_id exigia ficha de financiamento. Apontando para pessoas, qualquer
-- pessoa cadastrada pode receber proposta — inclusive o inquilino que decidiu
-- comprar.
ALTER TABLE public.propostas DROP CONSTRAINT propostas_cliente_id_fkey;
ALTER TABLE public.propostas RENAME COLUMN cliente_id TO pessoa_id;
ALTER TABLE public.propostas
    ADD CONSTRAINT propostas_pessoa_id_fkey
    FOREIGN KEY (pessoa_id) REFERENCES public.pessoas(id)
    ON UPDATE CASCADE ON DELETE CASCADE;

CREATE INDEX idx_propostas_pessoa ON public.propostas (pessoa_id);
```

> **Atenção:** se já existirem linhas em `propostas`, o `pessoa_id` delas passará
> a apontar para ids de `pessoas` que não existem, e a constraint falha. Sem
> dados de produção isso não ocorre. Confirme antes com
> `psql "$DATABASE_URL" -c "SELECT count(*) FROM propostas;"` — se o resultado
> não for `0`, **pare** e reporte: será preciso um passo de mapeamento
> `clientes.id → clientes.pessoa_id` antes desta migration.

- [ ] **Step 2: Escrever a migration down**

`backend-go/migrations/0006_propostas_flexiveis.down.sql`:
```sql
DROP INDEX IF EXISTS public.idx_propostas_pessoa;
ALTER TABLE public.propostas DROP CONSTRAINT propostas_pessoa_id_fkey;
ALTER TABLE public.propostas RENAME COLUMN pessoa_id TO cliente_id;
ALTER TABLE public.propostas
    ADD CONSTRAINT propostas_cliente_id_fkey
    FOREIGN KEY (cliente_id) REFERENCES public.clientes(id)
    ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE public.propostas DROP COLUMN imovel_descricao;

UPDATE public.propostas SET imovel_id = 0 WHERE imovel_id IS NULL;
ALTER TABLE public.propostas ALTER COLUMN imovel_id SET NOT NULL;
```

- [ ] **Step 3: Confirmar que a tabela está vazia e aplicar**

Run:
```bash
psql "$DATABASE_URL" -c "SELECT count(*) FROM propostas;"
```
Expected: `0`. Se não for, pare (ver aviso do Step 1).

```bash
cd backend-go && migrate -path migrations -database "$DATABASE_URL" up
psql "$DATABASE_URL" -c "\d public.propostas"
```
Expected: `imovel_id` sem `not null`; `pessoa_id` presente; `imovel_descricao` presente.

- [ ] **Step 4: Verificar que proposta sem imóvel é aceita pelo banco**

```bash
psql "$DATABASE_URL" <<'SQL'
INSERT INTO pessoas (tenant_id, nome) VALUES (1, 'Proposta Teste') RETURNING id;
SQL
```
Use o id devolvido:
```bash
psql "$DATABASE_URL" -c "INSERT INTO propostas (pessoa_id, imovel_id, imovel_descricao, valor_ofertado, tenant_id) VALUES (<id>, NULL, '2 quartos ate 250 mil, Centro', 250000, 1);"
```
Expected: `INSERT 0 1` — antes disto, impossível. Limpe:
```bash
psql "$DATABASE_URL" -c "DELETE FROM propostas WHERE imovel_id IS NULL; DELETE FROM pessoas WHERE nome='Proposta Teste';"
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
git add backend-go/migrations/0006_propostas_flexiveis.*.sql
git commit -m "feat(db): proposta com imovel opcional e vinculada a pessoa"
```

---

### Task 2: Model `Proposta` atualizado

**Files:**
- Modify: `backend-go/internal/models/proposta.go`
- Test: `backend-go/internal/models/proposta_test.go`

**Interfaces:**
- Consumes: Task 1, `models.Pessoa` (plano 01 Task 3).
- Produces: `models.Proposta` com `PessoaID uint`, `ImovelID *uint`, `ImovelDescricao *string`, associação `Pessoa *Pessoa`, e método `TemImovel() bool`.

- [ ] **Step 1: Escrever o teste que falha**

`backend-go/internal/models/proposta_test.go`:
```go
package models

import "testing"

func TestPropostaTemImovel(t *testing.T) {
	id := uint(7)
	if !(Proposta{ImovelID: &id}).TemImovel() {
		t.Fatal("proposta com imovel_id deveria ter imóvel")
	}
	if (Proposta{}).TemImovel() {
		t.Fatal("proposta sem imovel_id não deveria ter imóvel")
	}
}
```

- [ ] **Step 2: Rodar para confirmar que falha**

Run: `cd backend-go && go test ./internal/models/ -run TestPropostaTemImovel -v`
Expected: FAIL — `ImovelID` não é ponteiro / `TemImovel` indefinido.

- [ ] **Step 3: Alterar o model**

Em `backend-go/internal/models/proposta.go`, troque o bloco de ids por:
```go
	// PessoaID aponta para o núcleo de identidade, não para a ficha de
	// financiamento: qualquer pessoa cadastrada pode receber proposta.
	PessoaID   uint  `gorm:"column:pessoa_id;index;not null" json:"pessoa_id"`
	// ImovelID é nulo quando a proposta ainda não tem imóvel escolhido; o
	// desejo fica em ImovelDescricao até virar um imóvel real.
	ImovelID   *uint `gorm:"column:imovel_id;index" json:"imovel_id,omitempty"`
	CorretorID *uint `gorm:"column:corretor_id;index" json:"corretor_id,omitempty"`
	TenantID   *uint `gorm:"column:tenant_id;index" json:"tenant_id,omitempty"`

	ImovelDescricao *string `gorm:"column:imovel_descricao" json:"imovel_descricao,omitempty"`
```
E o bloco de associações por:
```go
	Pessoa   *Pessoa `gorm:"foreignKey:PessoaID;references:ID" json:"pessoa,omitempty"`
	Imovel   *Imovel `gorm:"foreignKey:ImovelID;references:ID" json:"imovel,omitempty"`
	Corretor *User   `gorm:"foreignKey:CorretorID;references:ID" json:"corretor,omitempty"`
```
E acrescente ao fim do arquivo:
```go
// TemImovel diz se a proposta já está vinculada a um imóvel cadastrado.
func (p Proposta) TemImovel() bool { return p.ImovelID != nil }
```

- [ ] **Step 4: Rodar o teste**

Run: `cd backend-go && go test ./internal/models/ -run TestPropostaTemImovel -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend-go/internal/models/proposta.go backend-go/internal/models/proposta_test.go
git commit -m "refactor(models): Proposta aponta para pessoa e aceita imovel opcional"
```

---

### Task 3: Módulo `propostas` adaptado

**Files:**
- Modify: `backend-go/internal/modules/propostas/dto.go`
- Modify: `backend-go/internal/modules/propostas/repository.go`
- Modify: `backend-go/internal/modules/propostas/handler.go`
- Test: `backend-go/internal/modules/propostas/dto_test.go`

**Interfaces:**
- Consumes: `models.Proposta` (Task 2).
- Produces: `CreateRequest` com `PessoaID uint` (obrigatório), `ImovelID *uint` (opcional), `ImovelDescricao *string`; `ListFilters` ganha `SemImovel bool`; `propostas.ValidarCriacao(req CreateRequest) error` e `var ErrImovelOuDescricao error`.

- [ ] **Step 1: Escrever o teste que falha**

`backend-go/internal/modules/propostas/dto_test.go`:
```go
package propostas

import (
	"errors"
	"testing"
)

func u(v uint) *uint      { return &v }
func s(v string) *string  { return &v }

// Uma proposta precisa dizer sobre o quê ela é: ou um imóvel cadastrado, ou a
// descrição do que o cliente procura. As duas vazias é um registro inútil.
func TestValidarCriacaoExigeImovelOuDescricao(t *testing.T) {
	casos := []struct {
		nome  string
		req   CreateRequest
		quero error
	}{
		{"com imovel", CreateRequest{PessoaID: 1, ImovelID: u(9), ValorOfertado: 1000}, nil},
		{"com descricao", CreateRequest{PessoaID: 1, ImovelDescricao: s("2 quartos Centro"), ValorOfertado: 1000}, nil},
		{"com os dois", CreateRequest{PessoaID: 1, ImovelID: u(9), ImovelDescricao: s("x"), ValorOfertado: 1000}, nil},
		{"sem nenhum", CreateRequest{PessoaID: 1, ValorOfertado: 1000}, ErrImovelOuDescricao},
		{"descricao em branco", CreateRequest{PessoaID: 1, ImovelDescricao: s("   "), ValorOfertado: 1000}, ErrImovelOuDescricao},
	}
	for _, c := range casos {
		t.Run(c.nome, func(t *testing.T) {
			if err := ValidarCriacao(c.req); !errors.Is(err, c.quero) {
				t.Fatalf("erro = %v, quero %v", err, c.quero)
			}
		})
	}
}
```

- [ ] **Step 2: Rodar para confirmar que falha**

Run: `cd backend-go && go test ./internal/modules/propostas/ -v`
Expected: FAIL — `undefined: ValidarCriacao`.

- [ ] **Step 3: Atualizar o dto e implementar a validação**

Em `backend-go/internal/modules/propostas/dto.go`, troque `CreateRequest` por:
```go
// CreateRequest é o body de POST /api/propostas. ImovelID é opcional: quando
// ausente, ImovelDescricao registra o que o cliente procura.
type CreateRequest struct {
	PessoaID        uint       `json:"pessoa_id" binding:"required"`
	ImovelID        *uint      `json:"imovel_id,omitempty"`
	ImovelDescricao *string    `json:"imovel_descricao,omitempty"`
	ValorOfertado   float64    `json:"valor_ofertado" binding:"required,gt=0"`
	FormaPagamento  string     `json:"forma_pagamento,omitempty"`
	DataValidade    *time.Time `json:"data_validade,omitempty"`
	Condicoes       *string    `json:"condicoes,omitempty"`
	Observacoes     *string    `json:"observacoes,omitempty"`
}
```
Adicione a `ListFilters`:
```go
	// SemImovel filtra as propostas que ainda não têm imóvel escolhido.
	SemImovel bool
```
E ao fim do arquivo:
```go
var ErrImovelOuDescricao = errors.New("informe um imóvel ou descreva o que o cliente procura")

// ValidarCriacao garante que a proposta diz sobre o quê ela é.
func ValidarCriacao(req CreateRequest) error {
	if req.ImovelID != nil {
		return nil
	}
	if req.ImovelDescricao != nil && strings.TrimSpace(*req.ImovelDescricao) != "" {
		return nil
	}
	return ErrImovelOuDescricao
}
```
Importe `errors` e `strings`.

- [ ] **Step 4: Rodar o teste**

Run: `cd backend-go && go test ./internal/modules/propostas/ -v`
Expected: PASS nos 5 casos.

- [ ] **Step 5: Atualizar o repository**

Em `backend-go/internal/modules/propostas/repository.go`:
- Em `List`, troque `Preload("Cliente")` por `Preload("Pessoa")` (nas duas queries) e acrescente, junto ao filtro de status:
```go
	if f.SemImovel {
		base = base.Where("imovel_id IS NULL")
	}
```
(e o mesmo em `q`).
- Renomeie `ListByCliente(ctx, clienteID uint)` para `ListByPessoa(ctx, pessoaID uint)`, trocando `Where("cliente_id = ?", clienteID)` por `Where("pessoa_id = ?", pessoaID)` e `Preload("Imovel")` mantido.

- [ ] **Step 6: Atualizar o handler**

Em `backend-go/internal/modules/propostas/handler.go`:
- Chame `ValidarCriacao(req)` logo após o bind, devolvendo `400` com a mensagem de `ErrImovelOuDescricao` quando falhar.
- Ao montar `models.Proposta`, use `PessoaID: req.PessoaID`, `ImovelID: req.ImovelID`, `ImovelDescricao: req.ImovelDescricao`.
- Ajuste qualquer rota/parâmetro que use `cliente_id` para `pessoa_id`.
- No `UpdateRequest`, adicione `ImovelID *uint` para permitir vincular um imóvel depois — é o que fecha o ciclo "proposta sem imóvel vira proposta com imóvel", sem criar registro novo:
```go
	// ImovelID vincula um imóvel a uma proposta que ainda não tinha.
	ImovelID *uint `json:"imovel_id,omitempty"`
```
E aplique-o no update.

- [ ] **Step 7: Varrer o que sobrou e compilar**

Run:
```bash
cd backend-go && grep -rn "cliente_id\|ClienteID" internal/modules/propostas/
go build ./... && go test ./...
```
Expected: grep vazio; build e testes ok.

- [ ] **Step 8: Verificar de ponta a ponta**

Com a API rodando e `$TOKEN` válido, usando o id de uma pessoa existente:
```bash
# proposta sem imóvel
curl -s -X POST localhost:8080/api/propostas -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"pessoa_id":<id>,"imovel_descricao":"2 quartos ate 250 mil, Centro","valor_ofertado":250000}'
```
Expected: 201, `imovel_id` ausente. Anote o id da proposta.

```bash
# sem imóvel e sem descrição
curl -s -o /dev/null -w '%{http_code}\n' -X POST localhost:8080/api/propostas \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"pessoa_id":<id>,"valor_ofertado":250000}'
```
Expected: `400`.

```bash
# vincular um imóvel depois
curl -s -X PUT localhost:8080/api/propostas/<proposta_id> -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"imovel_id":<imovel_id>}'
```
Expected: 200, mesma proposta (mesmo `id`), agora com `imovel_id`. Este é o resultado central da task.

- [ ] **Step 9: Commit**

```bash
git add backend-go/internal/modules/propostas/
git commit -m "feat(propostas): imovel opcional, vinculo posterior e proposta por pessoa"
```

---

### Task 4: Tela de proposta com imóvel opcional

**Files:**
- Modify: `frontend-next/src/components/PropostasManager.jsx`

**Interfaces:**
- Consumes: `POST /api/propostas`, `PUT /api/propostas/:id`.
- Produces: formulário com imóvel opcional.

- [ ] **Step 1: Ler as convenções de Next deste projeto**

Run: `cd frontend-next && ls node_modules/next/dist/docs/`

- [ ] **Step 2: Tornar o imóvel opcional no formulário**

Em `frontend-next/src/components/PropostasManager.jsx`:
- Substituir o seletor obrigatório de imóvel por uma escolha: **"Imóvel já cadastrado"** (autocomplete sobre `/api/imoveis`) ou **"Ainda não escolhido"** (textarea `imovel_descricao`, placeholder `"2 quartos até 250 mil, Centro"`).
- O seletor de cliente passa a consultar `/api/pessoas` e enviar `pessoa_id`.
- Na listagem, propostas sem imóvel mostram a descrição com um badge "Sem imóvel", e um botão **"Vincular imóvel"** que faz `PUT /api/propostas/:id` com `imovel_id`.
- Adicionar um filtro "Sem imóvel" que chama a listagem com `sem_imovel=true`.

- [ ] **Step 3: Verificar**

Run: `cd frontend-next && npm run lint && npm run build`
Expected: sem erro.

Verificação manual:
1. Criar proposta escolhendo "Ainda não escolhido" e descrevendo o desejo. Salvar.
2. Confirmar o badge "Sem imóvel" na listagem e que o filtro "Sem imóvel" a encontra.
3. Clicar "Vincular imóvel", escolher um imóvel, salvar.
4. Confirmar que o badge sumiu, o imóvel aparece, e a proposta manteve o mesmo id e histórico.

- [ ] **Step 4: Commit**

```bash
git add frontend-next/src/components/PropostasManager.jsx
git commit -m "feat(web): proposta pode ser criada sem imovel e vinculada depois"
```

---

### Task 5: Renomear `/clientes-aluguel` para `/locacoes`

`/clientes-aluguel` é a régua de cobrança — quem pagou, quem deve, dia de vencimento, repasse. Não é cadastro, e por isso **não** é absorvida por `/pessoas`. Só ganha um nome honesto.

**Files:**
- Create: `frontend-next/src/app/(app)/locacoes/page.js`
- Delete: `frontend-next/src/app/(app)/clientes-aluguel/`
- Modify: `frontend-next/next.config.*`

**Interfaces:**
- Consumes: as rotas de inquilino/cobrança do módulo `alugueis`, inalteradas.
- Produces: rota `/locacoes`.

- [ ] **Step 1: Mover a página**

```bash
cd frontend-next
git mv "src/app/(app)/clientes-aluguel" "src/app/(app)/locacoes"
```

- [ ] **Step 2: Ajustar textos**

Dentro da página movida, troque títulos e rótulos de "Inquilinos" para "Locações" onde o texto descrever a tela. **Não** troque onde o termo se refere à pessoa (uma linha da tabela continua sendo um inquilino).

- [ ] **Step 3: Adicionar o redirect**

No array de `redirects()`:
```js
      { source: "/clientes-aluguel", destination: "/locacoes", permanent: true },
```

- [ ] **Step 4: Verificar**

Run: `cd frontend-next && npm run lint && npm run build`
Expected: sem erro. Corrija imports que apontavam para o caminho antigo.

```bash
curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' localhost:3000/clientes-aluguel
```
Expected: `308` para `/locacoes`.

Abra `/locacoes` e confirme que a régua de cobrança funciona igual a antes: lista de inquilinos, status de pagamento, vencimentos.

- [ ] **Step 5: Commit**

```bash
git add -A frontend-next/
git commit -m "refactor(web): /clientes-aluguel vira /locacoes"
```

---

### Task 6: Menu consolidado

**Files:**
- Modify: `frontend-next/src/components/Sidebar.jsx:121-192`

**Interfaces:**
- Consumes: `/pessoas` (plano 01), `/imoveis` (plano 02), `/locacoes` (Task 5).
- Produces: menu final.

- [ ] **Step 1: Reescrever as seções do menu**

Em `frontend-next/src/components/Sidebar.jsx`, nas seções `Captação`, `Fechamento` e `Cadastros`:

Na seção **Captação**, troque os itens por:
```js
          { href: "/clientes/lista?view=kanban", icon: UserPlus, label: "Leads" },
          { href: "/pessoas", icon: Users, label: "Pessoas" },
          { href: "/imoveis", icon: Building2, label: "Imóveis" },
```
> O item "Leads" aponta para uma rota removida no plano 01 Task 9. Troque-o por `/pessoas?view=kanban` e garanta que `PessoasLista.jsx` aceite `view=kanban`; se a visão kanban não tiver sido portada, remova o item e abra um TODO no backlog — não deixe um link quebrado no menu.

Na seção **Fechamento**, troque:
```js
          { href: "/contratos/lista", icon: ClipboardList, label: "Contratos" },
          { href: "/locacoes", icon: KeyRound, label: "Locações" },
```
(removendo os itens "Imóveis em Locação" e "Inquilinos").

Na seção **Cadastros**, remova o item "Proprietários" — virou filtro em Pessoas. Mantenha "Corretores" e "Correspondentes": são usuários do sistema, não pessoas do CRM, e não fazem parte desta unificação.

- [ ] **Step 2: Verificar que nenhum item aponta para rota removida**

Run:
```bash
cd frontend-next
grep -o 'href: "[^"]*"' src/components/Sidebar.jsx | sed 's/href: "//;s/"//' | sort -u
```
Para cada rota listada, confirme que existe uma página em `src/app/` ou um redirect em `next.config.*`. Qualquer uma que não tenha nenhum dos dois é um link quebrado no menu — corrija antes de seguir.

- [ ] **Step 3: Verificar**

Run: `cd frontend-next && npm run lint && npm run build`
Expected: sem erro.

Com o app rodando, clique em **todos** os itens do menu e confirme que cada um abre uma tela real, sem 404.

- [ ] **Step 4: Commit**

```bash
git add frontend-next/src/components/Sidebar.jsx
git commit -m "feat(web): menu consolidado em Pessoas, Imoveis e Locacoes"
```

---

## Verificação final do plano

```bash
cd backend-go && go build ./... && go test ./...
cd ../frontend-next && npm run lint && npm run build
```

Os resultados que definem o sucesso:
1. Proposta criada sem imóvel e vinculada depois mantém o mesmo id (Task 3, Step 8).
2. Todo item do menu abre uma tela real (Task 6, Step 3).
3. `/clientes-aluguel`, `/clientes/lista`, `/proprietarios/lista`, `/alugueis` e `/imoveis/lista` respondem 308 para as rotas novas.
