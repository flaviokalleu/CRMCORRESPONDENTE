'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('system_configs', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      nome_sistema: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'Parnassá CRM'
      },
      cor_primaria: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: '#003366'
      },
      cor_secundaria: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: '#ff7b00'
      },
      cor_texto: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: '#ffffff'
      },
      logo_url: {
        type: Sequelize.STRING,
        allowNull: true
      },
      tema_escuro: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Inserir configuração inicial
    await queryInterface.bulkInsert('system_configs', [{
      nome_sistema: 'Parnassá CRM',
      cor_primaria: '#003366',
      cor_secundaria: '#ff7b00',
      cor_texto: '#ffffff',
      tema_escuro: true,
      created_at: new Date(),
      updated_at: new Date()
    }]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('system_configs');
  }
};