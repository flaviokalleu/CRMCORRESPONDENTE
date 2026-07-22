package models

import (
	"time"

	"gorm.io/datatypes"
)

// VistoriaAluguel espelha `vistoria_aluguels` (`underscored: true`). Vistoria de
// entrada/saída do imóvel, com checklist estruturado e fotos anexadas.
type VistoriaAluguel struct {
	ID               uint    `gorm:"primaryKey" json:"id"`
	ClienteAluguelID uint    `gorm:"column:cliente_aluguel_id;not null;index" json:"cliente_aluguel_id"`
	AluguelID        *uint   `gorm:"column:aluguel_id;index" json:"aluguel_id,omitempty"`
	// Tipo: entrada/saida
	Tipo              string         `gorm:"column:tipo;default:entrada" json:"tipo"`
	DataVistoria      time.Time      `gorm:"column:data_vistoria;type:date;not null" json:"data_vistoria"`
	ObservacoesGerais *string        `gorm:"column:observacoes_gerais" json:"observacoes_gerais,omitempty"`
	Checklist         datatypes.JSON `gorm:"column:checklist" json:"checklist,omitempty"`
	Fotos             datatypes.JSON `gorm:"column:fotos" json:"fotos,omitempty"`
	PdfURL            *string        `gorm:"column:pdf_url" json:"pdf_url,omitempty"`
	// Status: rascunho/finalizado
	Status string `gorm:"column:status;default:rascunho" json:"status"`

	// ⚠ Sem tenant_id — a tabela real (04-spec §Modelos) não tem essa coluna;
	// o isolamento de tenant deste cluster é feito via ClienteAluguel/Aluguel.
	CreatedAt time.Time `gorm:"column:created_at" json:"created_at"`
	UpdatedAt time.Time `gorm:"column:updated_at" json:"updated_at"`
}

func (VistoriaAluguel) TableName() string { return "vistoria_aluguels" }

// ChecklistItem é uma entrada do checklist padrão (7 cômodos x 8 itens).
type ChecklistItem struct {
	Comodo      string `json:"comodo"`
	Item        string `json:"item"`
	Estado      string `json:"estado"` // bom/regular/ruim
	Observacao  string `json:"observacao,omitempty"`
}

// FotoVistoria é uma entrada do JSON `fotos`.
type FotoVistoria struct {
	URL       string `json:"url"`
	Descricao string `json:"descricao,omitempty"`
	Comodo    string `json:"comodo,omitempty"`
}
