// backend/models/acesso.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  const Acesso = sequelize.define('Acesso', {
    ip: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    referer: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    userAgent: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'user_agent' // mapeia para user_agent no banco
    },
    deviceType: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'device_type' // mapeia para device_type no banco
    },
    page: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    geoCity: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'geo_city' // mapeia para geo_city no banco
    },
    geoRegion: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'geo_region' // mapeia para geo_region no banco
    },
    geoCountry: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'geo_country' // mapeia para geo_country no banco
    },
    geoTimezone: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'geo_timezone' // mapeia para geo_timezone no banco
    },
    geoCoordinates: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'geo_coordinates' // mapeia para geo_coordinates no banco
    },
    timestamp: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    }
  }, {
    tableName: 'acessos',
    timestamps: false, // IMPORTANTE: Desabilita created_at/updated_at
    underscored: true,
  });

  Acesso.associate = (models) => {
    Acesso.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
  };

  return Acesso;
};
