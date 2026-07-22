# Wiring — Aluguéis, Contratos e Portal do Inquilino

## Escopo entregue

- `src/app/(app)/alugueis/page.js` — Server Component, `apiGet('/alugueis')`, tabela funcional (sem cards/fotos) com ações por linha.
- `src/app/(app)/alugueis/adicionar/page.js` — Client Component, form multipart via `fetch('/api/backend/alugueis', { method: 'POST', body: FormData })`.
- `src/app/(app)/contratos/lista/page.js` — Server Component, `apiGet('/contratos')` + `apiGet('/contratos/opcoes')`, form de vínculo e tabela de contratos.
- `src/components/aluguel/AluguelRowActions.jsx` — Client, deletar/alternar status/baixar fotos.
- `src/components/aluguel/ContratoVincularForm.jsx` — Client, vincular contrato + upload de documentos.
- `src/components/aluguel/ContratoRowActions.jsx` — Client, deletar contrato + baixar documentos.
- `src/app/portal/inquilino/page.js` — Client Component, PÚBLICA (fora de `(app)`), login próprio por CPF.
- `src/app/api/portal/login/route.js` — Route Handler: recebe `{ cpf }`, chama `POST {API_URL}/portal/login` no Go, grava cookie `cri_portal_token`.
- `src/app/api/portal/logout/route.js` — limpa o cookie `cri_portal_token`.
- `src/app/api/portal/[...path]/route.js` — proxy genérico do portal, injeta `Authorization: Bearer` a partir de `cri_portal_token`.

## Decisão: autenticação do Portal do Inquilino é paralela e independente

O Portal do Inquilino (`/portal/inquilino`) fica **fora** do grupo `(app)` e não usa `hasSession()`/`AuthContext` do CRM principal — ele tem seu próprio fluxo de login por CPF, com um JWT tipo `"inquilino"` (24h, sem tenant scope) emitido pelo backend Go em `POST /api/portal/login`.

Ponto importante em relação ao enunciado original: **conferi o handler real do backend** (`backend-go/internal/modules/portalinquilino/{handler,dto}.go`) e o `LoginRequest` aceita **somente `{ cpf }`** — não há campo de senha na rota `/portal/login`. O formulário e o route handler foram implementados de acordo com o contrato real do Go, não com a suposição de "CPF+senha" do enunciado.

Para nunca reaproveitar a sessão do CRM (cookies `cri_token`/`cri_refresh` de `src/lib/session.js`, que não foi tocado):

- Criei um cookie **próprio** `cri_portal_token` (httpOnly, `sameSite: lax`, `secure` em produção, `maxAge: 24h`), gravado apenas em `src/app/api/portal/login/route.js` via `NextResponse.cookies.set`.
- O proxy `src/app/api/portal/[...path]/route.js` é uma cópia adaptada de `src/app/api/backend/[...path]/route.js`, mas lê o token de `cri_portal_token` (via `next/headers` `cookies()` direto, sem importar `src/lib/session.js`) e não tenta refresh automático (o portal não tem endpoint de refresh — expira em 24h e força novo login).
- `src/app/api/portal/logout/route.js` limpa somente `cri_portal_token`.
- O Client Component do portal nunca guarda o JWT (nem em variável de estado nem em localStorage) — após o login bem-sucedido, a API retorna só `{ nome, email }`; todas as chamadas seguintes (`/api/portal/meus-dados`, `/cobrancas`, `/recibos`, `/chamados`, `/recibo/:id/pdf`, `/contrato`) passam pelo proxy, que injeta o Bearer no servidor.

## Rotas de backend usadas

- `GET /alugueis`, `POST /alugueis` (multipart), `PUT /alugueis/:id/alugado`, `DELETE /alugueis/:id`, `GET /alugueis/:id/download`
- `GET /contratos`, `GET /contratos/opcoes`, `POST /contratos/vincular`, `POST /contratos/:id/documentos`, `PUT /contratos/:id/atualizar`, `DELETE /contratos/:id`, `GET /contratos/documento/:id/download`
- `POST /portal/login`, `GET /portal/meus-dados`, `GET /portal/cobrancas`, `GET /portal/recibos`, `GET /portal/recibo/:id/pdf`, `GET /portal/contrato`, `GET/POST /portal/chamados` (confirmado em `backend-go/internal/server/router.go` — módulo `chamados`, autenticado com o mesmo `AuthInquilino` do portal)

## Observações

- Não editei nada em `src/lib/session.js`, `src/app/api/auth/*` ou `src/app/api/backend/*`.
- Imagens dos imóveis (foto de capa / adicionais) foram deixadas de fora da listagem por simplicidade funcional — exibir thumbnails exigiria expor a origem do backend Go ao navegador (hoje `API_URL` é server-only por design), o que ficou fora do escopo pedido.
- Build/dev/install não foram executados, conforme instruído.
