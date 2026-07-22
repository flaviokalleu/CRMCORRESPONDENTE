package alugueis

import (
	"context"
	"encoding/json"
	"math"
	"time"

	"gorm.io/datatypes"

	"crmimob/internal/models"
)

// MultaJuros é o resultado de `calcularMultaJuros` (04-spec §Régua).
type MultaJuros struct {
	CobrancaID     uint    `json:"cobranca_id"`
	ValorOriginal  float64 `json:"valor_original"`
	Multa          float64 `json:"multa"`
	Juros          float64 `json:"juros"`
	DiasAtraso     int     `json:"dias_atraso"`
	ValorTotal     float64 `json:"valor_total"`
}

func round2(v float64) float64 { return math.Round(v*100) / 100 }

// CalcularMultaJuros replica a fórmula do Node: multa fixa (%) + juros de mora
// diário (juros mensal convertido /30 * diasAtraso).
func CalcularMultaJuros(valorOriginal, percentualMulta, percentualJurosMora float64, diasAtraso int) MultaJuros {
	if diasAtraso < 0 {
		diasAtraso = 0
	}
	multa := round2(valorOriginal * percentualMulta / 100)
	jurosDiario := percentualJurosMora / 100 / 30
	juros := round2(valorOriginal * jurosDiario * float64(diasAtraso))
	total := round2(valorOriginal + multa + juros)
	return MultaJuros{
		ValorOriginal: valorOriginal,
		Multa:         multa,
		Juros:         juros,
		DiasAtraso:    diasAtraso,
		ValorTotal:    total,
	}
}

// MultaJurosDoInquilino calcula multa/juros para cada CobrancaAluguel OVERDUE
// do inquilino. GET /api/clientealuguel/:id/multa-juros.
func (s *InquilinoService) MultaJurosDoInquilino(ctx context.Context, id uint) ([]MultaJuros, error) {
	c, err := s.repo.FindInquilinoByID(ctx, id)
	if err != nil {
		return nil, ErrNotFound
	}
	cobrancas, err := s.repo.ListCobrancasDoInquilino(ctx, id)
	if err != nil {
		return nil, err
	}
	now := time.Now()
	out := make([]MultaJuros, 0)
	for _, cob := range cobrancas {
		if cob.Status != "OVERDUE" {
			continue
		}
		dias := int(now.Sub(cob.DataVencimento).Hours() / 24)
		mj := CalcularMultaJuros(cob.Valor, c.PercentualMulta, c.PercentualJurosMora, dias)
		mj.CobrancaID = cob.ID
		out = append(out, mj)
	}
	return out, nil
}

// --- Score do inquilino (services/scoreInquilinoService.js) ---

// ScoreDetalhes é o JSON persistido em `score_detalhes`.
type ScoreDetalhes struct {
	Score          int     `json:"score"`
	Classificacao  string  `json:"classificacao"`
	Observacoes    string  `json:"observacoes"`
	Recomendacao   string  `json:"recomendacao"`
	TotalPagamentos int    `json:"total_pagamentos"`
	Pontuais       int     `json:"pontuais"`
	Atrasados      int     `json:"atrasados"`
	TaxaPontualidade float64 `json:"taxa_pontualidade"`
	MediaDiasAtraso  float64 `json:"media_dias_atraso"`
	MesesContrato    int    `json:"meses_contrato"`
	Fonte          string  `json:"fonte"` // "local" (heurística) ou "ia" (Gemini, quando conectado)
}

// ScoreEngine é a interface para o cálculo assistido por IA (Gemini). Fica
// como stub — a implementação real (internal/integrations/ai ou equivalente)
// não faz parte deste módulo; ver wiring doc. Quando nil, usa somente a
// heurística local (`calcularScoreLocal`), que é o fallback do Node.
type ScoreEngine interface {
	CalcularScoreComIA(metrics ScoreMetricas) (*ScoreDetalhes, error)
}

type ScoreMetricas struct {
	TotalPagamentos  int
	Pontuais         int
	Atrasados        int
	TaxaPontualidade float64
	MediaDiasAtraso  float64
	MesesContrato    int
}

