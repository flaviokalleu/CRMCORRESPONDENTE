// Package relatorios implementa o relatório analítico de clientes
// (HTML/PDF/JSON) em `/api/report/*`. Ver
// docs/migration/06-dashboards-vendas-config.md §"Relatórios / exportação".
//
// GOTCHA CORRIGIDO (§"Observações críticas"): no Node estas rotas eram
// PÚBLICAS (sem auth nenhuma) e vazavam CPF/renda/e-mail de todos os
// clientes de todos os tenants. Na migração, TODA rota deste pacote exige
// auth.Required() + middleware.ResolveTenant(db) — ver routes.go/wiring doc.
package relatorios

import (
	"sort"
	"strings"
	"time"

	"crmimob/internal/models"
)

// Analytics agrega todos os blocos computados a partir de []models.Cliente —
// espelha o objeto devolvido por `/api/report/relatorio/dados` no Node.
type Analytics struct {
	Geral         GeralAnalysis         `json:"geral"`
	MCMV          MCMVAnalysis          `json:"mcmv"`
	Perfil        PerfilAnalysis        `json:"perfil"`
	Tendencias    []TendenciaMensal     `json:"tendencias"`
	Documentos    DocumentosAnalysis    `json:"documentos"`
	FGTS          FGTSAnalysis          `json:"fgts"`
	Recomendacoes []string              `json:"recomendacoes"`
}

// GeralAnalysis é o bloco `geral`: totais, taxas e renda média (via ParseRenda,
// igual ao `parseFloat` do Node — ver models.Cliente.ParseRenda).
type GeralAnalysis struct {
	Total             int     `json:"total"`
	Aprovados         int     `json:"aprovados"`
	Reprovados        int     `json:"reprovados"`
	Pendentes         int     `json:"pendentes"`
	TaxaAprovacao     float64 `json:"taxaAprovacao"`
	TaxaReprovacao    float64 `json:"taxaReprovacao"`
	RendaMedia        float64 `json:"rendaMedia"`
	ClientesComRenda  int     `json:"clientesComRenda"`
}

// PerfilAnalysis é o bloco `perfil`: distribuições demográficas/profissionais.
type PerfilAnalysis struct {
	EstadoCivil     map[string]int `json:"estadoCivil"`
	Profissao       map[string]int `json:"profissao"`
	Naturalidade    map[string]int `json:"naturalidade"`
	RendaTipo       map[string]int `json:"rendaTipo"`
	FaixaEtaria     map[string]int `json:"faixaEtaria"`
	TempoEmprego    map[string]int `json:"tempoEmprego"`
}

// TendenciaMensal é um ponto da série de 12 meses (`tendencias`).
type TendenciaMensal struct {
	Mes   string `json:"mes"` // "YYYY-MM"
	Total int    `json:"total"`
}

// DocumentosAnalysis é o bloco `documentos`: percentuais de completude.
type DocumentosAnalysis struct {
	ComDocumentosPessoais   float64 `json:"comDocumentosPessoais"`
	ComExtratoBancario      float64 `json:"comExtratoBancario"`
	ComDocumentosDependente float64 `json:"comDocumentosDependente"`
	ComDocumentosConjuge    float64 `json:"comDocumentosConjuge"`
}

