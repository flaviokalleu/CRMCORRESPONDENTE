// Package portalinquilino implementa o portal do inquilino: autenticação
// PRÓPRIA por CPF (JWT com claim `tipo:"inquilino"`, SEPARADO do JWT de
// usuário do sistema em internal/auth) e as rotas de consulta do inquilino
// logado. Ver docs/migration/04-alugueis.md §9.
//
// ⚠ Diferente de internal/auth: este JWT NÃO carrega tenant_id nem passa por
// middleware.ResolveTenant — o escopo vem apenas do `cliente_aluguel_id`
// embutido no token (04-spec Gotcha "Portal não é tenant-scoped").
package portalinquilino

import (
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

const TokenTTL = 24 * time.Hour

var (
	ErrInvalidToken = errors.New("token de inquilino inválido")
	ErrWrongType    = errors.New("token não é do tipo inquilino")
)

// Claims é o payload do JWT do portal. `Tipo` é sempre "inquilino" — o
// middleware AuthInquilino rejeita qualquer outro valor (inclusive tokens
// válidos do JWT de usuário do sistema).
type Claims struct {
	ClienteAluguelID uint   `json:"cliente_aluguel_id"`
	Nome             string `json:"nome"`
	Tipo             string `json:"tipo"`
	jwt.RegisteredClaims
}

// AuthService assina/valida o JWT do portal.
//
// ⚠ Gotcha 13 (04-spec): o Node tinha fallback `'portal-inquilino-secret'`
// quando JWT_SECRET_KEY faltava — REMOVIDO aqui de propósito. `secret` deve
// vir de config.Config.JWTSecret, cujo Load() já falha o boot se ausente.
type AuthService struct {
	secret []byte
}

func NewAuthService(secret string) *AuthService {
	return &AuthService{secret: []byte(secret)}
}

func (s *AuthService) GenerateToken(clienteAluguelID uint, nome string) (string, error) {
	claims := Claims{
		ClienteAluguelID: clienteAluguelID,
		Nome:             nome,
		Tipo:             "inquilino",
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(TokenTTL)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(s.secret)
}

func (s *AuthService) ParseToken(raw string) (*Claims, error) {
	claims := &Claims{}
	_, err := jwt.ParseWithClaims(raw, claims, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, ErrInvalidToken
		}
		return s.secret, nil
	})
	if err != nil {
		return nil, ErrInvalidToken
	}
	if claims.Tipo != "inquilino" {
		return nil, ErrWrongType
	}
	return claims, nil
}

const ctxKey = "inquilino_claims"

// Required é o middleware `authenticateInquilino` do Node — valida o Bearer
// JWT, exige `tipo:"inquilino"` e injeta as claims no contexto Gin. NÃO
// aplica tenant scope (ver doc do pacote).
func (s *AuthService) Required() gin.HandlerFunc {
	// Tokens legados foram emitidos apenas com CPF, que não prova identidade.
	// Bloquear também esses tokens até disponibilizar senha ou código verificado.
	return portalAuthenticationUnavailable
}

func portalAuthenticationUnavailable(c *gin.Context) {
	c.AbortWithStatusJSON(http.StatusServiceUnavailable, gin.H{
		"error": "O acesso ao portal está temporariamente indisponível. Entre em contato com a administradora.",
	})
}

func (s *AuthService) requiredVerifiedToken() gin.HandlerFunc {
	return func(c *gin.Context) {
		h := c.GetHeader("Authorization")
		parts := strings.SplitN(h, " ", 2)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Token não fornecido"})
			return
		}
		claims, err := s.ParseToken(strings.TrimSpace(parts[1]))
		if err != nil {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "Token inválido"})
			return
		}
		c.Set(ctxKey, claims)
		c.Next()
	}
}

// ClaimsFrom recupera as claims do inquilino autenticado do contexto Gin.
// Uso por outros módulos (ex.: chamados) que hospedam rotas `/portal/*`.
func ClaimsFrom(c *gin.Context) (*Claims, bool) {
	v, ok := c.Get(ctxKey)
	if !ok {
		return nil, false
	}
	claims, ok := v.(*Claims)
	return claims, ok
}
