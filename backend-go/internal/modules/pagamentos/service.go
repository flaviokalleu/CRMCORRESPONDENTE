package pagamentos

import (
	"context"
	"errors"
	"fmt"
	"os"
	"strconv"
	"time"

	"crmimob/internal/integrations/asaas"
	"crmimob/internal/models"
)

var (
	ErrClienteNotFound   = errors.New("cliente não encontrado")
	ErrPagamentoNotFound = errors.New("pagamento não encontrado")
	ErrForbidden         = errors.New("acesso negado")
	ErrNotEditable       = errors.New("pagamento só pode ser editado enquanto pendente")
	ErrNotDeletable      = errors.New("pagamento aprovado não pode ser excluído")
)

// Service concentra as regras de negócio de cobranças avulsas (era Mercado
// Pago → Asaas). Sempre resolve a chave Asaas POR TENANT (03-spec gotcha §5).
type Service struct {
	repo *Repository
}

func NewService(repo *Repository) *Service { return &Service{repo: repo} }

func envInt(key string, fallback int) int {
	if v := os.Getenv(key); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			return n
		}
	}
	return fallback
}

func (s *Service) Config() ConfigResponse {
	return ConfigResponse{
		MaxParcelas:        envInt("MAX_PARCELAS", 12),
		BoletoDaysToExpire: envInt("BOLETO_DAYS_TO_EXPIRE", 3),
		PixExpireMinutes:   envInt("PIX_EXPIRE_MINUTES", 30),
	}
}

// clientForTenant resolve o client Asaas usando a chave do tenant (com
// fallback global) — nunca usa só a chave global fora de dev (03-spec gotcha §5/§11).
func (s *Service) clientForTenant(ctx context.Context, tenantID *uint) (*asaas.Client, error) {
	if tenantID == nil {
		return asaas.NewClientForTenant(nil), nil
	}
	t, err := s.repo.findTenant(ctx, *tenantID)
	if err != nil {
		return nil, err
	}
	return asaas.NewClientForTenant(t.AsaasAPIKey), nil
}

func formatBRL(v float64) string {
	// Formatação simples "1.234,56" (pt-BR), suficiente para exibição — cálculos
	// sempre usam o float (ValorNumerico), nunca esta string (03-spec gotcha §2).
	neg := v < 0
	if neg {
		v = -v
	}
	intPart := int64(v)
	cents := int64((v-float64(intPart))*100 + 0.5)
	intStr := strconv.FormatInt(intPart, 10)

	// separador de milhar
	var grouped []byte
	for i, r := range reverseString(intStr) {
		if i > 0 && i%3 == 0 {
			grouped = append(grouped, '.')
		}
		grouped = append(grouped, byte(r))
	}
	out := reverseString(string(grouped))
	res := fmt.Sprintf("%s,%02d", out, cents)
	if neg {
		res = "-" + res
	}
	return res
}

func reverseString(s string) string {
	r := []rune(s)
	for i, j := 0, len(r)-1; i < j; i, j = i+1, j-1 {
		r[i], r[j] = r[j], r[i]
	}
	return string(r)
}

type createParams struct {
	TenantID       *uint
	CreatedBy      uint
	ClienteID      uint
	Titulo         string
	Descricao      string
	Valor          float64
	DataVencimento *time.Time
	Observacoes    string
	Parcelas       int
	Tipo           string
	BillingType    string
	LinkUnico      string
}

