'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Nota extends Model {
    static associate(models) {
      // Associação de Nota com Cliente (muitos para um)
      Nota.belongsTo(models.Cliente, {
        foreignKey: 'cliente_id', // Usando `cliente_id` como chave estrangeira
        as: 'cliente'
      });
      
      // Associação de Nota com User (muitos para um)
      Nota.belongsTo(models.User, {
        foreignKey: 'criado_por_id', // Usando `criado_por_id` como chave estrangeira
        as: 'criador'
      });
    }
  }

  Nota.init({
    cliente_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'clientes',
        key: 'id'
      }
    },
    processo_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    texto: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    criado_por_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    }
  }, {
    sequelize,
    modelName: 'Nota',
    tableName: 'notas',
    timestamps: true,
    createdAt: 'data_criacao',
    updatedAt: 'updated_at'
  });

  return Nota;
};
