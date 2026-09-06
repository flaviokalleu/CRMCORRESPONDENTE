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
func scopeUserID(user *models.User, requested ...*uint) *uint {
	if user.IsCorretor && !user.IsAdministrador && !user.IsCorrespondente {
		id := user.ID
		return &id
	}
	if len(requested) > 0 {
		return requested[0]
	}
	return nil
}

// scopeSQL devolve a cláusula SQL adicional (" AND tenant_id = ? [AND user_id = ?]")
// e os args correspondentes, para uso em db.Raw — onde os callbacks de tenant
// NÃO se aplicam automaticamente. tenantID nil (super admin global) não filtra.
func scopeSQL(ctx context.Context, user *models.User, requested ...*uint) (string, []interface{}) {
	var clauses []string
	var args []interface{}

	if scope, ok := tenant.From(ctx); ok && scope.TenantID != nil {
		clauses = append(clauses, "tenant_id = ?")
		args = append(args, *scope.TenantID)
	}
	if uid := scopeUserID(user, requested...); uid != nil {
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
func scopeSQLQualified(ctx context.Context, user *models.User, alias string, requested ...*uint) (string, []interface{}) {
	var clauses []string
	var args []interface{}

	if scope, ok := tenant.From(ctx); ok && scope.TenantID != nil {
		clauses = append(clauses, alias+".tenant_id = ?")
		args = append(args, *scope.TenantID)
	}
	if uid := scopeUserID(user, requested...); uid != nil {
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
func applyModelScope(q *gorm.DB, user *models.User, requested ...*uint) *gorm.DB {
	if uid := scopeUserID(user, requested...); uid != nil {
		q = q.Where("user_id = ?", *uid)
	}
	return q
}

func round1(value float64) float64 {
	return math.Round(value*10) / 10
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

// MainDashboard mantém a assinatura histórica sem filtro.
func (s *Service) MainDashboard(ctx context.Context, user *models.User) (*MainDashboardResponse, error) {
	return s.MainDashboardFiltered(ctx, user, nil)
}

// MainDashboardFiltered implementa GET /api/dashboard/ com filtro opcional de
// responsável (com cache 5min por tenant+role+email+responsável).
func (s *Service) MainDashboardFiltered(ctx context.Context, user *models.User, responsavelID *uint) (*MainDashboardResponse, error) {
	scope, _ := tenant.From(ctx)
	effectiveResponsavel := scopeUserID(user, responsavelID)
	key := Key(scope.TenantID, user.Email, user.Role(), effectiveResponsavel)
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

	clientesQ := applyModelScope(db.Model(&models.Cliente{}), user, responsavelID)
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
	if err := applyModelScope(db.Model(&models.Cliente{}), user, responsavelID).
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
	aq := applyModelScope(db.Model(&models.Cliente{}), user, responsavelID).
		Where("(status ILIKE ? OR status ILIKE ? OR status ILIKE ? OR status ILIKE ? OR status = ?)",
			"%aguardando%", "%pendente%", "%análise%", "%em análise%", "aguardando_aprovacao").
		Preload("User").
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
		responsavelNome := ""
		if c.User != nil {
			responsavelNome = strings.TrimSpace(c.User.FirstName + " " + c.User.LastName)
		}
		resp.ClientesAguardandoAprovacao = append(resp.ClientesAguardandoAprovacao, ClienteResumo{
			ID: c.ID, Nome: nome, Status: c.Status, ResponsavelID: c.UserID,
			ResponsavelNome: responsavelNome, CreatedAt: c.CreatedAt, UpdatedAt: c.UpdatedAt,
		})
	}

	now := time.Now()
	inicioMes := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
	inicioMesAnterior := inicioMes.AddDate(0, -1, 0)
	fimMesAnterior := inicioMes

	if err := applyModelScope(db.Model(&models.Cliente{}), user, responsavelID).
		Where("created_at >= ?", inicioMes).Count(&resp.ClientesEsteMes).Error; err != nil {
		return nil, err
	}
	if err := applyModelScope(db.Model(&models.Cliente{}), user, responsavelID).
		Where("created_at >= ? AND created_at < ?", inicioMesAnterior, fimMesAnterior).
		Count(&resp.ClientesMesAnterior).Error; err != nil {
		return nil, err
	}
	resp.CrescimentoMensal = growth(resp.ClientesEsteMes, resp.ClientesMesAnterior)

	inicioSemana := now.AddDate(0, 0, -7)
	inicioSemanaAnterior := now.AddDate(0, 0, -14)
	var clientesSemanaAnterior int64
	if err := applyModelScope(db.Model(&models.Cliente{}), user, responsavelID).
		Where("created_at >= ?", inicioSemana).Count(&resp.ClientesSemana).Error; err != nil {
		return nil, err
	}
	if err := applyModelScope(db.Model(&models.Cliente{}), user, responsavelID).
		Where("created_at >= ? AND created_at < ?", inicioSemanaAnterior, inicioSemana).
		Count(&clientesSemanaAnterior).Error; err != nil {
		return nil, err
	}
	resp.CrescimentoSemanal = growth(resp.ClientesSemana, clientesSemanaAnterior)

	inicioHoje := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	if err := applyModelScope(db.Model(&models.Cliente{}), user, responsavelID).
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
		clause, args := scopeSQLQualified(ctx, user, "c", responsavelID)
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
				User:     TopUsuarioUser{ID: r.UserID, FirstName: r.FirstName, LastName: r.LastName, Email: r.Email},
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
	decisoes := resp.ClientesAprovados + resp.ClientesReprovados
	if decisoes > 0 {
		resp.Performance.TaxaAprovacao = round1(float64(resp.ClientesAprovados) / float64(decisoes) * 100)
		resp.Performance.TaxaRejeicao = round1(float64(resp.ClientesReprovados) / float64(decisoes) * 100)
	}
	if totalStatus > 0 {
		resp.Performance.TaxaResolucao = round1(float64(decisoes) / float64(totalStatus) * 100)
	}
	if totalUsuarios > 0 {
		resp.Performance.EficienciaMedia = math.Round(float64(resp.TotalClientes) / float64(totalUsuarios) * 100)
	}

	// Análise de renda — GOTCHA CENTRAL: valor_renda é VARCHAR (§ gotcha 1).
	renda, err := s.rendaAnalysis(ctx, user, responsavelID)
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
// O WHERE exclui NULL, ” e '0' (spec §"Análise de renda").
func (s *Service) rendaAnalysis(ctx context.Context, user *models.User, responsavelID ...*uint) (*RendaAnalysis, error) {
	clause, args := scopeSQL(ctx, user, responsavelID...)
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
	for i := 0; i < 12; i++ {
		mes := inicio.AddDate(0, i, 0)
		resp.Labels[i] = mesesPT[int(mes.Month())-1]
	}
	for _, r := range rows {
		if r.Month < 1 || r.Month > 12 {
			continue
		}
		// O índice é relativo ao início da janela, não ao número absoluto do
		// mês. Assim Set/Out/Nov/Dez do ano anterior aparecem antes de Jan.
		indice := (r.Year-inicio.Year())*12 + (r.Month - int(inicio.Month()))
		if indice < 0 || indice >= len(resp.MonthlyData) {
			continue
		}
		resp.MonthlyData[indice] += r.Count
		resp.TotalYear += r.Count
	}
	for i := 1; i < 12; i++ {
		resp.MonthlyGrowth[i] = growth(resp.MonthlyData[i], resp.MonthlyData[i-1])
	}
	resp.AverageMonth = math.Round(float64(resp.TotalYear)/12*100) / 100
	return &resp, nil
}

// Weekly implementa GET /api/dashboard/weekly (semana atual vs. anterior via EXTRACT(DOW)).
func (s *Service) Weekly(ctx context.Context, user *models.User) (*WeeklyResponse, error) {
	now := time.Now()
	clause, args := scopeSQL(ctx, user)

	weekRows := func(inicio, fim time.Time) (map[int]int64, error) {
		query := fmt.Sprintf(`
			SELECT EXTRACT(DOW FROM created_at)::int AS dow, COUNT(id) AS count
			FROM clientes
			WHERE created_at >= ? AND created_at < ?%s
			GROUP BY EXTRACT(DOW FROM created_at)
			ORDER BY EXTRACT(DOW FROM created_at) ASC`, clause)
		type row struct {
			Dow   int
			Count int64
		}
		var rows []row
		callArgs := append([]interface{}{inicio, fim}, args...)
		if err := s.db.WithContext(ctx).Raw(query, callArgs...).Scan(&rows).Error; err != nil {
			return nil, err
		}
		m := make(map[int]int64, 7)
		for _, r := range rows {
			m[r.Dow] = r.Count
		}
		return m, nil
	}

	inicioAtual := now.AddDate(0, 0, -7)
	inicioAnterior := now.AddDate(0, 0, -14)
	atual, err := weekRows(inicioAtual, now)
	if err != nil {
		return nil, err
	}
	anterior, err := weekRows(inicioAnterior, inicioAtual)
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

// Analytics monta todos os gráficos temporais sob um único recorte. A janela
// anterior tem exatamente a mesma duração da atual, o que torna a comparação
// justa inclusive para períodos personalizados.
func (s *Service) Analytics(ctx context.Context, user *models.User, query AnalyticsQuery) (*AnalyticsResponse, error) {
	if query.Fim.Before(query.Inicio) || query.Fim.Equal(query.Inicio) {
		return nil, fmt.Errorf("período inválido")
	}

	duracao := query.Fim.Sub(query.Inicio)
	inicioAnterior := query.Inicio.Add(-duracao)
	type clienteLinha struct {
		Status    string
		CreatedAt time.Time
	}
	var linhas []clienteLinha
	if err := applyModelScope(s.db.WithContext(ctx).Model(&models.Cliente{}), user, query.ResponsavelID).
		Select("status", "created_at").
		Where("created_at >= ? AND created_at < ?", inicioAnterior, query.Fim).
		Order("created_at ASC").Scan(&linhas).Error; err != nil {
		return nil, err
	}

	quantidadeBuckets := analyticsBucketCount(duracao)
	resp := &AnalyticsResponse{
		Periodo:      query.Periodo,
		Inicio:       query.Inicio.Format("2006-01-02"),
		Fim:          query.Fim.Add(-time.Nanosecond).Format("2006-01-02"),
		Labels:       make([]string, quantidadeBuckets),
		CurrentData:  make([]int64, quantidadeBuckets),
		PreviousData: make([]int64, quantidadeBuckets),
		TopUsuarios:  make([]TopUsuario, 0),
	}
	for i := 0; i < quantidadeBuckets; i++ {
		instante := query.Inicio.Add(time.Duration(float64(duracao) * float64(i) / float64(quantidadeBuckets)))
		resp.Labels[i] = analyticsBucketLabel(instante, duracao)
	}

	for _, linha := range linhas {
		if !linha.CreatedAt.Before(query.Inicio) {
			indice := analyticsBucketIndex(linha.CreatedAt, query.Inicio, duracao, quantidadeBuckets)
			if indice >= 0 && indice < quantidadeBuckets {
				resp.CurrentData[indice]++
				resp.TotalCurrent++
				switch statusBucket(linha.Status) {
				case "aprovado":
					resp.ClientesAprovados++
				case "reprovado":
					resp.ClientesReprovados++
				default:
					resp.ClientesPendentes++
				}
			}
			continue
		}
		indice := analyticsBucketIndex(linha.CreatedAt, inicioAnterior, duracao, quantidadeBuckets)
		if indice >= 0 && indice < quantidadeBuckets {
			resp.PreviousData[indice]++
			resp.TotalPrevious++
		}
	}

	if resp.TotalPrevious > 0 || resp.TotalCurrent > 0 {
		valor := growth(resp.TotalCurrent, resp.TotalPrevious)
		resp.Growth = &valor
	}
	decisoes := resp.ClientesAprovados + resp.ClientesReprovados
	if decisoes > 0 {
		aprovacao := round1(float64(resp.ClientesAprovados) / float64(decisoes) * 100)
		rejeicao := round1(float64(resp.ClientesReprovados) / float64(decisoes) * 100)
		resp.TaxaAprovacao = &aprovacao
		resp.TaxaRejeicao = &rejeicao
	}
	if resp.TotalCurrent > 0 {
		resolucao := round1(float64(decisoes) / float64(resp.TotalCurrent) * 100)
		resp.TaxaResolucao = &resolucao
	}

	if !(user.IsCorretor && !user.IsAdministrador && !user.IsCorrespondente) {
		type topRow struct {
			UserID    uint
			FirstName string
			LastName  string
			Email     string
			Clientes  int64
		}
		var topRows []topRow
		clause, args := scopeSQLQualified(ctx, user, "c", query.ResponsavelID)
		sql := fmt.Sprintf(`
			SELECT c.user_id AS user_id, u.first_name AS first_name, u.last_name AS last_name,
			       u.email AS email, COUNT(c.id) AS clientes
			FROM clientes c
			JOIN users u ON u.id = c.user_id
			WHERE c.user_id IS NOT NULL AND c.created_at >= ? AND c.created_at < ?%s
			GROUP BY c.user_id, u.first_name, u.last_name, u.email
			ORDER BY COUNT(c.id) DESC, u.first_name ASC
			LIMIT 5`, clause)
		callArgs := append([]interface{}{query.Inicio, query.Fim}, args...)
		if err := s.db.WithContext(ctx).Raw(sql, callArgs...).Scan(&topRows).Error; err != nil {
			return nil, err
		}
		for _, linha := range topRows {
			resp.TopUsuarios = append(resp.TopUsuarios, TopUsuario{
				User:     TopUsuarioUser{ID: linha.UserID, FirstName: linha.FirstName, LastName: linha.LastName, Email: linha.Email},
				Clientes: linha.Clientes,
			})
		}
	}

	return resp, nil
}

func analyticsBucketCount(duracao time.Duration) int {
	dias := duracao.Hours() / 24
	switch {
	case dias <= 1.5:
		return 8
	case dias <= 16:
		return max(1, int(math.Ceil(dias)))
	case dias <= 100:
		return min(12, max(2, int(math.Ceil(dias/7))))
	default:
		return min(12, max(2, int(math.Ceil(dias/30.4375))))
	}
}

func analyticsBucketIndex(instante, inicio time.Time, duracao time.Duration, quantidade int) int {
	if instante.Before(inicio) || !instante.Before(inicio.Add(duracao)) {
		return -1
	}
	indice := int((instante.Sub(inicio).Seconds() / duracao.Seconds()) * float64(quantidade))
	if indice == quantidade {
		return quantidade - 1
	}
	return indice
}

func analyticsBucketLabel(instante time.Time, duracao time.Duration) string {
	dias := duracao.Hours() / 24
	switch {
	case dias <= 1.5:
		return instante.Format("15h")
	case dias <= 16:
		return instante.Format("02/01")
	case dias <= 100:
		return instante.Format("02/01")
	default:
		return mesesPT[int(instante.Month())-1] + "/" + instante.Format("06")
	}
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

// Notifications mantém a assinatura histórica sem filtro.
func (s *Service) Notifications(ctx context.Context, user *models.User) (*NotificationsResponse, error) {
	return s.NotificationsFiltered(ctx, user, nil)
}

// NotificationsFiltered implementa GET /api/dashboard/notifications. São
// situações calculadas em tempo real, não mensagens com estado de leitura.
func (s *Service) NotificationsFiltered(ctx context.Context, user *models.User, responsavelID *uint) (*NotificationsResponse, error) {
	db := s.db.WithContext(ctx)
	now := time.Now()
	hoje := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	trintaDias := now.AddDate(0, 0, -30)

	var pendentes, novos, parados []models.Cliente
	if err := applyModelScope(db.Model(&models.Cliente{}), user, responsavelID).
		Preload("User").
		Where("(status ILIKE ? OR status ILIKE ? OR status ILIKE ? OR status ILIKE ? OR status = ?)",
			"%aguardando%", "%pendente%", "%análise%", "%em análise%", "aguardando_aprovacao").
		Order("updated_at ASC").Limit(10).Find(&pendentes).Error; err != nil {
		return nil, err
	}
	if err := applyModelScope(db.Model(&models.Cliente{}), user, responsavelID).
		Preload("User").Where("created_at >= ?", hoje).Order("created_at DESC").Limit(10).Find(&novos).Error; err != nil {
		return nil, err
	}
	if err := applyModelScope(db.Model(&models.Cliente{}), user, responsavelID).
		Preload("User").Where("updated_at < ?", trintaDias).Order("updated_at ASC").Limit(5).Find(&parados).Error; err != nil {
		return nil, err
	}

	resp := &NotificationsResponse{}
	nomeOf := func(c models.Cliente) string {
		if c.Nome != nil {
			return *c.Nome
		}
		return "Cliente sem nome"
	}
	responsavelOf := func(c models.Cliente) string {
		if c.User == nil {
			return ""
		}
		return strings.TrimSpace(c.User.FirstName + " " + c.User.LastName)
	}
	for _, c := range pendentes {
		resp.Notifications = append(resp.Notifications, Notification{
			Type: "warning", Title: "Aguardando ação",
			Message: fmt.Sprintf("%s está na fila de análise", nomeOf(c)), ClienteID: c.ID,
			ClienteNome: nomeOf(c), Status: c.Status, ResponsavelID: c.UserID,
			ResponsavelNome: responsavelOf(c), CreatedAt: c.CreatedAt, UpdatedAt: c.UpdatedAt,
		})
	}
	for _, c := range novos {
		resp.Notifications = append(resp.Notifications, Notification{
			Type: "info", Title: "Novo cliente",
			Message: fmt.Sprintf("%s foi cadastrado hoje", nomeOf(c)), ClienteID: c.ID,
			ClienteNome: nomeOf(c), Status: c.Status, ResponsavelID: c.UserID,
			ResponsavelNome: responsavelOf(c), CreatedAt: c.CreatedAt, UpdatedAt: c.UpdatedAt,
		})
	}
	for _, c := range parados {
		resp.Notifications = append(resp.Notifications, Notification{
			Type: "alert", Title: "Cliente parado",
			Message: fmt.Sprintf("%s está sem atualização há mais de 30 dias", nomeOf(c)), ClienteID: c.ID,
			ClienteNome: nomeOf(c), Status: c.Status, ResponsavelID: c.UserID,
			ResponsavelNome: responsavelOf(c), CreatedAt: c.UpdatedAt, UpdatedAt: c.UpdatedAt,
		})
	}
	ativos := make(map[uint]struct{}, len(resp.Notifications))
	for _, notification := range resp.Notifications {
		if notification.ClienteID != 0 {
			ativos[notification.ClienteID] = struct{}{}
		}
	}
	resp.ActiveCount = len(ativos)
	return resp, nil
}

// AguardandoAprovacao implementa GET /api/dashboard/aguardando-aprovacao
// (path limpo — o Node tinha o path duplicado /dashboard/dashboard/... , gotcha §3).
func (s *Service) AguardandoAprovacao(ctx context.Context, user *models.User) ([]ClienteResumo, error) {
	var clientes []models.Cliente
	q := applyModelScope(s.db.WithContext(ctx).Model(&models.Cliente{}), user).
		Where("(status ILIKE ? OR status ILIKE ? OR status ILIKE ? OR status = ?)",
			"%aguardando%", "%pendente%", "%análise%", "aguardando_aprovacao").
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
