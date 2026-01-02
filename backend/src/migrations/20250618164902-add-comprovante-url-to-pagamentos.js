'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('pagamentos', 'comprovante_url', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'URL do comprovante oficial do Mercado Pago'
    });
    
    console.log('✅ Campo comprovante_url adicionado à tabela Pagamentos');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('pagamentos', 'comprovante_url');
    console.log('❌ Campo comprovante_url removido da tabela Pagamentos');
  }
};