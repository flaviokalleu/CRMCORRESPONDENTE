package users

import (
	"context"
	"errors"
	"fmt"
	"mime/multipart"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/disintegration/imaging"

	"crmimob/internal/auth"
	"crmimob/internal/models"
	"crmimob/internal/uploads"
	"crmimob/internal/validacao"
)

var ErrForbidden = errors.New("acesso negado")
var ErrNotFound = errors.New("usuário não encontrado")

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
// Valida antes de gravar: e-mail no formato certo e livre (em qualquer
// empresa), telefone com DDD quando preenchido, textos até 255 caracteres —
// antes qualquer um desses casos virava erro 500 sem dizer o motivo.
func (s *Service) Update(ctx context.Context, id uint, req UpdateRequest, photo *multipart.FileHeader) (*models.User, error) {
	if e := validarPerfil(&req); e != nil {
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
	updates := req.ToUpdates()

	if photo != nil {
		filename, err := savePhoto(id, photo)
		if err != nil {
			return nil, err
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

func validarPerfil(req *UpdateRequest) *validacao.ErroCampo {
	lista := []*validacao.ErroCampo{}
	if req.FirstName != nil {
		v := strings.TrimSpace(*req.FirstName)
		req.FirstName = &v
		if v == "" {
			return &validacao.ErroCampo{Campo: "first_name", Mensagem: "Escreva o nome."}
		}
		lista = append(lista, validacao.Tamanho("first_name", v, "O nome"))
	}
	if req.LastName != nil {
		lista = append(lista, validacao.Tamanho("last_name", *req.LastName, "O sobrenome"))
	}
	if req.Email != nil {
		v := validacao.NormalizarEmail(*req.Email)
		req.Email = &v
		lista = append(lista, validacao.Email(v))
	}
	if req.Telefone != nil && strings.TrimSpace(*req.Telefone) != "" {
		lista = append(lista, validacao.Telefone(*req.Telefone))
	}
	if req.Username != nil {
		v := strings.TrimSpace(*req.Username)
		req.Username = &v
		lista = append(lista, validacao.Usuario(v))
	}
	if req.Address != nil {
		lista = append(lista, validacao.Tamanho("address", *req.Address, "O endereço"))
	}
	if req.PixAccount != nil {
		lista = append(lista, validacao.Tamanho("pix_account", *req.PixAccount, "A chave PIX"))
	}
	return validacao.Primeiro(lista...)
}

// TrocarSenha exige a senha atual: sem isso, quem achasse o computador
// logado trocaria a senha do dono. Só para o próprio usuário.
func (s *Service) TrocarSenha(ctx context.Context, id uint, atual, nova string) error {
	u, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return err
	}
	if !auth.CheckPassword(u.Password, atual) {
		return &validacao.ErroCampo{Campo: "senha_atual", Mensagem: "A senha atual não confere."}
	}
	if e := validacao.Senha(nova); e != nil {
		return &validacao.ErroCampo{Campo: "password", Mensagem: e.Mensagem}
	}
	hash, err := auth.HashPassword(nova)
	if err != nil {
		return err
	}
	return s.repo.Update(ctx, id, map[string]any{"password": hash})
}

// ErrFotoInvalida: o arquivo enviado não é uma imagem que dê para abrir.
var ErrFotoInvalida = &validacao.ErroCampo{Campo: "photo", Mensagem: "Esse arquivo não é uma foto. Envie uma imagem JPG ou PNG."}

// savePhoto abre a imagem (recusando o que não for imagem), reduz para no
// máximo 800x800 e grava como JPEG em <uploads>/usuario/usuario_{id}_{hora}.jpg.
// Antes: gravava qualquer arquivo com a extensão que viesse (um .html ou .svg
// seria servido por /api/uploads/usuario) e numa pasta relativa ao processo
// (backend-go/uploads/usuario) diferente da que o Static serve (../uploads),
// então a foto nunca aparecia.
func savePhoto(id uint, fh *multipart.FileHeader) (string, error) {
	dir := filepath.Join(uploads.Root(), "usuario")
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return "", err
	}
	src, err := fh.Open()
	if err != nil {
		return "", err
	}
	defer src.Close()
	img, err := imaging.Decode(src, imaging.AutoOrientation(true))
	if err != nil {
		return "", ErrFotoInvalida
	}
	img = imaging.Fit(img, 800, 800, imaging.Lanczos)
	// Nome muda a cada envio: com nome fixo o navegador mostrava a foto
	// antiga do cache no topo, na lista de clientes e nas propostas.
	filename := fmt.Sprintf("usuario_%d_%d.jpg", id, time.Now().Unix())
	if err := imaging.Save(img, filepath.Join(dir, filename), imaging.JPEGQuality(85)); err != nil {
		return "", fmt.Errorf("salvar foto: %w", err)
	}
	// Apaga as fotos anteriores desta pessoa.
	if antigas, _ := filepath.Glob(filepath.Join(dir, fmt.Sprintf("usuario_%d[._]*", id))); len(antigas) > 0 {
		for _, f := range antigas {
			if filepath.Base(f) != filename {
				_ = os.Remove(f)
			}
		}
	}
	return filename, nil
}
