'use strict';

module.exports = (sequelize, DataTypes) => {
  const ClienteAluguel = sequelize.define('ClienteAluguel', {
    nome: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    cpf: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    telefone: {
      type: DataTypes.STRING,
      allowNull: true,
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
    corretor_percentual: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      defaultValue: 0,
      // % do valor do aluguel que vai como comissão ao corretor (dentro da taxa_administracao)
    },
    corretor_nome: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    corretor_pix: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    data_nascimento: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    cidade_nascimento: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    tem_fiador: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    fiador_nome: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    fiador_telefone: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    fiador_email: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    fiador_cpf: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    fiador_data_nascimento: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    fiador_cidade_nascimento: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    documento_id_path: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    contrato_path: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    fiador_documento_id_path: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    proprietario_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    contrato_documentos: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: [],
    },
  });

  ClienteAluguel.associate = function(models) {
    ClienteAluguel.hasMany(models.CobrancaAluguel, { foreignKey: 'cliente_aluguel_id', as: 'cobrancas' });
    ClienteAluguel.belongsTo(models.Aluguel, { foreignKey: 'aluguel_id', as: 'imovel' });
    ClienteAluguel.hasMany(models.ReguaCobranca, { foreignKey: 'cliente_aluguel_id', as: 'reguaCobrancas' });
    ClienteAluguel.hasMany(models.RepasseProprietario, { foreignKey: 'cliente_aluguel_id', as: 'repasses' });
    ClienteAluguel.hasMany(models.VistoriaAluguel, { foreignKey: 'cliente_aluguel_id', as: 'vistorias' });
    ClienteAluguel.hasMany(models.ChamadoManutencao, { foreignKey: 'cliente_aluguel_id', as: 'chamados' });
    if (models.proprietario) {
      ClienteAluguel.belongsTo(models.proprietario, { foreignKey: 'proprietario_id', as: 'proprietario' });
    }
  };

  return ClienteAluguel;
};
