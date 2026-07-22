package auth

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"

	"crmimob/internal/config"
	"crmimob/internal/models"
)

const (
	AccessTTL  = time.Hour          // access token: 1h
	RefreshTTL = 7 * 24 * time.Hour // refresh token: 7d
)

var ErrInvalidToken = errors.New("token inválido")

// Service gera e valida JWTs. Unifica as 3-4 implementações divergentes do Node
// num único ponto (ver 01-spec §1).
type Service struct {
	secret  []byte
	refresh []byte
}

func NewService(cfg *config.Config) *Service {
	return &Service{secret: []byte(cfg.JWTSecret), refresh: []byte(cfg.JWTRefresh)}
}

func (s *Service) claimsFor(u *models.User, ttl time.Duration) Claims {
	return Claims{
		UserID:           u.ID,
		Email:            u.Email,
		Role:             u.Role(),
		IsCorretor:       u.IsCorretor,
		IsCorrespondente: u.IsCorrespondente,
		IsAdministrador:  u.IsAdministrador,
		TenantID:         u.TenantID,
		IsSuperAdmin:     u.IsSuperAdmin,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(ttl)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
}

// GenerateAccess assina um access token (1h).
func (s *Service) GenerateAccess(u *models.User) (string, error) {
	return jwt.NewWithClaims(jwt.SigningMethodHS256, s.claimsFor(u, AccessTTL)).SignedString(s.secret)
}

// GenerateRefresh assina um refresh token (7d).
func (s *Service) GenerateRefresh(u *models.User) (string, error) {
	return jwt.NewWithClaims(jwt.SigningMethodHS256, s.claimsFor(u, RefreshTTL)).SignedString(s.refresh)
}

func (s *Service) parse(token string, key []byte) (*Claims, error) {
	claims := &Claims{}
	_, err := jwt.ParseWithClaims(token, claims, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, ErrInvalidToken
		}
		return key, nil
	})
	if err != nil {
		return nil, ErrInvalidToken
	}
	return claims, nil
}

func (s *Service) ParseAccess(token string) (*Claims, error)  { return s.parse(token, s.secret) }
func (s *Service) ParseRefresh(token string) (*Claims, error) { return s.parse(token, s.refresh) }
