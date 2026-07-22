package ws

import (
	"encoding/json"
	"sync"
)

// Hub é o substituto do `io` do Socket.IO (ver socket.js singleton
// setSocketIO/getSocketIO). Mantém todos os clients conectados e as rooms
// (equivalente aos `.join()`/`.leave()`/`.to(room).emit()` do Socket.IO).
//
// Tolerância a boot: Broadcast/BroadcastToRoom nunca retornam erro e nunca
// pânico — se não houver clients/rooms, é um no-op silencioso, replicando o
// try/catch do `broadcast()` do Node quando `io` ainda não estava pronto.
type Hub struct {
	mu    sync.RWMutex
	Clients map[*Client]bool
	rooms   map[string]map[*Client]bool

	register   chan *Client
	unregister chan *Client
}

func NewHub() *Hub {
	h := &Hub{
		Clients:    make(map[*Client]bool),
		rooms:      make(map[string]map[*Client]bool),
		register:   make(chan *Client),
		unregister: make(chan *Client),
	}
	go h.run()
	return h
}

func (h *Hub) run() {
	for {
		select {
		case c := <-h.register:
			h.mu.Lock()
			h.Clients[c] = true
			h.mu.Unlock()
		case c := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.Clients[c]; ok {
				delete(h.Clients, c)
				close(c.send)
				for room := range c.rooms {
					if set, ok := h.rooms[room]; ok {
						delete(set, c)
						if len(set) == 0 {
							delete(h.rooms, room)
						}
					}
				}
			}
			h.mu.Unlock()
		}
	}
}

func (h *Hub) join(c *Client, room string) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if h.rooms[room] == nil {
		h.rooms[room] = make(map[*Client]bool)
	}
	h.rooms[room][c] = true
	c.rooms[room] = true
}

func (h *Hub) leave(c *Client, room string) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if set, ok := h.rooms[room]; ok {
		delete(set, c)
		if len(set) == 0 {
			delete(h.rooms, room)
		}
	}
	delete(c.rooms, room)
}

// Broadcast envia para TODOS os clients conectados (paridade com `io.emit`).
// A maioria dos eventos do Node é global — ver gotcha #11 do spec.
func (h *Hub) Broadcast(event string, data any) {
	h.broadcastEnvelope(Envelope{Event: event, Data: data})
}

// BroadcastToRoom envia só para clients de uma room (paridade com
// `io.to(room).emit`). Usado hoje só pelo `whatsapp:update`.
func (h *Hub) BroadcastToRoom(room, event string, data any) {
	h.mu.RLock()
	set := h.rooms[room]
	targets := make([]*Client, 0, len(set))
	for c := range set {
		targets = append(targets, c)
	}
	h.mu.RUnlock()

	env := Envelope{Event: event, Room: room, Data: data}
	b, err := json.Marshal(env)
	if err != nil {
		return
	}
	for _, c := range targets {
		select {
		case c.send <- b:
		default:
		}
	}
}

// ToUser é um helper de conveniência para eventos "com nome dinâmico" no Node
// (ex.: `notification:${userId}`) — aqui viram um campo `event` fixo
// ("notification") + filtragem por UserID, e o front deve casar em `data`.
// Mantido também com o nome de evento dinâmico para paridade estrita de payload
// com quem ainda espera o nome antigo.
func (h *Hub) ToUser(userID uint, event string, data any) {
	h.mu.RLock()
	targets := make([]*Client, 0)
	for c := range h.Clients {
		if c.UserID != nil && *c.UserID == userID {
			targets = append(targets, c)
		}
	}
	h.mu.RUnlock()

	env := Envelope{Event: event, Data: data}
	b, err := json.Marshal(env)
	if err != nil {
		return
	}
	for _, c := range targets {
		select {
		case c.send <- b:
		default:
		}
	}
}

func (h *Hub) broadcastEnvelope(e Envelope) {
	b, err := json.Marshal(e)
	if err != nil {
		return
	}
	h.mu.RLock()
	targets := make([]*Client, 0, len(h.Clients))
	for c := range h.Clients {
		targets = append(targets, c)
	}
	h.mu.RUnlock()

	for _, c := range targets {
		select {
		case c.send <- b:
		default:
		}
	}
}
