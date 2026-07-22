package jobs

import (
	"context"
	"log"
)

// runScoreInquilinos replica o schedule `0 6 * * *`: calcularScoreTodosInquilinos().
func (s *Scheduler) runScoreInquilinos(ctx context.Context) {
	if s.score == nil {
		log.Println("jobs: ScoreService não configurado, pulando cálculo de score")
		return
	}
	if err := s.score.CalcularScoreTodosInquilinos(ctx); err != nil {
		log.Printf("jobs: erro ao calcular score dos inquilinos: %v", err)
	}
}

// runVerificarReajuste replica o schedule `0 7 * * *`: verificarContratosReajuste()
// — alerta 30 dias antes do reajuste, envia WhatsApp.
func (s *Scheduler) runVerificarReajuste(ctx context.Context) {
	if s.reajuste == nil {
		log.Println("jobs: ReajusteService não configurado, pulando verificação de reajuste")
		return
	}
	if s.whatsapp == nil {
		log.Println("jobs: WhatsAppSender não configurado, alertas de reajuste não podem ser enviados")
		return
	}
	if err := s.reajuste.VerificarContratosReajuste(ctx, s.whatsapp); err != nil {
		log.Printf("jobs: erro ao verificar contratos de reajuste: %v", err)
	}
}
