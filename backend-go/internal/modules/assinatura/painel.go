package assinatura

import (
	"net/http"
	"sort"
	"strings"
	"time"

	"github.com/gin-gonic/gin"

	"crmimob/internal/models"
	"crmimob/internal/tenant"
)

// EscopoGlobal tira o escopo de empresa do contexto: no painel master o
// superadmin atua em TODAS as empresas, não na própria (tenant 1).
func EscopoGlobal() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Request = c.Request.WithContext(tenant.With(c.Request.Context(), tenant.Scope{IsSuperAdmin: true}))
		c.Next()
	}
}

type linhaEmpresa struct {
	ID          uint       `json:"id"`
	Nome        string     `json:"nome"`
	Email       string     `json:"email"`
	Plano       string     `json:"plano"`
	PlanID      uint       `json:"plan_id"`
	Mensalidade float64    `json:"mensalidade"`
	Situacao    string     `json:"situacao"`
	Liberado    bool       `json:"liberado"`
	PagoAte     *time.Time `json:"pago_ate,omitempty"`
	CriadaEm    time.Time  `json:"criada_em"`
	Plataforma  bool       `json:"plataforma"`
}

// RegisterPainel monta a lista de empresas com a situação de cada uma e os
// números do negócio, todos calculados pela mesma regra de acesso.
func (h *Handler) RegisterPainel(g *gin.RouterGroup) {
	g.GET("/assinaturas", h.painel)
}

func (h *Handler) painel(c *gin.Context) {
	ctx := c.Request.Context()
	var tenants []models.Tenant
	var subs []models.Subscription
	var planos []models.Plan
	if err := h.db.WithContext(ctx).Order("id").Find(&tenants).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Falha ao listar empresas"})
		return
	}
	h.db.WithContext(ctx).Find(&subs)
	h.db.WithContext(ctx).Find(&planos)
	subPor := map[uint]*models.Subscription{}
	for i := range subs {
		subPor[subs[i].TenantID] = &subs[i]
	}
	planoPor := map[uint]*models.Plan{}
	for i := range planos {
		planoPor[planos[i].ID] = &planos[i]
	}

	busca := strings.ToLower(strings.TrimSpace(c.Query("busca")))
	filtro := c.Query("situacao")
	agora := time.Now()

	var linhas []linhaEmpresa
	var mrr float64
	contagem := map[string]int{}
	for i := range tenants {
		t := &tenants[i]
		sub := subPor[t.ID]
		l := linhaEmpresa{ID: t.ID, Nome: t.Nome, Email: t.Email, CriadaEm: t.CreatedAt, Plataforma: t.ID == h.svc.PlataformaTenantID}
		var a Acesso
		if l.Plataforma {
			a = Acesso{Liberado: true, Situacao: SituacaoEmDia}
		} else {
			a = CalcularAcesso(t, sub, agora)
		}
		l.Situacao, l.Liberado, l.PagoAte = a.Situacao, a.Liberado, a.PagoAte
		if sub != nil {
			if p := planoPor[sub.PlanID]; p != nil {
				l.Plano, l.PlanID = p.Nome, p.ID
				l.Mensalidade = ValorDaMensalidade(sub, p, sub.Ciclo)
				if sub.Ciclo == "anual" {
					l.Mensalidade = l.Mensalidade / 12
				}
			}
		}
		if !l.Plataforma {
			contagem[l.Situacao]++
			// Receita recorrente: só quem já paga (em dia ou na tolerância).
			if l.Situacao == SituacaoEmDia || l.Situacao == SituacaoAtrasada {
				if sub != nil && sub.UltimoPagamentoEm != nil {
					mrr += l.Mensalidade
				}
			}
		}
		if busca != "" && !strings.Contains(strings.ToLower(t.Nome+" "+t.Email), busca) {
			continue
		}
		if filtro != "" && l.Situacao != filtro {
			continue
		}
		linhas = append(linhas, l)
	}
	// Quem pede atenção primeiro: bloqueadas e atrasadas, depois teste, depois em dia.
	peso := map[string]int{SituacaoAtrasada: 0, SituacaoTesteAcabou: 1, SituacaoBloqueada: 1, SituacaoTeste: 2, SituacaoEmDia: 3}
	sort.SliceStable(linhas, func(i, j int) bool {
		pi, ok := peso[linhas[i].Situacao]
		if !ok {
			pi = 4
		}
		pj, ok := peso[linhas[j].Situacao]
		if !ok {
			pj = 4
		}
		return pi < pj
	})

	inicioMes := time.Date(agora.Year(), agora.Month(), 1, 0, 0, 0, 0, fuso)
	var recebidoMes float64
	h.db.WithContext(ctx).Model(&models.FaturaAssinatura{}).
		Where("status = ? AND paga_em >= ?", models.FaturaPaga, inicioMes).
		Select("COALESCE(SUM(valor),0)").Scan(&recebidoMes)
	var emAberto float64
	h.db.WithContext(ctx).Model(&models.FaturaAssinatura{}).
		Where("status IN ?", []string{models.FaturaPendente, models.FaturaVencida}).
		Select("COALESCE(SUM(valor),0)").Scan(&emAberto)

	c.JSON(http.StatusOK, gin.H{
		"empresas": linhas,
		"metricas": gin.H{
			"mrr":           mrr,
			"recebido_mes":  recebidoMes,
			"em_aberto":     emAberto,
			"em_dia":        contagem[SituacaoEmDia],
			"atrasadas":     contagem[SituacaoAtrasada],
			"em_teste":      contagem[SituacaoTeste],
			"suspensas":     contagem[SituacaoBloqueada] + contagem[SituacaoTesteAcabou] + contagem[SituacaoBloqueioManual],
			"canceladas":    contagem[SituacaoCancelada],
		},
	})
}
