package imoveis

// ImovelInput replica os campos multipart aceitos em POST/PUT (§2.3). Valores
// numéricos/booleanos chegam como string no form e são convertidos no service.
type ImovelInput struct {
	NomeImovel      *string
	DescricaoImovel *string
	Endereco        *string
	Tipo            *string
	Quartos         *string
	Banheiro        *string
	Tags            *string
	ValorAvaliacao  *string
	ValorVenda      *string
	Localizacao     *string
	Exclusivo       *string
	TemInquilino    *string
	SituacaoImovel  *string
	Observacoes     *string
}
