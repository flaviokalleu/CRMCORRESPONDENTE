package tenants

import (
	"context"
	"crypto/tls"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"regexp"
	"strings"
	"time"

	"gorm.io/datatypes"
	"gorm.io/gorm"

	"crmimob/internal/auth"
	"crmimob/internal/models"
	"crmimob/internal/modules/billing"
)

var (
	ErrInvalidSlug     = errors.New("slug inválido (use apenas a-z, 0-9 e hífen)")
	ErrWeakPassword    = errors.New("senha deve ter ao menos 6 caracteres")
	ErrSlugTaken       = errors.New("slug já está em uso")
	ErrEmailTaken      = errors.New("email já cadastrado")
	ErrPlanNotFound    = errors.New("plano não encontrado")
	ErrTenantNotFound  = errors.New("organização não encontrada")
	ErrNoSubscription  = errors.New("organização sem assinatura")
)

var slugRegex = regexp.MustCompile(`^[a-z0-9-]+$`)

type Service struct {
	repo       *Repository
	billingSvc *billing.Service
	authSvc    *auth.Service
	authRepo   *auth.Repository
}

func NewService(repo *Repository, billingSvc *billing.Service, authSvc *auth.Service, authRepo *auth.Repository) *Service {
	return &Service{repo: repo, billingSvc: billingSvc, authSvc: authSvc, authRepo: authRepo}
}

func (s *Service) CheckSlugAvailable(ctx context.Context, slug string) (bool, error) {
	_, err := s.repo.FindBySlug(ctx, slug)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return true, nil
		}
		return false, err
	}
	return false, nil
}

func (s *Service) ListPublicPlans(ctx context.Context) ([]models.Plan, error) {
	return s.billingSvc.ListPlans(ctx, true)
}

// Register implementa o onboarding transacional (ver 01-spec §2.2):
// valida → checa duplicatas → cria tenant+admin+subscription → gera tokens.
func (s *Service) Register(ctx context.Context, req RegisterRequest) (*models.Tenant, *models.User, *models.Subscription, string, string, error) {
	req.Normalize()
	e, a := req.Empresa, req.Admin

	if e.Slug == "" || !slugRegex.MatchString(e.Slug) {
		return nil, nil, nil, "", "", ErrInvalidSlug
	}
	if len(a.Password) < 6 {
		return nil, nil, nil, "", "", ErrWeakPassword
	}

	if _, err := s.repo.FindBySlug(ctx, e.Slug); err == nil {
		return nil, nil, nil, "", "", ErrSlugTaken
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil, nil, "", "", err
	}

	if taken, err := s.repo.ExistsByEmail(ctx, e.Email); err != nil {
		return nil, nil, nil, "", "", err
	} else if taken {
		return nil, nil, nil, "", "", ErrEmailTaken
	}

	// Resolve plano (plan_id, plan_slug, ou fallback 'free' — gotcha 01-spec §7.14).
	plan, err := s.resolvePlan(ctx, req.PlanID, req.PlanSlug)
	if err != nil {
		return nil, nil, nil, "", "", err
	}

	hash, err := auth.HashPassword(a.Password)
	if err != nil {
		return nil, nil, nil, "", "", err
	}

	var cnpjPtr, telefonePtr *string
	if e.CNPJ != "" {
		cnpjPtr = &e.CNPJ
	}
	if e.Telefone != "" {
		telefonePtr = &e.Telefone
	}

	tenant := &models.Tenant{
		Nome: e.Nome, Slug: e.Slug, CNPJ: cnpjPtr, Email: e.Email, Telefone: telefonePtr,
		Ativo: true, Configuracoes: datatypes.JSON([]byte(`{}`)),
	}
	admin := &models.User{
		FirstName: a.FirstName, LastName: a.LastName, Email: a.Email, Password: hash,
		Telefone: a.Telefone, IsAdministrador: true,
	}

	status := "active"
	var dataFimTrial *time.Time
	if plan.TrialDias > 0 {
		status = "trialing"
		t := time.Now().AddDate(0, 0, plan.TrialDias)
		dataFimTrial = &t
	}
	sub := &models.Subscription{
		PlanID: plan.ID, Status: status, Ciclo: "mensal", DataInicio: time.Now(),
		DataFimTrial: dataFimTrial, Valor: plan.PrecoMensal,
	}

	if err := s.repo.RegisterTransaction(ctx, tenant, admin, sub); err != nil {
		return nil, nil, nil, "", "", err
	}

	access, err := s.authSvc.GenerateAccess(admin)
	if err != nil {
		return nil, nil, nil, "", "", err
	}
	refresh, err := s.authSvc.GenerateRefresh(admin)
	if err != nil {
		return nil, nil, nil, "", "", err
	}
	role := admin.Role()
	tok := &models.Token{
		Token: access, RefreshToken: &refresh, UserID: admin.ID, UserType: &role,
		Email: admin.Email, ExpiresAt: time.Now().Add(auth.AccessTTL),
		CreatedAt: time.Now(), UpdatedAt: time.Now(),
	}
	if err := s.authRepo.ReplaceUserSession(ctx, tok); err != nil {
		return nil, nil, nil, "", "", err
	}

	return tenant, admin, sub, access, refresh, nil
}

