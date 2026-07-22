package jobs

import (
	"context"
	"time"
)

// Este arquivo declara as interfaces MÍNIMAS que os jobs precisam dos
// serviços de negócio. As implementações reais pertencem a outros módulos
// (internal/modules/pagamentos, financeiro, clientes, aluguel, etc.),
// desenvolvidos por outros agentes em paralelo — este pacote NÃO os
// implementa, apenas consome via injeção de dependência (ver scheduler.go /
// docs/migration/wiring/05-whatsapp-realtime-jobs.md).
//
// Enquanto a implementação real não existe, injete `nil` no `New(...)` — cada
// job faz nil-check e apenas loga "serviço não configurado, pulando" em vez
// de pânico.

// WhatsAppSender é o subconjunto do whatsapp.Manager usado pelos jobs.
// *crmimob/internal/integrations/whatsapp.Manager satisfaz esta interface
// diretamente (mesma assinatura de SendMessage), eliminando o hop HTTP que o
// Node fazia via `fetch` interno (gotcha #6/#7 do spec).
type WhatsAppSender interface {
	SendMessage(ctx context.Context, tenantID uint, phone, message string) (msgID string, err error)
}

// EmailSender é o subconjunto do email.Client usado pelos jobs.
type EmailSender interface {
	Send(to, subject, htmlBody string) error
}

// ParcelaPendente é o DTO mínimo de um Pagamento parcelado aguardando envio
// (equivalente ao include Cliente do Node em `enviarParcelasAutomaticas`).
type ParcelaPendente struct {
	PagamentoID   uint
	TenantID      uint
	ClienteNome   string
	ClienteEmail  string
	ClienteTelefone string
	Valor         string
	ParcelaAtual  int
}

// PagamentoService é a interface mínima que internal/modules/pagamentos deve
// implementar para o job de parcelas (jobs/parcelas.go) funcionar.
type PagamentoService interface {
	// BuscarParcelasParaEnvio replica o WHERE do Node:
	// status='aguardando' AND data_envio_proxima_parcela <= now+1h
	// AND is_parcelado=true AND parcela_atual>1.
	BuscarParcelasParaEnvio(ctx context.Context, ate time.Time) ([]ParcelaPendente, error)

	// CriarPreferenciaComJuros cria a preferência Mercado Pago e devolve o
	// link de pagamento, atualizando mp_preference_id/link_pagamento/dados_mp/
	// status='pendente' internamente (equivalente a mercadoPagoService.criarPreferenciaComJuros).
	CriarPreferenciaComJuros(ctx context.Context, pagamentoID uint) (linkPagamento string, err error)

	MarcarWhatsappEnviado(ctx context.Context, pagamentoID uint) error
	MarcarEmailEnviado(ctx context.Context, pagamentoID uint) error
}

// LembreteVencimentoService cobre verificarLembretesParaNotificacao +
// verificarVencimentosParaNotificacao (jobs/lembretes.go), a cargo do módulo
// de clientes/agenda.
type LembreteVencimentoService interface {
	// VerificarLembretes dispara quando (data - now == 15min) e status != 'concluido'.
	VerificarLembretes(ctx context.Context) error
	// VerificarVencimentos dispara quando (diaVencimento - now == 3 dias);
	// anexa link Asaas se asaas_subscription_id presente.
	VerificarVencimentos(ctx context.Context) error
}

// ReguaCobrancaService cobre processarReguaCobranca (jobs/regua_cobranca.go),
// a cargo do módulo de aluguel/cobrança.
type ReguaCobrancaService interface {
	ProcessarReguaCobranca(ctx context.Context, sender WhatsAppSender) error
}

// AsaasSyncService cobre sincronizarCobrancasAsaas (jobs/asaas_sync.go).
type AsaasSyncService interface {
	SincronizarCobrancas(ctx context.Context) error
}

// ScoreService cobre calcularScoreTodosInquilinos (jobs/score_reajuste.go).
type ScoreService interface {
	CalcularScoreTodosInquilinos(ctx context.Context) error
}

// ReajusteService cobre verificarContratosReajuste (jobs/score_reajuste.go):
// alerta 30 dias antes do reajuste, envia WhatsApp.
type ReajusteService interface {
	VerificarContratosReajuste(ctx context.Context, sender WhatsAppSender) error
}

// RelatorioMensalService cobre enviarRelatorioMensalProprietario (jobs/relatorio_mensal.go).
type RelatorioMensalService interface {
	EnviarRelatorioMensalProprietario(ctx context.Context, sender WhatsAppSender) error
}

// BackupRunner cobre utils/backup.js (backupDatabase). A implementação real
// pode viver em internal/database ou num pacote de infra próprio.
type BackupRunner interface {
	Backup(ctx context.Context) error
}
