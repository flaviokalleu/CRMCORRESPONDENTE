// Package configuracoes implementa as camadas de configuração do cluster:
// (1) SystemConfig — branding global, hoje inerte no Node (§"Configurações"
// item 1) — implementado de fato aqui; (2) Tenant settings — config real e
// ativa (nome/cnpj/logo/asaas) já usada pelo frontend.
//
// NOTA DE WIRING: `/api/super-admin/metrics` já está implementado em
// internal/modules/superadmin (Handler.Metrics) — NÃO duplicado aqui.
package configuracoes

// SystemConfigRequest é o body de PUT /api/configurations (implementação real
// — o Node devolvia sempre `{theme:'dark', language:'pt-BR'}` hardcoded).
type SystemConfigRequest struct {
	NomeSistema   *string `json:"nome_sistema,omitempty"`
	CorPrimaria   *string `json:"cor_primaria,omitempty"`
	CorSecundaria *string `json:"cor_secundaria,omitempty"`
	CorTexto      *string `json:"cor_texto,omitempty"`
	LogoURL       *string `json:"logo_url,omitempty"`
	TemaEscuro    *bool   `json:"tema_escuro,omitempty"`
}

// TenantSettingsResponse é o subset de Tenant devolvido por GET /tenant-settings/settings.
type TenantSettingsResponse struct {
	ID            uint    `json:"id"`
	Nome          string  `json:"nome"`
	Slug          string  `json:"slug"`
	CNPJ          *string `json:"cnpj,omitempty"`
	Email         string  `json:"email"`
	Telefone      *string `json:"telefone,omitempty"`
	Logo          *string `json:"logo,omitempty"`
	Endereco      *string `json:"endereco,omitempty"`
	Cidade        *string `json:"cidade,omitempty"`
	Estado        *string `json:"estado,omitempty"`
	CEP           *string `json:"cep,omitempty"`
	Configuracoes any     `json:"configuracoes,omitempty"`
}

// TenantSettingsUpdateRequest é o body de PUT /tenant-settings/settings.
// `slug` é deliberadamente omitido — é imutável (spec §"Configurações" item 2).
type TenantSettingsUpdateRequest struct {
	Nome          *string `json:"nome,omitempty"`
	CNPJ          *string `json:"cnpj,omitempty"`
	Email         *string `json:"email,omitempty"`
	Telefone      *string `json:"telefone,omitempty"`
	Endereco      *string `json:"endereco,omitempty"`
	Cidade        *string `json:"cidade,omitempty"`
	Estado        *string `json:"estado,omitempty"`
	CEP           *string `json:"cep,omitempty"`
	Configuracoes any     `json:"configuracoes,omitempty"`
}

// AsaasSettingsResponse é o payload de GET /tenant-settings/settings/asaas
// (chave sempre mascarada — nunca devolvida em claro).
type AsaasSettingsResponse struct {
	AsaasAPIKeyConfigured bool   `json:"asaas_api_key_configured"`
	AsaasAPIKeyPreview    string `json:"asaas_api_key_preview,omitempty"`
	AsaasWebhookToken     string `json:"asaas_webhook_token,omitempty"`
	WebhookURL            string `json:"webhook_url"`
}

// AsaasSettingsUpdateRequest é o body de PUT /tenant-settings/settings/asaas.
// String vazia explícita apaga o valor (mesma semântica do Node).
type AsaasSettingsUpdateRequest struct {
	AsaasAPIKey       *string `json:"asaas_api_key,omitempty"`
	AsaasWebhookToken *string `json:"asaas_webhook_token,omitempty"`
}

// AsaasTestRequest é o body de POST /tenant-settings/settings/asaas/testar.
type AsaasTestRequest struct {
	AsaasAPIKey *string `json:"asaas_api_key,omitempty"`
}

func maskKey(key string) string {
	if len(key) <= 6 {
		return "******"
	}
	return "****" + key[len(key)-6:]
}
