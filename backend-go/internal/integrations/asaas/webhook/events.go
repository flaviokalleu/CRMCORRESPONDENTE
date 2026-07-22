package webhook

import (
	"context"
	"log"
	"time"

	"gorm.io/gorm"

	"crmimob/internal/integrations/asaas"
	"crmimob/internal/models"
)

// RentalHook é o ponto de extensão para o subsistema de aluguéis recorrentes
// (CobrancaAluguel/ClienteAluguel/RepasseProprietario) — models e módulo fora
// do escopo deste pacote (ver 03-spec: "FICA", já era Asaas no Node, apenas
// portado por outro módulo). O módulo de aluguéis deve, na inicialização,
// atribuir esta variável para receber os eventos e replicar a lógica de
// `routes/asaasWebhook.js`: gerar recibo PDF, marcar CobrancaAluguel,
// processar repasse ao proprietário e enviar WhatsApp.
//
// Ficará nil até o módulo de aluguéis ser implementado — nesse caso os
// eventos que não corresponderem a um Pagamento avulso são apenas logados.
var RentalHook func(ctx context.Context, db *gorm.DB, tenantID *uint, payload asaas.WebhookPayload) error

// ProcessEvent trata o evento Asaas para o subsistema de PAGAMENTOS AVULSOS
// (models.Pagamento, era Mercado Pago). Se nenhum Pagamento correspondente ao
// asaas_payment_id for encontrado, delega ao RentalHook (aluguéis) quando
// configurado — replicando a unificação recomendada em 03-spec gotcha §1.
func ProcessEvent(ctx context.Context, db *gorm.DB, tenantID *uint, payload asaas.WebhookPayload) error {
	if payload.Payment.ID == "" {
		log.Printf("asaas webhook: evento %s sem payment.id, ignorado", payload.Event)
		return nil
	}

	var pagamento models.Pagamento
	err := db.WithContext(ctx).Where("asaas_payment_id = ?", payload.Payment.ID).First(&pagamento).Error
	if err != nil {
		// Não é uma cobrança avulsa conhecida — pode ser um aluguel recorrente.
		if RentalHook != nil {
			return RentalHook(ctx, db, tenantID, payload)
		}
		log.Printf("asaas webhook: payment %s não encontrado em pagamentos avulsos e RentalHook não configurado (evento %s ignorado)", payload.Payment.ID, payload.Event)
		return nil
	}

	updates := map[string]any{"updated_at": time.Now()}

	switch payload.Event {
	case asaas.EventPaymentConfirmed, asaas.EventPaymentReceived:
		updates["status"] = models.PagamentoStatusAprovado
		now := time.Now()
		updates["data_pagamento"] = now
		if payload.Payment.InvoiceURL != "" {
			updates["invoice_url"] = payload.Payment.InvoiceURL
		}
		if payload.Payment.TransactionReceiptURL != "" {
			updates["transaction_receipt_url"] = payload.Payment.TransactionReceiptURL
		}
	case asaas.EventPaymentOverdue:
		updates["status"] = models.PagamentoStatusAguardando
	case asaas.EventPaymentCreated:
		updates["status"] = models.PagamentoStatusPendente
		if payload.Payment.InvoiceURL != "" {
			updates["invoice_url"] = payload.Payment.InvoiceURL
		}
		if payload.Payment.BankSlipURL != "" {
			updates["link_curto"] = payload.Payment.BankSlipURL
		}
	case asaas.EventPaymentRefunded:
		updates["status"] = models.PagamentoStatusCancelado
	case asaas.EventPaymentDeleted:
		updates["status"] = models.PagamentoStatusCancelado
	default:
		log.Printf("asaas webhook: evento %s não tratado (payment=%s)", payload.Event, payload.Payment.ID)
		return nil
	}

	return db.WithContext(ctx).Model(&models.Pagamento{}).
		Where("id = ?", pagamento.ID).
		Updates(updates).Error
}
