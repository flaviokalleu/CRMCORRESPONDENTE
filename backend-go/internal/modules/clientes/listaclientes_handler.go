package clientes

// Replica listadeclientes.js (§2.2 do spec de migração). Vive dentro do
// pacote `clientes` (não como módulo próprio) porque o escopo desta tarefa
// restringe novos pacotes a internal/modules/{clientes,imoveis,notas,
// lembretes,acessos,locations}/ — listadeclientes é apenas uma superfície de
// rota alternativa sobre o mesmo model Cliente, então reaproveita o Handler.

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"

	"crmimob/internal/auth"
	"crmimob/internal/models"
)

// RegisterListaClientesRoutes monta /api/listadeclientes* (grupo protegido por
// auth+tenant, montado ANTES de /clientes — não é catch-all).
func (h *Handler) RegisterListaClientesRoutes(rg *gin.RouterGroup) {
	g := rg.Group("/listadeclientes")
	{
		g.GET("", h.ListaClientesList)
		g.GET("/usuarios", h.ListaClientesUsuarios)
		g.GET("/test-permissions", h.ListaClientesTestPermissions)
	}
}

// ListaClientesList — GET /api/listadeclientes.
func (h *Handler) ListaClientesList(c *gin.Context) {
	actor, ok := auth.UserFrom(c)
	if !ok {
		c.JSON(http.StatusForbidden, gin.H{"error": "Não autorizado"})
		return
	}
	if actor.TenantID == nil && !actor.IsSuperAdmin {
		c.JSON(http.StatusForbidden, gin.H{"error": "Usuário sem organização"})
		return
	}

	q := h.svc.repo.DB().Model(&models.Cliente{})
	q = q.WithContext(c.Request.Context())

	if actor.IsCorretor && !actor.IsAdministrador && !actor.IsCorrespondente {
		q = q.Where("user_id = ?", actor.ID)
	} else if corretor := c.Query("corretor"); corretor != "" {
		q = q.Where("user_id = ?", corretor)
	}
	if status := c.Query("status"); status != "" {
		q = q.Where("status = ?", status)
	}
	if di := c.Query("dataInicio"); di != "" {
		if t, err := time.Parse("2006-01-02", di); err == nil {
			q = q.Where("created_at >= ?", t)
		}
	}
	if df := c.Query("dataFim"); df != "" {
		if t, err := time.Parse("2006-01-02", df); err == nil {
			q = q.Where("created_at <= ?", t.Add(24*time.Hour))
		}
	}

	var clientes []models.Cliente
	if err := q.Preload("User").Preload("Notas").Order("created_at DESC").Find(&clientes).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao buscar clientes"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"clientes": clientes,
		"userPermissions": gin.H{
			"role":              actor.Role(),
			"is_administrador":  actor.IsAdministrador,
			"is_correspondente": actor.IsCorrespondente,
			"is_corretor":       actor.IsCorretor,
		},
		"totalCount": len(clientes),
		"appliedFilters": gin.H{
			"status":     c.Query("status"),
			"corretor":   c.Query("corretor"),
			"dataInicio": c.Query("dataInicio"),
			"dataFim":    c.Query("dataFim"),
		},
	})
}

// ListaClientesUsuarios — GET /api/listadeclientes/usuarios (Admin/Correspondente only).
func (h *Handler) ListaClientesUsuarios(c *gin.Context) {
	actor, ok := auth.UserFrom(c)
	if !ok || (!actor.IsAdministrador && !actor.IsCorrespondente) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Não autorizado"})
		return
	}
	var users []models.User
	if err := h.svc.repo.DB().WithContext(c.Request.Context()).
		Select("id", "first_name", "last_name", "email", "username", "is_corretor", "is_administrador", "is_correspondente").
		Find(&users).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao buscar usuários"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "users": users, "count": len(users)})
}

// ListaClientesTestPermissions — GET /api/listadeclientes/test-permissions (debug).
func (h *Handler) ListaClientesTestPermissions(c *gin.Context) {
	actor, ok := auth.UserFrom(c)
	if !ok {
		c.JSON(http.StatusForbidden, gin.H{"error": "Não autorizado"})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"user": gin.H{
			"id":                actor.ID,
			"role":              actor.Role(),
			"is_administrador":  actor.IsAdministrador,
			"is_correspondente": actor.IsCorrespondente,
			"is_corretor":       actor.IsCorretor,
		},
		"message": "Permissões carregadas",
	})
}
