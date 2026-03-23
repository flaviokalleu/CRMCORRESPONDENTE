'use strict';

const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Notificacao extends Model {
    static associate(models) {
      Notificacao.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
    }
  }

  Notificacao.init({
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'users', key: 'id' } },
    tenant_id: { type: DataTypes.INTEGER, allowNull: true },
    tipo: {
      type: DataTypes.ENUM('info', 'alerta', 'sucesso', 'erro', 'vencimento', 'proposta', 'visita', 'pagamento'),
      defaultValue: 'info',
    },
    titulo: { type: DataTypes.STRING, allowNull: false },
    mensagem: { type: DataTypes.TEXT, allowNull: true },
    lida: { type: DataTypes.BOOLEAN, defaultValue: false },
    link: { type: DataTypes.STRING, allowNull: true },
    dados: { type: DataTypes.JSONB, allowNull: true },
  }, {
    sequelize,
    modelName: 'Notificacao',
    tableName: 'notificacoes',
    underscored: true,
    timestamps: true,
  });

  return Notificacao;
};
