'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Verificar se as colunas existem antes de tentar removê-las
    const tableInfo = await queryInterface.describeTable('acessos');
    
    if (tableInfo.createdAt) {
      await queryInterface.removeColumn('acessos', 'createdAt');
    }
    
    if (tableInfo.updatedAt) {
      await queryInterface.removeColumn('acessos', 'updatedAt');
    }

    // Garantir que todas as colunas necessárias existam
    if (!tableInfo.device_type) {
      await queryInterface.addColumn('acessos', 'device_type', {
        type: Sequelize.STRING(50),
        allowNull: true,
      });
    }

    if (!tableInfo.page) {
      await queryInterface.addColumn('acessos', 'page', {
        type: Sequelize.STRING(255),
        allowNull: true,
      });
    }

    if (!tableInfo.geo_city) {
      await queryInterface.addColumn('acessos', 'geo_city', {
        type: Sequelize.STRING(100),
        allowNull: true,
      });
    }

    if (!tableInfo.geo_region) {
      await queryInterface.addColumn('acessos', 'geo_region', {
        type: Sequelize.STRING(100),
        allowNull: true,
      });
    }

    if (!tableInfo.geo_country) {
      await queryInterface.addColumn('acessos', 'geo_country', {
        type: Sequelize.STRING(10),
        allowNull: true,
      });
    }

    if (!tableInfo.geo_timezone) {
      await queryInterface.addColumn('acessos', 'geo_timezone', {
        type: Sequelize.STRING(50),
        allowNull: true,
      });
    }

    if (!tableInfo.geo_coordinates) {
      await queryInterface.addColumn('acessos', 'geo_coordinates', {
        type: Sequelize.TEXT,
        allowNull: true,
      });
    }
  },

  async down (queryInterface, Sequelize) {
    // Adicionar de volta as colunas de timestamp se necessário
    await queryInterface.addColumn('acessos', 'createdAt', {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.NOW,
    });

    await queryInterface.addColumn('acessos', 'updatedAt', {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.NOW,
    });

    // Remover as colunas adicionadas
    await queryInterface.removeColumn('acessos', 'device_type');
    await queryInterface.removeColumn('acessos', 'page');
    await queryInterface.removeColumn('acessos', 'geo_city');
    await queryInterface.removeColumn('acessos', 'geo_region');
    await queryInterface.removeColumn('acessos', 'geo_country');
    await queryInterface.removeColumn('acessos', 'geo_timezone');
    await queryInterface.removeColumn('acessos', 'geo_coordinates');
  }
};
