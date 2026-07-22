package dashboards

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"crmimob/internal/auth"
)

// Handler expõe os 7 endpoints de dashboard. Correção deliberada (gotcha §4):
// o Node aplicava auth duas vezes (mount + authMiddleware interno) — aqui um
// único middleware (auth.Required + middleware.ResolveTenant) é aplicado no
// Register/wiring (ver routes.go / wiring doc).
type Handler struct {
	svc *Service
}

func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

func (h *Handler) Main(c *gin.Context) {
	user, ok := auth.UserFrom(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "Não autenticado"})
		return
	}
	resp, err := h.svc.MainDashboard(c.Request.Context(), user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Erro ao montar dashboard", "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, resp)
}

func (h *Handler) Monthly(c *gin.Context) {
	user, ok := auth.UserFrom(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "Não autenticado"})
		return
	}
	resp, err := h.svc.Monthly(c.Request.Context(), user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Erro ao montar dados mensais", "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, resp)
}

func (h *Handler) Weekly(c *gin.Context) {
	user, ok := auth.UserFrom(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "Não autenticado"})
		return
	}
	resp, err := h.svc.Weekly(c.Request.Context(), user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Erro ao montar dados semanais", "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, resp)
}

func (h *Handler) SystemStats(c *gin.Context) {
	resp, err := h.svc.SystemStats(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Erro ao montar estatísticas", "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, resp)
}

func (h *Handler) ActivityMetrics(c *gin.Context) {
	resp, err := h.svc.ActivityMetrics(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Erro ao montar métricas de atividade", "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, resp)
}

func (h *Handler) Notifications(c *gin.Context) {
	user, ok := auth.UserFrom(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "Não autenticado"})
		return
	}
	resp, err := h.svc.Notifications(c.Request.Context(), user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Erro ao montar notificações", "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, resp)
}

func (h *Handler) AguardandoAprovacao(c *gin.Context) {
	user, ok := auth.UserFrom(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "Não autenticado"})
		return
	}
	resp, err := h.svc.AguardandoAprovacao(c.Request.Context(), user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Erro ao buscar clientes aguardando aprovação", "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, resp)
}
