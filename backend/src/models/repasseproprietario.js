'use strict';
module.exports = (sequelize, DataTypes) => {
  const RepasseProprietario = sequelize.define('RepasseProprietario', {
    cliente_aluguel_id: { type: DataTypes.INTEGER, allowNull: false },
    cobranca_aluguel_id: { type: DataTypes.INTEGER, allowNull: true },
    valor_aluguel: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    taxa_administracao_percentual: { type: DataTypes.DECIMAL(5, 2), allowNull: false },
    valor_taxa: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    valor_repasse: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    corretor_percentual: { type: DataTypes.DECIMAL(5, 2), allowNull: true, defaultValue: 0 },
    comissao_corretor: { type: DataTypes.DECIMAL(10, 2), allowNull: true, defaultValue: 0 },
    mes_referencia: { type: DataTypes.STRING, allowNull: false },
    status: { type: DataTypes.STRING, defaultValue: 'PENDENTE' },
    data_repasse: { type: DataTypes.DATEONLY, allowNull: true },
    observacao: { type: DataTypes.STRING, allowNull: true },
    asaas_transfer_id: { type: DataTypes.STRING, allowNull: true },
    transfer_status: { type: DataTypes.STRING, allowNull: true, defaultValue: 'PENDENTE' },
    // PENDENTE | PROCESSANDO | REALIZADO | FALHOU | SEM_PIX
    transfer_error: { type: DataTypes.TEXT, allowNull: true },
  }, { tableName: 'repasse_proprietarios', underscored: true });

  RepasseProprietario.associate = function(models) {
    RepasseProprietario.belongsTo(models.ClienteAluguel, { foreignKey: 'cliente_aluguel_id', as: 'clienteAluguel' });
    RepasseProprietario.belongsTo(models.CobrancaAluguel, { foreignKey: 'cobranca_aluguel_id', as: 'cobranca' });
  };
  return RepasseProprietario;
};
