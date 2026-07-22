// Package whatsapp expõe as rotas HTTP /api/whatsapp, espelhando o inventário
// de endpoints de routes/whatsappRoutes.js (ver
// docs/migration/05-whatsapp-realtime-jobs.md §"Inventário de endpoints").
//
// Todas as chamadas de baixo nível (conectar, QR, enviar mensagem, sessões)
// delegam ao internal/integrations/whatsapp.Manager — este handler só faz
// parsing de request, resolução de tenant e formatação de payload de resposta.
package whatsapp

import (
	"context"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"crmimob/internal/auth"
	"crmimob/internal/integrations/whatsapp"
	"crmimob/internal/models"
)

type Handler struct {
	mgr     *whatsapp.Manager
	repo    *whatsapp.SessionRepo
	db      *gorm.DB
	authSvc *auth.Service
}

func NewHandler(mgr *whatsapp.Manager, repo *whatsapp.SessionRepo, db *gorm.DB, authSvc *auth.Service) *Handler {
	return &Handler{mgr: mgr, repo: repo, db: db, authSvc: authSvc}
}

// Register monta o grupo /api/whatsapp com o middleware de resolução de
// tenant (auth OPCIONAL — ver middleware.go).
func (h *Handler) Register(api *gin.RouterGroup) {
	g := api.Group("/whatsapp")
	g.Use(ResolveWhatsAppTenant(h.authSvc))

	g.GET("/qr-code", h.QRCode)
	g.POST("/connect", h.Connect)
	g.GET("/status", h.Status)
	g.POST("/reset", h.Reset)
	g.POST("/disconnect", h.Disconnect)
	g.POST("/send-message", h.SendMessage)
	g.POST("/restart", h.Restart)

	g.POST("/notificarClienteCadastrado", h.NotificarClienteCadastrado)
	g.POST("/notificarStatusAlterado", h.NotificarStatusAlterado)
	g.POST("/notificarNotaAdicionada", h.NotificarNotaAdicionada)
	g.POST("/notificarNotasConcluidas", h.NotificarNotasConcluidas)
	g.POST("/notificarCorrespondentesNotaConcluida", h.NotificarCorrespondentesNotaConcluida)
	g.POST("/notificarCorrespondenteDocumentosEnviados", h.NotificarCorrespondenteDocumentosEnviados)
	g.POST("/enviar-pagamento", h.EnviarPagamento)
	g.POST("/reenviar-pagamento/:pagamentoId", h.ReenviarPagamento)

	g.POST("/session/create", h.SessionCreate)
	g.DELETE("/session/:sessionId", h.SessionDelete)
	g.GET("/sessions", h.SessionsList)
	g.POST("/session/switch", h.SessionSwitch)
	g.POST("/session/reset/:sessionId", h.SessionReset)
	g.POST("/sessions/cleanup", h.SessionsCleanup)
	g.GET("/session/:sessionId", h.SessionInfo)
}

// ---- Conexão / QR / status ----

// GET /qr-code — retorna estado atual SEM inicializar (ordem: authenticated >
// blocked > qrCodeData > isInitializing > idle).
func (h *Handler) QRCode(c *gin.Context) {
	tenantID, ok := tenantFrom(c)
	if !ok {
		return
	}
	qr, status := h.mgr.GetQRCode(tenantID)
	c.JSON(http.StatusOK, gin.H{
		"status": string(status),
		"qrCode": qr,
	})
}

// POST /connect — inicialização manual; espera até 4s por um QR pronto.
func (h *Handler) Connect(c *gin.Context) {
	tenantID, ok := tenantFrom(c)
	if !ok {
		return
	}
	var body struct {
		SessionID string `json:"sessionId"`
	}
	_ = c.ShouldBindJSON(&body)

	ctx := c.Request.Context()
	if _, err := h.mgr.StartSession(ctx, tenantID, body.SessionID); err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
		return
	}

	// Espera de até 4s pelo QR ficar pronto (contrato que o frontend espera —
	// gotcha #10 do spec).
	deadline := time.Now().Add(4 * time.Second)
	var qr string
	var status string
	for time.Now().Before(deadline) {
		q, st := h.mgr.GetQRCode(tenantID)
		qr, status = q, string(st)
		if qr != "" || st == whatsapp.StatusAuthenticated {
			break
		}
		time.Sleep(200 * time.Millisecond)
	}

	c.JSON(http.StatusOK, gin.H{"status": status, "qrCode": qr})
}

// GET /status — isConnected + info de sessão persistida.
func (h *Handler) Status(c *gin.Context) {
	tenantID, ok := tenantFrom(c)
	if !ok {
		return
	}
	status := h.mgr.GetStatus(tenantID)
	c.JSON(http.StatusOK, gin.H{
		"status":      string(status),
		"isConnected": status == whatsapp.StatusAuthenticated,
	})
}

