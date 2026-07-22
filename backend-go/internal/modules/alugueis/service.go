package alugueis

import (
	"archive/zip"
	"context"
	"errors"
	"io"
	"os"
	"path/filepath"
	"time"

	"github.com/gin-gonic/gin"

	"crmimob/internal/models"
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

// CreateAluguel cria o imóvel a partir do form + arquivos (foto_capa único,
// fotos_adicionais até 10). Em erro após mover arquivos, eles NÃO são
// revertidos automaticamente pelo GORM — o handler deve limpar em caso de
// falha de Create (replica o "cleanup em erro" do Node).
func (s *Service) CreateAluguel(c *gin.Context, req AluguelRequest, tenantID *uint) (*models.Aluguel, error) {
	valor, err := parseCurrencyValue(req.ValorAluguel)
	if err != nil {
		return nil, err
	}

	a := &models.Aluguel{
		NomeImovel:    req.NomeImovel,
		Descricao:     req.Descricao,
		ValorAluguel:  valor,
		Quartos:       req.Quartos,
		Banheiro:      req.Banheiro,
		DiaVencimento: req.DiaVencimento,
		TenantID:      tenantID,
	}

	if fh, _ := formFile(c, "foto_capa"); fh != nil {
		rel, err := saveMultipartFile(fh, "alugueis", maxImageBytes)
		if err != nil {
			return nil, err
		}
		a.FotoCapa = &rel
	}

	if err := s.repo.CreateAluguel(c.Request.Context(), a); err != nil {
		if a.FotoCapa != nil {
			removeUploadedFile(*a.FotoCapa)
		}
		return nil, err
	}

	s.emit(tenantID, "aluguel-criado", a)
	return a, nil
}

// UpdateAluguel substitui campos + foto_capa (apagando a antiga) e a lista de
// fotos adicionais por inteiro, igual ao Node.
func (s *Service) UpdateAluguel(c *gin.Context, id uint, req AluguelRequest) (*models.Aluguel, error) {
	ctx := c.Request.Context()
	a, err := s.repo.FindAluguelByID(ctx, id)
	if err != nil {
		return nil, ErrNotFound
	}

	valor, err := parseCurrencyValue(req.ValorAluguel)
	if err != nil {
		return nil, err
	}
	a.NomeImovel = req.NomeImovel
	a.Descricao = req.Descricao
	a.ValorAluguel = valor
	a.Quartos = req.Quartos
	a.Banheiro = req.Banheiro
	a.DiaVencimento = req.DiaVencimento

	if fh, _ := formFile(c, "foto_capa"); fh != nil {
		rel, err := saveMultipartFile(fh, "alugueis", maxImageBytes)
		if err != nil {
			return nil, err
		}
		if a.FotoCapa != nil {
			removeUploadedFile(*a.FotoCapa)
		}
		a.FotoCapa = &rel
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
	if a.FotoCapa != nil {
		removeUploadedFile(*a.FotoCapa)
	}
	if _, err := s.repo.DeleteAluguel(ctx, id); err != nil {
		return err
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
		full := filepath.Join(UploadsRoot, relPath)
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
	return a, nil
}

// CleanupTemp remove arquivos de uploads/temp com mais de 30 minutos.
func (s *Service) CleanupTemp() (int, error) {
	return cleanupTempFiles(30 * time.Minute)
}
