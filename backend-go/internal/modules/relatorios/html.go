package relatorios

import (
	"html/template"
	"strings"
	"time"
)

const reportTemplate = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>Relatório de Clientes — CRM IMOB</title>
<style>
  body { font-family: Arial, Helvetica, sans-serif; color: #0B1426; margin: 24px; }
  h1 { color: #0B1426; } h2 { color: #162a4a; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
  table { border-collapse: collapse; width: 100%; margin-bottom: 16px; }
  th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; font-size: 13px; }
  th { background: #0B1426; color: #fff; }
  .kpi { display: inline-block; margin-right: 24px; }
  .kpi b { font-size: 20px; display:block; }
  ul { font-size: 13px; }
</style>
</head>
<body>
  <h1>Relatório Analítico de Clientes</h1>
  <p>Gerado em {{.GeradoEm}}</p>

  <h2>Visão Geral</h2>
  <div>
    <div class="kpi"><b>{{.A.Geral.Total}}</b>Total de clientes</div>
    <div class="kpi"><b>{{.A.Geral.Aprovados}}</b>Aprovados</div>
    <div class="kpi"><b>{{.A.Geral.Reprovados}}</b>Reprovados</div>
    <div class="kpi"><b>{{.A.Geral.Pendentes}}</b>Pendentes</div>
    <div class="kpi"><b>{{printf "%.1f" .A.Geral.TaxaAprovacao}}%</b>Taxa de aprovação</div>
    <div class="kpi"><b>R$ {{printf "%.2f" .A.Geral.RendaMedia}}</b>Renda média ({{.A.Geral.ClientesComRenda}} com renda informada)</div>
  </div>

  <h2>Minha Casa Minha Vida (MCMV)</h2>
  <p>Clientes elegíveis: {{.A.MCMV.TotalElegiveis}}</p>
  <table><tr><th>Faixa</th><th>Clientes</th></tr>
  {{range $k, $v := .A.MCMV.PorFaixa}}<tr><td>{{$k}}</td><td>{{$v}}</td></tr>{{end}}
  </table>

  <h2>Documentação</h2>
  <table><tr><th>Documento</th><th>% completo</th></tr>
    <tr><td>Documentos pessoais</td><td>{{printf "%.1f" .A.Documentos.ComDocumentosPessoais}}%</td></tr>
    <tr><td>Extrato bancário</td><td>{{printf "%.1f" .A.Documentos.ComExtratoBancario}}%</td></tr>
    <tr><td>Documentos dependente</td><td>{{printf "%.1f" .A.Documentos.ComDocumentosDependente}}%</td></tr>
    <tr><td>Documentos cônjuge</td><td>{{printf "%.1f" .A.Documentos.ComDocumentosConjuge}}%</td></tr>
  </table>

  <h2>Tendência (últimos 12 meses)</h2>
  <table><tr><th>Mês</th><th>Cadastros</th></tr>
  {{range .A.Tendencias}}<tr><td>{{.Mes}}</td><td>{{.Total}}</td></tr>{{end}}
  </table>

  <h2>Recomendações</h2>
  <ul>{{range .A.Recomendacoes}}<li>{{.}}</li>{{end}}</ul>
</body>
</html>`

var parsedReportTemplate = template.Must(template.New("relatorio").Parse(reportTemplate))

// RenderHTML monta o relatório HTML completo a partir das análises
// computadas. Devolve string vazia + false quando não há clientes (o Node
// devolvia 404 HTML nesse caso).
func RenderHTML(a Analytics) (string, bool) {
	if a.Geral.Total == 0 {
		return emptyReportHTML(), false
	}
	var sb strings.Builder
	_ = parsedReportTemplate.Execute(&sb, struct {
		A        Analytics
		GeradoEm string
	}{A: a, GeradoEm: time.Now().Format("02/01/2006 15:04")})
	return sb.String(), true
}

func emptyReportHTML() string {
	return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Relatório de Clientes</title></head>
<body><h1>Relatório de Clientes</h1><p>Nenhum cliente cadastrado para gerar o relatório.</p></body></html>`
}
