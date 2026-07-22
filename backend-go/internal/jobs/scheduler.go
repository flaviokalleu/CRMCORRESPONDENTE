// Package jobs porta os 8 schedules de routes/cronJobs.js + o job horário de
// jobs/enviarParcelas.js (Node) para robfig/cron/v3, preservando horários,
// timezone e regras de negócio. Ver
// docs/migration/05-whatsapp-realtime-jobs.md §"Jobs / Cron".
package jobs

import (
	"context"
	"log"
	"time"

	"github.com/robfig/cron/v3"
)

// Scheduler agrega o *cron.Cron + todas as dependências de serviço
// (injetadas via interfaces mínimas em interfaces.go). Qualquer dependência
// pode ser nil enquanto o módulo correspondente não existir — cada job faz
// nil-check e loga um aviso em vez de falhar.
type Scheduler struct {
	cron *cron.Cron

	whatsapp WhatsAppSender
	email    EmailSender

	pagamentos    PagamentoService
	lembretes     LembreteVencimentoService
	regua         ReguaCobrancaService
	asaasSync     AsaasSyncService
	score         ScoreService
	reajuste      ReajusteService
	relatorio     RelatorioMensalService
	backup        BackupRunner

	// DefaultPhoneNumber replica DEFAULT_PHONE_NUMBER do Node, usado no
	// relatório mensal quando não há telefone específico do proprietário.
	DefaultPhoneNumber string
}

// Deps agrupa as dependências opcionais do Scheduler (todas podem ser nil).
type Deps struct {
	WhatsApp  WhatsAppSender
	Email     EmailSender
	Pagamentos PagamentoService
	Lembretes  LembreteVencimentoService
	Regua      ReguaCobrancaService
	AsaasSync  AsaasSyncService
	Score      ScoreService
	Reajuste   ReajusteService
	Relatorio  RelatorioMensalService
	Backup     BackupRunner

	DefaultPhoneNumber string
}

// New monta o Scheduler com cron.New(cron.WithLocation(America/Sao_Paulo)) —
// 5 campos, SEM cron.WithSeconds() (gotcha da tabela de-para: manter
// compatibilidade das expressões `*/5 * * * *` etc herdadas do node-cron).
func New(deps Deps) *Scheduler {
	c := cron.New(cron.WithLocation(saoPauloLocation()))
	return &Scheduler{
		cron:                c,
		whatsapp:            deps.WhatsApp,
		email:               deps.Email,
		pagamentos:          deps.Pagamentos,
		lembretes:           deps.Lembretes,
		regua:               deps.Regua,
		asaasSync:           deps.AsaasSync,
		score:               deps.Score,
		reajuste:            deps.Reajuste,
		relatorio:           deps.Relatorio,
		backup:              deps.Backup,
		DefaultPhoneNumber:  deps.DefaultPhoneNumber,
	}
}

// Start registra todos os schedules e dispara as execuções imediatas de boot
// (backup + 1ª rodada de parcelas), depois inicia o cron. Chamar 1x no main.go.
func (s *Scheduler) Start() {
	// Execução imediata no start (equivalente ao topo de routes/cronJobs.js).
	go s.runBackup(context.Background())

	// jobs/enviarParcelas.js: `setTimeout(..., 5000)` -> 1 execução de teste.
	go func() {
		time.Sleep(5 * time.Second)
		s.runEnviarParcelas(context.Background())
	}()

	entries := []struct {
		spec string
		fn   func()
	}{
		{"*/5 * * * *", func() { s.runLembretesEVencimentos(context.Background()) }},
		{"0 * * * *", func() { s.runReguaCobranca(context.Background()) }},
		{"*/30 * * * *", func() { s.runAsaasSync(context.Background()) }},
		{"0 */6 * * *", func() { s.runBackup(context.Background()) }},
		{"0 6 * * *", func() { s.runScoreInquilinos(context.Background()) }},
		{"0 7 * * *", func() { s.runVerificarReajuste(context.Background()) }},
		{"0 9 1 * *", func() { s.runRelatorioMensal(context.Background()) }},
		// Job horário de parcelas (jobs/enviarParcelas.js): `0 * * * *`.
		{"0 * * * *", func() { s.runEnviarParcelas(context.Background()) }},
	}

	for _, e := range entries {
		if _, err := s.cron.AddFunc(e.spec, e.fn); err != nil {
			log.Printf("jobs: falha ao registrar schedule %q: %v", e.spec, err)
		}
	}

	s.cron.Start()
}

// Stop encerra o cron de forma graciosa (aguarda jobs em execução).
func (s *Scheduler) Stop() context.Context {
	return s.cron.Stop()
}
