'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('pagamentos', 'valor_original', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Valor original sem juros (formatado)'
    });
    await queryInterface.addColumn('pagamentos', 'valor_original_numerico', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Valor original sem juros (numérico)'
    });
    await queryInterface.addColumn('pagamentos', 'juros_total', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Total de juros (formatado)'
    });
    await queryInterface.addColumn('pagamentos', 'juros_total_numerico', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Total de juros (numérico)'
    });
    await queryInterface.addColumn('pagamentos', 'taxa_juros', {
      type: Sequelize.DECIMAL(5, 2),
      allowNull: true,
      comment: 'Taxa de juros em percentual'
    });
    await queryInterface.addColumn('pagamentos', 'calculo_mp', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      comment: 'Se foi calculado pela API do Mercado Pago'
    });
    console.log('✅ Campos de juros e valor_original adicionados à tabela Pagamentos');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('pagamentos', 'valor_original');
    await queryInterface.removeColumn('pagamentos', 'valor_original_numerico');
    await queryInterface.removeColumn('pagamentos', 'juros_total');
    await queryInterface.removeColumn('pagamentos', 'juros_total_numerico');
    await queryInterface.removeColumn('pagamentos', 'taxa_juros');
    await queryInterface.removeColumn('pagamentos', 'calculo_mp');
    console.log('❌ Campos de juros e valor_original removidos da tabela Pagamentos');
  }
};