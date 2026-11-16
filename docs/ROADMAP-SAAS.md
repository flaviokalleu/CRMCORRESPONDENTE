# Roadmap — CRM como SaaS

Referência: o modelo de empresas, planos e cobrança do Webba (`~/Documentos/chatwebba`).
Decisões tomadas em 2026-11-16:

- **Cobrança da assinatura pelo Asaas da plataforma** (chave própria, separada da
  chave que cada imobiliária usa para cobrar os clientes dela).
- **Teste grátis de 7 dias, sem cartão.** A fatura do primeiro mês nasce junto com
  a conta e vence no fim do teste.
- **Atraso:** avisos antes e depois do vencimento, tolerância de dias configurável
  por imobiliária (padrão 3) e, depois, bloqueio total com a tela de pagamento.

## Regras de UX (valem para todas as telas desta área)

- Uma ação principal por tela, destacada (ex.: **Pagar agora**). O resto fica secundário.
- Poucas escolhas de cada vez (lei de Hick): troca de plano mostra no máximo 3 planos.
- Botões grandes, perto do conteúdo a que se referem (lei de Fitts).
- Padrões conhecidos (lei de Jakob): fatura com valor, vencimento e situação em
  cores de semáforo; banner no topo para prazo.
- Texto para leigo: "Seu teste acaba em 3 dias", nunca "trialing" ou "past_due".
- Sempre dizer o que acontece depois: "Assim que o pagamento cair, o acesso volta sozinho."
- Nunca deixar a pessoa sem saída: a tela de bloqueio sempre tem o botão de pagar e
  o contato do suporte.

## Etapa 1 — Base da assinatura (backend)

- [x] Migração 0012: tabela `faturas_assinatura` (chave anti-duplicidade única),
      `avisos_cobranca`, `webhook_events` (idempotência dos webhooks; faltava e
      fazia o webhook das imobiliárias descartar tudo), colunas de bloqueio manual e
      documento de cobrança em `tenants`, tolerância/preço combinado/plano agendado em
      `subscriptions`. Planos pagos com teste de 7 dias; plano Free fora da vitrine.
- [x] Regra única de acesso calculada pelas datas (`assinatura.Acesso`), com testes.
- [x] Cadastro: nasce em teste de 7 dias + fatura pendente vencendo no fim do teste.
- [x] Corrigir o cadastro pela tela (`plan_id` enviado como texto).

## Etapa 2 — Cobrança

- [x] Agendador (a cada hora): gera a fatura de renovação 3 dias antes do
      vencimento, marca vencidas, renova cortesia (valor zero) sem fatura.
- [x] Pagar: link do Asaas com Pix, boleto e cartão (pede CPF/CNPJ se faltar).
- [x] Webhook da plataforma: baixa a fatura uma única vez e estende o "pago até"
      (pagar adiantado não perde dias). Estorno marca a fatura como estornada.
- [x] Avisos por e-mail: 3 dias antes, no dia, 3 dias depois, e no bloqueio.
- [x] Troca de plano pela imobiliária: no teste vale na hora; depois do teste vale
      na próxima renovação (sem cálculo proporcional).

## Etapa 3 — Bloqueio e limites

- [x] Erro 402 em **todas** as rotas da imobiliária, menos login, assinatura e
      configurações da empresa.
- [x] Frontend: 402 leva para "Minha assinatura"; banner com dias de teste.
- [x] Ligar limites (clientes, usuários, imóveis, aluguéis) e módulos do plano às
      rotas, e esconder do menu o que o plano não tem, com convite para mudar de plano.

## Etapa 4 — Painel master

- [x] Lista de imobiliárias com situação, plano, valor e "pago até".
- [x] Ficha: trocar plano, preço combinado, tolerância, prorrogar, bloquear/desbloquear,
      dar baixa manual em fatura, cancelar fatura, "entrar como".
- [x] Métricas corrigidas (MRR, em teste, bloqueadas, cancelamentos).
- [x] CRUD de planos.

## Onde está cada coisa

- Backend: `backend-go/internal/modules/assinatura/` (regra de acesso `acesso.go`,
  faturas/pagamento/webhook `service.go`, avisos `avisos.go`, rotas `handler.go`,
  ações do master `master.go`, painel `painel.go`); limites e recursos do plano por
  rota em `internal/middleware/regras_do_plano.go` (rota nova que cria recurso
  limitado ou usa recurso pago entra na tabela de lá).
- Frontend: `src/components/assinatura/` (Minha assinatura, faixa de prazo, tela de
  bloqueio, painel master, ficha da empresa, editor de planos, faixa "Entrar como").
- "Entrar como": cookie httpOnly `cri_ver_empresa` → cabeçalho `X-Tenant-Id`
  (o backend só aceita de superadmin).

## Pendências conhecidas

- Pagamento real pelo Asaas ainda não testado: falta a chave da conta da plataforma.
- Teste antigo `TestOtimizarPDFSemGanhoDevolveEntradaIntacta` (pacote media) falha;
  não tem relação com a assinatura (pacote não alterado).

## Configuração (produção)

- `ASAAS_PLATAFORMA_API_KEY`, `ASAAS_PLATAFORMA_AMBIENTE` (sandbox|production),
  `ASAAS_PLATAFORMA_WEBHOOK_TOKEN`: conta Asaas da PLATAFORMA (não a das imobiliárias).
- Webhook no painel do Asaas: `POST <backend>/api/assinatura/webhook/asaas`,
  com o mesmo token, eventos de cobrança.
- `PLATAFORMA_TENANT_ID` (padrão 1): empresa dona da plataforma, nunca cobrada.
- SMTP_* preenchido para os avisos de cobrança saírem de verdade.

## Depois

- Cupom de desconto (com conferência do preço **no servidor**).
- Módulos avulsos e limites extras pagos.
- Programa de parceiros/indicação.
- Aviso de cobrança também por WhatsApp.
- Cancelamento pelo cliente e desistência em 7 dias (CDC).
