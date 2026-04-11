'use strict';

const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Pagamento extends Model {
    static associate(models) {
      // Associação com Cliente
      Pagamento.belongsTo(models.Cliente, {
        foreignKey: 'cliente_id',
        as: 'cliente'
      });
      
      // Associação com User (quem criou o pagamento)
      Pagamento.belongsTo(models.User, {
        foreignKey: 'created_by',
        as: 'criador'
      });
    }
  }

  Pagamento.init({
    cliente_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'clientes',
        key: 'id'
      }
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    mp_preference_id: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'ID da preferência no Mercado Pago'
    },
    mp_payment_id: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'ID do pagamento no Mercado Pago'
    },
    tipo: {
      type: DataTypes.ENUM('boleto', 'pix', 'cartao', 'universal'), // ✅ ADICIONADO 'universal'
      allowNull: false,
      defaultValue: 'universal' // ✅ MUDADO PARA UNIVERSAL
    },
    status: {
      type: DataTypes.ENUM('pendente', 'aprovado', 'rejeitado', 'cancelado', 'expirado', 'aguardando'), // ✅ ADICIONADO 'aguardando'
      allowNull: false,
      defaultValue: 'pendente'
    },
    titulo: {
      type: DataTypes.STRING,
      allowNull: false
    },
    descricao: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    valor: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Valor formatado como string (ex: 2.000,00)'
    },
    valor_numerico: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: 'Valor numérico para cálculos'
    },
    // ✅ CAMPOS PARA PARCELAS
    parcelas: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: 'Número de parcelas (1 = à vista)'
    },
    valor_parcela: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Valor de cada parcela formatado'
    },
    valor_parcela_numerico: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Valor numérico de cada parcela'
    },
    // ✅ CAMPOS PARA CONTROLE DE ENVIOS
    whatsapp_enviado: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Se foi enviado para WhatsApp'
    },
    email_enviado: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Se foi enviado por email'
    },
    data_envio_whatsapp: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Data do envio do WhatsApp'
    },
    data_envio_email: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Data do envio do email'
    },
    data_vencimento: {
      type: DataTypes.DATE,
      allowNull: true
    },
    data_pagamento: {
      type: DataTypes.DATE,
      allowNull: true
    },
    link_pagamento: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Link para pagamento (boleto, PIX, etc)'
    },
    // ✅ CAMPOS ADICIONAIS
    link_curto: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Link encurtado para compartilhamento'
    },
    codigo_barras: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Código de barras do boleto'
    },
    linha_digitavel: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Linha digitável do boleto'
    },
    qr_code: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'QR Code para PIX'
    },
    qr_code_base64: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'QR Code em base64'
    },
    observacoes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    dados_mp: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Dados completos retornados pelo Mercado Pago'
    },
    // ✅ NOVO CAMPO PARA URL DO COMPROVANTE
    comprovante_url: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'URL do comprovante oficial do Mercado Pago'
    },
    // ✅ CAMPOS DE JUROS (se ainda não existirem)
    valor_original: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Valor original sem juros (formatado)'
    },
    valor_original_numerico: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Valor original sem juros (numérico)'
    },
    juros_total: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Total de juros (formatado)'
    },
    juros_total_numerico: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Total de juros (numérico)'
    },
    taxa_juros: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      comment: 'Taxa de juros em percentual'
    },
    calculo_mp: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Se foi calculado pela API do Mercado Pago'
    },
    // ✅ NOVOS CAMPOS PARA SISTEMA DE PARCELAS
    parcela_atual: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      comment: 'Número da parcela atual (1, 2, 3...)'
    },
    pagamento_pai_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'ID do pagamento principal (se for uma parcela)'
    },
    is_parcelado: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Se é um pagamento parcelado'
    },
    data_envio_proxima_parcela: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Data para envio da próxima parcela'
    },
    juros_mp: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Juros calculados pelo Mercado Pago'
    },
    valor_com_juros: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Valor total com juros do MP'
    },
    link_unico: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
      comment: 'Link único para esta parcela específica'
    },
    tenant_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'tenants', key: 'id' }
    }
  }, {
    sequelize,
    modelName: 'Pagamento',
    tableName: 'pagamentos',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return Pagamento;
};