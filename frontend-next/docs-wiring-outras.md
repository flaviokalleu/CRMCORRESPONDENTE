# Wiring — páginas diversas (App Router)

Esta rodada portou 10 páginas da SPA legada para o App Router (`frontend-next`), seguindo o padrão:
Server Components chamam `apiGet`/`apiFetch` de `@/lib/api-server`; Client Components chamam
`fetch('/api/backend/<rota>')`, nunca o backend Go direto, nunca `localStorage`.

## Páginas criadas

| Página | Tipo | Endpoint(s) Go | Componente client de apoio |
|---|---|---|---|
| `src/app/(app)/whatsapp-qr/page.js` | Client | `/whatsapp/qr-code`, `/whatsapp/connect`, `/whatsapp/reset`, `/whatsapp/disconnect` + WS nativo `/api/ws` | — (a página inteira é client) |
| `src/app/(app)/lembretes/page.js` | Server + form | `GET /lembretes` (SSR); CRUD via proxy | `src/components/LembretesManager.jsx` |
| `src/app/(app)/acessos/page.js` | Server | `GET /acessos`, `GET /acessos/stats` | — (somente leitura) |
| `src/app/(app)/visitas/page.js` | Server + form | `GET /visitas`, `/clientes`, `/imoveis` (SSR); CRUD via proxy | `src/components/VisitasManager.jsx` |
| `src/app/(app)/propostas/page.js` | Server + form | `GET /propostas`, `/clientes`, `/imoveis` (SSR); CRUD via proxy | `src/components/PropostasManager.jsx` |
| `src/app/(app)/minha-assinatura/page.js` | Server | `GET /plan-usage` | — (somente leitura; troca de plano fica para depois) |
| `src/app/(app)/configuracoes-empresa/page.js` | Server + form | `GET /tenant-settings/settings` (SSR); `PUT` via proxy | `src/components/ConfiguracoesEmpresaForm.jsx` |
| `src/app/(app)/super-admin/page.js` | Server | `GET /super-admin/metrics` | — (só visão geral/métricas; abas de CRUD completo ficam para depois) |
| `src/app/(app)/configuracoes/page.js` | Server + form | `GET /user/me` (SSR); `PUT /user/:id` via proxy | `src/components/ConfiguracoesUsuarioForm.jsx` |
| `src/app/(auth)/registro/page.js` | Client, pública | `GET /tenant/plans` (via proxy); `POST /api/auth/register` (BFF novo) | — |
| `src/app/api/auth/register/route.js` | Route Handler novo | `POST /tenant/register` no Go; grava sessão via `setSession` se vier token | — |

## Pendências documentadas

1. **WebSocket + cookie httpOnly (whatsapp-qr)**: o WS nativo do Go (`/api/ws`) é cross-origin em
   relação ao Next quando backend e frontend rodam em hosts/portas diferentes. O cookie httpOnly de
   sessão (`cri_token`) **não é enviado automaticamente** numa conexão WebSocket cross-origin — só
   funciona com o mesmo Origin/porta. A página usa a env var pública `NEXT_PUBLIC_WS_URL` (URL
   absoluta do backend Go) e conecta **sem anexar token**. Isso significa que, em produção com
   domínios separados, o servidor Go precisa: (a) aceitar a conexão WS sem `Authorization`, e/ou
   (b) expor um endpoint que troque o cookie httpOnly por um token de curta duração específico
   para o handshake do WS (ex: `GET /api/ws/ticket` autenticado via cookie, retornando um token
   de uso único para `?token=...` na URL do WS). **Não implementado nesta tarefa** — é uma decisão
   de arquitetura de segurança a ser tomada antes de ir para produção multi-domínio.
   - Env var pendente de configurar: `NEXT_PUBLIC_WS_URL` (ex: `wss://api.seudominio.com`).

2. **Guard de role em `configuracoes-empresa`**: `hasRole('administrador')` do `AuthContext` é
   client-side (depende do `user` carregado no browser). A página Server Component atual renderiza
   normalmente para qualquer usuário autenticado — um guard real no servidor (verificando a role a
   partir do JWT decodificado ou de uma chamada `apiGet('/auth/me')` antes do render) fica para uma
   iteração futura.

3. **`super-admin`**: só a visão geral/métricas principais foi portada (`GET /super-admin/metrics`).
   As abas de Empresas / Planos / Assinaturas (CRUD completo, presentes na SPA em
   `frontend/src/components/SuperAdmin/*`) não foram portadas nesta rodada.

4. **QR Code do WhatsApp**: a geração da imagem do QR usa o serviço público
   `api.qrserver.com` (evita empacotar a lib `qrcode` num Client Component). Se isso for
   inaceitável por política de dados (o payload do QR contém dados de pareamento do WhatsApp),
   trocar por geração local (`qrcode` npm package) numa iteração futura.

5. **Propostas/Visitas**: os selects de cliente/imóvel usam `GET /clientes?limit=500` e
   `GET /imoveis` sem paginação — aceitável para o volume atual, mas deve virar um combobox com
   busca assíncrona se a base de clientes crescer muito.
