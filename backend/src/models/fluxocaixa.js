const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class FluxoCaixa extends Model {}
  FluxoCaixa.init({
    data: DataTypes.DATEONLY,
    tipo: DataTypes.STRING,
    valor: DataTypes.DECIMAL(12,2),
    descricao: DataTypes.STRING,
    referenciaId: DataTypes.INTEGER,
    referenciaTipo: DataTypes.STRING,
  }, {
    sequelize,
    modelName: 'FluxoCaixa',
    tableName: 'fluxo_caixa',
  });
  return FluxoCaixa;
};
