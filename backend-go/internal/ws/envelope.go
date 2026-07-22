package ws

import "time"

// Envelope é o formato ÚNICO de mensagem server→client, já que WS nativo não
// tem "nome de evento" embutido como o Socket.IO. Ver
// docs/migration/05-whatsapp-realtime-jobs.md §"Envelope WS nativo proposto".
//
//	{ "event": "whatsapp:update", "room": "whatsapp:12", "data": { ... } }
//
// Room vazia ("") significa broadcast global (paridade com `io.emit`).
type Envelope struct {
	Event string `json:"event"`
	Room  string `json:"room,omitempty"`
	Data  any    `json:"data"`
}

// ClientAction é o formato ÚNICO de mensagem client→server, substituindo
// `subscribe:whatsapp` / `unsubscribe:whatsapp` do Socket.IO:
//
//	{ "action": "subscribe", "channel": "whatsapp", "tenantId": 12 }
//	{ "action": "unsubscribe", "channel": "whatsapp", "tenantId": 12 }
type ClientAction struct {
	Action   string `json:"action"`
	Channel  string `json:"channel"`
	TenantID *uint  `json:"tenantId,omitempty"`
	Message  string `json:"message,omitempty"` // paridade com o antigo `frontend-message`
}

// RoomForTenant monta o nome de room padrão para eventos do WhatsApp,
// preservando o contrato `whatsapp:{tenantId}` do Node.
func RoomForTenant(tenantID uint) string {
	return "whatsapp:" + itoa(tenantID)
}

func itoa(v uint) string {
	if v == 0 {
		return "0"
	}
	digits := []byte{}
	for v > 0 {
		digits = append([]byte{byte('0' + v%10)}, digits...)
		v /= 10
	}
	return string(digits)
}

// nowRFC3339 é usado para carimbar `timestamp` nos payloads que o Node sempre
// inclui (`{ ...data, timestamp }`), ex. no whatsapp:update.
func nowRFC3339() string {
	return time.Now().UTC().Format(time.RFC3339)
}
