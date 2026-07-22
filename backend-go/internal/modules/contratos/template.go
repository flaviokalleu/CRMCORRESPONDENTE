package contratos

import (
	"fmt"
	"strings"

	"crmimob/internal/models"
)

// GerarTextoContrato produz o texto (Markdown) do contrato de locação em
// "linguagem simples" (Lei 8.245/91, foro Valparaíso de Goiás), com seções
// numeradas dinamicamente conforme presença de imóvel/fiador — replica
// `gerarTextoContrato` do Node (contratoService.js).
func GerarTextoContrato(inq *models.ClienteAluguel, imovel *models.Aluguel) string {
	var b strings.Builder
	secao := 1

	b.WriteString("# CONTRATO DE LOCAÇÃO RESIDENCIAL\n\n")
	b.WriteString(fmt.Sprintf("## %d. DAS PARTES\n\n", secao))
	b.WriteString(fmt.Sprintf("**LOCATÁRIO(A):** %s", inq.Nome))
	if inq.CPF != nil {
		b.WriteString(fmt.Sprintf(", CPF %s", *inq.CPF))
	}
	b.WriteString("\n\n")
	if inq.ProprietarioNome != nil {
		b.WriteString(fmt.Sprintf("**LOCADOR(A):** %s\n\n", *inq.ProprietarioNome))
	}
	secao++

	if imovel != nil {
		b.WriteString(fmt.Sprintf("## %d. DO IMÓVEL\n\n", secao))
		b.WriteString(fmt.Sprintf("Imóvel: %s\n\n%s\n\n", imovel.NomeImovel, imovel.Descricao))
		secao++
	}

	b.WriteString(fmt.Sprintf("## %d. DO ALUGUEL E VENCIMENTO\n\n", secao))
	b.WriteString(fmt.Sprintf("Valor mensal: R$ %.2f, vencimento todo dia %d.\n\n", inq.ValorAluguel, inq.DiaVencimento))
	secao++

	if inq.DataInicioContrato != nil {
		b.WriteString(fmt.Sprintf("## %d. DA VIGÊNCIA\n\n", secao))
		b.WriteString(fmt.Sprintf("Início: %s", inq.DataInicioContrato.Format("02/01/2006")))
		if inq.DataFimContrato != nil {
			b.WriteString(fmt.Sprintf(" — Término: %s", inq.DataFimContrato.Format("02/01/2006")))
		}
		b.WriteString(fmt.Sprintf("\n\nÍndice de reajuste: %s\n\n", inq.IndiceReajuste))
		secao++
	}

	if inq.TemFiador && inq.FiadorNome != nil {
		b.WriteString(fmt.Sprintf("## %d. DO FIADOR\n\n", secao))
		b.WriteString(fmt.Sprintf("**FIADOR(A):** %s", *inq.FiadorNome))
		if inq.FiadorCPF != nil {
			b.WriteString(fmt.Sprintf(", CPF %s", *inq.FiadorCPF))
		}
		b.WriteString("\n\n")
		secao++
	}

	b.WriteString(fmt.Sprintf("## %d. DO FORO\n\n", secao))
	b.WriteString("Fica eleito o foro da Comarca de Valparaíso de Goiás/GO para dirimir quaisquer dúvidas oriundas deste contrato, com base na Lei 8.245/91 (Lei do Inquilinato).\n")

	return b.String()
}

// MarkdownToHTML é uma conversão minimalista (sem dependências externas) —
// suficiente para alimentar o PDFEngine. Suporta apenas os elementos usados
// no template acima (títulos `#`/`##`, negrito `**x**`, parágrafos).
func MarkdownToHTML(md string) string {
	lines := strings.Split(md, "\n")
	var b strings.Builder
	b.WriteString("<html><head><meta charset=\"utf-8\"><style>body{font-family:sans-serif;font-size:14px;line-height:1.5;color:#0B1426}</style></head><body>")
	for _, line := range lines {
		trimmed := strings.TrimSpace(line)
		switch {
		case strings.HasPrefix(trimmed, "## "):
			b.WriteString("<h2>" + boldToHTML(trimmed[3:]) + "</h2>")
		case strings.HasPrefix(trimmed, "# "):
			b.WriteString("<h1>" + boldToHTML(trimmed[2:]) + "</h1>")
		case trimmed == "":
			// parágrafo em branco — ignora (markdown já usa \n\n)
		default:
			b.WriteString("<p>" + boldToHTML(trimmed) + "</p>")
		}
	}
	b.WriteString("</body></html>")
	return b.String()
}

func boldToHTML(s string) string {
	for strings.Contains(s, "**") {
		i := strings.Index(s, "**")
		j := strings.Index(s[i+2:], "**")
		if j < 0 {
			break
		}
		j += i + 2
		s = s[:i] + "<strong>" + s[i+2:j] + "</strong>" + s[j+2:]
	}
	return s
}
