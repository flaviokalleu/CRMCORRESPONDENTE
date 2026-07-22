package simulacoes

import "github.com/gin-gonic/gin"

// Register monta as rotas em /api/simulacoes. O grupo já deve ter
// auth.Required() + middleware.ResolveTenant(db) aplicados (wiring doc).
func Register(rg *gin.RouterGroup, h *Handler) {
	rg.POST("/calcular", h.Calcular)
	rg.POST("", h.Create)
	rg.GET("/cliente/:clienteId", h.ListByCliente)
	rg.GET("", h.List)
	rg.DELETE("/:id", h.Delete)
}
