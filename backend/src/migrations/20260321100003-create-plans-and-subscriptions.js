'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Criar tabela plans
    await queryInterface.createTable('plans', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      nome: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      slug: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      descricao: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      preco_mensal: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
      },
      preco_anual: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
      },
      max_clientes: {
        type: Sequelize.INTEGER,
        defaultValue: 50
      },
      max_usuarios: {
        type: Sequelize.INTEGER,
        defaultValue: 2
      },
      max_imoveis: {
        type: Sequelize.INTEGER,
        defaultValue: 20
      },
      max_alugueis: {
        type: Sequelize.INTEGER,
        defaultValue: 10
      },
      has_whatsapp: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      has_pagamentos: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      has_ai_analysis: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      has_relatorios_avancados: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      has_multi_usuarios: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      has_api_access: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      has_suporte_prioritario: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      has_dominio_customizado: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      features_extras: {
        type: Sequelize.JSONB,
        defaultValue: {}
      },
      ativo: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      ordem: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      trial_dias: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // 2. Criar tabela subscriptions
    await queryInterface.createTable('subscriptions', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      tenant_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'tenants',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      plan_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'plans',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      status: {
        type: Sequelize.ENUM('trialing', 'active', 'past_due', 'canceled', 'suspended'),
        defaultValue: 'trialing',
        allowNull: false
      },
      ciclo: {
        type: Sequelize.ENUM('mensal', 'anual'),
        defaultValue: 'mensal',
        allowNull: false
      },
      data_inicio: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      data_fim: {
        type: Sequelize.DATE,
        allowNull: true
      },
      data_fim_trial: {
        type: Sequelize.DATE,
        allowNull: true
      },
      valor: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      gateway_subscription_id: {
        type: Sequelize.STRING,
        allowNull: true
      },
      gateway_customer_id: {
        type: Sequelize.STRING,
        allowNull: true
      },
      gateway: {
        type: Sequelize.STRING,
        allowNull: true
      },
      proximo_pagamento: {
        type: Sequelize.DATE,
        allowNull: true
      },
      tentativas_cobranca: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      cancelado_em: {
        type: Sequelize.DATE,
        allowNull: true
      },
      motivo_cancelamento: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      metadata: {
        type: Sequelize.JSONB,
        defaultValue: {}
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // 3. Índices
    await queryInterface.addIndex('subscriptions', ['tenant_id'], {
      name: 'idx_subscriptions_tenant_id'
    });
    await queryInterface.addIndex('subscriptions', ['plan_id'], {
      name: 'idx_subscriptions_plan_id'
    });
    await queryInterface.addIndex('subscriptions', ['status'], {
      name: 'idx_subscriptions_status'
    });

    // 4. Inserir planos padrão
    await queryInterface.bulkInsert('plans', [
      {
        nome: 'Free',
        slug: 'free',
        descricao: 'Plano gratuito para começar. Ideal para testar a plataforma.',
        preco_mensal: 0,
        preco_anual: 0,
        max_clientes: 50,
        max_usuarios: 2,
        max_imoveis: 20,
        max_alugueis: 10,
        has_whatsapp: false,
        has_pagamentos: false,
        has_ai_analysis: false,
        has_relatorios_avancados: false,
        has_multi_usuarios: false,
        has_api_access: false,
        has_suporte_prioritario: false,
        has_dominio_customizado: false,
        features_extras: '{}',
        ativo: true,
        ordem: 1,
        trial_dias: 0,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        nome: 'Basic',
        slug: 'basic',
        descricao: 'Para escritórios em crescimento. Inclui pagamentos e relatórios.',
        preco_mensal: 97.00,
        preco_anual: 970.00,
        max_clientes: 500,
        max_usuarios: 10,
        max_imoveis: 100,
        max_alugueis: 50,
        has_whatsapp: false,
        has_pagamentos: true,
        has_ai_analysis: false,
        has_relatorios_avancados: true,
        has_multi_usuarios: true,
        has_api_access: false,
        has_suporte_prioritario: false,
        has_dominio_customizado: false,
        features_extras: '{}',
        ativo: true,
        ordem: 2,
        trial_dias: 14,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        nome: 'Professional',
        slug: 'professional',
        descricao: 'Para imobiliárias completas. Todos os recursos incluídos.',
        preco_mensal: 197.00,
        preco_anual: 1970.00,
        max_clientes: 0,
        max_usuarios: 0,
        max_imoveis: 0,
        max_alugueis: 0,
        has_whatsapp: true,
        has_pagamentos: true,
        has_ai_analysis: true,
        has_relatorios_avancados: true,
        has_multi_usuarios: true,
        has_api_access: true,
        has_suporte_prioritario: true,
        has_dominio_customizado: true,
        features_extras: '{}',
        ativo: true,
        ordem: 3,
        trial_dias: 14,
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);

    // 5. Criar assinatura Professional para o tenant padrão (Empresa 1)
    await queryInterface.bulkInsert('subscriptions', [{
      tenant_id: 1,
      plan_id: 3, // Professional
      status: 'active',
      ciclo: 'anual',
      data_inicio: new Date(),
      data_fim: null, // Sem expiração para o super admin
      valor: 0, // Gratuito para o dono da plataforma
      gateway: null,
      tentativas_cobranca: 0,
      metadata: JSON.stringify({ tipo: 'super_admin', sem_cobranca: true }),
      created_at: new Date(),
      updated_at: new Date()
    }]);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('subscriptions');
    await queryInterface.dropTable('plans');
  }
};