func (s *Service) resolvePlan(ctx context.Context, planID *uint, planSlug *string) (*models.Plan, error) {
	if planID != nil {
		p, err := s.billingSvc.GetPlan(ctx, *planID)
		if err != nil {
			return nil, ErrPlanNotFound
		}
		return p, nil
	}
	// Fallback: plan_slug informado ou 'free' (gotcha 01-spec §7.14 — o plano
	// free precisa existir via seed, senão o onboarding quebra aqui).
	slug := "free"
	if planSlug != nil && *planSlug != "" {
		slug = *planSlug
	}
	p, err := s.billingSvc.GetPlanBySlug(ctx, slug)
	if err != nil {
		return nil, ErrPlanNotFound
	}
	return p, nil
}

// ChangePlanSelf: PUT direto na subscription do próprio tenant, sem cancelar
// nem recriar (replica literalmente "UPDATE subscription SET plan_id,
// status='active'" do Node — ver 01-spec §2.2, diferente do fluxo do painel
// super-admin em billing.ChangePlanForTenant, que cancela+recria).
func (s *Service) ChangePlanSelf(ctx context.Context, tenantID, planID uint) (*models.Plan, error) {
	plan, err := s.billingSvc.GetPlan(ctx, planID)
	if err != nil {
		return nil, ErrPlanNotFound
	}
	sub, err := s.repo.LatestSubscriptionForTenant(ctx, tenantID)
	if err != nil {
		return nil, ErrNoSubscription
	}
	if err := s.repo.UpdateSubscription(ctx, sub.ID, map[string]any{"plan_id": planID, "status": "active"}); err != nil {
		return nil, err
	}
	return plan, nil
}

// ---- Settings self-service (ver 01-spec §2.4) ----

func (s *Service) GetSettings(ctx context.Context, tenantID uint) (*models.Tenant, error) {
	return s.repo.FindByID(ctx, tenantID)
}

func (s *Service) UpdateSettings(ctx context.Context, tenantID uint, req UpdateSettingsRequest) (*models.Tenant, error) {
	updates := req.ToUpdates()
	if len(updates) > 0 {
		if err := s.repo.Update(ctx, tenantID, updates); err != nil {
			return nil, err
		}
	}
	return s.repo.FindByID(ctx, tenantID)
}

func (s *Service) UpdateLogo(ctx context.Context, tenantID uint, logoPath string) error {
	return s.repo.Update(ctx, tenantID, map[string]any{"logo": logoPath})
}

// GetAsaasSettings mascara a chave (últimos 6 caracteres visíveis).
func (s *Service) GetAsaasSettings(ctx context.Context, tenantID uint, webhookBaseURL string) (*AsaasSettingsResponse, error) {
	t, err := s.repo.FindByID(ctx, tenantID)
	if err != nil {
		return nil, err
	}
	resp := &AsaasSettingsResponse{
		AsaasAPIKeyConfigured: t.AsaasAPIKey != nil && *t.AsaasAPIKey != "",
		AsaasWebhookToken:     t.AsaasWebhookToken,
		WebhookURL:            fmt.Sprintf("%s/api/webhook/asaas/%d", strings.TrimSuffix(webhookBaseURL, "/"), t.ID),
	}
	if resp.AsaasAPIKeyConfigured {
		key := *t.AsaasAPIKey
		preview := "****" + lastN(key, 6)
		resp.AsaasAPIKeyPreview = &preview
	}
	return resp, nil
}

// UpdateAsaasSettings: string vazia apaga (→NULL). Testa conexão se veio chave nova.
func (s *Service) UpdateAsaasSettings(ctx context.Context, tenantID uint, req UpdateAsaasRequest) (bool, string, error) {
	updates := map[string]any{}
	testado, testMsg := false, ""

	if req.AsaasAPIKey != nil {
		if *req.AsaasAPIKey == "" {
			updates["asaas_api_key"] = nil
		} else {
			updates["asaas_api_key"] = *req.AsaasAPIKey
			testado = true
			testMsg = TestAsaasConnection(*req.AsaasAPIKey)
		}
	}
	if req.AsaasWebhookToken != nil {
		if *req.AsaasWebhookToken == "" {
			updates["asaas_webhook_token"] = nil
		} else {
			updates["asaas_webhook_token"] = *req.AsaasWebhookToken
		}
	}
	if len(updates) > 0 {
		if err := s.repo.Update(ctx, tenantID, updates); err != nil {
			return false, "", err
		}
	}
	return testado, testMsg, nil
}

func lastN(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[len(s)-n:]
}

// TestAsaasConnection faz uma chamada mínima à API do Asaas para validar a
// chave (produção ou sandbox, detectado pelo prefixo "$aact_"). Implementação
// própria (net/http puro) — o SDK/serviço completo de pagamentos Asaas é de
// outro cluster de migração; aqui cobrimos apenas a validação de settings.
func TestAsaasConnection(apiKey string) string {
	base := "https://api.asaas.com/v3"
	if strings.Contains(apiKey, "sandbox") || strings.HasPrefix(apiKey, "$aact_hmlg") {
		base = "https://sandbox.asaas.com/api/v3"
	}
	client := &http.Client{Timeout: 8 * time.Second, Transport: &http.Transport{TLSClientConfig: &tls.Config{MinVersion: tls.VersionTLS12}}}
	reqHTTP, err := http.NewRequest(http.MethodGet, base+"/myAccount", nil)
	if err != nil {
		return "erro ao montar requisição de teste"
	}
	reqHTTP.Header.Set("access_token", apiKey)
	resp, err := client.Do(reqHTTP)
	if err != nil {
		return "falha ao conectar com o Asaas: " + err.Error()
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		return "conexão com Asaas validada com sucesso"
	}
	var body map[string]any
	_ = json.NewDecoder(resp.Body).Decode(&body)
	return fmt.Sprintf("Asaas respondeu status %d — verifique a chave", resp.StatusCode)
}
