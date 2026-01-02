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
   * Limpa sessões antigas (mais de 30 dias)
   * @returns {number} - Número de sessões removidas
   */
  static async cleanOldSessions() {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const deleted = await WhatsappSession.destroy({
        where: {
          updatedAt: {
            [require('sequelize').Op.lt]: thirtyDaysAgo
          }
        }
      });

      if (deleted > 0) {
        console.log(`✅ ${deleted} sessões antigas removidas`);
      }
      
      return deleted;
    } catch (error) {
      console.error('❌ Erro ao limpar sessões antigas:', error);
      return 0;
    }
  }

  /**
   * Migra sessões do sistema de arquivos para o banco de dados
   * @param {string} sessionDir - Diretório das sessões
   */
  static async migrateFromFiles(sessionDir) {
    try {
      if (!fs.existsSync(sessionDir)) {
        console.log('⚠️ Diretório de sessões não existe');
        return;
      }

      const files = fs.readdirSync(sessionDir);
      const sessionFiles = files.filter(file => file.startsWith('creds.') || file === 'creds.json');
      
      for (const file of sessionFiles) {
        try {
          const filePath = path.join(sessionDir, file);
          const sessionData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          
          // Usar nome do arquivo como sessionId (sem extensão)
          const sessionId = file.replace('.json', '').replace('creds.', '') || 'default';
          
          await this.saveSession(sessionId, sessionData);
          console.log(`✅ Sessão migrada: ${file} -> ${sessionId}`);
        } catch (error) {
          console.error(`❌ Erro ao migrar sessão ${file}:`, error);
        }
      }

      console.log('✅ Migração de sessões concluída');
    } catch (error) {
      console.error('❌ Erro na migração de sessões:', error);
    }
  }

  /**
   * Backup de sessão para arquivo (fallback)
   * @param {string} sessionId - ID da sessão
   * @param {string} backupDir - Diretório de backup
   */
  static async backupSession(sessionId, backupDir) {
    try {
      const sessionData = await this.loadSession(sessionId);
      if (!sessionData) {
        console.log(`⚠️ Sessão ${sessionId} não encontrada para backup`);
        return false;
      }

      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      const backupFile = path.join(backupDir, `${sessionId}.json`);
      fs.writeFileSync(backupFile, JSON.stringify(sessionData, null, 2));
      
      console.log(`✅ Backup da sessão ${sessionId} criado em ${backupFile}`);
      return true;
    } catch (error) {
      console.error(`❌ Erro ao fazer backup da sessão ${sessionId}:`, error);
      return false;
    }
  }
}

module.exports = WhatsAppSessionService;
