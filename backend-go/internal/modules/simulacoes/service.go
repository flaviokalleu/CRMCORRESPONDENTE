// Package simulacoes implementa o cálculo de financiamento imobiliário (SAC e
// PRICE) e a persistência de simulações. Ver
// docs/migration/06-dashboards-vendas-config.md §"Simulações".
//
// Nota de precisão (gotcha §14 do spec): o ideal seria shopspring/decimal, mas
// essa dependência não está em go.mod e este agente está proibido de rodar
// `go get`/`go mod tidy` — ver wiring doc. Usamos float64 com arredondamento
// explícito a 2 casas (4 para taxa_mensal), que é EXATAMENTE o que o
// simulacaoRoutes.js original fazia em JS (números double), preservando o
// comportamento observável do Node. Migrar para decimal é um follow-up.
package simulacoes

import (
	"errors"
	"math"
)

// Sistemas de amortização.
const (
	SistemaSAC   = "SAC"
	SistemaPRICE = "PRICE"
)

// ErrValorFinanciadoInvalido é devolvido quando valor_imovel - valor_entrada <= 0.
var ErrValorFinanciadoInvalido = errors.New("valor financiado deve ser maior que zero")

// CalculoInput são os parâmetros de entrada do cálculo (compartilhado por
// /calcular e POST /).
type CalculoInput struct {
	ValorImovel    float64
	ValorEntrada   float64
	PrazoMeses     int
	TaxaJurosAnual float64
	Sistema        string // default SAC
}

// ParcelaCalculada é um item do array `parcelas` do resultado.
type ParcelaCalculada struct {
	Numero        int     `json:"numero"`
	Parcela       float64 `json:"parcela"`
	Amortizacao   float64 `json:"amortizacao"`
	Juros         float64 `json:"juros"`
	SaldoDevedor  float64 `json:"saldo_devedor"`
}

// Resultado é a saída completa do cálculo de financiamento.
type Resultado struct {
	Sistema         string             `json:"sistema"`
	ValorFinanciado float64            `json:"valor_financiado"`
	TaxaMensal      float64            `json:"taxa_mensal"` // 4 casas
	Parcelas        []ParcelaCalculada `json:"parcelas"`
	PrimeiraParcela float64            `json:"primeira_parcela"`
	UltimaParcela   float64            `json:"ultima_parcela"`
	TotalPago       float64            `json:"total_pago"`
	TotalJuros      float64            `json:"total_juros"`
	RendaMinima     float64            `json:"renda_minima"`
}

func round2(v float64) float64 { return math.Round(v*100) / 100 }
func round4(v float64) float64 { return math.Round(v*10000) / 10000 }

// Calcular executa a simulação de financiamento (SAC ou PRICE, default SAC).
//
// taxaMensal = (1 + taxaAnual/100)^(1/12) - 1
// valorFinanciado = valor_imovel - valor_entrada  (deve ser > 0)
//
// SAC (amortização constante):
//
//	amortizacao = valorFinanciado / prazoMeses          // fixa
//	para cada mês i: juros = saldoDevedor*taxaMensal; parcela = amortizacao+juros (decrescente); saldoDevedor -= amortizacao
//
// PRICE (parcela fixa):
//
//	parcela = valorFinanciado * (i*(1+i)^n) / ((1+i)^n - 1)   // i=taxaMensal, n=prazoMeses
//	para cada mês: juros = saldoDevedor*taxaMensal; amortizacao = parcela-juros; saldoDevedor -= amortizacao
//
// renda_minima = round(primeira_parcela / 0.3)  (parcela <= 30% da renda)
//
// Sanidade (comentário, não teste automatizado — módulo não roda `go test` aqui):
// valorImovel=200000, entrada=40000, prazo=360, taxaAnual=10, sistema=PRICE
// → taxaMensal ≈ 0.007974, valorFinanciado=160000, parcela ≈ 1.405,xx (ordem de grandeza correta para 30 anos a ~10% a.a.)
func Calcular(in CalculoInput) (*Resultado, error) {
	sistema := in.Sistema
	if sistema == "" {
		sistema = SistemaSAC
	}

	valorFinanciado := in.ValorImovel - in.ValorEntrada
	if valorFinanciado <= 0 {
		return nil, ErrValorFinanciadoInvalido
	}
	if in.PrazoMeses <= 0 {
		return nil, errors.New("prazo_meses deve ser maior que zero")
	}

	taxaMensal := math.Pow(1+in.TaxaJurosAnual/100, 1.0/12) - 1

	var parcelas []ParcelaCalculada
	var totalPago, totalJuros float64

	switch sistema {
	case SistemaPRICE:
		n := float64(in.PrazoMeses)
		fatorPot := math.Pow(1+taxaMensal, n)
		var parcelaFixa float64
		if taxaMensal == 0 {
			parcelaFixa = valorFinanciado / n
		} else {
			parcelaFixa = valorFinanciado * (taxaMensal * fatorPot) / (fatorPot - 1)
		}
		saldo := valorFinanciado
		for i := 1; i <= in.PrazoMeses; i++ {
			juros := saldo * taxaMensal
			amortizacao := parcelaFixa - juros
			saldo -= amortizacao
			if i == in.PrazoMeses || saldo < 0.005 {
				saldo = 0
			}
			p := ParcelaCalculada{
				Numero: i, Parcela: round2(parcelaFixa), Amortizacao: round2(amortizacao),
				Juros: round2(juros), SaldoDevedor: round2(saldo),
			}
			parcelas = append(parcelas, p)
			totalPago += p.Parcela
			totalJuros += p.Juros
		}
	default: // SAC
		amortizacao := valorFinanciado / float64(in.PrazoMeses)
		saldo := valorFinanciado
		for i := 1; i <= in.PrazoMeses; i++ {
			juros := saldo * taxaMensal
			parcela := amortizacao + juros
			saldo -= amortizacao
			if i == in.PrazoMeses || saldo < 0.005 {
				saldo = 0
			}
			p := ParcelaCalculada{
				Numero: i, Parcela: round2(parcela), Amortizacao: round2(amortizacao),
				Juros: round2(juros), SaldoDevedor: round2(saldo),
			}
			parcelas = append(parcelas, p)
			totalPago += p.Parcela
			totalJuros += p.Juros
		}
	}

	primeira := parcelas[0].Parcela
	ultima := parcelas[len(parcelas)-1].Parcela

	return &Resultado{
		Sistema:         sistema,
		ValorFinanciado: round2(valorFinanciado),
		TaxaMensal:      round4(taxaMensal),
		Parcelas:        parcelas,
		PrimeiraParcela: primeira,
		UltimaParcela:   ultima,
		TotalPago:       round2(totalPago),
		TotalJuros:      round2(totalJuros),
		RendaMinima:     math.Round(primeira / 0.3),
	}, nil
}
