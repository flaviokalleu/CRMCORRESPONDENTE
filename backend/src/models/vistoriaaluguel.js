'use strict';
module.exports = (sequelize, DataTypes) => {
  const VistoriaAluguel = sequelize.define('VistoriaAluguel', {
    cliente_aluguel_id: { type: DataTypes.INTEGER, allowNull: false },
    aluguel_id: { type: DataTypes.INTEGER, allowNull: true },
    tipo: { type: DataTypes.STRING, allowNull: false, defaultValue: 'entrada' },
    data_vistoria: { type: DataTypes.DATEONLY, allowNull: false },
    observacoes_gerais: { type: DataTypes.TEXT, allowNull: true },
    checklist: { type: DataTypes.JSON, allowNull: true, defaultValue: [] },
    fotos: { type: DataTypes.JSON, allowNull: true, defaultValue: [] },
    pdf_url: { type: DataTypes.STRING, allowNull: true },
    status: { type: DataTypes.STRING, defaultValue: 'rascunho' },
  }, { tableName: 'vistoria_aluguels', underscored: true });

  VistoriaAluguel.associate = function(models) {
    VistoriaAluguel.belongsTo(models.ClienteAluguel, { foreignKey: 'cliente_aluguel_id', as: 'clienteAluguel' });
    VistoriaAluguel.belongsTo(models.Aluguel, { foreignKey: 'aluguel_id', as: 'imovel' });
  };
  return VistoriaAluguel;
};