// POST /reset — disconnect + apaga credenciais (rescan de QR necessário depois).
func (h *Handler) Reset(c *gin.Context) {
	tenantID, ok := tenantFrom(c)
	if !ok {
		return
	}
	if err := h.mgr.Logout(c.Request.Context(), tenantID, true); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}

// POST /disconnect — derruba o socket preservando credenciais.
func (h *Handler) Disconnect(c *gin.Context) {
	tenantID, ok := tenantFrom(c)
	if !ok {
		return
	}
	var body struct {
		DeleteSession bool `json:"deleteSession"`
	}
	_ = c.ShouldBindJSON(&body)

	if err := h.mgr.Logout(c.Request.Context(), tenantID, body.DeleteSession); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}

// POST /restart — disconnect + reset + reinit (2s delay), replica /restart do Node.
func (h *Handler) Restart(c *gin.Context) {
	tenantID, ok := tenantFrom(c)
	if !ok {
		return
	}
	_ = h.mgr.Logout(c.Request.Context(), tenantID, true)

	go func(tid uint) {
		time.Sleep(2 * time.Second)
		_, _ = h.mgr.StartSession(context.Background(), tid, "")
	}(tenantID)

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Reinicialização agendada"})
}

// POST /send-message — {phone, message}.
func (h *Handler) SendMessage(c *gin.Context) {
	tenantID, ok := tenantFrom(c)
	if !ok {
		return
	}
	var body struct {
		Phone   string `json:"phone" binding:"required"`
		Message string `json:"message" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "phone e message são obrigatórios"})
		return
	}

	msgID, err := h.mgr.SendMessage(c.Request.Context(), tenantID, body.Phone, body.Message)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "messageId": msgID})
}

// ---- Notificações de negócio ----
//
// NOTA DE ESCOPO: os endpoints abaixo, no Node, montam a mensagem buscando
// Cliente/Pagamento/Nota diretamente do banco (models que pertencem a OUTROS
// módulos, implementados por outros agentes em paralelo — ver instruções do
// wiring). Para não acoplar este pacote a modelos que ainda não existem neste
// escopo, os endpoints aqui recebem os dados JÁ RESOLVIDOS no corpo da
// requisição (nome do cliente, telefone, texto da nota etc.) e cuidam apenas
// da FORMATAÇÃO da mensagem + envio + broadcast. Quando os módulos de
// clientes/pagamentos/notas existirem, o ideal é que ELES chamem
// `whatsapp.Manager.SendMessage` diretamente (sem HTTP interno — gotcha #7 do
// spec) em vez de bater nestes endpoints.

type clienteCadastradoBody struct {
	ClienteID                  uint   `json:"clienteId"`
	ClienteNome                string `json:"clienteNome"`
	TelefoneUsuarioResponsavel string `json:"telefoneUsuarioResponsavel" binding:"required"`
	Detalhes                   string `json:"detalhes"`
}

func (h *Handler) NotificarClienteCadastrado(c *gin.Context) {
	tenantID, ok := tenantFrom(c)
	if !ok {
		return
	}
	var body clienteCadastradoBody
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	msg := "Novo cliente cadastrado: " + body.ClienteNome
	if body.Detalhes != "" {
		msg += "\n" + body.Detalhes
	}
	h.sendAndRespond(c, tenantID, body.TelefoneUsuarioResponsavel, msg)
}

type statusAlteradoBody struct {
	ClienteID   uint   `json:"clienteId"`
	ClienteNome string `json:"clienteNome"`
	NovoStatus  string `json:"novoStatus"`
	Telefone    string `json:"telefone" binding:"required"`
}

func (h *Handler) NotificarStatusAlterado(c *gin.Context) {
	tenantID, ok := tenantFrom(c)
	if !ok {
		return
	}
	var body statusAlteradoBody
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	msg := "Status do cliente " + body.ClienteNome + " alterado para: " + body.NovoStatus
	h.sendAndRespond(c, tenantID, body.Telefone, msg)
}

type notaAdicionadaBody struct {
	ClienteID         uint   `json:"clienteId"`
	ClienteNome       string `json:"clienteNome"`
	NotaTexto         string `json:"notaTexto"`
	UsuarioAdicionou  string `json:"usuarioAdicionou"`
	Prioridade        string `json:"prioridade"`
	Telefone          string `json:"telefoneUsuarioResponsavel" binding:"required"`
}

func (h *Handler) NotificarNotaAdicionada(c *gin.Context) {
	tenantID, ok := tenantFrom(c)
	if !ok {
		return
	}
	var body notaAdicionadaBody
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	msg := "Nova nota em " + body.ClienteNome + " (" + body.Prioridade + "): " + body.NotaTexto
	msgID, err := h.mgr.SendMessage(c.Request.Context(), tenantID, body.Telefone, msg)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	// Também emite o evento GLOBAL `whatsapp-nota-adicionada` (Socket.IO global no Node).
	// O broadcast é feito pelo caller via hub — ver wiring: este handler não
	// tem acesso direto ao *ws.Hub (evita import cycle), então devolve os
	// dados prontos para o módulo de notas emitir, OU o hub pode ser injetado
	// aqui numa próxima iteração se preferível.
	c.JSON(http.StatusOK, gin.H{"success": true, "messageId": msgID, "event": "whatsapp-nota-adicionada", "data": body})
}

type notasConcluidasBody struct {
	ClienteID   uint   `json:"clienteId"`
	ClienteNome string `json:"clienteNome"`
	Telefone    string `json:"telefoneUsuarioResponsavel" binding:"required"`
	Total       int    `json:"totalNotas"`
}

func (h *Handler) NotificarNotasConcluidas(c *gin.Context) {
	tenantID, ok := tenantFrom(c)
	if !ok {
		return
	}
	var body notasConcluidasBody
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	msg := "Todas as notas de " + body.ClienteNome + " foram concluídas."
	h.sendAndRespond(c, tenantID, body.Telefone, msg)
}

type correspondentesNotaBody struct {
	ClienteNome string `json:"clienteNome"`
	NotaTexto   string `json:"notaTexto"`
}

// NotificarCorrespondentesNotaConcluida busca User{is_correspondente:true} DO
// TENANT (correção deliberada do gotcha #4 — o Node vazava cross-tenant aqui)
// e envia a mensagem a cada um, com delay de 1s entre envios (igual ao Node).
func (h *Handler) NotificarCorrespondentesNotaConcluida(c *gin.Context) {
	tenantID, ok := tenantFrom(c)
	if !ok {
		return
	}
	var body correspondentesNotaBody
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var correspondentes []models.User
	if err := h.db.WithContext(c.Request.Context()).
		Where("is_correspondente = ? AND tenant_id = ?", true, tenantID).
		Find(&correspondentes).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	msg := "Nota concluída para " + body.ClienteNome + ": " + body.NotaTexto
	sent := 0
	for i, u := range correspondentes {
		if u.Telefone == "" {
			continue
		}
		if _, err := h.mgr.SendMessage(c.Request.Context(), tenantID, u.Telefone, msg); err == nil {
			sent++
		}
		if i < len(correspondentes)-1 {
			time.Sleep(1 * time.Second)
		}
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "enviados": sent, "total": len(correspondentes)})
}

type documentosEnviadosBody struct {
	ClienteNome string   `json:"clienteNome"`
	Documentos  []string `json:"documentos"`
}

func (h *Handler) NotificarCorrespondenteDocumentosEnviados(c *gin.Context) {
	tenantID, ok := tenantFrom(c)
	if !ok {
		return
	}
	var body documentosEnviadosBody
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var correspondentes []models.User
	if err := h.db.WithContext(c.Request.Context()).
		Where("is_correspondente = ? AND tenant_id = ?", true, tenantID).
		Find(&correspondentes).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	msg := "Documentos enviados por " + body.ClienteNome + ":\n"
	for _, d := range body.Documentos {
		msg += "- " + d + "\n"
	}

	sent := 0
	for i, u := range correspondentes {
		if u.Telefone == "" {
			continue
		}
		if _, err := h.mgr.SendMessage(c.Request.Context(), tenantID, u.Telefone, msg); err == nil {
			sent++
		}
		if i < len(correspondentes)-1 {
			time.Sleep(1 * time.Second)
		}
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "enviados": sent, "total": len(correspondentes)})
}

type enviarPagamentoBody struct {
	Telefone      string `json:"telefone" binding:"required"`
	ClienteNome   string `json:"clienteNome"`
	Tipo          string `json:"tipo"` // PIX | Boleto
	LinkPagamento string `json:"linkPagamento"`
	Valor         string `json:"valor"`
}

func (h *Handler) EnviarPagamento(c *gin.Context) {
	tenantID, ok := tenantFrom(c)
	if !ok {
		return
	}
	var body enviarPagamentoBody
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	msg := body.Tipo + " disponível para " + body.ClienteNome + ".\nValor: " + body.Valor + "\nLink: " + body.LinkPagamento
	h.sendAndRespond(c, tenantID, body.Telefone, msg)
}

// ReenviarPagamento(pagamentoId): no Node busca Pagamento+Cliente e reenvia.
// Esse fluxo depende do model/serviço `Pagamento` (módulo internal/modules/pagamentos,
// fora do escopo deste agente). Implementado aqui como um proxy fino que
// delega a resolução dos dados ao caller (frontend/outro serviço) via body —
// ver NOTA DE ESCOPO acima. Quando o módulo de pagamentos existir, o ideal é
// que ELE chame h.mgr.SendMessage diretamente.
func (h *Handler) ReenviarPagamento(c *gin.Context) {
	tenantID, ok := tenantFrom(c)
	if !ok {
		return
	}
	pagamentoID := c.Param("pagamentoId")
	var body enviarPagamentoBody
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "dados do pagamento são obrigatórios (integração completa pendente do módulo de pagamentos)"})
		return
	}
	msg := "Reenvio - " + body.Tipo + " disponível para " + body.ClienteNome + ".\nValor: " + body.Valor + "\nLink: " + body.LinkPagamento
	msgID, err := h.mgr.SendMessage(c.Request.Context(), tenantID, body.Telefone, msg)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "messageId": msgID, "pagamentoId": pagamentoID, "whatsapp_enviado": true})
}

// ---- Gestão de sessões ----

type sessionCreateBody struct {
	SessionID   string `json:"sessionId"`
	ForceCreate bool   `json:"forceCreate"`
}

func (h *Handler) SessionCreate(c *gin.Context) {
	tenantID, ok := tenantFrom(c)
	if !ok {
		return
	}
	var body sessionCreateBody
	_ = c.ShouldBindJSON(&body)

	stored := whatsapp.BuildStoredSessionID(tenantID, body.SessionID)
	if !body.ForceCreate && h.repo.Exists(c.Request.Context(), stored) {
		c.JSON(http.StatusConflict, gin.H{"error": "Sessão já existe. Use forceCreate para sobrescrever."})
		return
	}

	if _, err := h.mgr.StartSession(c.Request.Context(), tenantID, body.SessionID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "sessionId": whatsapp.ToPublicSessionID(tenantID, stored)})
}

func (h *Handler) SessionDelete(c *gin.Context) {
	tenantID, ok := tenantFrom(c)
	if !ok {
		return
	}
	sessionID := c.Param("sessionId")
	force := c.Query("force") == "true"
	stored := whatsapp.BuildStoredSessionID(tenantID, sessionID)

	sess, err := h.repo.Get(c.Request.Context(), stored)
	if err == nil && sess.Status == models.WhatsappStatusActive && !force {
		c.JSON(http.StatusConflict, gin.H{"error": "Sessão ativa — use force=true para deletar mesmo assim"})
		return
	}

	_ = h.mgr.Logout(c.Request.Context(), tenantID, true)
	if err := h.repo.Delete(c.Request.Context(), stored); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}

func (h *Handler) SessionsList(c *gin.Context) {
	tenantID, ok := tenantFrom(c)
	if !ok {
		return
	}
	sessions, err := h.repo.ListByTenant(c.Request.Context(), tenantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"sessions": sessions})
}

type sessionSwitchBody struct {
	SessionID string `json:"sessionId" binding:"required"`
}

func (h *Handler) SessionSwitch(c *gin.Context) {
	tenantID, ok := tenantFrom(c)
	if !ok {
		return
	}
	var body sessionSwitchBody
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "sessionId é obrigatório"})
		return
	}
	_ = h.mgr.Disconnect(c.Request.Context(), tenantID)
	if _, err := h.mgr.StartSession(c.Request.Context(), tenantID, body.SessionID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}

func (h *Handler) SessionReset(c *gin.Context) {
	tenantID, ok := tenantFrom(c)
	if !ok {
		return
	}
	sessionID := c.Param("sessionId")
	stored := whatsapp.BuildStoredSessionID(tenantID, sessionID)

	_ = h.mgr.Logout(c.Request.Context(), tenantID, true)
	_ = h.repo.Delete(c.Request.Context(), stored)

	if _, err := h.mgr.StartSession(c.Request.Context(), tenantID, sessionID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}

func (h *Handler) SessionsCleanup(c *gin.Context) {
	days := 30
	if v := c.Query("days"); v != "" {
		if parsed, err := strconv.Atoi(v); err == nil {
			days = parsed
		}
	}
	removed, err := h.repo.CleanupStale(c.Request.Context(), time.Duration(days)*24*time.Hour)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "removed": removed})
}

func (h *Handler) SessionInfo(c *gin.Context) {
	tenantID, ok := tenantFrom(c)
	if !ok {
		return
	}
	sessionID := c.Param("sessionId")
	stored := whatsapp.BuildStoredSessionID(tenantID, sessionID)
	sess, err := h.repo.Get(c.Request.Context(), stored)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Sessão não encontrada"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"session": sess})
}

// ---- helpers ----

func (h *Handler) sendAndRespond(c *gin.Context, tenantID uint, phone, msg string) {
	msgID, err := h.mgr.SendMessage(c.Request.Context(), tenantID, phone, msg)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "messageId": msgID})
}
