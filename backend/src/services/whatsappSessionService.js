const { WhatsappSession } = require('../models');
const fs = require('fs');
const path = require('path');

class WhatsAppSessionService {
  /**
   * Salva dados da sessão no banco de dados
   * @param {string} sessionId - ID da sessão
   * @param {object} sessionData - Dados da sessão
   */
  static async saveSession(sessionId, sessionData) {
    try {
      await WhatsappSession.upsert({
        id: sessionId,
        data: sessionData,
        updatedAt: new Date()
      });
      console.log(`✅ Sessão ${sessionId} salva no banco de dados`);
    } catch (error) {
      console.error(`❌ Erro ao salvar sessão ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Carrega dados da sessão do banco de dados
   * @param {string} sessionId - ID da sessão
   * @returns {object|null} - Dados da sessão ou null se não encontrada
   */
  static async loadSession(sessionId) {
    try {
      const session = await WhatsappSession.findByPk(sessionId);
      if (session) {
        console.log(`✅ Sessão ${sessionId} carregada do banco de dados`);
        return session.data;
      }
      console.log(`⚠️ Sessão ${sessionId} não encontrada no banco de dados`);
      return null;
    } catch (error) {
      console.error(`❌ Erro ao carregar sessão ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Remove sessão do banco de dados
   * @param {string} sessionId - ID da sessão
   */
  static async deleteSession(sessionId) {
    try {
      const deleted = await WhatsappSession.destroy({
        where: { id: sessionId }
      });
      
      if (deleted > 0) {
        console.log(`✅ Sessão ${sessionId} removida do banco de dados`);
      } else {
        console.log(`⚠️ Sessão ${sessionId} não encontrada para remoção`);
      }
      
      return deleted > 0;
    } catch (error) {
      console.error(`❌ Erro ao remover sessão ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Lista todas as sessões ativas
   * @returns {Array} - Lista de sessões
   */
  static async listSessions() {
    try {
      const sessions = await WhatsappSession.findAll({
        attributes: ['id', 'updatedAt'],
        order: [['updatedAt', 'DESC']]
      });
      
      console.log(`✅ ${sessions.length} sessões encontradas no banco`);
      return sessions;
    } catch (error) {
      console.error('❌ Erro ao listar sessões:', error);
      throw error;
    }
  }

  /**
   * Verifica se uma sessão existe
   * @param {string} sessionId - ID da sessão
   * @returns {boolean} - true se a sessão existe
   */
  static async sessionExists(sessionId) {
    try {
      const count = await WhatsappSession.count({
        where: { id: sessionId }
      });
      return count > 0;
    } catch (error) {
      console.error(`❌ Erro ao verificar sessão ${sessionId}:`, error);
      return false;
    }
  }

  /**
   * Cria uma nova sessão no banco (estado inicial limpo).
   * Se force=true, remove a sessão existente antes de criar.
   */
  static async createSession(sessionId, force = false) {
    try {
      if (force) {
        await this.deleteSession(sessionId);
      }
      const exists = await this.sessionExists(sessionId);
      if (exists && !force) {
        console.log(`⚠️ Sessão ${sessionId} já existe`);
        return false;
      }
      await WhatsappSession.upsert({
        id: sessionId,
        data: { creds: {}, keys: {} },
        status: 'inactive',
        isAuthenticated: false,
        updatedAt: new Date(),
        createdAt: new Date(),
      });
      console.log(`✅ Sessão ${sessionId} criada no banco`);
      return true;
    } catch (error) {
      console.error(`❌ Erro ao criar sessão ${sessionId}:`, error.message);
      return false;
    }
  }

  /**
   * Reseta uma sessão (apaga credenciais e cria registro limpo).
   */
  static async resetSession(sessionId) {
    try {
      await this.deleteSession(sessionId);
      await this.createSession(sessionId, false);
      console.log(`🔄 Sessão ${sessionId} resetada`);
    } catch (error) {
      console.error(`❌ Erro ao resetar sessão ${sessionId}:`, error.message);
      throw error;
    }
  }

  /**
   * Retorna informações de metadados da sessão (sem os dados de auth).
   */
  static async getSessionInfo(sessionId) {
    try {
      const session = await WhatsappSession.findByPk(sessionId, {
        attributes: ['id', 'status', 'phoneNumber', 'lastActivity', 'isAuthenticated', 'createdAt', 'updatedAt'],
      });
      if (!session) return null;
      return {
        id: session.id,
        status: session.status,
        phoneNumber: session.phoneNumber,
        lastActivity: session.lastActivity,
        isAuthenticated: session.isAuthenticated,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
      };
    } catch (error) {
      console.error(`❌ Erro ao obter info da sessão ${sessionId}:`, error.message);
      return null;
    }
  }

  /**
   * Lista todas as sessões ativas (inclui metadados, sem os dados de auth).
   */
  static async listSessions() {
    try {
      const sessions = await WhatsappSession.findAll({
        attributes: ['id', 'status', 'phoneNumber', 'lastActivity', 'isAuthenticated', 'createdAt', 'updatedAt'],
        order: [['updatedAt', 'DESC']],
      });
      console.log(`✅ ${sessions.length} sessões encontradas no banco`);
      return sessions.map((s) => ({
        id: s.id,
        status: s.status,
        phoneNumber: s.phoneNumber,
        lastActivity: s.lastActivity,
        isAuthenticated: s.isAuthenticated,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      }));
    } catch (error) {
      console.error('❌ Erro ao listar sessões:', error.message);
      throw error;
    }
  }

  /**
   * Lista sessões com status 'active' (para auto-reconexão na inicialização).
   */
  static async listActiveSessions() {
    try {
      const sessions = await WhatsappSession.findAll({
        where: { status: 'active' },
        attributes: ['id', 'status', 'phoneNumber'],
        order: [['updatedAt', 'DESC']],
      });
      return sessions.map((s) => ({ id: s.id, status: s.status, phoneNumber: s.phoneNumber }));
    } catch (error) {
      console.error('❌ Erro ao listar sessões ativas:', error.message);
      return [];
    }
  }

  /**
   * Marca todas as sessões como inativas (usado na inicialização do servidor).
   */
  static async markAllInactive() {
    try {
      await WhatsappSession.update(
        { status: 'inactive', isAuthenticated: false },
        { where: { status: ['active', 'connecting'] } }
      );
    } catch (error) {
      console.error('❌ Erro ao marcar sessões como inativas:', error.message);
    }
  }
}

module.exports = WhatsAppSessionService;
