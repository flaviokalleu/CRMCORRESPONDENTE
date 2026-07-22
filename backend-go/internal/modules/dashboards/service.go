package dashboards

import (
	"context"
	"fmt"
	"math"
	"strings"
	"time"

	"gorm.io/gorm"

	"crmimob/internal/models"
	"crmimob/internal/tenant"
)

// Service concentra as agregações de dashboard. Todas as consultas usam
// db.WithContext(ctx) — queries baseadas em Model (db.Model(&models.Cliente{}))
// recebem o filtro tenant_id automaticamente dos callbacks de internal/tenant;
// queries via db.Raw (CAST de valor_renda, EXTRACT) NÃO passam pelo Schema
// resolvido, então o filtro de tenant é adicionado manualmente aqui — ver
// scopeSQL().
type Service struct {
	db    *gorm.DB
	cache *Cache
}

func NewService(db *gorm.DB, cache *Cache) *Service {
	return &Service{db: db, cache: cache}
}

// scopeUserID replica o whereCondition do Node: corretor puro (sem flags de
// admin/correspondente) só vê os próprios clientes.
func scopeUserID(user *models.User) *uint {
	if user.IsCorretor && !user.IsAdministrador && !user.IsCorrespondente {
		id := user.ID
		return &id
	}
	return nil
}

// scopeSQL devolve a cláusula SQL adicional (" AND tenant_id = ? [AND user_id = ?]")
// e os args correspondentes, para uso em db.Raw — onde os callbacks de tenant
// NÃO se aplicam automaticamente. tenantID nil (super admin global) não filtra.
func scopeSQL(ctx context.Context, user *models.User) (string, []interface{}) {
	var clauses []string
	var args []interface{}

	if scope, ok := tenant.From(ctx); ok && scope.TenantID != nil {
		clauses = append(clauses, "tenant_id = ?")
		args = append(args, *scope.TenantID)
	}
	if uid := scopeUserID(user); uid != nil {
		clauses = append(clauses, "user_id = ?")
		args = append(args, *uid)
	}
	if len(clauses) == 0 {
		return "", nil
	}
	return " AND " + strings.Join(clauses, " AND "), args
}

// scopeSQLQualified é como scopeSQL, mas qualifica as colunas com o alias de
// tabela informado (necessário em queries com JOIN entre tabelas que também
// têm tenant_id/user_id, como `users` — senão o Postgres rejeita a coluna
// como ambígua).
func scopeSQLQualified(ctx context.Context, user *models.User, alias string) (string, []interface{}) {
	var clauses []string
	var args []interface{}

	if scope, ok := tenant.From(ctx); ok && scope.TenantID != nil {
		clauses = append(clauses, alias+".tenant_id = ?")
		args = append(args, *scope.TenantID)
	}
	if uid := scopeUserID(user); uid != nil {
		clauses = append(clauses, alias+".user_id = ?")
		args = append(args, *uid)
	}
	if len(clauses) == 0 {
		return "", nil
	}
	return " AND " + strings.Join(clauses, " AND "), args
}

// applyModelScope aplica o filtro user_id (quando corretor puro) numa query
// Model-based; tenant_id já é injetado pelo callback global.
func applyModelScope(q *gorm.DB, user *models.User) *gorm.DB {
	if uid := scopeUserID(user); uid != nil {
		q = q.Where("user_id = ?", *uid)
	}
	return q
}

func statusBucket(status string) string {
	s := strings.ToLower(status)
	switch {
	case strings.Contains(s, "aprovado"):
		return "aprovado"
	case strings.Contains(s, "reprovado"), strings.Contains(s, "rejeitado"):
		return "reprovado"
	default:
		return "pendente"
	}
}

func growth(atual, anterior int64) float64 {
	if anterior == 0 {
		if atual > 0 {
			return 100
		}
		return 0
	}
	return math.Round(float64(atual-anterior) / float64(anterior) * 100)
}

