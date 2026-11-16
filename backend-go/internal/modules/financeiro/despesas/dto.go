package despesas

import (
	"strings"
	"time"
	"unicode/utf8"
)

// UpsertRequest — body de POST/PUT /api/despesas[/:id].
type UpsertRequest struct {
	Tipo       string    `json:"tipo" binding:"required"`
	Valor      float64   `json:"valor" binding:"required"`
	Descricao  string    `json:"descricao"`
	Data       time.Time `json:"data" binding:"required"`
	ContratoID *uint     `json:"contratoId"`
	CorretorID *uint     `json:"corretorId"`
}

// valorMaximo acompanha a coluna numeric(12,2): acima disso o Postgres
// recusa com "estouro de campo numeric" e a tela mostrava o erro cru.
const valorMaximo = 9999999999.99

// Validar devolve uma mensagem em português simples, ou "" se estiver tudo
// certo. As colunas tipo/descricao são varchar(255) (contadas em letras).
func (r *UpsertRequest) Validar() string {
	r.Tipo = strings.TrimSpace(r.Tipo)
	r.Descricao = strings.TrimSpace(r.Descricao)
	switch {
	case r.Tipo == "":
		return "Informe a categoria."
	case utf8.RuneCountInString(r.Tipo) > 255:
		return "A categoria pode ter no máximo 255 letras."
	case utf8.RuneCountInString(r.Descricao) > 255:
		return "A descrição pode ter no máximo 255 letras."
	case !(r.Valor > 0):
		return "Informe um valor maior que zero."
	case r.Valor > valorMaximo:
		return "Valor alto demais. O máximo é R$ 9.999.999.999,99."
	case r.Data.IsZero() || r.Data.Year() < 1900 || r.Data.Year() > 2100:
		return "Informe uma data válida."
	}
	return ""
}
