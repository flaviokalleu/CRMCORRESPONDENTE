'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Laudo extends Model {
    static associate(models) {
      // Associação com User
      Laudo.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user'
      });
    }

    // Método para calcular status baseado no vencimento
    getStatus() {
      const hoje = new Date();
      const vencimento = new Date(this.vencimento);
      const diasParaVencimento = Math.ceil((vencimento - hoje) / (1000 * 60 * 60 * 24));
      
      if (diasParaVencimento < 0) {
        return 'vencido';
      } else if (diasParaVencimento <= 30) {
        return 'vencendo';
      } else {
        return 'vigente';
      }
    }

    // Método para calcular dias para vencimento
    getDiasParaVencimento() {
      const hoje = new Date();
      const vencimento = new Date(this.vencimento);
      return Math.ceil((vencimento - hoje) / (1000 * 60 * 60 * 24));
    }

    // Método para formatar valores monetários
    getValorSolicitadoFormatado() {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(this.valor_solicitado);
    }

    getValorLiberadoFormatado() {
      if (!this.valor_liberado) return null;
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(this.valor_liberado);
    }
  }

  Laudo.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    parceiro: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Parceiro é obrigatório'
        },
        len: {
          args: [2, 255],
          msg: 'Parceiro deve ter entre 2 e 255 caracteres'
        }
      }
    },
    tipo_imovel: {
      type: DataTypes.ENUM('casa', 'apartamento'),
      allowNull: false,
      validate: {
        isIn: {
          args: [['casa', 'apartamento']],
          msg: 'Tipo de imóvel deve ser "casa" ou "apartamento"'
        }
      }
    },
    valor_solicitado: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      validate: {
        isDecimal: {
          msg: 'Valor solicitado deve ser um número decimal'
        },
        min: {
          args: [0.01],
          msg: 'Valor solicitado deve ser maior que zero'
        }
      }
    },
    valor_liberado: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true,
      validate: {
        isDecimal: {
          msg: 'Valor liberado deve ser um número decimal'
        },
        min: {
          args: [0],
          msg: 'Valor liberado deve ser positivo'
        }
      }
    },
    vencimento: {
      type: DataTypes.DATE,
      allowNull: false,
      validate: {
        isDate: {
          msg: 'Vencimento deve ser uma data válida'
        }
      }
    },
    endereco: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Endereço é obrigatório'
        },
        len: {
          args: [5, 1000],
          msg: 'Endereço deve ter entre 5 e 1000 caracteres'
        }
      }
    },
    observacoes: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        len: {
          args: [0, 2000],
          msg: 'Observações não podem ter mais de 2000 caracteres'
        }
      }
    },
    arquivos: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: null
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users', // ✅ CORRIGIDO: 'users' minúsculo
        key: 'id'
      }
    }
  }, {
    sequelize,
    modelName: 'Laudo',
    tableName: 'laudos', // ✅ CORRIGIDO: 'laudos' minúsculo
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['parceiro']
      },
      {
        fields: ['tipo_imovel']
      },
      {
        fields: ['vencimento']
      },
      {
        fields: ['user_id']
      },
      {
        fields: ['created_at']
      }
    ]
  });

  return Laudo;
};