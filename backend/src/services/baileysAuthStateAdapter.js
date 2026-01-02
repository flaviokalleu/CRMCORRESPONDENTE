const WhatsAppSessionService = require('./whatsappSessionService');

/**
 * Adaptador para Baileys que usa banco de dados ao invés de arquivos
 */
class BaileysAuthStateAdapter {
  constructor(sessionId = 'default') {
    this.sessionId = sessionId;
  }

  /**
   * Cria o state adapter para Baileys
   * @returns {object} - Object com state e saveCreds
   */
  async useDBAuthState() {
    // Carregar state inicial do banco
    let authState = { creds: {}, keys: {} };
    let shouldResetSession = false;
    
    try {
      const sessionData = await WhatsAppSessionService.loadSession(this.sessionId);
      
      if (sessionData && typeof sessionData === 'object') {
        // Verificar se os dados têm a estrutura mínima necessária
        if (sessionData.creds && typeof sessionData.creds === 'object') {
          // Verificar se as credenciais têm estrutura válida
          const creds = sessionData.creds;
          
          // Se as credenciais existem mas estão incompletas/corrompidas, resetar
          if (Object.keys(creds).length > 0) {
            // Verificar se tem campos essenciais válidos
            const hasValidData = creds.noiseKey && 
                                creds.pairingEphemeralKeyPair && 
                                creds.signedIdentityKey && 
                                creds.signedPreKey && 
                                creds.registrationId;
            
            if (!hasValidData) {
              console.log(`⚠️ Dados de sessão corrompidos para ${this.sessionId}, resetando...`);
              shouldResetSession = true;
            } else {
              authState = {
                creds: sessionData.creds || {},
                keys: sessionData.keys || {}
              };
              console.log(`✅ State válido carregado do banco para sessão: ${this.sessionId}`);
            }
          } else {
            console.log(`⚠️ Credenciais vazias para sessão: ${this.sessionId}`);
          }
        } else {
          console.log(`⚠️ Estrutura inválida para sessão: ${this.sessionId}`);
          shouldResetSession = true;
        }
      } else {
        console.log(`⚠️ Nova sessão criada: ${this.sessionId}`);
        shouldResetSession = true;
      }
      
      // Se deve resetar, limpar dados antigos e começar do zero
      if (shouldResetSession) {
        authState = { creds: {}, keys: {} };
        // Deletar sessão corrompida do banco
        try {
          await WhatsAppSessionService.deleteSession(this.sessionId);
          console.log(`🧹 Sessão corrompida ${this.sessionId} removida do banco`);
        } catch (e) {
          console.log(`⚠️ Erro ao remover sessão corrompida: ${e.message}`);
        }
        // Salvar estado inicial limpo
        await WhatsAppSessionService.saveSession(this.sessionId, authState);
        console.log(`✨ Nova sessão limpa criada: ${this.sessionId}`);
      }
      
    } catch (error) {
      console.error(`❌ Erro ao carregar state da sessão ${this.sessionId}:`, error);
      // Em caso de erro, sempre começar com estado limpo
      authState = { creds: {}, keys: {} };
      try {
        await WhatsAppSessionService.deleteSession(this.sessionId);
        await WhatsAppSessionService.saveSession(this.sessionId, authState);
        console.log(`🔧 Sessão resetada após erro: ${this.sessionId}`);
      } catch (e) {
        console.log(`⚠️ Erro ao resetar sessão: ${e.message}`);
      }
    }

    // Função para salvar credenciais
    const saveCreds = async () => {
      try {
        // Validar dados antes de salvar
        if (!authState || typeof authState !== 'object') {
          console.log(`⚠️ Dados inválidos para salvar na sessão ${this.sessionId}`);
          return;
        }
        
        // Criar cópia limpa dos dados para salvar
        const dataToSave = {
          creds: authState.creds || {},
          keys: authState.keys || {}
        };
        
        await WhatsAppSessionService.saveSession(this.sessionId, dataToSave);
        console.log(`💾 Credenciais salvas para sessão: ${this.sessionId}`);
      } catch (error) {
        console.error(`❌ Erro ao salvar credenciais da sessão ${this.sessionId}:`, error);
      }
    };

    // Retornar no formato esperado pelo Baileys
    return {
      state: authState,
      saveCreds
    };
  }

  /**
   * Atualiza status da sessão no banco
   * @param {string} status - Status da sessão
   * @param {object} additionalData - Dados adicionais
   */
  async updateSessionStatus(status, additionalData = {}) {
    try {
      const { WhatsappSession } = require('../models');
      
      // Garantir que sempre temos um campo data válido
      const updateData = {
        id: this.sessionId,
        status,
        lastActivity: new Date(),
        data: { creds: {}, keys: {} }, // Dados padrão
        ...additionalData
      };

      // Se já existe uma sessão, carregar os dados existentes
      const existingSession = await WhatsappSession.findByPk(this.sessionId);
      if (existingSession && existingSession.data) {
        updateData.data = existingSession.data;
      }
      
      await WhatsappSession.upsert(updateData);
      
      console.log(`📊 Status da sessão ${this.sessionId} atualizado para: ${status}`);
    } catch (error) {
      console.error(`❌ Erro ao atualizar status da sessão ${this.sessionId}:`, error);
    }
  }

  /**
   * Marca sessão como autenticada
   * @param {string} phoneNumber - Número do telefone autenticado
   */
  async markAsAuthenticated(phoneNumber = null) {
    await this.updateSessionStatus('active', {
      isAuthenticated: true,
      phoneNumber
    });
  }

  /**
   * Marca sessão como desconectada
   */
  async markAsDisconnected() {
    await this.updateSessionStatus('inactive', {
      isAuthenticated: false
    });
  }

  /**
   * Marca sessão como conectando
   */
  async markAsConnecting() {
    await this.updateSessionStatus('connecting');
  }

  /**
   * Marca sessão com erro
   */
  async markAsError() {
    await this.updateSessionStatus('error');
  }

  /**
   * Remove sessão completamente
   */
  async deleteSession() {
    try {
      await WhatsAppSessionService.deleteSession(this.sessionId);
      console.log(`🗑️ Sessão ${this.sessionId} removida`);
    } catch (error) {
      console.error(`❌ Erro ao remover sessão ${this.sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Obter informações da sessão
   * @returns {object} - Informações da sessão
   */
  async getSessionInfo() {
    try {
      const { WhatsappSession } = require('../models');
      
      const session = await WhatsappSession.findByPk(this.sessionId);
      
      if (session) {
        return {
          id: session.id,
          status: session.status,
          phoneNumber: session.phoneNumber,
          lastActivity: session.lastActivity,
          isAuthenticated: session.isAuthenticated,
          createdAt: session.createdAt,
          updatedAt: session.updatedAt
        };
      }
      
      return null;
    } catch (error) {
      console.error(`❌ Erro ao obter info da sessão ${this.sessionId}:`, error);
      return null;
    }
  }
}

module.exports = BaileysAuthStateAdapter;
