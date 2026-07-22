package users

import (
	"context"
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"
	"strings"

	"crmimob/internal/models"
)

var ErrForbidden = errors.New("acesso negado")
var ErrNotFound = errors.New("usuário não encontrado")

// uploadDir é a pasta de fotos do /api/user (equivalente a uploads/usuario no Node).
const uploadDir = "uploads/usuario"

type Service struct{ repo *Repository }

func NewService(repo *Repository) *Service { return &Service{repo: repo} }

func (s *Service) Me(ctx context.Context, email string) (*models.User, error) {
	return s.repo.FindByEmail(ctx, email)
}

func (s *Service) Get(ctx context.Context, id uint) (*models.User, error) {
	return s.repo.FindByID(ctx, id)
}

func (s *Service) List(ctx context.Context) ([]models.User, error) {
	return s.repo.List(ctx)
}

// CanManage replica a regra do Node: admin/correspondente podem ver/editar
// qualquer usuário; qualquer outro usuário só pode ver/editar a si mesmo.
func CanManage(actor *models.User, targetID uint) bool {
	if actor.IsAdministrador || actor.IsCorrespondente {
		return true
	}
	return actor.ID == targetID
}

// Update aplica a allow-list de campos e, se enviada, salva a nova foto.
func (s *Service) Update(ctx context.Context, id uint, req UpdateRequest, photo *multipart.FileHeader) (*models.User, error) {
	updates := req.ToUpdates()

	if photo != nil {
		filename, err := savePhoto(id, photo)
		if err != nil {
			return nil, fmt.Errorf("salvar foto: %w", err)
		}
		updates["photo"] = filename
	}

	if len(updates) > 0 {
		if err := s.repo.Update(ctx, id, updates); err != nil {
			return nil, err
		}
	}
	return s.repo.FindByID(ctx, id)
}

// savePhoto grava o upload em uploads/usuario/usuario_{id}{ext}, sobrescrevendo
// qualquer arquivo anterior (mesmo padrão de nome fixo do Node).
func savePhoto(id uint, fh *multipart.FileHeader) (string, error) {
	if err := os.MkdirAll(uploadDir, 0o755); err != nil {
		return "", err
	}
	ext := strings.ToLower(filepath.Ext(fh.Filename))
	if ext == "" {
		ext = ".jpg"
	}
	filename := fmt.Sprintf("usuario_%d%s", id, ext)
	dst := filepath.Join(uploadDir, filename)

	src, err := fh.Open()
	if err != nil {
		return "", err
	}
	defer src.Close()

	out, err := os.Create(dst)
	if err != nil {
		return "", err
	}
	defer out.Close()

	if _, err := io.Copy(out, src); err != nil {
		return "", err
	}
	return filename, nil
}
