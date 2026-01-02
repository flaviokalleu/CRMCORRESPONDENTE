'use strict';

const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Cliente extends Model {
    static associate(models) {
      // ✅ ASSOCIAÇÃO COM USER (CORRETOR)
      Cliente.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user',
        allowNull: true
      });
      
      // ✅ ASSOCIAÇÃO COM NOTAS
      Cliente.hasMany(models.Nota, {
        foreignKey: 'cliente_id',
        as: 'notas'
      });
    }
  }

  Cliente.init({
    nome: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true
    },
    telefone: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    cpf: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true
    },
    // ✅ ALTERADO: De DECIMAL para STRING
    valor_renda: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    estado_civil: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    naturalidade: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    profissao: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    data_admissao: {
      type: DataTypes.STRING(10), // YYYY-MM-DD
      allowNull: true,
    },
    data_nascimento: {
      type: DataTypes.STRING(10), // YYYY-MM-DD
      allowNull: true,
    },
    renda_tipo: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    possui_carteira_mais_tres_anos: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
    numero_pis: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    possui_dependente: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },       
    
    documentos_pessoais: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    extrato_bancario: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    documentos_dependente: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    documentos_conjuge: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING,
      defaultValue: 'aguardando_aprovação'
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    
    // CAMPOS DO CÔNJUGE
    conjuge_nome: {
      type: DataTypes.STRING,
      allowNull: true
    },
    conjuge_email: {
      type: DataTypes.STRING,
      allowNull: true
    },
    conjuge_telefone: {
      type: DataTypes.STRING,
      allowNull: true
    },
    conjuge_cpf: {
      type: DataTypes.STRING,
      allowNull: true
    },
    conjuge_profissao: {
      type: DataTypes.STRING,
      allowNull: true
    },
    conjuge_data_nascimento: {
      type: DataTypes.STRING(10), // YYYY-MM-DD
      allowNull: true
    },
    conjuge_valor_renda: {
      type: DataTypes.STRING,
      allowNull: true
    },
    conjuge_renda_tipo: {
      type: DataTypes.STRING,
      allowNull: true
    },
    conjuge_data_admissao: {
      type: DataTypes.STRING(10), // YYYY-MM-DD
      allowNull: true
    },

    // Campos do fiador
    possui_fiador: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    fiador_nome: {
      type: DataTypes.STRING,
      allowNull: true
    },
    fiador_cpf: {
      type: DataTypes.STRING,
      allowNull: true
    },
    fiador_telefone: {
      type: DataTypes.STRING,
      allowNull: true
    },
    fiador_email: {
      type: DataTypes.STRING,
      allowNull: true
    },
    fiador_documentos: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    
    // Campos dos formulários Caixa
    possui_formularios_caixa: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    formularios_caixa: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    
    // Campo para tela de aprovação
    tela_aprovacao: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Cliente',
    tableName: 'clientes',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return Cliente;
};