func (s *Service) create(ctx context.Context, p createParams) (*models.Pagamento, *asaas.Payment, error) {
	cliente, err := s.repo.findClienteBasico(ctx, p.ClienteID)
	if err != nil {
		return nil, nil, ErrClienteNotFound
	}

	client, err := s.clientForTenant(ctx, p.TenantID)
	if err != nil {
		return nil, nil, err
	}

	customer, err := client.CreateCustomer(ctx, asaas.Customer{
		Name:    cliente.Nome,
		CpfCnpj: cliente.CPF,
		Email:   cliente.Email,
		Phone:   cliente.Telefone,
	})
	if err != nil {
		return nil, nil, fmt.Errorf("asaas: criar cliente: %w", err)
	}

	due := time.Now().AddDate(0, 0, 3)
	if p.DataVencimento != nil {
		due = *p.DataVencimento
	}

	payment, err := client.CreatePayment(ctx, asaas.CreatePaymentRequest{
		Customer:    customer.ID,
		BillingType: p.BillingType,
		Value:       p.Valor,
		DueDate:     due.Format("2006-01-02"),
		Description: p.Descricao,
	})
	if err != nil {
		return nil, nil, fmt.Errorf("asaas: criar cobrança: %w", err)
	}

	parcelas := p.Parcelas
	if parcelas < 1 {
		parcelas = 1
	}

	pagamento := &models.Pagamento{
		ClienteID:       p.ClienteID,
		CreatedBy:       &p.CreatedBy,
		TenantID:        p.TenantID,
		AsaasCustomerID: &customer.ID,
		AsaasPaymentID:  &payment.ID,
		Tipo:            p.Tipo,
		Status:          models.PagamentoStatusPendente,
		Titulo:          p.Titulo,
		Descricao:       p.Descricao,
		Valor:           formatBRL(p.Valor),
		ValorNumerico:   p.Valor,
		Parcelas:        parcelas,
		DataVencimento:  &due,
		InvoiceURL:      payment.InvoiceURL,
		LinkCurto:       payment.BankSlipURL,
		Observacoes:     p.Observacoes,
		LinkUnico:       p.LinkUnico,
	}

	if err := s.repo.Create(ctx, pagamento); err != nil {
		return nil, nil, err
	}
	return pagamento, payment, nil
}

func uniqueLink() string {
	return fmt.Sprintf("%d%d", time.Now().UnixNano(), os.Getpid())
}

// CreateBoleto — Asaas billingType BOLETO (03-spec De-Para).
func (s *Service) CreateBoleto(ctx context.Context, tenantID *uint, userID uint, req CreateBoletoRequest) (*models.Pagamento, *asaas.Payment, error) {
	due, err := time.Parse("2006-01-02", req.DataVencimento)
	if err != nil {
		return nil, nil, fmt.Errorf("data_vencimento inválida: %w", err)
	}
	return s.create(ctx, createParams{
		TenantID: tenantID, CreatedBy: userID, ClienteID: req.ClienteID,
		Titulo: req.Titulo, Descricao: req.Descricao, Valor: req.Valor,
		DataVencimento: &due, Observacoes: req.Observacoes, Parcelas: req.Parcelas,
		Tipo: models.PagamentoTipoBoleto, BillingType: asaas.BillingTypeBoleto, LinkUnico: uniqueLink(),
	})
}

// CreatePix — Asaas billingType PIX. Vence em PIX_EXPIRE_MINUTES.
func (s *Service) CreatePix(ctx context.Context, tenantID *uint, userID uint, req CreatePixRequest) (*models.Pagamento, *asaas.Payment, error) {
	minutes := envInt("PIX_EXPIRE_MINUTES", 30)
	due := time.Now().Add(time.Duration(minutes) * time.Minute)
	return s.create(ctx, createParams{
		TenantID: tenantID, CreatedBy: userID, ClienteID: req.ClienteID,
		Titulo: req.Titulo, Descricao: req.Descricao, Valor: req.Valor,
		DataVencimento: &due, Observacoes: req.Observacoes, Parcelas: 1,
		Tipo: models.PagamentoTipoPix, BillingType: asaas.BillingTypePix, LinkUnico: uniqueLink(),
	})
}

// CreateUniversal — Asaas billingType UNDEFINED (cliente escolhe no checkout).
func (s *Service) CreateUniversal(ctx context.Context, tenantID *uint, userID uint, req CreateUniversalRequest) (*models.Pagamento, *asaas.Payment, error) {
	due, err := time.Parse("2006-01-02", req.DataVencimento)
	if err != nil {
		return nil, nil, fmt.Errorf("data_vencimento inválida: %w", err)
	}
	return s.create(ctx, createParams{
		TenantID: tenantID, CreatedBy: userID, ClienteID: req.ClienteID,
		Titulo: req.Titulo, Descricao: req.Descricao, Valor: req.Valor,
		DataVencimento: &due, Observacoes: req.Observacoes, Parcelas: 1,
		Tipo: models.PagamentoTipoUniversal, BillingType: asaas.BillingTypeUndefined, LinkUnico: uniqueLink(),
	})
}

// GetPixQrCode busca o QR Code/copia-e-cola de um pagamento PIX já criado.
func (s *Service) GetPixQrCode(ctx context.Context, tenantID *uint, id uint) (*asaas.PixQrCodeResponse, error) {
	p, err := s.repo.FindByID(ctx, id)
	if err != nil || p.AsaasPaymentID == nil {
		return nil, ErrPagamentoNotFound
	}
	client, err := s.clientForTenant(ctx, tenantID)
	if err != nil {
		return nil, err
	}
	return client.GetPixQrCode(ctx, *p.AsaasPaymentID)
}

