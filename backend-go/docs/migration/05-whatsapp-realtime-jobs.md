# 05 — WhatsApp, Realtime, Jobs, Email e Notificações (Node.js → Go)

> Especificação de migração do cluster mais frágil do backend. Documento **grounded** no código real em
> `C:\Users\kalle\Documents\CRMCORRESPONDENTE\backend\src`. Não contém código Go final — apenas o inventário
> exaustivo do comportamento atual + o mapa de-para para a implementação em Go (whatsmeow, gorilla/websocket,
> robfig/cron, gomail).

---

## Visão geral

O cluster cobre 5 subsistemas acoplados:

| Subsistema | Lib Node atual | Alvo Go | Arquivos-fonte |
|---|---|---|---|
| WhatsApp | `whaileys` (fork do `@whiskeysockets/baileys`) | `go.mau.fi/whatsmeow` | `routes/whatsappRoutes.js`, `services/baileysAuthStateAdapter.js`, `services/whatsappSessionService.js`, `services/whatsappFileSessionManager.js`, `models/WhatsappSession.js`, `models/WhatsApp.js` |
| Realtime | `socket.io` v4 | `gorilla/websocket` (hub próprio) | `socket.js`, `server.js` (bloco `io.on('connection')`), emits espalhados em routes/controllers |
| Jobs/Cron | `node-cron` + `moment-timezone` | `robfig/cron/v3` + `time`/tz | `routes/cronJobs.js`, `jobs/enviarParcelas.js` |
| Email | `nodemailer` (SMTP) | `gopkg.in/gomail.v2` | `services/emailService.js` |
| Notificações/Timeline | Sequelize + socket.io | GORM + hub WS | `routes/notificacaoRoutes.js`, `routes/timelineRoutes.js`, `models/notificacao.js` |

**Pontos de fragilidade (atenção máxima na migração):**

1. **Estado de sessão WhatsApp em memória** (`tenantRuntimes: Map<tenantId, runtime>`) — cada tenant tem
   um runtime único (`sock`, `qrCodeData`, `isAuthenticated`, `reconnectAttempts`, `connectionBlocked`, ...).
   Persistência de credenciais é no banco (`whatsapp_sessions`), mas o socket vivo é só memória.
2. **Multi-tenant por prefixo de sessionId**: `tenant_{tenantId}__{sessionId}`. TODA a lógica de rooms,
   reconexão e storage depende desse prefixo.
3. **Broadcast Socket.IO com fallback silencioso** — se o `io` não está pronto no boot, o broadcast é ignorado
   (`try/catch`). O whatsmeow/Go precisa replicar tolerância a ausência de listeners.
4. **Reconexão**: limite de 5 tentativas, backoff linear (`5s * n`, teto 30s), erro **405 = bloqueado, NÃO
   reconectar** (`connectionBlocked = true`), `loggedOut` também não reconecta.
5. **Auto-reconexão no boot**: 5s após subir, lê `whatsapp_sessions` com `status='active'` e reconecta cada uma.
6. **Cron chama a própria API HTTP** (`fetch` para `/api/whatsapp/send-message`) em vez de chamar a camada de
   serviço diretamente — acoplamento HTTP interno que deve virar chamada de função direta em Go.

---

## WhatsApp (Baileys → whatsmeow)

### Dependência e import atual

```js
const whaileys = require('whaileys');            // fork do baileys
const makeWASocket = whaileys.default;
const { DisconnectReason, fetchLatestWaWebVersion } = whaileys;
// no adapter:
const { BufferJSON, makeCacheableSignalKeyStore, initAuthCreds } = require('whaileys');
```

### Estado por tenant (runtime em memória)

`routes/whatsappRoutes.js` mantém `const tenantRuntimes = new Map()`. Cada runtime:

```js
{
  tenantId,
  sock: null,                 // instância makeWASocket
  qrCodeData: null,           // string do QR bruto (não é dataURL)
  isAuthenticated: false,
  isInitializing: false,
  currentSessionId: 'tenant_{id}__default',
  authStateAdapter: null,     // BaileysAuthStateAdapter
  reconnectAttempts: 0,
  connectionBlocked: false,   // true quando 405 OU limite de tentativas
}
```

Constantes: `DEFAULT_SESSION_ID = 'default'`, `MAX_RECONNECT_ATTEMPTS = 5`.

### Convenção de sessionId multi-tenant

| Função | Comportamento |
|---|---|
| `sanitizeSessionId(id)` | trim + `replace(/[^a-zA-Z0-9_-]/g, '_')`; vazio → `'default'` |
| `getTenantSessionPrefix(tenantId)` | `` `tenant_${tenantId}__` `` |
| `buildStoredSessionId(tenantId, sessionId)` | `` `tenant_${tenantId}__${sanitize(sessionId)}` `` |
| `toPublicSessionId(tenantId, stored)` | remove o prefixo → id "público" mostrado ao frontend |

O **stored** id vai para o banco/whatsmeow store; o **public** id vai para respostas de API e eventos WS.

### Resolução de tenant (middleware)

