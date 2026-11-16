package alugueis

import (
	"archive/zip"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/datatypes"

	"crmimob/internal/models"
	"crmimob/internal/validacao"
	"crmimob/internal/ws"
)

var ErrNotFound = errors.New("registro não encontrado")

// Service implementa o CRUD do imóvel de locação (Aluguel). O hub de
// websocket é opcional (nil-safe) — emite os eventos `aluguel-criado`,
// `aluguel-atualizado`, `aluguel-removido` equivalentes ao Socket.io do Node.
type Service struct {
	repo *Repository
	hub  *ws.Hub
}

func NewService(repo *Repository, hub *ws.Hub) *Service {
	return &Service{repo: repo, hub: hub}
}

func (s *Service) emit(tenantID *uint, event string, data any) {
	if s.hub == nil || tenantID == nil {
		return
	}
	s.hub.BroadcastToRoom(ws.RoomForTenant(*tenantID), event, data)
}

func (s *Service) ListAlugueis(ctx context.Context) ([]models.Aluguel, error) {
	return s.repo.ListAlugueis(ctx)
}

func (s *Service) ListAlugueisDisponiveis(ctx context.Context) ([]models.Aluguel, error) {
	return s.repo.ListAlugueisDisponiveis(ctx)
}

// validarAluguel confere o formulário e devolve o primeiro erro com o campo
// da tela (antes: 500 com mensagem do Postgres ou do binding em inglês).
func validarAluguel(req AluguelRequest) (float64, error) {
	valor, e := validacao.Valor("valor_aluguel", req.ValorAluguel, "Valor do aluguel", true)
	if e := validacao.Primeiro(
		validacao.Texto("nome_imovel", req.NomeImovel, "Nome ou endereço", true),
		validacao.Obrigatorio("descricao", req.Descricao, "Descrição"),
		validacao.TextoLongo("descricao", req.Descricao, "Descrição", 5000),
		e,
		validacao.Faixa("dia_vencimento", req.DiaVencimento, "Dia do vencimento", 0, 31),
		validacao.Faixa("quartos", req.Quartos, "Quartos", 0, 99),
		validacao.Faixa("banheiro", req.Banheiro, "Banheiros", 0, 99),
	); e != nil {
		return 0, e
	}
	return *valor, nil
}

// salvarFotos grava foto_capa (1) e fotos_adicionais (até 10) depois de
// conferir TODAS — nada é gravado se uma for recusada.
func salvarFotos(c *gin.Context) (capa *string, extras []string, err error) {
	capaFH, _ := formFile(c, "foto_capa")
	extrasFH, _ := formFiles(c, "fotos_adicionais")
	if len(extrasFH) > maxFotosAdicionais {
		return nil, nil, &validacao.ErroCampo{Campo: "fotos_adicionais", Mensagem: "Envie no máximo 10 fotos de cada vez."}
	}
	if capaFH != nil {
		if e := conferirImagem(capaFH, "foto_capa", "Foto de capa"); e != nil {
			return nil, nil, e
		}
	}
	for _, fh := range extrasFH {
		if e := conferirImagem(fh, "fotos_adicionais", "Fotos"); e != nil {
			return nil, nil, e
		}
	}
	if capaFH != nil {
		rel, err := saveMultipartFile(capaFH, subdirFotos, maxImageBytes)
		if err != nil {
			return nil, nil, err
		}
		capa = &rel
	}
	for _, fh := range extrasFH {
		rel, err := saveMultipartFile(fh, subdirFotos, maxImageBytes)
		if err != nil {
			if capa != nil {
				removeUploadedFile(*capa)
			}
			for _, r := range extras {
				removeUploadedFile(r)
			}
			return nil, nil, err
		}
		extras = append(extras, rel)
	}
	return capa, extras, nil
}

func fotosAdicionais(a *models.Aluguel) []string {
	var out []string
	if len(a.FotoAdicional) > 0 {
		_ = json.Unmarshal(a.FotoAdicional, &out)
	}
	return out
}

