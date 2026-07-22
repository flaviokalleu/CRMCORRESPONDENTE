package clientes

import (
	"context"
	"errors"
	"regexp"
	"strconv"
	"strings"
	"time"

	"crmimob/internal/models"
)

var (
	ErrCPFDuplicado    = errors.New("clientes: CPF já cadastrado")
	ErrDadosInvalidos  = errors.New("clientes: dados inválidos")
	ErrStatusInvalido  = errors.New("clientes: status inválido")
	ErrNaoEncontrado   = errors.New("clientes: cliente não encontrado")
	ErrSemPermissao    = errors.New("clientes: sem permissão para esta operação")
	ErrTipoDocInvalido = errors.New("clientes: tipo de documento inválido")
)

var onlyDigits = regexp.MustCompile(`\D`)

type Service struct {
	repo *Repository
}

func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

// --- Normalização (equivalente a buildClienteData/buildClienteDataForCreate — §3.8) ---

func normalizeCPF(s string) string { return onlyDigits.ReplaceAllString(s, "") }

func normalizeEmail(s string) string { return strings.ToLower(strings.TrimSpace(s)) }

// normalizeRenda mantém o valor se já tiver vírgula (assume-se já formatado
// pt-BR); senão tenta formatar como "1234.56" → "1234,56" (2 casas).
func normalizeRenda(s string) string {
	s = strings.TrimSpace(s)
	if s == "" {
		return s
	}
	if strings.Contains(s, ",") {
		return s
	}
	if f, err := strconv.ParseFloat(s, 64); err == nil {
		return strconv.FormatFloat(f, 'f', 2, 64)
	}
	return s
}

// formatDateOnly replica `formatDateOnly` do Node: mantém só a parte "YYYY-MM-DD".
func formatDateOnly(s string) string {
	s = strings.TrimSpace(s)
	if idx := strings.Index(s, "T"); idx >= 0 {
		return s[:idx]
	}
	return s
}

func parseLooseBool(s *string) *bool {
	if s == nil {
		return nil
	}
	v := strings.TrimSpace(*s)
	if v == "" {
		return nil
	}
	b := v == "true" || v == "1"
	return &b
}

// applyInput aplica as transformações de ClienteInput sobre um *models.Cliente
// já existente (update parcial) ou vazio (criação). `partial` = true no update:
// só sobrescreve campos não-nil (equivalente ao "!== undefined && !== null" do Node).
func applyInput(c *models.Cliente, in ClienteInput, partial bool) {
	set := func(dst **string, src *string, transform func(string) string) {
		if src == nil {
			if !partial {
				*dst = nil
			}
			return
		}
		v := *src
		if transform != nil {
			v = transform(v)
		}
		*dst = &v
	}

	trim := func(s string) string { return strings.TrimSpace(s) }

	set(&c.Nome, in.Nome, trim)
	set(&c.Email, in.Email, normalizeEmail)
	set(&c.Telefone, in.Telefone, nil)
	set(&c.CPF, in.CPF, normalizeCPF)
	set(&c.EstadoCivil, in.EstadoCivil, nil)
	set(&c.Naturalidade, in.Naturalidade, trim)
	set(&c.Profissao, in.Profissao, trim)
	set(&c.DataNascimento, in.DataNascimento, formatDateOnly)
	set(&c.DataAdmissao, in.DataAdmissao, formatDateOnly)

	set(&c.ValorRenda, in.ValorRenda, normalizeRenda)
	set(&c.RendaTipo, in.RendaTipo, nil)
	set(&c.NumeroPis, in.NumeroPis, trim)

	if b := parseLooseBool(in.PossuiCarteiraMaisTresAnos); b != nil {
		c.PossuiCarteiraMaisTresAnos = b
	}
	if b := parseLooseBool(in.PossuiDependente); b != nil {
		c.PossuiDependente = b
	}

	set(&c.ConjugeNome, in.ConjugeNome, nil)
	set(&c.ConjugeEmail, in.ConjugeEmail, normalizeEmail)
	set(&c.ConjugeTelefone, in.ConjugeTelefone, nil)
	set(&c.ConjugeCPF, in.ConjugeCPF, normalizeCPF)
	set(&c.ConjugeProfissao, in.ConjugeProfissao, nil)
	set(&c.ConjugeDataNascimento, in.ConjugeDataNascimento, formatDateOnly)
	set(&c.ConjugeValorRenda, in.ConjugeValorRenda, normalizeRenda)
	set(&c.ConjugeRendaTipo, in.ConjugeRendaTipo, nil)
	set(&c.ConjugeDataAdmissao, in.ConjugeDataAdmissao, formatDateOnly)

	if b := parseLooseBool(in.PossuiFiador); b != nil {
		c.PossuiFiador = *b
	}
	set(&c.FiadorNome, in.FiadorNome, nil)
	set(&c.FiadorCPF, in.FiadorCPF, normalizeCPF)
	set(&c.FiadorTelefone, in.FiadorTelefone, nil)
	set(&c.FiadorEmail, in.FiadorEmail, normalizeEmail)

	if b := parseLooseBool(in.PossuiFormulariosCaixa); b != nil {
		c.PossuiFormulariosCaixa = *b
	}
}

