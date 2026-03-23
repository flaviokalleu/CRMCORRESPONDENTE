'use strict';

const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Plan extends Model {
    static associate(models) {
      Plan.hasMany(models.Subscription, {
        foreignKey: 'plan_id',
        as: 'subscriptions'
      });
    }
  }

  Plan.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    nome: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    slug: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    descricao: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    preco_mensal: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    },
    preco_anual: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    },
    // Limites
    max_clientes: {
      type: DataTypes.INTEGER,
      defaultValue: 50,
      comment: '0 = ilimitado'
    },
    max_usuarios: {
      type: DataTypes.INTEGER,
      defaultValue: 2,
      comment: '0 = ilimitado'
    },
    max_imoveis: {
      type: DataTypes.INTEGER,
      defaultValue: 20,
      comment: '0 = ilimitado'
    },
    max_alugueis: {
      type: DataTypes.INTEGER,
      defaultValue: 10,
      comment: '0 = ilimitado'
    },
    // Features booleanas
    has_whatsapp: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    has_pagamentos: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    has_ai_analysis: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    has_relatorios_avancados: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    has_multi_usuarios: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    has_api_access: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    has_suporte_prioritario: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    has_dominio_customizado: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    // Limites de storage
    max_storage_mb: {
      type: DataTypes.INTEGER,
      defaultValue: 500,
      comment: 'Limite de armazenamento em MB. 0 = ilimitado'
    },
    max_file_size_mb: {
      type: DataTypes.INTEGER,
      defaultValue: 10,
      comment: 'Tamanho máximo por arquivo em MB'
    },
    // Features extras em JSON
    features_extras: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Features adicionais configuráveis'
    },
    ativo: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    ordem: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Ordem de exibição na página de preços'
    },
    trial_dias: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Dias de trial gratuito (0 = sem trial)'
    }
  }, {
    sequelize,
    modelName: 'Plan',
    tableName: 'plans',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return Plan;
};
