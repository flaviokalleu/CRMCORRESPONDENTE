package assinatura

import (
	"context"
	"fmt"
	"html"
	"log/slog"
	"time"

	"gorm.io/gorm/clause"

	"crmimob/internal/models"
)

// Estágios da régua de aviso (um envio por fatura e estágio).
const (
	AvisoAntes3   = "antes3"
	AvisoNoDia    = "no_dia"
	AvisoDepois   = "depois"
	AvisoBloqueio = "bloqueio"
)

// EstagioDoAviso decide qual aviso cabe hoje para uma fatura em aberto.
// Função pura: dias = hoje − vencimento (negativo = ainda vai vencer).
func EstagioDoAviso(dias int, liberado bool) string {
	switch {
	case !liberado:
		return AvisoBloqueio
	case dias >= -3 && dias < 0:
		return AvisoAntes3
	case dias == 0:
		return AvisoNoDia
	case dias > 0:
		return AvisoDepois
	}
	return ""
}

// EnviarAvisos percorre as faturas em aberto e manda o aviso do estágio de
// hoje, uma única vez (UNIQUE fatura_id+estagio em avisos_cobranca).
func (s *Service) EnviarAvisos(ctx context.Context) {
	if s.email == nil {
		return
	}
	var faturas []models.FaturaAssinatura
	if err := s.db.WithContext(ctx).
		Where("status IN ? AND tenant_id <> ?", []string{models.FaturaPendente, models.FaturaVencida}, s.PlataformaTenantID).
		Find(&faturas).Error; err != nil {
		slog.Error("assinatura: falha ao listar faturas para aviso", "error", err)
		return
	}
	h := hoje()
	for _, f := range faturas {
		t, sub, _, err := s.Carregar(ctx, f.TenantID)
		if err != nil || sub == nil || t.Email == "" {
			continue
		}
		acesso := CalcularAcesso(t, sub, time.Now())
		if acesso.Situacao == SituacaoBloqueioManual || acesso.Situacao == SituacaoCancelada {
			continue
		}
		dias := int(h.Sub(diaDaFatura(f.Vencimento)).Round(time.Hour).Hours() / 24)
		estagio := EstagioDoAviso(dias, acesso.Liberado)
		if estagio == "" {
			continue
		}
		// Reserva antes de enviar: se outra execução já reservou, não repete.
		res := s.db.WithContext(ctx).Clauses(clause.OnConflict{DoNothing: true}).
			Create(&avisoCobranca{TenantID: f.TenantID, FaturaID: f.ID, Estagio: estagio})
		if res.Error != nil || res.RowsAffected == 0 {
			continue
		}
		assunto, corpo := s.textoDoAviso(estagio, t, sub, &f, acesso)
		if err := s.email.Send(t.Email, assunto, corpo); err != nil {
			slog.Warn("assinatura: aviso não enviado", "tenant", t.ID, "estagio", estagio, "error", err)
			s.db.WithContext(ctx).Where("fatura_id = ? AND estagio = ?", f.ID, estagio).Delete(&avisoCobranca{})
		}
	}
}

type avisoCobranca struct {
	ID        uint      `gorm:"primaryKey"`
	TenantID  uint      `gorm:"column:tenant_id"`
	FaturaID  uint      `gorm:"column:fatura_id"`
	Estagio   string    `gorm:"column:estagio"`
	EnviadoEm time.Time `gorm:"column:enviado_em;autoCreateTime"`
}

func (avisoCobranca) TableName() string { return "avisos_cobranca" }

func reais(v float64) string {
	s := fmt.Sprintf("%.2f", v)
	inteiro, cent := s[:len(s)-3], s[len(s)-2:]
	out := ""
	for i, c := range inteiro {
		if i > 0 && (len(inteiro)-i)%3 == 0 {
			out += "."
		}
		out += string(c)
	}
	return "R$ " + out + "," + cent
}

// textoDoAviso: linguagem simples, uma ação só (o botão de pagar), e sempre
// dizendo o que acontece depois.
func (s *Service) textoDoAviso(estagio string, t *models.Tenant, sub *models.Subscription, f *models.FaturaAssinatura, a Acesso) (string, string) {
	teste := sub.Status == "trialing" && sub.DataFim == nil
	venc := diaDaFatura(f.Vencimento).Format("02/01")
	valor := reais(f.Valor)
	var assunto, frase string
	switch estagio {
	case AvisoAntes3:
		if teste {
			assunto = "Seu teste grátis acaba em " + venc
			frase = fmt.Sprintf("Seu teste grátis acaba em %s. Para continuar usando sem interrupção, pague a primeira mensalidade de %s.", venc, valor)
		} else {
			assunto = "Sua mensalidade vence em " + venc
			frase = fmt.Sprintf("Sua mensalidade de %s vence em %s. Pague pelo Pix, boleto ou cartão.", valor, venc)
		}
	case AvisoNoDia:
		if teste {
			assunto = "Seu teste grátis acaba hoje"
			frase = fmt.Sprintf("Seu teste grátis acaba hoje. Pague a mensalidade de %s para continuar usando.", valor)
		} else {
			assunto = "Sua mensalidade vence hoje"
			frase = fmt.Sprintf("Sua mensalidade de %s vence hoje.", valor)
		}
	case AvisoDepois:
		assunto = "Mensalidade em atraso"
		quando := "em breve"
		if a.BloqueiaEm != nil {
			quando = "em " + a.BloqueiaEm.In(fuso).Format("02/01")
		}
		frase = fmt.Sprintf("Não identificamos o pagamento da mensalidade de %s, que venceu em %s. O acesso será suspenso %s se o pagamento não for feito.", valor, venc, quando)
	case AvisoBloqueio:
		assunto = "Seu acesso foi suspenso"
		if teste {
			frase = fmt.Sprintf("Seu teste grátis terminou. Pague a mensalidade de %s para liberar o acesso. Nenhum dado foi apagado.", valor)
		} else {
			frase = fmt.Sprintf("O acesso foi suspenso por falta de pagamento da mensalidade de %s. Nenhum dado foi apagado.", valor)
		}
	}
	link := s.PainelURL + "/minha-assinatura"
	corpo := fmt.Sprintf(`<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#1f2937">
<p>Olá, %s!</p>
<p style="font-size:16px;line-height:1.5">%s</p>
<p style="margin:28px 0"><a href="%s" style="background:#2563eb;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px">Pagar agora</a></p>
<p style="color:#6b7280;font-size:14px">Assim que o pagamento for confirmado, o acesso continua (ou volta) sozinho. Se já pagou, pode ignorar este e-mail.</p>
</div>`, html.EscapeString(t.Nome), html.EscapeString(frase), link)
	return assunto, corpo
}
