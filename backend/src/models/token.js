'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Token = sequelize.define('Token', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    token: {
      type: DataTypes.TEXT,
      allowNull: false,
      unique: {
        name: 'tokens_token_unique',
        msg: 'Token já existe'
      }
    },
    refresh_token: {
      type: DataTypes.TEXT,
      allowNull: true,
      unique: {
        name: 'tokens_refresh_token_unique',
        msg: 'Refresh token já existe'
      }
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    user_type: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'tokens',
    timestamps: false, // Usando campos manuais
    indexes: [
      {
        unique: true,
        fields: ['token']
      },
      {
        unique: true,
        fields: ['refresh_token']
      },
      {
        fields: ['user_id']
      },
      {
        fields: ['email']
      },
      {
        fields: ['expires_at']
      }
    ]
  });

  // Definir associações
  Token.associate = (models) => {
    Token.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user'
    });
  };

  return Token;
};
