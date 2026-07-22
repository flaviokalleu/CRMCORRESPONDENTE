package reguacobranca

import "errors"

// ErrWhatsAppNotImplemented — ver internal/modules/chamados/whatsapp.go (mesma
// decisão). A integração real (whatsmeow) está em
// internal/integrations/whatsapp, construída por outro agente.
var ErrWhatsAppNotImplemented = errors.New("whatsapp: integração ainda não implementada")

// WhatsAppSender é a interface que a régua de cobrança usa para enviar as
// mensagens de cada etapa. Ver docs/migration/wiring/04-alugueis.md.
//
// ⚠ Corrige o bug latente do Node (04-spec Gotcha 8): lá o cron passava uma
// FUNÇÃO onde o service esperava um objeto com `.sendMessage()`, então o
// envio real nunca disparava (só o registro em ReguaCobranca era gravado).
// Aqui o contrato é uma interface única e explícita — não há essa
// ambiguidade de assinatura.
type WhatsAppSender interface {
	SendMessage(tenantID uint, telefone, mensagem string) error
}

// NoopWhatsAppSender é o stub padrão: toda chamada falha com
// ErrWhatsAppNotImplemented. `Processar` trata isso como não-bloqueante —
// o registro de ReguaCobranca é sempre gravado (mesmo sem envio real),
// igual ao comportamento observável do Node (ver Gotcha 8).
type NoopWhatsAppSender struct{}

func (NoopWhatsAppSender) SendMessage(uint, string, string) error {
	return ErrWhatsAppNotImplemented
}
