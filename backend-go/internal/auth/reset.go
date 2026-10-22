package auth

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"html"
	"log/slog"
	"net/http"
	"net/url"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"crmimob/internal/models"
)

// Recuperação de senha ("Esqueci a senha").
//
// Fluxo: POST /auth/forgot-password recebe o e-mail e, se houver usuário,
// grava o SHA-256 de um token aleatório (validade ResetTTL, uso único) e
// envia por e-mail um link <frontend>/redefinir-senha?token=<token>.
// POST /auth/reset-password troca a senha, marca o pedido como usado e
// derruba as sessões abertas do usuário.
//
// A resposta do forgot é sempre a mesma, exista ou não a conta, para não
// revelar quais e-mails estão cadastrados.

const (
	ResetTTL          = time.Hour
	MinPasswordLength = 8
)

// Mailer é o pedaço do cliente de e-mail que a recuperação usa.
type Mailer interface {
	Send(to, subject, htmlBody string) error
	Configured() bool
}

// WithPasswordReset liga a recuperação de senha ao handler: quem envia o
// e-mail e a URL pública do frontend que entra no link.
func (h *Handler) WithPasswordReset(m Mailer, frontendURL string) *Handler {
	h.mailer = m
	h.frontendURL = strings.TrimRight(frontendURL, "/")
	return h
}

type ForgotPasswordRequest struct {
	Email string `json:"email" binding:"required,email"`
}

type ResetPasswordRequest struct {
	Token    string `json:"token" binding:"required"`
	Password string `json:"password" binding:"required"`
}

const forgotMessage = "Se o e-mail estiver cadastrado, você vai receber um link para criar uma nova senha em alguns minutos."

func hashResetToken(raw string) string {
	sum := sha256.Sum256([]byte(raw))
	return hex.EncodeToString(sum[:])
}

func newResetToken() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

// ValidateNewPassword aplica a regra mínima de senha nova.
func ValidateNewPassword(p string) error {
	if utf8.RuneCountInString(p) < MinPasswordLength {
		return fmt.Errorf("A senha precisa ter pelo menos %d caracteres.", MinPasswordLength)
	}
	return nil
}

func (h *Handler) ForgotPassword(c *gin.Context) {
	var req ForgotPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Informe um e-mail válido."})
		return
	}
	email := strings.TrimSpace(req.Email)
	ctx := c.Request.Context()

	user, err := h.repo.FindUserByEmail(ctx, email)
	if err != nil {
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			slog.Error("forgot-password: busca de usuário", "error", err)
		}
		c.JSON(http.StatusOK, gin.H{"message": forgotMessage})
		return
	}

	raw, err := newResetToken()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Não foi possível gerar o link. Tente novamente."})
		return
	}
	if err := h.repo.CreatePasswordReset(ctx, user.ID, hashResetToken(raw), time.Now().Add(ResetTTL)); err != nil {
		slog.Error("forgot-password: gravar pedido", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Não foi possível gerar o link. Tente novamente."})
		return
	}

	if h.mailer == nil || !h.mailer.Configured() {
		// Sem SMTP o e-mail não sai. O pedido fica gravado, mas o usuário não
		// recebe nada: é problema de configuração do servidor, então registra.
		slog.Warn("forgot-password: SMTP não configurado; e-mail de redefinição não enviado", "user_id", user.ID)
	} else {
		link := fmt.Sprintf("%s/redefinir-senha?token=%s", h.frontendURL, url.QueryEscape(raw))
		if err := h.mailer.Send(user.Email, "Redefinição de senha — Webba CRM", resetEmailHTML(user.FirstName, link)); err != nil {
			slog.Error("forgot-password: envio de e-mail", "error", err, "user_id", user.ID)
		}
	}

	c.JSON(http.StatusOK, gin.H{"message": forgotMessage})
}

func (h *Handler) ResetPassword(c *gin.Context) {
	var req ResetPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Link inválido ou senha não informada."})
		return
	}
	if err := ValidateNewPassword(req.Password); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	hash, err := HashPassword(req.Password)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Não foi possível salvar a nova senha. Tente novamente."})
		return
	}

	err = h.repo.ConsumePasswordReset(c.Request.Context(), hashResetToken(strings.TrimSpace(req.Token)), hash)
	if errors.Is(err, ErrResetInvalid) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Este link expirou ou já foi usado. Peça um novo link em \"Esqueci a senha\"."})
		return
	}
	if err != nil {
		slog.Error("reset-password", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Não foi possível salvar a nova senha. Tente novamente."})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Senha alterada. Entre com a nova senha."})
}

func resetEmailHTML(firstName, link string) string {
	nome := strings.TrimSpace(firstName)
	if nome == "" {
		nome = "tudo bem"
	}
	safeLink := html.EscapeString(link)
	return fmt.Sprintf(`
<div style="font-family:Poppins,Arial,sans-serif;max-width:520px;margin:0 auto;color:#334155">
  <h2 style="color:#0f172a;margin:0 0 12px">Redefinição de senha</h2>
  <p>Olá, %s!</p>
  <p>Recebemos um pedido para criar uma nova senha para a sua conta no Webba CRM. O link vale por 1 hora e só pode ser usado uma vez.</p>
  <p style="margin:24px 0"><a href="%s" style="display:inline-block;padding:12px 22px;background:#1e3a8a;color:#ffffff;border-radius:10px;text-decoration:none;font-weight:600">Criar nova senha</a></p>
  <p style="font-size:13px;color:#64748b">Se você não pediu, ignore este e-mail: sua senha continua a mesma.</p>
</div>`, html.EscapeString(nome), safeLink)
}

// ---- persistência ----

var ErrResetInvalid = errors.New("pedido de redefinição inválido ou expirado")

// CreatePasswordReset invalida pedidos anteriores ainda abertos do usuário e
// grava o novo.
func (r *Repository) CreatePasswordReset(ctx context.Context, userID uint, tokenHash string, expires time.Time) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		now := time.Now()
		if err := tx.Model(&models.PasswordReset{}).
			Where("user_id = ? AND used_at IS NULL", userID).
			Update("used_at", now).Error; err != nil {
			return err
		}
		return tx.Create(&models.PasswordReset{UserID: userID, TokenHash: tokenHash, ExpiresAt: expires, CreatedAt: now}).Error
	})
}

// ConsumePasswordReset troca a senha do dono do token, marca o pedido como
// usado e remove as sessões do usuário — tudo ou nada.
func (r *Repository) ConsumePasswordReset(ctx context.Context, tokenHash, passwordHash string) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var pr models.PasswordReset
		err := tx.Where("token_hash = ? AND used_at IS NULL AND expires_at > ?", tokenHash, time.Now()).
			First(&pr).Error
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrResetInvalid
		}
		if err != nil {
			return err
		}
		now := time.Now()
		res := tx.Model(&models.PasswordReset{}).
			Where("id = ? AND used_at IS NULL", pr.ID).
			Update("used_at", now)
		if res.Error != nil {
			return res.Error
		}
		if res.RowsAffected == 0 {
			return ErrResetInvalid // outro pedido concorrente usou primeiro
		}
		if err := tx.Model(&models.User{}).Where("id = ?", pr.UserID).
			Updates(map[string]any{"password": passwordHash, "updated_at": now}).Error; err != nil {
			return err
		}
		return tx.Where("user_id = ?", pr.UserID).Delete(&models.Token{}).Error
	})
}