// FGTSAnalysis é o bloco `fgts` — elegibilidade aproximada a partir de
// `possui_carteira_mais_tres_anos` (tempo mínimo de FGTS ativo) e presença de
// `numero_pis` (conta FGTS vinculada). Assunção documentada: o spec não
// detalha a regra exata do Node (fonte não incluída no grounding); esta é uma
// aproximação razoável a partir dos campos disponíveis no model Cliente.
type FGTSAnalysis struct {
	ComPIS               int `json:"comPis"`
	ComCarteiraMaisTres  int `json:"comCarteiraMaisTresAnos"`
	ElegiveisFGTS        int `json:"elegiveisFgts"`
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

// Build computa todos os blocos de Analytics a partir da lista de clientes já
// filtrada por tenant (ver repository.go).
func Build(clientes []models.Cliente) Analytics {
	a := Analytics{
		Perfil: PerfilAnalysis{
			EstadoCivil: map[string]int{}, Profissao: map[string]int{}, Naturalidade: map[string]int{},
			RendaTipo: map[string]int{}, FaixaEtaria: map[string]int{}, TempoEmprego: map[string]int{},
		},
		MCMV: MCMVAnalysis{PorFaixa: map[string]int{}},
	}

	a.Geral.Total = len(clientes)
	var somaRenda float64
	tendMap := map[string]int{}
	now := time.Now()

	for _, c := range clientes {
		switch statusBucket(c.Status) {
		case "aprovado":
			a.Geral.Aprovados++
		case "reprovado":
			a.Geral.Reprovados++
		default:
			a.Geral.Pendentes++
		}

		if c.ValorRenda != nil && strings.TrimSpace(*c.ValorRenda) != "" && *c.ValorRenda != "0" {
			if renda, err := models.ParseRenda(*c.ValorRenda); err == nil && renda > 0 {
				somaRenda += renda
				a.Geral.ClientesComRenda++
				faixa := FaixaMCMV(renda)
				a.MCMV.PorFaixa[faixa]++
				if ElegivelMCMV(renda) {
					a.MCMV.TotalElegiveis++
				}
			}
		}

		if c.EstadoCivil != nil && *c.EstadoCivil != "" {
			a.Perfil.EstadoCivil[*c.EstadoCivil]++
		}
		if c.Profissao != nil && *c.Profissao != "" {
			a.Perfil.Profissao[*c.Profissao]++
		}
		if c.Naturalidade != nil && *c.Naturalidade != "" {
			a.Perfil.Naturalidade[*c.Naturalidade]++
		}
		if c.RendaTipo != nil && *c.RendaTipo != "" {
			a.Perfil.RendaTipo[*c.RendaTipo]++
		}
		if faixa := faixaEtaria(c.DataNascimento, now); faixa != "" {
			a.Perfil.FaixaEtaria[faixa]++
		}
		if faixa := faixaTempoEmprego(c.DataAdmissao, now); faixa != "" {
			a.Perfil.TempoEmprego[faixa]++
		}

		if nonEmpty(c.DocumentosPessoais) {
			a.Documentos.ComDocumentosPessoais++
		}
		if nonEmpty(c.ExtratoBancario) {
			a.Documentos.ComExtratoBancario++
		}
		if nonEmpty(c.DocumentosDependente) {
			a.Documentos.ComDocumentosDependente++
		}
		if nonEmpty(c.DocumentosConjuge) {
			a.Documentos.ComDocumentosConjuge++
		}

		if c.NumeroPis != nil && strings.TrimSpace(*c.NumeroPis) != "" {
			a.FGTS.ComPIS++
		}
		if c.PossuiCarteiraMaisTresAnos != nil && *c.PossuiCarteiraMaisTresAnos {
			a.FGTS.ComCarteiraMaisTres++
		}
		if c.NumeroPis != nil && strings.TrimSpace(*c.NumeroPis) != "" &&
			c.PossuiCarteiraMaisTresAnos != nil && *c.PossuiCarteiraMaisTresAnos {
			a.FGTS.ElegiveisFGTS++
		}

		mesKey := c.CreatedAt.Format("2006-01")
		tendMap[mesKey]++
	}

	if a.Geral.ClientesComRenda > 0 {
		a.Geral.RendaMedia = round2(somaRenda / float64(a.Geral.ClientesComRenda))
	}
	if a.Geral.Total > 0 {
		a.Geral.TaxaAprovacao = round2(float64(a.Geral.Aprovados) / float64(a.Geral.Total) * 100)
		a.Geral.TaxaReprovacao = round2(float64(a.Geral.Reprovados) / float64(a.Geral.Total) * 100)
	}

	// Documentos como percentual (mantendo contagem acumulada acima, convertida aqui).
	if a.Geral.Total > 0 {
		total := float64(a.Geral.Total)
		a.Documentos.ComDocumentosPessoais = round2(a.Documentos.ComDocumentosPessoais / total * 100)
		a.Documentos.ComExtratoBancario = round2(a.Documentos.ComExtratoBancario / total * 100)
		a.Documentos.ComDocumentosDependente = round2(a.Documentos.ComDocumentosDependente / total * 100)
		a.Documentos.ComDocumentosConjuge = round2(a.Documentos.ComDocumentosConjuge / total * 100)
	}

	// Tendências: últimos 12 meses, ordenados cronologicamente (meses sem
	// clientes aparecem com total=0, igual ao array fixo do Node).
	for i := 11; i >= 0; i-- {
		mes := now.AddDate(0, -i, 0)
		key := mes.Format("2006-01")
		a.Tendencias = append(a.Tendencias, TendenciaMensal{Mes: key, Total: tendMap[key]})
	}

	a.Recomendacoes = Recomendacoes(a)
	return a
}

func nonEmpty(s *string) bool {
	return s != nil && strings.TrimSpace(*s) != ""
}

func round2(v float64) float64 {
	return float64(int64(v*100+0.5)) / 100
}

// faixaEtaria calcula a idade a partir de data_nascimento (VARCHAR "YYYY-MM-DD")
// e classifica em faixas de 10 anos.
func faixaEtaria(dataNascimento *string, now time.Time) string {
	if dataNascimento == nil || *dataNascimento == "" {
		return ""
	}
	d, err := time.Parse("2006-01-02", *dataNascimento)
	if err != nil {
		return ""
	}
	idade := now.Year() - d.Year()
	if now.YearDay() < d.YearDay() {
		idade--
	}
	switch {
	case idade < 18:
		return "menor_18"
	case idade < 25:
		return "18_24"
	case idade < 35:
		return "25_34"
	case idade < 45:
		return "35_44"
	case idade < 55:
		return "45_54"
	case idade < 65:
		return "55_64"
	default:
		return "65_mais"
	}
}

// faixaTempoEmprego calcula o tempo de emprego a partir de data_admissao.
func faixaTempoEmprego(dataAdmissao *string, now time.Time) string {
	if dataAdmissao == nil || *dataAdmissao == "" {
		return ""
	}
	d, err := time.Parse("2006-01-02", *dataAdmissao)
	if err != nil {
		return ""
	}
	anos := now.Sub(d).Hours() / (24 * 365)
	switch {
	case anos < 1:
		return "menos_1_ano"
	case anos < 3:
		return "1_3_anos"
	case anos < 5:
		return "3_5_anos"
	case anos < 10:
		return "5_10_anos"
	default:
		return "mais_10_anos"
	}
}

// sortedKeys é um helper usado pela renderização HTML para ordem estável dos
// mapas de distribuição (Go não garante ordem de iteração de map).
func sortedKeys(m map[string]int) []string {
	keys := make([]string, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	return keys
}
