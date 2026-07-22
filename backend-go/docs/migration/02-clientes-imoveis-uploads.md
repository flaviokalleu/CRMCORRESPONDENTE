# 02 — Migração: Clientes, Imóveis, Uploads/Storage/PDF, Cadastros Auxiliares

> Especificação de migração Node.js/Express (Sequelize/PostgreSQL) → Go (Gin + GORM).
> **Grounded no código real** em `backend/src`. Nada de código Go ainda — este documento é o inventário/contrato.
> Cluster coberto: **Clientes, Imóveis, Documentos/Uploads, Notas, Lembretes, Acessos, Locations (Estado/Município)**.

---

## 1. Visão geral

### 1.1 Como as rotas são montadas (`routes/index.js` → `mountRoutes`)

A ordem de montagem importa (Express casa a primeira que bater). Os módulos deste cluster:

| Mount point (prefixo real) | Middlewares no mount | Arquivo de rotas | Observação |
|---|---|---|---|
| `/api/listadeclientes` | `authenticateToken`, `resolveTenant` | `listadeclientes.js` | Lista filtrada por role. |
| `/api/imoveis` | `authenticateToken`, `resolveTenant` | `imoveis.js` → `imovelController.js` | CRUD imóveis + upload de imagens. |
| `/api/notas` | **nenhum** no mount | `notas.js` | CRUD de notas; auth NÃO aplicado no mount. |
| `/api` (raiz) | **nenhum** no mount | `lembreteRoutes.js` | Expõe `/api/lembretes*`. |
| `/api/acessos` | **nenhum** no mount | `acessos.js` | Logging/analytics de acessos. |
| `/api` (raiz) | **nenhum** no mount | `locations.js` | Expõe `/api/estados`, `/api/municipios/:estadoId`. |
| `/api/documentos` | **nenhum** no mount | `documentRoutes.js` | Auth aplicado *inline* na rota (`/upload`). |
| `/api/storage-usage` | `authenticateToken`, `resolveTenant` | inline em `index.js` | Uso de storage do tenant. |
| `/api/storage-recalculate` | `authenticateToken`, `resolveTenant` | inline em `index.js` | Super admin only. |
| **`/api/` (clienteRoutes)** | **`authenticateToken`, `resolveTenant`** | `clientes.js` | **Montado por ÚLTIMO** (linha 152) — catch-all para evitar conflito com rotas dinâmicas. Cada rota interna repete `authenticateToken` *inline* → **auth dupla**. |

> **GOTCHA de montagem:** `clienteRoutes` é montado em `/api/` (raiz) por último. Suas rotas internas são declaradas como `/clientes`, `/clientes/:id`, etc. → path final `/api/clientes`. Como está em `/api/` raiz + por último, qualquer path não capturado antes cai aqui. Em Go, montar o grupo de clientes por último ou usar rotas específicas o suficiente para não colidir.

> **`notasRoutes.js` é ÓRFÃO:** existe no disco (`routes/notasRoutes.js`, define `GET /clientes/:clienteId/notas` via `notasController.getNotasByClienteId`) mas **não é importado** em `index.js` nem `server.js`. Não migrar como rota ativa (pode ser referência morta). A funcionalidade equivalente existe em `notas.js` (`GET /api/notas/clientes/:id/notas`).

### 1.2 Middlewares-chave (comportamento a replicar em Go)

- **`authenticateToken`** — valida Bearer JWT *e* confere contra a tabela `Token`; popula `req.user` (com `id`, `email`, flags de role, `tenant_id`, `is_super_admin`).
- **`resolveTenant`** — resolve `req.tenantId` / `req.isSuperAdmin`. Super admin pode sobrescrever tenant via header `X-Tenant-Id`.
- **Contexto de tenant** (`server.js`): para paths `/api/*` que não sejam `['/auth','/tenant','/health','/uploads','/webhook']`, seta `req.tenantId = req.user.tenant_id`. Em Go: middleware de tenant que injeta `tenantID` no `context`.
- **`resolveTenant` NÃO cobre** `/api/uploads` — arquivos servidos sem checagem de tenant (ver §5).

---

## 2. Endpoints (tabelas)

### 2.1 Clientes — `clientes.js` (montado em `/api/`, auth+tenant no mount + `authenticateToken` inline)

