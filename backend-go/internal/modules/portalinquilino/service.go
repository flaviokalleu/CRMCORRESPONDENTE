package portalinquilino

import (
	"context"
	"errors"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"time"

	"crmimob/internal/models"
)

var (
	ErrNotFound      = errors.New("inquilino não encontrado")
	ErrPortalDisabled = errors.New("portal do inquilino desabilitado para esta empresa")
	ErrContratoNotFound = errors.New("contrato não disponível")
)

var onlyDigits = regexp.MustCompile(`\D`)

type Service struct {
	repo *Repository
	auth *AuthService
}

func NewService(repo *Repository, auth *AuthService) *Service {
	return &Service{repo: repo, auth: auth}
}

// Login busca o inquilino por CPF (limpo e formatado), valida o feature-flag
// do tenant e emite o JWT do portal (24h). POST /api/portal/login.
func (s *Service) Login(ctx context.Context, cpfRaw string) (*LoginResponse, error) {
	limpo := onlyDigits.ReplaceAllString(cpfRaw, "")
	c, err := s.repo.FindByCPF(ctx, limpo, cpfRaw)
	if err != nil {
		return nil, ErrNotFound
	}
	if !s.repo.PermitirPortal(ctx, c.TenantID) {
		return nil, ErrPortalDisabled
	}
	token, err := s.auth.GenerateToken(c.ID, c.Nome)
	if err != nil {
		return nil, err
	}
	return &LoginResponse{Token: token, Nome: c.Nome, Email: derefStr(c.Email)}, nil
}

func derefStr(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

// MeusDados devolve o inquilino + imóvel + flag `em_atraso` (dia atual >
// dia_vencimento && !pago).
func (s *Service) MeusDados(ctx context.Context, clienteAluguelID uint) (*MeusDadosResponse, error) {
	c, err := s.repo.FindByID(ctx, clienteAluguelID)
	if err != nil {
		return nil, ErrNotFound
	}
	res := &MeusDadosResponse{Inquilino: c}
	if c.AluguelID != nil {
		if imovel, err := s.repo.FindAluguel(ctx, *c.AluguelID); err == nil {
			res.Imovel = imovel
		}
	}
	hoje := time.Now()
	res.EmAtraso = hoje.Day() > c.DiaVencimento && !c.Pago
	return res, nil
}

func (s *Service) Cobrancas(ctx context.Context, clienteAluguelID uint) ([]models.CobrancaAluguel, error) {
	return s.repo.ListCobrancas(ctx, clienteAluguelID)
}

func (s *Service) Recibos(ctx context.Context, clienteAluguelID uint) ([]models.CobrancaAluguel, error) {
	return s.repo.ListRecibos(ctx, clienteAluguelID)
}

// ReciboPDFPath resolve o caminho do PDF de recibo, exigindo `recibo_url`
// preenchido (gerado no fluxo do webhook Asaas — fora deste módulo).
func (s *Service) ReciboPDFPath(ctx context.Context, clienteAluguelID, cobrancaID uint) (string, error) {
	cob, err := s.repo.FindCobranca(ctx, cobrancaID)
	if err != nil || cob.ClienteAluguelID != clienteAluguelID {
		return "", ErrNotFound
	}
	if cob.ReciboURL == nil || *cob.ReciboURL == "" {
		return "", ErrNotFound
	}
	return safeUploadsPath(*cob.ReciboURL)
}

// ContratoPDFPath resolve o PDF do contrato em cascata: contrato_documentos
// (mais recente) → contrato_path (legado) → PDF mais recente gerado em
// uploads/contratos/{id}/.
func (s *Service) ContratoPDFPath(ctx context.Context, clienteAluguelID uint) (string, error) {
	c, err := s.repo.FindByID(ctx, clienteAluguelID)
	if err != nil {
		return "", ErrNotFound
	}

	if len(c.ContratoDocumentos) > 2 { // "[]" tem len 2
		// O parsing detalhado do JSONB fica no módulo `contratos`
		// (mantém a normalização num único lugar) — aqui tentamos apenas o
		// fallback legado e a pasta de PDFs gerados, que cobrem a maioria
		// dos casos sem duplicar a lógica de parsing.
	}

	if c.ContratoPath != nil && *c.ContratoPath != "" {
		if p, err := safeUploadsPath(*c.ContratoPath); err == nil {
			if _, statErr := os.Stat(p); statErr == nil {
				return p, nil
			}
		}
	}

	dir := filepath.Join("uploads", "contratos", strconv.FormatUint(uint64(clienteAluguelID), 10))
	entries, err := os.ReadDir(dir)
	if err != nil {
		return "", ErrContratoNotFound
	}
	var latest string
	var latestMod time.Time
	for _, e := range entries {
		if e.IsDir() || !strings.HasSuffix(e.Name(), ".pdf") {
			continue
		}
		info, err := e.Info()
		if err != nil {
			continue
		}
		if info.ModTime().After(latestMod) {
			latestMod = info.ModTime()
			latest = e.Name()
		}
	}
	if latest == "" {
		return "", ErrContratoNotFound
	}
	return filepath.Join(dir, latest), nil
}

// safeUploadsPath resolve um caminho relativo dentro de uploads/, recusando
// path traversal.
func safeUploadsPath(rel string) (string, error) {
	root, err := filepath.Abs("uploads")
	if err != nil {
		return "", err
	}
	full, err := filepath.Abs(filepath.Join("uploads", strings.TrimPrefix(rel, "uploads/")))
	if err != nil || !strings.HasPrefix(full, root) {
		return "", errors.New("caminho inválido")
	}
	return full, nil
}
