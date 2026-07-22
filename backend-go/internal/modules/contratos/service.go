package contratos

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"time"

	"gorm.io/datatypes"

	"crmimob/internal/models"
)

var (
	ErrNotFound        = errors.New("registro não encontrado")
	ErrTenantMismatch  = errors.New("imóvel ou proprietário pertence a outro tenant")
	ErrDocNotFound     = errors.New("documento não encontrado")
)

// AsaasUpdater é o subconjunto do cliente Asaas necessário para propagar
// reajuste de valor à assinatura recorrente. Interface local (em vez de
// importar internal/modules/alugueis) para manter os módulos desacoplados —
// a implementação real de internal/integrations/asaas satisfaz ambas.
type AsaasUpdater interface {
	AtualizarAssinatura(apiKey string, subscriptionID string, novoValor float64) error
}

// Service concentra a lógica de contratoAluguel.js + contratoRoutes.js:
// texto/PDF, reajuste, vínculo e documentos.
type Service struct {
	repo *Repository
	pdf  PDFEngine
}

func NewService(repo *Repository, pdf PDFEngine) *Service {
	if pdf == nil {
		pdf = NoopPDFEngine{}
	}
	return &Service{repo: repo, pdf: pdf}
}

const uploadsRoot = "uploads"

func contratoDir(clienteAluguelID uint) string {
	return filepath.Join(uploadsRoot, "contratos", strconv.FormatUint(uint64(clienteAluguelID), 10))
}

// ObterTextoContrato devolve o texto editável salvo em disco, ou gera o
// modelo padrão a partir dos dados do inquilino/imóvel. `modelo=padrao` força
// a geração do template (ignora o .txt salvo).
func (s *Service) ObterTextoContrato(ctx context.Context, id uint, forcarModeloPadrao bool) (string, error) {
	c, err := s.repo.FindInquilino(ctx, id)
	if err != nil {
		return "", ErrNotFound
	}

	if !forcarModeloPadrao {
		path := filepath.Join(contratoDir(id), "contrato_editavel.txt")
		if raw, err := os.ReadFile(path); err == nil {
			return string(raw), nil
		}
	}

	var imovel *models.Aluguel
	if c.AluguelID != nil {
		imovel, _ = s.repo.FindAluguel(ctx, *c.AluguelID)
	}
	return GerarTextoContrato(c, imovel), nil
}

// SalvarContrato persiste o texto editável e tenta gerar o PDF (Puppeteer no
// Node → PDFEngine injetável aqui). Se o PDFEngine não estiver configurado
// (NoopPDFEngine), o texto é salvo normalmente e o erro de PDF é devolvido
// separadamente para o handler decidir a resposta.
func (s *Service) SalvarContrato(ctx context.Context, id uint, texto string) (caminho, nomeArquivo string, pdfErr error) {
	if _, err := s.repo.FindInquilino(ctx, id); err != nil {
		return "", "", ErrNotFound
	}

	dir := contratoDir(id)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return "", "", err
	}
	if err := os.WriteFile(filepath.Join(dir, "contrato_editavel.txt"), []byte(texto), 0o644); err != nil {
		return "", "", err
	}

	html := MarkdownToHTML(texto)
	pdfBytes, err := s.pdf.HTMLToPDF(html)
	if err != nil {
		return "", "", err // texto já foi salvo; handler decide status/mensagem
	}

	nomeArquivo = fmt.Sprintf("contrato_%d_%d.pdf", id, time.Now().Unix())
	caminho = filepath.Join(dir, nomeArquivo)
	if err := os.WriteFile(caminho, pdfBytes, 0o644); err != nil {
		return "", "", err
	}
	return caminho, nomeArquivo, nil
}

// BaixarContratoPDF localiza o PDF mais recente na pasta do inquilino.
func (s *Service) BaixarContratoPDF(ctx context.Context, id uint) (string, error) {
	if _, err := s.repo.FindInquilino(ctx, id); err != nil {
		return "", ErrNotFound
	}
	dir := contratoDir(id)
	entries, err := os.ReadDir(dir)
	if err != nil {
		return "", ErrNotFound
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
		return "", ErrNotFound
	}
	return filepath.Join(dir, latest), nil
}

