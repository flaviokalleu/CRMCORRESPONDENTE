package pagamentos

import (
	"errors"
	"net/http"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/gin-gonic/gin"

	"crmimob/internal/integrations/asaas"
)

// ErrSemAsaas: a imobiliária não tem chave do Asaas (nem há chave global).
// Antes a chamada ia mesmo assim, o Asaas respondia 401 e a API devolvia 500
// com "asaas: criar cliente: asaas: status 401".
var ErrSemAsaas = errors.New("A cobrança online ainda não está ligada: o administrador precisa cadastrar a chave do Asaas da imobiliária nas configurações da empresa.")

// ErrDadosCobranca: dado do formulário que não passa na conferência.
type ErrDadosCobranca struct{ Mensagem string }

func (e *ErrDadosCobranca) Error() string { return e.Mensagem }

// valorMaximoCobranca acompanha a coluna valor_numerico numeric(10,2).
const valorMaximoCobranca = 99999999.99

var fusoBR = func() *time.Location {
	if l, err := time.LoadLocation("America/Sao_Paulo"); err == nil {
		return l
	}
	return time.FixedZone("BRT", -3*3600)
}()

// validarCobranca confere título, valor e (quando houver) a data de vencimento.
func validarCobranca(titulo string, valor float64, vencimento *string) error {
	t := strings.TrimSpace(titulo)
	switch {
	case t == "":
		return &ErrDadosCobranca{"Diga o que está sendo cobrado."}
	case utf8.RuneCountInString(t) > 255:
		return &ErrDadosCobranca{"O título da cobrança pode ter no máximo 255 letras."}
	case !(valor > 0):
		return &ErrDadosCobranca{"Informe um valor maior que zero."}
	case valor > valorMaximoCobranca:
		return &ErrDadosCobranca{"Valor alto demais para uma cobrança. O máximo é R$ 99.999.999,99."}
	}
	if vencimento != nil {
		d, err := time.ParseInLocation("2006-01-02", *vencimento, fusoBR)
		if err != nil {
			return &ErrDadosCobranca{"Data de vencimento inválida."}
		}
		hoje := time.Now().In(fusoBR).Format("2006-01-02")
		if d.Format("2006-01-02") < hoje {
			return &ErrDadosCobranca{"A data de vencimento não pode ser no passado."}
		}
		if d.Year() > time.Now().Year()+10 {
			return &ErrDadosCobranca{"Data de vencimento muito distante. Confira o ano."}
		}
	}
	return nil
}

// respostaErroCobranca traduz os erros da criação para status e texto claros.
func respostaErroCobranca(c *gin.Context, err error) {
	var dados *ErrDadosCobranca
	var ea *asaas.ErrAsaas
	switch {
	case errors.Is(err, ErrClienteNotFound):
		c.JSON(http.StatusNotFound, gin.H{"error": "Cliente não encontrado. Escolha o cliente de novo."})
	case errors.As(err, &dados):
		c.JSON(http.StatusBadRequest, gin.H{"error": dados.Mensagem})
	case errors.Is(err, ErrSemAsaas):
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": ErrSemAsaas.Error(), "codigo": "asaas_nao_configurado"})
	case errors.As(err, &ea) && (ea.StatusCode == 401 || ea.StatusCode == 403):
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": "O Asaas recusou a chave da imobiliária. Peça ao administrador para conferir a chave do Asaas nas configurações da empresa.", "codigo": "asaas_chave_recusada"})
	case errors.As(err, &ea) && ea.StatusCode >= 400 && ea.StatusCode < 500:
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": "O Asaas não aceitou a cobrança. Confira o CPF, o e-mail e o telefone do cliente e tente de novo.", "codigo": "asaas_recusou"})
	case errors.As(err, &ea):
		c.JSON(http.StatusBadGateway, gin.H{"error": "O Asaas está fora do ar agora. Tente de novo em alguns minutos."})
	case strings.HasPrefix(err.Error(), "asaas:"):
		c.JSON(http.StatusBadGateway, gin.H{"error": "Não foi possível falar com o Asaas agora. Tente de novo em alguns minutos."})
	default:
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Não foi possível criar a cobrança. Tente de novo."})
	}
}
