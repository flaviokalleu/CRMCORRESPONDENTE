package clientes

import (
	"math"
	"strings"
	"time"

	"crmimob/internal/models"
)

// AvaliacaoInput é o corpo de POST/PUT das rotas de avaliação. Todo campo que a
// tela do SIOPI pode não trazer é ponteiro: o corretor às vezes registra a
// avaliação antes de ter a tela inteira à mão.
type AvaliacaoInput struct {
	Resultado       string `json:"resultado"`
	CodigoProposta  string `json:"codigo_proposta"`
	CodigoAvaliacao string `json:"codigo_avaliacao"`

	CodigoCorrespondente *string    `json:"codigo_correspondente"`
	RespostaSiric        *time.Time `json:"resposta_siric"`

	MotivoReprovacao *string `json:"motivo_reprovacao"`

	CondicaoAprovacao      *string  `json:"condicao_aprovacao"`
	ValorPrestacaoPossivel *float64 `json:"valor_prestacao_possivel"`

	ProtocoloCadastro     *string    `json:"protocolo_cadastro"`
	AgenciaRelacionamento *string    `json:"agencia_relacionamento"`
	ValidadeInicio        *time.Time `json:"validade_inicio"`
	ValidadeFim           *time.Time `json:"validade_fim"`
	OrigemRecurso         *string    `json:"origem_recurso"`
	Modalidade            *string    `json:"modalidade"`
	Produto               *string    `json:"produto"`
	ValorImovel           *float64   `json:"valor_imovel"`
	ValorFinanciamento    *float64   `json:"valor_financiamento"`
	Prestacao             *float64   `json:"prestacao"`
	Indexador             *string    `json:"indexador"`
	SistemaAmortizacao    *string    `json:"sistema_amortizacao"`
	PrazoMeses            *int       `json:"prazo_meses"`
	SistemaOriginador     *string    `json:"sistema_originador"`

	RendaUtilizada *float64 `json:"renda_utilizada"`
}

// Validar recusa o que não identifica a avaliação. Só os dois códigos são
// exigidos: são o que permite achar a proposta no SIOPI depois.
func (in AvaliacaoInput) Validar() error {
	switch in.Resultado {
	case models.ResultadoAprovada, models.ResultadoCondicionada, models.ResultadoReprovada:
	default:
		return ErrDadosInvalidos
	}
	if strings.TrimSpace(in.CodigoProposta) == "" || strings.TrimSpace(in.CodigoAvaliacao) == "" {
		return ErrDadosInvalidos
	}
	if in.RendaUtilizada != nil && *in.RendaUtilizada < 0 {
		return ErrDadosInvalidos
	}
	return nil
}

// ParcelaConsiderada devolve a parcela que entra no cálculo do comprometimento.
// A tela aprovada traz "Prestação"; a condicionada traz "Valor da prestação
// Possível"; a reprovada não traz parcela nenhuma.
func ParcelaConsiderada(in AvaliacaoInput) *float64 {
	switch in.Resultado {
	case models.ResultadoAprovada:
		return in.Prestacao
	case models.ResultadoCondicionada:
		return in.ValorPrestacaoPossivel
	}
	return nil
}

// CalcularPercentual devolve o comprometimento da renda pela parcela,
// arredondado a uma casa decimal: renda de 2000 com parcela de 600 dá 30.
//
// Esta é a única fonte do percentual no sistema. O frontend recalcula o mesmo
// número enquanto o corretor digita, mas só para retorno visual imediato.
func CalcularPercentual(renda, parcela float64) (float64, error) {
	if renda <= 0 || parcela < 0 {
		return 0, ErrDadosInvalidos
	}
	return math.Round(parcela/renda*1000) / 10, nil
}

// PercentualDaAvaliacao aplica o cálculo à avaliação inteira. Devolve (nil, nil)
// quando não há o que calcular — sem renda informada ou sem parcela no formato.
// Renda informada como zero ou negativa é outra coisa: é entrada inválida.
func PercentualDaAvaliacao(in AvaliacaoInput) (*float64, error) {
	parcela := ParcelaConsiderada(in)
	if in.RendaUtilizada == nil || parcela == nil {
		return nil, nil
	}
	pct, err := CalcularPercentual(*in.RendaUtilizada, *parcela)
	if err != nil {
		return nil, err
	}
	return &pct, nil
}
