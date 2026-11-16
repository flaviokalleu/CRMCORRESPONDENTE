package assinatura

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"os"
	"regexp"
	"strconv"
	"strings"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"crmimob/internal/integrations/asaas"
	"crmimob/internal/models"
)

var (
	ErrCobrancaDesligada  = errors.New("a cobrança online ainda não está configurada")
	ErrFaturaNaoEncontrada = errors.New("fatura não encontrada")
	ErrFaturaFechada      = errors.New("esta fatura não está mais em aberto")
	ErrDocumentoInvalido  = errors.New("informe um CPF ou CNPJ válido")
	ErrPrecisaDocumento   = errors.New("precisa do CPF ou CNPJ")
	ErrPlanoInvalido      = errors.New("plano indisponível")
	ErrSemAssinatura      = errors.New("organização sem assinatura")
)

// Fuso usado para datas de vencimento (coluna DATE).
var fuso = func() *time.Location {
	if l, err := time.LoadLocation("America/Sao_Paulo"); err == nil {
		return l
	}
	return time.UTC
}()

// Service concentra as regras da assinatura. O Asaas é o da PLATAFORMA
// (ASAAS_PLATAFORMA_API_KEY), nunca a chave da imobiliária.
type Service struct {
	db    *gorm.DB
	asaas *asaas.Client // nil = cobrança online desligada
	email EmailSender
	// PlataformaTenantID é a empresa dona da plataforma: nunca é cobrada nem bloqueada.
	PlataformaTenantID uint
	// URL do painel, usada nos links dos e-mails.
	PainelURL string
}

// EmailSender é o mínimo que o serviço precisa para os avisos.
type EmailSender interface {
	Send(to, subject, htmlBody string) error
}

func NewService(db *gorm.DB, email EmailSender, painelURL string) *Service {
	s := &Service{db: db, email: email, PainelURL: strings.TrimRight(painelURL, "/"), PlataformaTenantID: 1}
	if v, err := strconv.ParseUint(os.Getenv("PLATAFORMA_TENANT_ID"), 10, 64); err == nil && v > 0 {
		s.PlataformaTenantID = uint(v)
	}
	if chave := os.Getenv("ASAAS_PLATAFORMA_API_KEY"); chave != "" {
		amb := "sandbox"
		if os.Getenv("ASAAS_PLATAFORMA_AMBIENTE") == "production" {
			amb = "production"
		}
		s.asaas = asaas.NewClientAmbiente(chave, amb)
	}
	return s
}

// CobrancaOnline diz se dá para gerar link de pagamento.
func (s *Service) CobrancaOnline() bool { return s.asaas != nil }

func hoje() time.Time {
	n := time.Now().In(fuso)
	return time.Date(n.Year(), n.Month(), n.Day(), 0, 0, 0, 0, fuso)
}

// diaDaFatura lê a coluna DATE (o driver devolve meia-noite UTC) sem
// converter fuso, que faria a data cair no dia anterior.
func diaDaFatura(t time.Time) time.Time {
	return time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, fuso)
}

func diaDe(t time.Time) time.Time {
	t = t.In(fuso)
	return time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, fuso)
}

// ---------------------------------------------------------------- leitura

// Carregar devolve tenant, assinatura (pode ser nil) e plano atual.
func (s *Service) Carregar(ctx context.Context, tenantID uint) (*models.Tenant, *models.Subscription, *models.Plan, error) {
	var t models.Tenant
	if err := s.db.WithContext(ctx).First(&t, tenantID).Error; err != nil {
		return nil, nil, nil, err
	}
	var sub models.Subscription
	if err := s.db.WithContext(ctx).Where("tenant_id = ?", tenantID).Order("id DESC").First(&sub).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return &t, nil, nil, nil
		}
		return nil, nil, nil, err
	}
	var p models.Plan
	if err := s.db.WithContext(ctx).First(&p, sub.PlanID).Error; err != nil {
		return &t, &sub, nil, nil
	}
	return &t, &sub, &p, nil
}

// AcessoDoTenant aplica a regra única. A empresa da plataforma sempre passa.
func (s *Service) AcessoDoTenant(ctx context.Context, tenantID uint) (Acesso, error) {
	if tenantID == s.PlataformaTenantID {
		return Acesso{Liberado: true, Situacao: SituacaoEmDia}, nil
	}
	t, sub, _, err := s.Carregar(ctx, tenantID)
	if err != nil {
		return Acesso{}, err
	}
	return CalcularAcesso(t, sub, time.Now()), nil
}

