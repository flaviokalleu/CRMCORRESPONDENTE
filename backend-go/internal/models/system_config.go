package models

import "time"

// SystemConfig espelha a tabela `system_configs` — branding global do sistema
// (singleton, id=1). No Node (`models/SystemConfig.js`) o model existe mas NÃO
// era lido/gravado por rota alguma (`GET /api/configurations` devolvia JSON
// hardcoded). Na migração Go decidimos implementá-lo de fato (§"Configurações"
// item 1 do spec) como um singleton simples, mantendo compatibilidade com o
// shape esperado pelo frontend em `/api/configurations`.
type SystemConfig struct {
	ID            uint    `gorm:"primaryKey" json:"id"`
	NomeSistema   string  `gorm:"column:nome_sistema;default:CRM IMOB" json:"nome_sistema"`
	CorPrimaria   string  `gorm:"column:cor_primaria;default:#0B1426" json:"cor_primaria"`
	CorSecundaria string  `gorm:"column:cor_secundaria;default:#162a4a" json:"cor_secundaria"`
	CorTexto      string  `gorm:"column:cor_texto;default:#FFFFFF" json:"cor_texto"`
	LogoURL       *string `gorm:"column:logo_url" json:"logo_url,omitempty"`
	TemaEscuro    bool    `gorm:"column:tema_escuro;default:true" json:"tema_escuro"`

	CreatedAt time.Time `gorm:"column:created_at" json:"created_at"`
	UpdatedAt time.Time `gorm:"column:updated_at" json:"updated_at"`
}

func (SystemConfig) TableName() string { return "system_configs" }

// SystemConfigSingletonID é o id fixo do único registro de configuração global.
const SystemConfigSingletonID = 1
