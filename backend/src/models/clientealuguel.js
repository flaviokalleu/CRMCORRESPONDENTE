'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  const ClienteAluguel = sequelize.define('ClienteAluguel', {
    nome: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    cpf: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    telefone: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    valor_aluguel: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    dia_vencimento: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    pago: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    historico_pagamentos: {
      type: DataTypes.JSON,
      defaultValue: [],
      allowNull: true,
    },
  });

  return ClienteAluguel;
};
