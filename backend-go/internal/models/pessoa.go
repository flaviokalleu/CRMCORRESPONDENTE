package models

import "time"

// Pessoa é o núcleo de identidade compartilhado pelas três fichas de papel
// (clientes, cliente_aluguels, proprietario). Guarda só o que identifica a
// pessoa; os campos de cada papel continuam na ficha correspondente.
//
// O papel NÃO é armazenado aqui: é derivado da existência de ficha apontando
// para esta pessoa. Ver docs/superpowers/specs/2026-09-06-unificacao-cadastros-design.md.
type Pessoa struct {
	ID       uint `gorm:"primaryKey" json:"id"`
	TenantID uint `gorm:"column:tenant_id;not null;index" json:"tenant_id"`

	Nome     string  `gorm:"column:nome;not null" json:"nome"`
	CPF      *string `gorm:"column:cpf" json:"cpf,omitempty"`
	Email    *string `gorm:"column:email" json:"email,omitempty"`
	Telefone *string `gorm:"column:telefone" json:"telefone,omitempty"`
	// Coluna real de DATE — diferente de Cliente.DataNascimento que é VARCHAR(10)
	// por razões legadas. Segue o padrão usado em ClienteAluguel, CobrancaAluguel, etc.
	DataNascimento *time.Time `gorm:"column:data_nascimento;type:date" json:"data_nascimento,omitempty"`

	CreatedAt time.Time `gorm:"column:created_at" json:"created_at"`
	UpdatedAt time.Time `gorm:"column:updated_at" json:"updated_at"`
}

func (Pessoa) TableName() string { return "pessoas" }

// Papeis descreve quais fichas existem para uma pessoa. Preenchido por
// consulta, não persistido.
type Papeis struct {
	Comprador    bool `json:"comprador"`
	Inquilino    bool `json:"inquilino"`
	Proprietario bool `json:"proprietario"`
}
