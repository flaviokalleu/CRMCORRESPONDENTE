package relatorios

// Faixas de renda do Minha Casa Minha Vida (MCMV), replicadas do reportRoutes.js
// original (spec §"Relatórios / exportação"). Valores em reais.
const (
	mcmvFaixa1Max = 2640.00
	mcmvFaixa2Max = 4400.00
	mcmvFaixa3Max = 8000.00
)

// FaixaMCMV classifica uma renda mensal na faixa MCMV correspondente, ou
// "fora_do_programa" se acima do teto (renda > 8.000) ou "invalido" se <= 0.
func FaixaMCMV(renda float64) string {
	switch {
	case renda <= 0:
		return "invalido"
	case renda <= mcmvFaixa1Max:
		return "faixa_1"
	case renda <= mcmvFaixa2Max:
		return "faixa_2"
	case renda <= mcmvFaixa3Max:
		return "faixa_3"
	default:
		return "fora_do_programa"
	}
}

// ElegivelMCMV replica a regra do Node: elegível se `renda <= 8.000 && > 0`.
func ElegivelMCMV(renda float64) bool {
	return renda > 0 && renda <= mcmvFaixa3Max
}

// MCMVAnalysis é o bloco `mcmv` da análise de relatório.
type MCMVAnalysis struct {
	TotalElegiveis int            `json:"totalElegiveis"`
	PorFaixa       map[string]int `json:"porFaixa"`
}
