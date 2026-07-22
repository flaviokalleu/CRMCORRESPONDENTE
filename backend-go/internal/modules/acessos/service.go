package acessos

import (
	"context"
	"strconv"
	"strings"
	"time"

	"crmimob/internal/models"
)

type Service struct{ repo *Repository }

func NewService(repo *Repository) *Service { return &Service{repo: repo} }

// DeterminarRole replica determinarRole do Node: admin > corretor > correspondente > usuario.
// Mesma prioridade de models.User.Role(), mas em minúsculas/pt-BR (contrato do
// endpoint /acessos preservado 1:1).
func DeterminarRole(u *models.User) string {
	switch {
	case u == nil:
		return "visitante"
	case u.IsAdministrador:
		return "administrador"
	case u.IsCorretor:
		return "corretor"
	case u.IsCorrespondente:
		return "correspondente"
	default:
		return "usuario"
	}
}

// ParseDeviceType replica um parser simplificado de User-Agent (mobile/tablet/
// desktop). O Node usa uma lib de UA parsing dedicada; aqui é heurística de
// substring — suficiente para a analítica de dashboard, sem dependência nova.
func ParseDeviceType(userAgent string) string {
	ua := strings.ToLower(userAgent)
	switch {
	case strings.Contains(ua, "ipad") || strings.Contains(ua, "tablet"):
		return "tablet"
	case strings.Contains(ua, "mobi") || strings.Contains(ua, "android") || strings.Contains(ua, "iphone"):
		return "mobile"
	case ua == "":
		return "desconhecido"
	default:
		return "desktop"
	}
}

type CreateInput struct {
	IP        string
	Referer   string
	Page      string
	UserAgent string
	UserID    *uint
}

// Create registra um acesso. Se `page` começa com "/clientes/<id>", resolve o
// userId a partir do Cliente (§2.6) quando o chamador não informou.
func (s *Service) Create(ctx context.Context, in CreateInput) (*models.Acesso, error) {
	deviceType := ParseDeviceType(in.UserAgent)

	userID := in.UserID
	if userID == nil {
		if id, ok := clienteIDFromPage(in.Page); ok {
			if c, err := s.repo.FindCliente(ctx, id); err == nil {
				userID = c.UserID
			}
		}
	}

	a := &models.Acesso{
		IP:         in.IP,
		Referer:    strPtrOrNil(in.Referer),
		UserAgent:  strPtrOrNil(in.UserAgent),
		DeviceType: &deviceType,
		Page:       strPtrOrNil(in.Page),
		Timestamp:  time.Now(),
		UserID:     userID,
		// GeoCity/GeoRegion/GeoCountry/GeoTimezone/GeoCoordinates: dependem de
		// uma lib de geoip (equivalente ao geoip-lite do Node) — não adicionada
		// ao go.mod nesta tarefa. Placeholder: ficam nil até a lib ser escolhida.
	}
	if err := s.repo.Create(ctx, a); err != nil {
		return nil, err
	}
	return a, nil
}

func clienteIDFromPage(page string) (uint, bool) {
	const prefix = "/clientes/"
	if !strings.HasPrefix(page, prefix) {
		return 0, false
	}
	rest := strings.TrimPrefix(page, prefix)
	if idx := strings.Index(rest, "/"); idx >= 0 {
		rest = rest[:idx]
	}
	id, err := strconv.ParseUint(rest, 10, 64)
	if err != nil {
		return 0, false
	}
	return uint(id), true
}

func strPtrOrNil(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

// periodSince converte "1h/24h/7d/30d/90d" (default 24h) para o instante inicial.
func periodSince(period string) time.Time {
	now := time.Now()
	switch period {
	case "1h":
		return now.Add(-1 * time.Hour)
	case "7d":
		return now.AddDate(0, 0, -7)
	case "30d":
		return now.AddDate(0, 0, -30)
	case "90d":
		return now.AddDate(0, 0, -90)
	default: // "24h"
		return now.Add(-24 * time.Hour)
	}
}

type StatsResponse struct {
	Resumo             statsMap      `json:"resumo"`
	UsuariosMaisAtivos []UserCount   `json:"usuariosMaisAtivos"`
	HorariosPico       []HourCount   `json:"horariosPico"`
	Paginas            []PageCount   `json:"paginas"`
	Dispositivos       []DeviceCount `json:"dispositivos"`
}

// statsMap evita import de gin no service (mantém a camada desacoplada); é só
// um alias de map[string]any usado no shape de resposta.
type statsMap map[string]any

func (s *Service) Stats(ctx context.Context, period string) (*StatsResponse, error) {
	since := periodSince(period)

	total, err := s.repo.CountSince(ctx, since)
	if err != nil {
		return nil, err
	}
	users, err := s.repo.TopUsersSince(ctx, since, 10)
	if err != nil {
		return nil, err
	}
	hours, err := s.repo.PeakHoursSince(ctx, since)
	if err != nil {
		return nil, err
	}
	pages, err := s.repo.TopPagesSince(ctx, since, 10)
	if err != nil {
		return nil, err
	}
	devices, err := s.repo.DeviceStatsSince(ctx, since)
	if err != nil {
		return nil, err
	}

	return &StatsResponse{
		Resumo:             statsMap{"totalAcessos": total, "periodo": period},
		UsuariosMaisAtivos: users,
		HorariosPico:       hours,
		Paginas:            pages,
		Dispositivos:       devices,
	}, nil
}

func (s *Service) Realtime(ctx context.Context) ([]models.Acesso, error) {
	return s.repo.Realtime(ctx, time.Now().Add(-5*time.Minute))
}

func (s *Service) ByUser(ctx context.Context, userID uint, page, limit int) ([]models.Acesso, int64, error) {
	return s.repo.ByUser(ctx, userID, page, limit)
}

func (s *Service) List(ctx context.Context, f ListFilters) ([]models.Acesso, int64, error) {
	return s.repo.List(ctx, f)
}
