package reguacobranca

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

type Handler struct{ svc *Service }

func NewHandler(svc *Service) *Handler { return &Handler{svc: svc} }

// Register expõe um disparo manual da régua (fora do escopo do Node, que só
// rodava via cron `0 * * * *` — ver internal/jobs, fora deste módulo). Útil
// para operação/depuração; o disparo automático real deve ser conectado por
// um scheduler (robfig/cron) no wiring do servidor.
func (h *Handler) Register(r *gin.RouterGroup) {
	r.POST("/regua-cobranca/processar", h.Processar)
}

func (h *Handler) Processar(c *gin.Context) {
	if !IsHorarioComercial(time.Now()) {
		c.JSON(http.StatusOK, gin.H{"message": "Fora do horário comercial — nenhuma ação executada", "processados": 0, "enviados": 0})
		return
	}
	processados, enviados, err := h.svc.ProcessarTodos(c.Request.Context(), time.Now())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Régua de cobrança processada", "processados": processados, "enviados": enviados})
}
