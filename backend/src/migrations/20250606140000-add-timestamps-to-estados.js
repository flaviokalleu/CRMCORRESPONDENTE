module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('estados', 'created_at', {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.fn('NOW')
    });
    await queryInterface.addColumn('estados', 'updated_at', {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.fn('NOW')
    });
  },
  async down(queryInterface) {
    await queryInterface.removeColumn('estados', 'created_at');
    await queryInterface.removeColumn('estados', 'updated_at');
  }
};