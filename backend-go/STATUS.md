# Status da migração — snapshot 2026-07-22

## ✅ Compila e roda

```
238 arquivos .go, ~24.500 linhas
go build ./...  → OK
go vet ./...    → OK
binário gerado  → bin/api.exe (55MB)
smoke test      → boot OK, fail-fast correto em credencial de DB inválida
```

Todos os 6 clusters de negócio estão implementados e **registrados no router**
(`internal/server/router.go`), com o mesmo `*gorm.DB` apontando para o Postgres
existente (`crmjs`) — nenhuma tabela nova exceto `webhook_events` (idempotência
Asaas) e a exigência de `laudos.tenant_id` (ver migrations pendentes abaixo).

## O que está implementado

| Cluster | Módulos Go | Nível |
|---|---|---|
| 01 — Fundação | auth, users, corretores, correspondentes, tenants, billing, superadmin | CRUD completo, feature gating, onboarding SaaS |
| 02 — Clientes/Imóveis | clientes, imoveis, notas, lembretes, acessos, locations, storage | CRUD completo; PDF/webp = stub |
| 03 — Pagamentos/Asaas | pagamentos, financeiro (receitas/despesas/comissões/fluxocaixa/repasses), asaas client+webhook | Cliente Asaas real; billing SaaS via gateway = TODO |
| 04 — Aluguéis | alugueis, contratos, proprietarios, vistorias, chamados, portalinquilino, reguacobranca | CRUD + régua completa; PDF/Asaas/WhatsApp injetados como Noop |
| 05 — WhatsApp/Realtime | whatsmeow manager, WS hub nativo, jobs (cron), email | Manager completo; jobs com services=nil (nil-safe) |
| 06 — Dashboards/Vendas | dashboards, relatorios, simulacoes, visitas, propostas, laudos, configuracoes | Agregações com CAST seguro; PDF de relatório = stub |

## Correções de segurança aplicadas (vs. Node original)

1. **Tenant isolation via GORM callbacks** substitui os hooks Sequelize — cobre inclusive updates em massa (o Node só protegia por instância).
2. `X-Tenant-Id` restrito a `is_super_admin` (Node deixava admin comum trocar de tenant).
3. `/api/report/*`, dashboards, laudos: agora exigem auth+tenant (eram públicos/sem filtro no Node).
4. `corretores`/`correspondentes`: rotas de escrita antes públicas agora exigem auth.
5. `GET /api/listadecorretores` (vazava hash de senha) e `/correspondente/debug/all`: **não portadas**.
6. Webhook Asaas: idempotência via tabela nova `webhook_events` (Node não tinha).
7. Cache de dashboard e vazamento cross-tenant em notificações WhatsApp: corrigidos.
8. Régua de cobrança: bug do Node (WhatsApp nunca disparava por assinatura de função incorreta) corrigido com interface `WhatsAppSender`.
9. Secrets: `JWT_SECRET_KEY` sem fallback hardcoded — boot falha se ausente.

## Pendências conhecidas (documentadas em código com TODO/Noop)

- **PDF real** (contratos, vistorias, relatórios, documentos de cliente): hoje interfaces `PDFEngine`/`PDFRenderer`/`pdf.Service` com stub `ErrNotImplemented`. Decisão pendente: libs nativas Go (pdfcpu + go-fitz + bimg) já apontadas nos wirings.
- **Billing SaaS via Asaas** (assinatura de planos com cobrança real): `internal/modules/billing` gerencia o registro, mas não emite cobrança no Asaas ainda.
- **Jobs com serviços reais**: o scheduler (`internal/jobs`) está rodando mas a maioria dos serviços de negócio (pagamentos, régua, score, reajuste, relatório mensal) está injetada como `nil` — precisam ser conectados aos services reais dos módulos.
- **whatsmeow**: credenciais Baileys não migram — todo tenant precisará reescanear o QR Code uma vez no cutover.
- **golang-migrate**: ainda não há baseline gerada (`migrations/README.md` tem o passo a passo). Precisa rodar antes de qualquer alteração de schema pelo Go.
- **Migration pendente**: `ALTER TABLE laudos ADD COLUMN tenant_id` (o Node não tinha essa coluna).
- **Cartão de crédito tokenizado** no Asaas: suportado no client, mas sem rota HTTP própria ainda (Node também não tinha).

## Não testado (precisa de ambiente real)

- Login/CRUD contra dados reais (só testei fail-fast de credencial errada).
- Fluxo de pagamento Asaas ponta a ponta (sandbox).
- Conexão WhatsApp real (whatsmeow exige QR scan).
- WebSocket end-to-end com o frontend.

## Próximos passos sugeridos

1. Configurar `.env` real (copiar do ambiente do Node) e rodar `go run ./cmd/api` contra o banco de verdade.
2. Gerar a baseline golang-migrate + aplicar a migration de `laudos.tenant_id`.
3. Testar login e 2-3 rotas de cada cluster manualmente (Postman/curl) comparando resposta com o Node.
4. Escolher e implementar a lib de PDF (decisão já era "libs nativas Go").
5. Conectar os `nil` do `jobs.Deps` aos services reais conforme forem validados.
6. Planejar o corte de tráfego no nginx rota-por-rota (strangler-fig).
