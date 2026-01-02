// models/estado.js
module.exports = (sequelize, DataTypes) => {
    const Estado = sequelize.define('Estado', {
      nome: DataTypes.STRING,
      sigla: DataTypes.STRING
    }, {});
    Estado.associate = function(models) {
      Estado.hasMany(models.Municipio, { foreignKey: 'estadoId' });
    };
    return Estado;
  };
  