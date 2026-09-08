package clientes

import (
	"errors"
	"testing"

	"crmimob/internal/models"
)

func f(v float64) *float64 { return &v }

func TestCalcularPercentual(t *testing.T) {
	casos := []struct {
		nome    string
		renda   float64
		parcela float64
		quer    float64
	}{
		{"trinta por cento", 2000, 600, 30},
		{"vinte e cinco por cento", 2000, 500, 25},
		{"arredonda para uma casa", 3000, 823, 27.4},
		{"parcela zero", 2000, 0, 0},
	}
	for _, c := range casos {
		t.Run(c.nome, func(t *testing.T) {
			got, err := CalcularPercentual(c.renda, c.parcela)
			if err != nil {
				t.Fatalf("erro inesperado: %v", err)
			}
			if got != c.quer {
				t.Fatalf("CalcularPercentual(%v, %v) = %v; quer %v", c.renda, c.parcela, got, c.quer)
			}
		})
	}
}

func TestCalcularPercentualInvalido(t *testing.T) {
	if _, err := CalcularPercentual(0, 600); !errors.Is(err, ErrDadosInvalidos) {
		t.Fatalf("renda zero deveria ser ErrDadosInvalidos, veio %v", err)
	}
	if _, err := CalcularPercentual(2000, -1); !errors.Is(err, ErrDadosInvalidos) {
		t.Fatalf("parcela negativa deveria ser ErrDadosInvalidos, veio %v", err)
	}
}

func TestParcelaConsiderada(t *testing.T) {
	aprovada := AvaliacaoInput{Resultado: models.ResultadoAprovada, Prestacao: f(575), ValorPrestacaoPossivel: f(525)}
	if p := ParcelaConsiderada(aprovada); p == nil || *p != 575 {
		t.Fatalf("aprovada deveria usar Prestacao (575), veio %v", p)
	}
	condicionada := AvaliacaoInput{Resultado: models.ResultadoCondicionada, Prestacao: f(575), ValorPrestacaoPossivel: f(525)}
	if p := ParcelaConsiderada(condicionada); p == nil || *p != 525 {
		t.Fatalf("condicionada deveria usar ValorPrestacaoPossivel (525), veio %v", p)
	}
	reprovada := AvaliacaoInput{Resultado: models.ResultadoReprovada, Prestacao: f(575)}
	if p := ParcelaConsiderada(reprovada); p != nil {
		t.Fatalf("reprovada não tem parcela, veio %v", *p)
	}
}

func TestPercentualDaAvaliacao(t *testing.T) {
	in := AvaliacaoInput{Resultado: models.ResultadoCondicionada, ValorPrestacaoPossivel: f(525), RendaUtilizada: f(2100)}
	pct, err := PercentualDaAvaliacao(in)
	if err != nil {
		t.Fatalf("erro inesperado: %v", err)
	}
	if pct == nil || *pct != 25 {
		t.Fatalf("quer 25, veio %v", pct)
	}

	// Renda em branco significa "ainda não sei" — não é erro, é percentual nulo.
	semRenda := AvaliacaoInput{Resultado: models.ResultadoAprovada, Prestacao: f(575)}
	pct, err = PercentualDaAvaliacao(semRenda)
	if err != nil || pct != nil {
		t.Fatalf("sem renda quer (nil, nil), veio (%v, %v)", pct, err)
	}

	// Reprovada não tem parcela, logo não tem percentual.
	reprovada := AvaliacaoInput{Resultado: models.ResultadoReprovada, RendaUtilizada: f(2000)}
	pct, err = PercentualDaAvaliacao(reprovada)
	if err != nil || pct != nil {
		t.Fatalf("reprovada quer (nil, nil), veio (%v, %v)", pct, err)
	}

	// Renda zero informada explicitamente é entrada inválida.
	rendaZero := AvaliacaoInput{Resultado: models.ResultadoAprovada, Prestacao: f(575), RendaUtilizada: f(0)}
	if _, err := PercentualDaAvaliacao(rendaZero); !errors.Is(err, ErrDadosInvalidos) {
		t.Fatalf("renda zero deveria ser ErrDadosInvalidos, veio %v", err)
	}
}

func TestAvaliacaoInputValidar(t *testing.T) {
	ok := AvaliacaoInput{Resultado: models.ResultadoAprovada, CodigoProposta: "96668163", CodigoAvaliacao: "10086579010"}
	if err := ok.Validar(); err != nil {
		t.Fatalf("entrada válida recusada: %v", err)
	}
	semProposta := AvaliacaoInput{Resultado: models.ResultadoAprovada, CodigoAvaliacao: "10086579010"}
	if err := semProposta.Validar(); !errors.Is(err, ErrDadosInvalidos) {
		t.Fatalf("sem codigo_proposta deveria ser ErrDadosInvalidos, veio %v", err)
	}
	semAvaliacao := AvaliacaoInput{Resultado: models.ResultadoAprovada, CodigoProposta: "96668163"}
	if err := semAvaliacao.Validar(); !errors.Is(err, ErrDadosInvalidos) {
		t.Fatalf("sem codigo_avaliacao deveria ser ErrDadosInvalidos, veio %v", err)
	}
	resultadoInvalido := AvaliacaoInput{Resultado: "seila", CodigoProposta: "1", CodigoAvaliacao: "2"}
	if err := resultadoInvalido.Validar(); !errors.Is(err, ErrDadosInvalidos) {
		t.Fatalf("resultado fora do enum deveria ser ErrDadosInvalidos, veio %v", err)
	}
}
