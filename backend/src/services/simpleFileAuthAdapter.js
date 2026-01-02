const { useMultiFileAuthState } = require('@whiskeysockets/baileys');
const WhatsAppFileSessionManager = require('./whatsappFileSessionManager');
const path = require('path');

/**
 * Adaptador simples que usa arquivos para gerenciar sessões
 * Compatível com Baileys e permite múltiplas sessões
 */
class SimpleFileAuthAdapter {
  constructor(sessionId = 'default') {
    this.sessionId = sessionId;
    this.sessionManager = new WhatsAppFileSessionManager();
  }

  /**
   * Usa o sistema de arquivos padrão do Baileys com controle de sessões
   * @returns {object} - Object com state e saveCreds compatível com Baileys
   */
  async useFileAuthState() {
    try {
      // Garantir que a sessão existe
      if (!this.sessionManager.sessionExists(this.sessionId)) {
        console.log(`📁 Criando nova sessão: ${this.sessionId}`);
        await this.sessionManager.createSession(this.sessionId);
      }

      // Usar o sistema padrão do Baileys
      const sessionPath = this.sessionManager.getSessionPath(this.sessionId);
      const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

      // Wrapper para saveCreds que atualiza info da sessão
      const wrappedSaveCreds = async () => {
        try {
          await saveCreds();
          
          // Atualizar info da sessão após salvar credenciais
          await this.sessionManager.updateSessionInfo(this.sessionId, {
            lastActivity: new Date().toISOString(),
            hasCredentials: true
          });
          
          console.log(`💾 Credenciais salvas para sessão: ${this.sessionId}`);
        } catch (error) {
          console.error(`❌ Erro ao salvar credenciais da sessão ${this.sessionId}:`, error);
        }
      };

      console.log(`✅ Sessão ${this.sessionId} inicializada com arquivos`);
      
      return {
        state,
        saveCreds: wrappedSaveCreds
      };
    } catch (error) {
      console.error(`❌ Erro ao inicializar sessão ${this.sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Atualiza status da sessão
   * @param {string} status - Status da sessão
   * @param {object} additionalData - Dados adicionais
   */
  async updateSessionStatus(status, additionalData = {}) {
    try {
      await this.sessionManager.updateSessionInfo(this.sessionId, {
        status,
        lastActivity: new Date().toISOString(),
        ...additionalData
      });
      
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
      phoneNumber,
      connectedAt: new Date().toISOString()
    });
  }

  /**
   * Marca sessão como desconectada
   */
  async markAsDisconnected() {
    await this.updateSessionStatus('inactive', {
      isAuthenticated: false,
      disconnectedAt: new Date().toISOString()
    });
  }

  /**
   * Marca sessão como conectando
   */
  async markAsConnecting() {
    await this.updateSessionStatus('connecting', {
      connectingAt: new Date().toISOString()
    });
  }

  /**
   * Marca sessão com erro
   */
  async markAsError(errorMessage = null) {
    await this.updateSessionStatus('error', {
      isAuthenticated: false,
      errorAt: new Date().toISOString(),
      errorMessage
    });
  }

  /**
   * Remove sessão completamente
   */
  async deleteSession() {
    try {
      await this.sessionManager.deleteSession(this.sessionId);
      console.log(`🗑️ Sessão ${this.sessionId} removida`);
    } catch (error) {
      console.error(`❌ Erro ao remover sessão ${this.sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Reset da sessão
   */
  async resetSession() {
    try {
      await this.sessionManager.resetSession(this.sessionId);
      console.log(`🔄 Sessão ${this.sessionId} resetada`);
    } catch (error) {
      console.error(`❌ Erro ao resetar sessão ${this.sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Obter informações da sessão
   * @returns {object} - Informações da sessão
   */
  async getSessionInfo() {
    try {
      return await this.sessionManager.getSessionInfo(this.sessionId);
    } catch (error) {
      console.error(`❌ Erro ao obter info da sessão ${this.sessionId}:`, error);
      return null;
    }
  }

  /**
   * Backup da sessão
   */
  async backupSession() {
    try {
      return await this.sessionManager.backupSession(this.sessionId);
    } catch (error) {
      console.error(`❌ Erro ao fazer backup da sessão ${this.sessionId}:`, error);
      return false;
    }
  }
}

module.exports = SimpleFileAuthAdapter;