`resolveWhatsAppTenant` (aplicado via `router.use`), precedência:
1. `req.user.is_super_admin` + header `x-tenant-id` válido → usa header.
2. `req.user.tenant_id` → usa do JWT.
3. header `x-tenant-id` válido (sem auth) → usa header.
4. senão → `400 { error: 'Tenant não informado' }`.

Precedido de `optionalAuthenticateToken` (só valida Bearer se o header `authorization` existir).

### Fluxo de inicialização / QR pairing — `initializeWhatsAppClient(tenantId, storedSessionId)`

1. Guard `isInitializing` (evita init concorrente).
2. Cria `BaileysAuthStateAdapter(storedSessionId)`; `markAsConnecting()` (grava `status='connecting'` no banco).
3. `fetchLatestWaWebVersion({})` com fallback `[2, 3000, 1035608266]`.
4. `useDBAuthState()` retorna `{ state, saveCreds }`.
5. `makeWASocket({ auth: state, version, browser: ['CRM IMOB', 'Chrome', '22.0'] })`.
6. **Timeout de segurança 35s**: se ainda `isInitializing` sem QR/conexão → reseta estado, `sock.end()`,
   emite `whatsapp:update {type:'error', message:'Timeout ao gerar QR Code...'}`.
7. Handlers em `sock.ev`:
   - `creds.update` → `saveCreds`.
   - `connection.update` → trata `qr`, `connection==='open'`, `connection==='close'` (ver abaixo).
   - `connection.error` → só loga.
   - `messages.upsert` → broadcast `whatsapp:update {type:'messageReceived', data: m}`.

**Guard de corrida** `isCurrentSocketRuntime(runtime, tenantSock, storedSessionId)`: só processa evento se
`runtime.sock === tenantSock && runtime.currentSessionId === storedSessionId` (descarta eventos de sockets
antigos após troca de sessão).

#### connection.update → qr
- Descarta se não for o socket corrente.
- `clearTimeout`, `isInitializing=false`, `qrCodeData=qr`.
- broadcast `{type:'qr', tenantId, qrCode: qr, sessionId, message:'QR Code disponível para escaneamento'}`.

#### connection.update → open
- `isAuthenticated=true`, `isInitializing=false`, `qrCodeData=null`, `reconnectAttempts=0`, `connectionBlocked=false`.
- Extrai telefone: `sock.user?.id?.replace(/:\d+@.*/, '')`.
- `adapter.markAsAuthenticated(phoneNumber)` → `status='active'`, `is_authenticated=true`, `phone_number`.
- broadcast `{type:'status', status:'ready', phoneNumber, sessionId}`.

#### connection.update → close (reconexão)
- `isAuthenticated=false`, `isInitializing=false`, `qrCodeData=null`.
- `adapter.markAsDisconnected()`; se houve erro, `markAsError()`.
- `statusCode = lastDisconnect?.error?.output?.statusCode`.
- `shouldReconnect = statusCode !== DisconnectReason.loggedOut && statusCode !== 405`.
- broadcast `{type:'status', status:'disconnected'}`.
- **Decisão de reconexão:**
  - `shouldReconnect && reconnectAttempts < 5` → `reconnectAttempts++`, `delay = min(5000*n, 30000)`,
    `setTimeout(() => initializeWhatsAppClient(...), delay)`.
  - `statusCode === 405` → `connectionBlocked=true`, **não reconecta**.
  - `reconnectAttempts >= 5` → `connectionBlocked=true`, para.
  - `loggedOut` → não reconecta.

### Persistência de sessão

**Dois storages coexistem** (o de banco é o usado; o de arquivos é legado):

1. **Banco (ATIVO)** — `services/whatsappSessionService.js` + `services/baileysAuthStateAdapter.js`
   sobre a tabela `whatsapp_sessions` (model `WhatsappSession`).
2. **Arquivos (LEGADO/ÓRFÃO)** — `services/whatsappFileSessionManager.js` grava em
   `backend/whatsapp_sessions/{sessionId}/` (`session_info.json`, `creds.json`). **Não é referenciado por
   `whatsappRoutes.js`** (comentário no topo: "sessionManager removido"). Migrar apenas se houver dados legados;
   caso contrário **descartar**.

#### `BaileysAuthStateAdapter` (o coração do storage)

- `useDBAuthState()`:
  - Carrega `WhatsAppSessionService.loadSession(sessionId)` → `{ creds, keys }` (JSONB).
  - Valida `creds.noiseKey && creds.signedIdentityKey && creds.registrationId`; senão `initAuthCreds()` novo.
  - Serialização Baileys: `BufferJSON.replacer`/`reviver` (Buffers viram `{type:'Buffer', data:[...]}`).
  - `rawKeyStore.get(type, ids)` / `.set(data)` → chaves Signal indexadas por `` `${type}-${id}` `` dentro de
    `keys`. `.set` persiste assíncrono via `saveSession`.
  - `keys = makeCacheableSignalKeyStore(rawKeyStore, console)` (cache em memória sobre o store).
  - `saveCreds()` → grava `{creds, keys}` no banco.
