package assinatura

import (
	"testing"
	"time"

	"crmimob/internal/models"
)

func ptr[T any](v T) *T { return &v }

func TestCalcularAcesso(t *testing.T) {
	agora := time.Date(2026, 11, 16, 12, 0, 0, 0, time.UTC)
	ativo := &models.Tenant{Ativo: true}

	casos := []struct {
		nome     string
		tenant   *models.Tenant
		sub      *models.Subscription
		liberado bool
		situacao string
		dias     int
	}{
		{"teste em andamento", ativo, &models.Subscription{Status: "trialing", DataFimTrial: ptr(agora.AddDate(0, 0, 3))}, true, SituacaoTeste, 3},
		{"teste acabou bloqueia sem tolerância", ativo, &models.Subscription{Status: "trialing", ToleranciaDias: 3, DataFimTrial: ptr(agora.Add(-time.Hour))}, false, SituacaoTesteAcabou, 0},
		{"em dia", ativo, &models.Subscription{Status: "active", ToleranciaDias: 3, DataFim: ptr(agora.AddDate(0, 0, 10))}, true, SituacaoEmDia, 13},
		{"atrasada dentro da tolerância", ativo, &models.Subscription{Status: "active", ToleranciaDias: 3, DataFim: ptr(agora.AddDate(0, 0, -2))}, true, SituacaoAtrasada, 1},
		{"passou da tolerância", ativo, &models.Subscription{Status: "active", ToleranciaDias: 3, DataFim: ptr(agora.AddDate(0, 0, -4))}, false, SituacaoBloqueada, 0},
		{"pagou durante o teste vale data_fim", ativo, &models.Subscription{Status: "active", ToleranciaDias: 3, DataFimTrial: ptr(agora.AddDate(0, 0, -20)), DataFim: ptr(agora.AddDate(0, 0, 9))}, true, SituacaoEmDia, 12},
		{"sem vencimento (cortesia)", ativo, &models.Subscription{Status: "active"}, true, SituacaoEmDia, 0},
		{"bloqueio manual vence tudo", &models.Tenant{Ativo: true, Bloqueado: true}, &models.Subscription{Status: "active"}, false, SituacaoBloqueioManual, 0},
		{"cancelada", ativo, &models.Subscription{Status: "canceled", DataFim: ptr(agora.AddDate(0, 0, 5))}, false, SituacaoCancelada, 0},
		{"sem assinatura", ativo, nil, false, SituacaoSemAssinatura, 0},
	}
	for _, c := range casos {
		a := CalcularAcesso(c.tenant, c.sub, agora)
		if a.Liberado != c.liberado || a.Situacao != c.situacao || a.DiasRestantes != c.dias {
			t.Errorf("%s: obteve liberado=%v situacao=%s dias=%d; esperado %v %s %d", c.nome, a.Liberado, a.Situacao, a.DiasRestantes, c.liberado, c.situacao, c.dias)
		}
	}
}

func TestProximoPagoAte(t *testing.T) {
	agora := time.Date(2026, 11, 16, 0, 0, 0, 0, time.UTC)
	futuro := agora.AddDate(0, 0, 5)
	if got := ProximoPagoAte(&futuro, "mensal", agora); !got.Equal(futuro.AddDate(0, 1, 0)) {
		t.Errorf("pagar adiantado deve somar a partir do vencimento: %v", got)
	}
	passado := agora.AddDate(0, 0, -10)
	if got := ProximoPagoAte(&passado, "mensal", agora); !got.Equal(agora.AddDate(0, 1, 0)) {
		t.Errorf("vencido deve somar a partir de agora: %v", got)
	}
	if got := ProximoPagoAte(nil, "anual", agora); !got.Equal(agora.AddDate(1, 0, 0)) {
		t.Errorf("anual: %v", got)
	}
}

func TestValorDaMensalidade(t *testing.T) {
	p := &models.Plan{PrecoMensal: 97, PrecoAnual: 970}
	if v := ValorDaMensalidade(&models.Subscription{}, p, "mensal"); v != 97 {
		t.Errorf("tabela mensal: %v", v)
	}
	if v := ValorDaMensalidade(&models.Subscription{}, p, "anual"); v != 970 {
		t.Errorf("tabela anual: %v", v)
	}
	if v := ValorDaMensalidade(&models.Subscription{PrecoCombinado: ptr(0.0)}, p, "mensal"); v != 0 {
		t.Errorf("cortesia: %v", v)
	}
}
