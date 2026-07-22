package correspondentes

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"crmimob/internal/auth"
)

// Handler expõe /api/correspondente. TODO montar SEMPRE atrás de auth+tenant
// no router — correção de segurança deliberada (o Node deixava praticamente
// toda a rota pública, ver 01-spec gotcha §7.5). Ver doc de wiring.
type Handler struct{ svc *Service }

func NewHandler(svc *Service) *Handler { return &Handler{svc: svc} }

func (h *Handler) Register(r *gin.RouterGroup) {
	r.GET("/me", h.Me)
	r.POST("", h.Create)
	r.GET("/lista", h.List)
	r.GET("/:id", h.Get)
	r.PUT("/:id", h.Update)
	r.DELETE("/:id", h.Delete)
}

func (h *Handler) Me(c *gin.Context) {
	user, _ := auth.UserFrom(c)
	u, err := h.svc.Get(c.Request.Context(), user.ID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "Correspondente não encontrado"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": ToResponse(u)})
}

func (h *Handler) Create(c *gin.Context) {
	var req CreateRequest
	if err := c.ShouldBind(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		return
	}
	photo, _ := c.FormFile("photo")

	u, err := h.svc.Create(c.Request.Context(), req, photo)
	if err != nil {
		if errors.Is(err, ErrDuplicate) {
			c.JSON(http.StatusConflict, gin.H{"success": false, "error": "Email ou username já cadastrado"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "Erro ao criar correspondente"})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"success": true, "message": "Correspondente criado", "data": ToResponse(u)})
}

func (h *Handler) List(c *gin.Context) {
	list, err := h.svc.List(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "Erro ao listar correspondentes"})
		return
	}
	c.JSON(http.StatusOK, ToResponseList(list))
}

func (h *Handler) Get(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "id inválido"})
		return
	}
	u, err := h.svc.Get(c.Request.Context(), uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "Correspondente não encontrado"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": ToResponse(u)})
}

func (h *Handler) Update(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "id inválido"})
		return
	}
	var req UpdateRequest
	if err := c.ShouldBind(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		return
	}
	photo, _ := c.FormFile("photo")

	u, err := h.svc.Update(c.Request.Context(), uint(id), req, photo)
	if err != nil {
		if errors.Is(err, ErrDuplicate) {
			c.JSON(http.StatusConflict, gin.H{"success": false, "error": "Email ou username já cadastrado"})
			return
		}
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "Correspondente não encontrado"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "Erro ao atualizar correspondente"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Correspondente atualizado", "data": ToResponse(u)})
}

func (h *Handler) Delete(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "id inválido"})
		return
	}
	if err := h.svc.Delete(c.Request.Context(), uint(id)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "Erro ao remover correspondente"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Correspondente removido"})
}
