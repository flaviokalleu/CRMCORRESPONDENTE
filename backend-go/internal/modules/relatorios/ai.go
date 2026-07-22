package relatorios

import "os"

// Recomendacoes gera as recomendações do relatório. O Node usava o modelo
// Gemini `gemini-2.0-flash` (@google/generative-ai) com fallback estático, e
// tinha a chave da API **hardcoded como fallback** no código-fonte — removida
// deliberadamente aqui (gotcha corrigido, spec §"Relatórios" + regra do
// prompt: nunca hardcodar a chave Gemini).
//
// Implementação atual: SEMPRE usa o fallback estático. A chamada real ao
// Gemini fica como TODO — não é o foco deste módulo (cálculo/CRUD de
// vendas/dashboards). Quando implementada, deve ler a chave EXCLUSIVAMENTE de
// GEMINI_API_KEY (env) e nunca falhar a geração do relatório se a API estiver
// indisponível (sempre cair no fallback).
func Recomendacoes(a Analytics) []string {
	if apiKey := os.Getenv("GEMINI_API_KEY"); apiKey != "" {
		// TODO: chamar a API Gemini (generativelanguage.googleapis.com) com o
		// resumo de `a` e devolver as recomendações geradas. Por ora, cai no
		// fallback estático abaixo (mesmo comportamento observável do Node
		// quando a chamada IA falha).
		_ = apiKey
	}
	return fallbackRecomendacoes(a)
}

// fallbackRecomendacoes replica o fallback estático do Node — recomendações
// genéricas derivadas das métricas calculadas, sem depender de IA.
func fallbackRecomendacoes(a Analytics) []string {
	var out []string

	if a.Geral.Total == 0 {
		return []string{"Nenhum cliente cadastrado ainda — comece captando leads para gerar análises."}
	}

	if a.Geral.TaxaReprovacao > 30 {
		out = append(out, "Taxa de reprovação acima de 30% — revisar critérios de pré-qualificação de clientes.")
	}
	if a.Geral.ClientesComRenda < a.Geral.Total/2 {
		out = append(out, "Menos da metade dos clientes possui renda informada — reforçar coleta desse dado na entrada.")
	}
	if a.MCMV.TotalElegiveis > 0 {
		out = append(out, "Existem clientes elegíveis ao MCMV — priorizar o enquadramento nas faixas de subsídio.")
	}
	if a.Documentos.ComDocumentosPessoais < 80 {
		out = append(out, "Menos de 80% dos clientes têm documentos pessoais anexados — acompanhar pendências de documentação.")
	}
	if a.FGTS.ElegiveisFGTS > 0 {
		out = append(out, "Há clientes com carteira assinada há mais de 3 anos e PIS cadastrado — avaliar uso de FGTS na entrada.")
	}
	if len(out) == 0 {
		out = append(out, "Indicadores dentro do esperado — manter o ritmo atual de captação e aprovação.")
	}
	return out
}