- Métodos de status (gravam em `whatsapp_sessions`): `markAsAuthenticated(phone)`→'active',
  `markAsDisconnected()`→'inactive', `markAsConnecting()`→'connecting', `markAsError()`→'error',
  `deleteSession()`, `resetSession()` (delete), `getSessionInfo()`.

#### `WhatsAppSessionService` (métodos estáticos sobre o model)

`saveSession`, `loadSession`, `deleteSession`, `listSessions` (com metadados), `sessionExists`,
`createSession(id, force)`, `resetSession(id)` (delete+create), `getSessionInfo(id)`,
`listActiveSessions()` (`status='active'`, usado no auto-reconnect), `markAllInactive()`.

### Envio / recebimento de mensagens

- **Envio**: `sock.sendMessage(jid, { text: mensagem })`; retorna `result.key.id`.
  - JID formatado por `formatPhoneNumber(phone)` → `` `${num12}@s.whatsapp.net` `` .
  - **Regra brasileira (CRÍTICA — replicar exatamente)**: remove o "9º dígito" adicional; resultado final
    DEVE ter 12 dígitos (`55 + DDD + 8`). Casos: 13 díg com 5º=='9' → remove; 11 díg com 3º=='9' → remove + `55`;
    10 díg → só `55`. Se ≠12 díg → `null` (inválido, aborta envio).
- **Recebimento**: `messages.upsert` → broadcast `whatsapp:update {type:'messageReceived', data: m}` (não
  persiste; apenas repassa ao frontend).

### Auto-reconexão no boot

No fim de `whatsappRoutes.js`, `setTimeout(..., 5000)`:
- `WhatsAppSessionService.listActiveSessions()`.
- Para cada, extrai tenant via regex `` /^tenant_(\d+)__(.+)/ `` e chama `initializeWhatsAppClient(tenantId, session.id)`.

### Inventário de endpoints (base `/api/whatsapp`)

| Método | Rota | Função | Equivalente whatsmeow (Go) |
|---|---|---|---|
| GET | `/qr-code` | Retorna estado atual (não inicializa). Ordem: authenticated → blocked → qrCodeData → isInitializing → idle | Ler estado do `ClientManager` do tenant; QR vem do `client.GetQRChannel` |
| POST | `/connect` | Init manual; espera 4s; devolve `qrCode` se pronto | `client.Connect()`; se `client.Store.ID == nil` abrir QR channel |
| GET | `/status` | `isConnected = sock.user !== undefined` + `getSessionInfo()` | `client.IsConnected()` + `client.IsLoggedIn()` + registro do banco |
| POST | `/reset` | disconnect + `resetSession()` (limpa credenciais) | `client.Logout()`/`Disconnect()` + apagar device do sqlstore |
| POST | `/disconnect` | `disconnectTenantRuntime({deleteSession})`; broadcast `status:disconnected` | `client.Disconnect()`; se deleteSession, `container.DeleteDevice(store)` |
| POST | `/send-message` | body `{phone, message}` → `sendMessage` | `client.SendMessage(ctx, jid, &waE2E.Message{Conversation})` |
| POST | `/restart` | disconnect + reset + reinit (2s delay) | Recriar client do device |
| POST | `/notificarClienteCadastrado` | monta ficha completa e envia p/ `telefoneUsuarioResponsavel` | idem send |
| POST | `/notificarStatusAlterado` | msg de mudança de status | idem |
| POST | `/notificarNotaAdicionada` | envia + emite `whatsapp-nota-adicionada` (Socket.IO global) | send + hub broadcast |
| POST | `/notificarNotasConcluidas` | msg de notas concluídas | idem |
| POST | `/notificarCorrespondentesNotaConcluida` | busca `User{is_correspondente:true, tenant_id}`, envia p/ todos (delay 1s entre) | loop send |
| POST | `/notificarCorrespondenteDocumentosEnviados` | idem, com detalhamento de documentos | loop send |
| POST | `/enviar-pagamento` | msg PIX/Boleto p/ cliente com link | send |
| POST | `/reenviar-pagamento/:pagamentoId` | busca `Pagamento`+`Cliente`, faz `fetch` interno p/ `/enviar-pagamento`, marca `whatsapp_enviado` | chamada de serviço direta |
| POST | `/session/create` | `{sessionId, forceCreate}`; cria e troca | `container.NewDevice()` |
| DELETE | `/session/:sessionId` | `?force=` ; bloqueia deletar ativa sem force | `container.DeleteDevice` |
| GET | `/sessions` | lista sessões do tenant (filtra por prefixo) | `container.GetAllDevices()` filtrado |
| POST | `/session/switch` | troca sessão ativa (disconnect + init nova) | trocar client ativo |
| POST | `/session/reset/:sessionId` | reset de sessão específica | delete+new device |
| POST | `/sessions/cleanup` | remove sessões > 30 dias sem atividade | job de limpeza |
| GET | `/session/:sessionId` | info detalhada de uma sessão | ler device + registro |

