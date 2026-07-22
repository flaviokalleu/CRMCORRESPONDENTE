package models

import (
	"time"

	"gorm.io/datatypes"
)

// Imovel espelha a tabela `imoveis`. ⚠️ Timestamps em camelCase (createdAt/
// updatedAt) — divergência deliberada do resto do projeto (que usa created_at/
// updated_at), preservada 1:1 do model Sequelize original (`underscored: false`).
// Ver docs/migration/02-clientes-imoveis-uploads.md §4.1.
type Imovel struct {
	ID uint `gorm:"primaryKey" json:"id"`

	NomeImovel      string  `gorm:"column:nome_imovel;not null" json:"nome_imovel"`
	DescricaoImovel *string `gorm:"column:descricao_imovel" json:"descricao_imovel"`
	Endereco        string  `gorm:"column:endereco;not null" json:"endereco"`
	Tipo            string  `gorm:"column:tipo;not null" json:"tipo"`
	Quartos         int     `gorm:"column:quartos;not null" json:"quartos"`
	Banheiro        int     `gorm:"column:banheiro;not null" json:"banheiro"`
	Tags            *string `gorm:"column:tags" json:"tags"`
	ValorAvaliacao  *float64 `gorm:"column:valor_avaliacao" json:"valor_avaliacao"`
	ValorVenda      float64 `gorm:"column:valor_venda;not null" json:"valor_venda"`
	Documentacao    *string `gorm:"column:documentacao" json:"documentacao"`
	// Imagens é um array de caminhos (webp) armazenado como JSON — equivalente ao
	// DataType.JSON do Sequelize.
	Imagens        datatypes.JSON `gorm:"column:imagens" json:"imagens"`
	ImagemCapa     *string        `gorm:"column:imagem_capa" json:"imagem_capa"`
	Localizacao    *string        `gorm:"column:localizacao" json:"localizacao"`
	Exclusivo      bool           `gorm:"column:exclusivo;not null" json:"exclusivo"`
	TemInquilino   bool           `gorm:"column:tem_inquilino;not null" json:"tem_inquilino"`
	SituacaoImovel string         `gorm:"column:situacao_imovel;not null" json:"situacao_imovel"`
	Observacoes    *string        `gorm:"column:observacoes" json:"observacoes"`
	TenantID       *uint          `gorm:"column:tenant_id;index" json:"tenant_id"`

	// Timestamps camelCase — divergência preservada do model Node original.
	CreatedAt time.Time `gorm:"column:createdAt" json:"createdAt"`
	UpdatedAt time.Time `gorm:"column:updatedAt" json:"updatedAt"`
}

func (Imovel) TableName() string { return "imoveis" }
