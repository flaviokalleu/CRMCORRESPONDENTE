package laudos

import "github.com/gin-gonic/gin"

// Register monta as rotas em /api/laudos. O grupo já deve ter
// auth.Required() + middleware.ResolveTenant(db) aplicados (wiring doc).
//
// Ordem preservada por segurança (spec §item da tabela de Laudos): a rota
// estática `/relatorios/estatisticas` é registrada e o Gin resolve por
// especificidade de segmentos, não conflitando com `/:id`.
func Register(rg *gin.RouterGroup, h *Handler) {
	rg.GET("", h.List)
	rg.GET("/relatorios/estatisticas", h.Estatisticas)
	rg.GET("/:id", h.Get)
	rg.POST("", h.Create)
	rg.PUT("/:id", h.Update)
	rg.DELETE("/:id", h.Delete)
	rg.GET("/:id/arquivo/:categoria/:filename", h.DownloadArquivo)
}
