package models

// Agrupamento dos 21 status do enum em quatro TONS semânticos. É a mesma
// classificação que o front declara em `frontend-next/src/lib/cliente-status.js`
// (campo `tone` de cada status) — as duas listas precisam andar juntas: se um
// status novo entrar em StatusValidos, ele entra aqui e lá.
//
// O tom existe porque 21 colunas de status não formam uma leitura: quem abre a
// lista quer saber quantos estão em andamento, quantos fecharam e quantos se
// perderam. As contagens por tom é que alimentam as abas da lista de clientes.
var StatusPorTom = map[string][]string{
	"positive": {
		"cliente_aprovado", "conformidade", "concluido", "aprovado", "finalizado",
	},
	"negative": {
		"reprovado", "nao_descondiciona", "nao_deu_continuidade", "cancelado",
	},
	"attention": {
		"aguardando_aprovacao", "documentacao_pendente", "aguardando_cancelamento_qv",
		"condicionado", "aguardando_reserva_orcamentaria",
	},
	"neutral": {
		"proposta_apresentada", "visita_efetuada", "reserva", "conferencia_documento",
		"fechamento_proposta", "processo_em_aberto", "em_andamento",
	},
}

// TomDoStatus devolve o tom de um status; status fora do enum caem em "neutral",
// o mesmo destino que a lane "Sem status" do Kanban lhes dá no front.
func TomDoStatus(status string) string {
	for tom, lista := range StatusPorTom {
		for _, s := range lista {
			if s == status {
				return tom
			}
		}
	}
	return "neutral"
}

// GrupoStatus são os recortes que a interface oferece como aba. "atendimento"
// junta os dois tons de processo em curso (attention + neutral) porque, para
// quem trabalha a carteira, "aguardando documento" e "proposta apresentada" são
// a mesma coisa: cliente vivo, ainda sem desfecho.
var GrupoStatus = map[string][]string{
	"atendimento": append(append([]string{}, StatusPorTom["attention"]...), StatusPorTom["neutral"]...),
	"aprovados":   StatusPorTom["positive"],
	"perdidos":    StatusPorTom["negative"],
}

// StatusDoGrupo resolve o nome vindo da query (?grupo=). Aceita tanto os grupos
// da interface quanto o nome cru de um tom, e devolve nil quando não conhece o
// valor — quem chama trata isso como "sem filtro" em vez de devolver lista vazia.
func StatusDoGrupo(nome string) []string {
	if lista, ok := GrupoStatus[nome]; ok {
		return lista
	}
	if lista, ok := StatusPorTom[nome]; ok {
		return lista
	}
	return nil
}
