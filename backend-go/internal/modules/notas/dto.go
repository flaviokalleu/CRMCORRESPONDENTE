package notas

import "time"

// CreateRequest replica o body de POST /api/notas (§2.4).
type CreateRequest struct {
	ClienteID   uint    `json:"cliente_id" binding:"required"`
	ProcessoID  *uint   `json:"processo_id"`
	Nova        *bool   `json:"nova"`
	Destinatario *string `json:"destinatario"`
	Texto       string  `json:"texto" binding:"required"`
	DataCriacao *time.Time `json:"data_criacao"`
	CriadoPorID *uint   `json:"criado_por_id"`
}

// ClienteNotaResponse é o shape de GET /clientes/:id/notas — nota + criador_nome.
type ClienteNotaResponse struct {
	ID           uint      `json:"id"`
	ClienteID    uint      `json:"cliente_id"`
	ProcessoID   *uint     `json:"processo_id"`
	Texto        string    `json:"texto"`
	Nova         *bool     `json:"nova"`
	Destinatario *string   `json:"destinatario"`
	DataCriacao  time.Time `json:"data_criacao"`
	CriadorNome  string    `json:"criador_nome"`
}
