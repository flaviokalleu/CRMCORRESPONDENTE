package dashboards

import (
	"fmt"
	"net/http"
	"strconv"
	"time"

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
	responsavelID, err := dashboardResponsavel(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}
	resp, err := h.svc.MainDashboardFiltered(c.Request.Context(), user, responsavelID)
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
	responsavelID, err := dashboardResponsavel(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}
	resp, err := h.svc.NotificationsFiltered(c.Request.Context(), user, responsavelID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Erro ao montar notificações", "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, resp)
}

func (h *Handler) Analytics(c *gin.Context) {
	user, ok := auth.UserFrom(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "Não autenticado"})
		return
	}
	responsavelID, err := dashboardResponsavel(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}
	periodo, inicio, fim, err := dashboardPeriodo(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}
	resp, err := h.svc.Analytics(c.Request.Context(), user, AnalyticsQuery{
		Periodo: periodo, Inicio: inicio, Fim: fim, ResponsavelID: responsavelID,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Erro ao montar análise do período", "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, resp)
}

func dashboardResponsavel(c *gin.Context) (*uint, error) {
	raw := c.Query("responsavel")
	if raw == "" {
		return nil, nil
	}
	id, err := strconv.ParseUint(raw, 10, 64)
	if err != nil || id == 0 {
		return nil, fmt.Errorf("responsável inválido")
	}
	value := uint(id)
	return &value, nil
}

// dashboardPeriodo devolve fim exclusivo. Quando datas explícitas não são
// fornecidas, aplica os atalhos aceitos pela barra global do painel.
func dashboardPeriodo(c *gin.Context) (string, time.Time, time.Time, error) {
	periodo := c.DefaultQuery("periodo", "30d")
	now := time.Now()
	hoje := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	parse := func(raw string) (time.Time, error) {
		return time.ParseInLocation("2006-01-02", raw, now.Location())
	}

	rawInicio, rawFim := c.Query("inicio"), c.Query("fim")
	if rawInicio != "" || rawFim != "" {
		if rawInicio == "" || rawFim == "" {
			return "", time.Time{}, time.Time{}, fmt.Errorf("início e fim são obrigatórios juntos")
		}
		inicio, err := parse(rawInicio)
		if err != nil {
			return "", time.Time{}, time.Time{}, fmt.Errorf("data inicial inválida")
		}
		fimInclusivo, err := parse(rawFim)
		if err != nil {
			return "", time.Time{}, time.Time{}, fmt.Errorf("data final inválida")
		}
		fim := fimInclusivo.AddDate(0, 0, 1)
		if !fim.After(inicio) || fim.Sub(inicio) > 731*24*time.Hour {
			return "", time.Time{}, time.Time{}, fmt.Errorf("o período deve ter entre 1 e 731 dias")
		}
		return periodo, inicio, fim, nil
	}

	fim := hoje.AddDate(0, 0, 1)
	var inicio time.Time
	switch periodo {
	case "hoje":
		inicio = hoje
	case "7d":
		inicio = hoje.AddDate(0, 0, -6)
	case "mes":
		inicio = time.Date(hoje.Year(), hoje.Month(), 1, 0, 0, 0, 0, hoje.Location())
	case "12m":
		inicio = time.Date(hoje.Year(), hoje.Month(), 1, 0, 0, 0, 0, hoje.Location()).AddDate(0, -11, 0)
	case "30d", "":
		periodo = "30d"
		inicio = hoje.AddDate(0, 0, -29)
	default:
		return "", time.Time{}, time.Time{}, fmt.Errorf("período inválido")
	}
	return periodo, inicio, fim, nil
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
