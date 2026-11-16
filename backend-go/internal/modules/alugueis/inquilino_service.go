package alugueis

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"gorm.io/datatypes"

	"crmimob/internal/models"
	"crmimob/internal/validacao"
)

// InquilinoService implementa o CRUD de ClienteAluguel (inquilino) + a
// integração best-effort com Asaas (assinatura recorrente) + cobranças.
// Ver 04-spec §2.
type InquilinoService struct {
	repo  *Repository
	asaas AsaasClient // nunca nil — usar NoopAsaasClient{} até a integração real
}

func NewInquilinoService(repo *Repository, asaas AsaasClient) *InquilinoService {
	if asaas == nil {
		asaas = NoopAsaasClient{}
	}
	return &InquilinoService{repo: repo, asaas: asaas}
}

func (s *InquilinoService) List(ctx context.Context) ([]models.ClienteAluguel, error) {
	return s.repo.ListInquilinos(ctx)
}

func (s *InquilinoService) FindByID(ctx context.Context, id uint) (*models.ClienteAluguel, error) {
	c, err := s.repo.FindInquilinoByID(ctx, id)
	if err != nil {
		return nil, ErrNotFound
	}
	return c, nil
}

func parseDatePtr(s string) *time.Time {
	if s == "" {
		return nil
	}
	t, err := time.Parse("2006-01-02", s)
	if err != nil {
		return nil
	}
	return &t
}

// validarInquilino confere o cadastro (antes: CPF/telefone/data inválidos
// eram gravados ou viravam nulo em silêncio; texto longo dava 500).
func validarInquilino(req ClienteAluguelRequest) *validacao.ErroCampo {
	e := validacao.Primeiro(
		validacao.Texto("nome", req.Nome, "Nome do inquilino", true),
		validacao.CPF("cpf", req.CPF),
		validacao.EmailOpcional("email", req.Email),
		validacao.TelefoneOpcional("telefone", req.Telefone),
		validacao.Data("data_nascimento", req.DataNascimento, "Data de nascimento"),
		validacao.Texto("cidade_nascimento", req.CidadeNascimento, "Cidade de nascimento", false),
		validacao.Data("data_inicio_contrato", req.DataInicioContrato, "Início do contrato"),
		validacao.Data("data_fim_contrato", req.DataFimContrato, "Fim do contrato"),
		validacao.Texto("proprietario_nome", req.ProprietarioNome, "Nome do proprietário", false),
		validacao.TelefoneOpcional("proprietario_telefone", req.ProprietarioTelefone),
		validacao.Texto("proprietario_pix", req.ProprietarioPix, "Pix do proprietário", false),
		validacao.Texto("corretor_nome", req.CorretorNome, "Nome do corretor", false),
		validacao.Texto("corretor_pix", req.CorretorPix, "Pix do corretor", false),
	)
	if e != nil {
		return e
	}
	if req.ValorAluguel <= 0 {
		return &validacao.ErroCampo{Campo: "valor_aluguel", Mensagem: "Informe o valor do aluguel."}
	}
	if req.ValorAluguel > 99999999 {
		return &validacao.ErroCampo{Campo: "valor_aluguel", Mensagem: "Valor do aluguel alto demais. Confira o número."}
	}
	if e := validacao.Faixa("dia_vencimento", req.DiaVencimento, "Dia do vencimento", 1, 31); e != nil {
		return e
	}
	if req.TaxaAdministracao < 0 || req.TaxaAdministracao > 100 {
		return &validacao.ErroCampo{Campo: "taxa_administracao", Mensagem: "Taxa de administração: use de 0 a 100%."}
	}
	if req.CorretorPercentual < 0 || req.CorretorPercentual > 100 {
		return &validacao.ErroCampo{Campo: "corretor_percentual", Mensagem: "Comissão do corretor: use de 0 a 100%."}
	}
	switch req.IndiceReajuste {
	case "", "IGPM", "IPCA", "INPC", "IGP-M":
	default:
		return &validacao.ErroCampo{Campo: "indice_reajuste", Mensagem: "Escolha IGP-M, IPCA ou INPC."}
	}
	if ini, fim := parseDatePtr(req.DataInicioContrato), parseDatePtr(req.DataFimContrato); ini != nil && fim != nil && !fim.After(*ini) {
		return &validacao.ErroCampo{Campo: "data_fim_contrato", Mensagem: "O fim do contrato precisa ser depois do início."}
	}
	if req.TemFiador {
		if e := validacao.Primeiro(
			validacao.Texto("fiador_nome", req.FiadorNome, "Nome do fiador", true),
			validacao.CPF("fiador_cpf", req.FiadorCPF),
			validacao.EmailOpcional("fiador_email", req.FiadorEmail),
			validacao.TelefoneOpcional("fiador_telefone", req.FiadorTelefone),
			validacao.Data("fiador_data_nascimento", req.FiadorDataNascimento, "Nascimento do fiador"),
			validacao.Texto("fiador_cidade_nascimento", req.FiadorCidadeNascimento, "Cidade do fiador", false),
		); e != nil {
			return e
		}
	}
	return nil
}

