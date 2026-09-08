# Registro de aprovação: renda utilizada, parcela e comprometimento

Data: 2026-09-08

## Problema

Quando um cliente é aprovado pelo banco, o corretor sabe dois números que o CRM
hoje não guarda em lugar nenhum: a renda que o banco efetivamente usou na
análise e o valor da parcela aprovada. Sem esses dois números não é possível
dizer a que percentual de comprometimento da renda a operação foi aprovada —
25%, 30% ou outro valor — e essa informação é o que orienta a conversa seguinte
com o cliente.

A renda que o banco usou nem sempre é a que está no cadastro: o cadastro pode
estar desatualizado, ou o banco pode ter considerado uma composição diferente.
Por isso a renda usada na aprovação é um dado próprio, não uma leitura do
cadastro.

## Escopo

Três coisas, nesta ordem:

1. Persistir renda utilizada, valor da parcela e o percentual calculado.
2. Um modal que pergunta esses dois valores no momento em que o status do
   cliente muda para um status de aprovação.
3. Uma página de aprovação por cliente, para onde o corretor é levado depois de
   preencher o modal.

Fora de escopo nesta entrega: valor do imóvel, subsídio, FGTS, prazo, taxa e
histórico de aprovações sucessivas. A página é desenhada como esqueleto para
receber esses campos depois, quando o usuário trouxer um exemplo real da tela
do banco.

## Modelo de dados

Migration `0010_clientes_aprovacao`, em `backend-go/migrations/`, seguindo o
padrão de `0008_clientes_origem_interesse` (`ADD COLUMN IF NOT EXISTS`, com par
`.up.sql` / `.down.sql`). Colunas novas em `clientes`:

| Coluna | Tipo | Nulo |
|---|---|---|
| `aprovacao_renda_utilizada` | `NUMERIC(12,2)` | sim |
| `aprovacao_valor_parcela` | `NUMERIC(12,2)` | sim |
| `aprovacao_percentual` | `NUMERIC(5,2)` | sim |
| `aprovacao_registrada_em` | `TIMESTAMPTZ` | sim |

As três primeiras são numéricas de propósito. A coluna `valor_renda` que já
existe é `VARCHAR` com o número formatado em pt-BR (`"1.234,56"`), um gotcha
herdado da migração do backend Node que obriga todo consumidor a fazer
`REPLACE`/`CAST` em SQL (ver `dashboards/service.go:318`). Os campos novos não
repetem esse erro.

Os quatro campos entram no struct `models.Cliente` como ponteiros, junto do
bloco "3.6 Formulários Caixa / aprovação", que é onde `tela_aprovacao` já vive.

## Cálculo

O percentual de comprometimento é `parcela / renda * 100`, arredondado para uma
casa decimal. Renda de 2.000,00 com parcela de 600,00 dá 30,0%.

O cálculo mora no backend e é a única fonte de verdade: o valor gravado em
`aprovacao_percentual` é sempre o que o servidor calculou, nunca um número
enviado pelo cliente. O frontend recalcula o mesmo valor enquanto o corretor
digita, mas apenas como retorno visual imediato; ao salvar, o percentual exibido
passa a ser o da resposta do servidor.

Renda ausente, zero ou negativa é erro de validação (`422`), não uma divisão que
resulta em infinito. Parcela negativa idem.

## Divergência com o cadastro

A renda informada no modal nunca sobrescreve `valor_renda` do cliente. Os dois
valores coexistem: o cadastro continua sendo o que o corretor levantou, e a
renda da aprovação passa a ser o que o banco usou. Quando os dois diferem, o
modal mostra a diferença como aviso, sem bloquear o envio — divergir é uma
informação legítima, não um erro.

## Endpoint

`PUT /clientes/:id/aprovacao`, registrado no mesmo grupo de rotas de
`clientes/routes.go`, sob a mesma autenticação e o mesmo recorte de tenant das
rotas vizinhas.

Corpo: `{"renda_utilizada": number, "valor_parcela": number}`.

Resposta: o cliente atualizado, no mesmo formato do `GET /clientes/:id`, já com
`aprovacao_percentual` calculado.

Erros: `422` para renda ausente/zero/negativa ou parcela negativa; `404` para
cliente de outro tenant, igual às demais rotas do módulo.

A rota é separada de `PATCH /clientes/:id/status`. A mudança de status continua
funcionando exatamente como hoje e não depende do modal: o status é aplicado
primeiro, o modal grava depois. Se o corretor fechar o modal sem preencher, o
status já vale e a aprovação fica pendente — estado normal, não excepcional,
resolvido na página de aprovação.

## Modal

Componente novo `AprovacaoModal.jsx`, construído sobre o `Dialog` do shadcn e
classes utilitárias do Tailwind. Nenhuma classe nova em arquivo `.css`.

Dispara nos três pontos onde o status já muda hoje: o dropdown da tabela e o
arrastar do kanban, ambos em `ClientesLista.jsx` (função de mudança de status,
por volta da linha 496), e o select de status do `ClienteDrawer.jsx`. Em todos,
o `PATCH` sai como sempre; o modal abre quando a resposta volta com sucesso e o
novo status é um destes três valores do enum `StatusValidos`:
`cliente_aprovado`, `condicionado`, `aprovado`.

Conteúdo:

- Campo **renda utilizada**, pré-preenchido com `valor_renda` do cliente. Abaixo
  dele, em texto secundário, a renda que consta no cadastro; se o corretor
  alterar o número, o aviso de divergência aparece.
- Campo **valor da parcela aprovada**.
- Linha de resultado, recalculada a cada tecla: o percentual da renda.
- Ação primária "Salvar e abrir tela de aprovação", que grava e navega para a
  página de aprovação; ação secundária "Depois", que fecha sem gravar.

Os inputs usam `h-12`. O seletor global de `crm-design.css` impõe
`min-height: 48px` a todo `input` dentro de `.crm-content` e vence utilitárias
do Tailwind por especificidade; adotar 48px faz os dois concordarem em vez de
disputarem.

## Página de aprovação

Rota nova: `frontend-next/src/app/(app)/clientes/[id]/aprovacao/page.jsx`.

Mostra o nome e o CPF do cliente com a pílula de status, e três blocos de
leitura — renda utilizada, parcela aprovada e o percentual em destaque. Um botão
"Editar" reabre o mesmo modal com os valores atuais.

Quando nenhum valor foi registrado ainda, a página apresenta o formulário
diretamente, em vez de um vazio inerte. Esse é o caminho de quem fechou o modal
em "Depois".

## Testes

Backend, em Go: o cálculo (600 sobre 2.000 resulta em 30,0); renda zero devolve
`422`; cliente de outro tenant devolve `404`; a gravação preenche
`aprovacao_registrada_em`.

Frontend: o modal abre nos três status de aprovação e não abre nos demais; o
percentual acompanha a digitação; "Depois" fecha sem chamar o endpoint.
