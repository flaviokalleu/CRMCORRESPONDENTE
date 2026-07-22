package jobs

import (
	"context"
	"log"
)

// runRelatorioMensal replica o schedule `0 9 1 * *` (dia 1, 9h):
// enviarRelatorioMensalProprietario() — relatório enviado para
// DEFAULT_PHONE_NUMBER quando não há telefone específico do proprietário.
func (s *Scheduler) runRelatorioMensal(ctx context.Context) {
	if s.relatorio == nil {
		log.Println("jobs: RelatorioMensalService não configurado, pulando relatório mensal")
		return
	}
	if s.whatsapp == nil {
		log.Println("jobs: WhatsAppSender não configurado, relatório mensal não pode ser enviado")
		return
	}
	if err := s.relatorio.EnviarRelatorioMensalProprietario(ctx, s.whatsapp); err != nil {
		log.Printf("jobs: erro ao enviar relatório mensal: %v", err)
	}
}