// FaturaEmAberto devolve a fatura mais antiga que ainda pode ser paga.
func (s *Service) FaturaEmAberto(ctx context.Context, tenantID uint) (*models.FaturaAssinatura, error) {
	var f models.FaturaAssinatura
	err := s.db.WithContext(ctx).
		Where("tenant_id = ? AND status IN ?", tenantID, []string{models.FaturaPendente, models.FaturaVencida}).
		Order("vencimento ASC").First(&f).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	return &f, err
}

func (s *Service) ListarFaturas(ctx context.Context, tenantID uint) ([]models.FaturaAssinatura, error) {
	var out []models.FaturaAssinatura
	err := s.db.WithContext(ctx).Where("tenant_id = ? AND status <> ?", tenantID, models.FaturaCancelada).
		Order("vencimento DESC").Limit(36).Find(&out).Error
	return out, err
}

// ---------------------------------------------------------------- faturas

func chaveRenovacao(tenantID uint, venc time.Time) string {
	return fmt.Sprintf("renovacao:%d:%s", tenantID, diaDe(venc).Format("2006-01-02"))
}

// planoDaRenovacao: o plano agendado (troca para a próxima renovação) ou o atual.
func (s *Service) planoDaRenovacao(ctx context.Context, sub *models.Subscription) (*models.Plan, error) {
	id := sub.PlanID
	if sub.PlanoAgendadoID != nil {
		id = *sub.PlanoAgendadoID
	}
	var p models.Plan
	if err := s.db.WithContext(ctx).First(&p, id).Error; err != nil {
		return nil, err
	}
	return &p, nil
}

func descricaoFatura(p *models.Plan, ciclo string, venc time.Time) string {
	periodo := "mensalidade"
	if ciclo == "anual" {
		periodo = "anuidade"
	}
	return fmt.Sprintf("Plano %s — %s com vencimento em %s", p.Nome, periodo, diaDe(venc).Format("02/01/2006"))
}

// GarantirFaturaDeRenovacao cria (uma única vez) a fatura que vence no fim do
// período atual. Valor zero = cortesia: renova sem fatura. Devolve a fatura
// criada ou nil quando não havia nada a criar.
func (s *Service) GarantirFaturaDeRenovacao(ctx context.Context, tenantID uint) (*models.FaturaAssinatura, error) {
	if tenantID == s.PlataformaTenantID {
		return nil, nil
	}
	_, sub, _, err := s.Carregar(ctx, tenantID)
	if err != nil || sub == nil {
		return nil, err
	}
	if sub.Status == "canceled" || sub.Status == "suspended" {
		return nil, nil
	}
	fim := FimDoPeriodo(sub)
	if fim == nil {
		return nil, nil
	}
	plano, err := s.planoDaRenovacao(ctx, sub)
	if err != nil {
		return nil, err
	}
	valor := ValorDaMensalidade(sub, plano, sub.Ciclo)
	if sub.PlanoAgendadoID != nil && *sub.PlanoAgendadoID != sub.PlanID {
		valor = ValorDaMensalidade(&models.Subscription{}, plano, sub.Ciclo) // plano novo: preço de tabela
	}

	if valor <= 0 {
		// Cortesia: estende o período sem gerar cobrança, só quando chega a hora.
		if time.Until(*fim) > 72*time.Hour {
			return nil, nil
		}
		novo := ProximoPagoAte(fim, sub.Ciclo, time.Now())
		return nil, s.db.WithContext(ctx).Model(&models.Subscription{}).Where("id = ?", sub.ID).
			Updates(map[string]any{"data_fim": novo, "status": "active", "plan_id": plano.ID, "plano_agendado_id": nil}).Error
	}

	f := &models.FaturaAssinatura{
		TenantID: tenantID, PlanID: plano.ID, Ciclo: sub.Ciclo, Valor: valor,
		Vencimento: diaDe(*fim), Status: models.FaturaPendente,
		Descricao: descricaoFatura(plano, sub.Ciclo, *fim), Chave: chaveRenovacao(tenantID, *fim),
	}
	res := s.db.WithContext(ctx).Clauses(clause.OnConflict{Columns: []clause.Column{{Name: "chave"}}, DoNothing: true}).Create(f)
	if res.Error != nil {
		return nil, res.Error
	}
	if res.RowsAffected == 0 {
		return nil, nil
	}
	slog.Info("assinatura: fatura criada", "tenant", tenantID, "fatura", f.ID, "valor", valor, "vencimento", f.Vencimento.Format("2006-01-02"))
	return f, nil
}

// ---------------------------------------------------------------- agendador

