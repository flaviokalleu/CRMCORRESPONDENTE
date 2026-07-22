package billing

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"crmimob/internal/auth"
	"crmimob/internal/models"
)

// SubscriptionHandler expõe list/change-plan de subscriptions.
// Montar atrás de auth+ResolveTenant+RequireSuperAdmin (rotas /api/super-admin/*)
// exceto ChangePlanSelf, que é para o admin do próprio tenant
// (POST /api/tenant/change-plan — ver 01-spec §2.2).
type SubscriptionHandler struct{ svc *Service }

func NewSubscriptionHandler(svc *Service) *SubscriptionHandler { return &SubscriptionHandler{svc: svc} }

// RegisterSuperAdmin monta GET /subscriptions e PUT /subscriptions/:tenantId/change-plan.
func (h *SubscriptionHandler) RegisterSuperAdmin(r *gin.RouterGroup) {
	r.GET("/subscriptions", h.List)
	r.PUT("/subscriptions/:tenantId/change-plan", h.ChangePlanForTenant)
}

func (h *SubscriptionHandler) List(c *gin.Context) {
	status := c.Query("status")
	var tenantID *uint
	if v := c.Query("tenant_id"); v != "" {
		if id, err := strconv.ParseUint(v, 10, 64); err == nil {
			tid := uint(id)
			tenantID = &tid
		}
	}
	list, err := h.svc.ListSubscriptions(c.Request.Context(), status, tenantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao listar assinaturas"})
		return
	}
	out := make([]SubscriptionResponse, 0, len(list))
	for i := range list {
		out = append(out, ToSubscriptionResponse(&list[i]))
	}
	c.JSON(http.StatusOK, out)
}

func (h *SubscriptionHandler) ChangePlanForTenant(c *gin.Context) {
	tenantID, err := strconv.ParseUint(c.Param("tenantId"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "tenantId inválido"})
		return
	}
	var req ChangePlanRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "plan_id é obrigatório"})
		return
	}
	sub, err := h.svc.ChangePlanForTenant(c.Request.Context(), uint(tenantID), req.PlanID, req.Ciclo)
	if err != nil {
		if errors.Is(err, ErrPlanNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Plano não encontrado"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao trocar de plano"})
		return
	}
	c.JSON(http.StatusOK, ToSubscriptionResponse(sub))
}

// ChangePlanSelf: POST /api/tenant/change-plan — só admin do próprio tenant.
// Montada no módulo tenants (não aqui) mas reaproveita este Service.
func ChangePlanSelfGuard(c *gin.Context) (*models.User, bool) {
	user, ok := auth.UserFrom(c)
	if !ok || !user.IsAdministrador {
		c.JSON(http.StatusForbidden, gin.H{"error": "Apenas administradores podem trocar de plano"})
		return nil, false
	}
	return user, true
}
