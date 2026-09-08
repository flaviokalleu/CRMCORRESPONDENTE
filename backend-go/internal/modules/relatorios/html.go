package relatorios

import (
	"html/template"
	"os"
	"strings"
	"time"
)

// O mesmo HTML serve duas saídas: a visualização em tela
// (GET /report/relatorio) e o PDF A4 (GET /report/relatorio/download, que passa
// por PDFRenderer). Por isso o CSS é todo embutido e não há fonte, folha nem
// imagem externa: o renderizador de PDF roda sem rede, e qualquer recurso
// remoto sairia faltando no arquivo gerado.
//
// As cores repetem os tokens do frontend (frontend-next/src/app/globals.css),
// que foram calibrados para contraste AA. Aqui não existe camada de tokens do
// Tailwind, então elas são declaradas uma única vez como variáveis CSS no
// topo — nenhum valor de cor aparece solto no corpo do documento.
const reportTemplate = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Relatório de clientes — {{.Marca}}</title>
<style>
  :root {
    --texto: #1f2a37;
    --suave: #5b6b7c;
    --borda: #dde3ea;
    --fundo: #f3f5f8;
    --papel: #ffffff;
    --azul: #005ca9;
    --azul-claro: #e8f1fa;
    --laranja: #b45309;
    --bom: #047857;
    --ruim: #b42318;
    --barra: 3px;
  }

  * { box-sizing: border-box; }

  body {
    font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: var(--texto);
    background: var(--fundo);
    margin: 0;
    padding: 24px;
    font-size: 13px;
    line-height: 1.5;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .folha { max-width: 960px; margin: 0 auto; }

  header {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 16px;
    padding-bottom: 16px;
    border-bottom: 2px solid var(--azul);
    margin-bottom: 20px;
  }
  header h1 { margin: 0; font-size: 22px; letter-spacing: -0.2px; }
  header p { margin: 2px 0 0; color: var(--suave); font-size: 12px; }
  .marca { font-size: 15px; font-weight: 700; color: var(--azul); text-align: right; }
  .marca span { display: block; font-size: 10px; font-weight: 500; color: var(--suave); letter-spacing: 0.08em; text-transform: uppercase; }

  /* Cartões de indicador: a leitura de relance do relatório. */
  .indicadores { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 22px; }
  .kpi {
    flex: 1 1 150px;
    background: var(--papel);
    border: 1px solid var(--borda);
    border-radius: 10px;
    padding: 12px 14px;
  }
  .kpi b { display: block; font-size: 22px; font-variant-numeric: tabular-nums; line-height: 1.2; }
  .kpi span { display: block; font-size: 11px; color: var(--suave); margin-top: 2px; }
  .kpi.bom b { color: var(--bom); }
  .kpi.ruim b { color: var(--ruim); }
  .kpi.destaque b { color: var(--azul); }

  section { margin-bottom: 20px; page-break-inside: avoid; }
  section > h2 {
    margin: 0 0 10px;
    font-size: 13px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--suave);
    font-weight: 700;
  }

  .cartao {
    background: var(--papel);
    border: 1px solid var(--borda);
    border-radius: 10px;
    padding: 14px 16px;
  }

  .colunas { display: flex; flex-wrap: wrap; gap: 14px; }
  .colunas > .cartao { flex: 1 1 300px; }

  table { border-collapse: collapse; width: 100%; font-size: 12px; }
  th, td { padding: 7px 8px; text-align: left; border-bottom: 1px solid var(--borda); }
  th {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--suave);
    font-weight: 700;
  }
  td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }
  tbody tr:last-child td { border-bottom: none; }

  /* Barra proporcional: o comprimento carrega a magnitude, sem depender de
     cor — funciona igual numa impressão em preto e branco. */
  .barra { background: var(--fundo); border-radius: 999px; height: var(--barra); overflow: hidden; }
  .barra > i { display: block; height: 100%; background: var(--azul); border-radius: 999px; }
  td.grafico { width: 45%; vertical-align: middle; }

  .recomendacoes { background: var(--azul-claro); border: 1px solid var(--borda); border-radius: 10px; padding: 14px 16px 14px 32px; margin: 0; }
  .recomendacoes li { margin-bottom: 4px; }
  .recomendacoes li:last-child { margin-bottom: 0; }

  footer { margin-top: 24px; padding-top: 12px; border-top: 1px solid var(--borda); color: var(--suave); font-size: 11px; text-align: center; }

  .vazio { color: var(--suave); font-style: italic; font-size: 12px; }

  @page { size: A4; margin: 14mm; }
  @media print {
    body { background: var(--papel); padding: 0; font-size: 11px; }
    .kpi, .cartao { break-inside: avoid; }
  }