// RodarCiclo é o passo do agendador (a cada hora e na subida):
// gera renovações que vencem em até 3 dias, marca vencidas e manda avisos.
func (s *Service) RodarCiclo(ctx context.Context) {
	limite := time.Now().Add(72 * time.Hour)
	var subs []models.Subscription
	err := s.db.WithContext(ctx).
		Where("status IN ? AND tenant_id <> ?", []string{"trialing", "active", "past_due"}, s.PlataformaTenantID).
		Where("COALESCE(data_fim, data_fim_trial) IS NOT NULL AND COALESCE(data_fim, data_fim_trial) <= ?", limite).
		Find(&subs).Error
	if err != nil {
		slog.Error("assinatura: falha ao listar renovações", "error", err)
		return
	}
	for _, sub := range subs {
		if _, err := s.GarantirFaturaDeRenovacao(ctx, sub.TenantID); err != nil {
			slog.Error("assinatura: falha ao gerar fatura", "tenant", sub.TenantID, "error", err)
		}
	}

	if err := s.db.WithContext(ctx).Model(&models.FaturaAssinatura{}).
		Where("status = ? AND vencimento < ?", models.FaturaPendente, hoje()).
		Update("status", models.FaturaVencida).Error; err != nil {
		slog.Error("assinatura: falha ao marcar vencidas", "error", err)
	}

	s.EnviarAvisos(ctx)
}

// Iniciar roda o ciclo na subida e depois a cada hora, até o ctx acabar.
func (s *Service) Iniciar(ctx context.Context) {
	go func() {
		s.RodarCiclo(ctx)
		t := time.NewTicker(time.Hour)
		defer t.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-t.C:
				s.RodarCiclo(ctx)
			}
		}
	}()
}

// ---------------------------------------------------------------- pagamento

var naoDigito = regexp.MustCompile(`\D`)

// documentoValido aceita 11 (CPF) ou 14 (CNPJ) dígitos.
func documentoValido(doc string) (string, bool) {
	d := naoDigito.ReplaceAllString(doc, "")
	return d, len(d) == 11 || len(d) == 14
}

// LinkDePagamento devolve o link do Asaas para a fatura, criando a cobrança na
// primeira vez (Pix, boleto ou cartão, a pessoa escolhe na página do Asaas).
func (s *Service) LinkDePagamento(ctx context.Context, tenantID, faturaID uint, documento string) (string, error) {
	if s.asaas == nil {
		return "", ErrCobrancaDesligada
	}
	var f models.FaturaAssinatura
	if err := s.db.WithContext(ctx).Where("id = ? AND tenant_id = ?", faturaID, tenantID).First(&f).Error; err != nil {
		return "", ErrFaturaNaoEncontrada
	}
	if !f.EmAberto() {
		return "", ErrFaturaFechada
	}
	if f.LinkPagamento != nil && *f.LinkPagamento != "" {
		return *f.LinkPagamento, nil
	}

	t, sub, _, err := s.Carregar(ctx, tenantID)
	if err != nil {
		return "", err
	}
	if sub == nil {
		return "", ErrSemAssinatura
	}

	// CPF/CNPJ: o informado agora, o já guardado ou o CNPJ da empresa.
	doc := ""
	if documento != "" {
		d, ok := documentoValido(documento)
		if !ok {
			return "", ErrDocumentoInvalido
		}
		doc = d
		s.db.WithContext(ctx).Model(&models.Tenant{}).Where("id = ?", tenantID).Update("documento_cobranca", doc)
	} else if t.DocumentoCobranca != nil && *t.DocumentoCobranca != "" {
		doc = *t.DocumentoCobranca
	} else if t.CNPJ != nil {
		if d, ok := documentoValido(*t.CNPJ); ok {
			doc = d
		}
	}
	if doc == "" {
		return "", ErrPrecisaDocumento
	}

	cliente := ""
	if sub.GatewayCustomerID != nil {
		cliente = *sub.GatewayCustomerID
	}
	if cliente == "" || documento != "" {
		c, err := s.asaas.CreateCustomer(ctx, asaas.Customer{
			Name: t.Nome, CpfCnpj: doc, Email: t.Email, ExternalReference: fmt.Sprintf("tenant_%d", t.ID),
		})
		if err != nil {
			return "", fmt.Errorf("asaas: criar cliente: %w", err)
		}
		cliente = c.ID
		gw := "asaas"
		s.db.WithContext(ctx).Model(&models.Subscription{}).Where("id = ?", sub.ID).
			Updates(map[string]any{"gateway_customer_id": cliente, "gateway": gw})
	}

	venc := diaDaFatura(f.Vencimento)
	if venc.Before(hoje()) {
		venc = hoje()
	}
	pg, err := s.asaas.CreatePayment(ctx, asaas.CreatePaymentRequest{
		Customer: cliente, BillingType: asaas.BillingTypeUndefined, Value: f.Valor,
		DueDate: venc.Format("2006-01-02"), Description: f.Descricao,
		ExternalReference: fmt.Sprintf("fatura_assinatura:%d", f.ID),
	})
	if err != nil {
		return "", fmt.Errorf("asaas: criar cobrança: %w", err)
	}
	if err := s.db.WithContext(ctx).Model(&models.FaturaAssinatura{}).Where("id = ?", f.ID).
		Updates(map[string]any{"gateway_payment_id": pg.ID, "link_pagamento": pg.InvoiceURL}).Error; err != nil {
		return "", err
	}
	return pg.InvoiceURL, nil
}

