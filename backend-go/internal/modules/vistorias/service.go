package vistorias

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/datatypes"

	"crmimob/internal/models"
)

var ErrNotFound = errors.New("vistoria não encontrada")

const uploadsRoot = "uploads"

// ComodosPadrao / ItensPadrao definem o checklist padrão (7 cômodos x 8 itens
// = 56 entradas), estado inicial "bom" — replica `getChecklistPadrao()`.
var ComodosPadrao = []string{"Sala", "Cozinha", "Quarto 1", "Quarto 2", "Banheiro", "Área de serviço", "Área externa"}
var ItensPadrao = []string{"Piso", "Paredes", "Teto", "Portas", "Janelas", "Instalação elétrica", "Instalação hidráulica", "Pintura"}

// GetChecklistPadrao monta os 56 itens padrão com estado "bom".
func GetChecklistPadrao() []models.ChecklistItem {
	out := make([]models.ChecklistItem, 0, len(ComodosPadrao)*len(ItensPadrao))
	for _, comodo := range ComodosPadrao {
		for _, item := range ItensPadrao {
			out = append(out, models.ChecklistItem{Comodo: comodo, Item: item, Estado: "bom"})
		}
	}
	return out
}

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

func (s *Service) Create(ctx context.Context, req CreateRequest) (*models.VistoriaAluguel, error) {
	tipo := req.Tipo
	if tipo == "" {
		tipo = "entrada"
	}
	dataVistoria, err := time.Parse("2006-01-02", req.DataVistoria)
	if err != nil {
		return nil, err
	}

	checklist := req.Checklist
	if len(checklist) == 0 {
		checklist = GetChecklistPadrao()
	}
	checklistRaw, err := json.Marshal(checklist)
	if err != nil {
		return nil, err
	}

	v := &models.VistoriaAluguel{
		ClienteAluguelID:  req.ClienteAluguelID,
		AluguelID:         req.AluguelID,
		Tipo:              tipo,
		DataVistoria:      dataVistoria,
		Checklist:         datatypes.JSON(checklistRaw),
		Fotos:             datatypes.JSON([]byte("[]")),
		Status:            "rascunho",
	}
	if req.ObservacoesGerais != "" {
		v.ObservacoesGerais = &req.ObservacoesGerais
	}

	if err := s.repo.Create(ctx, v); err != nil {
		return nil, err
	}
	return v, nil
}

func (s *Service) ListByCliente(ctx context.Context, clienteAluguelID uint) ([]models.VistoriaAluguel, error) {
	return s.repo.ListByCliente(ctx, clienteAluguelID)
}

func (s *Service) FindByID(ctx context.Context, id uint) (*models.VistoriaAluguel, error) {
	v, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, ErrNotFound
	}
	return v, nil
}

func (s *Service) Update(ctx context.Context, id uint, req UpdateRequest) (*models.VistoriaAluguel, error) {
	v, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, ErrNotFound
	}
	if len(req.Checklist) > 0 {
		raw, err := json.Marshal(req.Checklist)
		if err != nil {
			return nil, err
		}
		v.Checklist = datatypes.JSON(raw)
	}
	if req.ObservacoesGerais != "" {
		v.ObservacoesGerais = &req.ObservacoesGerais
	}
	if req.Status != "" {
		v.Status = req.Status
	}
	if err := s.repo.Save(ctx, v); err != nil {
		return nil, err
	}
	return v, nil
}

