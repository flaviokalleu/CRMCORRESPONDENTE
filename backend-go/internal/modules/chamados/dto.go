package chamados

// AbrirRequest é o corpo de POST /api/portal/chamados (inquilino logado).
type AbrirRequest struct {
	Titulo     string `json:"titulo" binding:"required"`
	Descricao  string `json:"descricao" binding:"required"`
	Categoria  string `json:"categoria"`
	Prioridade string `json:"prioridade"`
}

// AtualizarRequest é o corpo de PUT /api/chamados/:id (admin).
type AtualizarRequest struct {
	Status        string `json:"status"`
	RespostaAdmin string `json:"resposta_admin"`
}

// Resumo é a resposta de GET /api/chamados/resumo.
type Resumo struct {
	Total       int `json:"total"`
	Abertos     int `json:"abertos"`
	EmAndamento int `json:"em_andamento"`
	Resolvidos  int `json:"resolvidos"`
	Urgentes    int `json:"urgentes"`
}