// ValidateCreate replica a validação mínima do builder de criação: nome,
// email, cpf obrigatórios; cpf com 11 dígitos (sem checar dígito verificador —
// gotcha §3.8, preservado 1:1).
func ValidateCreate(c *models.Cliente) error {
	if c.Nome == nil || strings.TrimSpace(*c.Nome) == "" {
		return ErrDadosInvalidos
	}
	if c.Email == nil || strings.TrimSpace(*c.Email) == "" {
		return ErrDadosInvalidos
	}
	if c.CPF == nil || len(*c.CPF) != 11 {
		return ErrDadosInvalidos
	}
	if c.Status != "" && !models.IsStatusValido(c.Status) {
		return ErrStatusInvalido
	}
	return nil
}

// --- Criação ---

func (s *Service) Create(ctx context.Context, in ClienteInput, tenantID uint, actor *models.User) (*models.Cliente, error) {
	cpf := ""
	if in.CPF != nil {
		cpf = normalizeCPF(*in.CPF)
	}
	if cpf != "" {
		if _, err := s.repo.FindByCPF(ctx, cpf); err == nil {
			return nil, ErrCPFDuplicado
		}
	}

	c := &models.Cliente{Status: "aguardando_aprovacao", TenantID: tenantID}
	applyInput(c, in, false)

	if in.Status != nil && strings.TrimSpace(*in.Status) != "" {
		c.Status = strings.TrimSpace(*in.Status)
	}

	if err := ValidateCreate(c); err != nil {
		return nil, err
	}

	// Vínculo de user_id: admin/correspondente podem vincular a outro user_id;
	// corretor sempre vincula a si mesmo (§2.1 POST).
	if actor.IsCorretor && !actor.IsAdministrador && !actor.IsCorrespondente {
		c.UserID = &actor.ID
	} else if in.UserID != nil {
		if uid, err := strconv.ParseUint(*in.UserID, 10, 64); err == nil {
			u := uint(uid)
			c.UserID = &u
		}
	} else {
		c.UserID = &actor.ID
	}

	if in.DataCriacao != nil && strings.TrimSpace(*in.DataCriacao) != "" {
		if t, err := time.Parse("2006-01-02", formatDateOnly(*in.DataCriacao)); err == nil {
			c.CreatedAt = t
		}
	}

	if err := s.repo.Create(ctx, c); err != nil {
		return nil, err
	}
	return c, nil
}

// --- Atualização ---

