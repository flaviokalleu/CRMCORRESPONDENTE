'use strict';
module.exports = {
  async up(queryInterface) {
    await queryInterface.addIndex('clientes', ['user_id'], { name: 'idx_clientes_user_id' });
    await queryInterface.addIndex('clientes', ['status'], { name: 'idx_clientes_status' });
    await queryInterface.addIndex('clientes', ['created_at'], { name: 'idx_clientes_created_at' });
  },
  async down(queryInterface) {
    await queryInterface.removeIndex('clientes', 'idx_clientes_user_id');
    await queryInterface.removeIndex('clientes', 'idx_clientes_status');
    await queryInterface.removeIndex('clientes', 'idx_clientes_created_at');
  }
};
