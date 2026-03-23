'use strict';

const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Subscription extends Model {
    static associate(models) {
      Subscription.belongsTo(models.Tenant, {
        foreignKey: 'tenant_id',
        as: 'tenant'
      });
      Subscription.belongsTo(models.Plan, {
        foreignKey: 'plan_id',
        as: 'plan'
      });
    }

    isActive() {
      if (this.status !== 'active' && this.status !== 'trialing') return false;
      if (this.data_fim && new Date(this.data_fim) < new Date()) return false;
      return true;
    }

    isTrialing() {
      return this.status === 'trialing' && new Date(this.data_fim_trial) >= new Date();
    }

    daysRemaining() {
      const end = this.data_fim || this.data_fim_trial;
      if (!end) return null;
      const diff = new Date(end) - new Date();
      return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    }
  }

  Subscription.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    tenant_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'tenants',
        key: 'id'
      }
    },
    plan_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'plans',
        key: 'id'
      }
    },
    status: {
      type: DataTypes.ENUM('trialing', 'active', 'past_due', 'canceled', 'suspended'),
      defaultValue: 'trialing',
      allowNull: false
    },
    ciclo: {
      type: DataTypes.ENUM('mensal', 'anual'),
      defaultValue: 'mensal',
      allowNull: false
    },
    data_inicio: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    data_fim: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Data de término da assinatura atual'
    },
    data_fim_trial: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Data de término do trial gratuito'
    },
    valor: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Valor da assinatura no momento da contratação'
    },
    gateway_subscription_id: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'ID da assinatura no gateway de pagamento (Asaas/MercadoPago)'
    },
    gateway_customer_id: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'ID do cliente no gateway de pagamento'
    },
    gateway: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Gateway utilizado (asaas, mercadopago, stripe)'
    },
    proximo_pagamento: {
      type: DataTypes.DATE,
      allowNull: true
    },
    tentativas_cobranca: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Número de tentativas de cobrança falhadas'
    },
    cancelado_em: {
      type: DataTypes.DATE,
      allowNull: true
    },
    motivo_cancelamento: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Dados extras do gateway ou informações adicionais'
    }
  }, {
    sequelize,
    modelName: 'Subscription',
    tableName: 'subscriptions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return Subscription;
};
