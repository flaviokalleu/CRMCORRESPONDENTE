'use strict';
module.exports = (sequelize, DataTypes) => {
  const ChamadoManutencao = sequelize.define('ChamadoManutencao', {
    cliente_aluguel_id: { type: DataTypes.INTEGER, allowNull: false },
    aluguel_id: { type: DataTypes.INTEGER, allowNull: true },
    titulo: { type: DataTypes.STRING, allowNull: false },
    descricao: { type: DataTypes.TEXT, allowNull: false },
    categoria: { type: DataTypes.STRING, allowNull: true },
    prioridade: { type: DataTypes.STRING, defaultValue: 'media' },
    status: { type: DataTypes.STRING, defaultValue: 'aberto' },
    fotos: { type: DataTypes.JSON, allowNull: true, defaultValue: [] },
    resposta_admin: { type: DataTypes.TEXT, allowNull: true },
    data_resolucao: { type: DataTypes.DATE, allowNull: true },
  }, { tableName: 'chamado_manutencaos', underscored: true });

  ChamadoManutencao.associate = function(models) {
    ChamadoManutencao.belongsTo(models.ClienteAluguel, { foreignKey: 'cliente_aluguel_id', as: 'clienteAluguel' });
    ChamadoManutencao.belongsTo(models.Aluguel, { foreignKey: 'aluguel_id', as: 'imovel' });
  };
  return ChamadoManutencao;
};
