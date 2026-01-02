'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // Primeiro, limpar tokens duplicados se existirem
      await queryInterface.sequelize.query(`
        DELETE FROM tokens 
        WHERE id NOT IN (
          SELECT MIN(id) 
          FROM tokens 
          GROUP BY token
        )
      `);

      // Adicionar constraint de unicidade para token
      await queryInterface.addConstraint('tokens', {
        fields: ['token'],
        type: 'unique',
        name: 'tokens_token_unique'
      });

      // Adicionar constraint de unicidade para refresh_token (se não for null)
      await queryInterface.addConstraint('tokens', {
        fields: ['refresh_token'],
        type: 'unique',
        name: 'tokens_refresh_token_unique'
      });

    } catch (error) {
      console.log('Erro ao adicionar constraints:', error.message);
      // Se as constraints já existem, continuar
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      await queryInterface.removeConstraint('tokens', 'tokens_token_unique');
      await queryInterface.removeConstraint('tokens', 'tokens_refresh_token_unique');
    } catch (error) {
      console.log('Erro ao remover constraints:', error.message);
    }
  }
};