</style>
</head>
<body>
<div class="folha">

  <header>
    <div>
      <h1>Relatório de clientes</h1>
      <p>Gerado em {{.GeradoEm}}</p>
    </div>
    <div class="marca">{{.Marca}}<span>Relatório analítico</span></div>
  </header>

  <div class="indicadores">
    <div class="kpi destaque"><b>{{.A.Geral.Total}}</b><span>Total de clientes</span></div>
    <div class="kpi bom"><b>{{.A.Geral.Aprovados}}</b><span>Aprovados</span></div>
    <div class="kpi"><b>{{.A.Geral.Pendentes}}</b><span>Pendentes</span></div>
    <div class="kpi ruim"><b>{{.A.Geral.Reprovados}}</b><span>Reprovados</span></div>
    <div class="kpi"><b>{{printf "%.1f" .A.Geral.TaxaAprovacao}}%</b><span>Taxa de aprovação</span></div>
    <div class="kpi"><b>R$ {{printf "%.2f" .A.Geral.RendaMedia}}</b><span>Renda média · {{.A.Geral.ClientesComRenda}} com renda</span></div>
  </div>

  <section>
    <h2>Evolução dos cadastros</h2>
    <div class="cartao">
      <table>
        <thead><tr><th>Mês</th><th class="grafico"></th><th class="num">Cadastros</th></tr></thead>
        <tbody>
        {{range .Tendencias}}
          <tr>
            <td>{{.Mes}}</td>
            <td class="grafico"><span class="barra"><i style="width:{{.Pct}}%"></i></span></td>
            <td class="num">{{.Total}}</td>
          </tr>
        {{end}}
        </tbody>
      </table>
    </div>
  </section>

  <div class="colunas">
    <section class="cartao">
      <h2>Clientes por origem</h2>
      {{if .Origens}}
      <table><tbody>
      {{range .Origens}}
        <tr>
          <td>{{.Label}}</td>
          <td class="grafico"><span class="barra"><i style="width:{{.Pct}}%"></i></span></td>
          <td class="num">{{.Total}}</td>
        </tr>
      {{end}}
      </tbody></table>
      {{else}}<p class="vazio">O campo de origem ainda não foi preenchido em nenhum cadastro.</p>{{end}}
    </section>

    <section class="cartao">
      <h2>Imóveis por tipo</h2>
      {{if .TiposImovel}}
      <table><tbody>
      {{range .TiposImovel}}
        <tr>
          <td>{{.Label}}</td>
          <td class="grafico"><span class="barra"><i style="width:{{.Pct}}%"></i></span></td>
          <td class="num">{{.Total}}</td>
        </tr>
      {{end}}
      </tbody></table>
      {{else}}<p class="vazio">Nenhum imóvel cadastrado.</p>{{end}}
    </section>
  </div>

  <div class="colunas">
    <section class="cartao">
      <h2>Minha Casa Minha Vida</h2>
      <p style="margin:0 0 8px">Clientes elegíveis: <strong>{{.A.MCMV.TotalElegiveis}}</strong></p>
      <table>
        <thead><tr><th>Faixa</th><th class="num">Clientes</th></tr></thead>
        <tbody>{{range $k, $v := .A.MCMV.PorFaixa}}<tr><td>{{$k}}</td><td class="num">{{$v}}</td></tr>{{end}}</tbody>
      </table>
    </section>

    <section class="cartao">
      <h2>Completude de documentos</h2>
      <table>
        <thead><tr><th>Documento</th><th class="num">Completo</th></tr></thead>
        <tbody>
          <tr><td>Documentos pessoais</td><td class="num">{{printf "%.1f" .A.Documentos.ComDocumentosPessoais}}%</td></tr>
          <tr><td>Extrato bancário</td><td class="num">{{printf "%.1f" .A.Documentos.ComExtratoBancario}}%</td></tr>
          <tr><td>Documentos de dependente</td><td class="num">{{printf "%.1f" .A.Documentos.ComDocumentosDependente}}%</td></tr>
          <tr><td>Documentos de cônjuge</td><td class="num">{{printf "%.1f" .A.Documentos.ComDocumentosConjuge}}%</td></tr>
        </tbody>
      </table>
    </section>
  </div>

  <section>
    <h2>Recomendações</h2>
    {{if .A.Recomendacoes}}
    <ul class="recomendacoes">{{range .A.Recomendacoes}}<li>{{.}}</li>{{end}}</ul>
    {{else}}
    <div class="cartao"><p class="vazio" style="margin:0">Nenhuma recomendação no momento — os indicadores estão dentro do esperado.</p></div>
    {{end}}
  </section>

  <footer>{{.Marca}} · Relatório gerado automaticamente em {{.GeradoEm}}</footer>

