'use strict';
module.exports = (sequelize, DataTypes) => {
  const RepasseProprietario = sequelize.define('RepasseProprietario', {
    cliente_aluguel_id: { type: DataTypes.INTEGER, allowNull: false },
    cobranca_aluguel_id: { type: DataTypes.INTEGER, allowNull: true },
    valor_aluguel: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    taxa_administracao_percentual: { type: DataTypes.DECIMAL(5, 2), allowNull: false },
    valor_taxa: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    valor_repasse: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    mes_referencia: { type: DataTypes.STRING, allowNull: false },
    status: { type: DataTypes.STRING, defaultValue: 'PENDENTE' },
    data_repasse: { type: DataTypes.DATEONLY, allowNull: true },
    observacao: { type: DataTypes.STRING, allowNull: true },
  }, { tableName: 'repasse_proprietarios', underscored: true });

  RepasseProprietario.associate = function(models) {
    RepasseProprietario.belongsTo(models.ClienteAluguel, { foreignKey: 'cliente_aluguel_id', as: 'clienteAluguel' });
    RepasseProprietario.belongsTo(models.CobrancaAluguel, { foreignKey: 'cobranca_aluguel_id', as: 'cobranca' });
  };
  return RepasseProprietario;
};
