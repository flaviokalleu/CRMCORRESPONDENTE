package corretores

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"crmimob/internal/auth"
)

// Handler expõe /api/corretor. TODO montar SEMPRE atrás de auth+tenant no
// router — correção de segurança deliberada em relação ao Node, que deixava
// POST / público (ver 01-spec gotcha §7.5). Ver doc de wiring.
type Handler struct{ svc *Service }

func NewHandler(svc *Service) *Handler { return &Handler{svc: svc} }

func (h *Handler) Register(r *gin.RouterGroup) {
	r.GET("/me", h.Me)
	r.POST("", h.Create)
	r.GET("", h.List)
	r.GET("/:id", h.Get)
	r.PUT("/:id", h.Update)
	r.DELETE("/:id", h.Delete)
}

func (h *Handler) Me(c *gin.Context) {
	user, _ := auth.UserFrom(c)
	u, err := h.svc.Get(c.Request.Context(), user.ID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "Corretor não encontrado"})
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
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "Erro ao criar corretor"})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"success": true, "message": "Corretor criado", "data": ToResponse(u)})
}

func (h *Handler) List(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	all := c.Query("all") == "true"
	search := c.Query("search")

	list, total, err := h.svc.List(c.Request.Context(), search, page, limit, all)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "Erro ao listar corretores"})
		return
	}
	if all {
		c.JSON(http.StatusOK, gin.H{"data": ToResponseList(list), "total": total, "all": true})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": ToResponseList(list), "total": total, "page": page, "limit": limit})
}

func (h *Handler) Get(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "id inválido"})
		return
	}
	u, err := h.svc.Get(c.Request.Context(), uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "Corretor não encontrado"})
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
			c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "Corretor não encontrado"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "Erro ao atualizar corretor"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Corretor atualizado", "data": ToResponse(u)})
}

func (h *Handler) Delete(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "id inválido"})
		return
	}
	if err := h.svc.Delete(c.Request.Context(), uint(id)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "Erro ao remover corretor"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Corretor removido"})
}
