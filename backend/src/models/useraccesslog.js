'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class UserAccessLog extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  UserAccessLog.init({
    userId: DataTypes.INTEGER,
    timestamp: DataTypes.DATE,
    ip_address: DataTypes.STRING,
    location: DataTypes.STRING,
    action: DataTypes.TEXT,
    reference_page: DataTypes.STRING,
    session_data: DataTypes.TEXT,
    referer_url: DataTypes.STRING,
    http_method: DataTypes.STRING,
    request_params: DataTypes.TEXT,
    request_body: DataTypes.TEXT,
    request_headers: DataTypes.TEXT,
    browser_info: DataTypes.TEXT,
    device_info: DataTypes.TEXT,
    os_info: DataTypes.TEXT
  }, {
    sequelize,
    modelName: 'UserAccessLog',
  });
  return UserAccessLog;
};