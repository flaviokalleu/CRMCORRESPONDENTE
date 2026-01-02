'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */
    await queryInterface.addColumn('acessos', 'device_type', {
      type: Sequelize.STRING(50),
      allowNull: true,
    });

    await queryInterface.addColumn('acessos', 'page', {
      type: Sequelize.STRING(255),
      allowNull: true,
    });

    await queryInterface.addColumn('acessos', 'geo_city', {
      type: Sequelize.STRING(100),
      allowNull: true,
    });

    await queryInterface.addColumn('acessos', 'geo_region', {
      type: Sequelize.STRING(100),
      allowNull: true,
    });

    await queryInterface.addColumn('acessos', 'geo_country', {
      type: Sequelize.STRING(10),
      allowNull: true,
    });

    await queryInterface.addColumn('acessos', 'geo_timezone', {
      type: Sequelize.STRING(50),
      allowNull: true,
    });

    await queryInterface.addColumn('acessos', 'geo_coordinates', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
  },

  async down (queryInterface, Sequelize) {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
    await queryInterface.removeColumn('acessos', 'device_type');
    await queryInterface.removeColumn('acessos', 'page');
    await queryInterface.removeColumn('acessos', 'geo_city');
    await queryInterface.removeColumn('acessos', 'geo_region');
    await queryInterface.removeColumn('acessos', 'geo_country');
    await queryInterface.removeColumn('acessos', 'geo_timezone');
    await queryInterface.removeColumn('acessos', 'geo_coordinates');
  }
};
