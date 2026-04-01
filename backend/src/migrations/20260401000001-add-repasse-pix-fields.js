'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Adicionar campos de controle de transferência PIX ao repasse_proprietarios
    await queryInterface.addColumn('repasse_proprietarios', 'asaas_transfer_id', {
      type: Sequelize.STRING, allowNull: true,
    });
    await queryInterface.addColumn('repasse_proprietarios', 'transfer_status', {
      type: Sequelize.STRING, allowNull: true, defaultValue: 'PENDENTE',
      // PENDENTE | PROCESSANDO | REALIZADO | FALHOU | SEM_PIX
    });
    await queryInterface.addColumn('repasse_proprietarios', 'transfer_error', {
      type: Sequelize.TEXT, allowNull: true,
    });
    await queryInterface.addColumn('repasse_proprietarios', 'comissao_corretor', {
      type: Sequelize.DECIMAL(10, 2), allowNull: true, defaultValue: 0,
    });
    await queryInterface.addColumn('repasse_proprietarios', 'corretor_percentual', {
      type: Sequelize.DECIMAL(5, 2), allowNull: true, defaultValue: 0,
    });

    // Adicionar percentual do corretor ao ClienteAluguel
    await queryInterface.addColumn('ClienteAluguels', 'corretor_percentual', {
      type: Sequelize.DECIMAL(5, 2), allowNull: true, defaultValue: 0,
      // % do valor do aluguel que vai como comissão ao corretor
    });
    await queryInterface.addColumn('ClienteAluguels', 'corretor_nome', {
      type: Sequelize.STRING, allowNull: true,
    });
    await queryInterface.addColumn('ClienteAluguels', 'corretor_pix', {
      type: Sequelize.STRING, allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('repasse_proprietarios', 'asaas_transfer_id');
    await queryInterface.removeColumn('repasse_proprietarios', 'transfer_status');
    await queryInterface.removeColumn('repasse_proprietarios', 'transfer_error');
    await queryInterface.removeColumn('repasse_proprietarios', 'comissao_corretor');
    await queryInterface.removeColumn('repasse_proprietarios', 'corretor_percentual');
    await queryInterface.removeColumn('ClienteAluguels', 'corretor_percentual');
    await queryInterface.removeColumn('ClienteAluguels', 'corretor_nome');
    await queryInterface.removeColumn('ClienteAluguels', 'corretor_pix');
  },
};