// AddFotos anexa arquivos enviados (multipart `fotos[]`) e metadados ao JSON
// `fotos`. Os arquivos são salvos em uploads/vistorias/{id}/.
func (s *Service) AddFotos(c *gin.Context, id uint, descricao, comodo string) (*models.VistoriaAluguel, error) {
	v, err := s.repo.FindByID(c.Request.Context(), id)
	if err != nil {
		return nil, ErrNotFound
	}

	form, ferr := c.MultipartForm()
	var files []*multipartFileHeader
	if ferr == nil {
		files = wrapFiles(form.File["fotos[]"])
		if len(files) == 0 {
			files = wrapFiles(form.File["fotos"])
		}
	}
	if len(files) > 20 {
		files = files[:20]
	}

	dir := filepath.Join(uploadsRoot, "vistorias", strconv.FormatUint(uint64(id), 10))
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return nil, err
	}

	var fotos []models.FotoVistoria
	if len(v.Fotos) > 0 {
		_ = json.Unmarshal(v.Fotos, &fotos)
	}

	for i, fh := range files {
		name := fmt.Sprintf("%d_%d%s", time.Now().UnixNano(), i, strings.ToLower(filepath.Ext(fh.Filename)))
		dstPath := filepath.Join(dir, name)
		if err := fh.saveTo(dstPath); err != nil {
			continue
		}
		fotos = append(fotos, models.FotoVistoria{
			URL:       filepath.ToSlash(filepath.Join("vistorias", strconv.FormatUint(uint64(id), 10), name)),
			Descricao: descricao,
			Comodo:    comodo,
		})
	}

	raw, err := json.Marshal(fotos)
	if err != nil {
		return nil, err
	}
	v.Fotos = datatypes.JSON(raw)
	if err := s.repo.Save(c.Request.Context(), v); err != nil {
		return nil, err
	}
	return v, nil
}

// GerarPDF monta o HTML do laudo e converte via PDFEngine; grava `pdf_url` e
// `status='finalizado'`. Falha com ErrPDFEngineNotConfigured até o motor real
// ser conectado (ver wiring doc).
func (s *Service) GerarPDF(ctx context.Context, id uint) (string, error) {
	v, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return "", ErrNotFound
	}
	inquilino, _ := s.repo.FindInquilino(ctx, v.ClienteAluguelID)

	var checklist []models.ChecklistItem
	if len(v.Checklist) > 0 {
		_ = json.Unmarshal(v.Checklist, &checklist)
	}
	html := laudoHTML(v, inquilino, checklist)

	pdfBytes, err := s.pdf.HTMLToPDF(html)
	if err != nil {
		return "", err
	}

	dir := filepath.Join(uploadsRoot, "vistorias", strconv.FormatUint(uint64(id), 10))
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return "", err
	}
	name := fmt.Sprintf("laudo_%d_%d.pdf", id, time.Now().Unix())
	path := filepath.Join(dir, name)
	if err := os.WriteFile(path, pdfBytes, 0o644); err != nil {
		return "", err
	}

	url := "/" + filepath.ToSlash(path)
	v.PdfURL = &url
	v.Status = "finalizado"
	if err := s.repo.Save(ctx, v); err != nil {
		return "", err
	}
	return url, nil
}

func laudoHTML(v *models.VistoriaAluguel, inquilino *models.ClienteAluguel, checklist []models.ChecklistItem) string {
	var b strings.Builder
	b.WriteString("<html><head><meta charset=\"utf-8\"><style>")
	b.WriteString("body{font-family:sans-serif;color:#0B1426} h1{color:#F97316}")
	b.WriteString("table{width:100%;border-collapse:collapse} td,th{border:1px solid #162a4a;padding:4px;font-size:12px}")
	b.WriteString("</style></head><body>")
	b.WriteString(fmt.Sprintf("<h1>Laudo de Vistoria — %s</h1>", strings.ToUpper(v.Tipo)))
	if inquilino != nil {
		b.WriteString(fmt.Sprintf("<p>Inquilino: %s</p>", inquilino.Nome))
	}
	b.WriteString(fmt.Sprintf("<p>Data: %s</p>", v.DataVistoria.Format("02/01/2006")))
	b.WriteString("<table><tr><th>Cômodo</th><th>Item</th><th>Estado</th><th>Observação</th></tr>")
	for _, item := range checklist {
		b.WriteString(fmt.Sprintf("<tr><td>%s</td><td>%s</td><td>%s</td><td>%s</td></tr>",
			item.Comodo, item.Item, item.Estado, item.Observacao))
	}
	b.WriteString("</table></body></html>")
	return b.String()
}

// Comparativo devolve a última vistoria de entrada vs. saída do inquilino.
func (s *Service) Comparativo(ctx context.Context, clienteAluguelID uint) (*Comparativo, error) {
	entrada, errE := s.repo.UltimaPorTipo(ctx, clienteAluguelID, "entrada")
	saida, errS := s.repo.UltimaPorTipo(ctx, clienteAluguelID, "saida")
	out := &Comparativo{}
	if errE == nil {
		out.Entrada = entrada
	}
	if errS == nil {
		out.Saida = saida
	}
	return out, nil
}