// MainDashboard implementa GET /api/dashboard/ (com cache 5min por tenant+role+email).
func (s *Service) MainDashboard(ctx context.Context, user *models.User) (*MainDashboardResponse, error) {
	scope, _ := tenant.From(ctx)
	key := Key(scope.TenantID, user.Email, user.Role())
	if cached, ok := s.cache.Get(key); ok {
		return cached, nil
	}

	resp := &MainDashboardResponse{
		UserPermissions: UserPermissions{
			CanViewAll:       !(user.IsCorretor && !user.IsAdministrador && !user.IsCorrespondente),
			IsCorretor:       user.IsCorretor,
			IsAdministrador:  user.IsAdministrador,
			IsCorrespondente: user.IsCorrespondente,
		},
	}

	db := s.db.WithContext(ctx)

	if err := db.Model(&models.User{}).Where("is_corretor = ?", true).Count(&resp.TotalCorretores).Error; err != nil {
		return nil, err
	}
	if err := db.Model(&models.User{}).Where("is_correspondente = ?", true).Count(&resp.TotalCorrespondentes).Error; err != nil {
		return nil, err
	}

	clientesQ := applyModelScope(db.Model(&models.Cliente{}), user)
	if err := clientesQ.Count(&resp.TotalClientes).Error; err != nil {
		return nil, err
	}
	resp.TotalCount = resp.TotalClientes

	// Status counts (bucket em Go, como o Node fazia em JS).
	type statusRow struct {
		Status string
		Count  int64
	}
	var rows []statusRow
	if err := applyModelScope(db.Model(&models.Cliente{}), user).
		Select("status, COUNT(status) as count").Group("status").Scan(&rows).Error; err != nil {
		return nil, err
	}
	for _, r := range rows {
		switch statusBucket(r.Status) {
		case "aprovado":
			resp.ClientesAprovados += r.Count
		case "reprovado":
			resp.ClientesReprovados += r.Count
		default:
			resp.ClientesPendentes += r.Count
		}
	}

	// Aguardando aprovação.
	var aguardando []models.Cliente
	aq := applyModelScope(db.Model(&models.Cliente{}), user).
		Where("status ILIKE ? OR status ILIKE ? OR status ILIKE ? OR status ILIKE ? OR status = ?",
			"%aguardando%", "%pendente%", "%análise%", "%em análise%", "aguardando_aprovação").
		Order("created_at DESC")
	if err := aq.Find(&aguardando).Error; err != nil {
		return nil, err
	}
	resp.TotalClientesAguardandoAprovacao = int64(len(aguardando))
	for _, c := range aguardando {
		nome := ""
		if c.Nome != nil {
			nome = *c.Nome
		}
		resp.ClientesAguardandoAprovacao = append(resp.ClientesAguardandoAprovacao, ClienteResumo{
			ID: c.ID, Nome: nome, Status: c.Status, CreatedAt: c.CreatedAt, UpdatedAt: c.UpdatedAt,
		})
	}

	now := time.Now()
	inicioMes := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
	inicioMesAnterior := inicioMes.AddDate(0, -1, 0)
	fimMesAnterior := inicioMes

	if err := applyModelScope(db.Model(&models.Cliente{}), user).
		Where("created_at >= ?", inicioMes).Count(&resp.ClientesEsteMes).Error; err != nil {
		return nil, err
	}
	if err := applyModelScope(db.Model(&models.Cliente{}), user).
		Where("created_at >= ? AND created_at < ?", inicioMesAnterior, fimMesAnterior).
		Count(&resp.ClientesMesAnterior).Error; err != nil {
		return nil, err
	}
	resp.CrescimentoMensal = growth(resp.ClientesEsteMes, resp.ClientesMesAnterior)

	inicioSemana := now.AddDate(0, 0, -7)
	inicioSemanaAnterior := now.AddDate(0, 0, -14)
	var clientesSemanaAnterior int64
	if err := applyModelScope(db.Model(&models.Cliente{}), user).
		Where("created_at >= ?", inicioSemana).Count(&resp.ClientesSemana).Error; err != nil {
		return nil, err
	}
	if err := applyModelScope(db.Model(&models.Cliente{}), user).
		Where("created_at >= ? AND created_at < ?", inicioSemanaAnterior, inicioSemana).
		Count(&clientesSemanaAnterior).Error; err != nil {
		return nil, err
	}
	resp.CrescimentoSemanal = growth(resp.ClientesSemana, clientesSemanaAnterior)

	inicioHoje := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	if err := applyModelScope(db.Model(&models.Cliente{}), user).
		Where("created_at >= ?", inicioHoje).Count(&resp.ClientesHoje).Error; err != nil {
		return nil, err
	}

	trintaMin := now.Add(-30 * time.Minute)
	if err := db.Model(&models.User{}).Where("updated_at >= ?", trintaMin).Count(&resp.UsuariosAtivosHoje).Error; err != nil {
		return nil, err
	}

	// Top 5 usuários do mês (com JOIN — otimização vs. N+1 do Node, gotcha §6).
	if !(user.IsCorretor && !user.IsAdministrador && !user.IsCorrespondente) {
		type topRow struct {
			UserID    uint
			FirstName string
			LastName  string
			Email     string
			Clientes  int64
		}
		var topRows []topRow
		// Qualificado com "c." (não usa scopeSQL genérico): a query faz JOIN com
		// `users`, que também tem coluna tenant_id — sem qualificar, o Postgres
		// rejeita com "referência à coluna tenant_id é ambígua" (SQLSTATE 42702).
		clause, args := scopeSQLQualified(ctx, user, "c")
		q := fmt.Sprintf(`
			SELECT c.user_id AS user_id, u.first_name AS first_name, u.last_name AS last_name,
			       u.email AS email, COUNT(c.id) AS clientes
			FROM clientes c
			JOIN users u ON u.id = c.user_id
			WHERE c.user_id IS NOT NULL AND c.created_at >= ? AND c.created_at < ?%s
			GROUP BY c.user_id, u.first_name, u.last_name, u.email
			ORDER BY COUNT(c.id) DESC
			LIMIT 5`, clause)
		callArgs := append([]interface{}{inicioMes, now.AddDate(0, 1, 0)}, args...)
		if err := db.Raw(q, callArgs...).Scan(&topRows).Error; err != nil {
			return nil, err
		}
		for _, r := range topRows {
			resp.Top5Usuarios = append(resp.Top5Usuarios, TopUsuario{
				User: TopUsuarioUser{ID: r.UserID, FirstName: r.FirstName, LastName: r.LastName, Email: r.Email},
				Clientes: r.Clientes,
			})
		}
	}

	// Performance.
	var totalUsuarios int64
	if err := db.Model(&models.User{}).Count(&totalUsuarios).Error; err != nil {
		return nil, err
	}
	resp.Performance.TotalUsuarios = totalUsuarios
	totalStatus := resp.ClientesAprovados + resp.ClientesReprovados + resp.ClientesPendentes
	if totalStatus > 0 {
		resp.Performance.TaxaAprovacao = math.Round(float64(resp.ClientesAprovados) / float64(totalStatus) * 100)
		resp.Performance.TaxaRejeicao = math.Round(float64(resp.ClientesReprovados) / float64(totalStatus) * 100)
	}
	if totalUsuarios > 0 {
		resp.Performance.EficienciaMedia = math.Round(float64(resp.TotalClientes) / float64(totalUsuarios) * 100)
	}

	// Análise de renda — GOTCHA CENTRAL: valor_renda é VARCHAR (§ gotcha 1).
	renda, err := s.rendaAnalysis(ctx, user)
	if err != nil {
		return nil, err
	}
	resp.RendaAnalysis = *renda

	s.cache.Set(key, resp)
	return resp, nil
}

