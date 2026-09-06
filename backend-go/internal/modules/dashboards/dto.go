// Package dashboards implementa o cluster de dashboards (`/api/dashboard/*`).
//
// Correção deliberada de segurança (spec §"Observações críticas"): no Node,
// dashboards NÃO filtravam por tenant_id (só por user_id para corretor puro).
// Aqui toda query passa por db.WithContext(ctx) e os callbacks de
// internal/tenant injetam tenant_id automaticamente nas queries baseadas em
// Model; as agregações via db.Raw incluem o filtro manualmente (Raw não passa
// pelo Schema resolvido, logo os callbacks não se aplicam — ver service.go).
package dashboards

import "time"

// UserPermissions replica o objeto `userPermissions` da resposta Node.
type UserPermissions struct {
	CanViewAll       bool `json:"canViewAll"`
	IsCorretor       bool `json:"isCorretor"`
	IsAdministrador  bool `json:"isAdministrador"`
	IsCorrespondente bool `json:"isCorrespondente"`
}

// TopUsuario é um item do ranking Top5Usuarios.
type TopUsuario struct {
	User     TopUsuarioUser `json:"user"`
	Clientes int64          `json:"clientes"`
}

type TopUsuarioUser struct {
	ID        uint   `json:"id"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	Email     string `json:"email"`
}

// Performance replica o bloco `performance` da resposta principal.
type Performance struct {
	EficienciaMedia float64 `json:"eficienciaMedia"`
	TaxaAprovacao   float64 `json:"taxaAprovacao"`
	TaxaRejeicao    float64 `json:"taxaRejeicao"`
	TaxaResolucao   float64 `json:"taxaResolucao"`
	TotalUsuarios   int64   `json:"totalUsuarios"`
}

// RendaAnalysis replica o bloco `rendaAnalysis` (agregação CAST de valor_renda).
type RendaAnalysis struct {
	RendaMedia       float64 `json:"rendaMedia"`
	RendaMaxima      float64 `json:"rendaMaxima"`
	RendaMinima      float64 `json:"rendaMinima"`
	ClientesComRenda int64   `json:"clientesComRenda"`
}

// ClienteResumo é o subconjunto de colunas usado em listas do dashboard
// (aguardando-aprovação, notificações etc.).
type ClienteResumo struct {
	ID              uint      `json:"id"`
	Nome            string    `json:"nome"`
	Status          string    `json:"status"`
	ResponsavelID   *uint     `json:"responsavel_id,omitempty"`
	ResponsavelNome string    `json:"responsavel_nome,omitempty"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at,omitempty"`
}

// MainDashboardResponse é o payload de GET /api/dashboard/.
type MainDashboardResponse struct {
	TotalCorretores                  int64           `json:"totalCorretores"`
	TotalClientes                    int64           `json:"totalClientes"`
	TotalCount                       int64           `json:"totalCount"`
	TotalCorrespondentes             int64           `json:"totalCorrespondentes"`
	TotalClientesAguardandoAprovacao int64           `json:"totalClientesAguardandoAprovacao"`
	ClientesAguardandoAprovacao      []ClienteResumo `json:"clientesAguardandoAprovacao"`
	UserPermissions                  UserPermissions `json:"userPermissions"`
	ClientesAprovados                int64           `json:"clientesAprovados"`
	ClientesReprovados               int64           `json:"clientesReprovados"`
	ClientesPendentes                int64           `json:"clientesPendentes"`
	ClientesEsteMes                  int64           `json:"clientesEsteMes"`
	ClientesMesAnterior              int64           `json:"clientesMesAnterior"`
	CrescimentoSemanal               float64         `json:"crescimentoSemanal"`
	CrescimentoMensal                float64         `json:"crescimentoMensal"`
	UsuariosAtivosHoje               int64           `json:"usuariosAtivosHoje"`
	ClientesHoje                     int64           `json:"clientesHoje"`
	ClientesSemana                   int64           `json:"clientesSemana"`
	Top5Usuarios                     []TopUsuario    `json:"top5Usuarios"`
	Performance                      Performance     `json:"performance"`
	RendaAnalysis                    RendaAnalysis   `json:"rendaAnalysis"`
}

