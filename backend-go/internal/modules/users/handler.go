package users

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"crmimob/internal/auth"
	"crmimob/internal/validacao"
)

// Handler expõe /api/user. Assume-se que o *gin.RouterGroup recebido já tem
// auth.Required()+middleware.ResolveTenant aplicados pelo router (ver doc de
// wiring). Ver 01-spec §2.6.
type Handler struct{ svc *Service }

func NewHandler(svc *Service) *Handler { return &Handler{svc: svc} }

func (h *Handler) Register(r *gin.RouterGroup) {
	r.GET("/me", h.Me)
	r.GET("", h.List)
	r.GET("/:id", h.Get)
	r.PUT("/me/senha", h.TrocarSenha)
	r.PUT("/:id", h.Update)
}

// responderErro: erro de campo vira 400/409 com `campo`; o resto, 500.
func responderErro(c *gin.Context, err error) {
	var ec *validacao.ErroCampo
	switch {
	case errors.Is(err, validacao.ErrEmailEmUso), errors.Is(err, validacao.ErrUsuarioEmUso):
		ec = err.(*validacao.ErroCampo)
		c.JSON(http.StatusConflict, gin.H{"success": false, "error": ec.Mensagem, "campo": ec.Campo})
	case errors.As(err, &ec):
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": ec.Mensagem, "campo": ec.Campo})
	case errors.Is(err, gorm.ErrRecordNotFound):
		c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "Usuário não encontrado"})
	default:
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "Não foi possível salvar. Tente de novo."})
	}
}

// TrocarSenha: PUT /api/user/me/senha {senha_atual, nova_senha}.
func (h *Handler) TrocarSenha(c *gin.Context) {
	actor, _ := auth.UserFrom(c)
	var req struct {
		SenhaAtual string `json:"senha_atual"`
		NovaSenha  string `json:"nova_senha"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Dados inválidos"})
		return
	}
	if err := h.svc.TrocarSenha(c.Request.Context(), actor.ID, req.SenhaAtual, req.NovaSenha); err != nil {
		responderErro(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Senha alterada"})
}

func (h *Handler) Me(c *gin.Context) {
	user, _ := auth.UserFrom(c)
	c.JSON(http.StatusOK, gin.H{"user": ToResponse(user), "type": user.Role(), "role": user.Role()})
}

// List: só admin/correspondente (403 senão) — ver 01-spec §2.6.
func (h *Handler) List(c *gin.Context) {
	actor, _ := auth.UserFrom(c)
	if !actor.IsAdministrador && !actor.IsCorrespondente {
		c.JSON(http.StatusForbidden, gin.H{"success": false, "error": "Acesso negado"})
		return
	}
	list, err := h.svc.List(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "Erro ao listar usuários"})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success":     true,
		"users":       ToResponseList(list),
		"total":       len(list),
		"requestedBy": actor.ID,
	})
}

func (h *Handler) Get(c *gin.Context) {
	actor, _ := auth.UserFrom(c)
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "id inválido"})
		return
	}
	if !CanManage(actor, uint(id)) {
		c.JSON(http.StatusForbidden, gin.H{"success": false, "error": "Acesso negado"})
		return
	}
	u, err := h.svc.Get(c.Request.Context(), uint(id))
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "Usuário não encontrado"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "Erro ao buscar usuário"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "user": ToResponse(u)})
}

// Update: multipart com allow-list de campos + foto opcional. Ver 01-spec §2.6.
func (h *Handler) Update(c *gin.Context) {
	actor, _ := auth.UserFrom(c)
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "id inválido"})
		return
	}
	if !CanManage(actor, uint(id)) {
		c.JSON(http.StatusForbidden, gin.H{"success": false, "error": "Acesso negado"})
		return
	}

	var req UpdateRequest
	if err := c.ShouldBind(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Dados inválidos"})
		return
	}

	photo, _ := c.FormFile("photo")

	u, err := h.svc.Update(c.Request.Context(), uint(id), req, photo)
	if err != nil {
		responderErro(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Usuário atualizado", "user": ToResponse(u)})
}