| Método + Path | Middlewares | Role | Entrada | Resposta (200/201) | Erros | Regra de negócio |
|---|---|---|---|---|---|---|
| `POST /api/clientes` | `authenticateToken`, `uploadFields` (multer), `handleMulterError`, `logUploadedFiles`, `validateCliente` | Admin/Corretor/Correspondente | `multipart/form-data`: campos do Cliente (§4) + arquivos (`documentosPessoais`, `extratoBancario`, `documentosDependente`, `documentosConjuge`, `fiadorDocumentos`, `formulariosCaixa`, `tela_aprovacao`, `notas`); aceita `user_id` **ou** `userId`; `data_criacao` opcional | `201 { message, cliente{...,valor_renda_formatado}, whatsapp, notificacaoCorrespondentes }` | `400` CPF já cadastrado / dados inválidos; `403` tenant não identificado | Transação. `buildClienteDataForCreate` (status default `aguardando_aprovacao`). Verifica CPF duplicado. Admin/Correspondente podem vincular a outro `user_id`; corretor vincula a si. Processa documentos → PDF (§6). Cria `Nota` por arquivo de `notas`. Notifica WhatsApp + correspondentes. Emite socket `cliente-criado`. `finally` limpa temp files. |
| `PUT /api/clientes/:id` | `authenticateToken`, `uploadFields`, `handleMulterError`, `logUploadedFiles` | Admin/Corretor(dono)/Correspondente | igual ao POST, todos opcionais | `200 { message, cliente, whatsapp, notificacaoCorrespondentes, alteracoesRealizadas }` | `400` cliente não encontrado / erro; `403` corretor sem permissão | Transação. `buildClienteData` (sem status default). Corretor **não pode alterar status** (removido do update) nem editar cliente de outro. Só atualiza campos enviados (`!== undefined && !== null`). **Valida caminhos de documento**: só aceita path que contenha o CPF sem máscara (`path.includes(cpfSemMascara)`) — senão rejeita. Admin/Correspondente podem transferir `userId` (com log de auditoria). Notifica status alterado / documentos enviados. |
| `GET /api/clientes` | `authenticateToken` | todos autenticados | query: `page=1`, `limit=10` (cap 100), `search`, `status`, `corretor` | `200 { success, clientes:[{...,notasCount}], pagination{total,page,limit,pages} }` | `403` não autorizado / tenant | Filtra por `tenant_id`. Corretor só vê `userId=self`; admin/correspondente podem filtrar por `corretor`. `search` → `iLike` em `nome/email/cpf`. Inclui `user` e `notas` (só `id` p/ contar). Ordena `created_at DESC`. |
| `GET /api/clientes/:id` | `authenticateToken` | Admin/Correspondente/Corretor(dono) | — | `200 { success, cliente{...,notas,valor_renda_formatado} }` | `403` corretor não-dono; `404` | Inclui `notas`. |
| `PATCH /api/clientes/:id/status` | `authenticateToken` | **Admin/Correspondente apenas** | `{ status }` | `200 { message, cliente, whatsapp, notificacaoCorrespondentes }` | `400` status inválido; `403` corretor bloqueado / não-dono; `404` | Status deve estar em `STATUS_VALIDOS` (§2.1.1). **Corretor SEMPRE bloqueado** (403). Notifica WhatsApp `/notificarStatusAlterado` + correspondentes. Emite socket `cliente-status-alterado`. |
| `DELETE /api/clientes/:id` | `authenticateToken` | Admin/Correspondente/Corretor(dono) | — | `200 { message }` | `403` corretor não-dono; `404` | `cliente.destroy()` (hard delete). Emite socket `cliente-removido`. (Não remove arquivos do disco nem decrementa storage.) |
| `DELETE /api/clientes/:id/documentos/:tipo` | `authenticateToken` | Admin/Correspondente/Corretor(dono) | `:tipo` ∈ chaves de `documentTypeMap` | `200 { message, cliente:{id,[campo]:null} }` | `400` tipo inválido; `403`; `404` | Remove arquivo físico (`fs.unlinkSync`) + remove diretório se vazio; seta campo = `null`. Emite socket `cliente-documento-removido`. |
| `GET /api/clientes/:id/documentos/:tipo/verificar` | `authenticateToken` | Admin/Correspondente/Corretor(dono) | — | `200 { exists, path, url, message }` | `400` tipo inválido; `403` segurança (path não contém CPF / tipo / fora do dir do cliente); `404` | **Validação de segurança rígida** (§5.3): path deve conter `cliente.cpf`, conter o `campoDocumento` (exceto `tela_aprovacao`), e estar dentro de `uploads/clientes/<cpf>/`. |
| `POST /api/clientes/:id/tela_aprovacao` | `authenticateToken`, `multer({dest:'uploads/tela_aprovacao/'}).array('tela_aprovacao')` | autenticado | arquivos `tela_aprovacao[]` | `200 { message, files:[{filePath,fileName}] }` | `400` sem arquivo; `404` | **Rota legada divergente**: usa multer com `dest` diferente; grava JSON (`[{filePath,fileName}]`) no campo `tela_aprovacao` (append ao existente). Conflita com o fluxo do `upload.js` que salva `tela_aprovacao` como caminho de arquivo. Ver §7 (gotcha). |
| `GET /api/clientes/:id/documentos/:tipo/info` | `authenticateToken` | via `canUserAccessClient` | — | `200 { totalPages, fileSize, lastModified, fileName, type, clienteCpf }` | `400` tipo inválido; `403`; `404` | Lê o PDF com `pdf-lib`, retorna nº de páginas. |
| `GET /api/clientes/:id/documentos/:tipo/pagina/:pageNumber` | `authenticateToken` | via `canUserAccessClient` | `:pageNumber` (≥1) | `200` **binário PDF** (1 página) `Content-Type: application/pdf` inline + anti-cache | `400` página inválida; `403`; `404` | `pdfService.extractPageAsBuffer` extrai 1 página como PDF novo. |

**2.1.1 `STATUS_VALIDOS`** (enum a replicar):
`aguardando_aprovacao`, `proposta_apresentada`, `documentacao_pendente`, `visita_efetuada`, `aguardando_cancelamento_qv`, `condicionado`, `cliente_aprovado`, `reprovado`, `reserva`, `conferencia_documento`, `nao_descondiciona`, `conformidade`, `concluido`, `nao_deu_continuidade`, `aguardando_reserva_orcamentaria`, `fechamento_proposta`, `processo_em_aberto`, `aprovado`, `em_andamento`, `finalizado`, `cancelado`.

**2.1.2 `documentTypeMap`** (fieldname multipart → coluna DB):
`documentosPessoais→documentos_pessoais`, `extratoBancario→extrato_bancario`, `documentosDependente→documentos_dependente`, `documentosConjuge→documentos_conjuge`, `fiadorDocumentos→fiador_documentos`, `formulariosCaixa→formularios_caixa`, `tela_aprovacao→tela_aprovacao`. (Campo `notas` é tratado à parte, vira registros na tabela `notas`.)

### 2.2 Lista de clientes — `listadeclientes.js` (`/api/listadeclientes`, auth+tenant no mount)

| Método + Path | Role | Entrada | Resposta | Regra |
|---|---|---|---|---|
| `GET /api/listadeclientes` | todos autenticados | query: `status`, `corretor`, `dataInicio`, `dataFim` | `{ clientes, userPermissions, totalCount, appliedFilters }` | Busca `currentUser` no banco. Corretor puro → `user_id=self`. Correspondente/Admin → todos (podem filtrar `corretor`). `dataInicio/dataFim` → `created_at BETWEEN`. Sempre filtra `tenant_id`. Inclui `user` + `notas`. `403` se sem role adequada / sem tenant. |
| `GET /api/listadeclientes/usuarios` | **Admin/Correspondente** | — | `{ success, users, count }` | Lista `User` (id, nomes, email, username, flags) filtrado por `tenant_id`. `403` para corretor. |
| `GET /api/listadeclientes/test-permissions` | autenticado | — | `{ success, user{permissions}, message }` | Debug de permissões. |

> Nota: `listadeclientes.js` importa `authenticateToken` de `./authRoutes` e reaplica *inline* em cada rota (além do mount) → auth dupla.

### 2.3 Imóveis — `imoveis.js` + `imovelController.js` (`/api/imoveis`, auth+tenant no mount)

Multer local: `diskStorage` em `uploads/` (raiz), filename `Date.now()+ext`, `fileFilter` só `image/*`. Campos: `documentacao(1)`, `imagens(50)`, `imagem_capa(1)`.

