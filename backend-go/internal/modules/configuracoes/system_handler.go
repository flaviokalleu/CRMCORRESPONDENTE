package configuracoes

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"crmimob/internal/models"
)

// SystemHandler expõe GET/PUT /api/configurations — branding global (singleton
// id=1). Decisão de migração (spec §"Configurações" item 1): implementar de
// fato lendo/gravando `system_configs`, em vez do JSON hardcoded do Node.
// `system_configs` é tabela global (sem tenant_id) — não passa pelos callbacks
// de tenant.
type SystemHandler struct {
	db *gorm.DB
}

func NewSystemHandler(db *gorm.DB) *SystemHandler {
	return &SystemHandler{db: db}
}

// getOrCreate garante o singleton id=1, criando com os defaults do model se
// ainda não existir.
func (h *SystemHandler) getOrCreate(ctx *gin.Context) (*models.SystemConfig, error) {
	var cfg models.SystemConfig
	err := h.db.WithContext(ctx.Request.Context()).First(&cfg, models.SystemConfigSingletonID).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		cfg = models.SystemConfig{ID: models.SystemConfigSingletonID}
		if err := h.db.WithContext(ctx.Request.Context()).Create(&cfg).Error; err != nil {
			return nil, err
		}
		return &cfg, nil
	}
	if err != nil {
		return nil, err
	}
	return &cfg, nil
}

// Get: GET /api/configurations.
func (h *SystemHandler) Get(c *gin.Context) {
	cfg, err := h.getOrCreate(c)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Erro ao ler configuração do sistema", "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, cfg)
}

// Update: PUT /api/configurations.
func (h *SystemHandler) Update(c *gin.Context) {
	cfg, err := h.getOrCreate(c)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Erro ao ler configuração do sistema", "error": err.Error()})
		return
	}
	var req SystemConfigRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Corpo inválido"})
		return
	}
	if req.NomeSistema != nil {
		cfg.NomeSistema = *req.NomeSistema
	}
	if req.CorPrimaria != nil {
		cfg.CorPrimaria = *req.CorPrimaria
	}
	if req.CorSecundaria != nil {
		cfg.CorSecundaria = *req.CorSecundaria
	}
	if req.CorTexto != nil {
		cfg.CorTexto = *req.CorTexto
	}
	if req.LogoURL != nil {
		cfg.LogoURL = req.LogoURL
	}
	if req.TemaEscuro != nil {
		cfg.TemaEscuro = *req.TemaEscuro
	}
	if err := h.db.WithContext(c.Request.Context()).Save(cfg).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Erro ao salvar configuração do sistema", "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, cfg)
}
