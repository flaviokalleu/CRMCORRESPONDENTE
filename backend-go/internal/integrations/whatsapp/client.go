// Package whatsapp integra o backend com o WhatsApp via go.mau.fi/whatsmeow,
// substituindo o `whaileys` (fork do Baileys) usado no Node. Ver o mapa de-para
// completo em docs/migration/05-whatsapp-realtime-jobs.md.
//
// Mantém 1 *whatsmeow.Client POR TENANT, análogo ao `tenantRuntimes: Map` do
// Node (routes/whatsappRoutes.js). Cada tenant tem seu próprio device no
// sqlstore (parear = escanear QR), sua fila de reconexão e seu estado de
// runtime (autenticado, inicializando, bloqueado).
package whatsapp

import (
	"context"
	"errors"
	"fmt"
	"sync"
	"time"

	"go.mau.fi/whatsmeow"
	"go.mau.fi/whatsmeow/store/sqlstore"
	waLog "go.mau.fi/whatsmeow/util/log"

	"crmimob/internal/config"
	"crmimob/internal/models"
)

// Broadcaster é o subconjunto do *ws.Hub usado por este pacote. Definido
// localmente (em vez de importar internal/ws) para manter a integração
// desacoplada e fácil de testar com um fake. O *ws.Hub real satisfaz esta
// interface sem nenhum adapter.
type Broadcaster interface {
	Broadcast(event string, data any)
	BroadcastToRoom(room, event string, data any)
}

// Status observável de uma sessão — devolvido por GetStatus/GetSessionInfo.
type Status string

const (
	StatusIdle         Status = "idle"
	StatusInitializing Status = "initializing"
	StatusQR           Status = "qr"
	StatusAuthenticated Status = "authenticated"
	StatusBlocked      Status = "blocked"
	StatusDisconnected Status = "disconnected"
)

// TenantClient é o runtime em memória de UM tenant (equivalente ao objeto
// `runtime` guardado em `tenantRuntimes` no Node).
type TenantClient struct {
	mu sync.Mutex

	TenantID uint

	Client *whatsmeow.Client

	StoredSessionID string // "tenant_{id}__{sessionId}"
	PublicSessionID string // sessionId "público"

	QRCodeData        string
	IsAuthenticated    bool
	IsInitializing     bool
	ConnectionBlocked  bool
	ReconnectAttempts  int
	PhoneNumber        string

	cancelQR context.CancelFunc
}

func (t *TenantClient) status() Status {
	switch {
	case t.ConnectionBlocked:
		return StatusBlocked
	case t.IsAuthenticated:
		return StatusAuthenticated
	case t.QRCodeData != "":
		return StatusQR
	case t.IsInitializing:
		return StatusInitializing
	default:
		return StatusIdle
	}
}

// Manager guarda 1 client whatsmeow por tenant (map tenantID -> *TenantClient)
// e centraliza start/stop/reconexão/envio. Substitui `tenantRuntimes` +
// `initializeWhatsAppClient` + `disconnectTenantRuntime` do Node.
type Manager struct {
	mu      sync.RWMutex
	tenants map[uint]*TenantClient

	container *sqlstore.Container
	repo      *SessionRepo
	hub       Broadcaster
	logger    waLog.Logger

	cfg *config.Config
}

func NewManager(cfg *config.Config, container *sqlstore.Container, repo *SessionRepo, hub Broadcaster, logger waLog.Logger) *Manager {
	return &Manager{
		tenants:   make(map[uint]*TenantClient),
		container: container,
		repo:      repo,
		hub:       hub,
		logger:    logger,
		cfg:       cfg,
	}
}

func (m *Manager) getOrCreate(tenantID uint) *TenantClient {
	m.mu.Lock()
	defer m.mu.Unlock()
	tc, ok := m.tenants[tenantID]
	if !ok {
		tc = &TenantClient{TenantID: tenantID}
		m.tenants[tenantID] = tc
	}
	return tc
}

func (m *Manager) get(tenantID uint) (*TenantClient, bool) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	tc, ok := m.tenants[tenantID]
	return tc, ok
}