// MonthlyResponse é o payload de GET /api/dashboard/monthly.
type MonthlyResponse struct {
	MonthlyData   [12]int64   `json:"monthlyData"`
	MonthlyGrowth [12]float64 `json:"monthlyGrowth"`
	TotalYear     int64       `json:"totalYear"`
	AverageMonth  float64     `json:"averageMonth"`
	Labels        [12]string  `json:"labels"`
}

// WeeklyResponse é o payload de GET /api/dashboard/weekly.
type WeeklyResponse struct {
	WeeklyData       [7]int64  `json:"weeklyData"`
	PreviousWeekData [7]int64  `json:"previousWeekData"`
	TotalWeek        int64     `json:"totalWeek"`
	WeeklyGrowth     float64   `json:"weeklyGrowth"`
	Labels           [7]string `json:"labels"`
}

// SystemStatsResponse é o payload de GET /api/dashboard/system-stats.
type SystemStatsResponse struct {
	TotalRegistros   int64     `json:"totalRegistros"`
	TotalUsuarios    int64     `json:"totalUsuarios"`
	AtividadeRecente int64     `json:"atividadeRecente"`
	UsuariosRecentes int64     `json:"usuariosRecentes"`
	Timestamp        time.Time `json:"timestamp"`
}

// ActivityMetricsResponse é o payload de GET /api/dashboard/activity-metrics.
type ActivityMetricsResponse struct {
	ClientesUltimas24h int64   `json:"clientesUltimas24h"`
	ClientesUltimos7d  int64   `json:"clientesUltimos7d"`
	WeeklyGrowth       float64 `json:"weeklyGrowth"`
	OnlineUsers        int64   `json:"onlineUsers"`
	Efficiency         float64 `json:"efficiency"`
}

// Notification é um item dinâmico de GET /api/dashboard/notifications.
type Notification struct {
	Type            string    `json:"type"` // warning|info|alert
	Title           string    `json:"title"`
	Message         string    `json:"message"`
	ClienteID       uint      `json:"cliente_id,omitempty"`
	ClienteNome     string    `json:"cliente_nome,omitempty"`
	Status          string    `json:"status,omitempty"`
	ResponsavelID   *uint     `json:"responsavel_id,omitempty"`
	ResponsavelNome string    `json:"responsavel_nome,omitempty"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at,omitempty"`
}

// NotificationsResponse é o payload de GET /api/dashboard/notifications.
type NotificationsResponse struct {
	Notifications []Notification `json:"notifications"`
	ActiveCount   int            `json:"activeCount"`
}

// AnalyticsQuery representa o recorte global aplicado aos gráficos do painel.
// Fim é exclusivo para evitar ambiguidades de horário no último dia.
type AnalyticsQuery struct {
	Periodo       string
	Inicio        time.Time
	Fim           time.Time
	ResponsavelID *uint
}

// AnalyticsResponse reúne comparação temporal, desfechos e ranking sob o
// mesmo recorte. Taxas ponteiro viram null quando não existe base válida.
type AnalyticsResponse struct {
	Periodo            string       `json:"periodo"`
	Inicio             string       `json:"inicio"`
	Fim                string       `json:"fim"`
	Labels             []string     `json:"labels"`
	CurrentData        []int64      `json:"currentData"`
	PreviousData       []int64      `json:"previousData"`
	TotalCurrent       int64        `json:"totalCurrent"`
	TotalPrevious      int64        `json:"totalPrevious"`
	Growth             *float64     `json:"growth"`
	ClientesAprovados  int64        `json:"clientesAprovados"`
	ClientesReprovados int64        `json:"clientesReprovados"`
	ClientesPendentes  int64        `json:"clientesPendentes"`
	TaxaAprovacao      *float64     `json:"taxaAprovacao"`
	TaxaRejeicao       *float64     `json:"taxaRejeicao"`
	TaxaResolucao      *float64     `json:"taxaResolucao"`
	TopUsuarios        []TopUsuario `json:"topUsuarios"`
}

// mesesPT são os rótulos de mês em português (índice 0 = Janeiro).
var mesesPT = [12]string{"Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"}

// diasSemanaPT são os rótulos de dia da semana (índice 0 = Domingo, igual ao EXTRACT(DOW) do Postgres).
var diasSemanaPT = [7]string{"Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"}
