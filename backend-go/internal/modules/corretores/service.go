package corretores

import (
	"context"
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"
	"strings"

	"gorm.io/gorm"

	"crmimob/internal/auth"
	"crmimob/internal/models"
)

var ErrDuplicate = errors.New("email ou username já cadastrado")

// uploadDir replica uploads/corretor do Node (ver 01-spec §2.7).
const uploadDir = "uploads/corretor"

type Service struct{ repo *Repository }

func NewService(repo *Repository) *Service { return &Service{repo: repo} }

func (s *Service) Get(ctx context.Context, id uint) (*models.User, error) {
	return s.repo.FindByID(ctx, id)
}

func (s *Service) List(ctx context.Context, search string, page, limit int, all bool) ([]models.User, int64, error) {
	return s.repo.List(ctx, search, page, limit, all)
}

// Create valida duplicata, hasheia a senha e persiste is_corretor=true.
//
// NOTA DE SEGURANÇA (deliberada, ver 01-spec gotcha §7.5): o Node expunha esta
// rota publicamente (sem auth). Aqui ela é montada atrás de auth+tenant — quem
// cria um corretor precisa estar autenticado no tenant.
func (s *Service) Create(ctx context.Context, req CreateRequest, photo *multipart.FileHeader) (*models.User, error) {
	if _, err := s.repo.FindByEmailOrUsername(ctx, req.Email, req.Username, nil); err == nil {
		return nil, ErrDuplicate
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	hash, err := auth.HashPassword(req.Password)
	if err != nil {
		return nil, err
	}

	u := &models.User{
		Username: req.Username, Email: req.Email, FirstName: req.FirstName, LastName: req.LastName,
		Telefone: req.Telefone, Password: hash, Creci: req.Creci, Address: req.Address,
		PixAccount: req.PixAccount, IsCorretor: true,
	}
	if err := s.repo.Create(ctx, u); err != nil {
		return nil, err
	}

	if photo != nil {
		filename, err := savePhoto(u.ID, photo)
		if err == nil {
			_ = s.repo.Update(ctx, u.ID, map[string]any{"photo": filename})
			u.Photo = filename
		}
	}
	return u, nil
}

func (s *Service) Update(ctx context.Context, id uint, req UpdateRequest, photo *multipart.FileHeader) (*models.User, error) {
	if req.Email != nil || req.Username != nil {
		email, username := "", ""
		if req.Email != nil {
			email = *req.Email
		}
		if req.Username != nil {
			username = *req.Username
		}
		if email != "" || username != "" {
			if _, err := s.repo.FindByEmailOrUsername(ctx, email, username, &id); err == nil {
				return nil, ErrDuplicate
			} else if !errors.Is(err, gorm.ErrRecordNotFound) {
				return nil, err
			}
		}
	}

	updates := map[string]any{}
	if req.Username != nil {
		updates["username"] = *req.Username
	}
	if req.Email != nil {
		updates["email"] = *req.Email
	}
	if req.FirstName != nil {
		updates["first_name"] = *req.FirstName
	}
	if req.LastName != nil {
		updates["last_name"] = *req.LastName
	}
	if req.Telefone != nil {
		updates["telefone"] = *req.Telefone
	}
	if req.Creci != nil {
		updates["creci"] = *req.Creci
	}
	if req.Address != nil {
		updates["address"] = *req.Address
	}
	if req.PixAccount != nil {
		updates["pix_account"] = *req.PixAccount
	}
	if req.Password != nil && *req.Password != "" {
		hash, err := auth.HashPassword(*req.Password)
		if err != nil {
			return nil, err
		}
		updates["password"] = hash
	}
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

func (s *Service) Delete(ctx context.Context, id uint) error {
	return s.repo.Delete(ctx, id)
}

func savePhoto(id uint, fh *multipart.FileHeader) (string, error) {
	if err := os.MkdirAll(uploadDir, 0o755); err != nil {
		return "", err
	}
	ext := strings.ToLower(filepath.Ext(fh.Filename))
	if ext == "" {
		ext = ".jpg"
	}
	filename := fmt.Sprintf("corretor_%d%s", id, ext)
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

	_, err = io.Copy(out, src)
	return filename, err
}
