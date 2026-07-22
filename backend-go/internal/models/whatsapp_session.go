package models

import "time"

// WhatsappSession espelha (apenas para METADADOS) a tabela `whatsapp_sessions`
// legada do Node. DECISÃO DE ARQUITETURA (ver docs/migration/05-whatsapp-realtime-jobs.md
// §"Store recomendado em Go" e gotcha #2):
//
//   - As credenciais Baileys (coluna `data` JSONB, formato BufferJSON com noiseKey/
//     signedIdentityKey/registrationId/chaves Signal) NÃO são compatíveis com o
//     formato que whatsmeow usa internamente. Não existe migração automática —
//     não há adapter que converta um para o outro.
//   - Por isso este backend Go ADOTA o `sqlstore` nativo do whatsmeow
//     (go.mau.fi/whatsmeow/store/sqlstore) como fonte de verdade do pareamento.
//     O sqlstore cria e gerencia suas PRÓPRIAS tabelas (`whatsmeow_device`,
//     `whatsmeow_identity_keys`, `whatsmeow_sessions`, `whatsmeow_app_state_*` etc.)
//     via o `container.Upgrade(ctx)` interno dele — não usamos GORM AutoMigrate
//     nem golang-migrate para essas tabelas, e não escrevemos Go struct para elas.
//   - Todo tenant que migrar do Node PRECISA reescanear o QR Code (rescan
//     obrigatório) — não há caminho de dados que preserve a sessão autenticada.
//   - Esta struct `WhatsappSession` continua existindo apenas para guardar
//     METADADOS de alto nível por tenant (status observável, telefone conectado,
//     última atividade) — útil para listagens/dashboards sem precisar ler direto
//     as tabelas internas do whatsmeow. O campo `Data` (JSONB) do Node foi
//     DELIBERADAMENTE OMITIDO aqui: não há mais credenciais para guardar nesta
//     tabela, o whatsmeow cuida disso sozinho.
//
// Tabela: `whatsapp_sessions` (reaproveita o nome legado, mas com colunas
// reduzidas — ver migração correspondente, se necessária, a cargo de quem cuidar
// do schema; este pacote apenas define o mapeamento GORM).
type WhatsappSession struct {
	// ID = storedSessionId, no padrão herdado do Node: "tenant_{tenantId}__{sessionId}".
	// Mantido como STRING PK para preservar compatibilidade de leitura com dados
	// legados de metadados, e para bater com o "public session id" usado nos
	// endpoints REST (ver internal/integrations/whatsapp/client.go).
	ID string `gorm:"column:id;primaryKey" json:"id"`

	TenantID uint `gorm:"column:tenant_id;index" json:"tenant_id"`

	// SessionID "público" (sem o prefixo tenant_{id}__), o mesmo mostrado ao frontend.
	SessionID string `gorm:"column:session_id" json:"session_id"`

	// Status ∈ active | inactive | connecting | error (mesmo enum do Node).
	Status string `gorm:"column:status;default:inactive" json:"status"`

	PhoneNumber *string `gorm:"column:phone_number" json:"phone_number,omitempty"`

	// DeviceJID guarda o JID (types.JID.String(), ex. "5561999999999.0:1@s.whatsapp.net")
	// do device pareado no sqlstore do whatsmeow, para reidratar o
	// *whatsmeow.Client correto no boot via container.GetDevice(jid) sem
	// precisar reescanear o QR a cada restart do processo Go.
	DeviceJID *string `gorm:"column:device_jid" json:"device_jid,omitempty"`

	IsAuthenticated bool `gorm:"column:is_authenticated;default:false" json:"is_authenticated"`

	LastActivity *time.Time `gorm:"column:last_activity" json:"last_activity,omitempty"`

	// LastError guarda a última mensagem de erro de conexão, exibida em telas de
	// diagnóstico (equivalente ao status='error' do Node, mas com detalhe extra).
	LastError *string `gorm:"column:last_error" json:"last_error,omitempty"`

	CreatedAt time.Time `gorm:"column:created_at" json:"created_at"`
	UpdatedAt time.Time `gorm:"column:updated_at" json:"updated_at"`
}

func (WhatsappSession) TableName() string { return "whatsapp_sessions" }

// Constantes de status — espelham o ENUM do Node.
const (
	WhatsappStatusActive     = "active"
	WhatsappStatusInactive   = "inactive"
	WhatsappStatusConnecting = "connecting"
	WhatsappStatusError      = "error"
)
