package whatsapp

import (
	"context"
	"errors"
	"fmt"
	"time"

	"gorm.io/gorm"

	"crmimob/internal/models"
)

const (
	// DefaultSessionID replica DEFAULT_SESSION_ID='default' do Node.
	DefaultSessionID = "default"
	// MaxReconnectAttempts replica MAX_RECONNECT_ATTEMPTS=5 do Node.
	MaxReconnectAttempts = 5
)

// SessionRepo é a camada de METADADOS sobre `whatsapp_sessions` (ver doc no
// models.WhatsappSession sobre por que as credenciais reais vivem no sqlstore
// do whatsmeow, não aqui). Equivalente reduzido do WhatsAppSessionService.js.
type SessionRepo struct {
	db *gorm.DB
}

func NewSessionRepo(db *gorm.DB) *SessionRepo {
	return &SessionRepo{db: db}
}

// sanitizeSessionID replica sanitizeSessionId(id) do Node: trim +
// substituição de tudo que não for [a-zA-Z0-9_-] por '_'; vazio vira "default".
func sanitizeSessionID(id string) string {
	if id == "" {
		return DefaultSessionID
	}
	out := make([]rune, 0, len(id))
	for _, r := range id {
		if (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') || r == '_' || r == '-' {
			out = append(out, r)
		} else {
			out = append(out, '_')
		}
	}
	if len(out) == 0 {
		return DefaultSessionID
	}
	return string(out)
}

// TenantPrefix replica getTenantSessionPrefix(tenantId) = `tenant_{tenantId}__`.
func TenantPrefix(tenantID uint) string {
	return fmt.Sprintf("tenant_%d__", tenantID)
}

// BuildStoredSessionID replica buildStoredSessionId(tenantId, sessionId).
func BuildStoredSessionID(tenantID uint, sessionID string) string {
	return TenantPrefix(tenantID) + sanitizeSessionID(sessionID)
}

// ToPublicSessionID remove o prefixo do tenant, devolvendo o id "público".
func ToPublicSessionID(tenantID uint, stored string) string {
	prefix := TenantPrefix(tenantID)
	if len(stored) > len(prefix) && stored[:len(prefix)] == prefix {
		return stored[len(prefix):]
	}
	return stored
}

func (r *SessionRepo) Get(ctx context.Context, storedID string) (*models.WhatsappSession, error) {
	var s models.WhatsappSession
	if err := r.db.WithContext(ctx).First(&s, "id = ?", storedID).Error; err != nil {
		return nil, err
	}
	return &s, nil
}

func (r *SessionRepo) Exists(ctx context.Context, storedID string) bool {
	_, err := r.Get(ctx, storedID)
	return err == nil
}

// Upsert cria ou atualiza o registro de metadados (equivalente a createSession/saveSession).
func (r *SessionRepo) Upsert(ctx context.Context, s *models.WhatsappSession) error {
	var existing models.WhatsappSession
	err := r.db.WithContext(ctx).First(&existing, "id = ?", s.ID).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		s.CreatedAt = time.Now()
		s.UpdatedAt = time.Now()
		return r.db.WithContext(ctx).Create(s).Error
	}
	if err != nil {
		return err
	}
	s.UpdatedAt = time.Now()
	return r.db.WithContext(ctx).Model(&models.WhatsappSession{}).Where("id = ?", s.ID).Updates(s).Error
}

func (r *SessionRepo) MarkConnecting(ctx context.Context, tenantID uint, storedID, publicID string) error {
	return r.Upsert(ctx, &models.WhatsappSession{
		ID: storedID, TenantID: tenantID, SessionID: publicID,
		Status: models.WhatsappStatusConnecting,
	})
}

func (r *SessionRepo) MarkAuthenticated(ctx context.Context, storedID, phoneNumber string) error {
	now := time.Now()
	return r.db.WithContext(ctx).Model(&models.WhatsappSession{}).Where("id = ?", storedID).Updates(map[string]any{
		"status":           models.WhatsappStatusActive,
		"is_authenticated": true,
		"phone_number":     phoneNumber,
		"last_activity":    &now,
		"last_error":       nil,
		"updated_at":       now,
	}).Error
}

func (r *SessionRepo) MarkDisconnected(ctx context.Context, storedID string) error {
	return r.db.WithContext(ctx).Model(&models.WhatsappSession{}).Where("id = ?", storedID).Updates(map[string]any{
		"status":           models.WhatsappStatusInactive,
		"is_authenticated": false,
		"updated_at":       time.Now(),
	}).Error
}

func (r *SessionRepo) MarkError(ctx context.Context, storedID, errMsg string) error {
	return r.db.WithContext(ctx).Model(&models.WhatsappSession{}).Where("id = ?", storedID).Updates(map[string]any{
		"status":     models.WhatsappStatusError,
		"last_error": errMsg,
		"updated_at": time.Now(),
	}).Error
}

// SaveDeviceJID persiste o JID do device pareado no sqlstore, para permitir
// reidratação do client no próximo boot sem novo QR (ver models.WhatsappSession.DeviceJID).
func (r *SessionRepo) SaveDeviceJID(ctx context.Context, storedID, jid string) error {
	return r.db.WithContext(ctx).Model(&models.WhatsappSession{}).Where("id = ?", storedID).Updates(map[string]any{
		"device_jid": jid,
		"updated_at": time.Now(),
	}).Error
}

func (r *SessionRepo) Delete(ctx context.Context, storedID string) error {
	return r.db.WithContext(ctx).Delete(&models.WhatsappSession{}, "id = ?", storedID).Error
}

// ListActive replica listActiveSessions() — usado no auto-reconnect do boot.
func (r *SessionRepo) ListActive(ctx context.Context) ([]models.WhatsappSession, error) {
	var out []models.WhatsappSession
	err := r.db.WithContext(ctx).Where("status = ?", models.WhatsappStatusActive).Find(&out).Error
	return out, err
}

// ListByTenant lista sessões de um tenant (filtra por prefixo do id).
func (r *SessionRepo) ListByTenant(ctx context.Context, tenantID uint) ([]models.WhatsappSession, error) {
	var out []models.WhatsappSession
	err := r.db.WithContext(ctx).Where("tenant_id = ?", tenantID).Find(&out).Error
	return out, err
}

// CleanupStale remove sessões com mais de `olderThan` sem atividade (job de limpeza).
func (r *SessionRepo) CleanupStale(ctx context.Context, olderThan time.Duration) (int64, error) {
	cutoff := time.Now().Add(-olderThan)
	res := r.db.WithContext(ctx).
		Where("last_activity IS NOT NULL AND last_activity < ?", cutoff).
		Delete(&models.WhatsappSession{})
	return res.RowsAffected, res.Error
}
