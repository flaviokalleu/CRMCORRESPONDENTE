const { BufferJSON, makeCacheableSignalKeyStore, initAuthCreds } = require('whaileys');
const WhatsAppSessionService = require('./whatsappSessionService');

/**
 * Adaptador para Baileys que salva TODO o estado de autenticação no banco de dados.
 * Usa makeCacheableSignalKeyStore do Baileys para gerenciar as chaves Signal corretamente.
 */
class BaileysAuthStateAdapter {
  constructor(sessionId = 'default') {
    this.sessionId = sessionId;
  }

  _toPlain(value) {
    return JSON.parse(JSON.stringify(value, BufferJSON.replacer));
  }

  _fromPlain(value) {
    return JSON.parse(JSON.stringify(value), BufferJSON.reviver);
  }

  /**
   * Cria o state adapter para Baileys (usando banco de dados como storage).
   * Retorna { state, saveCreds } compatível com makeWASocket({ auth: state })
   */
  async useDBAuthState() {
    let creds;
    let storedKeys = {};

    try {
      const sessionData = await WhatsAppSessionService.loadSession(this.sessionId);

      if (
        sessionData &&
        sessionData.creds &&
        sessionData.creds.noiseKey &&
        sessionData.creds.signedIdentityKey &&
        sessionData.creds.registrationId
      ) {
        creds = this._fromPlain(sessionData.creds);
        storedKeys = sessionData.keys || {};
        console.log(`✅ Estado DB carregado para sessão: ${this.sessionId}`);
      } else {
        console.log(`🆕 Iniciando nova sessão: ${this.sessionId}`);
        creds = initAuthCreds();
        await WhatsAppSessionService.saveSession(this.sessionId, {
          creds: this._toPlain(creds),
          keys: {},
        });
      }
    } catch (error) {
      console.error(`❌ Erro ao carregar sessão ${this.sessionId}:`, error.message);
      creds = initAuthCreds();
    }

    // ─── Raw Signal Key Store com persistência no banco ───────────────────────
    const self = this;

    const rawKeyStore = {
      get: async (type, ids) => {
        const result = {};
        for (const id of ids) {
          const raw = storedKeys[`${type}-${id}`];
          if (raw !== undefined && raw !== null) {
            result[id] = self._fromPlain(raw);
          }
        }
        return result;
      },
      set: async (data) => {
        let changed = false;
        for (const [type, typeData] of Object.entries(data)) {
          for (const [id, value] of Object.entries(typeData)) {
            const key = `${type}-${id}`;
            if (value !== undefined && value !== null) {
              storedKeys[key] = self._toPlain(value);
              changed = true;
            } else if (storedKeys[key] !== undefined) {
              delete storedKeys[key];
              changed = true;
            }
          }
        }
        if (changed) {
          WhatsAppSessionService.saveSession(self.sessionId, {
            creds: self._toPlain(creds),
            keys: storedKeys,
          }).catch((e) => console.error(`❌ Erro ao salvar chaves Signal:`, e.message));
        }
      },
    };

    const keys = makeCacheableSignalKeyStore(rawKeyStore, console);

    const saveCreds = async () => {
      try {
        await WhatsAppSessionService.saveSession(this.sessionId, {
          creds: this._toPlain(creds),
          keys: storedKeys,
        });
        console.log(`💾 Credenciais salvas para sessão: ${this.sessionId}`);
      } catch (error) {
        console.error(`❌ Erro ao salvar credenciais da sessão ${this.sessionId}:`, error.message);
      }
    };

    return { state: { creds, keys }, saveCreds };
  }

  /**
   * Atualiza status da sessão no banco
   */
  async updateSessionStatus(status, additionalData = {}) {
    try {
      const { WhatsappSession } = require('../models');
      
      // Garantir que sempre temos um campo data válido
      const updateData = {
        id: this.sessionId,
        status,
        lastActivity: new Date(),
        ...additionalData,
      };

      const existingSession = await WhatsappSession.findByPk(this.sessionId);
      if (existingSession) {
        await existingSession.update(updateData);
      } else {
        await WhatsappSession.upsert({ ...updateData, data: { creds: {}, keys: {} } });
      }

      console.log(`📊 Status da sessão ${this.sessionId} → ${status}`);
    } catch (error) {
      console.error(`❌ Erro ao atualizar status da sessão ${this.sessionId}:`, error.message);
    }
  }

  async markAsAuthenticated(phoneNumber = null) {
    await this.updateSessionStatus('active', { isAuthenticated: true, phoneNumber });
  }

  async markAsDisconnected() {
    await this.updateSessionStatus('inactive', { isAuthenticated: false });
  }

  async markAsConnecting() {
    await this.updateSessionStatus('connecting');
  }

  async markAsError() {
    await this.updateSessionStatus('error', { isAuthenticated: false });
  }

  async deleteSession() {
    try {
      await WhatsAppSessionService.deleteSession(this.sessionId);
      console.log(`🗑️ Sessão ${this.sessionId} removida`);
    } catch (error) {
      console.error(`❌ Erro ao remover sessão ${this.sessionId}:`, error.message);
      throw error;
    }
  }

  async resetSession() {
    try {
      await WhatsAppSessionService.deleteSession(this.sessionId);
      console.log(`🔄 Sessão ${this.sessionId} resetada`);
    } catch (error) {
      console.error(`❌ Erro ao resetar sessão ${this.sessionId}:`, error.message);
      throw error;
    }
  }

  async getSessionInfo() {
    return WhatsAppSessionService.getSessionInfo(this.sessionId);
  }
}

module.exports = BaileysAuthStateAdapter;
