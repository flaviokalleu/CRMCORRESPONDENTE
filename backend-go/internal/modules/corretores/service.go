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

	"crmimob/internal/auth"
	"crmimob/internal/models"
	"crmimob/internal/validacao"
)

var ErrDuplicate = errors.New("email ou username já cadastrado")

// ErrProprioUsuario: ninguém exclui a si mesmo pela lista da equipe.
var ErrProprioUsuario = errors.New("não é possível excluir o próprio usuário")

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
	req.Email = validacao.NormalizarEmail(req.Email)
	req.Username = strings.TrimSpace(req.Username)
	req.FirstName = strings.TrimSpace(req.FirstName)
	if req.FirstName == "" {
		return nil, &validacao.ErroCampo{Campo: "first_name", Mensagem: "Escreva o nome."}
	}
	if e := validacao.Primeiro(
		validacao.Tamanho("first_name", req.FirstName, "O nome"),
		validacao.Tamanho("last_name", req.LastName, "O sobrenome"),
		validacao.Telefone(req.Telefone),
		validacao.Email(req.Email),
		validacao.Tamanho("creci", req.Creci, "O CRECI"),
		validacao.Tamanho("pix_account", req.PixAccount, "A chave PIX"),
		validacao.Tamanho("address", req.Address, "O endereço"),
		validacao.Usuario(req.Username),
		validacao.Senha(req.Password),
	); e != nil {
		return nil, e
	}
	if e := validacao.EmUso(ctx, s.repo.db, req.Email, req.Username, 0); e != nil {
		return nil, e
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
		if e := validacao.ConflitoUnico(err); e != nil {
			return nil, e
		}
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
	if req.Email != nil {
		v := validacao.NormalizarEmail(*req.Email)
		req.Email = &v
	}
	if req.Username != nil {
		v := strings.TrimSpace(*req.Username)
		req.Username = &v
	}
	if e := validarEdicao(req); e != nil {
		return nil, e
	}
	email, username := "", ""
	if req.Email != nil {
		email = *req.Email
	}
	if req.Username != nil {
		username = *req.Username
	}
	if e := validacao.EmUso(ctx, s.repo.db, email, username, id); e != nil {
		return nil, e
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
			if e := validacao.ConflitoUnico(err); e != nil {
				return nil, e
			}
			return nil, err
		}
	}
	return s.repo.FindByID(ctx, id)
}

func (s *Service) Delete(ctx context.Context, id, herdeiro uint) error {
	if id == herdeiro {
		return ErrProprioUsuario
	}
	return s.repo.Delete(ctx, id, herdeiro)
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

// validarEdicao aplica as regras do cadastro só aos campos enviados.
// Senha vazia = manter a atual.
func validarEdicao(req UpdateRequest) *validacao.ErroCampo {
	lista := []*validacao.ErroCampo{}
	if req.FirstName != nil {
		if strings.TrimSpace(*req.FirstName) == "" {
			return &validacao.ErroCampo{Campo: "first_name", Mensagem: "Escreva o nome."}
		}
		lista = append(lista, validacao.Tamanho("first_name", *req.FirstName, "O nome"))
	}
	if req.LastName != nil {
		lista = append(lista, validacao.Tamanho("last_name", *req.LastName, "O sobrenome"))
	}
	if req.Telefone != nil {
		lista = append(lista, validacao.Telefone(*req.Telefone))
	}
	if req.Email != nil {
		lista = append(lista, validacao.Email(*req.Email))
	}
	if req.Creci != nil {
		lista = append(lista, validacao.Tamanho("creci", *req.Creci, "O CRECI"))
	}
	if req.PixAccount != nil {
		lista = append(lista, validacao.Tamanho("pix_account", *req.PixAccount, "A chave PIX"))
	}
	if req.Address != nil {
		lista = append(lista, validacao.Tamanho("address", *req.Address, "O endereço"))
	}
	if req.Username != nil {
		lista = append(lista, validacao.Usuario(*req.Username))
	}
	if req.Password != nil && *req.Password != "" {
		lista = append(lista, validacao.Senha(*req.Password))
	}
	return validacao.Primeiro(lista...)
}