// StartSession replica `initializeWhatsAppClient(tenantId, storedSessionId)`.
// sessionID vazio usa DefaultSessionID ("default"). Devolve um channel de
// eventos de QR (string de código bruto, não dataURL — igual ao Node) que é
// fechado quando a conexão abre, falha ou expira o timeout de 35s.
func (m *Manager) StartSession(ctx context.Context, tenantID uint, sessionID string) (<-chan string, error) {
	tc := m.getOrCreate(tenantID)

	tc.mu.Lock()
	if tc.IsInitializing {
		tc.mu.Unlock()
		return nil, errors.New("whatsapp: sessão já está inicializando para este tenant")
	}
	tc.IsInitializing = true
	tc.QRCodeData = ""
	tc.PublicSessionID = sanitizeSessionID(sessionID)
	tc.StoredSessionID = BuildStoredSessionID(tenantID, tc.PublicSessionID)
	storedID := tc.StoredSessionID
	publicID := tc.PublicSessionID
	tc.mu.Unlock()

	if err := m.repo.MarkConnecting(ctx, tenantID, storedID, publicID); err != nil {
		m.logger.Warnf("whatsapp: falha ao marcar connecting (tenant=%d): %v", tenantID, err)
	}

	device := m.container.NewDevice()
	client := whatsmeow.NewClient(device, m.logger)

	tc.mu.Lock()
	tc.Client = client
	tc.mu.Unlock()

	m.attachEventHandlers(tc, client)

	qrChan, err := client.GetQRChannel(ctx)
	if err != nil {
		// Já pareado anteriormente nesta mesma instância de device (raro aqui,
		// pois acabamos de criar um device novo) — segue para Connect direto.
		if err := client.Connect(); err != nil {
			tc.mu.Lock()
			tc.IsInitializing = false
			tc.mu.Unlock()
			return nil, fmt.Errorf("whatsapp: connect: %w", err)
		}
		empty := make(chan string)
		close(empty)
		return empty, nil
	}

	out := make(chan string, 1)
	initCtx, cancel := context.WithTimeout(context.Background(), 35*time.Second)
	tc.mu.Lock()
	tc.cancelQR = cancel
	tc.mu.Unlock()

	if err := client.Connect(); err != nil {
		cancel()
		tc.mu.Lock()
		tc.IsInitializing = false
		tc.mu.Unlock()
		return nil, fmt.Errorf("whatsapp: connect: %w", err)
	}

	go func() {
		defer close(out)
		for {
			select {
			case evt, ok := <-qrChan:
				if !ok {
					return
				}
				if evt.Event == "code" {
					tc.mu.Lock()
					tc.QRCodeData = evt.Code
					tc.IsInitializing = false
					tc.mu.Unlock()

					m.hub.BroadcastToRoom(roomForTenant(tenantID), "whatsapp:update", map[string]any{
						"type":      "qr",
						"tenantId":  tenantID,
						"qrCode":    evt.Code,
						"sessionId": publicID,
						"message":   "QR Code disponível para escaneamento",
						"timestamp": time.Now().UTC(),
					})

					select {
					case out <- evt.Code:
					default:
					}
				} else if evt.Event == "success" {
					return
				}
			case <-initCtx.Done():
				// Timeout de segurança 35s (gotcha #10): reseta estado e avisa o front.
				tc.mu.Lock()
				if tc.IsInitializing {
					tc.IsInitializing = false
					tc.mu.Unlock()
					client.Disconnect()
					m.hub.BroadcastToRoom(roomForTenant(tenantID), "whatsapp:update", map[string]any{
						"type":      "error",
						"tenantId":  tenantID,
						"message":   "Timeout ao gerar QR Code. Tente novamente.",
						"timestamp": time.Now().UTC(),
					})
				} else {
					tc.mu.Unlock()
				}
				return
			}
		}
	}()

	return out, nil
}

// GetStatus replica GET /status: isConnected + estado observável.
func (m *Manager) GetStatus(tenantID uint) Status {
	tc, ok := m.get(tenantID)
	if !ok {
		return StatusIdle
	}
	tc.mu.Lock()
	defer tc.mu.Unlock()
	return tc.status()
}

