'use strict';

const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Visita extends Model {
    static associate(models) {
      Visita.belongsTo(models.Cliente, { foreignKey: 'cliente_id', as: 'cliente' });
      Visita.belongsTo(models.Imovel, { foreignKey: 'imovel_id', as: 'imovel' });
      Visita.belongsTo(models.User, { foreignKey: 'corretor_id', as: 'corretor' });
      Visita.belongsTo(models.User, { foreignKey: 'criado_por_id', as: 'criador' });
    }
  }

  Visita.init({
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    cliente_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'clientes', key: 'id' } },
    imovel_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'imoveis', key: 'id' } },
    corretor_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'users', key: 'id' } },
    criado_por_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'users', key: 'id' } },
    tenant_id: { type: DataTypes.INTEGER, allowNull: true },
    data_visita: { type: DataTypes.DATE, allowNull: false },
    status: {
      type: DataTypes.ENUM('agendada', 'realizada', 'cancelada', 'reagendada'),
      defaultValue: 'agendada',
    },
    observacoes: { type: DataTypes.TEXT, allowNull: true },
    feedback_cliente: { type: DataTypes.TEXT, allowNull: true },
    nota_avaliacao: { type: DataTypes.INTEGER, allowNull: true, validate: { min: 1, max: 5 } },
  }, {
    sequelize,
    modelName: 'Visita',
    tableName: 'visitas',
    underscored: true,
    timestamps: true,
  });

  return Visita;
};