| Método + Path | Entrada | Resposta | Regra (via `imovelService`) |
|---|---|---|---|
| `GET /api/imoveis/` e `GET /api/imoveis/imoveis` | query `categoria`, `localizacao`, `busca` | `[Imovel]` | `listarImoveis`: `where.tipo=categoria`, `localizacao iLike`, `busca` → `Op.or` em `titulo/descricao/localizacao/tipo/endereco/bairro/cidade`. Ordena `created_at DESC`. |
| `GET /api/imoveis/busca` | query `busca` (obrigatório) | `[Imovel]` | `400` se sem `busca`. |
| `POST /api/imoveis/` | multipart (campos Imovel + arquivos) | `201 Imovel` | `criarImovel`: cria registro, depois `organizeAndConvertImages` (§6.2). Emite socket `imovel-criado`. |
| `PUT /api/imoveis/:id` | multipart | `200 Imovel` | `atualizarImovel`. `404` se não existe. Socket `imovel-atualizado`. |
| `DELETE /api/imoveis/:id` | — | `{ message }` | `deletarImovel` (hard delete). `404`. Socket `imovel-removido`. |
| `GET /api/imoveis/:id/download-imagens` | — | **ZIP** (`archiver`) | Zipa `uploads/imoveis/:id/imagens`. `404` se dir não existe. |
| `GET /api/imoveis/:id/semelhantes` | — | `[Imovel]` (limit 6) | Mesma `localizacao`, `id != :id`. |
| `GET /api/imoveis/:id` | — | `Imovel` | `404` se não existe. |

> **Ordem interna importa:** `/:id/download-imagens`, `/:id/semelhantes` e `/:id` estão declarados **depois** de `/`, `/imoveis`, `/busca` e do `POST /` — mas `/:id` vem por último para não capturar `/busca` etc. Preservar essa ordem em Go (ou usar rotas explícitas).

### 2.4 Notas — `notas.js` (`/api/notas`, **sem auth no mount**)

| Método + Path | Entrada | Resposta | Regra |
|---|---|---|---|
| `POST /api/notas/` | `{ cliente_id, processo_id, nova, destinatario, texto, data_criacao, criado_por_id }` | `201 { ...nota, usuario_responsavel, cliente_nome, whatsapp_enviado, debug_info }` | Valida `criado_por_id` numérico + existência do `User`. Busca `Cliente`. Descobre usuário que cadastrou o cliente (`criado_por_id` ou `userId`) → telefone → dispara WhatsApp (`POST {BASE_URL}/api/whatsapp/notificarNotaAdicionada`, header `X-Tenant-Id`, timeout 10s, não bloqueante). Emite socket `nota-criada`. |
| `GET /api/notas/:id` | — | `200 Nota` / `404` | `findByPk`. |
| `PUT /api/notas/:id/concluir` | — | `200 Nota` | Seta `nota.nova=false`. Socket `nota-concluida`. |
| `DELETE /api/notas/:id` | — | `204` | `destroy`. Socket `nota-removida`. |
| `GET /api/notas/clientes/:id/notas` | — | `200 [{...nota, criador_nome}]` | Retorna array (vazio se nenhuma). Enriquecendo com `criador_nome` de `User`. |

> Como o mount não tem auth, essas rotas são efetivamente **públicas** hoje (a menos que o contexto de tenant do `server.js` as bloqueie — não bloqueia, pois não há `authenticateToken`). Em Go, decidir se protege (recomendado) — documentar como *divergência de segurança*.

### 2.5 Lembretes — `lembreteRoutes.js` (`/api`, sem auth no mount)

| Método + Path | Entrada | Resposta | Regra |
|---|---|---|---|
| `POST /api/lembretes` | `{ titulo, descricao, data, ... }` | `201 Lembrete` | Converte `data` p/ `America/Sao_Paulo` (moment-timezone). Rejeita duplicata (mesmo `titulo`+`data`) com `400`. |
| `GET /api/lembretes` | — | `200 [Lembrete]` | `findAll`. |
| `GET /api/lembretes/:id` | — | `200 Lembrete` / `404` | |
| `PUT /api/lembretes/:id` | `{ status }` | `200 Lembrete` | `concluido = (status==='concluido')`. |
| `DELETE /api/lembretes/:id` | — | `204` | |

### 2.6 Acessos — `acessos.js` (`/api/acessos`, sem auth no mount; usa `requestIp.mw()`)

| Método + Path | Entrada | Resposta | Regra |
|---|---|---|---|
| `POST /api/acessos/` | `{ referer, userId, page }` | `201 { message, id, timestamp }` | Deriva IP (`req.clientIp`), geo (`geoip-lite`), deviceType (parse UA). Se `page` começa com `/clientes/<id>`, resolve `userId` a partir do `Cliente`. |
| `GET /api/acessos/` | query `page,limit,country,startDate,endDate,userId,deviceType,search` | `{ acessos, pagination }` | `findAndCountAll` + include `User`. `search` filtra no `User` (iLike). Campos mock (`action_type`, etc.). |
| `GET /api/acessos/stats` | query `period` (`1h/24h/7d/30d/90d`) | resumo, usuáriosMaisAtivos, horariosPico (`EXTRACT(HOUR...)`), páginas, dispositivos | Agregações Sequelize (`fn/col/literal`). |
| `GET /api/acessos/realtime` | — | `{ usuariosOnline, acessosRecentes, timestamp }` | Últimos 5 min. |
| `GET /api/acessos/user/:userId` | query `limit,page` | `{ acessos, pagination, estatisticas }` | Acessos de um usuário + estatísticas. |

> `role` do usuário é **derivado das flags** via `determinarRole` (admin > corretor > correspondente > usuario). Não existe coluna `role`.

### 2.7 Locations — `locations.js` (`/api`, sem auth)

| Método + Path | Resposta | Regra |
|---|---|---|
| `GET /api/estados` | `[Estado]` | `Estado.findAll()`. |
| `GET /api/municipios/:estadoId` | `[Municipio]` | `where: { estadoId }`. |

### 2.8 Documentos genéricos — `documentRoutes.js` (`/api/documentos`)

| Método + Path | Middlewares | Entrada | Resposta | Regra |
|---|---|---|---|---|
| `POST /api/documentos/upload` | `authenticateToken` (inline), `express-busboy`, `logFiles` | multipart + body `{ username, cpf }` (obrigatórios) | `200 { message }` | Cria `uploads/<username>/<cpf>/`, gera `documentacao.pdf` com **pdfkit** listando os arquivos, move os arquivos recebidos para o dir. `400` se falta username/cpf. **Nota:** usa `../uploads` (busboy) e `../Uploads/...` (destino) — inconsistência de case (ver §7). Limitado a `application/pdf`. Provavelmente legado/pouco usado. |

### 2.9 Storage (inline em `index.js`)

