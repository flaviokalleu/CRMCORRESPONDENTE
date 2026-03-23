'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('tenants', 'use_custom_modules', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      comment: 'Se true, usa flags do tenant; se false, herda do plano'
    });

    // Limites customizáveis por tenant (override do plano)
    await queryInterface.addColumn('tenants', 'max_clientes', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'Override do limite do plano. NULL = usa do plano, 0 = ilimitado'
    });
    await queryInterface.addColumn('tenants', 'max_usuarios', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'Override do limite do plano. NULL = usa do plano, 0 = ilimitado'
    });
    await queryInterface.addColumn('tenants', 'max_imoveis', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'Override do limite do plano. NULL = usa do plano, 0 = ilimitado'
    });
    await queryInterface.addColumn('tenants', 'max_alugueis', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'Override do limite do plano. NULL = usa do plano, 0 = ilimitado'
    });

    // Módulos booleanos (override do plano quando use_custom_modules=true)
    const moduleColumns = [
      'has_whatsapp',
      'has_pagamentos',
      'has_ai_analysis',
      'has_relatorios_avancados',
      'has_multi_usuarios',
      'has_api_access',
      'has_suporte_prioritario',
      'has_dominio_customizado'
    ];

    for (const col of moduleColumns) {
      await queryInterface.addColumn('tenants', col, {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        defaultValue: null,
        comment: 'Override do plano quando use_custom_modules=true'
      });
    }
  },

  async down(queryInterface) {
    const columns = [
      'use_custom_modules',
      'max_clientes', 'max_usuarios', 'max_imoveis', 'max_alugueis',
      'has_whatsapp', 'has_pagamentos', 'has_ai_analysis',
      'has_relatorios_avancados', 'has_multi_usuarios', 'has_api_access',
      'has_suporte_prioritario', 'has_dominio_customizado'
    ];

    for (const col of columns) {
      await queryInterface.removeColumn('tenants', col);
    }
  }
};
