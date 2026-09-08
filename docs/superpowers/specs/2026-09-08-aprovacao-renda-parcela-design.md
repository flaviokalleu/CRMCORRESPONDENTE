# Registro das avaliações do SIOPI no CRM

Data: 2026-09-08 (revisado no mesmo dia, depois das telas de referência)

## Problema

Toda proposta que o correspondente envia à Caixa volta como uma tela do SIOPI
com o resultado da avaliação de risco. Hoje essa tela só existe como print no
WhatsApp do corretor: o CRM não guarda nenhum dos números, e por isso não
consegue responder perguntas básicas — a que percentual da renda a operação foi
aprovada, qual a validade da avaliação, por que a proposta anterior foi
reprovada.

O percentual de comprometimento é o que mais falta. Ele é a parcela dividida
pela renda que o banco usou, e é o número que orienta a conversa seguinte com o
cliente. A renda que o banco usou nem sempre é a do cadastro, então precisa ser
informada, não deduzida.

## Telas de referência

O usuário forneceu sete capturas do SIOPI, em três formatos.

**Aprovada** — cabeçalho "DADOS DA AVALIAÇÃO", às vezes precedido de um bloco
"DADOS DOS PROPONENTES" com Cliente, CPF e Agência de relacionamento. Campos:
Resultado da Avaliação, Código Avaliação, Validade (um intervalo, "03/09/2025 a
14/12/2025"), Código Proposta, Protocolo do Cadastro, Origem de Recurso (FGTS),
Modalidade (Aquisição de imóvel novo/usado/na planta), Produto (NPMCMV - …),
Valor do Imóvel, Valor Financiamento, Prestação, Indexador (TR), Sistema de
Amortização (PRICE), Prazo em meses (420), Sistema Originador (SIOPI).

**Condicionada** — Código Proposta, Código Avaliação, Código do Correspondente,
CPF, Nome do Cliente, Condição de Aprovação (texto longo), Valor da prestação
Possível, Resposta SIRIC (data e hora).

**Reprovado** — Código Proposta, Código Avaliação, Código do Correspondente,
CPF, Nome do Cliente, Motivo Reprovação (texto longo), Resposta SIRIC.

As capturas mostram o mesmo CPF reprovado em 03/09 e condicionado em 09/09. Uma
avaliação não substitui a anterior: elas formam um histórico, e é assim que o
sistema as guarda.

## Escopo

1. Uma tabela `cliente_avaliacoes`, com histórico por cliente.
2. Endpoints para criar, listar e editar avaliações.
3. Um modal que abre quando o status do cliente muda para um resultado de
   avaliação, com os campos do formato correspondente.
4. Uma página por cliente que reproduz a tela do SIOPI e lista o histórico.

Fora de escopo: leitura automática do print (OCR ou modelo de visão) — os dados
são digitados. O campo `tela_aprovacao`, que já existe como upload de documento,
continua funcionando como está e não é tocado por esta entrega.

## Modelo de dados

Tabela nova `cliente_avaliacoes`, criada pela migration `0010_cliente_avaliacoes`
em `backend-go/migrations/`, com o par `.up.sql` / `.down.sql` do padrão
existente.

```
id                        BIGSERIAL PK
cliente_id                BIGINT NOT NULL REFERENCES clientes(id) ON DELETE CASCADE
tenant_id                 BIGINT NOT NULL
criado_por                BIGINT NULL          -- users.id
resultado                 VARCHAR(16) NOT NULL -- aprovada | condicionada | reprovada

codigo_proposta           VARCHAR(40)
codigo_avaliacao          VARCHAR(40)
codigo_correspondente     VARCHAR(40)
resposta_siric            TIMESTAMPTZ

motivo_reprovacao         TEXT
condicao_aprovacao        TEXT
valor_prestacao_possivel  NUMERIC(12,2)

protocolo_cadastro        VARCHAR(40)
agencia_relacionamento    VARCHAR(20)
validade_inicio           DATE
validade_fim              DATE
origem_recurso            VARCHAR(60)
modalidade                VARCHAR(120)
produto                   VARCHAR(160)
valor_imovel              NUMERIC(12,2)
valor_financiamento       NUMERIC(12,2)
prestacao                 NUMERIC(12,2)
indexador                 VARCHAR(20)
sistema_amortizacao       VARCHAR(20)
prazo_meses               INTEGER
sistema_originador        VARCHAR(40)

renda_utilizada           NUMERIC(12,2)
percentual_renda          NUMERIC(5,2)

created_at, updated_at    TIMESTAMPTZ NOT NULL
```

Índice `(tenant_id, cliente_id, created_at DESC)`, que é exatamente como a
página lê o histórico.

Os campos monetários são `NUMERIC`. A coluna `valor_renda` de `clientes` é
`VARCHAR` com o número formatado em pt-BR ("1.234,56"), herança da migração do
backend Node que obriga todo consumidor a fazer `REPLACE`/`CAST` em SQL (ver
`internal/modules/dashboards/service.go`). As colunas novas não repetem isso.

`CPF` e `Nome do Cliente`, que aparecem nas telas, não viram coluna: já estão em
`clientes`, e duplicá-los criaria duas verdades sobre o mesmo dado.

Campos de texto livre (`produto`, `modalidade`, `origem_recurso`, `indexador`,
`sistema_amortizacao`, `sistema_originador`) são `VARCHAR` sem `CHECK`. O SIOPI
muda a nomenclatura dos produtos sem aviso, e um enum obrigaria uma migration a
cada produto novo — o mesmo raciocínio já aplicado a `origem` na migration 0008.

`tenant_id` é copiado do cliente na criação e usado no recorte de toda leitura,
como nas demais tabelas do sistema.

## Resultado e status

O `resultado` da avaliação é derivado do status para o qual o cliente acabou de
mudar:

| Status | Resultado |
|---|---|
| `cliente_aprovado`, `aprovado` | `aprovada` |
| `condicionado` | `condicionada` |
| `reprovado` | `reprovada` |

Qualquer outro status não dispara nada. O `resultado` é gravado na avaliação,
não relido do cliente: o status do cliente muda com o tempo, e uma avaliação
antiga precisa continuar dizendo o que ela foi.

## Percentual de comprometimento

`percentual_renda = parcela / renda_utilizada * 100`, arredondado a uma casa
decimal. Renda de 2.000,00 com parcela de 600,00 dá 30,0.

A parcela depende do formato: `prestacao` numa avaliação aprovada,
`valor_prestacao_possivel` numa condicionada. Uma reprovada não tem parcela nem
renda — o modal não pergunta e o percentual fica nulo.

O cálculo mora no backend e é a única fonte de verdade: `percentual_renda` é
sempre o que o servidor calculou, nunca um valor enviado pelo cliente. O
frontend recalcula o mesmo número enquanto o corretor digita, apenas como
retorno visual.

Renda informada menor ou igual a zero, ou parcela negativa, é erro `422`. Renda
em branco numa aprovada ou condicionada é permitida: significa "ainda não sei",
e o percentual fica nulo até alguém preencher.

## Divergência com o cadastro

A renda informada na avaliação nunca sobrescreve `valor_renda` do cliente. Os
dois coexistem: o cadastro é o que o corretor levantou, a renda da avaliação é o
que o banco usou. Quando diferem, o modal mostra a diferença como aviso, sem
bloquear — divergir é informação legítima, não erro.

## Endpoints

Registrados no grupo de `clientes/routes.go`, sob a mesma autenticação e o mesmo
recorte de tenant das rotas vizinhas.

- `POST /clientes/:id/avaliacoes` — cria. Corpo com os campos do formato; o
  servidor calcula `percentual_renda` e grava `tenant_id`, `criado_por` e
  `resultado`.
- `GET /clientes/:id/avaliacoes` — lista, da mais recente para a mais antiga.
- `PUT /clientes/:id/avaliacoes/:avaliacaoId` — edita uma avaliação existente e
  recalcula o percentual.

`Código Proposta` e `Código Avaliação` são obrigatórios; ausentes, `422`. Os
demais campos são opcionais — o corretor às vezes registra a avaliação antes de
ter a tela inteira à mão. Cliente ou avaliação de outro tenant devolve `404`,
como no resto do módulo.

O `PATCH /clientes/:id/status` continua exatamente como está. O status é
aplicado primeiro e o modal grava depois; fechar o modal sem preencher deixa o
status valendo e nenhuma avaliação registrada, estado normal que a página de
avaliações resolve.

## Modal

Componente `AvaliacaoModal.jsx`, sobre o `Dialog` do shadcn e utilitárias do
Tailwind. Nenhuma classe nova em arquivo `.css`.

Dispara nos pontos onde o status já muda: o dropdown da tabela e o arrastar do
kanban, ambos em `ClientesLista.jsx`, e o salvamento do `ClienteDrawer.jsx` (que
grava o cliente inteiro por `PUT`, então o gatilho ali é o status ter mudado em
relação ao carregado).

Um componente só, com três conjuntos de campos escolhidos pelo `resultado`:

- **Aprovada:** Código Proposta, Código Avaliação, Protocolo do Cadastro,
  Validade (duas datas), Origem de Recurso, Modalidade, Produto, Valor do
  Imóvel, Valor Financiamento, Prestação, Indexador, Sistema de Amortização,
  Prazo em meses, Sistema Originador, Agência de relacionamento. Mais Renda
  utilizada, pré-preenchida com o `valor_renda` do cadastro, e o percentual
  recalculado a cada tecla.
- **Condicionada:** Código Proposta, Código Avaliação, Código do
  Correspondente, Condição de Aprovação (área de texto), Valor da prestação
  possível, Resposta SIRIC. Mais renda utilizada e percentual.
- **Reprovada:** Código Proposta, Código Avaliação, Código do Correspondente,
  Motivo da Reprovação (área de texto), Resposta SIRIC.

Ações: "Salvar e abrir a avaliação", que grava e navega para a página, e
"Depois", que fecha sem gravar.

Os campos usam a classe `cx-input` já empregada no `ClienteDrawer`, ou `h-12`:
`crm-design.css` impõe `min-height: 48px` a todo input dentro de `.crm-content`
e vence utilitárias do Tailwind por especificidade.

## Página de avaliações

Rota nova `frontend-next/src/app/(app)/clientes/[id]/aprovacao/page.jsx`.

A avaliação mais recente aparece em destaque, reproduzindo o layout de tabela do
SIOPI: duas colunas, rótulo à esquerda e valor à direita, com uma faixa de
cabeçalho colorida pelo resultado. A cor vem dos tons que `cliente-status.js` já
calibrou (`statusInfo`, campos `solid`, `soft` e `ink`), não de valores novos —
aqueles tons foram escolhidos no limite de contraste AA e não devem ser
recriados a olho.

Ao lado, o bloco de comprometimento: renda utilizada, parcela considerada e o
percentual em destaque.

Abaixo, o histórico — uma linha por avaliação, com data, resultado e código da
proposta. Clicar troca qual avaliação ocupa o destaque.

Botões "Editar", que reabre o modal sobre a avaliação em destaque, e "Nova
avaliação". Quando o cliente não tem nenhuma avaliação, o modal abre direto, em
vez de uma página vazia.

## Testes

Backend, em Go: o cálculo por formato (aprovada usa `prestacao`, condicionada
usa `valor_prestacao_possivel`, reprovada devolve nulo); 600 sobre 2.000 dá
30,0; renda zero devolve `422`; código de proposta ou de avaliação ausente
devolve `422`; avaliação de cliente de outro tenant devolve `404`.

Frontend: a lógica pura (mapa de status para resultado, cálculo do percentual,
escolha da parcela por formato) fica em `src/lib/avaliacao.js` e é verificada
por `node`. O `frontend-next` não tem runner de teste — `package.json` declara
apenas `dev`, `build`, `start` e `lint` — então a UI é verificada por roteiro
manual no navegador, com passos e resultados esperados explícitos. Instalar um
runner de teste no frontend é trabalho próprio, fora desta entrega.
