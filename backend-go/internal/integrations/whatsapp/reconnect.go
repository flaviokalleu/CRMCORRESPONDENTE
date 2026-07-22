package whatsapp

import (
	"context"
	"strings"
	"time"
)

// scheduleReconnect replica a decisão de reconexão do `connection.update` close
// do Node (ver spec §"connection.update → close"):
//
//   - shouldReconnect (não é loggedOut/405) && reconnectAttempts < 5:
//     reconnectAttempts++, delay = min(5000*n, 30000)ms, agenda nova tentativa.
//   - reason contém "405" (bloqueado)      => connectionBlocked=true, NÃO reconecta.
//   - reconnectAttempts >= 5               => connectionBlocked=true, para.
//   - loggedOut                            => NÃO reconecta.
func (m *Manager) scheduleReconnect(tc *TenantClient, allowReconnect bool, reason string) {
	if strings.Contains(reason, "405") {
		tc.mu.Lock()
		tc.ConnectionBlocked = true
		tc.mu.Unlock()
		return
	}
	if reason == "logged_out" {
		return
	}
	if !allowReconnect {
		tc.mu.Lock()
		tc.ConnectionBlocked = true
		tc.mu.Unlock()
		return
	}

	tc.mu.Lock()
	if tc.ReconnectAttempts >= MaxReconnectAttempts {
		tc.ConnectionBlocked = true
		tc.mu.Unlock()
		return
	}
	tc.ReconnectAttempts++
	attempt := tc.ReconnectAttempts
	tenantID := tc.TenantID
	sessionID := tc.PublicSessionID
	tc.mu.Unlock()

	delay := time.Duration(attempt) * 5 * time.Second
	if delay > 30*time.Second {
		delay = 30 * time.Second
	}

	go func() {
		time.Sleep(delay)
		ctx, cancel := context.WithTimeout(context.Background(), 40*time.Second)
		defer cancel()
		if _, err := m.StartSession(ctx, tenantID, sessionID); err != nil {
			m.logger.Warnf("whatsapp: falha na tentativa de reconexão %d/%d (tenant=%d): %v",
				attempt, MaxReconnectAttempts, tenantID, err)
		}
	}()
}