</div>
</body>
</html>`

var parsedReportTemplate = template.Must(template.New("relatorio").Parse(reportTemplate))

// barra é uma linha de tabela com barra proporcional: o comprimento sai da
// razão com o maior valor da série, não do total, para que a maior barra ocupe
// a largura inteira e as diferenças fiquem visíveis mesmo quando todos os
// valores são pequenos.
type barra struct {
	Label string
	Total int
	Pct   int
}

func barrasDeMapa(m map[string]int) []barra {
	if len(m) == 0 {
		return nil
	}
	maior := 0
	for _, v := range m {
		if v > maior {
			maior = v
		}
	}
	out := make([]barra, 0, len(m))
	for k, v := range m {
		out = append(out, barra{Label: k, Total: v, Pct: pctDe(v, maior)})
	}
	// Ordem decrescente: quem lê um relatório quer o maior primeiro.
	sortBarras(out)
	return out
}

func sortBarras(b []barra) {
	for i := 1; i < len(b); i++ {
		for j := i; j > 0 && b[j].Total > b[j-1].Total; j-- {
			b[j], b[j-1] = b[j-1], b[j]
		}
	}
}

func pctDe(v, maior int) int {
	if maior <= 0 {
		return 0
	}
	return v * 100 / maior
}

// RenderHTML monta o relatório HTML completo a partir das análises
// computadas. Devolve string vazia + false quando não há clientes (o Node
// devolvia 404 HTML nesse caso).
func RenderHTML(a Analytics) (string, bool) {
	if a.Geral.Total == 0 {
		return emptyReportHTML(), false
	}

	// A série mensal vira barras proporcionais ao mês mais cheio.
	maiorMes := 0
	for _, t := range a.Tendencias {
		if t.Total > maiorMes {
			maiorMes = t.Total
		}
	}
	tendencias := make([]barra, 0, len(a.Tendencias))
	for _, t := range a.Tendencias {
		tendencias = append(tendencias, barra{Label: t.Mes, Total: t.Total, Pct: pctDe(t.Total, maiorMes)})
	}

	var sb strings.Builder
	_ = parsedReportTemplate.Execute(&sb, struct {
		A           Analytics
		GeradoEm    string
		Marca       string
		Tendencias  []tendenciaBarra
		Origens     []barra
		TiposImovel []barra
	}{
		A:           a,
		GeradoEm:    time.Now().Format("02/01/2006 15:04"),
		Marca:       marca(),
		Tendencias:  comMes(tendencias),
		Origens:     barrasDeMapa(a.Origens),
		TiposImovel: barrasDeMapa(a.TiposImovel),
	})
	return sb.String(), true
}

// tendenciaBarra existe só para o template poder escrever `.Mes` na coluna do
// mês, mantendo o mesmo vocabulário do resto do sistema.
type tendenciaBarra struct {
	Mes   string
	Total int
	Pct   int
}

func comMes(b []barra) []tendenciaBarra {
	out := make([]tendenciaBarra, 0, len(b))
	for _, x := range b {
		out = append(out, tendenciaBarra{Mes: x.Label, Total: x.Total, Pct: x.Pct})
	}
	return out
}

// marca lê o nome do sistema do ambiente, igual ao frontend
// (NEXT_PUBLIC_NOME_SISTEMA em Sidebar.jsx), para o relatório não ficar preso a
// uma marca antiga quando a instalação for renomeada.
func marca() string {
	if n := strings.TrimSpace(os.Getenv("NOME_SISTEMA")); n != "" {
		return n
	}
	return "Webba"
}

func emptyReportHTML() string {
	return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<title>Relatório de clientes</title>
<style>
  body { font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
         color: #1f2a37; background: #f3f5f8; margin: 0; padding: 48px 24px; text-align: center; }
  div { max-width: 420px; margin: 0 auto; background: #fff; border: 1px solid #dde3ea;
        border-radius: 10px; padding: 32px 24px; }
  h1 { font-size: 18px; margin: 0 0 6px; }
  p { color: #5b6b7c; font-size: 13px; margin: 0; }
</style>
</head>
<body><div>
  <h1>Nenhum cliente cadastrado</h1>
  <p>Assim que houver clientes na carteira, o relatório é gerado com os indicadores dela.</p>
</div></body></html>`
}
