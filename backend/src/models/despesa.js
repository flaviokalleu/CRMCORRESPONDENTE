const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Despesa extends Model {
    // Associações removidas temporariamente
  }
  Despesa.init({
    tipo: DataTypes.STRING,
    valor: DataTypes.DECIMAL(12,2),
    descricao: DataTypes.STRING,
    data: DataTypes.DATEONLY,
    contratoId: DataTypes.INTEGER,
    corretorId: DataTypes.INTEGER,
  }, {
    sequelize,
    modelName: 'Despesa',
    tableName: 'despesas',
  });
  return Despesa;
};
