package locations

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type Handler struct{ db *gorm.DB }

func NewHandler(db *gorm.DB) *Handler { return &Handler{db: db} }

// RegisterRoutes monta GET /api/estados e GET /api/municipios/:estadoId
// (sem auth hoje — §2.7, cadastro auxiliar público).
func (h *Handler) RegisterRoutes(rg *gin.RouterGroup) {
	rg.GET("/estados", h.Estados)
	rg.GET("/municipios/:estadoId", h.Municipios)
}

func (h *Handler) Estados(c *gin.Context) {
	var list []Estado
	if err := h.db.WithContext(c.Request.Context()).Find(&list).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao listar estados"})
		return
	}
	c.JSON(http.StatusOK, list)
}

func (h *Handler) Municipios(c *gin.Context) {
	estadoID, err := strconv.ParseUint(c.Param("estadoId"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "estadoId inválido"})
		return
	}
	var list []Municipio
	if err := h.db.WithContext(c.Request.Context()).Where(`"estadoId" = ?`, estadoID).Find(&list).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao listar municípios"})
		return
	}
	c.JSON(http.StatusOK, list)
}