> ⚠️ **Bug preexistente**: existem DUAS definições de `/notificarClienteCadastrado`, `/notificarStatusAlterado`,
> `/notificarNotaAdicionada`, `/notificarNotasConcluidas`, `/notificarCorrespondentesNotaConcluida` (linhas ~776 e
> ~1772). O **segundo bloco** referencia `sock`, `isAuthenticated`, `formatPhoneNumber` como **variáveis globais
> legadas** (não pega do `getTenantContext(req)`), portanto usa o `sock` global (sempre `null` no modo
> multi-tenant) → é **código morto/quebrado**. Só o primeiro bloco (com `getTenantContext`) funciona. Na
> migração Go, implementar **apenas uma vez** cada handler, sempre via runtime do tenant. O segundo bloco
> `notificarCorrespondentes*` também faz `User.findAll({where:{is_correspondente:true}})` **sem `tenant_id`** —
> vazamento cross-tenant; corrigir para filtrar por tenant.

### Mapa de-para conceitual Baileys → whatsmeow

| Conceito Baileys | whatsmeow (Go) |
|---|---|
| `makeWASocket({auth, version, browser})` | `whatsmeow.NewClient(deviceStore, waLog)` |
| `useDBAuthState()` + adapter custom em JSONB | `sqlstore.New(...)` + `container.GetDevice(jid)` / `NewDevice()` (store nativo em SQL) |
| `initAuthCreds()` | `container.NewDevice()` |
| `creds.update` → `saveCreds` | store persiste automaticamente (não há saveCreds manual) |
| `connection.update` `{qr}` | `client.GetQRChannel(ctx)` → itens com `.Event=="code"` / `.Code` |
| `connection === 'open'` | evento `*events.Connected` / `*events.PairSuccess` |
| `connection === 'close'` + statusCode | `*events.Disconnected` / `*events.LoggedOut` / `*events.StreamReplaced` |
| `DisconnectReason.loggedOut` | `*events.LoggedOut` (`OnConnect=false`) |
| erro 405 (bloqueado) | `*events.TemporaryBan` / `*events.ConnectFailure` (Reason 405) → não reconectar |
| `messages.upsert` | `*events.Message` |
| `sock.sendMessage(jid, {text})` | `client.SendMessage(ctx, jid, &waE2E.Message{Conversation: proto.String(text)})` |
| `sock.logout()` | `client.Logout(ctx)` |
| `sock.end()` | `client.Disconnect()` |
| `sock.user.id` | `client.Store.ID` (`*types.JID`) |
| JID `55DDDNNNN@s.whatsapp.net` | `types.NewJID("55DDDNNNN", types.DefaultUserServer)` |
| `fetchLatestWaWebVersion` | whatsmeow embute versão; `store.SetOSInfo` / `waProto` |
| Estado em `Map<tenant, runtime>` | `map[int]*TenantClient` com `sync.RWMutex` |

**Store recomendado em Go**: `sqlstore` do whatsmeow (tabelas próprias `whatsmeow_*` em Postgres). A tabela
legada `whatsapp_sessions` (creds/keys em JSONB Baileys) **não é compatível** com o formato do whatsmeow — não
há migração automática das credenciais; os tenants precisarão **reescanear o QR** na virada, OU manter
`whatsapp_sessions` apenas para metadados (status/phone/tenant) enquanto o pareamento real fica no sqlstore.

### Modelos WhatsApp

**`whatsapp_sessions`** (model `WhatsappSession`, PK string, `underscored`):

| Coluna | Tipo | Notas |
|---|---|---|
| `id` | STRING PK | = storedSessionId `tenant_{id}__{sessionId}` |
| `data` | JSONB | `{ creds, keys }` (formato Baileys/BufferJSON) |
| `status` | ENUM('active','inactive','connecting','error') | default 'inactive' |
| `phone_number` | STRING null | |
| `last_activity` | DATE null | |
| `is_authenticated` | BOOLEAN | default false |
| `created_at` / `updated_at` | DATE | |

**`whatsapps`** (model `WhatsApp`, `underscored`, timestamps): `message`, `sender`, `receiver`,
`authenticated` (bool), `timestamp`. **Aparentemente órfão** — não referenciado no fluxo Baileys atual;
avaliar descarte na migração.

---

## Realtime (Socket.IO → hub WebSocket Go)

### Inicialização atual

- `server.js`: `io = new Server(server, { cors: { origin: allowedOrigins, credentials: true } })`.
- `socket.js`: singleton `setSocketIO(io)` / `getSocketIO()` (lança se não inicializado). Todo o backend
  emite via `getSocketIO().emit(...)` ou `getSocketIO().to(room).emit(...)`.

### Eventos que o cliente ENVIA ao servidor (client → server)

| Evento | Payload | Ação no servidor |
|---|---|---|
| `subscribe:whatsapp` | `{ tenantId }` | `socket.join(`whatsapp:${tenantId}`)` |
| `unsubscribe:whatsapp` | `{ tenantId }` | `socket.leave(`whatsapp:${tenantId}`)` |
| `frontend-message` | `msg` (string) | responde `backend-response` ao mesmo socket |
| `disconnect` | — | log |