// CalcularReajuste replica `calcularReajuste(cliente, indice=5%)`: valor
// reajustado + data-aniversário do contrato + dias restantes.
func (s *Service) CalcularReajuste(ctx context.Context, id uint, indice float64) (*ReajusteResultado, error) {
	c, err := s.repo.FindInquilino(ctx, id)
	if err != nil {
		return nil, ErrNotFound
	}
	if indice == 0 {
		indice = 5 // default 5%, igual ao Node
	}
	novo := round2(c.ValorAluguel * (1 + indice/100))

	res := &ReajusteResultado{
		ValorAnterior:  c.ValorAluguel,
		ValorNovo:      novo,
		IndiceAplicado: indice,
	}
	if c.DataInicioContrato != nil {
		aniversario := proximoAniversario(*c.DataInicioContrato, time.Now())
		res.DataAniversario = &aniversario
		res.DiasRestantes = int(math.Ceil(time.Until(aniversario).Hours() / 24))
	}
	return res, nil
}

// AplicarReajuste atualiza valor_aluguel e, se houver assinatura Asaas ativa,
// propaga via AsaasUpdater (opcional/nil-safe).
func (s *Service) AplicarReajuste(ctx context.Context, id uint, indice float64, asaasAPIKey string, updater AsaasUpdater) (*ReajusteResultado, error) {
	res, err := s.CalcularReajuste(ctx, id, indice)
	if err != nil {
		return nil, err
	}
	c, err := s.repo.FindInquilino(ctx, id)
	if err != nil {
		return nil, ErrNotFound
	}
	c.ValorAluguel = res.ValorNovo
	if err := s.repo.SaveInquilino(ctx, c); err != nil {
		return nil, err
	}
	if updater != nil && c.AsaasSubscriptionID != nil && asaasAPIKey != "" {
		_ = updater.AtualizarAssinatura(asaasAPIKey, *c.AsaasSubscriptionID, res.ValorNovo)
	}
	return res, nil
}

func proximoAniversario(inicio, now time.Time) time.Time {
	aniversario := time.Date(now.Year(), inicio.Month(), inicio.Day(), 0, 0, 0, 0, now.Location())
	if aniversario.Before(now) {
		aniversario = aniversario.AddDate(1, 0, 0)
	}
	return aniversario
}

func round2(v float64) float64 { return math.Round(v*100) / 100 }

// --- Opções, vínculo e documentos (contratoRoutes.js) ---

func (s *Service) Opcoes(ctx context.Context) (*OpcoesResponse, error) {
	imoveis, err := s.repo.ListAlugueis(ctx)
	if err != nil {
		return nil, err
	}
	proprietarios, err := s.repo.ListProprietarios(ctx)
	if err != nil {
		return nil, err
	}
	inquilinos, err := s.repo.ListInquilinos(ctx)
	if err != nil {
		return nil, err
	}
	return &OpcoesResponse{Imoveis: imoveis, Proprietarios: proprietarios, Inquilinos: inquilinos}, nil
}

// Vincular associa inquilino↔imóvel↔proprietário e denormaliza
// nome/telefone/pix do proprietário no inquilino (igual ao Node).
func (s *Service) Vincular(ctx context.Context, req VincularRequest) (*models.ClienteAluguel, error) {
	c, err := s.repo.FindInquilino(ctx, req.ClienteAluguelID)
	if err != nil {
		return nil, ErrNotFound
	}

	if req.AluguelID != nil {
		if _, err := s.repo.FindAluguel(ctx, *req.AluguelID); err != nil {
			return nil, ErrTenantMismatch
		}
		c.AluguelID = req.AluguelID
	}
	if req.ProprietarioID != nil {
		p, err := s.repo.FindProprietario(ctx, *req.ProprietarioID)
		if err != nil {
			return nil, ErrTenantMismatch
		}
		c.ProprietarioID = req.ProprietarioID
		c.ProprietarioNome = &p.Name
		c.ProprietarioTelefone = p.Phone
	}

	if err := s.repo.SaveInquilino(ctx, c); err != nil {
		return nil, err
	}
	return c, nil
}