func fromReq(req ClienteAluguelRequest) *models.ClienteAluguel {
	c := &models.ClienteAluguel{
		Nome:               req.Nome,
		ValorAluguel:       req.ValorAluguel,
		DiaVencimento:      req.DiaVencimento,
		AluguelID:          req.AluguelID,
		DataInicioContrato: parseDatePtr(req.DataInicioContrato),
		DataFimContrato:    parseDatePtr(req.DataFimContrato),
		ProprietarioID:     req.ProprietarioID,
		TaxaAdministracao:  req.TaxaAdministracao,
		CorretorPercentual: req.CorretorPercentual,
		DataNascimento:     parseDatePtr(req.DataNascimento),
		TemFiador:          req.TemFiador,
	}
	if req.CPF != "" {
		c.CPF = &req.CPF
	}
	if req.Email != "" {
		c.Email = &req.Email
	}
	if req.Telefone != "" {
		c.Telefone = &req.Telefone
	}
	if req.IndiceReajuste != "" {
		c.IndiceReajuste = req.IndiceReajuste
	} else {
		c.IndiceReajuste = "IGPM"
	}
	if req.CidadeNascimento != "" {
		c.CidadeNascimento = &req.CidadeNascimento
	}
	if req.ProprietarioNome != "" {
		c.ProprietarioNome = &req.ProprietarioNome
	}
	if req.ProprietarioTelefone != "" {
		c.ProprietarioTelefone = &req.ProprietarioTelefone
	}
	if req.ProprietarioPix != "" {
		c.ProprietarioPix = &req.ProprietarioPix
	}
	if req.CorretorNome != "" {
		c.CorretorNome = &req.CorretorNome
	}
	if req.CorretorPix != "" {
		c.CorretorPix = &req.CorretorPix
	}
	if req.FiadorNome != "" {
		c.FiadorNome = &req.FiadorNome
	}
	if req.FiadorTelefone != "" {
		c.FiadorTelefone = &req.FiadorTelefone
	}
	if req.FiadorEmail != "" {
		c.FiadorEmail = &req.FiadorEmail
	}
	if req.FiadorCPF != "" {
		c.FiadorCPF = &req.FiadorCPF
	}
	if req.FiadorCidadeNascimento != "" {
		c.FiadorCidadeNascimento = &req.FiadorCidadeNascimento
	}
	c.FiadorDataNascimento = parseDatePtr(req.FiadorDataNascimento)
	if c.TaxaAdministracao == 0 {
		c.TaxaAdministracao = 10.00
	}
	return c
}

