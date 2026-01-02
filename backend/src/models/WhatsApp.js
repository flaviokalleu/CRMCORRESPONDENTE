'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class WhatsApp extends Model {
    static associate(models) {
      // define associations here
    }
  }

  WhatsApp.init({
    message: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'Mensagem padrão'
    },
    sender: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'Seu Nome'
    },
    receiver: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'Número do Destinatário'
    },
    authenticated: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    timestamp: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    sequelize,
    modelName: 'WhatsApp',
    tableName: 'whatsapps',
    underscored: true, // This will make Sequelize use snake_case for columns
    timestamps: true
  });

  return WhatsApp;
};
