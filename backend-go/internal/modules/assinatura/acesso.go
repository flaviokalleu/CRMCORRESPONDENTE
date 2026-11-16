// Package assinatura implementa a assinatura SaaS: a plataforma cobra a
// imobiliária (tenant). Regras no modelo do Webba: o acesso é CALCULADO pelas
// datas a cada pedido (nenhum job precisa "virar" status para bloquear), a
// fatura nasce por agendador com chave anti-duplicidade e o webhook do Asaas da
// plataforma dá baixa uma única vez e estende o "pago até".
// Ver docs/ROADMAP-SAAS.md.
package assinatura

import (
	"time"

	"crmimob/internal/models"
)

// Situações mostradas à imobiliária (texto de tela fica no frontend).
const (
	SituacaoTeste          = "teste"           // dentro do teste grátis
	SituacaoEmDia          = "em_dia"          // pago até uma data futura
	SituacaoAtrasada       = "atrasada"        // venceu, ainda na tolerância (liberada)
	SituacaoTesteAcabou    = "teste_acabou"    // teste terminou sem pagamento (bloqueada)
	SituacaoBloqueada      = "bloqueada"       // venceu e passou da tolerância
	SituacaoBloqueioManual = "bloqueio_manual" // bloqueada pelo dono da plataforma
	SituacaoCancelada      = "cancelada"
	SituacaoSemAssinatura  = "sem_assinatura"
)

// Acesso é o resultado da regra única de liberação.
type Acesso struct {
	Liberado      bool       `json:"liberado"`
	Situacao      string     `json:"situacao"`
	PagoAte       *time.Time `json:"pago_ate,omitempty"`        // fim do teste ou do período pago
	BloqueiaEm    *time.Time `json:"bloqueia_em,omitempty"`     // quando o acesso será cortado se nada for pago
	DiasRestantes int        `json:"dias_restantes"`            // dias até BloqueiaEm (0 se já bloqueada)
}

// FimDoPeriodo devolve o "pago até": data_fim, ou o fim do teste quando ainda
// não houve pagamento. nil = sem vencimento (cortesia permanente / legado).
func FimDoPeriodo(s *models.Subscription) *time.Time {
	if s.DataFim != nil {
		return s.DataFim
	}
	if s.Status == "trialing" {
		return s.DataFimTrial
	}
	return nil
}

// CalcularAcesso é a regra única: usada pelo bloqueio das rotas, pela tela da
// imobiliária e pelo painel master. Função pura (testada em acesso_test.go).
func CalcularAcesso(t *models.Tenant, s *models.Subscription, agora time.Time) Acesso {
	if t != nil && t.Bloqueado {
		return Acesso{Situacao: SituacaoBloqueioManual}
	}
	if t != nil && !t.Ativo {
		return Acesso{Situacao: SituacaoBloqueioManual}
	}
	if s == nil {
		return Acesso{Situacao: SituacaoSemAssinatura}
	}
	if s.Status == "canceled" || s.Status == "suspended" {
		return Acesso{Situacao: SituacaoCancelada}
	}

	fim := FimDoPeriodo(s)
	if fim == nil {
		return Acesso{Liberado: true, Situacao: SituacaoEmDia}
	}

	// Teste não tem tolerância: acabou o teste sem pagar, bloqueia.
	if s.Status == "trialing" && s.DataFim == nil {
		if agora.Before(*fim) {
			return Acesso{Liberado: true, Situacao: SituacaoTeste, PagoAte: fim, BloqueiaEm: fim, DiasRestantes: diasAte(agora, *fim)}
		}
		return Acesso{Situacao: SituacaoTesteAcabou, PagoAte: fim}
	}

	limite := fim.AddDate(0, 0, max(s.ToleranciaDias, 0))
	switch {
	case agora.Before(*fim):
		return Acesso{Liberado: true, Situacao: SituacaoEmDia, PagoAte: fim, BloqueiaEm: &limite, DiasRestantes: diasAte(agora, limite)}
	case agora.Before(limite):
		return Acesso{Liberado: true, Situacao: SituacaoAtrasada, PagoAte: fim, BloqueiaEm: &limite, DiasRestantes: diasAte(agora, limite)}
	default:
		return Acesso{Situacao: SituacaoBloqueada, PagoAte: fim}
	}
}

// diasAte arredonda para cima: faltando 1 hora, ainda é "1 dia".
func diasAte(agora, fim time.Time) int {
	d := fim.Sub(agora)
	if d <= 0 {
		return 0
	}
	return int((d + 24*time.Hour - 1) / (24 * time.Hour))
}

// ProximoPagoAte calcula o novo "pago até" depois de um pagamento. Conta a
// partir do vencimento atual quando ele ainda está no futuro (pagar adiantado
// não perde dias) e a partir de agora quando já venceu.
func ProximoPagoAte(fimAtual *time.Time, ciclo string, agora time.Time) time.Time {
	base := agora
	if fimAtual != nil && fimAtual.After(agora) {
		base = *fimAtual
	}
	if ciclo == "anual" {
		return base.AddDate(1, 0, 0)
	}
	return base.AddDate(0, 1, 0)
}

// ValorDaMensalidade: preço combinado (0 = cortesia) ou o de tabela do plano.
func ValorDaMensalidade(s *models.Subscription, p *models.Plan, ciclo string) float64 {
	if s != nil && s.PrecoCombinado != nil {
		return *s.PrecoCombinado
	}
	if ciclo == "anual" && p.PrecoAnual > 0 {
		return p.PrecoAnual
	}
	return p.PrecoMensal
}