// ---------------------------------------------------------------- baixa

// DarBaixa marca a fatura como paga UMA única vez (UPDATE condicional) e, só
// para quem fez a baixa, estende o "pago até" e aplica o plano da fatura.
// Usada pelo webhook e pela baixa manual do master.
func (s *Service) DarBaixa(ctx context.Context, faturaID uint, forma string, pagaEm time.Time) (bool, error) {
	baixou := false
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		res := tx.Model(&models.FaturaAssinatura{}).
			Where("id = ? AND status IN ?", faturaID, []string{models.FaturaPendente, models.FaturaVencida}).
			Updates(map[string]any{"status": models.FaturaPaga, "paga_em": pagaEm, "forma_pagamento": forma, "updated_at": time.Now()})
		if res.Error != nil {
			return res.Error
		}
		if res.RowsAffected == 0 {
			return nil // já paga ou cancelada: nada a fazer
		}
		baixou = true

		var f models.FaturaAssinatura
		if err := tx.First(&f, faturaID).Error; err != nil {
			return err
		}
		var sub models.Subscription
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("tenant_id = ?", f.TenantID).Order("id DESC").First(&sub).Error; err != nil {
			return err
		}
		novo := ProximoPagoAte(FimDoPeriodo(&sub), f.Ciclo, time.Now())
		upd := map[string]any{
			"status": "active", "data_fim": novo, "plan_id": f.PlanID, "ciclo": f.Ciclo,
			"valor": f.Valor, "ultimo_pagamento_em": pagaEm, "updated_at": time.Now(),
		}
		if sub.PlanoAgendadoID != nil && *sub.PlanoAgendadoID == f.PlanID {
			upd["plano_agendado_id"] = nil
		}
		if err := tx.Model(&models.Subscription{}).Where("id = ?", sub.ID).Updates(upd).Error; err != nil {
			return err
		}
		// Outras renovações em aberto da mesma empresa perderam a validade:
		// o período já foi pago por esta fatura.
		if strings.HasPrefix(f.Chave, "renovacao:") {
			if err := tx.Model(&models.FaturaAssinatura{}).
				Where("tenant_id = ? AND id <> ? AND status IN ? AND chave LIKE ?", f.TenantID, f.ID,
					[]string{models.FaturaPendente, models.FaturaVencida}, "renovacao:%").
				Update("status", models.FaturaCancelada).Error; err != nil {
				return err
			}
		}
		slog.Info("assinatura: fatura paga", "tenant", f.TenantID, "fatura", f.ID, "pago_ate", novo.Format("2006-01-02"))
		return nil
	})
	return baixou, err
}

// ---------------------------------------------------------------- webhook

var formasAsaas = map[string]string{"PIX": "pix", "BOLETO": "boleto", "CREDIT_CARD": "cartao", "DEBIT_CARD": "cartao"}

