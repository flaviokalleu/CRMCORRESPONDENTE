package clientes

import "github.com/gin-gonic/gin"

// RegisterRoutes monta /clientes dentro do grupo já protegido por
// (authHandler.Required(), middleware.ResolveTenant(db)). Conforme o gotcha
// §6.7 do spec, este grupo deve ser registrado por ÚLTIMO no router (era
// catch-all em /api/ no Node) — aqui isso só importa relativamente a outras
// rotas que comecem com o mesmo prefixo (ex.: /listadeclientes), então basta
// não colidir com paths mais específicos montados antes.
func (h *Handler) RegisterRoutes(rg *gin.RouterGroup) {
	g := rg.Group("/clientes")
	{
		g.GET("", h.List)
		g.POST("", h.Create)
		g.GET("/:id", h.Get)
		g.PUT("/:id", h.Update)
		g.PATCH("/:id/status", h.UpdateStatus)
		g.DELETE("/:id", h.Delete)

		g.DELETE("/:id/documentos/:tipo", h.DeleteDocument)
		g.GET("/:id/documentos/:tipo/verificar", h.VerifyDocument)
		g.GET("/:id/documentos/:tipo/info", h.DocumentInfo)
		g.GET("/:id/documentos/:tipo/pagina/:pageNumber", h.DocumentPage)
		g.POST("/:id/tela_aprovacao", h.TelaAprovacaoUpload)
	}
}