// asaasAPIKeyFor resolve a chave Asaas do tenant (assinatura injetada pelo
// chamador — ver handler, que lê req.tenant.asaas_api_key). Mantido como
// parâmetro explícito para não acoplar este service ao modelo Tenant.
func (s *InquilinoService) Create(ctx context.Context, req ClienteAluguelRequest, tenantID *uint, asaasAPIKey string) (*models.ClienteAluguel, error) {
	if e := validarInquilino(req); e != nil {
		return nil, e
	}
	c := fromReq(req)
	c.TenantID = tenantID
	c.HistoricoPagamentos = datatypes.JSON([]byte("[]"))

	if err := s.repo.CreateInquilino(ctx, c); err != nil {
		return nil, err
	}

	// Integração Asaas best-effort: falha NÃO bloqueia a criação do inquilino
	// (04-spec §2, POST /clientealuguel).
	if asaasAPIKey != "" {
		cust, err := s.asaas.CriarCliente(asaasAPIKey, c.Nome, deref(c.CPF), deref(c.Email), deref(c.Telefone))
		if err == nil && cust != nil {
			proximo := CalcularProximoVencimento(c.DiaVencimento, time.Now())
			sub, err := s.asaas.CriarAssinatura(asaasAPIKey, cust.ID, c.ValorAluguel, proximo, "Aluguel - "+c.Nome)
			if err == nil && sub != nil {
				c.AsaasCustomerID = &cust.ID
				c.AsaasSubscriptionID = &sub.ID
				status := "ACTIVE"
				c.AsaasSubscriptionStatus = &status
				_ = s.repo.SaveInquilino(ctx, c)
			}
		}
		// erro silencioso — inquilino permanece sem Asaas, igual ao Node.
	}

	return c, nil
}

