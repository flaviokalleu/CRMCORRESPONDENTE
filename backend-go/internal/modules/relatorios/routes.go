package relatorios

import "github.com/gin-gonic/gin"

// Register monta as rotas em /api/report. O grupo DEVE ter auth.Required() +
// middleware.ResolveTenant(db) aplicados no wiring — correção deliberada do
// gotcha crítico (rotas públicas no Node, ver handler.go).
func Register(rg *gin.RouterGroup, h *Handler) {
	rg.GET("/relatorio", h.RelatorioHTML)
	rg.GET("/relatorio/download", h.RelatorioPDF)
	rg.GET("/relatorio/dados", h.RelatorioDados)
}
