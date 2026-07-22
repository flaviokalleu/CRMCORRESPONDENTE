package jobs

import "time"

// nowFunc é indireção para facilitar testes (pode ser substituída em testes
// unitários); em produção é sempre time.Now.
var nowFunc = time.Now

// saoPauloLocation é carregado uma vez e reusado por todos os jobs — governa
// tanto os schedules do cron quanto as regras de "horário comercial" (ver
// docs/migration/05-whatsapp-realtime-jobs.md gotcha #14).
func saoPauloLocation() *time.Location {
	loc, err := time.LoadLocation("America/Sao_Paulo")
	if err != nil {
		// Fallback conservador: UTC-3 fixo (sem horário de verão, que o Brasil
		// não usa desde 2019) — evita que o boot falhe por tzdata ausente.
		return time.FixedZone("America/Sao_Paulo", -3*60*60)
	}
	return loc
}

// IsHorarioComercial replica isHorarioComercial() do Node:
//   - seg-sex: 9 <= h < 18
//   - sábado:  9 <= h < 13
//   - domingo: nunca
func IsHorarioComercial(now time.Time) bool {
	local := now.In(saoPauloLocation())
	weekday := local.Weekday() // 0=domingo ... 6=sábado
	hour := local.Hour()

	switch weekday {
	case time.Sunday:
		return false
	case time.Saturday:
		return hour >= 9 && hour < 13
	default: // segunda a sexta
		return hour >= 9 && hour < 18
	}
}
