package chamados

import "errors"

// ErrWhatsAppNotImplemented é devolvido pelo stub padrão enquanto a
// integração real (internal/integrations/whatsapp, baseada em whatsmeow, em
// construção por outro agente) não é conectada. Ver
// docs/migration/wiring/04-alugueis.md.
var ErrWhatsAppNotImplemented = errors.New("whatsapp: integração ainda não implementada")

// WhatsAppSender é a interface mínima que este módulo precisa para notificar
// admin (novo chamado) e inquilino (chamado resolvido). Injeção de
// dependência — a implementação real fica em internal/integrations/whatsapp.
type WhatsAppSender interface {
	SendMessage(tenantID uint, telefone, mensagem string) error
}

// NoopWhatsAppSender é o stub padrão: toda chamada falha com
// ErrWhatsAppNotImplemented. Os fluxos deste módulo tratam isso como
// não-bloqueante (o chamado é criado/atualizado mesmo se a notificação falhar).
type NoopWhatsAppSender struct{}

func (NoopWhatsAppSender) SendMessage(uint, string, string) error {
	return ErrWhatsAppNotImplemented
}
