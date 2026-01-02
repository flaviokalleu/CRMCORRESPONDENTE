const fs = require('fs');
const path = require('path');

/**
 * Gerenciador de sessões WhatsApp usando sistema de arquivos
 * Mais simples e confiável que banco de dados para dados do Baileys
 */
class WhatsAppFileSessionManager {
  constructor() {
    this.basePath = path.resolve(__dirname, '../../whatsapp_sessions');
    this.ensureBasePath();
  }

  /**
   * Garante que o diretório base existe
   */
  ensureBasePath() {
    if (!fs.existsSync(this.basePath)) {
      fs.mkdirSync(this.basePath, { recursive: true });
      console.log(`📁 Diretório de sessões criado: ${this.basePath}`);
    }
  }

  /**
   * Obtém o caminho da sessão
   * @param {string} sessionId - ID da sessão
   * @returns {string} - Caminho da sessão
   */
  getSessionPath(sessionId) {
    return path.join(this.basePath, sessionId);
  }

  /**
   * Cria uma nova sessão
   * @param {string} sessionId - ID da sessão
   * @param {boolean} force - Forçar criação mesmo se existir
   * @returns {boolean} - Sucesso da operação
   */
  async createSession(sessionId, force = false) {
    try {
      const sessionPath = this.getSessionPath(sessionId);
      
      if (fs.existsSync(sessionPath) && !force) {
        console.log(`⚠️ Sessão ${sessionId} já existe`);
        return false;
      }

      // Remover sessão existente se force=true
      if (fs.existsSync(sessionPath) && force) {
        fs.rmSync(sessionPath, { recursive: true, force: true });
        console.log(`🧹 Sessão ${sessionId} removida para recriação`);
      }

      // Criar diretório da sessão
      fs.mkdirSync(sessionPath, { recursive: true });
      
      // Criar arquivo de info da sessão
      const sessionInfo = {
        id: sessionId,
        createdAt: new Date().toISOString(),
        status: 'created',
        isAuthenticated: false,
        phoneNumber: null
      };
      
      fs.writeFileSync(
        path.join(sessionPath, 'session_info.json'),
        JSON.stringify(sessionInfo, null, 2)
      );
      
      console.log(`✅ Sessão ${sessionId} criada em ${sessionPath}`);
      return true;
    } catch (error) {
      console.error(`❌ Erro ao criar sessão ${sessionId}:`, error);
      return false;
    }
  }

  /**
   * Deleta uma sessão
   * @param {string} sessionId - ID da sessão
   * @returns {boolean} - Sucesso da operação
   */
  async deleteSession(sessionId) {
    try {
      const sessionPath = this.getSessionPath(sessionId);
      
      if (!fs.existsSync(sessionPath)) {
        console.log(`⚠️ Sessão ${sessionId} não encontrada`);
        return false;
      }

      fs.rmSync(sessionPath, { recursive: true, force: true });
      console.log(`🗑️ Sessão ${sessionId} deletada`);
      return true;
    } catch (error) {
      console.error(`❌ Erro ao deletar sessão ${sessionId}:`, error);
      return false;
    }
  }

