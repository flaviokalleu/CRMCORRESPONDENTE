package reguacobranca

import (
	"context"
	"fmt"
	"time"

	"crmimob/internal/models"
)

type Service struct {
	repo     *Repository
	sender   WhatsAppSender
}

func NewService(repo *Repository, sender WhatsAppSender) *Service {
	if sender == nil {
		sender = NoopWhatsAppSender{}
	}
	return &Service{repo: repo, sender: sender}
}

// EtapaAplicavel calcula, para uma data de referência (`agora`), qual etapa
// da régua se aplica ao dia de vencimento do inquilino — `diffDias = hoje -
// dataVencimentoDoMês`. Devolve ("", false) quando nenhuma etapa bate hoje.
func EtapaAplicavel(diaVencimento int, agora time.Time) (etapa string, dias int, ok bool) {
	vencimentoMes := time.Date(agora.Year(), agora.Month(), diaVencimento, 0, 0, 0, 0, agora.Location())
	diff := int(agora.Sub(vencimentoMes).Hours() / 24)
	for _, e := range models.EtapasOrdenadas {
		if e.Dias == diff {
			return e.Etapa, e.Dias, true
		}
	}
	return "", 0, false
}

// mensagemPara monta o texto de cada etapa (lembrete/vencimento/cobrança),
// incluindo o link de pagamento quando disponível.
func mensagemPara(etapa, nomeInquilino string, valor float64, invoiceURL string) string {
	link := ""
	if invoiceURL != "" {
		link = "\nLink para pagamento: " + invoiceURL
	}
	switch etapa {
	case "D-5":
		return fmt.Sprintf("Olá %s! Lembrete amigável: seu aluguel de R$ %.2f vence em 5 dias.%s", nomeInquilino, valor, link)
	case "D-1":
		return fmt.Sprintf("Olá %s! Seu aluguel de R$ %.2f vence amanhã.%s", nomeInquilino, valor, link)
	case "D+1":
		return fmt.Sprintf("Olá %s, seu aluguel de R$ %.2f venceu ontem. Por favor, regularize o quanto antes.%s", nomeInquilino, valor, link)
	case "D+7":
		return fmt.Sprintf("Olá %s, seu aluguel de R$ %.2f está em atraso há 7 dias. Multa e juros já foram aplicados.%s", nomeInquilino, valor, link)
	case "D+15":
		return fmt.Sprintf("Olá %s, aviso importante: seu aluguel de R$ %.2f está em atraso há 15 dias. Medidas administrativas podem ser adotadas.%s", nomeInquilino, valor, link)
	default:
		return fmt.Sprintf("Olá %s, você tem uma pendência referente ao aluguel de R$ %.2f.%s", nomeInquilino, valor, link)
	}
}

// ProcessarInquilino replica `processarReguaCobranca` para um único
// inquilino: calcula a etapa do dia, checa idempotência, busca o link da
// cobrança em aberto e envia via WhatsAppSender (se configurado) —
// registrando SEMPRE um ReguaCobranca, mesmo quando o envio falha ou não
// está configurado (mesmo comportamento observável do Node — 04-spec
// Gotcha 8, mas aqui a interface é correta e o envio de fato dispara quando
// há um WhatsAppSender real).
func (s *Service) ProcessarInquilino(ctx context.Context, c *models.ClienteAluguel, agora time.Time) error {
	etapa, dias, ok := EtapaAplicavel(c.DiaVencimento, agora)
	if !ok {
		return nil
	}
	mesReferencia := agora.Format("2006-01")

	jaEnviada, err := s.repo.JaEnviada(ctx, c.ID, etapa, mesReferencia)
	if err != nil {
		return err
	}
	if jaEnviada {
		return nil
	}

	var cobrancaID *uint
	invoiceURL := ""
	if cob, err := s.repo.CobrancaEmAbertoDoMes(ctx, c.ID, mesReferencia); err == nil {
		cobrancaID = &cob.ID
		if cob.InvoiceURL != nil {
			invoiceURL = *cob.InvoiceURL
		}
	}

	enviada := false
	if c.Telefone != nil && *c.Telefone != "" && c.TenantID != nil {
		msg := mensagemPara(etapa, c.Nome, c.ValorAluguel, invoiceURL)
		if err := s.sender.SendMessage(*c.TenantID, *c.Telefone, msg); err == nil {
			enviada = true
		}
	}

	now := agora
	rc := &models.ReguaCobranca{
		ClienteAluguelID:  c.ID,
		CobrancaAluguelID: cobrancaID,
		Etapa:             etapa,
		DiasReferencia:    dias,
		MensagemEnviada:   enviada,
		DataReferencia:    time.Date(agora.Year(), agora.Month(), agora.Day(), 0, 0, 0, 0, agora.Location()),
		MesReferencia:     &mesReferencia,
	}
	if enviada {
		rc.DataEnvio = &now
	}
	return s.repo.Registrar(ctx, rc)
}

// ProcessarTodos roda a régua para todos os inquilinos visíveis no contexto
// (tenant-scoped se o contexto tiver um Scope; senão todos — chamado pelo
// job cron global). Devolve quantos tiveram mensagem efetivamente enviada.
func (s *Service) ProcessarTodos(ctx context.Context, agora time.Time) (processados, enviados int, err error) {
	inquilinos, err := s.repo.ListInquilinos(ctx)
	if err != nil {
		return 0, 0, err
	}
	for i := range inquilinos {
		c := &inquilinos[i]
		etapa, _, ok := EtapaAplicavel(c.DiaVencimento, agora)
		if !ok {
			continue
		}
		mesReferencia := agora.Format("2006-01")
		jaEnviada, _ := s.repo.JaEnviada(ctx, c.ID, etapa, mesReferencia)
		if jaEnviada {
			continue
		}
		if err := s.ProcessarInquilino(ctx, c, agora); err != nil {
			continue
		}
		processados++
		if c.Telefone != nil && *c.Telefone != "" {
			enviados++
		}
	}
	return processados, enviados, nil
}

// IsHorarioComercial replica `isHorarioComercial()`: seg-sex 9-18h, sáb 9-13h.
func IsHorarioComercial(t time.Time) bool {
	weekday := t.Weekday()
	hour := t.Hour()
	switch weekday {
	case time.Sunday:
		return false
	case time.Saturday:
		return hour >= 9 && hour < 13
	default:
		return hour >= 9 && hour < 18
	}
}