| Método + Path | Middlewares | Resposta | Regra |
|---|---|---|---|
| `GET /api/storage-usage` | auth+tenant | `getStorageInfo(tenantId)` (§6.4) | `400` sem tenant; `500` erro. |
| `POST /api/storage-recalculate` | auth+tenant | `{ message, tenant_id, bytes, mb }` | **Super admin only** (`403` caso contrário). `recalculateStorage`. |

---

## 3. Model Cliente (colunas por categoria)

Tabela **`clientes`** (Sequelize `tableName: 'clientes'`, `timestamps: true`, `created_at`/`updated_at`). PK `id` (implícita, INTEGER autoincrement). **Colunas de string de data são `VARCHAR(10)` no formato `YYYY-MM-DD`** (não `DATE`).

### 3.1 Identificação / pessoais
| Coluna | Tipo Sequelize | Tipo Go/GORM sugerido | Notas |
|---|---|---|---|
| `nome` | STRING | `*string` | nullable |
| `email` | STRING **unique** | `*string` (unique index) | nullable + unique → cuidado com múltiplos NULL/'' |
| `telefone` | STRING | `*string` | |
| `cpf` | STRING **unique** | `*string` (unique index) | armazenado **sem máscara** (`replace(/\D/g,'')`) |
| `estado_civil` | STRING | `*string` | |
| `naturalidade` | STRING | `*string` | |
| `profissao` | STRING | `*string` | |
| `data_nascimento` | STRING(10) | `*string` | **VARCHAR** `YYYY-MM-DD` |
| `data_admissao` | STRING(10) | `*string` | **VARCHAR** `YYYY-MM-DD` |

### 3.2 Financeiros / trabalhistas
| Coluna | Tipo | Go | Notas |
|---|---|---|---|
| `valor_renda` | **STRING** | `*string` | ⚠️ **VARCHAR, não numérico.** Armazenado formatado pt-BR (`"1.234,56"`). **Agregações (AVG/SUM) exigem `CAST("valor_renda" AS NUMERIC)`** — e antes normalizar vírgula/ponto. |
| `renda_tipo` | STRING | `*string` | |
| `possui_carteira_mais_tres_anos` | BOOLEAN | `*bool` | derivado de `!!Number(...)` no input |
| `numero_pis` | STRING | `*string` | |
| `possui_dependente` | BOOLEAN | `*bool` | |

### 3.3 Cônjuge
`conjuge_nome` (STRING), `conjuge_email` (STRING), `conjuge_telefone` (STRING), `conjuge_cpf` (STRING, sem máscara), `conjuge_profissao` (STRING), `conjuge_data_nascimento` (STRING(10)), `conjuge_valor_renda` (**STRING** formatado — mesmo gotcha do `valor_renda`), `conjuge_renda_tipo` (STRING), `conjuge_data_admissao` (STRING(10)).

### 3.4 Fiador
`possui_fiador` (BOOLEAN, default `false`, NOT NULL — mas no builder é gravado como `1/0`), `fiador_nome` (STRING), `fiador_cpf` (STRING sem máscara), `fiador_telefone` (STRING), `fiador_email` (STRING), `fiador_documentos` (**TEXT** — caminho do PDF de documentos do fiador).

### 3.5 Documentos (caminhos de arquivo, relativos a `uploads/`)
`documentos_pessoais` (STRING), `extrato_bancario` (STRING), `documentos_dependente` (STRING), `documentos_conjuge` (STRING), `fiador_documentos` (TEXT), `formularios_caixa` (TEXT), `tela_aprovacao` (TEXT — **ambíguo**: ora caminho de PDF, ora JSON `[{filePath,fileName}]` pela rota legada §2.1). Formato típico: `clientes/<cpf>/<dbField>/documento.pdf`.

### 3.6 Formulários Caixa / aprovação
`possui_formularios_caixa` (BOOLEAN default `false` NOT NULL; gravado `1/0`), `formularios_caixa` (TEXT), `tela_aprovacao` (TEXT).

### 3.7 Status / relacionamentos / tenant
| Coluna | Tipo | Notas |
|---|---|---|
| `status` | STRING default `'aguardando_aprovação'` (model) / `'aguardando_aprovacao'` (rota) | ⚠️ **default do model tem acento** (`aprovação`) mas a rota grava sem acento e valida contra lista sem acento. Divergência histórica — normalizar na migração. |
| `user_id` | INTEGER FK → `users.id` | **Atenção nomenclatura:** o model declara association com `foreignKey: 'user_id'` (as `user`) **e também** um atributo `userId` (INTEGER, FK `users.id`). O código usa `cliente.userId` no JS, mas os `attributes` de SELECT pedem `'user_id'`. Em GORM: mapear `UserID int` → coluna `user_id`. |
| `tenant_id` | INTEGER FK → `tenants.id`, nullable | filtro multi-tenant obrigatório em list/get |
| `created_at` / `updated_at` | TIMESTAMP | `created_at` pode ser sobrescrito por `data_criacao` do body |

**Associações:** `Cliente belongsTo User (as user, fk user_id)`; `Cliente hasMany Nota (as notas, fk cliente_id)`.

### 3.8 Transformações de input (builder — replicar em Go)
`buildClienteData(body)`:
- `nome/naturalidade/profissao/numero_pis`: `.trim()`.
- `email`: `.toLowerCase().trim()`.
- `cpf`, `conjuge_cpf`, `fiador_cpf`: `.replace(/\D/g,'')` (só dígitos).
- `valor_renda`, `conjuge_valor_renda`: `formatarValorMonetario` → string pt-BR (mantém se já tem vírgula; senão `toLocaleString('pt-BR', 2 casas)`).
- datas: `formatDateOnly` → `split('T')[0]` (só `YYYY-MM-DD`).
- booleanos `possui_*`: `!!Number(...)` ou `=== 'true'`.
- **Validação:** `nome`, `email`, `cpf` obrigatórios; CPF deve ter 11 dígitos (`validarCPF` da rota **NÃO valida dígito verificador** — só comprimento); status (se enviado) deve estar em `STATUS_VALIDOS`.
- **Middleware `validateCliente`** (`validators.js`, express-validator): `nome` 2-200; `email` formato; `cpf` 11 dígitos; `telefone` 10-11 dígitos. `validators.js` também expõe `isValidCPF`/`isValidCNPJ` **com** dígito verificador (usados em outros fluxos), mas o builder da rota não os usa.

---

## 4. Imóveis & auxiliares

### 4.1 Model `Imovel` (tabela `imoveis`)
⚠️ **Timestamps em camelCase** (`createdAt`/`updatedAt`, `underscored: false`) — **diferente** do resto do projeto (que usa `created_at`). Em GORM configurar naming ou tags explícitas.

