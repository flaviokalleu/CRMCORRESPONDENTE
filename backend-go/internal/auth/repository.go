package auth

import (
	"context"
	"time"

	"gorm.io/gorm"

	"crmimob/internal/models"
)

// Repository acessa `users` e `tokens`. Usa context.Background() nas queries de
// auth porque login/refresh NÃO devem ser filtrados por tenant (email é único
// globalmente; não há scope ainda nessas rotas). Ver 01-spec §5.
type Repository struct{ db *gorm.DB }

func NewRepository(db *gorm.DB) *Repository { return &Repository{db: db} }

func (r *Repository) FindUserByEmail(ctx context.Context, email string) (*models.User, error) {
	var u models.User
	if err := r.db.WithContext(ctx).Where("email = ?", email).First(&u).Error; err != nil {
		return nil, err
	}
	return &u, nil
}

func (r *Repository) FindUserByID(ctx context.Context, id uint) (*models.User, error) {
	var u models.User
	if err := r.db.WithContext(ctx).First(&u, id).Error; err != nil {
		return nil, err
	}
	return &u, nil
}

func (r *Repository) FindTokenByAccess(ctx context.Context, token string) (*models.Token, error) {
	var t models.Token
	if err := r.db.WithContext(ctx).Where("token = ?", token).First(&t).Error; err != nil {
		return nil, err
	}
	return &t, nil
}

func (r *Repository) FindTokenByRefresh(ctx context.Context, refresh string) (*models.Token, error) {
	var t models.Token
	if err := r.db.WithContext(ctx).Where("refresh_token = ?", refresh).First(&t).Error; err != nil {
		return nil, err
	}
	return &t, nil
}

// ReplaceUserSession implementa "1 sessão por usuário": remove tokens antigos e
// cria o novo, tudo em transação. Ver 01-spec §4.1 e gotcha §7.3.
func (r *Repository) ReplaceUserSession(ctx context.Context, tok *models.Token) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("user_id = ?", tok.UserID).Delete(&models.Token{}).Error; err != nil {
			return err
		}
		return tx.Create(tok).Error
	})
}

// TouchAccess atualiza o access token e estende expires_at (+AccessTTL) para uma
// linha localizada por refresh_token (usado no refresh e no sliding de check-auth).
func (r *Repository) TouchAccess(ctx context.Context, refresh, newAccess string) error {
	return r.db.WithContext(ctx).Model(&models.Token{}).
		Where("refresh_token = ?", refresh).
		Updates(map[string]any{"token": newAccess, "expires_at": time.Now().Add(AccessTTL), "updated_at": time.Now()}).Error
}

func (r *Repository) DeleteByAccess(ctx context.Context, token string) error {
	return r.db.WithContext(ctx).Where("token = ?", token).Delete(&models.Token{}).Error
}
