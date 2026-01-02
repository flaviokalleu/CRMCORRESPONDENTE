const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const WhatsappSession = sequelize.define('WhatsappSession', {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false
    },
    data: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: { creds: {}, keys: {} } // Valor padrão
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'connecting', 'error'),
      allowNull: false,
      defaultValue: 'inactive',
      field: 'status'
    },
    phoneNumber: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'phone_number'
    },
    lastActivity: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_activity'
    },
    isAuthenticated: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_authenticated'
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at'
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'updated_at'
    }
  }, {
    tableName: 'whatsapp_sessions',
    timestamps: true,
    underscored: true, // Isso força o Sequelize a usar snake_case
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return WhatsappSession;
};
