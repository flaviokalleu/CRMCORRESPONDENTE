package models

import "time"

// ClienteDocumento é um arquivo enviado para um cliente — uma linha por arquivo.
//
// O modelo antigo guardava um único caminho por tipo em `clientes`
// (documentos_pessoais, extrato_bancario, …), o que fazia o segundo envio do
// mesmo tipo sobrescrever o primeiro: as duas faces de um RG não cabiam. Aqui
// cada arquivo tem identidade própria, então dá para listar, baixar e remover
// um sem tocar nos outros.
//
// As colunas antigas continuam existindo e passam a apontar para o PDF
// consolidado do tipo — quem já lia `cliente.documentos_pessoais` segue lendo.
type ClienteDocumento struct {
	ID       uint `gorm:"primaryKey" json:"id"`
	ClienteID uint `gorm:"column:cliente_id;index" json:"cliente_id"`
	TenantID  uint `gorm:"column:tenant_id" json:"tenant_id"`

	// Tipo é a chave de DocumentTypeMap ("documentosPessoais", …), não o nome
	// da coluna — é o que as rotas recebem em :tipo.
	Tipo  string `gorm:"column:tipo" json:"tipo"`
	Ordem int    `gorm:"column:ordem" json:"ordem"`

	NomeOriginal string `gorm:"column:nome_original" json:"nome_original"`
	Caminho      string `gorm:"column:caminho" json:"-"` // relativo a UploadsRoot(); nunca exposto
	Mime         string `gorm:"column:mime" json:"mime"`

	// Bytes é o tamanho depois de otimizar; BytesOrigem, o que chegou. Guardar
	// os dois é o que permite mostrar a economia e reconciliar o contador de
	// storage do tenant sem reprocessar arquivo.
	Bytes       int64 `gorm:"column:bytes" json:"bytes"`
	BytesOrigem int64 `gorm:"column:bytes_origem" json:"bytes_origem"`
	Paginas     int   `gorm:"column:paginas" json:"paginas"`

	CreatedAt time.Time `gorm:"column:created_at" json:"created_at"`
	UpdatedAt time.Time `gorm:"column:updated_at" json:"updated_at"`
}

func (ClienteDocumento) TableName() string { return "cliente_documentos" }

// EhImagem diz se o arquivo é uma imagem — usado para decidir se ele vira
// página de PDF por importação ou se é concatenado como PDF.
func (d ClienteDocumento) EhImagem() bool {
	switch d.Mime {
	case "image/jpeg", "image/png", "image/gif", "image/webp", "image/tiff":
		return true
	}
	return false
}