// rendaAnalysis calcula AVG/MAX/MIN/COUNT de valor_renda com CAST seguro.
// `valor_renda` é armazenado em pt-BR ("1.234,56") — REPLACE remove separador
// de milhar e troca vírgula decimal por ponto antes do CAST AS NUMERIC.
// O WHERE exclui NULL, '' e '0' (spec §"Análise de renda").
func (s *Service) rendaAnalysis(ctx context.Context, user *models.User) (*RendaAnalysis, error) {
	clause, args := scopeSQL(ctx, user)
	query := fmt.Sprintf(`
		SELECT
		  AVG(CAST(REPLACE(REPLACE(valor_renda, '.', ''), ',', '.') AS NUMERIC)) AS renda_media,
		  MAX(CAST(REPLACE(REPLACE(valor_renda, '.', ''), ',', '.') AS NUMERIC)) AS renda_maxima,
		  MIN(CAST(REPLACE(REPLACE(valor_renda, '.', ''), ',', '.') AS NUMERIC)) AS renda_minima,
		  COUNT(valor_renda) AS clientes_com_renda
		FROM clientes
		WHERE valor_renda IS NOT NULL AND valor_renda <> '' AND valor_renda <> '0'
		  AND valor_renda ~ '^[0-9.,]+$'%s`, clause)

	type row struct {
		RendaMedia       *float64
		RendaMaxima      *float64
		RendaMinima      *float64
		ClientesComRenda int64
	}
	var r row
	if err := s.db.WithContext(ctx).Raw(query, args...).Scan(&r).Error; err != nil {
		return nil, err
	}
	out := &RendaAnalysis{ClientesComRenda: r.ClientesComRenda}
	if r.RendaMedia != nil {
		out.RendaMedia = *r.RendaMedia
	}
	if r.RendaMaxima != nil {
		out.RendaMaxima = *r.RendaMaxima
	}
	if r.RendaMinima != nil {
		out.RendaMinima = *r.RendaMinima
	}
	return out, nil
}

