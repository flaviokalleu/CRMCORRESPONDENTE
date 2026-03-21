'use strict';
module.exports = (sequelize, DataTypes) => {
  const ReguaCobranca = sequelize.define('ReguaCobranca', {
    cliente_aluguel_id: { type: DataTypes.INTEGER, allowNull: false },
    cobranca_aluguel_id: { type: DataTypes.INTEGER, allowNull: true },
    etapa: { type: DataTypes.STRING, allowNull: false },
    dias_referencia: { type: DataTypes.INTEGER, allowNull: false },
    mensagem_enviada: { type: DataTypes.BOOLEAN, defaultValue: false },
    data_envio: { type: DataTypes.DATE, allowNull: true },
    data_referencia: { type: DataTypes.DATEONLY, allowNull: false },
    mes_referencia: { type: DataTypes.STRING, allowNull: true },
  }, { tableName: 'regua_cobrancas', underscored: true });

  ReguaCobranca.associate = function(models) {
    ReguaCobranca.belongsTo(models.ClienteAluguel, { foreignKey: 'cliente_aluguel_id', as: 'clienteAluguel' });
    ReguaCobranca.belongsTo(models.CobrancaAluguel, { foreignKey: 'cobranca_aluguel_id', as: 'cobranca' });
  };
  return ReguaCobranca;
};
