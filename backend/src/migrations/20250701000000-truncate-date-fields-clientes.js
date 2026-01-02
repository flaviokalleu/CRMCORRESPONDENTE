'use strict';

// Migration para truncar os campos de data para apenas YYYY-MM-DD antes de alterar o tipo

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Não é necessário rodar UPDATE, pois a migration de alteração de tipo já faz a conversão corretamente.
    // Migration mantida apenas para compatibilidade.
  },

  down: async (queryInterface, Sequelize) => {
    // Não é necessário reverter
  }
};
