package configuracoes

import "github.com/gin-gonic/gin"

// RegisterSystem monta GET/PUT /api/configurations. Basta auth.Required()
// (sem tenant/role extra — igual ao `authMiddleware` do Node).
func RegisterSystem(rg *gin.RouterGroup, h *SystemHandler) {
	rg.GET("/configurations", h.Get)
	rg.PUT("/configurations", h.Update)
}

// RegisterTenantSettings monta /api/tenant-settings/settings/*. O grupo já
// deve ter auth.Required() + middleware.ResolveTenant(db) aplicados (wiring
// doc); guardas adicionais de admin/super-admin são aplicadas dentro dos
// handlers (requireTenantAdmin).
func RegisterTenantSettings(rg *gin.RouterGroup, h *TenantHandler) {
	rg.GET("/settings", h.GetSettings)
	rg.PUT("/settings", h.UpdateSettings)
	rg.POST("/settings/logo", h.UploadLogo)
	rg.GET("/settings/asaas", h.GetAsaasSettings)
	rg.PUT("/settings/asaas", h.UpdateAsaasSettings)
	rg.POST("/settings/asaas/testar", h.TestAsaas)
}