func calcularMetricas(historico []HistoricoPagamento, cobrancas []models.CobrancaAluguel, dataInicio *time.Time) ScoreMetricas {
	total := 0
	pontuais := 0
	atrasados := 0
	somaDiasAtraso := 0.0

	for _, cob := range cobrancas {
		if !cob.Confirmada() || cob.DataPagamento == nil {
			continue
		}
		total++
		dias := cob.DataPagamento.Sub(cob.DataVencimento).Hours() / 24
		if dias <= 0 {
			pontuais++
		} else {
			atrasados++
			somaDiasAtraso += dias
		}
	}
	for range historico {
		total++
		pontuais++ // histórico manual não guarda atraso — tratado como pontual
	}

	taxa := 0.0
	if total > 0 {
		taxa = round2(float64(pontuais) / float64(total) * 100)
	}
	mediaAtraso := 0.0
	if atrasados > 0 {
		mediaAtraso = round2(somaDiasAtraso / float64(atrasados))
	}
	meses := 0
	if dataInicio != nil {
		meses = int(time.Since(*dataInicio).Hours() / 24 / 30)
	}

	return ScoreMetricas{
		TotalPagamentos:  total,
		Pontuais:         pontuais,
		Atrasados:        atrasados,
		TaxaPontualidade: taxa,
		MediaDiasAtraso:  mediaAtraso,
		MesesContrato:    meses,
	}
}

// calcularScoreLocal replica a heurística 0-100 do Node: base 50 +
// pontualidade*40% - penalidade de atraso + bônus de tempo/volume de contrato.
func calcularScoreLocal(m ScoreMetricas) ScoreDetalhes {
	score := 50.0
	score += (m.TaxaPontualidade / 100) * 40
	score -= math.Min(m.MediaDiasAtraso, 30)
	if m.MesesContrato >= 12 {
		score += 5
	}
	if m.TotalPagamentos >= 6 {
		score += 5
	}
	if score > 100 {
		score = 100
	}
	if score < 0 {
		score = 0
	}
	arredondado := int(math.Round(score))

	classificacao := "Risco"
	switch {
	case arredondado >= 80:
		classificacao = "Excelente"
	case arredondado >= 60:
		classificacao = "Bom"
	case arredondado >= 40:
		classificacao = "Regular"
	}

	return ScoreDetalhes{
		Score:            arredondado,
		Classificacao:    classificacao,
		Observacoes:      "Cálculo heurístico local (sem IA conectada).",
		Recomendacao:     recomendacaoPara(classificacao),
		TotalPagamentos:  m.TotalPagamentos,
		Pontuais:         m.Pontuais,
		Atrasados:        m.Atrasados,
		TaxaPontualidade: m.TaxaPontualidade,
		MediaDiasAtraso:  m.MediaDiasAtraso,
		MesesContrato:    m.MesesContrato,
		Fonte:            "local",
	}
}

func recomendacaoPara(classificacao string) string {
	switch classificacao {
	case "Excelente":
		return "Inquilino de baixo risco — manter condições atuais."
	case "Bom":
		return "Inquilino confiável — monitorar normalmente."
	case "Regular":
		return "Atenção a atrasos recorrentes — considerar contato preventivo."
	default:
		return "Risco elevado de inadimplência — avaliar medidas administrativas."
	}
}

// CalcularScore recalcula e persiste o score do inquilino (POST /score e cron
// diário). `engine` é opcional — nil usa somente a heurística local.
func (s *InquilinoService) CalcularScore(ctx context.Context, id uint, engine ScoreEngine) (*ScoreDetalhes, error) {
	c, err := s.repo.FindInquilinoByID(ctx, id)
	if err != nil {
		return nil, ErrNotFound
	}
	cobrancas, err := s.repo.ListCobrancasDoInquilino(ctx, id)
	if err != nil {
		return nil, err
	}
	var historico []HistoricoPagamento
	if len(c.HistoricoPagamentos) > 0 {
		_ = json.Unmarshal(c.HistoricoPagamentos, &historico)
	}

	metrics := calcularMetricas(historico, cobrancas, c.DataInicioContrato)

	var detalhes ScoreDetalhes
	if engine != nil {
		if d, err := engine.CalcularScoreComIA(metrics); err == nil && d != nil {
			detalhes = *d
			detalhes.Fonte = "ia"
		} else {
			detalhes = calcularScoreLocal(metrics)
		}
	} else {
		detalhes = calcularScoreLocal(metrics)
	}

	raw, err := json.Marshal(detalhes)
	if err != nil {
		return nil, err
	}
	score := detalhes.Score
	now := time.Now()
	c.ScoreInquilino = &score
	c.ScoreDetalhes = datatypes.JSON(raw)
	c.ScoreAtualizadoEm = &now
	if err := s.repo.SaveInquilino(ctx, c); err != nil {
		return nil, err
	}
	return &detalhes, nil
}