// AtualizarVinculo (PUT /api/contratos/:id/atualizar) re-vincula — mesma
// lógica de Vincular, mas o :id do path é o próprio cliente_aluguel_id.
func (s *Service) AtualizarVinculo(ctx context.Context, id uint, req VincularRequest) (*models.ClienteAluguel, error) {
	req.ClienteAluguelID = id
	return s.Vincular(ctx, req)
}

// RemoverVinculo limpa aluguel_id/proprietário/documentos SEM apagar o
// inquilino (igual ao Node).
func (s *Service) RemoverVinculo(ctx context.Context, id uint) error {
	c, err := s.repo.FindInquilino(ctx, id)
	if err != nil {
		return ErrNotFound
	}
	c.AluguelID = nil
	c.ProprietarioID = nil
	c.ProprietarioNome = nil
	c.ProprietarioTelefone = nil
	c.ContratoDocumentos = nil
	c.ContratoPath = nil
	return s.repo.SaveInquilino(ctx, c)
}

func (s *Service) ListarContratos(ctx context.Context) ([]models.ClienteAluguel, error) {
	list, err := s.repo.ListContratos(ctx)
	if err != nil {
		return nil, err
	}
	// Normaliza contrato_documentos garantindo IDs estáveis.
	for i := range list {
		docs := decodeDocumentos(list[i].ContratoDocumentos)
		changed := false
		for j := range docs {
			if docs[j].ID == "" {
				docs[j].ID = fmt.Sprintf("%d-%d", list[i].ID, j)
				changed = true
			}
		}
		if changed {
			if raw, err := json.Marshal(docs); err == nil {
				list[i].ContratoDocumentos = datatypes.JSON(raw)
				_ = s.repo.SaveInquilino(ctx, &list[i])
			}
		}
	}
	return list, nil
}

func decodeDocumentos(raw datatypes.JSON) []ContratoDocumento {
	var docs []ContratoDocumento
	if len(raw) > 0 {
		_ = json.Unmarshal(raw, &docs)
	}
	return docs
}

// AnexarDocumentos adiciona entradas ao JSONB `contrato_documentos`.
func (s *Service) AnexarDocumentos(ctx context.Context, id uint, novos []ContratoDocumento) (*models.ClienteAluguel, error) {
	c, err := s.repo.FindInquilino(ctx, id)
	if err != nil {
		return nil, ErrNotFound
	}
	docs := decodeDocumentos(c.ContratoDocumentos)
	docs = append(docs, novos...)
	raw, err := json.Marshal(docs)
	if err != nil {
		return nil, err
	}
	c.ContratoDocumentos = datatypes.JSON(raw)
	if err := s.repo.SaveInquilino(ctx, c); err != nil {
		return nil, err
	}
	return c, nil
}

// BuscarDocumento localiza um documento por ID entre todos os contratos do
// tenant (escopo já garantido pelo callback de tenant) e devolve o caminho
// relativo salvo — o handler resolve o caminho absoluto de forma segura
// (dentro de uploads/contratos).
func (s *Service) BuscarDocumento(ctx context.Context, docID string) (*ContratoDocumento, error) {
	contratos, err := s.repo.ListContratos(ctx)
	if err != nil {
		return nil, err
	}
	sort.Slice(contratos, func(i, j int) bool { return contratos[i].ID < contratos[j].ID })
	for _, c := range contratos {
		for _, d := range decodeDocumentos(c.ContratoDocumentos) {
			if d.ID == docID {
				doc := d
				return &doc, nil
			}
		}
	}
	return nil, ErrDocNotFound
}
