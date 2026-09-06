package models

import "time"

// Nota espelha a tabela `notas`. O model Sequelize original NÃO declarava
// `nova`/`destinatario`, mas o código das rotas (notas.js/notasController) os
// usa — presumimos colunas reais na tabela (ver spec §4.2/§6.11). Se a migration
// real não tiver essas colunas, remover os campos ou marcá-los com `gorm:"-"`.
//
// Timestamps: createdAt está mapeado para a coluna `data_criacao` (nome custom
// do Sequelize), updatedAt para `updated_at`.
type Nota struct {
	ID           uint    `gorm:"primaryKey" json:"id"`
	TenantID     *uint   `gorm:"column:tenant_id;index" json:"tenant_id,omitempty"`
	ClienteID    uint    `gorm:"column:cliente_id;not null;index" json:"cliente_id"`
	ProcessoID   *uint   `gorm:"column:processo_id" json:"processo_id"`
	Texto        string  `gorm:"column:texto;not null" json:"texto"`
	CriadoPorID  *uint   `gorm:"column:criado_por_id" json:"criado_por_id"`
	Nova         *bool   `gorm:"column:nova;default:true" json:"nova"`
	Destinatario *string `gorm:"column:destinatario" json:"destinatario"`

	DataCriacao time.Time `gorm:"column:data_criacao" json:"data_criacao"`
	UpdatedAt   time.Time `gorm:"column:updated_at" json:"updated_at"`

	// Associações (não persistidas)
	Cliente *Cliente `gorm:"foreignKey:ClienteID;references:ID" json:"cliente,omitempty"`
	Criador *User    `gorm:"foreignKey:CriadoPorID;references:ID" json:"criador,omitempty"`
}

func (Nota) TableName() string { return "notas" }
