package portalinquilino

import (
	"errors"
	"net/http"
	"path/filepath"
	"strconv"

	"github.com/gin-gonic/gin"
)

type Handler struct {
	svc  *Service
	auth *AuthService
}

func NewHandler(svc *Service, auth *AuthService) *Handler {
	return &Handler{svc: svc, auth: auth}
}

// Register monta as rotas do portal. `POST /login` é público; o restante
// exige AuthInquilino (JWT tipo:"inquilino", 24h, SEM tenant scope — ver
// doc do pacote). Deve ser montado no TOPO do router (04-spec §Ordem de
// montagem, item 1) para não colidir com rotas dinâmicas de outros módulos.
func (h *Handler) Register(r *gin.RouterGroup) {
	r.POST("/portal/login", h.Login)

	protected := r.Group("")
	protected.Use(h.auth.Required())
	{
		protected.GET("/portal/meus-dados", h.MeusDados)
		protected.GET("/portal/cobrancas", h.Cobrancas)
		protected.GET("/portal/recibos", h.Recibos)
		protected.GET("/portal/recibo/:id/pdf", h.ReciboPDF)
		protected.GET("/portal/contrato", h.Contrato)
	}
}

func (h *Handler) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "cpf é obrigatório"})
		return
	}
	res, err := h.svc.Login(c.Request.Context(), req.CPF)
	if err != nil {
		switch {
		case errors.Is(err, ErrNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": "Inquilino não encontrado"})
		case errors.Is(err, ErrPortalDisabled):
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		}
		return
	}
	c.JSON(http.StatusOK, res)
}

func (h *Handler) MeusDados(c *gin.Context) {
	claims, ok := ClaimsFrom(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Não autenticado"})
		return
	}
	out, err := h.svc.MeusDados(c.Request.Context(), claims.ClienteAluguelID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Inquilino não encontrado"})
		return
	}
	c.JSON(http.StatusOK, out)
}

func (h *Handler) Cobrancas(c *gin.Context) {
	claims, ok := ClaimsFrom(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Não autenticado"})
		return
	}
	out, err := h.svc.Cobrancas(c.Request.Context(), claims.ClienteAluguelID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao listar cobranças"})
		return
	}
	c.JSON(http.StatusOK, out)
}

func (h *Handler) Recibos(c *gin.Context) {
	claims, ok := ClaimsFrom(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Não autenticado"})
		return
	}
	out, err := h.svc.Recibos(c.Request.Context(), claims.ClienteAluguelID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao listar recibos"})
		return
	}
	c.JSON(http.StatusOK, out)
}

func (h *Handler) ReciboPDF(c *gin.Context) {
	claims, ok := ClaimsFrom(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Não autenticado"})
		return
	}
	cobrancaID, err := parseUintParam(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id inválido"})
		return
	}
	path, err := h.svc.ReciboPDFPath(c.Request.Context(), claims.ClienteAluguelID, cobrancaID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Recibo não disponível"})
		return
	}
	c.FileAttachment(path, filepath.Base(path))
}

func (h *Handler) Contrato(c *gin.Context) {
	claims, ok := ClaimsFrom(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Não autenticado"})
		return
	}
	path, err := h.svc.ContratoPDFPath(c.Request.Context(), claims.ClienteAluguelID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Contrato não disponível"})
		return
	}
	c.FileAttachment(path, filepath.Base(path))
}

func parseUintParam(c *gin.Context, name string) (uint, error) {
	v, err := strconv.ParseUint(c.Param(name), 10, 64)
	return uint(v), err
}