// GetQRCode devolve o QR atualmente disponível (ou "" se não houver) — usado
// pelo GET /qr-code, que NÃO deve inicializar nada, só ler estado.
func (m *Manager) GetQRCode(tenantID uint) (qr string, status Status) {
	tc, ok := m.get(tenantID)
	if !ok {
		return "", StatusIdle
	}
	tc.mu.Lock()
	defer tc.mu.Unlock()
	return tc.QRCodeData, tc.status()
}

// SendMessage envia texto simples via WhatsApp, aplicando a normalização
// brasileira do 9º dígito (ver phone.go). Equivalente a
// `sock.sendMessage(jid, {text})`.
func (m *Manager) SendMessage(ctx context.Context, tenantID uint, phone, message string) (msgID string, err error) {
	tc, ok := m.get(tenantID)
	if !ok || tc.Client == nil {
		return "", errors.New("whatsapp: sessão não iniciada para este tenant")
	}
	tc.mu.Lock()
	client := tc.Client
	authenticated := tc.IsAuthenticated
	tc.mu.Unlock()

	if !authenticated || client == nil || !client.IsConnected() {
		return "", errors.New("whatsapp: sessão não autenticada/conectada")
	}

	jid, ok := ToJID(phone)
	if !ok {
		return "", fmt.Errorf("whatsapp: telefone inválido: %q", phone)
	}

	return sendText(ctx, client, jid, message)
}

// Logout replica /reset e /disconnect (com deleteSession=true): desloga do
// WhatsApp, desconecta o socket e apaga o device do sqlstore + metadados.
func (m *Manager) Logout(ctx context.Context, tenantID uint, deleteSession bool) error {
	tc, ok := m.get(tenantID)
	if !ok {
		return nil
	}
	tc.mu.Lock()
	client := tc.Client
	storedID := tc.StoredSessionID
	if tc.cancelQR != nil {
		tc.cancelQR()
	}
	tc.IsAuthenticated = false
	tc.IsInitializing = false
	tc.QRCodeData = ""
	tc.mu.Unlock()

	if client != nil {
		if deleteSession {
			_ = client.Logout(ctx)
		}
		client.Disconnect()
		if deleteSession && client.Store != nil && client.Store.ID != nil {
			_ = m.container.DeleteDevice(ctx, client.Store)
		}
	}

	if err := m.repo.MarkDisconnected(ctx, storedID); err != nil {
		m.logger.Warnf("whatsapp: falha ao marcar disconnected (tenant=%d): %v", tenantID, err)
	}
	if deleteSession {
		_ = m.repo.Delete(ctx, storedID)
	}

	m.hub.BroadcastToRoom(roomForTenant(tenantID), "whatsapp:update", map[string]any{
		"type":      "status",
		"status":    "disconnected",
		"tenantId":  tenantID,
		"timestamp": time.Now().UTC(),
	})

	return nil
}

// Disconnect apenas derruba o socket em memória, preservando as credenciais
// (equivalente a /disconnect sem deleteSession).
func (m *Manager) Disconnect(ctx context.Context, tenantID uint) error {
	return m.Logout(ctx, tenantID, false)
}

// RestoreOnBoot replica a auto-reconexão 5s após o boot: lê sessões
// `status='active'` e reidrata o device via JID salvo, sem pedir novo QR.
func (m *Manager) RestoreOnBoot(ctx context.Context) {
	sessions, err := m.repo.ListActive(ctx)
	if err != nil {
		m.logger.Errorf("whatsapp: falha ao listar sessões ativas no boot: %v", err)
		return
	}
	for _, s := range sessions {
		if s.DeviceJID == nil || *s.DeviceJID == "" {
			continue // sem device pareado salvo -> precisa de novo QR (rescan pós-migração)
		}
		go m.restoreTenant(ctx, s.TenantID, s)
	}
}

func (m *Manager) restoreTenant(ctx context.Context, tenantID uint, s models.WhatsappSession) {
	// Implementado em events.go (restoreTenantSession) para manter este
	// arquivo focado no ciclo de vida público do Manager.
	restoreTenantSession(ctx, m, tenantID, s)
}

func roomForTenant(tenantID uint) string {
	return fmt.Sprintf("whatsapp:%d", tenantID)
}