// CreateAluguel cria o imóvel a partir do form + arquivos (foto_capa único,
// fotos_adicionais até 10).
func (s *Service) CreateAluguel(c *gin.Context, req AluguelRequest, tenantID *uint) (*models.Aluguel, error) {
	valor, err := validarAluguel(req)
	if err != nil {
		return nil, err
	}

	a := &models.Aluguel{
		NomeImovel:    strings.TrimSpace(req.NomeImovel),
		Descricao:     strings.TrimSpace(req.Descricao),
		ValorAluguel:  valor,
		Quartos:       req.Quartos,
		Banheiro:      req.Banheiro,
		DiaVencimento: req.DiaVencimento,
		TenantID:      tenantID,
	}

	capa, extras, err := salvarFotos(c)
	if err != nil {
		return nil, err
	}
	a.FotoCapa = capa
	if len(extras) > 0 {
		raw, _ := json.Marshal(extras)
		a.FotoAdicional = datatypes.JSON(raw)
	}

	if err := s.repo.CreateAluguel(c.Request.Context(), a); err != nil {
		if a.FotoCapa != nil {
			removeUploadedFile(*a.FotoCapa)
		}
		for _, r := range extras {
			removeUploadedFile(r)
		}
		return nil, err
	}

	s.emit(tenantID, "aluguel-criado", a)
	return a, nil
}

// UpdateAluguel substitui campos + foto_capa (apagando a antiga) e ACRESCENTA
// as fotos adicionais novas às existentes.
func (s *Service) UpdateAluguel(c *gin.Context, id uint, req AluguelRequest) (*models.Aluguel, error) {
	ctx := c.Request.Context()
	a, err := s.repo.FindAluguelByID(ctx, id)
	if err != nil {
		return nil, ErrNotFound
	}

	valor, err := validarAluguel(req)
	if err != nil {
		return nil, err
	}
	a.NomeImovel = strings.TrimSpace(req.NomeImovel)
	a.Descricao = strings.TrimSpace(req.Descricao)
	a.ValorAluguel = valor
	a.Quartos = req.Quartos
	a.Banheiro = req.Banheiro
	a.DiaVencimento = req.DiaVencimento

	capa, extras, err := salvarFotos(c)
	if err != nil {
		return nil, err
	}
	if capa != nil {
		if a.FotoCapa != nil {
			removeUploadedFile(*a.FotoCapa)
		}
		a.FotoCapa = capa
	}
	if len(extras) > 0 {
		raw, _ := json.Marshal(append(fotosAdicionais(a), extras...))
		a.FotoAdicional = datatypes.JSON(raw)
	}

	if err := s.repo.SaveAluguel(ctx, a); err != nil {
		return nil, err
	}
	s.emit(a.TenantID, "aluguel-atualizado", a)
	return a, nil
}

func (s *Service) ToggleAlugado(ctx context.Context, id uint) (*models.Aluguel, error) {
	a, err := s.repo.FindAluguelByID(ctx, id)
	if err != nil {
		return nil, ErrNotFound
	}
	a.Alugado = !a.Alugado
	if err := s.repo.SaveAluguel(ctx, a); err != nil {
		return nil, err
	}
	return a, nil
}

func (s *Service) DeleteAluguel(ctx context.Context, id uint) error {
	a, err := s.repo.FindAluguelByID(ctx, id)
	if err != nil {
		return ErrNotFound
	}
	if _, err := s.repo.DeleteAluguel(ctx, id); err != nil {
		return err
	}
	if a.FotoCapa != nil {
		removeUploadedFile(*a.FotoCapa)
	}
	for _, r := range fotosAdicionais(a) {
		removeUploadedFile(r)
	}
	s.emit(a.TenantID, "aluguel-removido", gin.H{"id": id})
	return nil
}

// DownloadFotosZip monta um ZIP com a foto de capa do imóvel (e demais fotos,
// se existirem) e escreve na resposta. Espelha `archiver` do Node.
func (s *Service) DownloadFotosZip(ctx context.Context, id uint, w io.Writer) (*models.Aluguel, error) {
	a, err := s.repo.FindAluguelByID(ctx, id)
	if err != nil {
		return nil, ErrNotFound
	}

	zw := zip.NewWriter(w)
	defer zw.Close()

	addFile := func(relPath, nameInZip string) {
		if relPath == "" {
			return
		}
		full := filepath.Join(uploadsRootDir(), relPath)
		f, err := os.Open(full)
		if err != nil {
			return
		}
		defer f.Close()
		entry, err := zw.Create(nameInZip)
		if err != nil {
			return
		}
		_, _ = io.Copy(entry, f)
	}

	if a.FotoCapa != nil {
		addFile(*a.FotoCapa, "capa"+filepath.Ext(*a.FotoCapa))
	}
	for i, r := range fotosAdicionais(a) {
		addFile(r, fmt.Sprintf("foto_%02d%s", i+1, filepath.Ext(r)))
	}
	return a, nil
}

// CleanupTemp remove arquivos de uploads/temp com mais de 30 minutos.
func (s *Service) CleanupTemp() (int, error) {
	return cleanupTempFiles(30 * time.Minute)
}
