'use strict';

/**
 * Registry central de todas as rotas da aplicação.
 * Extraído de server.js para manter o entry point limpo.
 */

// ===== IMPORTAÇÕES DE ROTAS =====
const pagamentosRoutes = require('./pagamentos');
const { router: authRoutes } = require('./authRoutes');
const protectedRoutes = require('./protectedRoutes');
const dashboardRoutes = require('./dashboardRoutes');
const corretorRoutes = require('./corretorRoutes');
const correspondenteRoutes = require('./correspondente');
const listadecorretores = require('./listadecorretores');
const clienteRoutes = require('./clientes');
const adminRoutes = require('./adminRoutes');
const userRoutes = require('./userRoutes');
const reportRoutes = require('./reportRoutes');
const listadeclientesRoutes = require('./listadeclientes');
const imoveisRouter = require('./imoveis');
const notasRouter = require('./notas');
const configurationsRoute = require('./configurations');
const locationsRoute = require('./locations');
const alugueisRouter = require('./alugueis');
const whatsappRoutes = require('./whatsappRoutes');
const lembreteRoutes = require('./lembreteRoutes');
const acessosRoutes = require('./acessos');
const clienteAluguelRoutes = require('./clienteAluguel');
const asaasWebhookRoutes = require('./asaasWebhook');
const dashboardAluguelRoutes = require('./dashboardAluguel');
const contratoAluguelRoutes = require('./contratoAluguel');
const portalInquilinoRoutes = require('./portalInquilino');
const repasseRoutes = require('./repasseRoutes');
const vistoriaRoutes = require('./vistoriaRoutes');
const chamadoRoutes = require('./chamadoRoutes');
const laudosRoutes = require('./laudos');
const simulacaoRoutes = require('./simulacaoRoutes');
const visitaNewRoutes = require('./visitaRoutes');
const propostaRoutes = require('./propostaRoutes');
const notificacaoRoutes = require('./notificacaoRoutes');
const timelineRoutes = require('./timelineRoutes');

// SaaS
const superAdminRoutes = require('./superAdminRoutes');
const tenantRoutes = require('./tenantRoutes');

/**
 * Monta todas as rotas no app Express.
 * A ORDEM é importante — rotas mais específicas antes das genéricas.
 *
 * @param {Express} app - Instância do Express
 * @param {Object} middleware - Middlewares necessários
 * @param {Function} middleware.authenticateToken
 * @param {Function} middleware.resolveTenant
 * @param {Function} middleware.checkSubscription
 * @param {Function} middleware.getPlanUsage
 */
function mountRoutes(app, { authenticateToken, resolveTenant, checkSubscription, getPlanUsage }) {

  // ===== ROTAS SAAS (públicas e super admin) =====
  app.use('/api/tenant', tenantRoutes);
  app.use('/api/super-admin', authenticateToken, resolveTenant, superAdminRoutes);
  app.use('/api/tenant-settings', authenticateToken, resolveTenant, require('./tenantSettingsRoutes'));

  // ===== ROTA DE USO DO PLANO =====
  app.get('/api/plan-usage', authenticateToken, resolveTenant, checkSubscription, getPlanUsage);

  // ===== ROTA DE STORAGE =====
  const storageService = require('../services/storageService');
  app.get('/api/storage-usage', authenticateToken, resolveTenant, async (req, res) => {
    try {
      const tenantId = req.tenantId || req.user?.tenant_id;
      if (!tenantId) return res.status(400).json({ error: 'Tenant não identificado' });
      const info = await storageService.getStorageInfo(tenantId);
      res.json(info);
    } catch (error) {
      console.error('Erro ao obter uso de storage:', error);
      res.status(500).json({ error: 'Erro ao obter informações de armazenamento' });
    }
  });

  // Recalcular storage (super admin)
  app.post('/api/storage-recalculate', authenticateToken, resolveTenant, async (req, res) => {
    try {
      if (!req.isSuperAdmin) return res.status(403).json({ error: 'Acesso negado' });
      const tenantId = req.body.tenant_id || req.tenantId;
      const result = await storageService.recalculateStorage(tenantId);
      res.json({ message: 'Storage recalculado', ...result });
    } catch (error) {
      console.error('Erro ao recalcular storage:', error);
      res.status(500).json({ error: 'Erro ao recalcular armazenamento' });
    }
  });

  // ===== TODAS AS ROTAS DA APLICAÇÃO =====
  app.use('/api/auth', authRoutes);
  app.use('/api/protected', protectedRoutes);
  app.use('/api', dashboardAluguelRoutes); // ANTES do dashboardRoutes para evitar conflito
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/corretor', corretorRoutes);
  app.use('/api/correspondente', correspondenteRoutes);
  app.use('/api/listadecorretores', listadecorretores);
  app.use('/api/admin', adminRoutes);
  app.use('/api/user', userRoutes);
  app.use('/api/report', reportRoutes);
  app.use('/api/listadeclientes', listadeclientesRoutes);
  app.use('/api/imoveis', imoveisRouter);
  app.use('/api/notas', notasRouter);
  app.use('/api', configurationsRoute);
  app.use('/api', locationsRoute);
  app.use('/api/alugueis', alugueisRouter);
  app.use('/api/whatsapp', whatsappRoutes);
  app.use('/api', lembreteRoutes);
  app.use('/api/acessos', acessosRoutes);
  app.use('/api', clienteAluguelRoutes);
  app.use('/api', asaasWebhookRoutes);
  app.use('/api', contratoAluguelRoutes);
  app.use('/api', portalInquilinoRoutes);
  app.use('/api', repasseRoutes);
  app.use('/api', vistoriaRoutes);
  app.use('/api', chamadoRoutes);
  app.use('/api/laudos', laudosRoutes);
  app.use('/api/simulacoes', simulacaoRoutes);
  app.use('/api/visitas', visitaNewRoutes);
  app.use('/api/propostas', propostaRoutes);
  app.use('/api/notificacoes', notificacaoRoutes);
  app.use('/api/timeline', timelineRoutes);
  app.use('/api/pagamentos', pagamentosRoutes);

  // Rotas financeiras
  app.use('/api/receitas', require('./receitas'));
  app.use('/api/despesas', require('./despesas'));
  app.use('/api/comissoes', require('./comissoes'));
  app.use('/api/fluxocaixa', require('./fluxocaixa'));

  // Rota principal de clientes (deve vir por ÚLTIMO para evitar conflitos)
  app.use('/api/', clienteRoutes);
}

module.exports = { mountRoutes };
