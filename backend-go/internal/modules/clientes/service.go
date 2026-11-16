package clientes

import (
	"context"
	"errors"
	"regexp"
	"strconv"
	"strings"

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

// normalizeRenda grava sempre no formato pt-BR "1.234,56" (a coluna é
// VARCHAR e o front lê os dígitos). Entrada que não é número fica como veio —
// validarInput já barrou esse caso antes de chegar aqui.
func normalizeRenda(s string) string {
	s = strings.TrimSpace(s)
	if s == "" {
		return s
	}
	f, err := models.ParseRenda(strings.TrimSpace(strings.ReplaceAll(s, "R$", "")))
	if err != nil {
		return s
	}
	return formatarReais(f)
}

// formatarReais formata 1234.5 como "1.234,50".
func formatarReais(f float64) string {
	txt := strconv.FormatFloat(f, 'f', 2, 64)
	inteiro, dec := txt[:len(txt)-3], txt[len(txt)-2:]
	neg := strings.HasPrefix(inteiro, "-")
	inteiro = strings.TrimPrefix(inteiro, "-")
	var b strings.Builder
	for i, r := range inteiro {
		if i > 0 && (len(inteiro)-i)%3 == 0 {
			b.WriteByte('.')
		}
		b.WriteRune(r)
	}
	if neg {
		return "-" + b.String() + "," + dec
	}
	return b.String() + "," + dec
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
		// Campo enviado vazio = apagar. Antes gravava "" e, no front, o
		// formulário nem mandava o vazio — apagar um campo na edição não pegava.
		if strings.TrimSpace(v) == "" {
			*dst = nil
			return
		}
		*dst = &v
	}

	trim := func(s string) string { return strings.TrimSpace(s) }
	lowerTrim := func(s string) string { return strings.ToLower(strings.TrimSpace(s)) }

	set(&c.Nome, in.Nome, trim)
	set(&c.Email, in.Email, normalizeEmail)
	set(&c.Telefone, in.Telefone, trim)
	set(&c.CPF, in.CPF, normalizeCPF)
	set(&c.EstadoCivil, in.EstadoCivil, lowerTrim)
	set(&c.Naturalidade, in.Naturalidade, trim)
	set(&c.Profissao, in.Profissao, trim)
	set(&c.Origem, in.Origem, trim)
	set(&c.Interesse, in.Interesse, trim)
	set(&c.DataNascimento, in.DataNascimento, formatDateOnly)
	set(&c.DataAdmissao, in.DataAdmissao, formatDateOnly)

	set(&c.ValorRenda, in.ValorRenda, normalizeRenda)
	set(&c.RendaTipo, in.RendaTipo, lowerTrim)
	set(&c.NumeroPis, in.NumeroPis, trim)

	if b := parseLooseBool(in.PossuiCarteiraMaisTresAnos); b != nil {
		c.PossuiCarteiraMaisTresAnos = b
	}
	if b := parseLooseBool(in.PossuiDependente); b != nil {
		c.PossuiDependente = b
	}

	set(&c.ConjugeNome, in.ConjugeNome, trim)
	set(&c.ConjugeEmail, in.ConjugeEmail, normalizeEmail)
	set(&c.ConjugeTelefone, in.ConjugeTelefone, nil)
	set(&c.ConjugeCPF, in.ConjugeCPF, normalizeCPF)
	set(&c.ConjugeProfissao, in.ConjugeProfissao, trim)
	set(&c.ConjugeDataNascimento, in.ConjugeDataNascimento, formatDateOnly)
	set(&c.ConjugeValorRenda, in.ConjugeValorRenda, normalizeRenda)
	set(&c.ConjugeRendaTipo, in.ConjugeRendaTipo, lowerTrim)
	set(&c.ConjugeDataAdmissao, in.ConjugeDataAdmissao, formatDateOnly)

	if b := parseLooseBool(in.PossuiFiador); b != nil {
		c.PossuiFiador = *b
	}
	set(&c.FiadorNome, in.FiadorNome, trim)
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
	if err := validarInput(in, nil); err != nil {
		return nil, err
	}
	cpf := ""
	if in.CPF != nil {
		cpf = normalizeCPF(*in.CPF)
	}
	// Duplicidade só dentro da empresa (UNIQUE por tenant, migração 0019).
	if cpf != "" && s.repo.cpfEmUso(ctx, tenantID, cpf, 0) {
		return nil, ErrCPFDuplicado
	}
	if in.Email != nil && s.repo.emailEmUso(ctx, tenantID, normalizeEmail(*in.Email), 0) {
		return nil, ErrosCampos{{Campo: "email", Mensagem: "Já existe um cliente com este e-mail."}}
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
	} else if in.UserID != nil && strings.TrimSpace(*in.UserID) != "" {
		uid, err := strconv.ParseUint(strings.TrimSpace(*in.UserID), 10, 64)
		if err != nil || !s.repo.usuarioDaEmpresa(ctx, uint(uid), tenantID) {
			return nil, ErrosCampos{{Campo: "userId", Mensagem: "Escolha um responsável da lista."}}
		}
		u := uint(uid)
		c.UserID = &u
	} else {
		c.UserID = &actor.ID
	}

	if in.DataCriacao != nil && strings.TrimSpace(*in.DataCriacao) != "" {
		if t, ok := dataDoCadastro(*in.DataCriacao); ok {
			c.CreatedAt = t
		}
	}

	if err := s.repo.Create(ctx, c); err != nil {
		return nil, conflitoUnico(err)
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

	if err := validarInput(in, c); err != nil {
		return nil, err
	}
	if in.CPF != nil {
		novoCPF := normalizeCPF(*in.CPF)
		if novoCPF != "" && (c.CPF == nil || novoCPF != *c.CPF) && s.repo.cpfEmUso(ctx, c.TenantID, novoCPF, c.ID) {
			return nil, ErrCPFDuplicado
		}
	}
	if in.Email != nil {
		novo := normalizeEmail(*in.Email)
		if novo != "" && (c.Email == nil || novo != *c.Email) && s.repo.emailEmUso(ctx, c.TenantID, novo, c.ID) {
			return nil, ErrosCampos{{Campo: "email", Mensagem: "Já existe um cliente com este e-mail."}}
		}
	}

	applyInput(c, in, true)

	// Data do cadastro também é editável (painel lateral da lista).
	if in.DataCriacao != nil && strings.TrimSpace(*in.DataCriacao) != "" {
		if t, ok := dataDoCadastro(*in.DataCriacao); ok {
			c.CreatedAt = t
		}
	}

	if in.Status != nil && strings.TrimSpace(*in.Status) != "" {
		st := strings.TrimSpace(*in.Status)
		if !models.IsStatusValido(st) {
			return nil, ErrStatusInvalido
		}
		c.Status = st
	}

	// Transferência de userId — só admin/correspondente (§2.1 PUT).
	if in.UserID != nil && strings.TrimSpace(*in.UserID) != "" && (actor.IsAdministrador || actor.IsCorrespondente) {
		uid, err := strconv.ParseUint(strings.TrimSpace(*in.UserID), 10, 64)
		if err != nil || !s.repo.usuarioDaEmpresa(ctx, uint(uid), c.TenantID) {
			return nil, ErrosCampos{{Campo: "userId", Mensagem: "Escolha um responsável da lista."}}
		}
		u := uint(uid)
		c.UserID = &u
	}

	if err := s.repo.Save(ctx, c); err != nil {
		return nil, conflitoUnico(err)
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
	return s.repo.List(ctx, s.filtrosDe(actor, q))
}

// Contagens alimenta as abas da lista: total por status, já reduzido aos
// clientes que o ator pode ver. Passa pelo mesmo filtrosDe da listagem para que
// um corretor conte apenas a própria carteira.
func (s *Service) Contagens(ctx context.Context, actor *models.User, q ListQuery) ([]ContagemPorStatus, error) {
	return s.repo.Contagens(ctx, s.filtrosDe(actor, q))
}

// filtrosDe traduz a query em filtros de repositório aplicando a regra de
// visibilidade: corretor puro só enxerga os próprios clientes e não pode
// escolher outro corretor no filtro.
func (s *Service) filtrosDe(actor *models.User, q ListQuery) ListFilters {
	f := ListFilters{
		Recentes: q.Recentes,
		Page:     q.Page, Limit: q.Limit, Search: q.Search, Status: q.Status,
		Grupo: q.Grupo, Corretor: q.Corretor, Inicio: q.Inicio, Fim: q.Fim,
	}
	if actor.IsCorretor && !actor.IsAdministrador && !actor.IsCorrespondente {
		f.OnlyUserID = &actor.ID
		f.Corretor = ""
	}
	return f
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