// Monthly implementa GET /api/dashboard/monthly (12 meses, agregação via EXTRACT).
func (s *Service) Monthly(ctx context.Context, user *models.User) (*MonthlyResponse, error) {
	now := time.Now()
	inicio := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location()).AddDate(0, -11, 0)

	clause, args := scopeSQL(ctx, user)
	query := fmt.Sprintf(`
		SELECT EXTRACT(MONTH FROM created_at)::int AS month,
		       EXTRACT(YEAR FROM created_at)::int AS year,
		       COUNT(id) AS count
		FROM clientes
		WHERE created_at >= ?%s
		GROUP BY EXTRACT(YEAR FROM created_at), EXTRACT(MONTH FROM created_at)
		ORDER BY year ASC, month ASC`, clause)

	type row struct {
		Month int
		Year  int
		Count int64
	}
	var rows []row
	callArgs := append([]interface{}{inicio}, args...)
	if err := s.db.WithContext(ctx).Raw(query, callArgs...).Scan(&rows).Error; err != nil {
		return nil, err
	}

	var resp MonthlyResponse
	resp.Labels = mesesPT
	for _, r := range rows {
		if r.Month < 1 || r.Month > 12 {
			continue
		}
		resp.MonthlyData[r.Month-1] += r.Count
		resp.TotalYear += r.Count
	}
	for i := 1; i < 12; i++ {
		resp.MonthlyGrowth[i] = growth(resp.MonthlyData[i], resp.MonthlyData[i-1])
	}
	resp.AverageMonth = math.Round(float64(resp.TotalYear) / 12 * 100) / 100
	return &resp, nil
}

