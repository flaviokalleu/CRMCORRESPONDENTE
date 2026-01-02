'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class SystemConfig extends Model {
    static associate(models) {
      // Define associations here if needed
    }
  }
  
  SystemConfig.init({
    nome_sistema: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'Parnassá CRM'
    },
    cor_primaria: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: '#003366'
    },
    cor_secundaria: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: '#ff7b00'
    },
    cor_texto: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: '#ffffff'
    },
    logo_url: {
      type: DataTypes.STRING,
      allowNull: true
    },
    tema_escuro: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  }, {
    sequelize,
    modelName: 'SystemConfig',
    tableName: 'system_configs',
    underscored: true,
    timestamps: true
  });
  
  return SystemConfig;
};