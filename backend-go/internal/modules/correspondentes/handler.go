package correspondentes

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"crmimob/internal/auth"
	"crmimob/internal/validacao"
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

// responderErro traduz erros de validação/duplicidade em 400/409 com o campo
// (o front mostra a mensagem embaixo dele). Qualquer outro erro vira 500.
func responderErro(c *gin.Context, err error, padrao string) {
	var ec *validacao.ErroCampo
	switch {
	case errors.Is(err, validacao.ErrEmailEmUso), errors.Is(err, validacao.ErrUsuarioEmUso):
		c.JSON(http.StatusConflict, gin.H{"success": false, "error": err.Error(), "campo": err.(*validacao.ErroCampo).Campo})
	case errors.As(err, &ec):
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": ec.Mensagem, "campo": ec.Campo})
	case errors.Is(err, gorm.ErrRecordNotFound):
		c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "Correspondente não encontrado"})
	case errors.Is(err, ErrProprioUsuario):
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Você não pode excluir o seu próprio usuário."})
	default:
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": padrao})
	}
}

// podeGerir: só administrador ou correspondente cadastra, edita ou exclui
// gente da equipe. Antes qualquer corretor logado podia trocar a senha de
// outro corretor ou excluí-lo.
func podeGerir(c *gin.Context) bool {
	u, ok := auth.UserFrom(c)
	if ok && u != nil && (u.IsAdministrador || u.IsCorrespondente || u.IsSuperAdmin) {
		return true
	}
	c.JSON(http.StatusForbidden, gin.H{"success": false, "error": "Só o administrador pode mudar a equipe."})
	return false
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
	if !podeGerir(c) {
		return
	}
	var req CreateRequest
	if err := c.ShouldBind(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Não deu para ler os dados enviados. Recarregue a página e tente de novo."})
		return
	}
	photo, _ := c.FormFile("photo")

	u, err := h.svc.Create(c.Request.Context(), req, photo)
	if err != nil {
		responderErro(c, err, "Erro ao criar correspondente")
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
	if !podeGerir(c) {
		return
	}
	var req UpdateRequest
	if err := c.ShouldBind(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Não deu para ler os dados enviados. Recarregue a página e tente de novo."})
		return
	}
	photo, _ := c.FormFile("photo")

	u, err := h.svc.Update(c.Request.Context(), uint(id), req, photo)
	if err != nil {
		responderErro(c, err, "Erro ao atualizar correspondente")
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Correspondente atualizado", "data": ToResponse(u)})
}

func (h *Handler) Delete(c *gin.Context) {
	if !podeGerir(c) {
		return
	}
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "id inválido"})
		return
	}
	ator, _ := auth.UserFrom(c)
	if err := h.svc.Delete(c.Request.Context(), uint(id), ator.ID); err != nil {
		responderErro(c, err, "Erro ao remover correspondente")
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Correspondente removido"})
}