func deref(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

// Update aplica update parcial (campos vazios/zero são ignorados, igual ao
// helper `f()` do Node) e propaga mudança de valor_aluguel para a assinatura
// Asaas, se houver.
func (s *InquilinoService) Update(ctx context.Context, id uint, req ClienteAluguelRequest, asaasAPIKey string) (*models.ClienteAluguel, error) {
	c, err := s.repo.FindInquilinoByID(ctx, id)
	if err != nil {
		return nil, ErrNotFound
	}

	if e := validarInquilino(req); e != nil {
		return nil, e
	}
	valorAnterior := c.ValorAluguel
	novo := fromReq(req)
	// Campos que o formulário não manda: antes eram zerados a cada edição
	// (contrato gerado, documentos anexados, pago, multa/juros).
	novo.Pago = c.Pago
	novo.PercentualMulta = c.PercentualMulta
	novo.PercentualJurosMora = c.PercentualJurosMora
	novo.ContratoPath = c.ContratoPath
	novo.ContratoDocumentos = c.ContratoDocumentos
	if req.AluguelID == nil {
		novo.AluguelID = c.AluguelID
	}
	if req.ProprietarioID == nil {
		novo.ProprietarioID = c.ProprietarioID
	}
	novo.ID = c.ID
	novo.TenantID = c.TenantID
	novo.HistoricoPagamentos = c.HistoricoPagamentos
	novo.AsaasCustomerID = c.AsaasCustomerID
	novo.AsaasSubscriptionID = c.AsaasSubscriptionID
	novo.AsaasSubscriptionStatus = c.AsaasSubscriptionStatus
	novo.ScoreInquilino = c.ScoreInquilino
	novo.ScoreDetalhes = c.ScoreDetalhes
	novo.ScoreAtualizadoEm = c.ScoreAtualizadoEm
	novo.CreatedAt = c.CreatedAt

	if err := s.repo.SaveInquilino(ctx, novo); err != nil {
		return nil, err
	}

	if novo.ValorAluguel != valorAnterior && novo.AsaasSubscriptionID != nil && asaasAPIKey != "" {
		_ = s.asaas.AtualizarAssinatura(asaasAPIKey, *novo.AsaasSubscriptionID, novo.ValorAluguel)
	}

	return novo, nil
}

func (s *InquilinoService) Delete(ctx context.Context, id uint, asaasAPIKey string) error {
	c, err := s.repo.FindInquilinoByID(ctx, id)
	if err != nil {
		return ErrNotFound
	}
	if c.AsaasSubscriptionID != nil && asaasAPIKey != "" {
		_ = s.asaas.CancelarAssinatura(asaasAPIKey, *c.AsaasSubscriptionID)
	}
	_, err = s.repo.DeleteInquilinoComCobrancas(ctx, id)
	return err
}

// --- Histórico de pagamentos manual (JSON embutido) ---

func (s *InquilinoService) AddPagamentoManual(ctx context.Context, id uint, req PagamentoManualRequest) (*models.ClienteAluguel, error) {
	if req.Valor <= 0 {
		return nil, &validacao.ErroCampo{Campo: "valor", Mensagem: "Informe o valor pago."}
	}
	if e := validacao.Data("data", req.Data, "Data do pagamento"); e != nil || req.Data == "" {
		return nil, &validacao.ErroCampo{Campo: "data", Mensagem: "Escolha a data do pagamento."}
	}
	c, err := s.repo.FindInquilinoByID(ctx, id)
	if err != nil {
		return nil, ErrNotFound
	}

	var historico []HistoricoPagamento
	if len(c.HistoricoPagamentos) > 0 {
		_ = json.Unmarshal(c.HistoricoPagamentos, &historico)
	}
	historico = append(historico, HistoricoPagamento{
		ID:             time.Now().UnixMilli(),
		Data:           req.Data,
		Valor:          req.Valor,
		Status:         req.Status,
		FormaPagamento: req.FormaPagamento,
	})
	raw, err := json.Marshal(historico)
	if err != nil {
		return nil, err
	}
	c.HistoricoPagamentos = datatypes.JSON(raw)
	if err := s.repo.SaveInquilino(ctx, c); err != nil {
		return nil, err
	}
	return c, nil
}

var ErrPagamentoNaoEncontrado = errors.New("pagamento não encontrado no histórico")

func (s *InquilinoService) DeletePagamentoManual(ctx context.Context, id uint, pagamentoID int64) (*models.ClienteAluguel, error) {
	c, err := s.repo.FindInquilinoByID(ctx, id)
	if err != nil {
		return nil, ErrNotFound
	}
	var historico []HistoricoPagamento
	if len(c.HistoricoPagamentos) > 0 {
		_ = json.Unmarshal(c.HistoricoPagamentos, &historico)
	}
	filtered := make([]HistoricoPagamento, 0, len(historico))
	found := false
	for _, h := range historico {
		if h.ID == pagamentoID {
			found = true
			continue
		}
		filtered = append(filtered, h)
	}
	if !found {
		return nil, ErrPagamentoNaoEncontrado
	}
	raw, err := json.Marshal(filtered)
	if err != nil {
		return nil, err
	}
	c.HistoricoPagamentos = datatypes.JSON(raw)
	if err := s.repo.SaveInquilino(ctx, c); err != nil {
		return nil, err
	}
	return c, nil
}

// --- Cobranças Asaas ---

var ErrAsaasCustomerRequired = errors.New("inquilino sem asaas_customer_id")

func (s *InquilinoService) ListCobrancas(ctx context.Context, clienteAluguelID uint) ([]models.CobrancaAluguel, error) {
	return s.repo.ListCobrancasDoInquilino(ctx, clienteAluguelID)
}

func (s *InquilinoService) CriarCobrancaAvulsa(ctx context.Context, id uint, req CobrancaAvulsaRequest, asaasAPIKey string) (*models.CobrancaAluguel, error) {
	if req.Valor <= 0 {
		return nil, &validacao.ErroCampo{Campo: "valor", Mensagem: "Informe o valor da cobrança."}
	}
	venc, err := time.Parse("2006-01-02", req.DataVencimento)
	if err != nil {
		return nil, &validacao.ErroCampo{Campo: "data_vencimento", Mensagem: "Escolha a data de vencimento."}
	}
	c, err := s.repo.FindInquilinoByID(ctx, id)
	if err != nil {
		return nil, ErrNotFound
	}
	if c.AsaasCustomerID == nil {
		return nil, ErrAsaasCustomerRequired
	}

	cob := &models.CobrancaAluguel{
		ClienteAluguelID: c.ID,
		Valor:            req.Valor,
		DataVencimento:   venc,
		Status:           "PENDING",
		BillingType:      "UNDEFINED",
		Tipo:             "avulso",
	}
	if req.Descricao != "" {
		cob.Descricao = &req.Descricao
	}

	if asaasAPIKey != "" {
		charge, err := s.asaas.CriarCobrancaAvulsa(asaasAPIKey, *c.AsaasCustomerID, req.Valor, venc, req.Descricao)
		if err == nil && charge != nil {
			cob.AsaasPaymentID = &charge.ID
			if charge.Status != "" {
				cob.Status = charge.Status
			}
			if charge.InvoiceURL != "" {
				cob.InvoiceURL = &charge.InvoiceURL
			}
		}
	}

	if err := s.repo.CreateCobranca(ctx, cob); err != nil {
		return nil, err
	}
	return cob, nil
}

// mapAsaasStatus replica `mapAsaasStatus` — hoje o status do Asaas já usa o
// mesmo vocabulário (PENDING/CONFIRMED/OVERDUE/...), então é identidade.
func mapAsaasStatus(status string) string {
	if status == "" {
		return "PENDING"
	}
	return status
}

// SincronizarAsaas cria cliente/assinatura no Asaas se faltarem e importa
// cobranças existentes da assinatura. POST /clientealuguel/:id/sincronizar-asaas.
func (s *InquilinoService) SincronizarAsaas(ctx context.Context, id uint, asaasAPIKey string) (*models.ClienteAluguel, error) {
	c, err := s.repo.FindInquilinoByID(ctx, id)
	if err != nil {
		return nil, ErrNotFound
	}
	if asaasAPIKey == "" {
		return nil, ErrAsaasNotConfigured
	}

	if c.AsaasCustomerID == nil {
		cust, err := s.asaas.CriarCliente(asaasAPIKey, c.Nome, deref(c.CPF), deref(c.Email), deref(c.Telefone))
		if err != nil {
			return nil, err
		}
		c.AsaasCustomerID = &cust.ID
	}
	if c.AsaasSubscriptionID == nil {
		proximo := CalcularProximoVencimento(c.DiaVencimento, time.Now())
		sub, err := s.asaas.CriarAssinatura(asaasAPIKey, *c.AsaasCustomerID, c.ValorAluguel, proximo, "Aluguel - "+c.Nome)
		if err != nil {
			return nil, err
		}
		c.AsaasSubscriptionID = &sub.ID
		status := sub.Status
		if status == "" {
			status = "ACTIVE"
		}
		c.AsaasSubscriptionStatus = &status
	}
	if err := s.repo.SaveInquilino(ctx, c); err != nil {
		return nil, err
	}

	charges, err := s.asaas.ListarCobrancasPorAssinatura(asaasAPIKey, *c.AsaasSubscriptionID)
	if err == nil {
		for _, ch := range charges {
			if _, err := s.repo.FindCobrancaByAsaasID(ctx, ch.ID); err == nil {
				continue // já existe
			}
			cob := &models.CobrancaAluguel{
				ClienteAluguelID: c.ID,
				AsaasPaymentID:   &ch.ID,
				Valor:            ch.Value,
				DataVencimento:   ch.DueDate,
				Status:           mapAsaasStatus(ch.Status),
				BillingType:      ch.BillingType,
				Tipo:             "recorrente",
			}
			if ch.InvoiceURL != "" {
				cob.InvoiceURL = &ch.InvoiceURL
			}
			_ = s.repo.CreateCobranca(ctx, cob)
		}
	}

	return c, nil
}
