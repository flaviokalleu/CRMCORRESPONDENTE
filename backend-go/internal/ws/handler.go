package ws

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"

	"crmimob/internal/auth"
)

// Handler expõe o endpoint HTTP de upgrade para WebSocket (substitui o
// handshake do Socket.IO em server.js).
type Handler struct {
	hub      *Hub
	authSvc  *auth.Service
	origins  []string
}

func NewHandler(hub *Hub, authSvc *auth.Service, allowedOrigins []string) *Handler {
	return &Handler{hub: hub, authSvc: authSvc, origins: allowedOrigins}
}

// Register monta a rota GET /api/ws no grupo informado.
func (h *Handler) Register(r *gin.RouterGroup) {
	r.GET("/ws", h.Upgrade)
}

// upgrader é criado sob demanda para poder validar Origin contra a lista
// configurada (equivalente ao `cors.origin` do Socket.IO), mas SEM quebrar
// clients que hoje não mandam Origin (ex.: apps nativos/health checks).
func (h *Handler) checkOrigin(r *http.Request) bool {
	origin := r.Header.Get("Origin")
	if origin == "" || len(h.origins) == 0 {
		return true
	}
	for _, o := range h.origins {
		if o == origin || o == "*" {
			return true
		}
	}
	return false
}

// Upgrade autentica (best-effort, via query `token` ou header `Authorization`)
// e faz o handshake WebSocket. IMPORTANTE (spec gotcha #12): o Socket.IO atual
// NÃO autentica no handshake — qualquer origem entra. Aqui autenticamos
// best-effort: se um token válido é enviado, extraímos tenant/user dele; se
// não houver token, a conexão é aceita mesmo assim (anônima), para não quebrar
// o frontend que hoje só chama `subscribe:whatsapp` sem token. O tenantID
// efetivo de uma sala "whatsapp" só é aceito via ClientAction.subscribe.
func (h *Handler) Upgrade(c *gin.Context) {
	upgrader := websocket.Upgrader{
		ReadBufferSize:  1024,
		WriteBufferSize: 1024,
		CheckOrigin:     h.checkOrigin,
	}

	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("ws: falha no upgrade: %v", err)
		return
	}

	var tenantID, userID *uint
	if claims := h.authenticateFromRequest(c); claims != nil {
		userID = &claims.UserID
		tenantID = claims.TenantID
	}

	client := newClient(h.hub, conn, tenantID, userID)
	h.hub.register <- client

	// Paridade com o evento `welcome` que o Node manda ao conectar.
	client.sendEnvelope(Envelope{Event: "welcome", Data: "Conectado ao servidor CRM IMOB"})

	go client.writePump()
	go client.readPump()
}

func (h *Handler) authenticateFromRequest(c *gin.Context) *auth.Claims {
	token := c.Query("token")
	if token == "" {
		bearer := c.GetHeader("Authorization")
		if len(bearer) > 7 && (bearer[:7] == "Bearer " || bearer[:7] == "bearer ") {
			token = bearer[7:]
		}
	}
	if token == "" {
		return nil
	}
	claims, err := h.authSvc.ParseAccess(token)
	if err != nil {
		return nil
	}
	return claims
}
