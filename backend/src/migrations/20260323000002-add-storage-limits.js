'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Limite de armazenamento no plano (em MB)
    await queryInterface.addColumn('plans', 'max_storage_mb', {
      type: Sequelize.INTEGER,
      defaultValue: 500,
      comment: 'Limite de armazenamento em MB. 0 = ilimitado'
    });

    // Tamanho máximo por arquivo no plano (em MB)
    await queryInterface.addColumn('plans', 'max_file_size_mb', {
      type: Sequelize.INTEGER,
      defaultValue: 10,
      comment: 'Tamanho máximo por arquivo em MB'
    });

    // Storage override no tenant (como os outros limites)
    await queryInterface.addColumn('tenants', 'max_storage_mb', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'Override do limite do plano. NULL = usa do plano, 0 = ilimitado'
    });

    await queryInterface.addColumn('tenants', 'max_file_size_mb', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'Override do limite do plano. NULL = usa do plano'
    });

    // Uso atual de storage do tenant (atualizado a cada upload/delete)
    await queryInterface.addColumn('tenants', 'storage_used_bytes', {
      type: Sequelize.BIGINT,
      defaultValue: 0,
      comment: 'Bytes usados atualmente pelo tenant'
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('plans', 'max_storage_mb');
    await queryInterface.removeColumn('plans', 'max_file_size_mb');
    await queryInterface.removeColumn('tenants', 'max_storage_mb');
    await queryInterface.removeColumn('tenants', 'max_file_size_mb');
    await queryInterface.removeColumn('tenants', 'storage_used_bytes');
  }
};
