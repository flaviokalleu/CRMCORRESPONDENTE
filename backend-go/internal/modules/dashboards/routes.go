package dashboards

import "github.com/gin-gonic/gin"

// Register monta as rotas em /api/dashboard. O grupo passado já deve ter
// auth.Required() + middleware.ResolveTenant(db) aplicados (ver wiring doc) —
// unifica o duplo middleware do Node (gotcha §4).
//
// Path limpo: `aguardando-aprovacao` (o Node tinha o path duplicado
// `/dashboard/dashboard/aguardando-aprovacao`, gotcha §3). Mantemos um alias
// idêntico ao path legado para não quebrar o frontend atual durante a transição.
func Register(rg *gin.RouterGroup, h *Handler) {
	// Registrado em "" (sem barra) e "/" — o frontend chama sem barra final
	// (`/api/dashboard`), e sem este alias o Gin faz 301 redirect para
	// "/api/dashboard/", cujo response NÃO carrega os headers de CORS
	// (o middleware de CORS não roda no redirect interno do router), o que o
	// navegador bloqueia como erro de CORS → fetch() falha com "Failed to fetch".
	rg.GET("", h.Main)
	rg.GET("/", h.Main)
	rg.GET("/monthly", h.Monthly)
	rg.GET("/weekly", h.Weekly)
	rg.GET("/system-stats", h.SystemStats)
	rg.GET("/activity-metrics", h.ActivityMetrics)
	rg.GET("/notifications", h.Notifications)
	rg.GET("/aguardando-aprovacao", h.AguardandoAprovacao)
	// Alias de compatibilidade com o path duplicado legado do Node.
	rg.GET("/dashboard/aguardando-aprovacao", h.AguardandoAprovacao)
}