// Weekly implementa GET /api/dashboard/weekly (semana atual vs. anterior via EXTRACT(DOW)).
func (s *Service) Weekly(ctx context.Context, user *models.User) (*WeeklyResponse, error) {
	now := time.Now()
	clause, args := scopeSQL(ctx, user)

	weekRows := func(since time.Time) (map[int]int64, error) {
		query := fmt.Sprintf(`
			SELECT EXTRACT(DOW FROM created_at)::int AS dow, COUNT(id) AS count
			FROM clientes
			WHERE created_at >= ?%s
			GROUP BY EXTRACT(DOW FROM created_at)
			ORDER BY EXTRACT(DOW FROM created_at) ASC`, clause)
		type row struct {
			Dow   int
			Count int64
		}
		var rows []row
		callArgs := append([]interface{}{since}, args...)
		if err := s.db.WithContext(ctx).Raw(query, callArgs...).Scan(&rows).Error; err != nil {
			return nil, err
		}
		m := make(map[int]int64, 7)
		for _, r := range rows {
			m[r.Dow] = r.Count
		}
		return m, nil
	}

	atual, err := weekRows(now.AddDate(0, 0, -7))
	if err != nil {
		return nil, err
	}
	anterior, err := weekRows(now.AddDate(0, 0, -14))
	if err != nil {
		return nil, err
	}

	var resp WeeklyResponse
	resp.Labels = diasSemanaPT
	var totalAtual, totalAnterior int64
	for i := 0; i < 7; i++ {
		resp.WeeklyData[i] = atual[i]
		resp.PreviousWeekData[i] = anterior[i]
		totalAtual += atual[i]
		totalAnterior += anterior[i]
	}
	resp.TotalWeek = totalAtual
	resp.WeeklyGrowth = growth(totalAtual, totalAnterior)
	return &resp, nil
}

// SystemStats implementa GET /api/dashboard/system-stats (sem filtro de role/tenant, por spec).
func (s *Service) SystemStats(ctx context.Context) (*SystemStatsResponse, error) {
	db := s.db.WithContext(ctx)
	var resp SystemStatsResponse
	resp.Timestamp = time.Now()
	ontem := time.Now().Add(-24 * time.Hour)

	if err := db.Model(&models.Cliente{}).Count(&resp.TotalRegistros).Error; err != nil {
		return nil, err
	}
	if err := db.Model(&models.User{}).Count(&resp.TotalUsuarios).Error; err != nil {
		return nil, err
	}
	if err := db.Model(&models.Cliente{}).Where("created_at >= ?", ontem).Count(&resp.AtividadeRecente).Error; err != nil {
		return nil, err
	}
	if err := db.Model(&models.User{}).Where("updated_at >= ?", ontem).Count(&resp.UsuariosRecentes).Error; err != nil {
		return nil, err
	}
	return &resp, nil
}

// ActivityMetrics implementa GET /api/dashboard/activity-metrics.
func (s *Service) ActivityMetrics(ctx context.Context) (*ActivityMetricsResponse, error) {
	db := s.db.WithContext(ctx)
	var resp ActivityMetricsResponse
	now := time.Now()
	ontem := now.Add(-24 * time.Hour)
	seteDias := now.AddDate(0, 0, -7)
	quatorzeDias := now.AddDate(0, 0, -14)
	trintaMin := now.Add(-30 * time.Minute)

	var semanaAnterior int64
	var totalClientes, totalUsuarios int64

	if err := db.Model(&models.Cliente{}).Where("created_at >= ?", ontem).Count(&resp.ClientesUltimas24h).Error; err != nil {
		return nil, err
	}
	if err := db.Model(&models.Cliente{}).Where("created_at >= ?", seteDias).Count(&resp.ClientesUltimos7d).Error; err != nil {
		return nil, err
	}
	if err := db.Model(&models.Cliente{}).Where("created_at >= ? AND created_at < ?", quatorzeDias, seteDias).
		Count(&semanaAnterior).Error; err != nil {
		return nil, err
	}
	resp.WeeklyGrowth = growth(resp.ClientesUltimos7d, semanaAnterior)

	if err := db.Model(&models.User{}).Where("updated_at >= ?", trintaMin).Count(&resp.OnlineUsers).Error; err != nil {
		return nil, err
	}

	if err := db.Model(&models.Cliente{}).Count(&totalClientes).Error; err != nil {
		return nil, err
	}
	if err := db.Model(&models.User{}).Count(&totalUsuarios).Error; err != nil {
		return nil, err
	}
	if totalUsuarios > 0 {
		resp.Efficiency = math.Round(float64(totalClientes) / float64(totalUsuarios) * 100)
	}
	return &resp, nil
}

