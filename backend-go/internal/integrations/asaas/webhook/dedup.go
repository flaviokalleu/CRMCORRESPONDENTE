package webhook

import (
	"context"
	"errors"
	"time"

	"gorm.io/gorm"

	"crmimob/internal/models"
)

const provider = "asaas"

// reserveEvent implementa a idempotência exigida pelo 03-spec (§"Idempotência"):
// tenta registrar o evento (provider, eventID). Se já existir E já tiver sido
// processado, devolve alreadyProcessed=true — o handler deve responder 200 sem
// reprocessar recibo/WhatsApp/repasse. Caso contrário (novo ou existente mas
// ainda não processado — ex.: falha anterior no meio do processamento),
// devolve o registro para ser marcado como processado ao final.
func reserveEvent(ctx context.Context, db *gorm.DB, eventID string, payload []byte) (evt *models.WebhookEvent, alreadyProcessed bool, err error) {
	var existing models.WebhookEvent
	err = db.WithContext(ctx).Where("provider = ? AND event_id = ?", provider, eventID).First(&existing).Error
	switch {
	case err == nil:
		if existing.ProcessedAt != nil {
			return &existing, true, nil
		}
		return &existing, false, nil
	case errors.Is(err, gorm.ErrRecordNotFound):
		newEvt := &models.WebhookEvent{
			Provider:  provider,
			EventID:   eventID,
			Payload:   payload,
			CreatedAt: time.Now(),
		}
		if createErr := db.WithContext(ctx).Create(newEvt).Error; createErr != nil {
			// Corrida: outra goroutine/instância inseriu no meio tempo — trata
			// como já reservado por ela e deixa o request atual seguir como
			// "não processado ainda" (evita duplo-processamento hostil, mas
			// não bloqueia caso a outra tenha falhado antes de marcar).
			var again models.WebhookEvent
			if fetchErr := db.WithContext(ctx).Where("provider = ? AND event_id = ?", provider, eventID).First(&again).Error; fetchErr == nil {
				return &again, again.ProcessedAt != nil, nil
			}
			return nil, false, createErr
		}
		return newEvt, false, nil
	default:
		return nil, false, err
	}
}

func markProcessed(ctx context.Context, db *gorm.DB, id uint) error {
	now := time.Now()
	return db.WithContext(ctx).Model(&models.WebhookEvent{}).
		Where("id = ?", id).
		Update("processed_at", now).Error
}
