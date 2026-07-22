package jobs

import (
	"context"
	"log"
)

// runAsaasSync replica o schedule `*/30 * * * *`: sincronizarCobrancasAsaas()
// (sincroniza CobrancaAluguel com Asaas). NÃO é restrito a horário comercial
// no Node — roda sempre.
func (s *Scheduler) runAsaasSync(ctx context.Context) {
	if s.asaasSync == nil {
		log.Println("jobs: AsaasSyncService não configurado, pulando sincronização Asaas")
		return
	}
	if err := s.asaasSync.SincronizarCobrancas(ctx); err != nil {
		log.Printf("jobs: erro ao sincronizar cobranças Asaas: %v", err)
	}
}
