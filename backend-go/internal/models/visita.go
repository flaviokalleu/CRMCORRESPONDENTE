package models

import "time"

// Visita espelha a tabela `visitas` — agendamento de visita de cliente a imóvel.
// Ver docs/migration/06-dashboards-vendas-config.md §"Visitas".
//
// GOTCHA (§9): o Node não checava dono em PUT/DELETE — no Go a autorização por
// tenant é garantida pelo escopo GORM (WithContext), mas o handler ainda deve
// aplicar a regra de negócio adicional quando exigida pelo produto.
type Visita struct {
	ID uint `gorm:"primaryKey" json:"id"`

	ClienteID    uint  `gorm:"column:cliente_id;index;not null" json:"cliente_id"`
	ImovelID     uint  `gorm:"column:imovel_id;index;not null" json:"imovel_id"`
	CorretorID   *uint `gorm:"column:corretor_id;index" json:"corretor_id,omitempty"`
	CriadoPorID  uint  `gorm:"column:criado_por_id;index" json:"criado_por_id"`
	TenantID     *uint `gorm:"column:tenant_id;index" json:"tenant_id,omitempty"`

	DataVisita time.Time `gorm:"column:data_visita" json:"data_visita"`
	Status     string    `gorm:"column:status;default:agendada" json:"status"`

	Observacoes     *string `gorm:"column:observacoes" json:"observacoes,omitempty"`
	FeedbackCliente *string `gorm:"column:feedback_cliente" json:"feedback_cliente,omitempty"`
	NotaAvaliacao   *int    `gorm:"column:nota_avaliacao" json:"nota_avaliacao,omitempty"` // 1-5

	CreatedAt time.Time `gorm:"column:created_at" json:"created_at"`
	UpdatedAt time.Time `gorm:"column:updated_at" json:"updated_at"`

	Cliente  *Cliente `gorm:"foreignKey:ClienteID;references:ID" json:"cliente,omitempty"`
	Imovel   *Imovel  `gorm:"foreignKey:ImovelID;references:ID" json:"imovel,omitempty"`
	Corretor *User    `gorm:"foreignKey:CorretorID;references:ID" json:"corretor,omitempty"`
}

func (Visita) TableName() string { return "visitas" }

// Status possíveis de uma visita.
const (
	VisitaStatusAgendada  = "agendada"
	VisitaStatusRealizada = "realizada"
	VisitaStatusCancelada = "cancelada"
	VisitaStatusReagendada = "reagendada"
)

var visitaStatusValidos = []string{
	VisitaStatusAgendada, VisitaStatusRealizada, VisitaStatusCancelada, VisitaStatusReagendada,
}

// IsVisitaStatusValido confere se o status pertence ao enum de visitas.
func IsVisitaStatusValido(status string) bool {
	for _, s := range visitaStatusValidos {
		if s == status {
			return true
		}
	}
	return false
}
