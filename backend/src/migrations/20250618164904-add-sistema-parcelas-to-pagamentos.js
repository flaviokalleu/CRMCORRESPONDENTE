'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('🔄 Adicionando campos do sistema de parcelas...');

    // ✅ ADICIONAR TODOS OS NOVOS CAMPOS PARA SISTEMA DE PARCELAS
    await queryInterface.addColumn('pagamentos', 'parcela_atual', {
      type: Sequelize.INTEGER,
      defaultValue: 1,
      allowNull: false,
      comment: 'Número da parcela atual (1, 2, 3...)'
    });

    await queryInterface.addColumn('pagamentos', 'pagamento_pai_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'ID do pagamento principal (se for uma parcela)',
      references: {
        model: 'pagamentos',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    await queryInterface.addColumn('pagamentos', 'is_parcelado', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false,
      comment: 'Se é um pagamento parcelado'
    });

    await queryInterface.addColumn('pagamentos', 'data_envio_proxima_parcela', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Data para envio da próxima parcela'
    });

    await queryInterface.addColumn('pagamentos', 'juros_mp', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Juros calculados pelo Mercado Pago'
    });

    await queryInterface.addColumn('pagamentos', 'valor_com_juros', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Valor total com juros do MP'
    });

    await queryInterface.addColumn('pagamentos', 'link_unico', {
      type: Sequelize.STRING,
      allowNull: true,
      unique: true,
      comment: 'Link único para esta parcela específica'
    });

    // ✅ ADICIONAR NOVO TIPO 'universal' AO ENUM 'tipo'
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_pagamentos_tipo" ADD VALUE 'universal';
    `);

    // ✅ ADICIONAR NOVO STATUS 'aguardando' AO ENUM 'status'
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_pagamentos_status" ADD VALUE 'aguardando';
    `);

    // ✅ CRIAR ÍNDICES PARA PERFORMANCE
    await queryInterface.addIndex('pagamentos', ['parcela_atual'], {
      name: 'idx_pagamentos_parcela_atual'
    });

    await queryInterface.addIndex('pagamentos', ['pagamento_pai_id'], {
      name: 'idx_pagamentos_pagamento_pai_id'
    });

    await queryInterface.addIndex('pagamentos', ['is_parcelado'], {
      name: 'idx_pagamentos_is_parcelado'
    });

    await queryInterface.addIndex('pagamentos', ['data_envio_proxima_parcela'], {
      name: 'idx_pagamentos_data_envio_proxima_parcela'
    });

    await queryInterface.addIndex('pagamentos', ['link_unico'], {
      name: 'idx_pagamentos_link_unico',
      unique: true
    });

    console.log('✅ Sistema de parcelas adicionado com sucesso!');
  },

  async down(queryInterface, Sequelize) {
    console.log('🔄 Removendo campos do sistema de parcelas...');

    // ✅ REMOVER ÍNDICES
    await queryInterface.removeIndex('pagamentos', 'idx_pagamentos_parcela_atual');
    await queryInterface.removeIndex('pagamentos', 'idx_pagamentos_pagamento_pai_id');
    await queryInterface.removeIndex('pagamentos', 'idx_pagamentos_is_parcelado');
    await queryInterface.removeIndex('pagamentos', 'idx_pagamentos_data_envio_proxima_parcela');
    await queryInterface.removeIndex('pagamentos', 'idx_pagamentos_link_unico');

    // ✅ REMOVER COLUNAS
    await queryInterface.removeColumn('pagamentos', 'link_unico');
    await queryInterface.removeColumn('pagamentos', 'valor_com_juros');
    await queryInterface.removeColumn('pagamentos', 'juros_mp');
    await queryInterface.removeColumn('pagamentos', 'data_envio_proxima_parcela');
    await queryInterface.removeColumn('pagamentos', 'is_parcelado');
    await queryInterface.removeColumn('pagamentos', 'pagamento_pai_id');
    await queryInterface.removeColumn('pagamentos', 'parcela_atual');

    // ⚠️ NOTA: Não é possível remover valores do ENUM facilmente no PostgreSQL
    // Os valores 'universal' e 'aguardando' permanecerão no banco
    
    console.log('✅ Campos do sistema de parcelas removidos!');
  }
};