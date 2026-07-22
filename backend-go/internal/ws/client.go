package ws

import (
	"encoding/json"
	"log"
	"time"

	"github.com/gorilla/websocket"
)

const (
	writeWait      = 10 * time.Second
	pongWait       = 60 * time.Second
	pingPeriod     = (pongWait * 9) / 10
	maxMessageSize = 1 << 20 // 1MB
	sendBufferSize = 64
)

// Client representa uma conexão WebSocket ativa. Equivalente ao `socket` do
// Socket.IO no Node: mantém as rooms em que está inscrito + identidade do
// usuário/tenant autenticado (quando houver).
type Client struct {
	hub  *Hub
	conn *websocket.Conn
	send chan []byte

	TenantID *uint
	UserID   *uint

	rooms map[string]bool
}

func newClient(hub *Hub, conn *websocket.Conn, tenantID, userID *uint) *Client {
	return &Client{
		hub:      hub,
		conn:     conn,
		send:     make(chan []byte, sendBufferSize),
		TenantID: tenantID,
		UserID:   userID,
		rooms:    make(map[string]bool),
	}
}

// readPump lê mensagens client→server (ações de subscribe/unsubscribe) até a
// conexão cair. Deve rodar em goroutine própria.
func (c *Client) readPump() {
	defer func() {
		c.hub.unregister <- c
		_ = c.conn.Close()
	}()

	c.conn.SetReadLimit(maxMessageSize)
	_ = c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetPongHandler(func(string) error {
		return c.conn.SetReadDeadline(time.Now().Add(pongWait))
	})

	for {
		_, raw, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("ws: erro de leitura: %v", err)
			}
			return
		}

		var action ClientAction
		if err := json.Unmarshal(raw, &action); err != nil {
			continue // mensagem mal formada: ignora, igual ao Node tolerante
		}
		c.handleAction(action)
	}
}

func (c *Client) handleAction(a ClientAction) {
	switch a.Action {
	case "subscribe":
		room := roomFromChannel(a.Channel, a.TenantID)
		if room != "" {
			c.hub.join(c, room)
		}
	case "unsubscribe":
		room := roomFromChannel(a.Channel, a.TenantID)
		if room != "" {
			c.hub.leave(c, room)
		}
	case "frontend-message":
		// Paridade com o evento legado `frontend-message` → responde
		// `backend-response` apenas ao socket que enviou.
		c.sendEnvelope(Envelope{Event: "backend-response", Data: "Recebido: " + a.Message})
	}
}

func roomFromChannel(channel string, tenantID *uint) string {
	if channel == "whatsapp" && tenantID != nil {
		return RoomForTenant(*tenantID)
	}
	return ""
}

func (c *Client) sendEnvelope(e Envelope) {
	b, err := json.Marshal(e)
	if err != nil {
		return
	}
	select {
	case c.send <- b:
	default:
		// buffer cheio: cliente lento, descarta (evita bloquear o hub).
	}
}

// writePump escreve para o socket tudo que chega em `send`, com ping periódico.
func (c *Client) writePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		_ = c.conn.Close()
	}()

	for {
		select {
		case msg, ok := <-c.send:
			_ = c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				_ = c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			if err := c.conn.WriteMessage(websocket.TextMessage, msg); err != nil {
				return
			}
		case <-ticker.C:
			_ = c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}
