const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Imovel = sequelize.define('Imovel', {
    nome_imovel: {
      type: DataTypes.STRING,
      allowNull: false
    },
    descricao_imovel: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    endereco: {
      type: DataTypes.STRING,
      allowNull: false
    },
    tipo: {
      type: DataTypes.STRING,
      allowNull: false
    },
    quartos: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    banheiro: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    tags: {
      type: DataTypes.STRING,
      allowNull: true
    },
    valor_avaliacao: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    valor_venda: {
      type: DataTypes.FLOAT,
      allowNull: false
    },
    documentacao: {
      type: DataTypes.STRING,
      allowNull: true
    },
    imagens: {
      type: DataTypes.JSON,
      allowNull: true
    },
    imagem_capa: {
      type: DataTypes.STRING,
      allowNull: true
    },
    localizacao: {
      type: DataTypes.STRING,
      allowNull: true
    },
    exclusivo: {
      type: DataTypes.BOOLEAN,
      allowNull: false
    },
    tem_inquilino: {
      type: DataTypes.BOOLEAN,
      allowNull: false
    },
    situacao_imovel: {
      type: DataTypes.STRING,
      allowNull: false
    },
    observacoes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    tenant_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'tenants', key: 'id' }
    }
  }, {
    sequelize,
    modelName: 'Imovel',
    tableName: 'imoveis',
    timestamps: true, // ✅ MANTER timestamps habilitado
    createdAt: 'createdAt', // ✅ USAR camelCase como está na migration
    updatedAt: 'updatedAt', // ✅ USAR camelCase como está na migration
    underscored: false // ✅ IMPORTANTE: false para usar camelCase
  });
 

  return Imovel;
};
