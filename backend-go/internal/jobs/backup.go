package jobs

import (
	"context"
	"log"
)

// runBackup replica utils/backup.js `backupDatabase()`: chamado imediatamente
// no start e depois a cada 6h (`0 */6 * * *`). A implementação real de dump
// do Postgres/arquivos fica a cargo de quem implementar BackupRunner (fora
// deste escopo) — este job só orquestra o agendamento.
func (s *Scheduler) runBackup(ctx context.Context) {
	if s.backup == nil {
		log.Println("jobs: BackupRunner não configurado, pulando backup")
		return
	}
	if err := s.backup.Backup(ctx); err != nil {
		log.Printf("jobs: erro no backup: %v", err)
	}
}
