package propostas

import "github.com/gin-gonic/gin"

// Register monta as rotas em /api/propostas. O grupo já deve ter
// auth.Required() + middleware.ResolveTenant(db) aplicados (wiring doc).
func Register(rg *gin.RouterGroup, h *Handler) {
	rg.GET("", h.List)
	rg.GET("/cliente/:clienteId", h.ListByCliente)
	rg.POST("", h.Create)
	rg.PUT("/:id", h.Update)
	rg.DELETE("/:id", h.Delete)
}