| Coluna | Tipo | Null | Go |
|---|---|---|---|
| `nome_imovel` | STRING | NOT NULL | `string` |
| `descricao_imovel` | TEXT | null | `*string` |
| `endereco` | STRING | NOT NULL | `string` |
| `tipo` | STRING | NOT NULL | `string` |
| `quartos` | INTEGER | NOT NULL | `int` |
| `banheiro` | INTEGER | NOT NULL | `int` |
| `tags` | STRING | null | `*string` |
| `valor_avaliacao` | FLOAT | null | `*float64` |
| `valor_venda` | FLOAT | NOT NULL | `float64` |
| `documentacao` | STRING | null | `*string` (caminho) |
| `imagens` | **JSON** | null | `datatypes.JSON` / `[]string` (array de caminhos webp) |
| `imagem_capa` | STRING | null | `*string` (caminho webp) |
| `localizacao` | STRING | null | `*string` |
| `exclusivo` | BOOLEAN | NOT NULL | `bool` |
| `tem_inquilino` | BOOLEAN | NOT NULL | `bool` |
| `situacao_imovel` | STRING | NOT NULL | `string` |
| `observacoes` | TEXT | null | `*string` |
| `tenant_id` | INTEGER FK tenants | null | `*int` |
| `createdAt`/`updatedAt` | TIMESTAMP (camelCase) | | |

> **Divergência interna:** `imovelService.listarImoveis` faz `Op.or` em colunas `titulo`, `descricao`, `bairro`, `cidade` que **não existem** no model atual — busca por essas chaves falharia/seria ignorada. Em Go, mapear a busca só para colunas reais (`nome_imovel`, `descricao_imovel`, `endereco`, `tipo`, `localizacao`) ou adicionar as colunas.

### 4.2 Model `Nota` (tabela `notas`)
- PK `id`; `cliente_id` INT NOT NULL FK `clientes.id`; `processo_id` INT null; `texto` TEXT NOT NULL; `criado_por_id` INT null FK `users.id`.
- **Timestamps:** `createdAt: 'data_criacao'`, `updatedAt: 'updated_at'`.
- Campos usados no código mas **ausentes do model**: `nova`, `destinatario` (usados em `notas.js`/`notasController`). Provavelmente colunas extra na tabela não declaradas no model — **verificar migration real** antes de definir o struct Go (candidatos: `nova` BOOLEAN, `destinatario` STRING).
- Associações: `belongsTo Cliente (as cliente)`, `belongsTo User (as criador, fk criado_por_id)`.

### 4.3 Model `Lembrete` (tabela `Lembretes` — **T maiúsculo**)
`id` PK; `titulo` STRING NOT NULL; `descricao` TEXT null; `data` DATE NOT NULL; `notificado` BOOLEAN default false; `concluido` BOOLEAN default false. Timestamps default Sequelize (`createdAt`/`updatedAt`). **Sem `tenant_id`** (não multi-tenant hoje).

### 4.4 Model `Acesso` (tabela `acessos`, `underscored: true`, `timestamps: false`)
`id` PK; `ip` STRING NOT NULL; `referer` STRING; `userAgent`→`user_agent`; `deviceType`→`device_type`; `page` STRING; `geoCity`→`geo_city`; `geoRegion`→`geo_region`; `geoCountry`→`geo_country`; `geoTimezone`→`geo_timezone`; `geoCoordinates`→`geo_coordinates` (TEXT, JSON `[lat,lng]`); `timestamp` DATE default NOW; `user_id` INT null FK `users.id`. Association `belongsTo User (as user)`. **Sem `created_at`/`updated_at`.**

### 4.5 Models `Estado` / `Municipio`
- `Estado` (tabela default `Estados`): `nome` STRING, `sigla` STRING; `hasMany Municipio (fk estadoId)`.
- `Municipio` (tabela default `Municipios`): `nome` STRING, `estadoId` INTEGER; `belongsTo Estado (fk estadoId)`.
- ⚠️ `estadoId` em **camelCase** (default Sequelize, sem `underscored`). Confirmar nome real da coluna na migration antes do GORM tag.

---

## 5. Uploads / Storage / PDF — estratégia Go

### 5.1 Layout de diretórios (`uploads/`, relativo à raiz do backend)
| Subdir | Origem | Conteúdo |
|---|---|---|
| `uploads/clientes/<cpf>/<dbField>/documento.pdf` | `pdfService.processFiles` | PDF mesclado por tipo de documento do cliente |
| `uploads/clientes/<cpf>/tela_aprovacao/<sanitized>` | `processDocumentUploads` (ramo `tela_aprovacao`) | arquivo original renomeado |
| `uploads/fiador_documentos/` | `upload.js` (`fiadorDocumentos`) → mas `processFiles` grava em `clientes/<cpf>/fiador_documentos/` | ⚠️ inconsistência: multer joga no dir temp `fiador_documentos`, o PDF final vai para `clientes/<cpf>/` |
| `uploads/formularios_caixa/` | idem | idem |
| `uploads/temp/` | fallback multer | temporários |
| `uploads/imoveis/<id>/{capa,imagens,documentacao}/` | `imovelService.organizeAndConvertImages` | webp + doc |
| `uploads/deletar/` | `moveFileToDeleteFolder` | "lixeira" de imagens substituídas |
| `uploads/{imagem_administrador,imagem_correspondente,corretor,usuario,laudos,contratos,vistorias,tenants}/` | outros módulos | fora do escopo mas servidos pela mesma rota |

**Multer (`middleware/upload.js`)** — mapeamento `fieldname → destino`:
`fiadorDocumentos→fiador_documentos/`, `formulariosCaixa→formularios_caixa/`, `documentosPessoais|extratoBancario|documentosDependente|documentosConjuge|tela_aprovacao|notas→clientes/`, senão `temp/`. Filename: `<fieldname>_<baseNameSanit>_<ts>_<rand><ext>`. Limite por arquivo: `MAX_FILE_SIZE_MB` (default 10MB). MIME/extensão permitidos: imagens (jpeg/png/gif/webp/bmp/tiff), pdf, doc/docx, xls/xlsx, txt/csv. Erros mapeados: `413` (LIMIT_FILE_SIZE), `400` (count/fields/unexpected), `415` (tipo não permitido). `autoCleanup`: em `res.finish` com status ≥400, apaga temporários.

> Em Go/Gin: usar `c.SaveUploadedFile` com router de destino por fieldname; replicar filename scheme, allowlist de MIME+ext, limite por arquivo, e cleanup em erro (`defer` que remove temporários se o handler falhar).