func (s *Service) List(ctx context.Context, f ListFilter, page, limit int) (ListResponse, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	f.Offset = (page - 1) * limit
	f.Limit = limit

	rows, total, err := s.repo.List(ctx, f)
	if err != nil {
		return ListResponse{}, err
	}
	totalPages := int(total) / limit
	if int(total)%limit != 0 {
		totalPages++
	}
	return ListResponse{Pagamentos: rows, Total: total, Page: page, TotalPages: totalPages}, nil
}

// Get devolve o pagamento, aplicando a regra "admin/criador" (não-admin só vê
// os que ele mesmo criou).
func (s *Service) Get(ctx context.Context, id uint, isAdmin bool, userID uint) (*models.Pagamento, error) {
	p, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, ErrPagamentoNotFound
	}
	if !isAdmin && (p.CreatedBy == nil || *p.CreatedBy != userID) {
		return nil, ErrForbidden
	}
	return p, nil
}

func (s *Service) Delete(ctx context.Context, id uint) error {
	p, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return ErrPagamentoNotFound
	}
	if p.Status == models.PagamentoStatusAprovado {
		return ErrNotDeletable
	}
	return s.repo.Delete(ctx, id)
}

func (s *Service) Update(ctx context.Context, id uint, req UpdatePagamentoRequest) (*models.Pagamento, error) {
	p, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, ErrPagamentoNotFound
	}
	if p.Status != models.PagamentoStatusPendente {
		return nil, ErrNotEditable
	}

	updates := map[string]any{"updated_at": time.Now()}
	if req.Titulo != nil {
		updates["titulo"] = *req.Titulo
	}
	if req.Descricao != nil {
		updates["descricao"] = *req.Descricao
	}
	if req.Valor != nil {
		updates["valor_numerico"] = *req.Valor
		updates["valor"] = formatBRL(*req.Valor)
	}
	if req.DataVencimento != nil {
		due, err := time.Parse("2006-01-02", *req.DataVencimento)
		if err != nil {
			return nil, fmt.Errorf("data_vencimento inválida: %w", err)
		}
		updates["data_vencimento"] = due
	}
	if req.Parcelas != nil {
		updates["parcelas"] = *req.Parcelas
	}
	if req.Observacoes != nil {
		updates["observacoes"] = *req.Observacoes
	}

	if err := s.repo.Update(ctx, id, updates); err != nil {
		return nil, err
	}
	return s.repo.FindByID(ctx, id)
}

// VerificarStatus consulta o status atual no Asaas e sincroniza localmente
// (substitui `Payment.get` + sincronização MP).
func (s *Service) VerificarStatus(ctx context.Context, tenantID *uint, id uint) (*models.Pagamento, error) {
	p, err := s.repo.FindByID(ctx, id)
	if err != nil || p.AsaasPaymentID == nil {
		return nil, ErrPagamentoNotFound
	}

	client, err := s.clientForTenant(ctx, tenantID)
	if err != nil {
		return nil, err
	}
	remote, err := client.GetPayment(ctx, *p.AsaasPaymentID)
	if err != nil {
		return nil, err
	}

	status := mapAsaasStatus(remote.Status)
	updates := map[string]any{"status": status, "updated_at": time.Now()}
	if remote.InvoiceURL != "" {
		updates["invoice_url"] = remote.InvoiceURL
	}
	if remote.TransactionReceiptURL != "" {
		updates["transaction_receipt_url"] = remote.TransactionReceiptURL
	}
	if err := s.repo.Update(ctx, id, updates); err != nil {
		return nil, err
	}
	return s.repo.FindByID(ctx, id)
}

// mapAsaasStatus traduz o status Asaas (canônico) para o vocabulário local
// (03-spec §"Mapeamento de status").
func mapAsaasStatus(asaasStatus string) string {
	switch asaasStatus {
	case "CONFIRMED", "RECEIVED", "RECEIVED_IN_CASH":
		return models.PagamentoStatusAprovado
	case "PENDING":
		return models.PagamentoStatusPendente
	case "OVERDUE":
		return models.PagamentoStatusAguardando
	case "REFUNDED", "REFUND_REQUESTED":
		return models.PagamentoStatusCancelado
	case "DELETED":
		return models.PagamentoStatusCancelado
	default:
		return models.PagamentoStatusPendente
	}
}
