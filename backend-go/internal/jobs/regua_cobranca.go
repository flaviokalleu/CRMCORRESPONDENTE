package jobs

import (
	"context"
	"log"
)

// runReguaCobranca replica o schedule `0 * * * *` (a cada hora): régua de
// cobrança, também restrita a horário comercial (mesma regra do Node).
func (s *Scheduler) runReguaCobranca(ctx context.Context) {
	if !IsHorarioComercial(nowFunc()) {
		return
	}
	if s.regua == nil {
		log.Println("jobs: ReguaCobrancaService não configurado, pulando régua de cobrança")
		return
	}
	if s.whatsapp == nil {
		log.Println("jobs: WhatsAppSender não configurado, régua de cobrança não pode enviar mensagens")
		return
	}
	if err := s.regua.ProcessarReguaCobranca(ctx, s.whatsapp); err != nil {
		log.Printf("jobs: erro na régua de cobrança: %v", err)
	}
}
