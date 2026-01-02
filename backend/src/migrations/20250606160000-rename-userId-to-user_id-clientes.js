module.exports = {
  async up(queryInterface) {
    await queryInterface.renameColumn('clientes', 'userId', 'user_id');
  },
  async down(queryInterface) {
    await queryInterface.renameColumn('clientes', 'user_id', 'userId');
  }
};