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
    tenant_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'tenants', key: 'id' }
    },
  }, {
    sequelize,
    modelName: 'Despesa',
    tableName: 'despesas',
    underscored: false,
  });
  return Despesa;
};
