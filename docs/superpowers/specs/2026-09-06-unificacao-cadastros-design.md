# Unificação de cadastros: pessoas, imóveis e propostas

**Data:** 2026-09-06
**Status:** aprovado para planejamento
**Contexto:** sistema ainda não está em produção; não há dados reais a preservar.

## Problema

O CRM apresenta ao usuário cinco cadastros distintos para descrever duas coisas:
uma pessoa e um imóvel.

- **Pessoas** vivem em três tabelas paralelas: `clientes` (comprador, ~60 campos:
  renda, cônjuge, fiador, documentos, formulários Caixa), `cliente_aluguels`
  (inquilino, ~45 campos: contrato, Asaas, score, dados do proprietário e do
  corretor embutidos) e `proprietario` (3 campos: `name`, `address`, `phone`).
- **Imóveis** vivem em duas: `imoveis` (venda) e `alugueis` (locação).
- **Propostas** exigem `imovel_id NOT NULL` apontando só para `imoveis`, o que
  impede registrar uma proposta antes de o imóvel existir.

Consequências para o usuário: precisa saber classificar a pessoa *antes* de
escolher em qual tela clicar; a mesma pessoa em dois papéis vira dois cadastros
sem ligação; e um imóvel anunciado para alugar e vender não tem representação.

## Objetivos

1. Um único fluxo de cadastro de pessoa, com o papel escolhido no início.
2. Um único cadastro de imóvel, com finalidade aluguel / venda / ambos.
3. Proposta que pode ou não estar vinculada a um imóvel cadastrado.
4. Menu com menos entradas e menos ambiguidade.

## Não-objetivos

- Fundir os campos de `clientes` com os de `cliente_aluguels`. São domínios
  diferentes (financiamento Caixa vs. contrato de locação/Asaas); uma tabela
  única de ~105 colunas esparsas seria pior que o estado atual.
- Reescrever os módulos de cobrança, repasse, régua, portal do inquilino ou
  contratos. Eles continuam operando sobre `cliente_aluguels`.
- Alterar o fluxo operacional de locação (a "régua de cobrança"), que é uma
  rotina diária legítima e não um cadastro.

---

## Pré-requisito bloqueante: tabela `ClienteAluguels` órfã

Descoberto durante o levantamento; **precisa ser resolvido antes de qualquer
outro item deste documento.**

O banco tem duas tabelas de inquilino:

| Tabela | Origem | Usada pelo Go? |
|---|---|---|
| `public."ClienteAluguels"` | legado Sequelize (CamelCase, `"clienteId"`) | **não** — zero referências em código Go |
| `public.cliente_aluguels` | atual (`models.ClienteAluguel`) | sim |

As cinco tabelas dependentes têm FK apontando para a **legada**:

```
chamado_manutencaos.cliente_aluguel_id  → ClienteAluguels(id)
cobranca_aluguels.cliente_aluguel_id    → ClienteAluguels(id)
regua_cobrancas.cliente_aluguel_id      → ClienteAluguels(id)
repasse_proprietarios.cliente_aluguel_id → ClienteAluguels(id)
vistoria_aluguels.cliente_aluguel_id    → ClienteAluguels(id)
```

Como a aplicação cria inquilinos em `cliente_aluguels`, qualquer tentativa de
gerar cobrança, repasse, chamado ou vistoria para um inquilino real viola a
constraint e falha em runtime. O defeito está latente apenas porque o sistema
ainda não rodou com dados reais.

**Correção:** dropar `ClienteAluguels` e reapontar as cinco FKs para
`cliente_aluguels`. Não há dados a migrar.

---

## Design

### 1. Núcleo de pessoas (aditivo)

`cliente_aluguels.id` é alvo de FK de 5 tabelas e é referenciado em 12 módulos
(`contratos`, `portalinquilino`, `vistorias`, `chamados`, `reguacobranca`,
`financeiro/repasses`, webhook Asaas, entre outros). Mover seus campos para uma
tabela nova arrastaria todos eles. O design evita isso inteiramente.

**Nova tabela, só identidade:**

```sql
CREATE TABLE pessoas (
    id              serial PRIMARY KEY,
    tenant_id       integer NOT NULL REFERENCES tenants(id),
    nome            varchar(255) NOT NULL,
    cpf             varchar(14),
    email           varchar(255),
    telefone        varchar(255),
    data_nascimento date,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX pessoas_tenant_cpf_key
    ON pessoas (tenant_id, cpf) WHERE cpf IS NOT NULL;
```

O índice é parcial: pessoas sem CPF (lead que só deixou telefone) são
permitidas e não colidem entre si.

**Ligação com as fichas existentes** — uma coluna nullable em cada:

```sql
ALTER TABLE clientes         ADD COLUMN pessoa_id integer REFERENCES pessoas(id);
ALTER TABLE cliente_aluguels ADD COLUMN pessoa_id integer REFERENCES pessoas(id);
ALTER TABLE proprietario     ADD COLUMN pessoa_id integer REFERENCES pessoas(id);
```

