package tenants

import (
	"gorm.io/datatypes"

	"crmimob/internal/models"
	"crmimob/internal/modules/users"
)

// EmpresaInput / AdminInput são os blocos aninhados do onboarding. O Node
// também aceitava aliases legados no nível raiz (`empresa_nome`, `admin_email`
// etc.) — RegisterRequest.Normalize() concilia as duas formas. Ver 01-spec §2.2.
type EmpresaInput struct {
	Nome     string `json:"nome"`
	Slug     string `json:"slug"`
	CNPJ     string `json:"cnpj"`
	Email    string `json:"email"`
	Telefone string `json:"telefone"`
}

type AdminInput struct {
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	Email     string `json:"email"`
	Password  string `json:"password"`
	Telefone  string `json:"telefone"`
}

// RegisterRequest — POST /api/tenant/register.
type RegisterRequest struct {
	Empresa *EmpresaInput `json:"empresa"`
	Admin   *AdminInput   `json:"admin"`
	PlanID  *uint         `json:"plan_id"`
	PlanSlug *string      `json:"plan_slug"`

	// Aliases legados (nível raiz) — ver 01-spec §2.2.
	EmpresaNome     string `json:"empresa_nome"`
	EmpresaSlug     string `json:"empresa_slug"`
	EmpresaCNPJ     string `json:"empresa_cnpj"`
	EmpresaEmail    string `json:"empresa_email"`
	EmpresaTelefone string `json:"empresa_telefone"`

	AdminFirstName string `json:"admin_first_name"`
	AdminLastName  string `json:"admin_last_name"`
	AdminEmail     string `json:"admin_email"`
	AdminPassword  string `json:"admin_password"`
	AdminTelefone  string `json:"admin_telefone"`
}

// Normalize concilia os aliases legados com os blocos aninhados, preenchendo
// Empresa/Admin quando ausentes.
func (r *RegisterRequest) Normalize() {
	if r.Empresa == nil {
		r.Empresa = &EmpresaInput{
			Nome: r.EmpresaNome, Slug: r.EmpresaSlug, CNPJ: r.EmpresaCNPJ,
			Email: r.EmpresaEmail, Telefone: r.EmpresaTelefone,
		}
	}
	if r.Admin == nil {
		r.Admin = &AdminInput{
			FirstName: r.AdminFirstName, LastName: r.AdminLastName, Email: r.AdminEmail,
			Password: r.AdminPassword, Telefone: r.AdminTelefone,
		}
	}
}

type RegisterResponse struct {
	Message      string             `json:"message"`
	Token        string             `json:"token"`
	RefreshToken string             `json:"refreshToken"`
	Tenant       *models.Tenant     `json:"tenant"`
	User         users.Response     `json:"user"`
	Subscription *models.Subscription `json:"subscription"`
}

type CheckSlugResponse struct {
	Available bool `json:"available"`
}

// ChangePlanRequest — POST /api/tenant/change-plan (admin do próprio tenant).
type ChangePlanRequest struct {
	PlanID uint `json:"planId" binding:"required"`
}

// SettingsResponse — GET /api/tenant-settings/settings.
type SettingsResponse struct {
	ID            uint           `json:"id"`
	Nome          string         `json:"nome"`
	Slug          string         `json:"slug"`
	CNPJ          *string        `json:"cnpj,omitempty"`
	Email         string         `json:"email"`
	Telefone      *string        `json:"telefone,omitempty"`
	Logo          *string        `json:"logo,omitempty"`
	Configuracoes datatypes.JSON `json:"configuracoes"`
	Endereco      *string        `json:"endereco,omitempty"`
	Cidade        *string        `json:"cidade,omitempty"`
	Estado        *string        `json:"estado,omitempty"`
	CEP           *string        `json:"cep,omitempty"`
}

func ToSettingsResponse(t *models.Tenant) SettingsResponse {
	return SettingsResponse{
		ID: t.ID, Nome: t.Nome, Slug: t.Slug, CNPJ: t.CNPJ, Email: t.Email, Telefone: t.Telefone,
		Logo: t.Logo, Configuracoes: t.Configuracoes, Endereco: t.Endereco, Cidade: t.Cidade,
		Estado: t.Estado, CEP: t.CEP,
	}
}

// UpdateSettingsRequest — PUT /api/tenant-settings/settings. Slug é imutável
// (não faz parte do allow-list) — ver 01-spec §2.4.
type UpdateSettingsRequest struct {
	Nome          *string         `json:"nome"`
	CNPJ          *string         `json:"cnpj"`
	Email         *string         `json:"email"`
	Telefone      *string         `json:"telefone"`
	Endereco      *string         `json:"endereco"`
	Cidade        *string         `json:"cidade"`
	Estado        *string         `json:"estado"`
	CEP           *string         `json:"cep"`
	Configuracoes *datatypes.JSON `json:"configuracoes"`
}

func (r UpdateSettingsRequest) ToUpdates() map[string]any {
	m := map[string]any{}
	if r.Nome != nil {
		m["nome"] = *r.Nome
	}
	if r.CNPJ != nil {
		m["cnpj"] = *r.CNPJ
	}
	if r.Email != nil {
		m["email"] = *r.Email
	}
	if r.Telefone != nil {
		m["telefone"] = *r.Telefone
	}
	if r.Endereco != nil {
		m["endereco"] = *r.Endereco
	}
	if r.Cidade != nil {
		m["cidade"] = *r.Cidade
	}
	if r.Estado != nil {
		m["estado"] = *r.Estado
	}
	if r.CEP != nil {
		m["cep"] = *r.CEP
	}
	if r.Configuracoes != nil {
		m["configuracoes"] = *r.Configuracoes
	}
	return m
}

// AsaasSettingsResponse — GET /api/tenant-settings/settings/asaas (chave mascarada).
type AsaasSettingsResponse struct {
	AsaasAPIKeyConfigured bool    `json:"asaas_api_key_configured"`
	AsaasAPIKeyPreview    *string `json:"asaas_api_key_preview,omitempty"`
	AsaasWebhookToken     *string `json:"asaas_webhook_token,omitempty"`
	WebhookURL            string  `json:"webhook_url"`
}

// UpdateAsaasRequest — PUT /api/tenant-settings/settings/asaas. String vazia
// apaga (→NULL), ver 01-spec §2.4.
type UpdateAsaasRequest struct {
	AsaasAPIKey       *string `json:"asaas_api_key"`
	AsaasWebhookToken *string `json:"asaas_webhook_token"`
}

type TestAsaasRequest struct {
	AsaasAPIKey *string `json:"asaas_api_key"`
}
