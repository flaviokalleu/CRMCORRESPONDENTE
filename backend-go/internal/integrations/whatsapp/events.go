package whatsapp

import (
	"context"
	"strconv"
	"time"

	"go.mau.fi/whatsmeow"
	"go.mau.fi/whatsmeow/types/events"

	"crmimob/internal/models"
)

// attachEventHandlers replica os handlers de `sock.ev` do Node:
//   - creds.update -> saveCreds        => sqlstore persiste sozinho, não há equivalente manual.
//   - connection.update {qr}           => tratado no próprio StartSession (GetQRChannel).
//   - connection.update open           => *events.Connected / *events.PairSuccess (aqui).
//   - connection.update close          => *events.Disconnected / *events.LoggedOut (aqui).
//   - messages.upsert                  => *events.Message (aqui).
func (m *Manager) attachEventHandlers(tc *TenantClient, client *whatsmeow.Client) {
	client.AddEventHandler(func(rawEvt any) {
		// Guard de corrida (gotcha #8): só processa se este ainda for o client
		// corrente do tenant — descarta eventos de sockets antigos após troca
		// de sessão/reconexão.
		if !m.isCurrentClient(tc, client) {
			return
		}

		switch evt := rawEvt.(type) {
		case *events.Connected:
			m.onConnected(tc, client)
		case *events.PairSuccess:
			m.onConnected(tc, client)
		case *events.LoggedOut:
			m.onDisconnected(tc, client, false, "logged_out")
		case *events.StreamReplaced:
			// Outra sessão assumiu o socket — não reconectar aqui (evita loop
			// de "quem manda"), replica comportamento conservador do Node.
			m.onDisconnected(tc, client, false, "stream_replaced")
		case *events.ConnectFailure:
			reasonCode := strconv.Itoa(int(evt.Reason))
			blocked := reasonCode == "405"
			m.onDisconnected(tc, client, !blocked, "connect_failure:"+reasonCode)
		case *events.TemporaryBan:
			m.onDisconnected(tc, client, false, "temporary_ban")
		case *events.Disconnected:
			m.onDisconnected(tc, client, true, "disconnected")
		case *events.Message:
			m.onMessage(tc, evt)
		}
	})
}

// isCurrentClient replica isCurrentSocketRuntime(runtime, tenantSock, storedSessionId).
func (m *Manager) isCurrentClient(tc *TenantClient, client *whatsmeow.Client) bool {
	tc.mu.Lock()
	defer tc.mu.Unlock()
	return tc.Client == client
}

func (m *Manager) onConnected(tc *TenantClient, client *whatsmeow.Client) {
	ctx := context.Background()

	phoneNumber := ""
	if client.Store != nil && client.Store.ID != nil {
		phoneNumber = client.Store.ID.User
	}

	tc.mu.Lock()
	tc.IsAuthenticated = true
	tc.IsInitializing = false
	tc.QRCodeData = ""
	tc.ReconnectAttempts = 0
	tc.ConnectionBlocked = false
	tc.PhoneNumber = phoneNumber
	storedID := tc.StoredSessionID
	tenantID := tc.TenantID
	if client.Store != nil && client.Store.ID != nil {
		jid := client.Store.ID.String()
		// persistido fora do lock para não segurar mutex durante I/O.
		go func() { _ = m.repo.SaveDeviceJID(ctx, storedID, jid) }()
	}
	tc.mu.Unlock()

	if err := m.repo.MarkAuthenticated(ctx, storedID, phoneNumber); err != nil {
		m.logger.Warnf("whatsapp: falha ao marcar authenticated (tenant=%d): %v", tenantID, err)
	}

	m.hub.BroadcastToRoom(roomForTenant(tenantID), "whatsapp:update", map[string]any{
		"type":        "status",
		"status":      "ready",
		"phoneNumber": phoneNumber,
		"tenantId":    tenantID,
		"timestamp":   time.Now().UTC(),
	})
}

// onDisconnected replica o bloco `connection.update` -> close, incluindo a
// decisão de reconexão (backoff 5x) implementada em reconnect.go.
func (m *Manager) onDisconnected(tc *TenantClient, client *whatsmeow.Client, allowReconnect bool, reason string) {
	ctx := context.Background()

	tc.mu.Lock()
	tc.IsAuthenticated = false
	tc.IsInitializing = false
	tc.QRCodeData = ""
	storedID := tc.StoredSessionID
	tenantID := tc.TenantID
	tc.mu.Unlock()

	if err := m.repo.MarkDisconnected(ctx, storedID); err != nil {
		m.logger.Warnf("whatsapp: falha ao marcar disconnected (tenant=%d): %v", tenantID, err)
	}
	if reason != "disconnected" {
		_ = m.repo.MarkError(ctx, storedID, reason)
	}

	m.hub.BroadcastToRoom(roomForTenant(tenantID), "whatsapp:update", map[string]any{
		"type":      "status",
		"status":    "disconnected",
		"tenantId":  tenantID,
		"timestamp": time.Now().UTC(),
	})

	m.scheduleReconnect(tc, allowReconnect, reason)
}

func (m *Manager) onMessage(tc *TenantClient, evt *events.Message) {
	tc.mu.Lock()
	tenantID := tc.TenantID
	tc.mu.Unlock()

	// Apenas repassa ao frontend (não persiste) — igual ao Node
	// (`messages.upsert` -> broadcast `messageReceived`, sem gravar no banco).
	m.hub.BroadcastToRoom(roomForTenant(tenantID), "whatsapp:update", map[string]any{
		"type": "messageReceived",
		"data": map[string]any{
			"from":      evt.Info.Sender.String(),
			"chat":      evt.Info.Chat.String(),
			"timestamp": evt.Info.Timestamp,
			"isFromMe":  evt.Info.IsFromMe,
			"pushName":  evt.Info.PushName,
		},
		"timestamp": time.Now().UTC(),
	})
}

// restoreTenantSession reidrata um device já pareado (JID salvo) SEM pedir
// novo QR — usado no boot (RestoreOnBoot) para as sessões status='active'.
func restoreTenantSession(ctx context.Context, m *Manager, tenantID uint, s models.WhatsappSession) {
	device, err := LoadDevice(ctx, m.container, *s.DeviceJID)
	if err != nil || device == nil {
		m.logger.Warnf("whatsapp: não foi possível reidratar device do tenant %d: %v", tenantID, err)
		return
	}

	tc := m.getOrCreate(tenantID)
	tc.mu.Lock()
	tc.StoredSessionID = s.ID
	tc.PublicSessionID = s.SessionID
	tc.mu.Unlock()

	client := whatsmeow.NewClient(device, m.logger)
	tc.mu.Lock()
	tc.Client = client
	tc.mu.Unlock()

	m.attachEventHandlers(tc, client)

	if err := client.Connect(); err != nil {
		m.logger.Errorf("whatsapp: falha ao reconectar tenant %d no boot: %v", tenantID, err)
	}
}
