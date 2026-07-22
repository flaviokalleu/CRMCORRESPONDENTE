package jobs

import (
	"context"
	"log"
)

// runLembretesEVencimentos replica o schedule `*/5 * * * *`:
// verificarLembretesParaNotificacao() + verificarVencimentosParaNotificacao(),
// só executando em horário comercial (seg-sex 9-18h, sáb 9-13h).
func (s *Scheduler) runLembretesEVencimentos(ctx context.Context) {
	if !IsHorarioComercial(nowFunc()) {
		return
	}
	if s.lembretes == nil {
		log.Println("jobs: LembreteVencimentoService não configurado, pulando lembretes/vencimentos")
		return
	}
	if err := s.lembretes.VerificarLembretes(ctx); err != nil {
		log.Printf("jobs: erro ao verificar lembretes: %v", err)
	}
	if err := s.lembretes.VerificarVencimentos(ctx); err != nil {
		log.Printf("jobs: erro ao verificar vencimentos: %v", err)
	}
}
