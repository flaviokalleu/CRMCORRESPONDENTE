const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Comissao extends Model {
    // Associações removidas temporariamente
  }
  Comissao.init({
    valor: DataTypes.DECIMAL(12,2),
    percentual: DataTypes.DECIMAL(5,2),
    data: DataTypes.DATEONLY,
    contratoId: DataTypes.INTEGER,
    corretorId: DataTypes.INTEGER,
  }, {
    sequelize,
    modelName: 'Comissao',
    tableName: 'comissoes',
  });
  return Comissao;
};
