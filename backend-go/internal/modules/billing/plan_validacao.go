package billing

import (
	"net/http"
	"strings"
	"unicode/utf8"

	"github.com/gin-gonic/gin"
)

// validar confere o plano antes de gravar. Antes não havia conferência:
// nome só com emoji chegava sem slug e a tela mostrava o erro do validador em
// inglês; nome repetido ou com mais de 255 letras virava 500; preços e
// limites negativos eram gravados.
func (r *PlanRequest) validar() string {
	r.Nome = strings.TrimSpace(r.Nome)
	r.Slug = strings.TrimSpace(r.Slug)
	n := func(v int) bool { return v < 0 }
	switch {
	case r.Nome == "":
		return "Dê um nome ao plano."
	case utf8.RuneCountInString(r.Nome) > 255:
		return "O nome do plano pode ter no máximo 255 letras."
	case r.Slug == "":
		return "O nome precisa ter ao menos uma letra ou número (é usado no endereço do plano)."
	case utf8.RuneCountInString(r.Slug) > 255:
		return "O endereço do plano ficou longo demais. Use um nome mais curto."
	case r.PrecoMensal < 0 || r.PrecoAnual < 0:
		return "Preço não pode ser negativo."
	case r.PrecoMensal > 99999999.99 || r.PrecoAnual > 99999999.99: // numeric(10,2)
		return "Preço alto demais. O máximo é R$ 99.999.999,99."
	case r.TrialDias < 0 || r.TrialDias > 365:
		return "Dias de teste: de 0 a 365."
	case n(r.MaxClientes) || n(r.MaxImoveis) || n(r.MaxAlugueis) || n(r.MaxUsuarios) || n(r.MaxStorageMB) || n(r.MaxFileSizeMB) || n(r.Ordem):
		return "Limites e ordem não podem ser negativos (0 = sem limite)."
	}
	return ""
}

// erroPlano traduz a falha de gravação: nome/endereço repetido é 409.
func erroPlano(c *gin.Context, err error, padrao string) {
	msg := err.Error()
	switch {
	case strings.Contains(msg, "plans_nome_key"):
		c.JSON(http.StatusConflict, gin.H{"error": "Já existe um plano com este nome."})
	case strings.Contains(msg, "plans_slug_key"):
		c.JSON(http.StatusConflict, gin.H{"error": "Já existe um plano com este endereço (slug). Mude o nome."})
	default:
		c.JSON(http.StatusInternalServerError, gin.H{"error": padrao})
	}
}
