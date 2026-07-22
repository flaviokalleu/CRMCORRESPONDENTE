# Docs — Wiring Clientes / Corretores / Correspondentes

## Arquivos criados

### Pages (App Router)
- `src/app/(app)/clientes/adicionar/page.js` — Server Component (cabeçalho) + `AddClienteForm`
- `src/app/(app)/clientes/lista/page.js` — Server Component, `apiGet('/clientes')`
- `src/app/(app)/editar-cliente/[id]/page.js` — Server Component, `apiGet('/clientes/'+id)` + `EditarClienteForm`
- `src/app/(app)/clientes-aluguel/page.js` — Server Component, `apiGet('/clientealuguel')`
- `src/app/(app)/corretores/adicionar/page.js` — Server Component + `AddCorretorForm`
- `src/app/(app)/corretores/lista/page.js` — Server Component, `apiGet('/corretor?all=true')`
- `src/app/(app)/correspondentes/adicionar/page.js` — Server Component + `AddCorrespondenteForm`
- `src/app/(app)/correspondentes/lista/page.js` — Server Component, `apiGet('/correspondente/lista')`

### Componentes (Client Components)
- `src/components/AddClienteForm.jsx` — POST `/api/backend/clientes`
- `src/components/EditarClienteForm.jsx` — PUT `/api/backend/clientes/:id`
- `src/components/AddCorretorForm.jsx` — POST `/api/backend/corretor`
- `src/components/AddCorrespondenteForm.jsx` — POST `/api/backend/correspondente`

## Decisões

- Todos os POSTs/PUTs de formulário usam **JSON** (`Content-Type: application/json`), não
  `multipart/form-data`, porque nenhum campo de arquivo foi portado nesta rodada. Se o
  backend Go exigir multipart mesmo sem arquivo, ajustar depois.
- Listagens tratam tanto array puro quanto `{ data: [...] }` / `{ clientes: [...] }`,
  pois a API antiga (Express) tinha esses dois formatos dependendo da rota; mantive a
  mesma defensividade nos Server Components.
- `clientes-aluguel`: cálculo de "em atraso" replicado da SPA antiga
  (`hoje.getDate() > dia_vencimento`), sem nenhuma ação (pagamento, cobrança avulsa,
  contrato, Asaas) — só leitura.
- Edição de cliente (`EditarClienteForm`) reaproveita os mesmos 7 campos do
  cadastro (não os ~40 campos do modelo completo) para consistência com o form de
  adicionar.

## Campos do cliente NÃO portados (ficaram de fora do escopo simplificado)

Baseado em `ClientForm.jsx` da SPA antiga, os seguintes campos/seções não foram incluídos
no `AddClienteForm` / `EditarClienteForm`:
- Estado civil, naturalidade, data de nascimento, data de admissão, data de criação
- Estado/cidade (via API de estados/municípios do IBGE)
- Tipo de renda (formal/informal/mista), carteira +3 anos, número do PIS
- Dependentes (quantidade e nomes)
- Cônjuge (nome, email, telefone, CPF, profissão, nascimento, renda, tipo de renda, admissão)
- Vincular cliente a outro usuário (userId)
- Observações
- Upload de documentos (documentos pessoais, extrato bancário, docs dependente, docs cônjuge)

Campos do corretor/correspondente NÃO portados: upload de foto (`photo`), validações de
força de senha no client (mantive apenas checagem de confirmação e tamanho mínimo básico
via `required`).

## Dúvidas / pontos a confirmar com o time

1. Confirmar se o endpoint Go `POST /clientes` aceita JSON puro ou exige multipart
   mesmo sem arquivos (a SPA antiga sempre mandava `FormData`).
2. Confirmar formato exato de resposta de erro do Go (usei `data.message || data.error`).
3. `GET /clientes` — confirmar se pagina por padrão (a SPA antiga usava `?page&limit=20`);
   aqui pedimos sem paginação, pode trazer só a primeira página se o backend paginar por default.
4. Rota de status do cliente (`PATCH /clientes/:id/status`) não foi portada — o "Status" na
   listagem é só leitura por enquanto (edição via PUT completo faz isso na EditarClienteForm).
