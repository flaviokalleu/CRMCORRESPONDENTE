const { Model, DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');

module.exports = (sequelize) => {
  class User extends Model {
    static associate(models) {
      // Associação com clientes
      User.hasMany(models.Cliente, {
        foreignKey: 'user_id',
        as: 'clientes'
      });

      // Associação com notas
      User.hasMany(models.Nota, {
        foreignKey: 'criado_por_id',
        as: 'notas_criadas'
      });

      // Associação com tenant
      User.belongsTo(models.Tenant, {
        foreignKey: 'tenant_id',
        as: 'tenant'
      });
    }

    // Método para verificar a senha
    async verifyPassword(password) {
      return await bcrypt.compare(password, this.password);
    }
  }

  User.init({
    username: DataTypes.STRING,
    first_name: DataTypes.STRING,
    last_name: DataTypes.STRING,
    email: { type: DataTypes.STRING, unique: true },
    telefone: DataTypes.STRING,
    password: DataTypes.STRING,
    creci: DataTypes.STRING,
    address: DataTypes.STRING,
    pix_account: DataTypes.STRING,
    photo: DataTypes.STRING,
    // Flags de papel
    is_corretor: { type: DataTypes.BOOLEAN, defaultValue: false },
    is_administrador: { type: DataTypes.BOOLEAN, defaultValue: false },
    is_correspondente: { type: DataTypes.BOOLEAN, defaultValue: false },
    // SaaS
    is_super_admin: { type: DataTypes.BOOLEAN, defaultValue: false },
    tenant_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'tenants', key: 'id' }
    }
  }, {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    timestamps: true,
    // Mapear os nomes das colunas do banco
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    // Configurar aliases para usar nos selects
    scopes: {
      withTimestamps: {
        attributes: {
          include: [
            ['created_at', 'createdAt'],
            ['updated_at', 'updatedAt']
          ]
        }
      }
    }
  });

  return User;
};