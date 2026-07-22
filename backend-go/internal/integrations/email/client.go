// Package email substitui services/emailService.js (Nodemailer) usando
// gopkg.in/gomail.v2. Ver docs/migration/05-whatsapp-realtime-jobs.md
// §"Email (Nodemailer → gomail)".
//
// GOTCHA replicado deliberadamente (spec item 5): o Node usa
// `nodemailer.createTransporter` (typo — o correto seria `createTransport`),
// o que sugere que o envio real NUNCA funcionou em produção e sempre caiu no
// ramo "simulado" quando faltavam credenciais. Aqui implementamos o envio
// REAL corretamente (gomail não tem esse bug), mas preservamos o mesmo
// comportamento de fallback: se SMTP_USER/SMTP_PASSWORD não estiverem
// configurados, retornamos sucesso simulado sem tentar enviar.
package email

import (
	"fmt"
	"os"
	"strconv"

	"gopkg.in/gomail.v2"
)

// Config agrega as variáveis de ambiente SMTP_* (ver spec).
type Config struct {
	Host         string
	Port         int
	User         string
	Password     string
	FromName     string
	FromEmail    string
	EmpresaNome  string
}

// LoadConfigFromEnv replica os defaults do Node:
// host=SMTP_HOST||smtp.gmail.com, port=SMTP_PORT||587.
func LoadConfigFromEnv() Config {
	port := 587
	if v := os.Getenv("SMTP_PORT"); v != "" {
		if p, err := strconv.Atoi(v); err == nil {
			port = p
		}
	}
	return Config{
		Host:        firstNonEmpty(os.Getenv("SMTP_HOST"), "smtp.gmail.com"),
		Port:        port,
		User:        os.Getenv("SMTP_USER"),
		Password:    os.Getenv("SMTP_PASSWORD"),
		FromName:    firstNonEmpty(os.Getenv("SMTP_FROM_NAME"), "Sistema CRM"),
		FromEmail:   os.Getenv("SMTP_FROM_EMAIL"),
		EmpresaNome: os.Getenv("EMPRESA_NOME"),
	}
}

func firstNonEmpty(vals ...string) string {
	for _, v := range vals {
		if v != "" {
			return v
		}
	}
	return ""
}

// Result espelha o retorno `{success, messageId, email}` / `{success:false, error}` do Node.
type Result struct {
	Success   bool   `json:"success"`
	MessageID string `json:"messageId,omitempty"`
	Email     string `json:"email,omitempty"`
	Message   string `json:"message,omitempty"` // usado no ramo "simulado"
	Error     string `json:"error,omitempty"`
}

// Client é o substituto direto de createTransporter()/sendMail(). Um único
// client é compartilhado por toda a aplicação (não há por-tenant aqui — o
// Node também usa uma única conta SMTP global).
type Client struct {
	cfg Config
}

func New(cfg Config) *Client {
	return &Client{cfg: cfg}
}

// dialer monta o gomail.Dialer equivalente a
// nodemailer.createTransport({host, port, secure:false, auth:{user, pass}}).
// secure:false = STARTTLS na porta 587 (comportamento padrão do gomail.Dialer);
// para porta 465 (SSL implícito) setar d.SSL = true.
func (c *Client) dialer() *gomail.Dialer {
	d := gomail.NewDialer(c.cfg.Host, c.cfg.Port, c.cfg.User, c.cfg.Password)
	if c.cfg.Port == 465 {
		d.SSL = true
	}
	return d
}

// Send é o método genérico Send(to, subject, body) pedido no escopo —
// envia HTML simples. Para os fluxos de negócio específicos (pagamento), ver
// SendPagamentoEmail abaixo, que monta o HTML e reaproveita este método.
func (c *Client) Send(to, subject, htmlBody string) error {
	res := c.sendInternal(to, subject, htmlBody)
	if !res.Success {
		return fmt.Errorf("email: %s", res.Error)
	}
	return nil
}

func (c *Client) sendInternal(to, subject, htmlBody string) Result {
	// Ramo "simulado": sem credenciais, não tenta enviar de verdade — apenas
	// loga e retorna sucesso simulado (paridade com o comportamento herdado
	// do Node quando SMTP_USER/SMTP_PASSWORD faltam).
	if c.cfg.User == "" || c.cfg.Password == "" {
		return Result{Success: true, Message: "Email simulado (SMTP não configurado)", Email: to}
	}

	m := gomail.NewMessage()
	fromEmail := c.cfg.FromEmail
	if fromEmail == "" {
		fromEmail = c.cfg.User
	}
	m.SetAddressHeader("From", fromEmail, c.cfg.FromName)
	m.SetHeader("To", to)
	m.SetHeader("Subject", subject)
	m.SetBody("text/html", htmlBody)

	if err := c.dialer().DialAndSend(m); err != nil {
		return Result{Success: false, Error: err.Error(), Email: to}
	}
	return Result{Success: true, Email: to}
}

// PagamentoInfo é o subconjunto de dados de Cliente/Pagamento necessário para
// montar o e-mail (evita acoplar este pacote ao model Pagamento/Cliente, que
// pertence a outros módulos em construção em paralelo).
type PagamentoInfo struct {
	ClienteNome  string
	ClienteEmail string
	Tipo         string // "PIX" | "Boleto"
	Titulo       string
	LinkPagamento string
	Valor        string
}

// SendPagamentoEmail replica enviarEmailPagamento(cliente, pagamento): monta
// HTML com EMPRESA_NOME + link de pagamento, assunto "{tipo} Disponível - {titulo}".
func (c *Client) SendPagamentoEmail(info PagamentoInfo) Result {
	empresa := c.cfg.EmpresaNome
	if empresa == "" {
		empresa = "CRM IMOB"
	}
	subject := fmt.Sprintf("%s Disponível - %s", info.Tipo, info.Titulo)
	html := fmt.Sprintf(`
		<div style="font-family:sans-serif;max-width:560px;margin:0 auto">
			<h2>%s</h2>
			<p>Olá, %s!</p>
			<p>Seu %s está disponível para pagamento.</p>
			<p><strong>Valor:</strong> %s</p>
			<p><a href="%s" style="display:inline-block;padding:10px 18px;background:#F97316;color:#fff;border-radius:6px;text-decoration:none">Pagar agora</a></p>
		</div>`, empresa, info.ClienteNome, info.Tipo, info.Valor, info.LinkPagamento)

	return c.sendInternal(info.ClienteEmail, subject, html)
}
