'use strict';

const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Proposta extends Model {
    static associate(models) {
      Proposta.belongsTo(models.Cliente, { foreignKey: 'cliente_id', as: 'cliente' });
      Proposta.belongsTo(models.Imovel, { foreignKey: 'imovel_id', as: 'imovel' });
      Proposta.belongsTo(models.User, { foreignKey: 'corretor_id', as: 'corretor' });
    }
  }

  Proposta.init({
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    cliente_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'clientes', key: 'id' } },
    imovel_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'imoveis', key: 'id' } },
    corretor_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'users', key: 'id' } },
    tenant_id: { type: DataTypes.INTEGER, allowNull: true },
    valor_ofertado: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    valor_contra_proposta: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
    valor_aceito: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
    forma_pagamento: {
      type: DataTypes.ENUM('financiamento', 'a_vista', 'fgts', 'misto'),
      defaultValue: 'financiamento',
    },
    status: {
      type: DataTypes.ENUM('pendente', 'em_negociacao', 'aceita', 'recusada', 'expirada', 'cancelada'),
      defaultValue: 'pendente',
    },
    data_validade: { type: DataTypes.DATE, allowNull: true },
    condicoes: { type: DataTypes.TEXT, allowNull: true },
    motivo_recusa: { type: DataTypes.TEXT, allowNull: true },
    observacoes: { type: DataTypes.TEXT, allowNull: true },
  }, {
    sequelize,
    modelName: 'Proposta',
    tableName: 'propostas',
    underscored: true,
    timestamps: true,
  });

  return Proposta;
};
