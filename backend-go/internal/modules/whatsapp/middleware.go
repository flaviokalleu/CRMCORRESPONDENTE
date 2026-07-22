package whatsapp

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"

	"crmimob/internal/auth"
)

// ctxTenantID é a chave de contexto Gin onde guardamos o tenant resolvido
// especificamente para as rotas de WhatsApp (independente do tenant.Scope
// genérico usado pelos demais módulos, porque aqui a resolução aceita
// requests SEM autenticação, contanto que informem X-Tenant-Id — ver spec
// `resolveWhatsAppTenant`).
const ctxTenantID = "whatsapp_tenant_id"

// ResolveWhatsAppTenant replica `resolveWhatsAppTenant` (routes/whatsappRoutes.js),
// precedido de `optionalAuthenticateToken`: só valida o Bearer se o header
// existir; nunca aborta por falta de header.
//
// Precedência:
//  1. user.is_super_admin + header X-Tenant-Id válido -> usa o header.
//  2. user.tenant_id (do JWT) -> usa esse.
//  3. header X-Tenant-Id válido (sem auth) -> usa o header.
//  4. senão -> 400 { error: "Tenant não informado" }.
func ResolveWhatsAppTenant(authSvc *auth.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		var claims *auth.Claims
		if raw := bearerToken(c); raw != "" {
			if parsed, err := authSvc.ParseAccess(raw); err == nil {
				claims = parsed
			}
			// Token inválido/expirado: não aborta (auth é opcional aqui), só
			// segue sem claims — igual ao optionalAuthenticateToken do Node.
		}

		headerTenant, headerOK := parseHeaderTenant(c)

		var tenantID uint
		switch {
		case claims != nil && claims.IsSuperAdmin && headerOK:
			tenantID = headerTenant
		case claims != nil && claims.TenantID != nil:
			tenantID = *claims.TenantID
		case headerOK:
			tenantID = headerTenant
		default:
			c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "Tenant não informado"})
			return
		}

		c.Set(ctxTenantID, tenantID)
		if claims != nil {
			c.Set(auth.CtxClaims, claims)
		}
		c.Next()
	}
}

func parseHeaderTenant(c *gin.Context) (uint, bool) {
	h := c.GetHeader("X-Tenant-Id")
	if h == "" {
		return 0, false
	}
	id, err := strconv.ParseUint(h, 10, 64)
	if err != nil {
		return 0, false
	}
	return uint(id), true
}

func bearerToken(c *gin.Context) string {
	h := c.GetHeader("Authorization")
	if h == "" {
		return ""
	}
	parts := strings.SplitN(h, " ", 2)
	if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
		return ""
	}
	return strings.TrimSpace(parts[1])
}

// tenantFrom lê o tenant resolvido pelo middleware acima.
func tenantFrom(c *gin.Context) (uint, bool) {
	v, ok := c.Get(ctxTenantID)
	if !ok {
		return 0, false
	}
	id, ok := v.(uint)
	return id, ok
}
