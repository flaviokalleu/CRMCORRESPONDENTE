// models/aluguel.js
module.exports = (sequelize, DataTypes) => {
  const Aluguel = sequelize.define('Aluguel', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    nome_imovel: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Nome do imóvel é obrigatório' },
        len: { args: [3, 255], msg: 'Nome deve ter entre 3 e 255 caracteres' }
      }
    },
    descricao: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Descrição é obrigatória' },
        len: { args: [10, 1000], msg: 'Descrição deve ter entre 10 e 1000 caracteres' }
      }
    },
    valor_aluguel: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: { args: [0.01], msg: 'Valor deve ser maior que zero' },
        isDecimal: { msg: 'Valor deve ser um número decimal válido' }
      }
    },
    quartos: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: { args: [0], msg: 'Número de quartos deve ser maior ou igual a 0' },
        max: { args: [20], msg: 'Número de quartos deve ser menor que 20' }
      }
    },
    banheiro: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: { args: [1], msg: 'Deve ter pelo menos 1 banheiro' },
        max: { args: [20], msg: 'Número de banheiros deve ser menor que 20' }
      }
    },
    dia_vencimento: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: { args: [1], msg: 'Dia de vencimento deve ser entre 1 e 31' },
        max: { args: [31], msg: 'Dia de vencimento deve ser entre 1 e 31' }
      }
    },
    foto_capa: {
      type: DataTypes.STRING,
      allowNull: true
    },
    alugado: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    foto_adicional: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const value = this.getDataValue('foto_adicional');
        if (!value) return [];
        try {
          return JSON.parse(value);
        } catch (error) {
          console.error('Erro ao parsear foto_adicional:', error);
          return [];
        }
      },
      set(value) {
        if (Array.isArray(value)) {
          this.setDataValue('foto_adicional', JSON.stringify(value));
        } else {
          this.setDataValue('foto_adicional', JSON.stringify([]));
        }
      }
    }
  }, {
    tableName: 'alugueis',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: false // Importante: false para não converter automaticamente
  });

  return Aluguel;
};