### 5.2 Servir arquivos — `GET /api/uploads/*` (`server.js`)
Pipeline (replicar a ordem):
1. **Middleware de log** (`/api/uploads`) — opcional, só logging.
2. **`findFileMiddleware`** (custom, seguro):
   - Se path contém `/clientes/` e **não** `/temp/` → **modo restrito**: só serve o **caminho exato** `uploads/<path>`. Se não existe → `404 { error:'Documento não encontrado' }`. **Nunca** faz busca genérica para docs de cliente.
     - Se `.pdf`: headers `Content-Type: application/pdf`, `Content-Disposition: inline`, **anti-cache** (`Cache-Control: no-cache,no-store,must-revalidate,private`, `Pragma: no-cache`, `Expires: 0`), `ETag` = `"<mtimeMs>-<size>"`, `Last-Modified` = mtime.
   - Caso contrário: tenta lista de caminhos (`uploads/<path>` + mapeamentos por basename em `imagem_correspondente/`, `imagem_administrador/`, `corretor/`, `imoveis/`, `laudos/`, `usuario/`), servindo o primeiro que existir.
   - **Fallback recursivo**: se não achou, busca recursivamente (maxDepth 5) por basename dentro de `uploads/clientes/` e serve se encontrar. (Nota: fallback recursivo só roda para paths que **não** entraram no modo restrito.)
   - Se nada → `next()`.
3. **`express.static`** em `uploads/` e `Uploads/` (compat case) + rotas estáticas específicas por subdir + um `express.static` final com `setHeaders` anti-cache para `.pdf` (`etag:false, lastModified:false, maxAge:0`).

> **Segurança a preservar em Go:** documentos de cliente só por caminho exato (sem busca por basename), evitando vazamento cross-cliente. Sanitizar `../` (path traversal) — o código atual confia no Express; em Go **validar explicitamente** que o caminho resolvido está sob `uploads/`.
>
> **Rotas de debug a NÃO migrar (ou proteger):** `GET /api/test-file/:type/:filename`, `GET /api/list-uploads/:type?`, `POST /api/reorganize-uploads`, `GET /api/find-file/:filename`, `GET /api/cliente/:id/documento/:tipo` — expõem estrutura de arquivos sem auth. Recomendação: descartar ou trancar atrás de super-admin.

### 5.3 Validação de segurança de documento de cliente (endpoint `/verificar` e PUT)
Replicar as três checagens:
1. `caminhoDocumento.includes(cliente.cpf)` (senão `403`).
2. Para tipos != `tela_aprovacao`: `caminhoDocumento.includes(campoDocumento)`; para `tela_aprovacao`: deve conter `'tela_aprovacao'`.
3. `path.dirname(fullPath).startsWith(uploads/clientes/<cpf>)`.
No PUT, os documentos processados só são gravados se o path contém o **CPF sem máscara** (`validatedUpdates`).

### 5.4 Storage por tenant (`storageService.js`)
Fonte de verdade: coluna `tenants.storage_used_bytes` (BIGINT/contador). Limites: `tenants.max_storage_mb` / `max_file_size_mb` (override) → senão do `Plan` da `Subscription` ativa (`status ∈ {active,trialing}`) → default `500MB` / `10MB`. `0 = ilimitado`.
- `getStorageLimits(tenantId)`, `getStorageUsage`, `getStorageInfo` (retorna `usado_mb/bytes`, `limite_mb`, `limite_arquivo_mb`, `percentual`, `ilimitado`, `disponivel_mb`).
- `incrementStorage` (após upload) / `decrementStorage` (após delete) / `recalculateStorage` (varre `uploads/` recursivamente somando `size` — **hoje single-tenant: soma tudo**, não filtra por tenant).
- **Middleware `checkStorageLimit`** (antes do multer): super-admin bypass; se `usedBytes >= limite` → `413 STORAGE_LIMIT_REACHED`; checa `Content-Length` vs `maxFileSizeMb` → `413 FILE_TOO_LARGE`; **fail-open** em erro. `trackStorageAfterUpload` (depois): soma `req.files` e `incrementStorage`.

> Em Go: serviço `storage` com as mesmas funções; middleware `CheckStorageLimit` que roda **antes** do parse do multipart (usar `c.Request.ContentLength`); hook pós-upload para incrementar. Reproduzir fail-open.

### 5.5 Geração/conversão de PDF (`pdfService.js`, ~44KB) — o essencial
Config (instanciado em `clientes.js`): `enableImageConversion:true`, `imageConversionTypes:['ctps','carteira','rg','cpf']`, `dpi:150`, `quality:85`, `maxWidth:1200`, `format:'jpeg'`.

**`processFiles(files, user, cpf, dbField, existingPath)`** — núcleo:
1. Destino: `uploads/clientes/<cpf>/<dbField>/documento.pdf`.
2. Se já existe `documento.pdf` no dir do cliente → carrega e **anexa** novas páginas (merge incremental). **Ignora `existingPath`** de propósito (evita misturar docs de outro cliente).
3. Para cada arquivo enviado:
   - **Imagem** (jpg/png/etc.): `sharp` → resize (`maxWidth`, `fit:inside`, sem enlarge) → JPEG (`quality`, mozjpeg) → embute como página PDF (`pdf-lib embedJpg`, página do tamanho da imagem).
   - **PDF**: tenta carregar tolerante (`tryLoadPdf` — múltiplos métodos, `ignoreEncryption`). Detecta CTPS por nome (`ctps`/`carteira`). Se `dbField`/nome ∈ `imageConversionTypes` e PDF problemático → **converte PDF→imagem→PDF** (`convertPdfToImagePdf`) para "achatar" PDFs quebrados/escaneados; caso normal, copia páginas.
   - Valida conteúdo (páginas com width/height > 0).
4. Salva `documento.pdf` mesclado; retorna caminho **relativo** (`clientes/<cpf>/<dbField>/documento.pdf`).

**`extractPageAsBuffer(filePath, pageNumber)`**: carrega PDF, copia 1 página (`copyPages`) para um novo doc, retorna `Buffer` — usado por `GET .../pagina/:n`.
**`sanitizeFileName`**: remove `()[]{}` e espaços → `_`, tira outros especiais, colapsa `_`, fallback `'documento'`.
**Info de PDF** (`/info`): usa `pdf-lib` `getPageCount()`.
**`cleanupTempDirectory` / `cleanupTempFiles`**: limpa `uploads/temp` e arquivos temporários pós-request.

