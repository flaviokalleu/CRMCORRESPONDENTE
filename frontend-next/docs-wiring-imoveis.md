# Wiring — Imóveis, Proprietários, Laudos, Simulador

Páginas novas em `src/app/(app)/...`, protegidas pelo layout/guard já existente.

## Arquivos criados

### Imóveis
- `src/app/(app)/imoveis/adicionar/page.js` — Server Component fino, renderiza `AddImovelForm`.
- `src/components/AddImovelForm.jsx` — Client Component. Form com nome_imovel, descricao_imovel,
  endereco, tipo, quartos, banheiro, valor_venda, valor_avaliacao, situacao_imovel, localizacao,
  exclusivo, tem_inquilino, observacoes. `POST /api/backend/imoveis` (JSON).
  **TODO upload de imagens**: backend antigo aceitava multipart (`documentacao`, `imagens[]`,
  `imagem_capa`). Não portado — precisa trocar body para `FormData` e remover o
  `Content-Type` manual quando o endpoint de arquivos for confirmado no Go.
- `src/app/(app)/imoveis/lista/page.js` — Server Component, `apiGet("/imoveis")`, tabela simples
  com link para `/imovel/[id]`.
- `src/app/(app)/imovel/[id]/page.js` — Server Component, `apiGet("/imoveis/"+id)`, detalhe interno
  (versão protegida — diferente da página pública). `notFound()` se o imóvel não existir.

### Proprietários
- `src/app/(app)/proprietarios/lista/page.js` — Server Component, `apiGet("/proprietarios")`.
- `src/components/ProprietarioAddForm.jsx` — Client Component pequeno (extra, não pedido
  explicitamente mas incluído para paridade funcional com a SPA): `POST /api/backend/proprietarios`,
  chama `router.refresh()` após salvar para atualizar a lista SSR.

### Laudos
- `src/app/(app)/laudos/page.js` — Server Component, `apiGet("/laudos")`. Aceita tanto array puro
  quanto `{ data: [...] }` (formato antigo com paginação). Sem filtros/paginação client-side nesta
  primeira versão — só a tabela funcional pedida no escopo.

### Simulador
- `src/app/(app)/simulador/page.js` — Server Component fino, renderiza `SimuladorForm`.
- `src/components/SimuladorForm.jsx` — Client Component. Calculadora SAC/PRICE:
  `POST /api/backend/simulacoes/calcular` com `{ valor_imovel, valor_entrada, prazo_meses,
  taxa_juros_anual, sistema }`. Mostra cards de resumo (primeira/última parcela, total pago,
  total de juros, valor financiado, taxa mensal, renda mínima) e tabela de amortização opcional
  (`resultado.parcelas`). Não portado: aba "Simulador Caixa" (iframe) e persistência da simulação
  (`POST /simulacoes`) / histórico por cliente — fora do escopo pedido (só `/simulacoes/calcular`).

## Regras seguidas
- Server Components usam `apiGet` de `@/lib/api-server` (Bearer lido do cookie httpOnly no servidor).
- Client Components usam `fetch("/api/backend/<rota>")` — nunca o Go direto, nunca localStorage,
  nunca axios.
- Navegação com `next/link` / `next/navigation` (`useRouter().refresh()` para revalidar Server
  Components após mutações client-side).
- Nenhum arquivo fora do escopo (`imoveis`, `imovel`, `proprietarios`, `laudos`, `simulador`,
  componentes novos em `src/components/`) foi tocado. Nada de build/dev/install rodado.

## Pendências conhecidas (fora do escopo desta tarefa)
- Upload de imagens/documentação do imóvel.
- Filtros, paginação e alertas de vencimento na tela de Laudos.
- Aba "Simulador Caixa" (iframe) e persistência/histórico de simulações.
