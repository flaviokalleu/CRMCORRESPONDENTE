package correspondentes

import (
	"context"
	"errors"
	"fmt"
	"mime/multipart"
	"os"
	"path/filepath"

	"github.com/disintegration/imaging"
	"gorm.io/gorm"

	"crmimob/internal/auth"
	"crmimob/internal/models"
)

var ErrDuplicate = errors.New("email ou username já cadastrado")

// uploadDir replica uploads/imagem_correspondente do Node.
//
// DESVIO DELIBERADO (documentado no wiring): o Node usava `sharp` para
// redimensionar 800x800 e converter para webp. Não há encoder webp puro-Go
// sem cgo; usamos github.com/disintegration/imaging (puro Go) para o resize
// (Fit 800x800) e persistimos como JPEG qualidade 85 — mesmo efeito de
// compressão/redimensionamento, extensão diferente.
const uploadDir = "uploads/imagem_correspondente"

type Service struct{ repo *Repository }

func NewService(repo *Repository) *Service { return &Service{repo: repo} }

func (s *Service) Get(ctx context.Context, id uint) (*models.User, error) {
	return s.repo.FindByID(ctx, id)
}

func (s *Service) List(ctx context.Context) ([]models.User, error) {
	return s.repo.List(ctx)
}

// Create valida duplicata, hasheia senha e persiste is_correspondente=true.
//
// NOTA DE SEGURANÇA (deliberada, ver 01-spec gotcha §7.5): o Node expunha esta
// rota publicamente. Aqui ela é montada atrás de auth+tenant.
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
		Telefone: req.TelefoneValue(), Password: hash, Address: req.Address,
		PixAccount: req.PixAccount, IsCorrespondente: true,
	}
	if err := s.repo.Create(ctx, u); err != nil {
		return nil, err
	}

	if photo != nil {
		filename, err := saveResizedPhoto(u.ID, photo)
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
	} else if req.Phone != nil {
		updates["telefone"] = *req.Phone
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
		filename, err := saveResizedPhoto(id, photo)
		if err != nil {
			return nil, fmt.Errorf("processar foto: %w", err)
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

// saveResizedPhoto decodifica, redimensiona (fit 800x800) e grava como JPEG
// q85 em uploads/imagem_correspondente/correspondente_{id}.jpg.
func saveResizedPhoto(id uint, fh *multipart.FileHeader) (string, error) {
	if err := os.MkdirAll(uploadDir, 0o755); err != nil {
		return "", err
	}
	src, err := fh.Open()
	if err != nil {
		return "", err
	}
	defer src.Close()

	img, err := imaging.Decode(src, imaging.AutoOrientation(true))
	if err != nil {
		return "", fmt.Errorf("decodificar imagem: %w", err)
	}
	resized := imaging.Fit(img, 800, 800, imaging.Lanczos)

	filename := fmt.Sprintf("correspondente_%d.jpg", id)
	dst := filepath.Join(uploadDir, filename)
	if err := imaging.Save(resized, dst, imaging.JPEGQuality(85)); err != nil {
		return "", fmt.Errorf("salvar imagem: %w", err)
	}
	return filename, nil
}
