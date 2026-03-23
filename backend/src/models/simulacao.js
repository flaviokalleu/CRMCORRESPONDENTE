'use strict';

const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Simulacao extends Model {
    static associate(models) {
      Simulacao.belongsTo(models.Cliente, {
        foreignKey: 'cliente_id',
        as: 'cliente',
        allowNull: true,
      });
      Simulacao.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user',
      });
    }
  }

  Simulacao.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    cliente_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'clientes', key: 'id' },
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' },
    },
    tenant_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    valor_imovel: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },
    valor_entrada: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },
    valor_financiado: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },
    prazo_meses: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    taxa_juros_anual: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
    },
    sistema: {
      type: DataTypes.ENUM('SAC', 'PRICE'),
      allowNull: false,
      defaultValue: 'SAC',
    },
    primeira_parcela: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
    },
    ultima_parcela: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
    },
    total_pago: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: true,
    },
    total_juros: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: true,
    },
    renda_minima: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
    },
    observacoes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  }, {
    sequelize,
    modelName: 'Simulacao',
    tableName: 'simulacoes',
    underscored: true,
    timestamps: true,
  });

  return Simulacao;
};
