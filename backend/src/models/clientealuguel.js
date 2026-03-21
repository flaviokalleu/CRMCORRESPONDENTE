'use strict';

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
    asaas_customer_id: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    asaas_subscription_id: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    asaas_subscription_status: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    aluguel_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    data_inicio_contrato: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    data_fim_contrato: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    indice_reajuste: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: 'IGPM',
    },
    percentual_multa: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      defaultValue: 2.00,
    },
    percentual_juros_mora: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      defaultValue: 1.00,
    },
    score_inquilino: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    score_detalhes: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    score_atualizado_em: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    proprietario_nome: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    proprietario_telefone: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    proprietario_pix: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    taxa_administracao: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      defaultValue: 10.00,
    },
  });

  ClienteAluguel.associate = function(models) {
    ClienteAluguel.hasMany(models.CobrancaAluguel, { foreignKey: 'cliente_aluguel_id', as: 'cobrancas' });
    ClienteAluguel.belongsTo(models.Aluguel, { foreignKey: 'aluguel_id', as: 'imovel' });
    ClienteAluguel.hasMany(models.ReguaCobranca, { foreignKey: 'cliente_aluguel_id', as: 'reguaCobrancas' });
    ClienteAluguel.hasMany(models.RepasseProprietario, { foreignKey: 'cliente_aluguel_id', as: 'repasses' });
    ClienteAluguel.hasMany(models.VistoriaAluguel, { foreignKey: 'cliente_aluguel_id', as: 'vistorias' });
    ClienteAluguel.hasMany(models.ChamadoManutencao, { foreignKey: 'cliente_aluguel_id', as: 'chamados' });
  };

  return ClienteAluguel;
};
