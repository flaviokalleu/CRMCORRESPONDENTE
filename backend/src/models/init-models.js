var DataTypes = require("sequelize").DataTypes;
var _sequelizemeta = require("./sequelizemeta");

function initModels(sequelize) {
  var sequelizemeta = _sequelizemeta(sequelize, DataTypes);


  return {
    sequelizemeta,
  };
}
module.exports = initModels;
module.exports.initModels = initModels;
module.exports.default = initModels;