**Equivalentes Go** (bibliotecas sugeridas):
- Manipulação/merge/split de PDF: `pdfcpu` (`github.com/pdfcpu/pdfcpu`) — merge, split (extrair página), import de imagem→PDF, contagem de páginas. Alternativa: `unidoc/unipdf` (licença comercial) ou `pdf-lib` não existe em Go.
- Processamento de imagem (resize/JPEG): `github.com/disintegration/imaging` ou `github.com/h2non/bimg` (libvips, análogo ao `sharp`) — bimg dá paridade de performance/qualidade com sharp.
- Imagem→PDF: `pdfcpu` `api.ImportImages` ou montar página com a imagem embutida.
- **Conversão PDF→imagem** (para o caminho `ctps/carteira/rg/cpf`): precisa de rasterização — em Node é feita via sharp/render; em Go usar `go-fitz` (`github.com/gen2brain/go-fitz`, bindings MuPDF) para renderizar página→imagem, depois re-empacotar em PDF. Avaliar dependência nativa (MuPDF) no deploy Linux.
- Extração de nº de páginas: `pdfcpu` `api.PageCount`.

> **Decisão de arquitetura:** encapsular tudo num pacote `internal/integrations/pdf` com interface `PDFService` (métodos `ProcessFiles`, `ExtractPage`, `PageCount`, `SanitizeFileName`) para isolar a dependência nativa e permitir mock nos testes.

---

## 6. Gotchas (críticos para a migração)

1. **`valor_renda` (e `conjuge_valor_renda`) são VARCHAR** com valor formatado pt-BR (`"1.234,56"`). Qualquer SUM/AVG/ORDER numérico exige `CAST(REPLACE(REPLACE("valor_renda",'.',''),',','.') AS NUMERIC)` (remover separador de milhar e trocar vírgula por ponto antes do CAST). No struct Go, manter como `string`; helper de parsing dedicado.
2. **Datas como VARCHAR(10)** (`data_nascimento`, `data_admissao`, cônjuge). Não usar `time.Time` no GORM para esses campos — usar `string` `YYYY-MM-DD` e converter só quando necessário. Input sempre passado por `split('T')[0]`.
3. **Default de `status` com acento** no model (`'aguardando_aprovação'`) vs. gravação/validação sem acento (`'aguardando_aprovacao'`). Normalizar (migração de dados + enum sem acento).
4. **`cliente.userId` vs coluna `user_id`**: o model tem tanto a association (`user_id`) quanto o atributo `userId` apontando para `users.id`. O JS lê `cliente.userId`; SELECTs pedem `'user_id'`. Em GORM: um único campo `UserID int` → `column:user_id`. Verificar se há realmente duas colunas na tabela (provável que seja a mesma coluna com dois nomes de acesso).
5. **Auth dupla**: `clientes.js` e `listadeclientes.js` aplicam `authenticateToken` no mount **e** inline. Em Go aplicar uma vez (middleware de grupo).
6. **Rotas sem auth no mount** (`/api/notas`, `/api/lembretes`, `/api/acessos`, `/api/estados`, `/api/documentos`): hoje efetivamente públicas. Documentar como **divergência de segurança**; decidir explicitamente se protege ao migrar.
7. **`clienteRoutes` montado por ÚLTIMO em `/api/` raiz** (catch-all). Preservar ordem/precedência de rotas em Gin (rotas específicas antes; grupo de clientes por último) para não sequestrar paths de outros módulos.
8. **`tela_aprovacao` tem dois fluxos divergentes**: (a) via `uploadFields`/`processDocumentUploads` grava **caminho de arquivo**; (b) via `POST /clientes/:id/tela_aprovacao` (multer `dest` próprio) grava **JSON** `[{filePath,fileName}]`. O campo TEXT pode conter os dois formatos. Unificar na migração.
9. **`Imovel` usa timestamps camelCase** (`createdAt`/`updatedAt`) — único no projeto. Mas `imovelService.listarImoveis` ordena por `created_at` (snake) → **inconsistente**, pode quebrar. Padronizar no Go.
10. **`imovelService` busca por colunas inexistentes** (`titulo`, `descricao`, `bairro`, `cidade`) — a busca textual de imóveis está parcialmente quebrada hoje. Corrigir para colunas reais.
11. **Model `Nota` não declara `nova`/`destinatario`** mas o código os usa — confirmar colunas reais na tabela `notas` antes de definir o struct.
12. **`recalculateStorage` soma TODO o diretório `uploads/`** sem filtrar tenant (single-tenant). Se o Go for multi-tenant real, é preciso particionar `uploads/` por tenant e filtrar.
13. **Hard deletes** em Cliente/Imóvel não removem arquivos do disco nem decrementam `storage_used_bytes` → storage "vaza". Considerar cleanup + `decrementStorage` na migração.
14. **`documentRoutes.js` usa `../uploads` (busboy) e `../Uploads/...` (destino)** — mismatch de case que só funciona em FS case-insensitive (Windows). Em Linux quebra. Normalizar para `uploads/` minúsculo.
15. **Path traversal**: o servir de arquivos confia no Express; em Go validar explicitamente `filepath.Clean` + prefixo `uploads/`.
16. **PDF headers anti-cache** obrigatórios ao servir PDFs de cliente (frontend depende de reload — ver §5.2). Replicar `Cache-Control/Pragma/Expires/ETag(mtime-size)`.
17. **`notasRoutes.js` é órfão** — não migrar como rota ativa.

---

## 7. Layout Go proposto

Estrutura orientada a módulos (feature packages) + integrações isoladas. Gin + GORM.

