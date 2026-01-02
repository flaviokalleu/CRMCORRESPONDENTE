'use strict';
const bcrypt = require('bcryptjs');

module.exports = {
  async up(queryInterface, Sequelize) {
    try {
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
        is_corretor: false,
        is_correspondente: false,
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