'use strict';
const bcrypt = require('bcryptjs');

module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      // Garantir que existe um tenant padrão
      const [tenants] = await queryInterface.sequelize.query(
        "SELECT id FROM tenants WHERE slug = 'admin-principal' LIMIT 1"
      );
      let tenantId = tenants.length > 0 ? tenants[0].id : null;

      if (!tenantId) {
        await queryInterface.bulkInsert('tenants', [{
          nome: 'Administradora Principal',
          slug: 'admin-principal',
          email: 'admin@crmimob.com.br',
          ativo: true,
          configuracoes: '{}',
          storage_used_bytes: 0,
          created_at: new Date(),
          updated_at: new Date()
        }]);
        const [newTenants] = await queryInterface.sequelize.query(
          "SELECT id FROM tenants WHERE slug = 'admin-principal' LIMIT 1"
        );
        tenantId = newTenants[0].id;
      }

      const adminData = {
        username: 'admin',
        first_name: 'Admin',
        last_name: 'User',
        email: 'admin@admin.com',
        telefone: '1234567890',
        password: await bcrypt.hash('admin', 10),
        address: '123 Admin St',
        pix_account: '123456',
        photo: 'admin.jpg',
        is_administrador: true,
        is_super_admin: true,
        is_corretor: false,
        is_correspondente: false,
        tenant_id: tenantId,
        created_at: new Date(),
        updated_at: new Date()
      };

      await queryInterface.bulkInsert('users', [adminData], {});
    } catch (error) {
      console.error('Erro ao inserir dados no seeder:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('users', { email: 'admin@admin.com' }, {});
  }
};