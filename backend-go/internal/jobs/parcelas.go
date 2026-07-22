package jobs

import (
	"context"
	"fmt"
	"log"
	"time"
)

// runEnviarParcelas replica enviarParcelasAutomaticas() de jobs/enviarParcelas.js
// (Node), rodando a cada hora (`0 * * * *`) + 1 execução de teste 5s após o
// boot (ver Scheduler.Start).
//
// GOTCHA replicado do spec (#6/#7): o Node envia o WhatsApp fazendo um `fetch`
// HTTP para a própria API (`POST /api/whatsapp/enviar-parcela`, endpoint que
// nem existe nas rotas lidas — provável bug). Aqui eliminamos esse hop por
// completo: chamamos `s.whatsapp.SendMessage` diretamente, sem depender de
// porta/URL/endpoint. O envio de e-mail (`enviarEmailParcela`) era um STUB
// simulado no Node (nunca implementado) — aqui usamos o `email.Client` real
// (ver internal/integrations/email), mas ele mesmo cai no "modo simulado" se
// as credenciais SMTP não estiverem configuradas.
func (s *Scheduler) runEnviarParcelas(ctx context.Context) {
	if s.pagamentos == nil {
		log.Println("jobs: PagamentoService não configurado, pulando envio de parcelas")
		return
	}

	ate := nowFunc().Add(1 * time.Hour)
	parcelas, err := s.pagamentos.BuscarParcelasParaEnvio(ctx, ate)
	if err != nil {
		log.Printf("jobs: erro ao buscar parcelas para envio: %v", err)
		return
	}

	for _, p := range parcelas {
		link, err := s.pagamentos.CriarPreferenciaComJuros(ctx, p.PagamentoID)
		if err != nil {
			log.Printf("jobs: erro ao criar preferência MP para pagamento %d: %v", p.PagamentoID, err)
			continue
		}

		if s.whatsapp != nil && p.ClienteTelefone != "" {
			msg := fmt.Sprintf(
				"Sua parcela %d está disponível para pagamento.\nValor: %s\nLink: %s",
				p.ParcelaAtual, p.Valor, link,
			)
			if _, err := s.whatsapp.SendMessage(ctx, p.TenantID, p.ClienteTelefone, msg); err != nil {
				log.Printf("jobs: erro ao enviar WhatsApp da parcela (pagamento=%d): %v", p.PagamentoID, err)
			} else if err := s.pagamentos.MarcarWhatsappEnviado(ctx, p.PagamentoID); err != nil {
				log.Printf("jobs: erro ao marcar whatsapp_enviado (pagamento=%d): %v", p.PagamentoID, err)
			}
		}

		if s.email != nil && p.ClienteEmail != "" {
			subject := fmt.Sprintf("Parcela %d Disponível", p.ParcelaAtual)
			body := fmt.Sprintf("<p>Olá, %s! Sua parcela %d está disponível.</p><p><a href=\"%s\">Pagar agora</a></p>",
				p.ClienteNome, p.ParcelaAtual, link)
			if err := s.email.Send(p.ClienteEmail, subject, body); err != nil {
				log.Printf("jobs: erro ao enviar email da parcela (pagamento=%d): %v", p.PagamentoID, err)
			} else if err := s.pagamentos.MarcarEmailEnviado(ctx, p.PagamentoID); err != nil {
				log.Printf("jobs: erro ao marcar email_enviado (pagamento=%d): %v", p.PagamentoID, err)
			}
		}
	}
}