### Eventos que o servidor EMITE (server → client) — **contrato a preservar**

| Evento | Escopo | Payload | Origem |
|---|---|---|---|
| `welcome` | socket (só quem conectou) | string | `server.js` on connection |
| `backend-response` | socket | `Recebido: ${msg}` | `server.js` |
| **`whatsapp:update`** | **room `whatsapp:{tenantId}`** (ou global se sem tenantId) | `{ ...data, timestamp }` com `type` ∈ `qr`\|`status`\|`messageReceived`\|`error`\|`sessionDeleted` | `whatsappRoutes.broadcast()` |
| `whatsapp-nota-adicionada` | **global** | `{ tenantId, clienteId, clienteNome, notaTexto, usuarioAdicionou, prioridade, telefoneUsuarioResponsavel }` | `whatsappRoutes` |
| `usuario-atualizado` | global | `{ userId, ... }` | `routes/userRoutes.js` |
| `notification:${targetUserId}` | global (nome dinâmico) | `{ tipo:'visita', titulo:'Nova visita agendada' }` | `routes/visitaRoutes.js` |
| `nota-criada` | global | `{ clienteId, ... }` | `routes/notas.js` |
| `nota-concluida` | global | `{ notaId, ... }` | `routes/notas.js` |
| `nota-removida` | global | `{ notaId, ... }` | `routes/notas.js` |
| `notas-buscadas` | global | `{ clienteId, totalNotas }` | `controllers/notasController.js` |
| `cliente-criado` | global | `{ clienteId, nome, criadoPor }` | `routes/clientes.js` |
| `cliente-atualizado` | global | `{ clienteId, ... }` | `routes/clientes.js` |
| `cliente-status-alterado` | global | `{ clienteId, ... }` | `routes/clientes.js` |
| `cliente-removido` | global | `{ clienteId, ... }` | `routes/clientes.js` |
| `cliente-documento-removido` | global | `{ clienteId, ... }` | `routes/clientes.js` |
| `aluguel-criado` / `aluguel-atualizado` / `aluguel-removido` | global | objeto aluguel / `{id}` | `controllers/aluguelController.js` |
| `imovel-criado` / `imovel-atualizado` / `imovel-removido` | global | objeto imóvel / `{id}` | `controllers/imovelController.js` |

> Observação importante: **apenas `whatsapp:update` usa room por tenant**. Todos os demais eventos são
> `io.emit` **globais** (broadcast para todos os sockets conectados, sem isolamento de tenant). Na migração é
> recomendável (mas fora do escopo de paridade estrita) escopar esses por tenant/usuário. Para **paridade
> exata do contrato**, o hub Go deve:
> - suportar rooms nomeadas (`whatsapp:{tenantId}`);
> - suportar broadcast global para os demais eventos;
> - suportar "evento com nome dinâmico" (`notification:{userId}`) — no WS nativo isso vira um campo `event`
>   no envelope JSON, não um canal separado.

### Envelope WS nativo proposto (frontend troca socket.io-client por WS)

Como o WS nativo não tem "nome de evento" embutido, padronizar um envelope:

```json
{ "event": "whatsapp:update", "room": "whatsapp:12", "data": { "type": "qr", "qrCode": "...", "timestamp": "..." } }
```

Mensagens client→server (substituem `subscribe:whatsapp`):

```json
{ "action": "subscribe", "channel": "whatsapp", "tenantId": 12 }
{ "action": "unsubscribe", "channel": "whatsapp", "tenantId": 12 }
```

### Hub WebSocket em Go (gorilla/websocket) — desenho

- **Client** (conexão): `conn *websocket.Conn`, `send chan []byte`, `rooms map[string]bool`,
  `tenantID int`, `userID int`. Goroutines `readPump`/`writePump` por conexão.
- **Hub**: `register`/`unregister chan *Client`, `clients map[*Client]bool`,
  `rooms map[string]map[*Client]bool`, `sync.RWMutex`. Métodos:
  - `Broadcast(event string, data any)` — global (paridade com `io.emit`).
  - `BroadcastToRoom(room, event string, data any)` — paridade com `io.to(room).emit`.
  - `Join(client, room)` / `Leave(client, room)` — paridade com `socket.join/leave`.
- **Substituto de `getSocketIO()`**: um `hub` injetado nos módulos (ou singleton em `internal/ws`) exposto como
  `ws.Hub.Broadcast(...)` / `ws.Hub.ToRoom("whatsapp:12", ...)`.
- **Tolerância a boot**: se hub ainda não pronto, no-op silencioso (igual `try/catch` do `broadcast`).
- **Autenticação**: validar JWT no upgrade (querystring/header) para setar `tenantID`/`userID` — hoje o
  Socket.IO **não autentica no handshake** (qualquer origem permitida entra); a migração é oportunidade de
  fechar isso, mas cuidado para não quebrar o frontend que hoje só chama `subscribe:whatsapp`.

---

## Jobs / Cron (node-cron → robfig/cron)

Dois arquivos independentes agendam jobs. Ambos são inicializados no boot.

