package billing

import (
	"net/http"
	"os"
	"path/filepath"

	"github.com/gin-gonic/gin"

	"crmimob/internal/auth"
	"crmimob/internal/models"
)

// StorageHandler expõe /api/storage-usage e /api/storage-recalculate.
// Montar atrás de auth.Required()+middleware.ResolveTenant (ver 01-spec §2.5).
type StorageHandler struct {
	storage *StorageService
	db      interface {
		GetTenant(id uint) (*models.Tenant, error)
	}
}

// NewStorageHandler recebe o StorageService e uma função de busca de tenant
// (repo.FindByID de qualquer módulo que exponha Tenant — aqui usamos o
// próprio billing.Repository indiretamente via closure no wiring).
func NewStorageHandler(storage *StorageService, getTenant func(id uint) (*models.Tenant, error)) *StorageHandler {
	return &StorageHandler{storage: storage, db: tenantGetterFunc(getTenant)}
}

type tenantGetterFunc func(id uint) (*models.Tenant, error)

func (f tenantGetterFunc) GetTenant(id uint) (*models.Tenant, error) { return f(id) }

func (h *StorageHandler) Register(r *gin.RouterGroup) {
	r.GET("/storage-usage", h.Usage)
	r.POST("/storage-recalculate", h.Recalculate)
}

func (h *StorageHandler) Usage(c *gin.Context) {
	user, ok := auth.UserFrom(c)
	if !ok || user.TenantID == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Usuário sem organização"})
		return
	}
	tenant, err := h.db.GetTenant(*user.TenantID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Organização não encontrada"})
		return
	}
	c.JSON(http.StatusOK, h.storage.GetInfo(c.Request.Context(), tenant))
}

// Recalculate: só super admin (403 senão). Escaneia uploads/ inteiro —
// preservando o gotcha do Node (storage é global-por-instalação hoje, não
// por tenant de fato — ver 01-spec gotcha §7.7).
func (h *StorageHandler) Recalculate(c *gin.Context) {
	user, ok := auth.UserFrom(c)
	if !ok || !user.IsSuperAdmin {
		c.JSON(http.StatusForbidden, gin.H{"error": "Apenas super administradores podem recalcular o storage"})
		return
	}
	if user.TenantID == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Informe X-Tenant-Id para recalcular"})
		return
	}

	var total int64
	_ = filepath.Walk("uploads", func(path string, info os.FileInfo, err error) error {
		if err != nil || info == nil || info.IsDir() {
			return nil
		}
		total += info.Size()
		return nil
	})

	if err := h.storage.db.WithContext(c.Request.Context()).Model(&models.Tenant{}).
		Where("id = ?", *user.TenantID).Update("storage_used_bytes", total).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao recalcular storage"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Storage recalculado", "tenant_id": *user.TenantID, "bytes": total, "mb": float64(total) / (1024 * 1024)})
}