  /**
   * Lista todas as sessões
   * @returns {Array} - Lista de sessões
   */
  async listSessions() {
    try {
      if (!fs.existsSync(this.basePath)) {
        return [];
      }

      const sessionDirs = fs.readdirSync(this.basePath, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

      const sessions = [];
      
      for (const sessionId of sessionDirs) {
        const sessionInfo = await this.getSessionInfo(sessionId);
        if (sessionInfo) {
          sessions.push(sessionInfo);
        }
      }

      return sessions;
    } catch (error) {
      console.error('❌ Erro ao listar sessões:', error);
      return [];
    }
  }

  /**
   * Obtém informações de uma sessão
   * @param {string} sessionId - ID da sessão
   * @returns {object|null} - Informações da sessão
   */
  async getSessionInfo(sessionId) {
    try {
      const sessionPath = this.getSessionPath(sessionId);
      const infoPath = path.join(sessionPath, 'session_info.json');
      
      if (!fs.existsSync(infoPath)) {
        return null;
      }

      const info = JSON.parse(fs.readFileSync(infoPath, 'utf8'));
      
      // Verificar se tem credenciais do Baileys
      const credsPath = path.join(sessionPath, 'creds.json');
      info.hasCredentials = fs.existsSync(credsPath);
      
      return info;
    } catch (error) {
      console.error(`❌ Erro ao obter info da sessão ${sessionId}:`, error);
      return null;
    }
  }

  /**
   * Atualiza informações de uma sessão
   * @param {string} sessionId - ID da sessão
   * @param {object} updates - Atualizações
   */
  async updateSessionInfo(sessionId, updates) {
    try {
      const sessionPath = this.getSessionPath(sessionId);
      const infoPath = path.join(sessionPath, 'session_info.json');
      
      let info = {};
      if (fs.existsSync(infoPath)) {
        info = JSON.parse(fs.readFileSync(infoPath, 'utf8'));
      }

      // Aplicar atualizações
      Object.assign(info, updates, {
        updatedAt: new Date().toISOString()
      });

      fs.writeFileSync(infoPath, JSON.stringify(info, null, 2));
      console.log(`📊 Info da sessão ${sessionId} atualizada`);
    } catch (error) {
      console.error(`❌ Erro ao atualizar info da sessão ${sessionId}:`, error);
    }
  }

  /**
   * Verifica se uma sessão existe
   * @param {string} sessionId - ID da sessão
   * @returns {boolean} - Se a sessão existe
   */
  sessionExists(sessionId) {
    return fs.existsSync(this.getSessionPath(sessionId));
  }

  /**
   * Limpa sessões antigas (mais de 30 dias sem atividade)
   * @returns {number} - Número de sessões removidas
   */
  async cleanOldSessions() {
    try {
      const sessions = await this.listSessions();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      let deletedCount = 0;

      for (const session of sessions) {
        const lastActivity = new Date(session.updatedAt || session.createdAt);
        
        if (lastActivity < thirtyDaysAgo) {
          await this.deleteSession(session.id);
          deletedCount++;
        }
      }

      console.log(`🧹 ${deletedCount} sessões antigas removidas`);
      return deletedCount;
    } catch (error) {
      console.error('❌ Erro ao limpar sessões antigas:', error);
      return 0;
    }
  }

  /**
   * Reset completo de uma sessão (remove todos os dados)
   * @param {string} sessionId - ID da sessão
   */
  async resetSession(sessionId) {
    try {
      await this.deleteSession(sessionId);
      await this.createSession(sessionId, true);
      console.log(`🔄 Sessão ${sessionId} resetada completamente`);
    } catch (error) {
      console.error(`❌ Erro ao resetar sessão ${sessionId}:`, error);
    }
  }

  /**
   * Backup de uma sessão
   * @param {string} sessionId - ID da sessão
   * @param {string} backupPath - Caminho do backup
   */
  async backupSession(sessionId, backupPath = null) {
    try {
      const sessionPath = this.getSessionPath(sessionId);
      
      if (!fs.existsSync(sessionPath)) {
        console.log(`⚠️ Sessão ${sessionId} não encontrada para backup`);
        return false;
      }

      const defaultBackupPath = path.join(this.basePath, '..', 'backups');
      const finalBackupPath = backupPath || defaultBackupPath;
      
      if (!fs.existsSync(finalBackupPath)) {
        fs.mkdirSync(finalBackupPath, { recursive: true });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupDir = path.join(finalBackupPath, `${sessionId}_${timestamp}`);
      
      // Copiar recursivamente
      fs.cpSync(sessionPath, backupDir, { recursive: true });
      
      console.log(`💾 Backup da sessão ${sessionId} criado em ${backupDir}`);
      return true;
    } catch (error) {
      console.error(`❌ Erro ao fazer backup da sessão ${sessionId}:`, error);
      return false;
    }
  }
}

module.exports = WhatsAppFileSessionManager;
