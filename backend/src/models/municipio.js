// models/municipio.js
module.exports = (sequelize, DataTypes) => {
    const Municipio = sequelize.define('Municipio', {
      nome: DataTypes.STRING,
      estadoId: DataTypes.INTEGER
    }, {});
    Municipio.associate = function(models) {
      Municipio.belongsTo(models.Estado, { foreignKey: 'estadoId' });
    };
    return Municipio;
  };
  