As três tabelas mantêm PK, colunas e FKs atuais. **Nenhum dos 12 módulos muda.**

**Papéis.** O papel de uma pessoa é derivado, não armazenado: existe ficha em
`clientes` ⇒ é comprador; em `cliente_aluguels` ⇒ é inquilino; em
`proprietario` ⇒ é proprietário. Não há tabela de papéis, e portanto não há
estado a manter em sincronia.

**Duplicação de identidade.** `nome`, `cpf`, `email` e `telefone` continuam
existindo nas fichas. `pessoas` passa a ser a fonte da verdade; as fichas viram
cópia de leitura, atualizada na mesma transação em que a pessoa é gravada. É
uma concessão deliberada: elimina a alternativa, que seria alterar as consultas
dos 12 módulos.

> **Nota:** `clientes.cpf` hoje tem `UNIQUE` **global** (`clientes_cpf_key`), não
> por tenant. Isso significa que dois tenants não podem cadastrar o mesmo CPF —
> um bug de multitenancy. A constraint deve ser trocada por `UNIQUE (tenant_id,
> cpf)` junto com este trabalho.

**Fluxo da tela (`/pessoas/nova`):**

1. Usuário escolhe o papel: Comprador / Inquilino / Proprietário.
2. Informa CPF (ou pula, se lead sem CPF).
3. Se já existe pessoa com aquele CPF no tenant, a tela mostra quem é e quais
   papéis ela já tem, e oferece adicionar o novo papel reaproveitando nome,
   contato e nascimento.
4. Wizard com barra de progresso, cujas etapas dependem do papel:

| Papel | Etapas |
|---|---|
| Comprador | Identidade → Renda e trabalho → Cônjuge → Fiador → Documentos e formulários Caixa |
| Inquilino | Identidade → Contrato e valores → Fiador → Documentos |
| Proprietário | Identidade → Dados de repasse (endereço, PIX) |

A etapa "Identidade" é a mesma componente nos três casos e grava em `pessoas`.
As demais gravam na ficha do papel.

### 2. Imóvel unificado

`imoveis` absorve `alugueis`; `alugueis` é aposentada.

```sql
ALTER TABLE imoveis ADD COLUMN finalidade varchar(10) NOT NULL DEFAULT 'venda'
    CHECK (finalidade IN ('aluguel','venda','ambos'));
ALTER TABLE imoveis ADD COLUMN valor_aluguel  double precision;
ALTER TABLE imoveis ADD COLUMN dia_vencimento integer;
ALTER TABLE imoveis ADD COLUMN alugado boolean NOT NULL DEFAULT false;
ALTER TABLE imoveis ALTER COLUMN valor_venda DROP NOT NULL;
```

`valor_venda` precisa aceitar NULL para imóveis exclusivamente de locação.
Regra de validação na aplicação: `finalidade` que inclua venda exige
`valor_venda`; que inclua aluguel exige `valor_aluguel` e `dia_vencimento`.

**`alugueis` não tem coluna `endereco`** — um imóvel de locação hoje não guarda
endereço. Após a fusão passa a ter, o que é correção e não custo. Sem dados em
produção, não existe a questão de preencher os antigos.

**Reapontamentos de FK:**

```
chamado_manutencaos.aluguel_id → renomeada para imovel_id, → imoveis(id)
vistoria_aluguels.aluguel_id   → renomeada para imovel_id, → imoveis(id)
cliente_aluguels.aluguel_id    → renomeada para imovel_id, → imoveis(id)
```

**Código afetado:**

| Módulo | Mudança |
|---|---|
| `imoveis` | ganha `finalidade` e os campos de locação; CRUD passa a cobrir os dois casos |
| `alugueis` | perde o CRUD de imóvel (`models.Aluguel` some); **mantém** inquilino, cobrança, Asaas e régua — essa lógica pertence ao contrato, não ao imóvel |
| `contratos` | trocar `models.Aluguel` por `models.Imovel` (repository, service, template) |
| `portalinquilino` | idem |
| `vistorias`, `chamados` | campo `AluguelID` → `ImovelID` |

**Site público — risco explícito.** `imoveis.RegisterPublicRoutes` expõe
leitura sem autenticação. Depois da fusão, essa rota **precisa** filtrar
`finalidade IN ('venda','ambos')`; sem isso, imóveis de locação vazam para a
vitrine de vendas. Este é o item mais fácil de esquecer do plano inteiro.

**Tela (`/imoveis`):** finalidade escolhida no topo; blocos de venda
(`valor_venda`, `valor_avaliacao`, `situacao_imovel`) e de locação
(`valor_aluguel`, `dia_vencimento`) aparecem conforme a escolha; em "ambos",
os dois. A listagem ganha filtro por finalidade.

### 3. Proposta

