package laudos

import (
	"time"

	"crmimob/internal/models"
)

// toResponse converte um models.Laudo + timestamp de referência no shape de
// API, calculando status/diasParaVencimento (porta de getStatus()/
// getDiasParaVencimento() do model Node).
func toResponse(l models.Laudo, now time.Time) LaudoResponse {
	return LaudoResponse{
		ID:                 l.ID,
		Parceiro:           l.Parceiro,
		TipoImovel:         l.TipoImovel,
		ValorSolicitado:    l.ValorSolicitado,
		ValorLiberado:      l.ValorLiberado,
		Vencimento:         l.Vencimento,
		Endereco:           l.Endereco,
		Observacoes:        l.Observacoes,
		Arquivos:           decodeArquivos(l.Arquivos),
		UserID:             l.UserID,
		TenantID:           l.TenantID,
		CreatedAt:          l.CreatedAt,
		UpdatedAt:          l.UpdatedAt,
		Status:             l.Status(now),
		DiasParaVencimento: l.DiasParaVencimento(now),
	}
}

// canManage replica a regra de permissão do Node: `role === 'Administrador'`
// OU o próprio dono (`laudo.user_id === req.user.id`).
func canManage(user *models.User, laudo *models.Laudo) bool {
	return user.IsAdministrador || laudo.UserID == user.ID
}