```
backend-go/
├── cmd/
│   └── api/
│       └── main.go                      # bootstrap: config, db, router, mount de módulos
├── internal/
│   ├── config/                          # env (DB_*, JWT, MAX_FILE_SIZE_MB, BASE_URL, ...)
│   ├── database/                        # conexão GORM, migrations, naming strategy
│   ├── middleware/
│   │   ├── auth.go                      # AuthenticateToken (JWT + tabela tokens)
│   │   ├── tenant.go                    # ResolveTenant (req.tenantId, X-Tenant-Id super admin)
│   │   ├── storage_limit.go             # CheckStorageLimit / TrackStorageAfterUpload
│   │   ├── upload.go                    # multipart: destino por fieldname, allowlist MIME/ext, filename scheme, cleanup
│   │   └── access_logger.go             # log de acessos (opcional, ver módulo acessos)
│   │
│   ├── modules/
│   │   ├── clientes/
│   │   │   ├── model.go                 # struct Cliente (todas as colunas §3), enum StatusValidos, documentTypeMap
│   │   │   ├── repository.go            # queries GORM (findAndCount, filtros por role/tenant, CAST valor_renda)
│   │   │   ├── service.go               # buildClienteData, validações CPF, orquestra PDF/uploads/notificações
│   │   │   ├── handler.go               # POST/PUT/GET/PATCH/DELETE + /documentos/:tipo/{verificar,info,pagina}
│   │   │   ├── documents.go             # processDocumentUploads, validação de segurança de path (§5.3)
│   │   │   └── routes.go                # RegisterRoutes(rg *gin.RouterGroup) — montar por ÚLTIMO
│   │   │
│   │   ├── listaclientes/
│   │   │   ├── handler.go               # GET /, /usuarios, /test-permissions
│   │   │   └── routes.go
│   │   │
│   │   ├── imoveis/
│   │   │   ├── model.go                 # struct Imovel (timestamps camelCase!), JSON imagens
│   │   │   ├── repository.go
│   │   │   ├── service.go               # listar/criar/atualizar/deletar/semelhantes + organizeAndConvertImages
│   │   │   ├── handler.go               # CRUD + busca + download-imagens (zip) + semelhantes
│   │   │   └── routes.go
│   │   │
│   │   ├── notas/
│   │   │   ├── model.go                 # struct Nota (confirmar nova/destinatario)
│   │   │   ├── repository.go
│   │   │   ├── service.go               # cria nota + resolve responsável + dispara WhatsApp (não bloqueante)
│   │   │   ├── handler.go               # POST/GET/PUT concluir/DELETE + /clientes/:id/notas
│   │   │   └── routes.go
│   │   │
│   │   ├── lembretes/
│   │   │   ├── model.go                 # tabela "Lembretes" (T maiúsculo)
│   │   │   ├── handler.go               # CRUD + tz America/Sao_Paulo + dedupe titulo+data
│   │   │   └── routes.go
│   │   │
│   │   ├── acessos/
│   │   │   ├── model.go                 # tabela acessos (timestamps:false, underscored)
│   │   │   ├── repository.go            # agregações (EXTRACT hour, counts, distinct user_id)
│   │   │   ├── service.go               # geoip + parse UA + determinarRole
│   │   │   ├── handler.go               # POST /, GET /, /stats, /realtime, /user/:userId
│   │   │   └── routes.go
│   │   │
│   │   └── locations/
│   │       ├── model.go                 # Estado, Municipio (estadoId camelCase — confirmar)
│   │       ├── handler.go               # GET /estados, /municipios/:estadoId
│   │       └── routes.go
│   │
│   ├── integrations/
│   │   ├── storage/
│   │   │   ├── service.go               # getStorageLimits/Usage/Info, increment/decrement, recalculate
│   │   │   ├── limits.go                # resolução plano/subscription/override
│   │   │   └── files.go                 # servir /api/uploads/* (findFile seguro, modo restrito clientes, anti-cache PDF)
│   │   ├── pdf/
│   │   │   ├── service.go               # interface PDFService
│   │   │   ├── process.go               # ProcessFiles (merge incremental, imagem→PDF via bimg/imaging)
│   │   │   ├── convert.go               # PDF→imagem→PDF p/ ctps/carteira/rg/cpf (go-fitz/MuPDF)
│   │   │   ├── pages.go                 # ExtractPage, PageCount (pdfcpu)
│   │   │   └── sanitize.go              # SanitizeFileName
│   │   └── whatsapp/                    # client HTTP p/ notificações (fora deste cluster, referência)
│   │
│   └── shared/
│       ├── httpx/                       # helpers de resposta JSON, erros padronizados
│       ├── validation/                  # CPF (comprimento + dígito verificador), CNPJ, email, telefone
│       └── socket/                      # emissor de eventos (cliente-criado, imovel-*, nota-*, ...)
│
└── docs/migration/
    └── 02-clientes-imoveis-uploads.md   # (este arquivo)
```

### 7.1 Ordem de montagem no router (main.go / router setup)
Preservar precedência do Express:
```
/api/estados, /api/municipios/:estadoId        (locations, público*)
/api/acessos/*                                  (acessos, público*)
/api/lembretes*                                 (lembretes, público*)
/api/notas/*                                    (notas, público* → recomenda-se proteger)
/api/documentos/upload                          (auth inline)
/api/listadeclientes/*                          (auth+tenant)
/api/imoveis/*                                  (auth+tenant)
/api/storage-usage, /api/storage-recalculate    (auth+tenant)
/api/uploads/*                                   (servidor de arquivos seguro, sem tenant)
/api/clientes*                                   (auth+tenant) — REGISTRAR POR ÚLTIMO
```
`*` = sem auth hoje; marcar decisão de segurança na migração.

### 7.2 Contratos a preservar 1:1 (para não quebrar o frontend)
- Shapes de resposta (`{ success, clientes, pagination }`, `{ cliente, whatsapp, notificacaoCorrespondentes }`, etc.).
- Status codes (`400/403/404/413/415/422/500`) exatamente como mapeados.
- URLs de documento: `${BASE_URL}/api/uploads/<path relativo>`.
- Headers anti-cache para PDFs de cliente.
- Nomes de campos multipart (`documentosPessoais`, `extratoBancario`, ...), `documentTypeMap`, `STATUS_VALIDOS`.
- Eventos socket emitidos (nomes e payloads).

---

### Apêndice — Tabelas/colunas usadas por este cluster
- **`clientes`** — todas as colunas de §3 (+ FKs `user_id`, `tenant_id`).
- **`imoveis`** — §4.1 (+ `tenant_id`), timestamps camelCase.
- **`notas`** — `id, cliente_id, processo_id, texto, criado_por_id, data_criacao, updated_at` (+ prováveis `nova, destinatario`).
- **`Lembretes`** — `id, titulo, descricao, data, notificado, concluido, createdAt, updatedAt`.
- **`acessos`** — `id, ip, referer, user_agent, device_type, page, geo_city, geo_region, geo_country, geo_timezone, geo_coordinates, timestamp, user_id`.
- **`Estados`** — `id, nome, sigla`.
- **`Municipios`** — `id, nome, estadoId`.
- **`users`** — lido para roles/notificações (`id, first_name, last_name, username, email, telefone, is_administrador, is_corretor, is_correspondente, is_super_admin, tenant_id`).
- **`tenants`** — `id, storage_used_bytes, max_storage_mb, max_file_size_mb` (+ relação `subscriptions`→`plans`: `max_storage_mb, max_file_size_mb`).
- **`tokens`** — validação de auth (via middleware).
