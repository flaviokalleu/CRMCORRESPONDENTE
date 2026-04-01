'use strict';

const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Tenant extends Model {
    static associate(models) {
      Tenant.hasMany(models.User, {
        foreignKey: 'tenant_id',
        as: 'users'
      });
      Tenant.hasMany(models.Cliente, {
        foreignKey: 'tenant_id',
        as: 'clientes'
      });
      Tenant.hasMany(models.Imovel, {
        foreignKey: 'tenant_id',
        as: 'imoveis'
      });
      Tenant.hasMany(models.Aluguel, {
        foreignKey: 'tenant_id',
        as: 'alugueis'
      });
      Tenant.hasMany(models.Pagamento, {
        foreignKey: 'tenant_id',
        as: 'pagamentos'
      });
      if (models.Subscription) {
        Tenant.hasMany(models.Subscription, {
          foreignKey: 'tenant_id',
          as: 'subscriptions'
        });
      }
    }
  }

  Tenant.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    nome: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Nome do tenant é obrigatório' }
      }
    },
    slug: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: { msg: 'Slug é obrigatório' },
        is: {
          args: /^[a-z0-9-]+$/,
          msg: 'Slug deve conter apenas letras minúsculas, números e hífens'
        }
      }
    },
    cnpj: {
      type: DataTypes.STRING(18),
      allowNull: true,
      unique: true
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isEmail: { msg: 'Email inválido' }
      }
    },
    telefone: {
      type: DataTypes.STRING,
      allowNull: true
    },
    logo: {
      type: DataTypes.STRING,
      allowNull: true
    },
    ativo: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    configuracoes: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Configurações específicas do tenant (cores, preferências, etc)'
    },
    dominio_customizado: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
      comment: 'Domínio personalizado do tenant (ex: crm.minhaempresa.com.br)'
    },
    endereco: {
      type: DataTypes.STRING,
      allowNull: true
    },
    cidade: {
      type: DataTypes.STRING,
      allowNull: true
    },
    estado: {
      type: DataTypes.STRING(2),
      allowNull: true
    },
    cep: {
      type: DataTypes.STRING(10),
      allowNull: true
    },
    // === Módulos customizáveis (padrão Evoticket) ===
    use_custom_modules: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Se true, usa flags do tenant; se false, herda do plano'
    },
    // Limites (override do plano, NULL = usa do plano, 0 = ilimitado)
    max_clientes: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    max_usuarios: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    max_imoveis: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    max_alugueis: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    // Features booleanas (override quando use_custom_modules=true)
    has_whatsapp: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: null
    },
    has_pagamentos: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: null
    },
    has_ai_analysis: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: null
    },
    has_relatorios_avancados: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: null
    },
    has_multi_usuarios: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: null
    },
    has_api_access: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: null
    },
    has_suporte_prioritario: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: null
    },
    has_dominio_customizado: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: null
    },
    // Storage
    max_storage_mb: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Override do limite do plano. NULL = usa do plano, 0 = ilimitado'
    },
    max_file_size_mb: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Override do limite do plano. NULL = usa do plano'
    },
    storage_used_bytes: {
      type: DataTypes.BIGINT,
      defaultValue: 0,
      comment: 'Bytes usados atualmente pelo tenant'
    },
    // === Integração Asaas (por tenant) ===
    asaas_api_key: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Chave de API do Asaas deste tenant'
    },
    asaas_webhook_token: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Token de validação do webhook Asaas deste tenant'
    }
  }, {
    sequelize,
    modelName: 'Tenant',
    tableName: 'tenants',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return Tenant;
};
