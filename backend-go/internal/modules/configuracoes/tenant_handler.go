package configuracoes

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/gin-gonic/gin"
	"gorm.io/datatypes"
	"gorm.io/gorm"

	"crmimob/internal/auth"
	"crmimob/internal/integrations/asaas"
	"crmimob/internal/models"
)

// TenantHandler expõe /api/tenant-settings/settings/* — a camada de
// configuração REAL e ativa do sistema (spec §"Configurações" item 2).
//
// NOTA DE WIRING: no momento da escrita, internal/modules/tenants/ existe como
// diretório reservado mas VAZIO (nenhum outro agente implementou settings
// ainda). Este handler assume a responsabilidade temporariamente; se o módulo
// tenants/ vier a implementar o mesmo contrato, reconciliar removendo a
// duplicata (ver docs/migration/wiring/06-dashboards-vendas-config.md).
type TenantHandler struct {
	db *gorm.DB
}

func NewTenantHandler(db *gorm.DB) *TenantHandler {
	return &TenantHandler{db: db}
}

// requireTenantAdmin replica a guarda do Node: `is_administrador` OU `is_super_admin`.
func requireTenantAdmin(c *gin.Context) (*models.User, bool) {
	user, ok := auth.UserFrom(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Não autenticado"})
		return nil, false
	}
	if !user.IsAdministrador && !user.IsSuperAdmin {
		c.JSON(http.StatusForbidden, gin.H{"error": "Apenas administradores podem alterar as configurações da organização"})
		return nil, false
	}
	return user, true
}

func (h *TenantHandler) currentTenant(c *gin.Context) (*models.Tenant, bool) {
	user, ok := auth.UserFrom(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Não autenticado"})
		return nil, false
	}
	if user.TenantID == nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "Usuário sem organização"})
		return nil, false
	}
	var t models.Tenant
	// Tenant é tabela global — não passa pelo callback de tenant scope; ok
	// buscar por PK diretamente, o ID já vem do usuário autenticado.
	if err := h.db.WithContext(c.Request.Context()).First(&t, *user.TenantID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Organização não encontrada"})
		return nil, false
	}
	return &t, true
}

// GetSettings: GET /api/tenant-settings/settings.
func (h *TenantHandler) GetSettings(c *gin.Context) {
	t, ok := h.currentTenant(c)
	if !ok {
		return
	}
	c.JSON(http.StatusOK, TenantSettingsResponse{
		ID: t.ID, Nome: t.Nome, Slug: t.Slug, CNPJ: t.CNPJ, Email: t.Email, Telefone: t.Telefone,
		Logo: t.Logo, Endereco: t.Endereco, Cidade: t.Cidade, Estado: t.Estado, CEP: t.CEP,
		Configuracoes: t.Configuracoes,
	})
}

// UpdateSettings: PUT /api/tenant-settings/settings (admin/super admin). `slug` é imutável.
func (h *TenantHandler) UpdateSettings(c *gin.Context) {
	if _, ok := requireTenantAdmin(c); !ok {
		return
	}
	t, ok := h.currentTenant(c)
	if !ok {
		return
	}
	var req TenantSettingsUpdateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Corpo inválido"})
		return
	}
	if req.Nome != nil {
		t.Nome = *req.Nome
	}
	if req.CNPJ != nil {
		t.CNPJ = req.CNPJ
	}
	if req.Email != nil {
		t.Email = *req.Email
	}
	if req.Telefone != nil {
		t.Telefone = req.Telefone
	}
	if req.Endereco != nil {
		t.Endereco = req.Endereco
	}
	if req.Cidade != nil {
		t.Cidade = req.Cidade
	}
	if req.Estado != nil {
		t.Estado = req.Estado
	}
	if req.CEP != nil {
		t.CEP = req.CEP
	}
	if req.Configuracoes != nil {
		b, err := json.Marshal(req.Configuracoes)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "configuracoes inválido"})
			return
		}
		t.Configuracoes = datatypes.JSON(b)
	}

	if err := h.db.WithContext(c.Request.Context()).Save(t).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Erro ao salvar configurações", "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Configurações atualizadas com sucesso", "tenant": t})
}