### `routes/cronJobs.js` — `startCronJobs()` (chamado em `routes/index.js:155`)

Usa `node-cron` + `moment-timezone` (`America/Sao_Paulo`). Envia WhatsApp via **`fetch` para a própria API**
(`enviarWhatsAppMsg` → `POST {BACKEND_URL}/api/whatsapp/send-message`).

| Schedule (cron) | Ação | Detalhe |
|---|---|---|
| imediato no start | `backupDatabase()` | `utils/backup` |
| `*/5 * * * *` | `verificarLembretesParaNotificacao()` + `verificarVencimentosParaNotificacao()` | só em horário comercial (seg-sex 9-18h, sáb 9-13h) |
| `0 * * * *` | régua de cobrança `processarReguaCobranca(...)` | só horário comercial |
| `*/30 * * * *` | `sincronizarCobrancasAsaas()` | sincroniza `CobrancaAluguel` com Asaas |
| `0 */6 * * *` | `backupDatabase()` | backup periódico |
| `0 6 * * *` | `calcularScoreTodosInquilinos(...)` | score diário 6h |
| `0 7 * * *` | `verificarContratosReajuste(...)` | alerta reajuste 30 dias antes, envia WhatsApp |
| `0 9 1 * *` | `enviarRelatorioMensalProprietario()` | dia 1, 9h, relatório para `DEFAULT_PHONE_NUMBER` |

**Regras de negócio embutidas:**
- `isHorarioComercial()`: seg-sex 9≤h<18; sáb 9≤h<13; dom nunca (tz São Paulo, `isoWeekday`).
- Lembretes: dispara quando `data - now == 15 min` exatamente e `status != 'concluido'`.
- Vencimentos: dispara quando `diaVencimento - now == 3 dias`; anexa link Asaas se `asaas_subscription_id`.
- Régua: `processarReguaCobranca(ClienteAluguel, CobrancaAluguel, ReguaCobranca, enviarWhatsAppMsg)`.
- Mapeamento status Asaas: `mapAsaasStatusCron` (PENDING/RECEIVED→CONFIRMED/OVERDUE/REFUNDED/RECEIVED_IN_CASH).

### `jobs/enviarParcelas.js` — `iniciarJobParcelas()` (chamado em `server.js:664`)

Usa `node-cron`. Envia parcelas de pagamento parcelado.

| Schedule | Ação |
|---|---|
| `0 * * * *` (a cada hora) | `enviarParcelasAutomaticas()` |
| `setTimeout 5s` no start | uma execução imediata (teste) |

`enviarParcelasAutomaticas()`:
- Busca `Pagamento{status:'aguardando', data_envio_proxima_parcela <= now+1h, is_parcelado:true, parcela_atual>1}`
  com include `Cliente`.
- Para cada: cria preferência Mercado Pago (`mercadoPagoService.criarPreferenciaComJuros`), atualiza
  `mp_preference_id`/`link_pagamento`/`dados_mp`/`status='pendente'`.
- Envia WhatsApp via `fetch POST /api/whatsapp/enviar-parcela` (com header `X-Tenant-Id`) → marca
  `whatsapp_enviado`. (Nota: o endpoint `/enviar-parcela` **não existe** no `whatsappRoutes.js` lido — só
  `/enviar-pagamento`; possível endpoint faltante/quebrado a validar na migração.)
- Envia email via `enviarEmailParcela` (**stub simulado**, não implementado) → marca `email_enviado`.

### Mapa de-para cron

| Node | Go |
|---|---|
| `node-cron` `cron.schedule('*/5 * * * *', fn)` | `robfig/cron/v3`: `c := cron.New(cron.WithLocation(loc)); c.AddFunc("*/5 * * * *", fn)` |
| `moment().tz('America/Sao_Paulo')` | `time.LoadLocation("America/Sao_Paulo")` + `time.Now().In(loc)` |
| `enviarWhatsAppMsg` via `fetch` HTTP interno | **chamar serviço whatsmeow diretamente** (`whatsapp.Service.SendText(tenantID, phone, msg)`) — eliminar o hop HTTP |
| execução imediata no start (`setTimeout`) | rodar a func uma vez em goroutine antes/depois de `c.Start()` |
| `robfig/cron` roda em segundos por default? | usar `cron.New()` (5 campos, padrão) — NÃO `cron.WithSeconds()` para manter compatibilidade de expressões |

**Cuidado tz**: `robfig/cron` avalia a expressão no fuso da `Location` configurada. Configurar
`America/Sao_Paulo` explicitamente para preservar `isHorarioComercial`.

---

## Email (Nodemailer → gomail)

`services/emailService.js`:
- `createTransporter()` — SMTP: `host=SMTP_HOST||smtp.gmail.com`, `port=SMTP_PORT||587`, `secure=false`,
  `auth: {user: SMTP_USER, pass: SMTP_PASSWORD}`.
  > ⚠️ **Bug**: usa `nodemailer.createTransporter` (nome errado; o correto é `createTransport`). Provavelmente
  > o envio real **nunca funcionou** — cai no ramo "simulado" quando faltam credenciais. Confirmar na migração.
