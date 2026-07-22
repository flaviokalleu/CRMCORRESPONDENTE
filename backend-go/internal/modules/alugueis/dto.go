package alugueis

// AluguelRequest é o corpo (form-data, campos texto) de POST/PUT
// /api/alugueis. Fotos vêm em arquivos separados (foto_capa, fotos_adicionais).
type AluguelRequest struct {
	NomeImovel    string `form:"nome_imovel" json:"nome_imovel" binding:"required"`
	Descricao     string `form:"descricao" json:"descricao" binding:"required"`
	ValorAluguel  string `form:"valor_aluguel" json:"valor_aluguel" binding:"required"` // string: parseCurrencyValue (R$, milhar, vírgula)
	Quartos       int    `form:"quartos" json:"quartos"`
	Banheiro      int    `form:"banheiro" json:"banheiro"`
	DiaVencimento int    `form:"dia_vencimento" json:"dia_vencimento"`
}

// ClienteAluguelRequest é o corpo (form-data) de POST/PUT /api/clientealuguel.
// Reflete os campos do inquilino + fiador + vínculo com proprietário/corretor.
type ClienteAluguelRequest struct {
	Nome          string  `form:"nome" json:"nome" binding:"required"`
	CPF           string  `form:"cpf" json:"cpf"`
	Email         string  `form:"email" json:"email"`
	Telefone      string  `form:"telefone" json:"telefone"`
	ValorAluguel  float64 `form:"valor_aluguel" json:"valor_aluguel" binding:"required"`
	DiaVencimento int     `form:"dia_vencimento" json:"dia_vencimento" binding:"required"`

	AluguelID          *uint  `form:"aluguel_id" json:"aluguel_id"`
	DataInicioContrato string `form:"data_inicio_contrato" json:"data_inicio_contrato"` // YYYY-MM-DD
	DataFimContrato    string `form:"data_fim_contrato" json:"data_fim_contrato"`
	IndiceReajuste     string `form:"indice_reajuste" json:"indice_reajuste"`

	ProprietarioNome     string  `form:"proprietario_nome" json:"proprietario_nome"`
	ProprietarioTelefone string  `form:"proprietario_telefone" json:"proprietario_telefone"`
	ProprietarioPix      string  `form:"proprietario_pix" json:"proprietario_pix"`
	ProprietarioID       *uint   `form:"proprietario_id" json:"proprietario_id"`
	TaxaAdministracao    float64 `form:"taxa_administracao" json:"taxa_administracao"`

	CorretorPercentual float64 `form:"corretor_percentual" json:"corretor_percentual"`
	CorretorNome       string  `form:"corretor_nome" json:"corretor_nome"`
	CorretorPix        string  `form:"corretor_pix" json:"corretor_pix"`

	DataNascimento   string `form:"data_nascimento" json:"data_nascimento"`
	CidadeNascimento string `form:"cidade_nascimento" json:"cidade_nascimento"`

	TemFiador              bool   `form:"tem_fiador" json:"tem_fiador"`
	FiadorNome             string `form:"fiador_nome" json:"fiador_nome"`
	FiadorTelefone         string `form:"fiador_telefone" json:"fiador_telefone"`
	FiadorEmail            string `form:"fiador_email" json:"fiador_email"`
	FiadorCPF              string `form:"fiador_cpf" json:"fiador_cpf"`
	FiadorDataNascimento   string `form:"fiador_data_nascimento" json:"fiador_data_nascimento"`
	FiadorCidadeNascimento string `form:"fiador_cidade_nascimento" json:"fiador_cidade_nascimento"`
}

// PagamentoManualRequest é o corpo de POST /clientealuguel/:id/pagamento —
// append manual ao histórico embutido `historico_pagamentos`.
type PagamentoManualRequest struct {
	Data          string  `json:"data" binding:"required"`
	Valor         float64 `json:"valor" binding:"required"`
	Status        string  `json:"status"`
	FormaPagamento string `json:"forma_pagamento"`
}

// HistoricoPagamento é uma entrada do JSON embutido `historico_pagamentos`
// (id = epoch-millis, não é PK de tabela — ver 04-spec Gotcha 11).
type HistoricoPagamento struct {
	ID             int64   `json:"id"`
	Data           string  `json:"data"`
	Valor          float64 `json:"valor"`
	Status         string  `json:"status"`
	FormaPagamento string  `json:"forma_pagamento"`
}

// CobrancaAvulsaRequest é o corpo de POST /clientealuguel/:id/cobranca-avulsa.
type CobrancaAvulsaRequest struct {
	Valor          float64 `json:"valor" binding:"required"`
	DataVencimento string  `json:"data_vencimento" binding:"required"`
	Descricao      string  `json:"descricao"`
}