```sql
ALTER TABLE propostas ALTER COLUMN imovel_id DROP NOT NULL;
ALTER TABLE propostas ADD COLUMN imovel_descricao text;
ALTER TABLE propostas RENAME COLUMN cliente_id TO pessoa_id;
-- FK propostas_cliente_id_fkey → propostas_pessoa_id_fkey → pessoas(id)
```

- `imovel_id` nulo cobre a proposta feita antes de existir imóvel cadastrado;
  `imovel_descricao` guarda o desejo em texto ("2 quartos até 250 mil, Centro")
  até virar um imóvel real. Quando virar, preenche-se `imovel_id` e a proposta
  segue a mesma, com histórico preservado.
- `pessoa_id` no lugar de `cliente_id` remove a exigência de ficha de
  financiamento: qualquer pessoa cadastrada pode receber proposta, inclusive o
  inquilino que decidiu comprar.

Módulo `propostas` tem 313 linhas — é a menor mudança do plano.

### 4. Navegação

`/clientes-aluguel` hoje é a régua de cobrança (quem pagou, quem deve, dia de
vencimento, repasse), não um cadastro. Ela **não** é absorvida por `/pessoas`;
é renomeada para `/locacoes`, que descreve o que ela realmente faz.

| Antes | Depois |
|---|---|
| Clientes, Leads, Imóveis | Leads, **Pessoas**, **Imóveis** |
| Imóveis em Locação | removido — virou filtro em Imóveis |
| Inquilinos | **Locações** (régua de cobrança) |
| Proprietários | removido — virou filtro em Pessoas |

**Redirects (HTTP 308, permanentes):**

```
/clientes/lista      → /pessoas?papel=comprador
/clientes/adicionar  → /pessoas/nova
/editar-cliente/[id] → /pessoas/[id]
/proprietarios/lista → /pessoas?papel=proprietario
/clientes-aluguel    → /locacoes
/alugueis            → /imoveis?finalidade=aluguel
/imoveis/lista       → /imoveis
```

---

## Ordem de execução

Cada etapa deixa o sistema compilando e utilizável.

| # | Etapa | Depende de |
|---|---|---|
| 0 | Dropar `ClienteAluguels`, reapontar as 5 FKs | — |
| 1 | Migration `pessoas` + `pessoa_id` nas 3 fichas; corrigir `clientes_cpf_key` | 0 |
| 2 | Módulo Go `pessoas` (model, repo, service, handler) com busca por CPF | 1 |
| 3 | Tela `/pessoas` (lista + wizard por papel) e redirects | 2 |
| 4 | Migration de fusão de imóveis + reapontamento das 3 FKs | 0 |
| 5 | Módulo `imoveis` absorve locação; `alugueis` perde o CRUD de imóvel | 4 |
| 6 | Ajustar `contratos`, `portalinquilino`, `vistorias`, `chamados` | 5 |
| 7 | Filtro `finalidade` na rota pública | 5 |
| 8 | Tela `/imoveis` unificada e redirects | 5 |
| 9 | Migration + módulo de propostas (`pessoa_id`, `imovel_id` nullable) | 2, 4 |
| 10 | Tela de proposta com imóvel opcional | 9 |
| 11 | Menu novo, `/locacoes`, remoção dos itens antigos | 3, 8 |

Etapas 1–3 e 4–8 são independentes entre si depois da 0, e podem ser feitas em
paralelo se houver mais de uma frente.

## Verificação

- **Etapa 0:** inserir cobrança, repasse e vistoria para um inquilino criado
  pela API — hoje isso falha por violação de FK; deve passar.
- **Etapa 3:** cadastrar a mesma pessoa (mesmo CPF) como proprietário e depois
  como comprador; deve reaproveitar a identidade e resultar em uma linha em
  `pessoas` e duas fichas.
- **Etapa 7:** requisitar a rota pública e confirmar que nenhum imóvel com
  `finalidade = 'aluguel'` aparece.
- **Etapa 8:** cadastrar imóvel "ambos" e confirmar uma única linha, presente
  nos dois filtros da listagem.
- **Etapa 10:** criar proposta sem imóvel, depois vinculá-la a um imóvel, e
  confirmar que a proposta é a mesma (mesmo `id`, histórico intacto).
- **Etapa 11:** cada rota antiga responde 308 para a nova.

## Riscos

| Risco | Mitigação |
|---|---|
| Vazamento de imóvel de locação na vitrine pública | Etapa 7 é item próprio do plano, com teste próprio |
| Identidade dessincronizada entre `pessoas` e as fichas | Escrita das duas na mesma transação, no service de `pessoas` |
| Perda da régua de cobrança ao "reduzir telas" | `/locacoes` preservada explicitamente como não-objetivo de fusão |
| `alugueis` referenciada por código não mapeado | `grep` por `models.Aluguel` antes da etapa 5; hoje são 7 arquivos |