// ProcessarWebhook trata um aviso do Asaas da plataforma. Erro = o Asaas tenta de novo.
func (s *Service) ProcessarWebhook(ctx context.Context, p asaas.WebhookPayload) error {
	if p.Payment.ID == "" {
		return nil
	}
	f, err := s.faturaDoPagamento(ctx, p.Payment)
	if err != nil || f == nil {
		return err // fatura de outra origem: ignora
	}

	switch p.Event {
	case asaas.EventPaymentReceived, asaas.EventPaymentConfirmed, "PAYMENT_RECEIVED_IN_CASH":
		// Não confia só no corpo do aviso: relê o pagamento no Asaas.
		pg, err := s.asaas.GetPayment(ctx, p.Payment.ID)
		if err != nil {
			return err
		}
		if pg.Status != "RECEIVED" && pg.Status != "CONFIRMED" && pg.Status != "RECEIVED_IN_CASH" {
			return nil
		}
		forma := formasAsaas[pg.BillingType]
		if forma == "" {
			forma = strings.ToLower(pg.BillingType)
		}
		_, err = s.DarBaixa(ctx, f.ID, forma, time.Now())
		return err
	case asaas.EventPaymentRefunded, "PAYMENT_CHARGEBACK_REQUESTED":
		return s.db.WithContext(ctx).Model(&models.FaturaAssinatura{}).Where("id = ?", f.ID).
			Update("status", models.FaturaEstornada).Error
	case asaas.EventPaymentDeleted:
		// Cobrança apagada no Asaas: libera para gerar um link novo.
		return s.db.WithContext(ctx).Model(&models.FaturaAssinatura{}).
			Where("id = ? AND status IN ?", f.ID, []string{models.FaturaPendente, models.FaturaVencida}).
			Updates(map[string]any{"gateway_payment_id": nil, "link_pagamento": nil}).Error
	}
	return nil
}

func (s *Service) faturaDoPagamento(ctx context.Context, pg asaas.Payment) (*models.FaturaAssinatura, error) {
	var f models.FaturaAssinatura
	err := s.db.WithContext(ctx).Where("gateway_payment_id = ?", pg.ID).First(&f).Error
	if err == nil {
		return &f, nil
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}
	ref, ok := strings.CutPrefix(pg.ExternalReference, "fatura_assinatura:")
	if !ok {
		return nil, nil
	}
	id, convErr := strconv.ParseUint(ref, 10, 64)
	if convErr != nil {
		return nil, nil
	}
	if err := s.db.WithContext(ctx).First(&f, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &f, nil
}

// ---------------------------------------------------------------- troca de plano

// TrocarPlano pela própria imobiliária. No teste vale na hora (e ajusta a
// fatura em aberto); depois do teste vale na próxima renovação, sem cálculo
// proporcional. Devolve true quando a troca foi imediata.
func (s *Service) TrocarPlano(ctx context.Context, tenantID, planID uint) (bool, *time.Time, error) {
	var p models.Plan
	if err := s.db.WithContext(ctx).Where("id = ? AND ativo = ?", planID, true).First(&p).Error; err != nil {
		return false, nil, ErrPlanoInvalido
	}
	_, sub, _, err := s.Carregar(ctx, tenantID)
	if err != nil {
		return false, nil, err
	}
	if sub == nil {
		return false, nil, ErrSemAssinatura
	}
	imediata := sub.Status == "trialing" && sub.DataFim == nil

	err = s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if imediata {
			if err := tx.Model(&models.Subscription{}).Where("id = ?", sub.ID).
				Updates(map[string]any{"plan_id": p.ID, "valor": p.PrecoMensal, "plano_agendado_id": nil}).Error; err != nil {
				return err
			}
		} else {
			var agendado any = p.ID
			if p.ID == sub.PlanID {
				agendado = nil // voltou ao plano atual: desfaz o agendamento
			}
			if err := tx.Model(&models.Subscription{}).Where("id = ?", sub.ID).
				Update("plano_agendado_id", agendado).Error; err != nil {
				return err
			}
		}
		// A fatura em aberto da renovação passa a refletir o plano novo.
		var f models.FaturaAssinatura
		err := tx.Where("tenant_id = ? AND status IN ? AND chave LIKE ?", tenantID,
			[]string{models.FaturaPendente, models.FaturaVencida}, "renovacao:%").Order("vencimento DESC").First(&f).Error
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil
		}
		if err != nil {
			return err
		}
		valor := ValorDaMensalidade(&models.Subscription{}, &p, f.Ciclo)
		if p.ID == sub.PlanID {
			valor = ValorDaMensalidade(sub, &p, f.Ciclo)
		}
		if f.GatewayPaymentID != nil && s.asaas != nil {
			if err := s.asaas.DeletePayment(ctx, *f.GatewayPaymentID); err != nil {
				slog.Warn("assinatura: não apagou a cobrança antiga no Asaas", "fatura", f.ID, "error", err)
			}
		}
		return tx.Model(&models.FaturaAssinatura{}).Where("id = ?", f.ID).Updates(map[string]any{
			"plan_id": p.ID, "valor": valor, "descricao": descricaoFatura(&p, f.Ciclo, diaDaFatura(f.Vencimento)),
			"gateway_payment_id": nil, "link_pagamento": nil,
		}).Error
	})
	if err != nil {
		return false, nil, err
	}
	return imediata, FimDoPeriodo(sub), nil
}
