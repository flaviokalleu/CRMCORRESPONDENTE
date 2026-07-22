# Wiring — Pagamentos / Financeiro / Relatório

Páginas funcionais portadas da SPA (`frontend/`) para o App Router, sem
polimento de design. Toda chamada client-side passa pelo proxy
`/api/backend/<rota>`; Server Components usam `apiGet`/`apiFetch` de
`@/lib/api-server`.

## Páginas

| Rota | Tipo | Dados |
|---|---|---|
| `/pagamentos/criar` | Client Component | `POST /api/backend/pagamentos/{boleto,pix,universal}`; clientes via `GET /api/backend/clientes` |
| `/pagamentos/lista` | Server Component + client actions | `apiGet('/pagamentos')` → `{ pagamentos, total, page, totalPages }`; excluir via `DELETE /api/backend/pagamentos/:id` |
| `/financeiro/receitas` | Server Component + form client | `apiGet('/receitas')` (array puro); criar via `POST /api/backend/receitas` |
| `/financeiro/despesas` | Server Component + form client | `apiGet('/despesas')` (array puro); criar via `POST /api/backend/despesas` |
| `/financeiro/dashboard` | Server Component | `apiGet('/fluxocaixa/dashboard')` → `{ totalReceitas, totalDespesas, lucro, pendencias }` |
| `/relatorio` | Server Component | `apiGet('/report/relatorio/dados')`; links diretos para `/api/backend/report/relatorio` (HTML) e `/api/backend/report/relatorio/download` (PDF) |

## Endpoints Go confirmados (lidos em `backend-go/internal/modules/...`)

- `pagamentos`: `POST /pagamentos/boleto|pix|universal`, `GET /pagamentos`,
  `GET/PUT/DELETE /pagamentos/:id`. Body de criação: `cliente_id, titulo,
  descricao, valor, data_vencimento (não em pix), observacoes,
  enviar_whatsapp, enviar_email`. Resposta: `{ success, pagamento, asaas: {
  payment_id, invoice_url, status }, envios }`.
- `receitas`/`despesas`: CRUD simples, `GET` retorna array puro (sem
  paginação). Body: `{ tipo, valor, descricao, data, contratoId,
  (corretorId em despesas) }`.
- `fluxocaixa`: `GET /fluxocaixa/dashboard` → `{ totalReceitas,
  totalDespesas, lucro, pendencias }`.
- `relatorios` (mount `/api/report`): `GET /report/relatorio` (HTML), `GET
  /report/relatorio/download` (PDF), `GET /report/relatorio/dados` (JSON).

## Arquivos criados

- `src/app/(app)/pagamentos/criar/page.js`
- `src/app/(app)/pagamentos/lista/page.js`
- `src/app/(app)/financeiro/receitas/page.js`
- `src/app/(app)/financeiro/despesas/page.js`
- `src/app/(app)/financeiro/dashboard/page.js`
- `src/app/(app)/relatorio/page.js`
- `src/components/CriarPagamentoForm.jsx`
- `src/components/PagamentoRowActions.jsx`
- `src/components/ReceitaForm.jsx`
- `src/components/DespesaForm.jsx`

## Fora do escopo (não portado)

Edição de pagamento em modal, reenvio de WhatsApp/Email, comprovantes,
filtros/busca/paginação client-side, cálculo de juros/parcelamento — a
referência SPA tinha esses recursos, mas o pedido era o mínimo funcional
(CRUD + navegação). Podem ser adicionados depois seguindo o mesmo padrão de
proxy.