// Notifications implementa GET /api/dashboard/notifications (notificações dinâmicas).
func (s *Service) Notifications(ctx context.Context, user *models.User) (*NotificationsResponse, error) {
	db := s.db.WithContext(ctx)
	now := time.Now()
	hoje := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	trintaDias := now.AddDate(0, 0, -30)

	var pendentes, novos, parados []models.Cliente
	if err := applyModelScope(db.Model(&models.Cliente{}), user).
		Where("status = ?", "aguardando_aprovacao").Order("created_at DESC").Limit(10).Find(&pendentes).Error; err != nil {
		return nil, err
	}
	if err := applyModelScope(db.Model(&models.Cliente{}), user).
		Where("created_at >= ?", hoje).Order("created_at DESC").Limit(10).Find(&novos).Error; err != nil {
		return nil, err
	}
	if err := applyModelScope(db.Model(&models.Cliente{}), user).
		Where("updated_at < ?", trintaDias).Order("updated_at ASC").Limit(5).Find(&parados).Error; err != nil {
		return nil, err
	}

	resp := &NotificationsResponse{}
	nomeOf := func(c models.Cliente) string {
		if c.Nome != nil {
			return *c.Nome
		}
		return "Cliente sem nome"
	}
	for _, c := range pendentes {
		resp.Notifications = append(resp.Notifications, Notification{
			Type: "warning", Title: "Aguardando aprovação",
			Message: fmt.Sprintf("%s está aguardando aprovação", nomeOf(c)),
			ClienteID: c.ID, CreatedAt: c.CreatedAt,
		})
	}
	for _, c := range novos {
		resp.Notifications = append(resp.Notifications, Notification{
			Type: "info", Title: "Novo cliente",
			Message: fmt.Sprintf("%s foi cadastrado hoje", nomeOf(c)),
			ClienteID: c.ID, CreatedAt: c.CreatedAt,
		})
	}
	for _, c := range parados {
		resp.Notifications = append(resp.Notifications, Notification{
			Type: "alert", Title: "Cliente parado",
			Message: fmt.Sprintf("%s sem atualização há mais de 30 dias", nomeOf(c)),
			ClienteID: c.ID, CreatedAt: c.UpdatedAt,
		})
	}
	resp.UnreadCount = len(resp.Notifications)
	return resp, nil
}

// AguardandoAprovacao implementa GET /api/dashboard/aguardando-aprovacao
// (path limpo — o Node tinha o path duplicado /dashboard/dashboard/... , gotcha §3).
func (s *Service) AguardandoAprovacao(ctx context.Context, user *models.User) ([]ClienteResumo, error) {
	var clientes []models.Cliente
	q := applyModelScope(s.db.WithContext(ctx).Model(&models.Cliente{}), user).
		Where("status ILIKE ? OR status ILIKE ? OR status ILIKE ? OR status = ?",
			"%aguardando%", "%pendente%", "%análise%", "aguardando_aprovação").
		Order("created_at DESC")
	if err := q.Find(&clientes).Error; err != nil {
		return nil, err
	}
	out := make([]ClienteResumo, 0, len(clientes))
	for _, c := range clientes {
		nome := ""
		if c.Nome != nil {
			nome = *c.Nome
		}
		out = append(out, ClienteResumo{ID: c.ID, Nome: nome, Status: c.Status, CreatedAt: c.CreatedAt, UpdatedAt: c.UpdatedAt})
	}
	return out, nil
}
