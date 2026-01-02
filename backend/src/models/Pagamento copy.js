module.exports = (sequelize, DataTypes) => {
  const Pagamento = sequelize.define('Pagamento', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    cliente_aluguel_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'ClienteAluguels',
        key: 'id',
      },
    },
    data: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    valor: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('Pago', 'Pendente'),
      allowNull: false,
      defaultValue: 'Pago',
    },
    forma_pagamento: {
      type: DataTypes.ENUM('Dinheiro', 'PIX', 'Cartão de Débito', 'Cartão de Crédito', 'Transferência'),
      allowNull: false,
      defaultValue: 'Dinheiro',
    },
  });

  Pagamento.associate = (models) => {
    Pagamento.belongsTo(models.ClienteAluguel, {
      foreignKey: 'cliente_aluguel_id',
      as: 'cliente',
    });
  };

  return Pagamento;
};