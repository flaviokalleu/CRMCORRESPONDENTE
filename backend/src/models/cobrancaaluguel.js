'use strict';

module.exports = (sequelize, DataTypes) => {
  const CobrancaAluguel = sequelize.define('CobrancaAluguel', {
    cliente_aluguel_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    asaas_payment_id: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
    },
    valor: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    data_vencimento: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    data_pagamento: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'PENDING',
    },
    billing_type: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: 'UNDEFINED',
    },
    invoice_url: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    bank_slip_url: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    pix_qr_code: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    tipo: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'recorrente',
    },
    descricao: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    recibo_url: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  }, {
    tableName: 'cobranca_aluguels',
    underscored: true,
  });

  CobrancaAluguel.associate = function(models) {
    CobrancaAluguel.belongsTo(models.ClienteAluguel, {
      foreignKey: 'cliente_aluguel_id',
      as: 'clienteAluguel',
    });
  };

  return CobrancaAluguel;
};
