package portalinquilino

// LoginRequest é o corpo de POST /api/portal/login.
type LoginRequest struct {
	CPF string `json:"cpf" binding:"required"`
}

// LoginResponse é a resposta de login (contrato preservado 1:1 com o Node).
type LoginResponse struct {
	Token string `json:"token"`
	Nome  string `json:"nome"`
	Email string `json:"email"`
}

// MeusDadosResponse é a resposta de GET /api/portal/meus-dados.
type MeusDadosResponse struct {
	Inquilino any  `json:"inquilino"`
	Imovel    any  `json:"imovel,omitempty"`
	EmAtraso  bool `json:"em_atraso"`
}

// AbrirChamadoRequest é o corpo de POST /api/portal/chamados (delegado ao
// módulo chamados, que consome AuthInquilino deste pacote).
type AbrirChamadoRequest struct {
	Titulo      string `json:"titulo" binding:"required"`
	Descricao   string `json:"descricao" binding:"required"`
	Categoria   string `json:"categoria"`
	Prioridade  string `json:"prioridade"`
}
