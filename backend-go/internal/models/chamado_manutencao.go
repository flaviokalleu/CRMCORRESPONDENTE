package models

import (
	"time"

	"gorm.io/datatypes"
)

// ChamadoManutencao espelha `chamado_manutencaos` (pluralização "ingênua" do
// Sequelize — nome de tabela real, preservado via TableName). `underscored: true`.
type ChamadoManutencao struct {
	ID               uint    `gorm:"primaryKey" json:"id"`
	ClienteAluguelID uint    `gorm:"column:cliente_aluguel_id;not null;index" json:"cliente_aluguel_id"`
	AluguelID        *uint   `gorm:"column:aluguel_id;index" json:"aluguel_id,omitempty"`
	Titulo           string  `gorm:"column:titulo;not null" json:"titulo"`
	Descricao        string  `gorm:"column:descricao;not null" json:"descricao"`
	Categoria        *string `gorm:"column:categoria" json:"categoria,omitempty"`
	// Prioridade: baixa/media/alta/urgente
	Prioridade string `gorm:"column:prioridade;default:media" json:"prioridade"`
	// Status: aberto/em_andamento/resolvido
	Status         string         `gorm:"column:status;default:aberto" json:"status"`
	Fotos          datatypes.JSON `gorm:"column:fotos" json:"fotos,omitempty"`
	RespostaAdmin  *string        `gorm:"column:resposta_admin" json:"resposta_admin,omitempty"`
	DataResolucao  *time.Time     `gorm:"column:data_resolucao" json:"data_resolucao,omitempty"`

	// ⚠ Sem tenant_id — a tabela real (04-spec §Modelos) não tem essa coluna;
	// o isolamento de tenant deste cluster é feito via ClienteAluguel/Aluguel.
	CreatedAt time.Time `gorm:"column:created_at" json:"created_at"`
	UpdatedAt time.Time `gorm:"column:updated_at" json:"updated_at"`
}

func (ChamadoManutencao) TableName() string { return "chamado_manutencaos" }

// PrioridadeOrdem replica o `CASE` SQL do Node para ordenar por prioridade
// (urgente > alta > media > outros).
func PrioridadeOrdem(p string) int {
	switch p {
	case "urgente":
		return 0
	case "alta":
		return 1
	case "media":
		return 2
	default:
		return 3
	}
}