// UploadLogo: POST /api/tenant-settings/settings/logo (admin/super admin, multipart `logo`).
func (h *TenantHandler) UploadLogo(c *gin.Context) {
	if _, ok := requireTenantAdmin(c); !ok {
		return
	}
	t, ok := h.currentTenant(c)
	if !ok {
		return
	}

	fh, err := c.FormFile("logo")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Arquivo 'logo' é obrigatório"})
		return
	}
	if fh.Size > 5*1024*1024 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Logo deve ter no máximo 5MB"})
		return
	}
	ext := strings.ToLower(filepath.Ext(fh.Filename))
	allowed := map[string]bool{".jpg": true, ".jpeg": true, ".png": true, ".webp": true, ".svg": true}
	if !allowed[ext] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Formato inválido (aceitos: JPEG, PNG, WebP, SVG)"})
		return
	}

	dir := filepath.Join("uploads", "tenants", fmt.Sprintf("%d", t.ID))
	if err := os.MkdirAll(dir, 0o755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao preparar diretório de upload"})
		return
	}
	dest := filepath.Join(dir, "logo"+ext)

	// Remove logo antigo antes de gravar o novo (evita arquivos órfãos com extensão diferente).
	if t.Logo != nil && *t.Logo != "" {
		_ = os.Remove(*t.Logo)
	}
	if err := c.SaveUploadedFile(fh, dest); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao salvar logo"})
		return
	}
	t.Logo = &dest
	if err := h.db.WithContext(c.Request.Context()).Save(t).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao salvar referência do logo"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Logo atualizado com sucesso", "logo": dest})
}

func (h *TenantHandler) webhookURL(t *models.Tenant) string {
	base := os.Getenv("BACKEND_URL")
	if base == "" {
		base = "http://localhost:8000"
	}
	return strings.TrimRight(base, "/") + "/api/asaas/webhook/" + t.Slug
}

// GetAsaasSettings: GET /api/tenant-settings/settings/asaas.
func (h *TenantHandler) GetAsaasSettings(c *gin.Context) {
	t, ok := h.currentTenant(c)
	if !ok {
		return
	}
	resp := AsaasSettingsResponse{WebhookURL: h.webhookURL(t)}
	if t.AsaasAPIKey != nil && *t.AsaasAPIKey != "" {
		resp.AsaasAPIKeyConfigured = true
		resp.AsaasAPIKeyPreview = maskKey(*t.AsaasAPIKey)
	}
	if t.AsaasWebhookToken != nil {
		resp.AsaasWebhookToken = *t.AsaasWebhookToken
	}
	c.JSON(http.StatusOK, resp)
}

// UpdateAsaasSettings: PUT /api/tenant-settings/settings/asaas (admin/super admin).
// String vazia explícita apaga o campo (mesma semântica do Node).
func (h *TenantHandler) UpdateAsaasSettings(c *gin.Context) {
	if _, ok := requireTenantAdmin(c); !ok {
		return
	}
	t, ok := h.currentTenant(c)
	if !ok {
		return
	}
	var req AsaasSettingsUpdateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Corpo inválido"})
		return
	}

	var testeConexao gin.H
	if req.AsaasAPIKey != nil {
		if *req.AsaasAPIKey == "" {
			t.AsaasAPIKey = nil
		} else {
			key := *req.AsaasAPIKey
			t.AsaasAPIKey = &key
			testeConexao = testarConexaoAsaas(c, key)
		}
	}
	if req.AsaasWebhookToken != nil {
		if *req.AsaasWebhookToken == "" {
			t.AsaasWebhookToken = nil
		} else {
			token := *req.AsaasWebhookToken
			t.AsaasWebhookToken = &token
		}
	}

	if err := h.db.WithContext(c.Request.Context()).Save(t).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao salvar configuração Asaas"})
		return
	}

	resp := gin.H{"message": "Configuração Asaas atualizada com sucesso"}
	if testeConexao != nil {
		resp["teste_conexao"] = testeConexao
	}
	c.JSON(http.StatusOK, resp)
}

// TestAsaas: POST /api/tenant-settings/settings/asaas/testar.
func (h *TenantHandler) TestAsaas(c *gin.Context) {
	t, ok := h.currentTenant(c)
	if !ok {
		return
	}
	var req AsaasTestRequest
	_ = c.ShouldBindJSON(&req)

	key := ""
	if req.AsaasAPIKey != nil && *req.AsaasAPIKey != "" {
		key = *req.AsaasAPIKey
	} else if t.AsaasAPIKey != nil {
		key = *t.AsaasAPIKey
	}
	if key == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Nenhuma chave Asaas informada ou configurada"})
		return
	}
	c.JSON(http.StatusOK, testarConexaoAsaas(c, key))
}

// testarConexaoAsaas usa GetBalance como smoke-test de credencial (chave
// inválida → erro 401/403 da API Asaas).
func testarConexaoAsaas(c *gin.Context, apiKey string) gin.H {
	client := asaas.NewClient(apiKey)
	if _, err := client.GetBalance(c.Request.Context()); err != nil {
		return gin.H{"sucesso": false, "mensagem": "Falha ao conectar com a Asaas", "erro": err.Error()}
	}
	return gin.H{"sucesso": true, "mensagem": "Conexão com a Asaas estabelecida com sucesso"}
}
