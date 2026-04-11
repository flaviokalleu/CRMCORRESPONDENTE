const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Receita extends Model {
    // Associação removida temporariamente
  }
  Receita.init({
    tipo: DataTypes.STRING,
    valor: DataTypes.DECIMAL(12,2),
    descricao: DataTypes.STRING,
    data: DataTypes.DATEONLY,
    contratoId: DataTypes.INTEGER,
    tenant_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'tenants', key: 'id' }
    },
  }, {
    sequelize,
    modelName: 'Receita',
    tableName: 'receitas',
  });
  return Receita;
};