func (s *Service) Update(ctx context.Context, id uint, in ClienteInput, actor *models.User) (*models.Cliente, error) {
	c, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, ErrNaoEncontrado
	}
	if !CanAccessClient(actor, c) {
		return nil, ErrSemPermissao
	}

	// Corretor não pode alterar status nem editar cliente de outro (já barrado
	// acima) — remove Status do input antes de aplicar (§2.1 PUT).
	if actor.IsCorretor && !actor.IsAdministrador && !actor.IsCorrespondente {
		in.Status = nil
	}

	if in.CPF != nil {
		novoCPF := normalizeCPF(*in.CPF)
		if novoCPF != "" && c.CPF != nil && novoCPF != *c.CPF {
			if existing, err := s.repo.FindByCPF(ctx, novoCPF); err == nil && existing.ID != c.ID {
				return nil, ErrCPFDuplicado
			}
		}
	}

	applyInput(c, in, true)

	if in.Status != nil && strings.TrimSpace(*in.Status) != "" {
		st := strings.TrimSpace(*in.Status)
		if !models.IsStatusValido(st) {
			return nil, ErrStatusInvalido
		}
		c.Status = st
	}

	// Transferência de userId — só admin/correspondente (§2.1 PUT).
	if in.UserID != nil && (actor.IsAdministrador || actor.IsCorrespondente) {
		if uid, err := strconv.ParseUint(*in.UserID, 10, 64); err == nil {
			u := uint(uid)
			c.UserID = &u
		}
	}

	if err := s.repo.Save(ctx, c); err != nil {
		return nil, err
	}
	return c, nil
}

// --- Status ---

// UpdateStatus é permitido SOMENTE para admin/correspondente — corretor é
// sempre bloqueado, mesmo dono do cliente (§2.1 PATCH, regra explícita).
func (s *Service) UpdateStatus(ctx context.Context, id uint, status string, actor *models.User) (*models.Cliente, error) {
	if actor.IsCorretor && !actor.IsAdministrador && !actor.IsCorrespondente {
		return nil, ErrSemPermissao
	}
	if !models.IsStatusValido(status) {
		return nil, ErrStatusInvalido
	}
	c, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, ErrNaoEncontrado
	}
	if err := s.repo.UpdateStatus(ctx, id, status); err != nil {
		return nil, err
	}
	c.Status = status
	return c, nil
}

// --- Delete ---

func (s *Service) Delete(ctx context.Context, id uint, actor *models.User) error {
	c, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return ErrNaoEncontrado
	}
	if !CanAccessClient(actor, c) {
		return ErrSemPermissao
	}
	// Nota (gotcha §6.13): hard delete não remove arquivos do disco nem
	// decrementa storage — preservado 1:1 do comportamento Node por enquanto.
	return s.repo.Delete(ctx, id)
}

// --- Consultas ---

func (s *Service) Get(ctx context.Context, id uint, actor *models.User) (*models.Cliente, error) {
	c, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, ErrNaoEncontrado
	}
	if !CanAccessClient(actor, c) {
		return nil, ErrSemPermissao
	}
	return c, nil
}

func (s *Service) List(ctx context.Context, actor *models.User, q ListQuery) ([]models.Cliente, int64, error) {
	f := ListFilters{Page: q.Page, Limit: q.Limit, Search: q.Search, Status: q.Status, Corretor: q.Corretor}
	if actor.IsCorretor && !actor.IsAdministrador && !actor.IsCorrespondente {
		f.OnlyUserID = &actor.ID
		f.Corretor = "" // corretor não pode filtrar por outro corretor
	}
	return s.repo.List(ctx, f)
}

// CanAccessClient replica a checagem "Admin/Correspondente/Corretor(dono)"
// usada em GET/:id, PUT/:id, DELETE/:id e nas rotas de documento.
func CanAccessClient(actor *models.User, c *models.Cliente) bool {
	if actor.IsAdministrador || actor.IsCorrespondente || actor.IsSuperAdmin {
		return true
	}
	if actor.IsCorretor {
		return c.UserID != nil && *c.UserID == actor.ID
	}
	return false
}