- `enviarEmailPagamento(cliente, pagamento)`:
  - Se faltam `SMTP_USER`/`SMTP_PASSWORD` → retorna `{success:true, message:'Email simulado...'}` (não envia).
  - Monta HTML (PIX/Boleto) com `EMPRESA_NOME`, link `pagamento.link_pagamento`.
  - `from: "${SMTP_FROM_NAME||'Sistema CRM'}" <${SMTP_FROM_EMAIL||SMTP_USER}>`, `to: cliente.email`,
    `subject: '${tipo} Disponível - ${titulo}'`.
  - Retorna `{success, messageId, email}` ou `{success:false, error}`.

### Mapa de-para email

| Nodemailer | gomail |
|---|---|
| `nodemailer.createTransport({host,port,secure,auth})` | `gomail.NewDialer(host, port, user, pass)` |
| `secure:false` (STARTTLS 587) | dialer padrão faz STARTTLS; para 465 usar `d.SSL = true` |
| `transporter.sendMail(mailOptions)` | `m := gomail.NewMessage(); m.SetHeader(...); m.SetBody("text/html", html); d.DialAndSend(m)` |
| ramo "simulado" quando sem creds | manter: se env vazio, logar e retornar sucesso simulado |

Env vars: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM_NAME`, `SMTP_FROM_EMAIL`, `EMPRESA_NOME`.

---

## Notificações / Timeline

### `routes/notificacaoRoutes.js` (base `/api/notificacoes`, todas com `authenticateToken`)

| Método | Rota | Ação |
|---|---|---|
| GET | `/` | lista `Notificacao{user_id}`, filtro `?lida=`, paginação `?page&limit` (default 1/30), order `created_at DESC` |
| GET | `/nao-lidas` | `count({user_id, lida:false})` |
| PUT | `/:id/ler` | marca `lida:true` (valida ownership `user_id`) |
| PUT | `/ler-todas` | marca todas `lida:true` do usuário |
| DELETE | `/:id` | remove (valida ownership) |

> As notificações são **persistidas e consultadas por polling/HTTP** — **não** há emissão realtime dentro de
> `notificacaoRoutes.js`. A ligação com realtime é indireta: outros módulos emitem eventos socket
> (`notification:${userId}`, `cliente-*`, etc.) e o WhatsApp envia pushes. Na migração, criar as notificações
> em banco E disparar `hub.ToUser(userID, ...)` juntos seria a evolução natural.

### Model `Notificacao` (tabela `notificacoes`, `underscored`, timestamps)

| Coluna | Tipo |
|---|---|
| `id` | INTEGER PK autoIncrement |
| `user_id` | INTEGER NOT NULL FK→users.id |
| `tenant_id` | INTEGER null |
| `tipo` | ENUM('info','alerta','sucesso','erro','vencimento','proposta','visita','pagamento') default 'info' |
| `titulo` | STRING NOT NULL |
| `mensagem` | TEXT null |
| `lida` | BOOLEAN default false |
| `link` | STRING null |
| `dados` | JSONB null |
| `created_at`/`updated_at` | DATE |

Associação: `belongsTo(User, {foreignKey:'user_id', as:'user'})`.

### `routes/timelineRoutes.js` (base `/api/timeline`, `authenticateToken`)

- `GET /cliente/:clienteId` — **timeline agregada em memória** (não é tabela própria). Faz N queries e
  concatena, cada uma em `try/catch` tolerante a model inexistente:
  - `Nota{cliente_id}` (inclui `User as criador`) → `{tipo:'nota', ...}`.
  - `Pagamento{cliente_id}` → `{tipo:'pagamento', ...}`.
  - `Simulacao{cliente_id}` (inclui `User`) → `{tipo:'simulacao', ...}`.
  - `Visita{cliente_id}` (inclui `Imovel`, `User as corretor`) → `{tipo:'visita', ...}`.
  - `Proposta{cliente_id}` (inclui `Imovel`) → `{tipo:'proposta', ...}`.
  - Ordena por `data` desc, retorna `{success, data: timeline}`.
- Em Go: replicar como um serviço que faz as 5 queries (GORM) e monta o slice; cada bloco tolerante a erro.

---

## Gotchas

1. **`whaileys` é um fork** do Baileys — validar quais patches específicos existem (versão WA Web, browser
   string `['CRM IMOB','Chrome','22.0']`). whatsmeow gerencia versão internamente.
2. **Credenciais Baileys em JSONB não migram para whatsmeow** — formatos incompatíveis. Planejar rescan de QR
   por tenant OU dual-store temporário. `whatsapp_sessions.data` (BufferJSON) fica órfã pós-migração.
3. **Handlers de notificação duplicados** em `whatsappRoutes.js` (2 blocos); o segundo usa globais legadas
   (`sock`/`isAuthenticated` sempre null) → código morto. Implementar 1x só, sempre por tenant.
4. **Vazamento cross-tenant** no 2º `notificarCorrespondentes*` (`User.findAll({is_correspondente:true})` sem
   `tenant_id`). Corrigir para filtrar por tenant na versão Go.
5. **`emailService` usa `createTransporter` (typo)** → provável no-op histórico. Confirmar antes de replicar.
6. **Endpoint `/enviar-parcela` referenciado pelo job não existe** no arquivo de rotas (só `/enviar-pagamento`).
   Validar contrato antes de portar.
7. **Cron chama a própria API HTTP** (`fetch localhost:8000/api/whatsapp/...`) — em Go, chamar o serviço
   whatsmeow direto (sem hop HTTP, sem depender de porta/URL).
8. **Guard de corrida `isCurrentSocketRuntime`** é essencial: após troca de sessão, eventos de sockets antigos
   chegam e devem ser descartados. Em Go, comparar ponteiro do client + sessionID corrente sob mutex.
9. **Reconexão 405 = bloqueio permanente** (`connectionBlocked=true`), NÃO reconectar. Só `/reset` limpa.
10. **Timeout de init 35s** e **espera de 4s no `/connect`** para o QR aparecer — comportamento que o frontend
    espera; replicar (ou ajustar contrato com o front).
11. **Só `whatsapp:update` é room-scoped**; os demais eventos socket são globais (broadcast a todos). Preservar
    esse comportamento para não quebrar o frontend atual, mesmo sendo um anti-padrão de isolamento.
12. **Socket.IO não autentica no handshake** — o WS Go pode fechar isso, mas exige mudança coordenada no front.
13. **`node-cron` execução imediata via `setTimeout`** no `enviarParcelas` — não esquecer o "run once" no boot.
14. **tz `America/Sao_Paulo`** governa horário comercial e schedules — configurar `cron.WithLocation`.

---

## Layout Go proposto

```
backend-go/
├── cmd/
│   └── server/
│       └── main.go                     # bootstrap: db, hub, whatsapp manager, cron, http
├── internal/
│   ├── integrations/
│   │   ├── whatsapp/                    # whatsmeow
│   │   │   ├── manager.go               # map[tenantID]*TenantClient + sync.RWMutex (= tenantRuntimes)
│   │   │   ├── client.go                # NewClient, Connect, QR channel, event handlers
│   │   │   ├── store.go                 # sqlstore container (device por tenant/sessão)
│   │   │   ├── reconnect.go             # backoff 5x, 405=block, loggedOut=stop
│   │   │   ├── phone.go                 # formatPhoneNumber (regra BR do 9º dígito)
│   │   │   ├── session_repo.go          # metadados em whatsapp_sessions (status/phone/tenant)
│   │   │   ├── messages.go              # SendText, notificações (cliente/status/nota/pagamento)
│   │   │   └── events.go                # onConnected/onDisconnect/onMessage → hub broadcast
│   │   └── email/
│   │       └── mailer.go                # gomail: enviarEmailPagamento + ramo simulado
│   ├── ws/                              # hub WebSocket (substitui socket.js + io)
│   │   ├── hub.go                       # register/unregister, rooms, Broadcast, BroadcastToRoom
│   │   ├── client.go                    # conn + readPump/writePump + rooms
│   │   ├── handler.go                   # HTTP upgrade (gorilla) + auth JWT opcional
│   │   └── envelope.go                  # {event, room, data} + parse {action,channel,tenantId}
│   ├── jobs/                            # robfig/cron
│   │   ├── scheduler.go                 # cron.New(WithLocation(SaoPaulo)) + AddFunc de todos
│   │   ├── lembretes.go                 # verificar lembretes/vencimentos (5min, horário comercial)
│   │   ├── regua_cobranca.go            # processarReguaCobranca (hora)
│   │   ├── asaas_sync.go                # sincronizarCobrancasAsaas (30min)
│   │   ├── parcelas.go                  # enviarParcelasAutomaticas (hora) + run-once boot
│   │   ├── score_reajuste.go            # score 6h, reajuste 7h
│   │   ├── relatorio_mensal.go          # dia 1 9h
│   │   ├── backup.go                    # backup boot + 6h
│   │   └── horario.go                   # isHorarioComercial() tz SP
│   └── modules/
│       └── notificacoes/
│           ├── handler.go               # GET/PUT/DELETE /api/notificacoes (+ /nao-lidas, /ler-todas)
│           ├── service.go               # CRUD + (evolução) dispara hub.ToUser
│           ├── repository.go            # GORM sobre notificacoes
│           ├── model.go                 # struct Notificacao (tipo enum, dados JSONB)
│           └── timeline.go              # GET /api/timeline/cliente/:id (agrega 5 fontes)
└── docs/migration/05-whatsapp-realtime-jobs.md
```

**Injeção**: `main.go` cria `hub := ws.NewHub()`, `waMgr := whatsapp.NewManager(store, hub)`,
`mailer := email.New(...)`, `sched := jobs.New(db, waMgr, mailer, hub)`. O `hub` é passado onde o Node usava
`getSocketIO()`; o `waMgr.SendText(tenantID, phone, msg)` substitui os `fetch` internos do cron/jobs.
